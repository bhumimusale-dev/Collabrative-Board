package api

import (
	"encoding/json"
	"net/http"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type TemplateHandler struct {
	Store *storage.Store
}

type PublishTemplateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Tags        string `json:"tags"`
	Thumbnail   string `json:"thumbnail"`
	BoardID     string `json:"board_id"` // Clones state from this board
}

type InstallTemplateRequest struct {
	TemplateID  string `json:"template_id"`
	WorkspaceID string `json:"workspace_id"`
}

type SubmitReviewRequest struct {
	TemplateID string `json:"template_id"`
	Rating     int    `json:"rating"`
	ReviewText string `json:"review_text"`
}

func (h *TemplateHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	category := r.URL.Query().Get("category")
	query := r.URL.Query().Get("query")

	list, err := h.Store.GetTemplates(category, query)
	if err != nil {
		http.Error(w, "Failed to load templates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *TemplateHandler) PublishTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req PublishTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// 1. Fetch CRDT updates of the source board to snapshot it
	updates, err := h.Store.GetUpdates(req.BoardID)
	if err != nil {
		http.Error(w, "Source board not found or empty", http.StatusBadRequest)
		return
	}

	// Merge all binary updates into a single blob
	var crdtBlob []byte
	for _, update := range updates {
		crdtBlob = append(crdtBlob, update...)
	}

	templateIDToken, _ := auth.GenerateRandomToken()
	templateID := "tmp_" + templateIDToken[:16]

	t := &storage.Template{
		ID:          templateID,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Tags:        req.Tags,
		AuthorID:    userID,
		Thumbnail:   req.Thumbnail,
		CRDTData:    crdtBlob,
		Version:     "1.0.0",
	}

	if err := h.Store.CreateTemplate(t); err != nil {
		http.Error(w, "Failed to publish template", http.StatusInternalServerError)
		return
	}

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "template.publish",
		TargetType: "template",
		TargetID:   templateID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(t)
}

func (h *TemplateHandler) InstallTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req InstallTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Fetch template to retrieve its baseline CRDT snapshot
	var crdtBlob []byte
	row := h.Store.DB().QueryRow("SELECT crdt_data, name, description, thumbnail FROM templates WHERE id = ?", req.TemplateID)
	var name, desc, thumb string
	if err := row.Scan(&crdtBlob, &name, &desc, &thumb); err != nil {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}

	// Create a new board inside target workspace
	boardIDToken, _ := auth.GenerateRandomToken()
	boardID := "brd_" + boardIDToken[:16]

	b := &storage.Board{
		ID:          boardID,
		OwnerID:     userID,
		WorkspaceID: req.WorkspaceID,
		Name:        "Copy of " + name,
		Description: desc,
		Thumbnail:   thumb,
		Visibility:  "private",
	}

	if err := h.Store.CreateBoard(b); err != nil {
		http.Error(w, "Failed to create board from template", http.StatusInternalServerError)
		return
	}

	// Load template snapshot data into the new board updates
	if len(crdtBlob) > 0 {
		_ = h.Store.SaveUpdate(boardID, crdtBlob)
	}

	_ = h.Store.IncrementTemplateDownloads(req.TemplateID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(b)
}

func (h *TemplateHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SubmitReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	reviewIDToken, _ := auth.GenerateRandomToken()
	reviewID := "rev_" + reviewIDToken[:16]

	review := &storage.TemplateReview{
		ID:         reviewID,
		TemplateID: req.TemplateID,
		UserID:     userID,
		Rating:     req.Rating,
		ReviewText: req.ReviewText,
	}

	if err := h.Store.AddTemplateReview(review); err != nil {
		http.Error(w, "Failed to post review", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(review)
}
