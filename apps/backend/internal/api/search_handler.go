package api

import (
	"encoding/json"
	"net/http"

	"collabboard-backend/internal/storage"
)

type SearchHandler struct {
	Store *storage.Store
}

type SearchResults struct {
	Boards    []*storage.Board    `json:"boards"`
	Templates []*storage.Template `json:"templates"`
}

func (h *SearchHandler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	likeQuery := "%" + query + "%"

	// 1. Query matching boards
	boardRows, err := h.Store.DB().Query(
		"SELECT id, owner_id, workspace_id, name, description, thumbnail, visibility, is_starred, is_archived, is_deleted FROM boards WHERE name LIKE ? OR description LIKE ?", 
		likeQuery, likeQuery,
	)
	boards := make([]*storage.Board, 0)
	if err == nil {
		defer boardRows.Close()
		for boardRows.Next() {
			var b storage.Board
			var descNull, thumbNull sqlNullString
			var starredVal, archivedVal, deletedVal int
			_ = boardRows.Scan(&b.ID, &b.OwnerID, &b.WorkspaceID, &b.Name, &descNull, &thumbNull, &b.Visibility, &starredVal, &archivedVal, &deletedVal)
			b.Description = descNull.String
			b.Thumbnail = thumbNull.String
			b.IsStarred = starredVal == 1
			b.IsArchived = archivedVal == 1
			b.IsDeleted = deletedVal == 1
			boards = append(boards, &b)
		}
	}

	// 2. Query matching templates
	templateRows, err := h.Store.DB().Query(
		"SELECT id, name, description, category, tags, author_id, org_id, thumbnail, download_count, install_count, rating, version FROM templates WHERE name LIKE ? OR description LIKE ?",
		likeQuery, likeQuery,
	)
	templates := make([]*storage.Template, 0)
	if err == nil {
		defer templateRows.Close()
		for templateRows.Next() {
			var t storage.Template
			var descNull, tagsNull, orgNull, thumbNull sqlNullString
			_ = templateRows.Scan(&t.ID, &t.Name, &descNull, &t.Category, &tagsNull, &t.AuthorID, &orgNull, &thumbNull, &t.DownloadCount, &t.InstallCount, &t.Rating, &t.Version)
			t.Description = descNull.String
			t.Tags = tagsNull.String
			t.OrgID = orgNull.String
			t.Thumbnail = thumbNull.String
			templates = append(templates, &t)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(SearchResults{
		Boards:    boards,
		Templates: templates,
	})
}

type sqlNullString struct {
	String string
	Valid  bool
}

func (ns *sqlNullString) Scan(value interface{}) error {
	if value == nil {
		ns.String, ns.Valid = "", false
		return nil
	}
	ns.Valid = true
	switch v := value.(type) {
	case string:
		ns.String = v
	case []byte:
		ns.String = string(v)
	}
	return nil
}
