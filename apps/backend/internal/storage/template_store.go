package storage

import (
	"database/sql"
	"time"
)

type Template struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Tags          string    `json:"tags"`
	AuthorID      string    `json:"author_id"`
	OrgID         string    `json:"org_id"`
	Thumbnail     string    `json:"thumbnail"`
	CRDTData      []byte    `json:"-"`
	DownloadCount int       `json:"download_count"`
	InstallCount  int       `json:"install_count"`
	Rating        float64   `json:"rating"`
	Version       string    `json:"version"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type TemplateReview struct {
	ID         string    `json:"id"`
	TemplateID string    `json:"template_id"`
	UserID     string    `json:"user_id"`
	Rating     int       `json:"rating"`
	ReviewText string    `json:"review_text"`
	CreatedAt  time.Time `json:"created_at"`
}

func (s *Store) CreateTemplate(t *Template) error {
	query := `
	INSERT INTO templates (id, name, description, category, tags, author_id, org_id, thumbnail, crdt_data, version)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	var orgVal interface{}
	if t.OrgID != "" {
		orgVal = t.OrgID
	}
	_, err := s.db.Exec(query, t.ID, t.Name, t.Description, t.Category, t.Tags, t.AuthorID, orgVal, t.Thumbnail, t.CRDTData, t.Version)
	return err
}

func (s *Store) GetTemplates(category string, searchQuery string) ([]*Template, error) {
	var rows *sql.Rows
	var err error

	if category != "" && searchQuery != "" {
		query := `SELECT id, name, description, category, tags, author_id, org_id, thumbnail, download_count, install_count, rating, version FROM templates WHERE category = ? AND (name LIKE ? OR description LIKE ?)`
		likeStr := "%" + searchQuery + "%"
		rows, err = s.db.Query(query, category, likeStr, likeStr)
	} else if category != "" {
		query := `SELECT id, name, description, category, tags, author_id, org_id, thumbnail, download_count, install_count, rating, version FROM templates WHERE category = ?`
		rows, err = s.db.Query(query, category)
	} else if searchQuery != "" {
		query := `SELECT id, name, description, category, tags, author_id, org_id, thumbnail, download_count, install_count, rating, version FROM templates WHERE name LIKE ? OR description LIKE ?`
		likeStr := "%" + searchQuery + "%"
		rows, err = s.db.Query(query, likeStr, likeStr)
	} else {
		query := `SELECT id, name, description, category, tags, author_id, org_id, thumbnail, download_count, install_count, rating, version FROM templates`
		rows, err = s.db.Query(query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Template, 0)
	for rows.Next() {
		var t Template
		var descNull, tagsNull, orgNull, thumbNull sql.NullString
		err := rows.Scan(&t.ID, &t.Name, &descNull, &t.Category, &tagsNull, &t.AuthorID, &orgNull, &thumbNull, &t.DownloadCount, &t.InstallCount, &t.Rating, &t.Version)
		if err != nil {
			return nil, err
		}
		t.Description = descNull.String
		t.Tags = tagsNull.String
		t.OrgID = orgNull.String
		t.Thumbnail = thumbNull.String
		list = append(list, &t)
	}
	return list, nil
}

func (s *Store) IncrementTemplateDownloads(id string) error {
	query := `UPDATE templates SET download_count = download_count + 1, install_count = install_count + 1 WHERE id = ?`
	_, err := s.db.Exec(query, id)
	return err
}

func (s *Store) AddTemplateReview(r *TemplateReview) error {
	query := `INSERT INTO template_reviews (id, template_id, user_id, rating, review_text) VALUES (?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, r.ID, r.TemplateID, r.UserID, r.Rating, r.ReviewText)
	if err != nil {
		return err
	}

	// Recompute template average rating
	avgQuery := `UPDATE templates SET rating = (SELECT AVG(rating) FROM template_reviews WHERE template_id = ?) WHERE id = ?`
	_, err = s.db.Exec(avgQuery, r.TemplateID, r.TemplateID)
	return err
}
