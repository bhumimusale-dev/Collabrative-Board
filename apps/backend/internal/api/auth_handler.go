package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"collabboard-backend/internal/auth"
	"collabboard-backend/internal/storage"
)

type AuthHandler struct {
	Store *storage.Store
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	DeviceID   string `json:"device_id"`
	DeviceName string `json:"device_name"`
}

type AuthResponse struct {
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	User         *storage.User `json:"user"`
}

func hashToken(token string) string {
	h := sha256.New()
	h.Write([]byte(token))
	return hex.EncodeToString(h.Sum(nil))
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Generate user ID
	userIDToken, _ := auth.GenerateRandomToken()
	userID := "usr_" + userIDToken[:16]

	u := &storage.User{
		ID:            userID,
		Name:          req.Name,
		Username:      req.Username,
		Email:         req.Email,
		PasswordHash:  hashedPassword,
		Theme:         "light",
		Language:      "en",
		Timezone:      "UTC",
		EmailVerified: false,
	}

	if err := h.Store.CreateUser(u); err != nil {
		http.Error(w, "Registration failed: user or email already exists", http.StatusConflict)
		return
	}

	// Create a default Personal Workspace for the user
	workspaceIDToken, _ := auth.GenerateRandomToken()
	workspaceID := "ws_" + workspaceIDToken[:16]
	ws := &storage.Workspace{
		ID:      workspaceID,
		OwnerID: userID,
		Name:    req.Name + "'s Workspace",
		Type:    "personal",
	}

	_ = h.Store.CreateWorkspace(ws)
	_ = h.Store.CreateWorkspaceMember(&storage.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        "owner",
	})

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     userID,
		Action:     "user.register",
		TargetType: "user",
		TargetID:   userID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	// Generate and save Email Verification Token
	emailToken, _ := auth.GenerateRandomToken()
	_ = h.Store.CreateUserToken(&storage.UserToken{
		UserID:    userID,
		TokenType: "verification",
		TokenHash: hashToken(emailToken),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	log.Printf("[MOCK EMAIL] Verification link for %s: http://localhost:5173/verify-email?token=%s", u.Email, emailToken)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(u)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	u, err := h.Store.GetUserByEmail(req.Email)
	if err != nil || u == nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if !auth.CheckPasswordHash(req.Password, u.PasswordHash) {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate JWT Access Token & Stateful Refresh Token
	accessToken, err := auth.GenerateAccessToken(u.ID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	rawRefreshToken, err := auth.GenerateRandomToken()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	sessionIDToken, _ := auth.GenerateRandomToken()
	session := &storage.Session{
		ID:               "sess_" + sessionIDToken[:16],
		UserID:           u.ID,
		RefreshTokenHash: hashToken(rawRefreshToken),
		DeviceID:         req.DeviceID,
		DeviceName:       req.DeviceName,
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
		ExpiresAt:        time.Now().Add(7 * 24 * time.Hour), // 7 days expiration
	}

	if err := h.Store.CreateSession(session); err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Log audit trail
	auditID, _ := auth.GenerateRandomToken()
	_ = h.Store.WriteAuditLog(&storage.AuditLog{
		ID:         "audit_" + auditID[:16],
		UserID:     u.ID,
		Action:     "user.login",
		TargetType: "session",
		TargetID:   session.ID,
		IPAddress:  r.RemoteAddr,
		UserAgent:  r.UserAgent(),
	})

	// Set Refresh Token as HTTP-Only Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    rawRefreshToken,
		Expires:  session.ExpiresAt,
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		Path:     "/",
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		User:         u,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		http.Error(w, "Not logged in", http.StatusBadRequest)
		return
	}

	tokenHash := hashToken(cookie.Value)
	sess, _ := h.Store.GetSessionByTokenHash(tokenHash)
	if sess != nil {
		_ = h.Store.DeleteSession(sess.ID)
	}

	// Clear HTTP-Only Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		http.Error(w, "Missing refresh token", http.StatusUnauthorized)
		return
	}

	tokenHash := hashToken(cookie.Value)
	sess, err := h.Store.GetSessionByTokenHash(tokenHash)
	if err != nil || sess == nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	if time.Now().After(sess.ExpiresAt) {
		_ = h.Store.DeleteSession(sess.ID)
		http.Error(w, "Expired session", http.StatusUnauthorized)
		return
	}

	// Refresh Token Rotation (RTR): Generate new tokens
	newAccessToken, err := auth.GenerateAccessToken(sess.UserID)
	if err != nil {
		http.Error(w, "Failed to refresh", http.StatusInternalServerError)
		return
	}

	newRawRefreshToken, err := auth.GenerateRandomToken()
	if err != nil {
		http.Error(w, "Failed to refresh", http.StatusInternalServerError)
		return
	}

	// Update existing session with new token hash and expiry
	_ = h.Store.DeleteSession(sess.ID)

	sessionIDToken, _ := auth.GenerateRandomToken()
	newSess := &storage.Session{
		ID:               "sess_" + sessionIDToken[:16],
		UserID:           sess.UserID,
		RefreshTokenHash: hashToken(newRawRefreshToken),
		DeviceID:         sess.DeviceID,
		DeviceName:       sess.DeviceName,
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
		ExpiresAt:        time.Now().Add(7 * 24 * time.Hour),
	}
	_ = h.Store.CreateSession(newSess)

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    newRawRefreshToken,
		Expires:  newSess.ExpiresAt,
		HttpOnly: true,
		Secure:   false,
		Path:     "/",
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"access_token":  newAccessToken,
		"refresh_token": newRawRefreshToken,
	})
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	tokenHash := hashToken(req.Token)
	ut, err := h.Store.GetUserToken(tokenHash, "verification")
	if err != nil || ut == nil {
		http.Error(w, "Invalid or expired verification token", http.StatusBadRequest)
		return
	}

	if time.Now().After(ut.ExpiresAt) {
		_ = h.Store.DeleteUserToken(tokenHash)
		http.Error(w, "Verification token expired", http.StatusBadRequest)
		return
	}

	u, err := h.Store.GetUserByID(ut.UserID)
	if err != nil || u == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	u.EmailVerified = true
	if err := h.Store.UpdateUser(u); err != nil {
		http.Error(w, "Failed to verify email", http.StatusInternalServerError)
		return
	}

	_ = h.Store.DeleteUserToken(tokenHash)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Email verified successfully"})
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	u, err := h.Store.GetUserByEmail(req.Email)
	if err != nil || u == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"message": "If the email exists, a reset link has been sent"})
		return
	}

	_ = h.Store.DeleteUserTokens(u.ID, "password_reset")

	resetToken, _ := auth.GenerateRandomToken()
	err = h.Store.CreateUserToken(&storage.UserToken{
		UserID:    u.ID,
		TokenType: "password_reset",
		TokenHash: hashToken(resetToken),
		ExpiresAt: time.Now().Add(1 * time.Hour),
	})
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	log.Printf("[MOCK EMAIL] Password reset link for %s: http://localhost:5173/reset-password?token=%s", u.Email, resetToken)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "If the email exists, a reset link has been sent"})
}

type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	tokenHash := hashToken(req.Token)
	ut, err := h.Store.GetUserToken(tokenHash, "password_reset")
	if err != nil || ut == nil {
		http.Error(w, "Invalid or expired reset token", http.StatusBadRequest)
		return
	}

	if time.Now().After(ut.ExpiresAt) {
		_ = h.Store.DeleteUserToken(tokenHash)
		http.Error(w, "Reset token expired", http.StatusBadRequest)
		return
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if err := h.Store.UpdateUserPassword(ut.UserID, hashedPassword); err != nil {
		http.Error(w, "Failed to reset password", http.StatusInternalServerError)
		return
	}

	_ = h.Store.DeleteUserToken(tokenHash)
	_ = h.Store.DeleteAllSessionsForUser(ut.UserID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Password reset successfully"})
}

