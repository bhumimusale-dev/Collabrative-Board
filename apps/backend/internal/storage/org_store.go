package storage

import (
	"time"
)

type Organization struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Logo        string    `json:"logo"`
	Domain      string    `json:"domain"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Team struct {
	ID          string    `json:"id"`
	OrgID       string    `json:"org_id"`
	Name        string    `json:"name"`
	Avatar      string    `json:"avatar"`
	Description string    `json:"description"`
	OwnerID     string    `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type TeamMember struct {
	TeamID   string    `json:"team_id"`
	UserID   string    `json:"user_id"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}

func (s *Store) CreateOrganization(org *Organization) error {
	query := `INSERT INTO organizations (id, name, logo, domain, description) VALUES (?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, org.ID, org.Name, org.Logo, org.Domain, org.Description)
	return err
}

func (s *Store) GetOrganizationByID(id string) (*Organization, error) {
	query := `SELECT id, name, logo, domain, description, created_at, updated_at FROM organizations WHERE id = ?`
	row := s.db.QueryRow(query, id)

	var org Organization
	var logoNull, domNull, descNull sqlNullString
	var createdAtStr, updatedAtStr string

	err := row.Scan(&org.ID, &org.Name, &logoNull, &domNull, &descNull, &createdAtStr, &updatedAtStr)
	if err != nil {
		return nil, err
	}

	org.Logo = logoNull.String
	org.Domain = domNull.String
	org.Description = descNull.String
	org.CreatedAt, _ = time.Parse(time.RFC3339, createdAtStr)
	org.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAtStr)

	return &org, nil
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

func (s *Store) CreateTeam(t *Team) error {
	query := `INSERT INTO teams (id, org_id, name, avatar, description, owner_id) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, t.ID, t.OrgID, t.Name, t.Avatar, t.Description, t.OwnerID)
	return err
}

func (s *Store) AddTeamMember(m *TeamMember) error {
	query := `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)`
	_, err := s.db.Exec(query, m.TeamID, m.UserID, m.Role)
	return err
}

func (s *Store) GetTeamsForOrganization(orgID string) ([]*Team, error) {
	query := `SELECT id, org_id, name, avatar, description, owner_id FROM teams WHERE org_id = ?`
	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Team, 0)
	for rows.Next() {
		var t Team
		var avNull, descNull sqlNullString
		if err := rows.Scan(&t.ID, &t.OrgID, &t.Name, &avNull, &descNull, &t.OwnerID); err != nil {
			return nil, err
		}
		t.Avatar = avNull.String
		t.Description = descNull.String
		list = append(list, &t)
	}
	return list, nil
}
