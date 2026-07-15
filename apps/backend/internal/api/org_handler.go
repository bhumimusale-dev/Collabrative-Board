package api

import (
	"encoding/json"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

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
	}

	if err := h.Store.CreateOrganization(org); err != nil {
		http.Error(w, "Failed to create organization", http.StatusInternalServerError)
		return
	}

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
