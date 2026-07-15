package api

import (
	"encoding/json"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type WorkspaceHandler struct {
	Store *storage.Store
}

type CreateWorkspaceRequest struct {
	Name   string `json:"name"`
	Type   string `json:"type"`    // "personal" or "team"
	TeamID string `json:"team_id"` // Optional: Link to team
}

func (h *WorkspaceHandler) ListWorkspaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	list, err := h.Store.GetWorkspacesForUser(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve workspaces", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *WorkspaceHandler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	workspaceIDToken, _ := auth.GenerateRandomToken()
	workspaceID := "ws_" + workspaceIDToken[:16]

	ws := &storage.Workspace{
		ID:      workspaceID,
		OwnerID: userID,
		Name:    req.Name,
		Type:    req.Type,
		TeamID:  req.TeamID,
	}

	if err := h.Store.CreateWorkspace(ws); err != nil {
		http.Error(w, "Failed to create workspace", http.StatusInternalServerError)
		return
	}

	// Add creator as owner member
	_ = h.Store.CreateWorkspaceMember(&storage.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        "owner",
	})

	// If team workspace, automatically add all team members as workspace members
	if req.TeamID != "" {
		members, err := h.Store.GetTeamMembers(req.TeamID)
		if err == nil {
			for _, m := range members {
				if m.UserID == userID {
					continue // Already added as owner
				}
				workspaceRole := "editor"
				if m.Role == "viewer" {
					workspaceRole = "viewer"
				} else if m.Role == "owner" || m.Role == "admin" {
					workspaceRole = "admin"
				}
				_ = h.Store.CreateWorkspaceMember(&storage.WorkspaceMember{
					WorkspaceID: workspaceID,
					UserID:      m.UserID,
					Role:        workspaceRole,
				})
			}
		}
	}

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "workspace.create",
		TargetType: "workspace",
		TargetID:   workspaceID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(ws)
}
