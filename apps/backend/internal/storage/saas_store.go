package storage

import (
	"database/sql"
	"fmt"
	"time"
)

type TeamInvitation struct {
	ID        string    `json:"id"`
	TeamID    string    `json:"team_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Token     string    `json:"token"`
	CreatedBy string    `json:"created_by"`
	ExpiresAt time.Time `json:"expires_at"`
	Accepted  bool      `json:"accepted"`
	CreatedAt time.Time `json:"created_at"`
}

type TeamMemberDetail struct {
	TeamID   string `json:"team_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

func (s *Store) CreateInvitation(invite *TeamInvitation) error {
	query := `
	INSERT INTO team_invitations (id, team_id, email, role, token, created_by, expires_at)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, invite.ID, invite.TeamID, invite.Email, invite.Role, invite.Token, invite.CreatedBy, invite.ExpiresAt)
	return err
}

func (s *Store) GetInvitationByToken(token string) (*TeamInvitation, error) {
	query := `
	SELECT id, team_id, email, role, token, created_by, expires_at, accepted, created_at 
	FROM team_invitations WHERE token = ?`
	row := s.db.QueryRow(query, token)
	var invite TeamInvitation
	var expiresAtStr, createdAtStr string
	var acceptedVal int

	err := row.Scan(&invite.ID, &invite.TeamID, &invite.Email, &invite.Role, &invite.Token, &invite.CreatedBy, &expiresAtStr, &acceptedVal, &createdAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	invite.ExpiresAt = parseSQLiteTime(expiresAtStr)
	invite.CreatedAt = parseSQLiteTime(createdAtStr)
	invite.Accepted = acceptedVal == 1

	return &invite, nil
}

func (s *Store) GetInvitationsForEmail(email string) ([]*TeamInvitation, error) {
	query := `
	SELECT id, team_id, email, role, token, created_by, expires_at, accepted, created_at 
	FROM team_invitations WHERE email = ? AND accepted = 0`
	rows, err := s.db.Query(query, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*TeamInvitation
	for rows.Next() {
		var invite TeamInvitation
		var expiresAtStr, createdAtStr string
		var acceptedVal int
		err := rows.Scan(&invite.ID, &invite.TeamID, &invite.Email, &invite.Role, &invite.Token, &invite.CreatedBy, &expiresAtStr, &acceptedVal, &createdAtStr)
		if err != nil {
			return nil, err
		}
		invite.ExpiresAt = parseSQLiteTime(expiresAtStr)
		invite.CreatedAt = parseSQLiteTime(createdAtStr)
		invite.Accepted = acceptedVal == 1
		list = append(list, &invite)
	}
	return list, nil
}

func (s *Store) AcceptInvitation(inviteToken string, userID string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get invitation
	query := `SELECT id, team_id, role, accepted FROM team_invitations WHERE token = ?`
	row := tx.QueryRow(query, inviteToken)
	var inviteID, teamID, role string
	var acceptedVal int
	if err := row.Scan(&inviteID, &teamID, &role, &acceptedVal); err != nil {
		return err
	}

	if acceptedVal == 1 {
		return fmt.Errorf("invitation already accepted")
	}

	// 2. Add member to team_members
	queryAdd := `INSERT OR REPLACE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)`
	if _, err := tx.Exec(queryAdd, teamID, userID, role); err != nil {
		return err
	}

	// 3. Mark accepted
	queryUpdate := `UPDATE team_invitations SET accepted = 1 WHERE id = ?`
	if _, err := tx.Exec(queryUpdate, inviteID); err != nil {
		return err
	}

	// 4. Grant access to all team workspaces
	queryWS := `SELECT id FROM workspaces WHERE team_id = ?`
	rows, err := tx.Query(queryWS, teamID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var wsIDs []string
	for rows.Next() {
		var wsID string
		if err := rows.Scan(&wsID); err != nil {
			return err
		}
		wsIDs = append(wsIDs, wsID)
	}

	// Workspaces member roles map to editor/viewer accordingly
	workspaceRole := "editor"
	if role == "viewer" {
		workspaceRole = "viewer"
	} else if role == "owner" || role == "admin" {
		workspaceRole = "admin"
	}

	for _, wsID := range wsIDs {
		queryGrant := `INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)`
		if _, err := tx.Exec(queryGrant, wsID, userID, workspaceRole); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *Store) GetTeamMembers(teamID string) ([]*TeamMemberDetail, error) {
	query := `
	SELECT tm.team_id, tm.user_id, tm.role, u.name, u.username, u.email, COALESCE(u.avatar, '')
	FROM team_members tm
	INNER JOIN users u ON tm.user_id = u.id
	WHERE tm.team_id = ?`
	rows, err := s.db.Query(query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*TeamMemberDetail
	for rows.Next() {
		var m TeamMemberDetail
		err := rows.Scan(&m.TeamID, &m.UserID, &m.Role, &m.Name, &m.Username, &m.Email, &m.Avatar)
		if err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, nil
}

func (s *Store) GetWorkspacesForTeam(teamID string) ([]*Workspace, error) {
	query := `SELECT id, owner_id, name, type FROM workspaces WHERE team_id = ?`
	rows, err := s.db.Query(query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Workspace
	for rows.Next() {
		var w Workspace
		if err := rows.Scan(&w.ID, &w.OwnerID, &w.Name, &w.Type); err != nil {
			return nil, err
		}
		list = append(list, &w)
	}
	return list, nil
}

// GetUserTeamRole retrieves user role in a team
func (s *Store) GetUserTeamRole(teamID string, userID string) (string, error) {
	query := `SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`
	row := s.db.QueryRow(query, teamID, userID)
	var role string
	err := row.Scan(&role)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return role, err
}
