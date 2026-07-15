package storage

import (
	"database/sql"
	"time"
)

type BoardVersion struct {
	ID            string    `json:"id"`
	BoardID       string    `json:"board_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	VersionNumber int       `json:"version_number"`
	CRDTUpdate    []byte    `json:"crdt_update"`
	AuthorID      string    `json:"author_id"`
	CreatedAt     time.Time `json:"created_at"`
	AuthorName    string    `json:"author_name,omitempty"`
	AuthorAvatar  string    `json:"author_avatar,omitempty"`
}

func (s *Store) CreateBoardVersion(v *BoardVersion) error {
	// First, get the max version number for this board to increment it
	var maxVersion int
	queryMax := `SELECT COALESCE(MAX(version_number), 0) FROM board_versions WHERE board_id = ?`
	err := s.db.QueryRow(queryMax, v.BoardID).Scan(&maxVersion)
	if err != nil {
		return err
	}
	v.VersionNumber = maxVersion + 1

	query := `
	INSERT INTO board_versions (id, board_id, name, description, version_number, crdt_update, author_id)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	
	var authorVal interface{}
	if v.AuthorID != "" {
		authorVal = v.AuthorID
	} else {
		authorVal = nil
	}

	_, err = s.db.Exec(query, v.ID, v.BoardID, v.Name, v.Description, v.VersionNumber, v.CRDTUpdate, authorVal)
	return err
}

func (s *Store) GetBoardVersions(boardID string) ([]*BoardVersion, error) {
	query := `
	SELECT bv.id, bv.board_id, bv.name, bv.description, bv.version_number, bv.crdt_update, COALESCE(bv.author_id, ''), bv.created_at,
	       COALESCE(u.name, 'System'), COALESCE(u.avatar, '')
	FROM board_versions bv
	LEFT JOIN users u ON bv.author_id = u.id
	WHERE bv.board_id = ?
	ORDER BY bv.version_number DESC`

	rows, err := s.db.Query(query, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*BoardVersion, 0)
	for rows.Next() {
		var v BoardVersion
		var descNull sql.NullString
		var createdAtStr string
		err := rows.Scan(
			&v.ID, &v.BoardID, &v.Name, &descNull, &v.VersionNumber, &v.CRDTUpdate, &v.AuthorID, &createdAtStr,
			&v.AuthorName, &v.AuthorAvatar,
		)
		if err != nil {
			return nil, err
		}
		v.Description = descNull.String
		v.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		if v.CreatedAt.IsZero() {
			v.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
		}
		list = append(list, &v)
	}
	return list, nil
}

func (s *Store) GetBoardVersionByID(id string) (*BoardVersion, error) {
	query := `
	SELECT bv.id, bv.board_id, bv.name, bv.description, bv.version_number, bv.crdt_update, COALESCE(bv.author_id, ''), bv.created_at
	FROM board_versions bv
	WHERE bv.id = ?`

	row := s.db.QueryRow(query, id)
	var v BoardVersion
	var descNull sql.NullString
	var createdAtStr string
	err := row.Scan(&v.ID, &v.BoardID, &v.Name, &descNull, &v.VersionNumber, &v.CRDTUpdate, &v.AuthorID, &createdAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	v.Description = descNull.String
	v.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
	if v.CreatedAt.IsZero() {
		v.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
	}
	return &v, nil
}
