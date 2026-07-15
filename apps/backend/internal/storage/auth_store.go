package storage

import (
	"database/sql"
	"time"
)

// User models
type User struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	Avatar        string    `json:"avatar"`
	Bio           string    `json:"bio"`
	Theme         string    `json:"theme"`
	Language      string    `json:"language"`
	Timezone      string    `json:"timezone"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Session models
type Session struct {
	ID               string
	UserID           string
	RefreshTokenHash string
	DeviceID         string
	DeviceName       string
	IPAddress        string
	UserAgent        string
	ExpiresAt        time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// Workspace models
type Workspace struct {
	ID        string    `json:"id"`
	OwnerID   string    `json:"owner_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	TeamID    string    `json:"team_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WorkspaceMember struct {
	WorkspaceID string
	UserID      string
	Role        string
	JoinedAt    time.Time
}

// Board models
type Board struct {
	ID          string    `json:"id"`
	OwnerID     string    `json:"owner_id"`
	WorkspaceID string    `json:"workspace_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Thumbnail   string    `json:"thumbnail"`
	Visibility  string    `json:"visibility"`
	IsStarred   bool      `json:"is_starred"`
	IsArchived  bool      `json:"is_archived"`
	IsDeleted   bool      `json:"is_deleted"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AuditLog model
type AuditLog struct {
	ID         string
	UserID     string
	Action     string
	TargetType string
	TargetID   string
	IPAddress  string
	UserAgent  string
	CreatedAt  time.Time
}

// User Queries
func (s *Store) CreateUser(u *User) error {
	query := `
	INSERT INTO users (id, name, username, email, password_hash, avatar, bio, theme, language, timezone, email_verified)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	verifiedVal := 0
	if u.EmailVerified {
		verifiedVal = 1
	}
	_, err := s.db.Exec(query, u.ID, u.Name, u.Username, u.Email, u.PasswordHash, u.Avatar, u.Bio, u.Theme, u.Language, u.Timezone, verifiedVal)
	return err
}

func (s *Store) GetUserByEmail(email string) (*User, error) {
	query := `SELECT id, name, username, email, password_hash, avatar, bio, theme, language, timezone, email_verified, created_at, updated_at FROM users WHERE email = ?`
	row := s.db.QueryRow(query, email)
	return scanUser(row)
}

func (s *Store) GetUserByID(id string) (*User, error) {
	query := `SELECT id, name, username, email, password_hash, avatar, bio, theme, language, timezone, email_verified, created_at, updated_at FROM users WHERE id = ?`
	row := s.db.QueryRow(query, id)
	return scanUser(row)
}

func parseSQLiteTime(str string) time.Time {
	if str == "" {
		return time.Time{}
	}
	layouts := []string{
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999Z",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02 15:04:05Z",
		"2006-01-02 15:04:05",
		time.RFC3339,
		"2006-01-02T15:04:05.999999999-07:00",
		"2006-01-02T15:04:05",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, str)
		if err == nil {
			return t
		}
	}
	return time.Time{}
}

func scanUser(row *sql.Row) (*User, error) {
	var u User
	var emailVerifiedVal int
	var avatarNull, bioNull sql.NullString
	var createdAtStr, updatedAtStr string

	err := row.Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.PasswordHash, &avatarNull, &bioNull, &u.Theme, &u.Language, &u.Timezone, &emailVerifiedVal, &createdAtStr, &updatedAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	u.Avatar = avatarNull.String
	u.Bio = bioNull.String
	u.EmailVerified = emailVerifiedVal == 1

	u.CreatedAt = parseSQLiteTime(createdAtStr)
	u.UpdatedAt = parseSQLiteTime(updatedAtStr)

	return &u, nil
}

// Session Queries
func (s *Store) CreateSession(sess *Session) error {
	query := `
	INSERT INTO sessions (id, user_id, refresh_token_hash, device_id, device_name, ip_address, user_agent, expires_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, sess.ID, sess.UserID, sess.RefreshTokenHash, sess.DeviceID, sess.DeviceName, sess.IPAddress, sess.UserAgent, sess.ExpiresAt)
	return err
}

func (s *Store) GetSessionByTokenHash(hash string) (*Session, error) {
	query := `SELECT id, user_id, refresh_token_hash, device_id, device_name, ip_address, user_agent, expires_at FROM sessions WHERE refresh_token_hash = ?`
	row := s.db.QueryRow(query, hash)
	var sess Session
	var ipNull, uaNull sql.NullString
	var expiresAtStr string

	err := row.Scan(&sess.ID, &sess.UserID, &sess.RefreshTokenHash, &sess.DeviceID, &sess.DeviceName, &ipNull, &uaNull, &expiresAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	sess.IPAddress = ipNull.String
	sess.UserAgent = uaNull.String
	sess.ExpiresAt = parseSQLiteTime(expiresAtStr)

	return &sess, nil
}

func (s *Store) DeleteSession(id string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE id = ?`, id)
	return err
}

func (s *Store) DeleteAllSessionsForUser(userID string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
	return err
}

// Workspace Queries
func (s *Store) CreateWorkspace(w *Workspace) error {
	query := `INSERT INTO workspaces (id, owner_id, name, type, team_id) VALUES (?, ?, ?, ?, ?)`
	var teamIDVal interface{}
	if w.TeamID != "" {
		teamIDVal = w.TeamID
	} else {
		teamIDVal = nil
	}
	_, err := s.db.Exec(query, w.ID, w.OwnerID, w.Name, w.Type, teamIDVal)
	return err
}

func (s *Store) CreateWorkspaceMember(m *WorkspaceMember) error {
	query := `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)`
	_, err := s.db.Exec(query, m.WorkspaceID, m.UserID, m.Role)
	return err
}

func (s *Store) GetWorkspacesForUser(userID string) ([]*Workspace, error) {
	query := `
	SELECT w.id, w.owner_id, w.name, w.type, COALESCE(w.team_id, '') FROM workspaces w
	INNER JOIN workspace_members wm ON w.id = wm.workspace_id
	WHERE wm.user_id = ?`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Workspace, 0)
	for rows.Next() {
		var w Workspace
		if err := rows.Scan(&w.ID, &w.OwnerID, &w.Name, &w.Type, &w.TeamID); err != nil {
			return nil, err
		}
		list = append(list, &w)
	}
	return list, nil
}

// Board Queries
func (s *Store) CreateBoard(b *Board) error {
	query := `
	INSERT INTO boards (id, owner_id, workspace_id, name, description, thumbnail, visibility, is_starred, is_archived, is_deleted)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	starredVal := 0
	if b.IsStarred {
		starredVal = 1
	}
	archivedVal := 0
	if b.IsArchived {
		archivedVal = 1
	}
	deletedVal := 0
	if b.IsDeleted {
		deletedVal = 1
	}

	_, err := s.db.Exec(query, b.ID, b.OwnerID, b.WorkspaceID, b.Name, b.Description, b.Thumbnail, b.Visibility, starredVal, archivedVal, deletedVal)
	return err
}

func (s *Store) GetBoardsForWorkspace(workspaceID string) ([]*Board, error) {
	query := `
	SELECT id, owner_id, workspace_id, name, description, thumbnail, visibility, is_starred, is_archived, is_deleted 
	FROM boards WHERE workspace_id = ? AND is_deleted = 0`
	rows, err := s.db.Query(query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*Board, 0)
	for rows.Next() {
		var b Board
		var descNull, thumbNull sql.NullString
		var starredVal, archivedVal, deletedVal int

		err := rows.Scan(&b.ID, &b.OwnerID, &b.WorkspaceID, &b.Name, &descNull, &thumbNull, &b.Visibility, &starredVal, &archivedVal, &deletedVal)
		if err != nil {
			return nil, err
		}

		b.Description = descNull.String
		b.Thumbnail = thumbNull.String
		b.IsStarred = starredVal == 1
		b.IsArchived = archivedVal == 1
		b.IsDeleted = deletedVal == 1
		list = append(list, &b)
	}
	return list, nil
}

func (s *Store) UpdateBoardStatus(id string, starred bool, archived bool, deleted bool) error {
	starredVal := 0
	if starred {
		starredVal = 1
	}
	archivedVal := 0
	if archived {
		archivedVal = 1
	}
	deletedVal := 0
	if deleted {
		deletedVal = 1
	}

	query := `UPDATE boards SET is_starred = ?, is_archived = ?, is_deleted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.Exec(query, starredVal, archivedVal, deletedVal, id)
	return err
}

// Audit Logging Query
func (s *Store) WriteAuditLog(log *AuditLog) error {
	query := `
	INSERT INTO audit_logs (id, user_id, action, target_type, target_id, ip_address, user_agent)
	VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, log.ID, log.UserID, log.Action, log.TargetType, log.TargetID, log.IPAddress, log.UserAgent)
	return err
}

// UpdateUser updates user profile fields.
func (s *Store) UpdateUser(u *User) error {
	query := `
	UPDATE users 
	SET name = ?, username = ?, email = ?, avatar = ?, bio = ?, theme = ?, language = ?, timezone = ?, email_verified = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?`
	verifiedVal := 0
	if u.EmailVerified {
		verifiedVal = 1
	}
	_, err := s.db.Exec(query, u.Name, u.Username, u.Email, u.Avatar, u.Bio, u.Theme, u.Language, u.Timezone, verifiedVal, u.ID)
	return err
}

// UpdateUserPassword updates the password hash for a user.
func (s *Store) UpdateUserPassword(userID string, passwordHash string) error {
	query := `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := s.db.Exec(query, passwordHash, userID)
	return err
}

// UserToken models
type UserToken struct {
	UserID    string    `json:"user_id"`
	TokenType string    `json:"token_type"`
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (s *Store) CreateUserToken(ut *UserToken) error {
	query := `INSERT OR REPLACE INTO user_tokens (user_id, token_type, token_hash, expires_at) VALUES (?, ?, ?, ?)`
	_, err := s.db.Exec(query, ut.UserID, ut.TokenType, ut.TokenHash, ut.ExpiresAt)
	return err
}

func (s *Store) GetUserToken(tokenHash string, tokenType string) (*UserToken, error) {
	query := `SELECT user_id, token_type, token_hash, expires_at FROM user_tokens WHERE token_hash = ? AND token_type = ?`
	row := s.db.QueryRow(query, tokenHash, tokenType)
	var ut UserToken
	var expiresAtStr string
	err := row.Scan(&ut.UserID, &ut.TokenType, &ut.TokenHash, &expiresAtStr)
	if err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	ut.ExpiresAt = parseSQLiteTime(expiresAtStr)
	return &ut, nil
}

func (s *Store) DeleteUserToken(tokenHash string) error {
	_, err := s.db.Exec(`DELETE FROM user_tokens WHERE token_hash = ?`, tokenHash)
	return err
}

func (s *Store) DeleteUserTokens(userID string, tokenType string) error {
	_, err := s.db.Exec(`DELETE FROM user_tokens WHERE user_id = ? AND token_type = ?`, userID, tokenType)
	return err
}

