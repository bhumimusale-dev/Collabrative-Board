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
	OwnerID     string    `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type OrgMember struct {
	OrgID    string    `json:"org_id"`
	UserID   string    `json:"user_id"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}

type OrgMemberDetail struct {
	OrgID    string `json:"org_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type ActivityLog struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	UserName  string    `json:"user_name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
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
	query := `INSERT INTO organizations (id, name, logo, domain, description, owner_id) VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, org.ID, org.Name, org.Logo, org.Domain, org.Description, org.OwnerID)
	return err
}

func (s *Store) UpdateOrganization(org *Organization) error {
	query := `UPDATE organizations SET name = ?, logo = ?, domain = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.Exec(query, org.Name, org.Logo, org.Domain, org.Description, org.ID)
	return err
}

func (s *Store) DeleteOrganization(id string) error {
	_, err := s.db.Exec(`DELETE FROM organizations WHERE id = ?`, id)
	return err
}

func (s *Store) GetOrganizationByID(id string) (*Organization, error) {
	query := `SELECT id, name, logo, domain, description, COALESCE(owner_id, ''), created_at, updated_at FROM organizations WHERE id = ?`
	row := s.db.QueryRow(query, id)

	var org Organization
	var logoNull, domNull, descNull sqlNullString
	var createdAtStr, updatedAtStr string

	err := row.Scan(&org.ID, &org.Name, &logoNull, &domNull, &descNull, &org.OwnerID, &createdAtStr, &updatedAtStr)
	if err != nil {
		return nil, err
	}

	org.Logo = logoNull.String
	org.Domain = domNull.String
	org.Description = descNull.String
	org.CreatedAt = parseSQLiteTime(createdAtStr)
	org.UpdatedAt = parseSQLiteTime(updatedAtStr)

	return &org, nil
}

func (s *Store) GetOrganizationsForUser(userID string) ([]*Organization, error) {
	query := `
	SELECT o.id, o.name, o.logo, o.domain, o.description, COALESCE(o.owner_id, '') FROM organizations o
	INNER JOIN org_members om ON o.id = om.org_id
	WHERE om.user_id = ?`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Organization
	for rows.Next() {
		var o Organization
		var logoNull, domNull, descNull sqlNullString
		if err := rows.Scan(&o.ID, &o.Name, &logoNull, &domNull, &descNull, &o.OwnerID); err != nil {
			return nil, err
		}
		o.Logo = logoNull.String
		o.Domain = domNull.String
		o.Description = descNull.String
		list = append(list, &o)
	}
	return list, nil
}

func (s *Store) AddOrgMember(m *OrgMember) error {
	query := `INSERT OR REPLACE INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)`
	_, err := s.db.Exec(query, m.OrgID, m.UserID, m.Role)
	return err
}

func (s *Store) RemoveOrgMember(orgID, userID string) error {
	_, err := s.db.Exec(`DELETE FROM org_members WHERE org_id = ? AND user_id = ?`, orgID, userID)
	return err
}

func (s *Store) UpdateOrgMemberRole(orgID, userID, role string) error {
	_, err := s.db.Exec(`UPDATE org_members SET role = ? WHERE org_id = ? AND user_id = ?`, role, orgID, userID)
	return err
}

func (s *Store) GetOrgMembers(orgID string) ([]*OrgMemberDetail, error) {
	query := `
	SELECT om.org_id, om.user_id, om.role, u.name, u.username, u.email, COALESCE(u.avatar, '')
	FROM org_members om
	INNER JOIN users u ON om.user_id = u.id
	WHERE om.org_id = ?`
	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*OrgMemberDetail
	for rows.Next() {
		var m OrgMemberDetail
		if err := rows.Scan(&m.OrgID, &m.UserID, &m.Role, &m.Name, &m.Username, &m.Email, &m.Avatar); err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, nil
}

func (s *Store) GetUserOrgRole(orgID, userID string) (string, error) {
	query := `SELECT role FROM org_members WHERE org_id = ? AND user_id = ?`
	var role string
	err := s.db.QueryRow(query, orgID, userID).Scan(&role)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return role, err
}

// Notifications
func (s *Store) CreateNotification(n *Notification) error {
	query := `INSERT INTO notifications (id, user_id, title, content, type, is_read) VALUES (?, ?, ?, ?, ?, ?)`
	isReadVal := 0
	if n.IsRead {
		isReadVal = 1
	}
	_, err := s.db.Exec(query, n.ID, n.UserID, n.Title, n.Content, n.Type, isReadVal)
	return err
}

func (s *Store) GetNotificationsForUser(userID string) ([]*Notification, error) {
	query := `SELECT id, user_id, title, content, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Notification
	for rows.Next() {
		var n Notification
		var isReadVal int
		var createdStr string
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.Type, &isReadVal, &createdStr); err != nil {
			return nil, err
		}
		n.IsRead = isReadVal == 1
		n.CreatedAt = parseSQLiteTime(createdStr)
		list = append(list, &n)
	}
	return list, nil
}

func (s *Store) MarkNotificationsAsRead(userID string) error {
	_, err := s.db.Exec(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, userID)
	return err
}

// Activity Logs
func (s *Store) WriteActivityLog(l *ActivityLog) error {
	query := `INSERT INTO activity_logs (id, org_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, l.ID, l.OrgID, l.UserID, l.Action, l.Details)
	return err
}

func (s *Store) GetActivityLogs(orgID string) ([]*ActivityLog, error) {
	query := `
	SELECT al.id, al.org_id, al.user_id, al.action, al.details, al.created_at, u.name
	FROM activity_logs al
	INNER JOIN users u ON al.user_id = u.id
	WHERE al.org_id = ? ORDER BY al.created_at DESC LIMIT 100`
	rows, err := s.db.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*ActivityLog
	for rows.Next() {
		var l ActivityLog
		var createdStr string
		if err := rows.Scan(&l.ID, &l.OrgID, &l.UserID, &l.Action, &l.Details, &createdStr, &l.UserName); err != nil {
			return nil, err
		}
		l.CreatedAt = parseSQLiteTime(createdStr)
		list = append(list, &l)
	}
	return list, nil
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

func (s *Store) UpdateTeam(t *Team) error {
	query := `UPDATE teams SET name = ?, avatar = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.Exec(query, t.Name, t.Avatar, t.Description, t.ID)
	return err
}

func (s *Store) DeleteTeam(id string) error {
	_, err := s.db.Exec(`DELETE FROM teams WHERE id = ?`, id)
	return err
}

func (s *Store) AddTeamMember(m *TeamMember) error {
	query := `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)`
	_, err := s.db.Exec(query, m.TeamID, m.UserID, m.Role)
	return err
}

func (s *Store) RemoveTeamMember(teamID, userID string) error {
	_, err := s.db.Exec(`DELETE FROM team_members WHERE team_id = ? AND user_id = ?`, teamID, userID)
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
