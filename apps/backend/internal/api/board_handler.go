package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type BoardHandler struct {
	Store *storage.Store
}

type CreateBoardRequest struct {
	WorkspaceID string `json:"workspace_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Visibility  string `json:"visibility"` // "private", "public", "shared"
}

type UpdateBoardStatusRequest struct {
	BoardID    string `json:"board_id"`
	IsStarred  bool   `json:"is_starred"`
	IsArchived bool   `json:"is_archived"`
	IsDeleted  bool   `json:"is_deleted"` // Soft delete / move to trash
}

func (h *BoardHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		http.Error(w, "Missing workspace_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetBoardsForWorkspace(workspaceID)
	if err != nil {
		http.Error(w, "Failed to retrieve boards", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Verify plan board limits
	ws, err := h.Store.GetWorkspaceByID(req.WorkspaceID)
	if err != nil || ws == nil {
		http.Error(w, "Workspace not found", http.StatusNotFound)
		return
	}

	if ws.TeamID != "" {
		sub, err := h.Store.GetSubscriptionByTeam(ws.TeamID)
		if err == nil && sub != nil {
			boardCount, _ := h.Store.CountBoardsInWorkspace(req.WorkspaceID)
			limit := Tiers[sub.Plan].BoardLimit
			if boardCount >= limit {
				http.Error(w, fmt.Sprintf("Board limit reached for %s plan (%d boards). Please upgrade your subscription to create more boards.", sub.Plan, limit), http.StatusForbidden)
				return
			}
		}
	}

	boardIDToken, _ := auth.GenerateRandomToken()
	boardID := "brd_" + boardIDToken[:16]

	b := &storage.Board{
		ID:          boardID,
		OwnerID:     userID,
		WorkspaceID: req.WorkspaceID,
		Name:        req.Name,
		Description: req.Description,
		Visibility:  req.Visibility,
		IsStarred:   false,
		IsArchived:  false,
		IsDeleted:   false,
	}

	if err := h.Store.CreateBoard(b); err != nil {
		http.Error(w, "Failed to create board", http.StatusInternalServerError)
		return
	}

	// Add creator as owner member of the board
	_ = h.Store.CreateWorkspaceMember(&storage.WorkspaceMember{
		WorkspaceID: req.WorkspaceID,
		UserID:      userID,
		Role:        "owner",
	})

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "board.create",
		TargetType: "board",
		TargetID:   boardID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(b)
}

func (h *BoardHandler) UpdateBoardStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateBoardStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	err := h.Store.UpdateBoardStatus(req.BoardID, req.IsStarred, req.IsArchived, req.IsDeleted)
	if err != nil {
		http.Error(w, "Failed to update board status", http.StatusInternalServerError)
		return
	}

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "board.update_status",
		TargetType: "board",
		TargetID:   req.BoardID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}
