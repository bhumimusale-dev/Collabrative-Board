package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type SaasHandler struct {
	Store *storage.Store
}

type SendInvitationRequest struct {
	TeamID string `json:"team_id"`
	Email  string `json:"email"`
	Role   string `json:"role"` // "admin", "editor", "viewer"
}

type RespondInvitationRequest struct {
	Token  string `json:"token"`
	Action string `json:"action"` // "accept" or "decline"
}

func (h *SaasHandler) SendInvitation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SendInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// 1. Verify caller has permission to invite (role Owner or Admin in the team)
	callerRole, err := h.Store.GetUserTeamRole(req.TeamID, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if callerRole != "owner" && callerRole != "admin" {
		http.Error(w, "Forbidden: Only Owners and Admins can invite members", http.StatusForbidden)
		return
	}

	// Verify plan member limits
	sub, err := h.Store.GetSubscriptionByTeam(req.TeamID)
	if err == nil && sub != nil {
		memberCount, _ := h.Store.CountMembersInTeam(req.TeamID)
		limit := Tiers[sub.Plan].MemberLimit
		if memberCount >= limit {
			http.Error(w, fmt.Sprintf("Member limit reached for %s plan (%d members). Please upgrade your subscription to invite more collaborators.", sub.Plan, limit), http.StatusForbidden)
			return
		}
	}

	// 2. Generate invitation token and ID
	inviteToken, _ := auth.GenerateRandomToken()
	inviteIDToken, _ := auth.GenerateRandomToken()

	invite := &storage.TeamInvitation{
		ID:        "inv_" + inviteIDToken[:16],
		TeamID:    req.TeamID,
		Email:     req.Email,
		Role:      req.Role,
		Token:     inviteToken,
		CreatedBy: userID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days expiration
	}

	if err := h.Store.CreateInvitation(invite); err != nil {
		http.Error(w, "Failed to create invitation", http.StatusInternalServerError)
		return
	}

	// Log mock email invitation URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	log.Printf("[MOCK EMAIL] Team invitation link for %s: %s/dashboard?invite_token=%s", req.Email, frontendURL, inviteToken)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(invite)
}

func (h *SaasHandler) ListInvitations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get user email
	user, err := h.Store.GetUserByID(userID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	list, err := h.Store.GetInvitationsForEmail(user.Email)
	if err != nil {
		http.Error(w, "Failed to retrieve invitations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *SaasHandler) RespondToInvitation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req RespondInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if req.Action == "accept" {
		if err := h.Store.AcceptInvitation(req.Token, userID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	} else {
		// Decline: simply delete or set accepted = 2
		_, err := h.Store.DB().Exec("UPDATE team_invitations SET accepted = 2 WHERE token = ?", req.Token)
		if err != nil {
			http.Error(w, "Failed to decline invitation", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *SaasHandler) ListTeamMembers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	if teamID == "" {
		http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetTeamMembers(teamID)
	if err != nil {
		http.Error(w, "Failed to retrieve team members", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *SaasHandler) ListTeamWorkspaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	if teamID == "" {
		http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetWorkspacesForTeam(teamID)
	if err != nil {
		http.Error(w, "Failed to retrieve team workspaces", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}
