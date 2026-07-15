package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type VersionHandler struct {
	Store *storage.Store
}

type CreateVersionRequest struct {
	BoardID     string `json:"board_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CRDTUpdate  string `json:"crdt_update"` // Base64 encoded Yjs update
}

type BoardVersionResponse struct {
	ID            string `json:"id"`
	BoardID       string `json:"board_id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	VersionNumber int    `json:"version_number"`
	CRDTUpdate    string `json:"crdt_update"` // Base64 encoded
	AuthorID      string `json:"author_id"`
	AuthorName    string `json:"author_name"`
	AuthorAvatar  string `json:"author_avatar"`
	CreatedAt     string `json:"created_at"`
}

func (h *VersionHandler) CreateVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if req.BoardID == "" || req.Name == "" || req.CRDTUpdate == "" {
		http.Error(w, "Missing required fields (board_id, name, crdt_update)", http.StatusBadRequest)
		return
	}

	// Decode Yjs update from base64
	updateBytes, err := base64.StdEncoding.DecodeString(req.CRDTUpdate)
	if err != nil {
		http.Error(w, "Invalid base64 payload in crdt_update", http.StatusBadRequest)
		return
	}

	verToken, _ := auth.GenerateRandomToken()
	verID := "ver_" + verToken[:16]

	version := &storage.BoardVersion{
		ID:          verID,
		BoardID:     req.BoardID,
		Name:        req.Name,
		Description: req.Description,
		CRDTUpdate:  updateBytes,
		AuthorID:    userID,
	}

	if err := h.Store.CreateBoardVersion(version); err != nil {
		http.Error(w, "Failed to create board version", http.StatusInternalServerError)
		return
	}

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "board.create_version",
		TargetType: "board_version",
		TargetID:   version.ID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(version)
}

func (h *VersionHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	boardID := r.URL.Query().Get("board_id")
	if boardID == "" {
		http.Error(w, "Missing board_id query parameter", http.StatusBadRequest)
		return
	}

	versions, err := h.Store.GetBoardVersions(boardID)
	if err != nil {
		http.Error(w, "Failed to retrieve board versions", http.StatusInternalServerError)
		return
	}

	responseList := make([]BoardVersionResponse, 0, len(versions))
	for _, v := range versions {
		base64Update := base64.StdEncoding.EncodeToString(v.CRDTUpdate)
		responseList = append(responseList, BoardVersionResponse{
			ID:            v.ID,
			BoardID:       v.BoardID,
			Name:          v.Name,
			Description:   v.Description,
			VersionNumber: v.VersionNumber,
			CRDTUpdate:    base64Update,
			AuthorID:      v.AuthorID,
			AuthorName:    v.AuthorName,
			AuthorAvatar:  v.AuthorAvatar,
			CreatedAt:     v.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(responseList)
}
