package storage

import (
	"database/sql"
	"fmt"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	db.SetMaxOpenConns(1)

	// Create tables if they do not exist
	query := `
	CREATE TABLE IF NOT EXISTS updates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		room TEXT NOT NULL,
		data BLOB NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_updates_room ON updates(room);

	-- Users Table
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		username TEXT NOT NULL UNIQUE,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		avatar TEXT,
		bio TEXT,
		theme TEXT DEFAULT 'light',
		language TEXT DEFAULT 'en',
		timezone TEXT DEFAULT 'UTC',
		email_verified INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Sessions Table
	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		refresh_token_hash TEXT NOT NULL,
		device_id TEXT NOT NULL,
		device_name TEXT NOT NULL,
		ip_address TEXT,
		user_agent TEXT,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Workspaces Table
	CREATE TABLE IF NOT EXISTS workspaces (
		id TEXT PRIMARY KEY,
		owner_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT DEFAULT 'personal',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Workspace Members Table
	CREATE TABLE IF NOT EXISTS workspace_members (
		workspace_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		role TEXT DEFAULT 'viewer',
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (workspace_id, user_id),
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Boards Table
	CREATE TABLE IF NOT EXISTS boards (
		id TEXT PRIMARY KEY,
		owner_id TEXT NOT NULL,
		workspace_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		thumbnail TEXT,
		visibility TEXT DEFAULT 'private',
		is_starred INTEGER DEFAULT 0,
		is_archived INTEGER DEFAULT 0,
		is_deleted INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
	);

	-- Board Members Table
	CREATE TABLE IF NOT EXISTS board_members (
		board_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		role TEXT DEFAULT 'viewer',
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (board_id, user_id),
		FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Board Versions Table
	CREATE TABLE IF NOT EXISTS board_versions (
		id TEXT PRIMARY KEY,
		board_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		version_number INTEGER NOT NULL,
		crdt_update BLOB NOT NULL,
		author_id TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
		FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
	);

	-- Audit Logs Table
	CREATE TABLE IF NOT EXISTS audit_logs (
		id TEXT PRIMARY KEY,
		user_id TEXT,
		action TEXT NOT NULL,
		target_type TEXT NOT NULL,
		target_id TEXT,
		ip_address TEXT,
		user_agent TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Organizations Table
	CREATE TABLE IF NOT EXISTS organizations (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		logo TEXT,
		domain TEXT,
		description TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Teams Table
	CREATE TABLE IF NOT EXISTS teams (
		id TEXT PRIMARY KEY,
		org_id TEXT NOT NULL,
		name TEXT NOT NULL,
		avatar TEXT,
		description TEXT,
		owner_id TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
		FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Team Members Table
	CREATE TABLE IF NOT EXISTS team_members (
		team_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (team_id, user_id),
		FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Templates Table
	CREATE TABLE IF NOT EXISTS templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT,
		category TEXT NOT NULL,
		tags TEXT, -- comma-separated tags
		author_id TEXT NOT NULL,
		org_id TEXT, -- Nullable for public templates
		thumbnail TEXT,
		crdt_data BLOB,
		download_count INTEGER DEFAULT 0,
		install_count INTEGER DEFAULT 0,
		rating REAL DEFAULT 0.0,
		version TEXT DEFAULT '1.0.0',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Template Reviews Table
	CREATE TABLE IF NOT EXISTS template_reviews (
		id TEXT PRIMARY KEY,
		template_id TEXT NOT NULL,
		user_id TEXT NOT NULL,
		rating INTEGER CHECK (rating >= 1 AND rating <= 5),
		review_text TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- User Tokens Table (for verification & password resets)
	CREATE TABLE IF NOT EXISTS user_tokens (
		user_id TEXT NOT NULL,
		token_type TEXT NOT NULL,
		token_hash TEXT PRIMARY KEY,
		expires_at TIMESTAMP NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	-- Team Invitations Table
	CREATE TABLE IF NOT EXISTS team_invitations (
		id TEXT PRIMARY KEY,
		team_id TEXT NOT NULL,
		email TEXT NOT NULL,
		role TEXT DEFAULT 'editor',
		token TEXT NOT NULL UNIQUE,
		created_by TEXT NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		accepted INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
		FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
	);
	`
	if _, err := db.Exec(query); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	// Migrations: Add description and author_id to board_versions if they don't exist
	_, _ = db.Exec("ALTER TABLE board_versions ADD COLUMN description TEXT;")
	_, _ = db.Exec("ALTER TABLE board_versions ADD COLUMN author_id TEXT;")
	_, _ = db.Exec("ALTER TABLE workspaces ADD COLUMN team_id TEXT;")

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) SaveUpdate(room string, update []byte) error {
	query := `INSERT INTO updates (room, data) VALUES (?, ?)`
	_, err := s.db.Exec(query, room, update)
	if err != nil {
		return fmt.Errorf("failed to save update: %w", err)
	}
	return nil
}

func (s *Store) GetUpdates(room string) ([][]byte, error) {
	query := `SELECT data FROM updates WHERE room = ? ORDER BY id ASC`
	rows, err := s.db.Query(query, room)
	if err != nil {
		return nil, fmt.Errorf("failed to query updates: %w", err)
	}
	defer rows.Close()

	var updates [][]byte
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return nil, fmt.Errorf("failed to scan update: %w", err)
		}
		updates = append(updates, data)
	}
	return updates, nil
}

func (s *Store) ClearRoom(room string) error {
	query := `DELETE FROM updates WHERE room = ?`
	_, err := s.db.Exec(query, room)
	if err != nil {
		return fmt.Errorf("failed to clear room: %w", err)
	}
	return nil
}

func (s *Store) DB() *sql.DB {
	return s.db
}
