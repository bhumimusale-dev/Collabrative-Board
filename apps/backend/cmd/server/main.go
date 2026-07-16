package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"collabboard-backend/internal/api"
	"collabboard-backend/internal/storage"
	"collabboard-backend/internal/websocket"
)

type Server struct {
	Store *storage.Store
	Rooms map[string]*websocket.Room
	Mutex sync.Mutex
}

func isAllowedOrigin(origin string) bool {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		return true
	}
	if origin == frontendURL {
		return true
	}
	if origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173" || 
	   origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
		return true
	}
	return false
}

func CORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		frontendURL := os.Getenv("FRONTEND_URL")
		if origin != "" {
			if isAllowedOrigin(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if frontendURL != "" {
				w.Header().Set("Access-Control-Allow-Origin", frontendURL)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			if frontendURL != "" {
				w.Header().Set("Access-Control-Allow-Origin", frontendURL)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func CORSHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		frontendURL := os.Getenv("FRONTEND_URL")
		if origin != "" {
			if isAllowedOrigin(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if frontendURL != "" {
				w.Header().Set("Access-Control-Allow-Origin", frontendURL)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			if frontendURL != "" {
				w.Header().Set("Access-Control-Allow-Origin", frontendURL)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	log.Println("Starting CollabBoard Backend...")

	// Initialize SQLite Database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./whiteboard.db"
	}

	// Ensure parent directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Printf("Warning: Failed to create database directory: %v", err)
	}

	store, err := storage.NewStore(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	defer store.Close()

	srv := &Server{
		Store: store,
		Rooms: make(map[string]*websocket.Room),
	}

	authHandler := &api.AuthHandler{Store: store}
	wsHandler := &api.WorkspaceHandler{Store: store}
	boardHandler := &api.BoardHandler{Store: store}
	orgHandler := &api.OrgHandler{Store: store}
	searchHandler := &api.SearchHandler{Store: store}
	templateHandler := &api.TemplateHandler{Store: store}
	userHandler := &api.UserHandler{Store: store}
	versionHandler := &api.VersionHandler{Store: store}
	saasHandler := &api.SaasHandler{Store: store}
	billingHandler := &api.BillingHandler{Store: store}

	// Health Check / Basic info
	http.HandleFunc("/health", CORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "app": "collabboard-x"}`))
	}))

	// Auth Routes
	http.HandleFunc("/api/auth/register", CORS(authHandler.Register))
	http.HandleFunc("/api/auth/login", CORS(authHandler.Login))
	http.HandleFunc("/api/auth/logout", CORS(authHandler.Logout))
	http.HandleFunc("/api/auth/refresh", CORS(authHandler.Refresh))
	http.HandleFunc("/api/auth/verify-email", CORS(authHandler.VerifyEmail))
	http.HandleFunc("/api/auth/forgot-password", CORS(authHandler.ForgotPassword))
	http.HandleFunc("/api/auth/verify-otp", CORS(authHandler.VerifyOTP))
	http.HandleFunc("/api/auth/reset-password", CORS(authHandler.ResetPassword))

	// User Routes (Protected)
	http.HandleFunc("/api/users/profile", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			userHandler.GetProfile(w, r)
		} else if r.Method == http.MethodPut || r.Method == http.MethodPatch {
			userHandler.UpdateProfile(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	http.HandleFunc("/api/users/avatar", CORS(api.AuthMiddleware(userHandler.UploadAvatar)))

	// Board Version Routes (Protected)
	http.HandleFunc("/api/boards/versions", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			versionHandler.ListVersions(w, r)
		} else if r.Method == http.MethodPost {
			versionHandler.CreateVersion(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Serve Static Uploads (Avatars) with CORS support
	http.Handle("/uploads/", CORSHandler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads")))))

	// Workspace Routes (Protected)
	http.HandleFunc("/api/workspaces", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			wsHandler.ListWorkspaces(w, r)
		} else if r.Method == http.MethodPost {
			wsHandler.CreateWorkspace(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Board Routes (Protected)
	http.HandleFunc("/api/boards", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			boardHandler.ListBoards(w, r)
		} else if r.Method == http.MethodPost {
			boardHandler.CreateBoard(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	http.HandleFunc("/api/boards/status", CORS(api.AuthMiddleware(boardHandler.UpdateBoardStatus)))

	// Organization & Team Routes
	http.HandleFunc("/api/orgs", CORS(api.AuthMiddleware(orgHandler.CreateOrganization)))
	http.HandleFunc("/api/teams", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			orgHandler.ListTeams(w, r)
		} else if r.Method == http.MethodPost {
			orgHandler.CreateTeam(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// SaaS Invitation & Workspace endpoints
	http.HandleFunc("/api/teams/invitations", CORS(api.AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			saasHandler.ListInvitations(w, r)
		} else if r.Method == http.MethodPost {
			saasHandler.SendInvitation(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	http.HandleFunc("/api/teams/invitations/respond", CORS(api.AuthMiddleware(saasHandler.RespondToInvitation)))
	http.HandleFunc("/api/teams/members", CORS(api.AuthMiddleware(saasHandler.ListTeamMembers)))
	http.HandleFunc("/api/teams/workspaces", CORS(api.AuthMiddleware(saasHandler.ListTeamWorkspaces)))

	// SaaS Subscription Billing Routes
	http.HandleFunc("/api/billing/subscribe", CORS(api.AuthMiddleware(billingHandler.Subscribe)))
	http.HandleFunc("/api/billing/details", CORS(api.AuthMiddleware(billingHandler.GetBillingDetails)))
	http.HandleFunc("/api/billing/invoices", CORS(api.AuthMiddleware(billingHandler.GetInvoices)))
	http.HandleFunc("/api/billing/invoice", CORS(billingHandler.ServeInvoiceHTML))

	// Template Marketplace Routes
	http.HandleFunc("/api/templates", CORS(templateHandler.ListTemplates))
	http.HandleFunc("/api/templates/publish", CORS(api.AuthMiddleware(templateHandler.PublishTemplate)))
	http.HandleFunc("/api/templates/install", CORS(api.AuthMiddleware(templateHandler.InstallTemplate)))
	http.HandleFunc("/api/templates/review", CORS(api.AuthMiddleware(templateHandler.SubmitReview)))

	// Global Search Route
	http.HandleFunc("/api/search", CORS(searchHandler.GlobalSearch))

	// Websocket room entrypoint
	http.HandleFunc("/ws/", CORS(srv.handleWebSocket))

	log.Println("Listening on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Extract room name from path, e.g. /ws/room123
	roomName := r.URL.Path[len("/ws/"):]
	if roomName == "" {
		http.Error(w, "Room name is required", http.StatusBadRequest)
		return
	}

	s.Mutex.Lock()
	room, exists := s.Rooms[roomName]
	if !exists {
		log.Printf("Creating new room: %s", roomName)
		room = websocket.NewRoom(roomName, s.Store)
		s.Rooms[roomName] = room
		go room.Run()
	}
	s.Mutex.Unlock()

	websocket.ServeWs(room, w, r)
}
