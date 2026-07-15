package storage

import (
	"database/sql"
	"time"
)

type Subscription struct {
	ID                 string    `json:"id"`
	TeamID             string    `json:"team_id"`
	Plan               string    `json:"plan"` // "free", "pro", "business", "enterprise"
	Status             string    `json:"status"` // "active", "trialing", "canceled"
	TrialEndsAt        time.Time `json:"trial_ends_at"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type PaymentHistory struct {
	ID         string    `json:"id"`
	TeamID     string    `json:"team_id"`
	Amount     int       `json:"amount"` // in cents
	Currency   string    `json:"currency"`
	Status     string    `json:"status"`
	InvoiceURL string    `json:"invoice_url"`
	CreatedAt  time.Time `json:"created_at"`
}

func (s *Store) GetSubscriptionByTeam(teamID string) (*Subscription, error) {
	query := `
	SELECT id, team_id, plan, status, trial_ends_at, current_period_start, current_period_end, created_at, updated_at
	FROM subscriptions WHERE team_id = ?`
	row := s.db.QueryRow(query, teamID)

	var sub Subscription
	var trialEndsStr, startStr, endStr, createdStr, updatedStr string
	err := row.Scan(&sub.ID, &sub.TeamID, &sub.Plan, &sub.Status, &trialEndsStr, &startStr, &endStr, &createdStr, &updatedStr)
	
	if err == sql.ErrNoRows {
		// Default to free plan if no entry exists
		return &Subscription{
			ID:                 "sub_default_" + teamID[:8],
			TeamID:             teamID,
			Plan:               "free",
			Status:             "active",
			TrialEndsAt:        time.Time{},
			CurrentPeriodStart: time.Now(),
			CurrentPeriodEnd:   time.Now().AddDate(1, 0, 0),
		}, nil
	} else if err != nil {
		return nil, err
	}

	sub.TrialEndsAt = parseSQLiteTime(trialEndsStr)
	sub.CurrentPeriodStart = parseSQLiteTime(startStr)
	sub.CurrentPeriodEnd = parseSQLiteTime(endStr)
	sub.CreatedAt = parseSQLiteTime(createdStr)
	sub.UpdatedAt = parseSQLiteTime(updatedStr)

	return &sub, nil
}

func (s *Store) UpdateSubscription(sub *Subscription) error {
	query := `
	INSERT OR REPLACE INTO subscriptions (id, team_id, plan, status, trial_ends_at, current_period_start, current_period_end, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, sub.ID, sub.TeamID, sub.Plan, sub.Status, sub.TrialEndsAt, sub.CurrentPeriodStart, sub.CurrentPeriodEnd, time.Now())
	return err
}

func (s *Store) CreatePaymentRecord(pay *PaymentHistory) error {
	query := `
	INSERT INTO payment_history (id, team_id, amount, currency, status, invoice_url)
	VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, pay.ID, pay.TeamID, pay.Amount, pay.Currency, pay.Status, pay.InvoiceURL)
	return err
}

func (s *Store) GetPaymentHistory(teamID string) ([]*PaymentHistory, error) {
	query := `
	SELECT id, team_id, amount, currency, status, invoice_url, created_at
	FROM payment_history WHERE team_id = ?
	ORDER BY created_at DESC`
	rows, err := s.db.Query(query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*PaymentHistory
	for rows.Next() {
		var pay PaymentHistory
		var createdStr string
		if err := rows.Scan(&pay.ID, &pay.TeamID, &pay.Amount, &pay.Currency, &pay.Status, &pay.InvoiceURL, &createdStr); err != nil {
			return nil, err
		}
		pay.CreatedAt = parseSQLiteTime(createdStr)
		list = append(list, &pay)
	}
	return list, nil
}

func (s *Store) CountBoardsInWorkspace(wsID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM boards WHERE workspace_id = ? AND is_deleted = 0`
	err := s.db.QueryRow(query, wsID).Scan(&count)
	return count, err
}

func (s *Store) CountMembersInTeam(teamID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM team_members WHERE team_id = ?`
	err := s.db.QueryRow(query, teamID).Scan(&count)
	return count, err
}
