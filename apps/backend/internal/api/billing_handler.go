package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type BillingHandler struct {
	Store *storage.Store
}

type SubscribeRequest struct {
	TeamID string `json:"team_id"`
	Plan   string `json:"plan"` // pro, business, enterprise
}

type PlanLimits struct {
	Plan         string `json:"plan"`
	BoardLimit   int    `json:"board_limit"`
	MemberLimit  int    `json:"member_limit"`
	StorageLimit string `json:"storage_limit"`
}

var Tiers = map[string]PlanLimits{
	"free":       {Plan: "free", BoardLimit: 3, MemberLimit: 3, StorageLimit: "50 MB"},
	"pro":        {Plan: "pro", BoardLimit: 20, MemberLimit: 10, StorageLimit: "1 GB"},
	"business":   {Plan: "business", BoardLimit: 500, MemberLimit: 50, StorageLimit: "10 GB"},
	"enterprise": {Plan: "enterprise", BoardLimit: 9999, MemberLimit: 9999, StorageLimit: "Unlimited"},
}

func (h *BillingHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// 1. Verify user role (Only Owners and Admins can manage billing)
	role, err := h.Store.GetUserTeamRole(req.TeamID, userID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if role != "owner" && role != "admin" {
		http.Error(w, "Forbidden: Only Owners/Admins can manage subscriptions", http.StatusForbidden)
		return
	}

	// 2. Validate target plan
	limits, valid := Tiers[req.Plan]
	if !valid {
		http.Error(w, "Invalid plan selection", http.StatusBadRequest)
		return
	}

	// 3. Upsert subscription record
	subIDToken, _ := auth.GenerateRandomToken()
	sub := &storage.Subscription{
		ID:                 "sub_" + subIDToken[:16],
		TeamID:             req.TeamID,
		Plan:               req.Plan,
		Status:             "active",
		TrialEndsAt:        time.Now().AddDate(0, 0, 14), // 14 days trial by default
		CurrentPeriodStart: time.Now(),
		CurrentPeriodEnd:   time.Now().AddDate(0, 1, 0), // 1 month period
	}

	if err := h.Store.UpdateSubscription(sub); err != nil {
		http.Error(w, "Failed to update subscription", http.StatusInternalServerError)
		return
	}

	// 4. Generate mock payment / invoice record
	price := 0
	switch req.Plan {
	case "pro":
		price = 1500 // $15.00
	case "business":
		price = 4900 // $49.00
	case "enterprise":
		price = 29900 // $299.00
	}

	if price > 0 {
		payIDToken, _ := auth.GenerateRandomToken()
		payID := "pay_" + payIDToken[:16]
		pay := &storage.PaymentHistory{
			ID:         payID,
			TeamID:     req.TeamID,
			Amount:     price,
			Currency:   "USD",
			Status:     "succeeded",
			InvoiceURL: fmt.Sprintf("http://localhost:8080/api/billing/invoice?id=%s", payID),
		}
		_ = h.Store.CreatePaymentRecord(pay)
	}

	// 5. Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "subscription.update",
		TargetType: "team",
		TargetID:   req.TeamID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "success",
		"subscription": sub,
		"limits":       limits,
	})
}

func (h *BillingHandler) GetBillingDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	if teamID == "" {
		http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
		return
	}

	sub, err := h.Store.GetSubscriptionByTeam(teamID)
	if err != nil {
		http.Error(w, "Failed to load subscription details", http.StatusInternalServerError)
		return
	}

	// Count active boards across all team workspaces
	workspaces, err := h.Store.GetWorkspacesForTeam(teamID)
	boardCount := 0
	if err == nil {
		for _, ws := range workspaces {
			c, _ := h.Store.CountBoardsInWorkspace(ws.ID)
			boardCount += c
		}
	}

	memberCount, _ := h.Store.CountMembersInTeam(teamID)
	limits := Tiers[sub.Plan]

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"plan":                 sub.Plan,
		"status":               sub.Status,
		"trial_ends_at":        sub.TrialEndsAt,
		"current_period_end":   sub.CurrentPeriodEnd,
		"current_boards":       boardCount,
		"board_limit":          limits.BoardLimit,
		"current_members":      memberCount,
		"member_limit":         limits.MemberLimit,
		"storage_limit":        limits.StorageLimit,
	})
}

func (h *BillingHandler) GetInvoices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	teamID := r.URL.Query().Get("team_id")
	if teamID == "" {
		http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
		return
	}

	history, err := h.Store.GetPaymentHistory(teamID)
	if err != nil {
		http.Error(w, "Failed to load invoices history", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(history)
}

func (h *BillingHandler) ServeInvoiceHTML(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing invoice id", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<title>CollabBoard X Invoice</title>
	<style>
		body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #12131a; color: #e2e8f0; padding: 40px; margin: 0; }
		.invoice-box { max-w-2xl mx-auto p-8 border border-slate-800 rounded-3xl bg-slate-900 shadow-2xl; }
		.header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
		.logo { font-size: 24px; font-weight: 800; color: #6366f1; }
		.amount { font-size: 32px; font-weight: 900; color: #10b981; }
		.details { font-size: 14px; line-height: 1.6; color: #94a3b8; }
	</style>
</head>
<body>
	<div class="invoice-box">
		<div class="header">
			<div>
				<div class="logo">CollabBoard X</div>
				<div class="details" style="margin-top: 10px;">Invoice ID: %s</div>
				<div class="details">Status: <span style="color:#10b981;font-weight:bold;">PAID</span></div>
			</div>
			<div style="text-align: right;">
				<div class="amount">Success</div>
				<div class="details" style="margin-top: 10px;">Date: %s</div>
			</div>
		</div>
		<table style="width: 100%%; border-collapse: collapse; font-size: 14px;">
			<tr style="border-bottom: 1px solid #1e293b; color: #94a3b8; text-align: left;">
				<th style="padding: 12px 0;">Description</th>
				<th style="padding: 12px 0; text-align: right;">Total</th>
			</tr>
			<tr>
				<td style="padding: 16px 0; font-weight: 500;">CollabBoard Subscription Premium Tier Upgrade</td>
				<td style="padding: 16px 0; text-align: right; font-weight: bold; color: #10b981;">$15.00</td>
			</tr>
		</table>
		<div style="margin-top: 40px; text-align: center; font-size: 12px; color: #475569;">
			Thank you for building on CollabBoard X.
		</div>
	</div>
</body>
</html>`, id, time.Now().Format("2006-01-02"))

	_, _ = w.Write([]byte(html))
}
