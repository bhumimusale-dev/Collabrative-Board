package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

func mustGenerateToken() string {
	t, _ := auth.GenerateRandomToken()
	return t
}

type OrgHandler struct {
	Store *storage.Store
}

type CreateOrgRequest struct {
	Name        string `json:"name"`
	Domain      string `json:"domain"`
	Description string `json:"description"`
}

type CreateTeamRequest struct {
	OrgID       string `json:"org_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *OrgHandler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	orgIDToken, _ := auth.GenerateRandomToken()
	orgID := "org_" + orgIDToken[:16]

	org := &storage.Organization{
		ID:          orgID,
		Name:        req.Name,
		Domain:      req.Domain,
		Description: req.Description,
		OwnerID:     userID,
	}

	if err := h.Store.CreateOrganization(org); err != nil {
		http.Error(w, "Failed to create organization", http.StatusInternalServerError)
		return
	}

	// Add creator as owner of organization
	_ = h.Store.AddOrgMember(&storage.OrgMember{
		OrgID:  orgID,
		UserID: userID,
		Role:   "owner",
	})

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "org.create",
		TargetType: "org",
		TargetID:   orgID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(org)
}

func (h *OrgHandler) UpdateOrganization(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	orgID := r.URL.Query().Get("id")
	if orgID == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}

	org, err := h.Store.GetOrganizationByID(orgID)
	if err != nil || org == nil {
		http.Error(w, "Organization not found", http.StatusNotFound)
		return
	}

	// Permission check: Owner or Admin
	role, err := h.Store.GetUserOrgRole(orgID, userID)
	if err != nil || (role != "owner" && role != "admin") {
		http.Error(w, "Forbidden: Only Owners/Admins can edit settings", http.StatusForbidden)
		return
	}

	org.Name = req.Name
	org.Domain = req.Domain
	org.Description = req.Description

	if err := h.Store.UpdateOrganization(org); err != nil {
		http.Error(w, "Failed to update organization", http.StatusInternalServerError)
		return
	}

	_ = h.Store.WriteActivityLog(&storage.ActivityLog{
		ID:      "act_" + mustGenerateToken()[:16],
		OrgID:   orgID,
		UserID:  userID,
		Action:  "org_updated",
		Details: "Updated organization settings",
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(org)
}

func (h *OrgHandler) DeleteOrganization(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	orgID := r.URL.Query().Get("id")
	if orgID == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}

	org, err := h.Store.GetOrganizationByID(orgID)
	if err != nil || org == nil {
		http.Error(w, "Organization not found", http.StatusNotFound)
		return
	}

	if org.OwnerID != userID {
		http.Error(w, "Forbidden: Only Owners can delete organizations", http.StatusForbidden)
		return
	}

	if err := h.Store.DeleteOrganization(orgID); err != nil {
		http.Error(w, "Failed to delete organization", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (h *OrgHandler) GetOrganizations(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	list, err := h.Store.GetOrganizationsForUser(userID)
	if err != nil {
		http.Error(w, "Failed to list organizations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *OrgHandler) ListOrgMembers(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("org_id")
	if orgID == "" {
		http.Error(w, "Missing org_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetOrgMembers(orgID)
	if err != nil {
		http.Error(w, "Failed to retrieve members", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *OrgHandler) UpdateOrgMemberRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		OrgID  string `json:"org_id"`
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	callerRole, err := h.Store.GetUserOrgRole(req.OrgID, userID)
	if err != nil || (callerRole != "owner" && callerRole != "admin") {
		http.Error(w, "Forbidden: Only Owners/Admins can manage roles", http.StatusForbidden)
		return
	}

	err = h.Store.UpdateOrgMemberRole(req.OrgID, req.UserID, req.Role)
	if err != nil {
		http.Error(w, "Failed to update role", http.StatusInternalServerError)
		return
	}

	// Create user notification
	_ = h.Store.CreateNotification(&storage.Notification{
		ID:      "notif_" + mustGenerateToken()[:16],
		UserID:  req.UserID,
		Title:   "Role Changed",
		Content: fmt.Sprintf("Your role in organization was updated to %s", req.Role),
		Type:    "role_changed",
	})

	_ = h.Store.WriteActivityLog(&storage.ActivityLog{
		ID:      "act_" + mustGenerateToken()[:16],
		OrgID:   req.OrgID,
		UserID:  userID,
		Action:  "role_updated",
		Details: fmt.Sprintf("Updated role of member to %s", req.Role),
	})

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *OrgHandler) RemoveOrgMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	orgID := r.URL.Query().Get("org_id")
	targetUserID := r.URL.Query().Get("user_id")
	if orgID == "" || targetUserID == "" {
		http.Error(w, "Missing parameters", http.StatusBadRequest)
		return
	}

	callerRole, err := h.Store.GetUserOrgRole(orgID, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// User leaving organization
	if userID == targetUserID {
		err = h.Store.RemoveOrgMember(orgID, targetUserID)
		if err != nil {
			http.Error(w, "Failed to leave organization", http.StatusInternalServerError)
			return
		}
	} else {
		// Removing member
		if callerRole != "owner" && callerRole != "admin" {
			http.Error(w, "Forbidden: Only Owners/Admins can remove members", http.StatusForbidden)
			return
		}
		err = h.Store.RemoveOrgMember(orgID, targetUserID)
		if err != nil {
			http.Error(w, "Failed to remove member", http.StatusInternalServerError)
			return
		}

		_ = h.Store.CreateNotification(&storage.Notification{
			ID:      "notif_" + mustGenerateToken()[:16],
			UserID:  targetUserID,
			Title:   "Removed from Organization",
			Content: "You have been removed from the organization",
			Type:    "user_removed",
		})
	}

	_ = h.Store.WriteActivityLog(&storage.ActivityLog{
		ID:      "act_" + mustGenerateToken()[:16],
		OrgID:   orgID,
		UserID:  userID,
		Action:  "member_removed",
		Details: fmt.Sprintf("Removed member %s", targetUserID),
	})

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
}

func (h *OrgHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	teamIDToken, _ := auth.GenerateRandomToken()
	teamID := "tem_" + teamIDToken[:16]

	t := &storage.Team{
		ID:          teamID,
		OrgID:       req.OrgID,
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
	}

	if err := h.Store.CreateTeam(t); err != nil {
		http.Error(w, "Failed to create team", http.StatusInternalServerError)
		return
	}

	// Add creator as team owner member
	_ = h.Store.AddTeamMember(&storage.TeamMember{
		TeamID: teamID,
		UserID: userID,
		Role:   "owner",
	})

	// Write log
	_ = h.Store.WriteActivityLog(&storage.ActivityLog{
		ID:      "act_" + mustGenerateToken()[:16],
		OrgID:   req.OrgID,
		UserID:  userID,
		Action:  "team_created",
		Details: fmt.Sprintf("Created team %s", req.Name),
	})

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "team.create",
		TargetType: "team",
		TargetID:   teamID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(t)
}

func (h *OrgHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Avatar      string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Permission check
	role, err := h.Store.GetUserTeamRole(req.ID, userID)
	if err != nil || (role != "owner" && role != "admin") {
		http.Error(w, "Forbidden: Only Team Owners/Admins can edit team settings", http.StatusForbidden)
		return
	}

	t := &storage.Team{
		ID:          req.ID,
		Name:        req.Name,
		Description: req.Description,
		Avatar:      req.Avatar,
	}

	if err := h.Store.UpdateTeam(t); err != nil {
		http.Error(w, "Failed to update team", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(t)
}

func (h *OrgHandler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	teamID := r.URL.Query().Get("id")
	if teamID == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}

	role, err := h.Store.GetUserTeamRole(teamID, userID)
	if err != nil || role != "owner" {
		http.Error(w, "Forbidden: Only Team Owners can delete teams", http.StatusForbidden)
		return
	}

	if err := h.Store.DeleteTeam(teamID); err != nil {
		http.Error(w, "Failed to delete team", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (h *OrgHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	orgID := r.URL.Query().Get("org_id")
	if orgID == "" {
		http.Error(w, "Missing org_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetTeamsForOrganization(orgID)
	if err != nil {
		http.Error(w, "Failed to retrieve teams", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *OrgHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if r.Method == http.MethodGet {
		list, err := h.Store.GetNotificationsForUser(userID)
		if err != nil {
			http.Error(w, "Failed to retrieve notifications", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(list)
	} else if r.Method == http.MethodPost || r.Method == http.MethodPatch {
		err := h.Store.MarkNotificationsAsRead(userID)
		if err != nil {
			http.Error(w, "Failed to mark notifications as read", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}

func (h *OrgHandler) GetActivityLogs(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("org_id")
	if orgID == "" {
		http.Error(w, "Missing org_id parameter", http.StatusBadRequest)
		return
	}

	list, err := h.Store.GetActivityLogs(orgID)
	if err != nil {
		http.Error(w, "Failed to retrieve activity logs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}
