package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"sync"
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
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	log.Printf("[MOCK EMAIL] Verification link for %s: %s/verify-email?token=%s", u.Email, frontendURL, emailToken)

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

type ipEmailRateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

func (l *ipEmailRateLimiter) isAllowed(key string, limit int, duration time.Duration) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	var validAttempts []time.Time
	for _, t := range l.attempts[key] {
		if now.Sub(t) < duration {
			validAttempts = append(validAttempts, t)
		}
	}

	if len(validAttempts) >= limit {
		l.attempts[key] = validAttempts
		return false
	}

	validAttempts = append(validAttempts, now)
	l.attempts[key] = validAttempts
	return true
}

var authRateLimiter = &ipEmailRateLimiter{
	attempts: make(map[string][]time.Time),
}

func generateOTP() (string, error) {
	var otp string
	for i := 0; i < 6; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		otp += fmt.Sprintf("%d", num.Int64())
	}
	return otp, nil
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

	// Rate limiting by IP and Email
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}

	if !authRateLimiter.isAllowed("ip:"+ip, 5, 5*time.Minute) || !authRateLimiter.isAllowed("email:"+req.Email, 3, 5*time.Minute) {
		http.Error(w, "Too many requests. Please try again later.", http.StatusTooManyRequests)
		return
	}

	genericMsg := map[string]string{"message": "If an account with this email exists, a verification code has been sent."}

	u, err := h.Store.GetUserByEmail(req.Email)
	if err != nil || u == nil {
		// Prevent user enumeration
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(genericMsg)
		return
	}

	otp, err := generateOTP()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Invalidate any previous OTP tokens for this user
	_ = h.Store.DeleteUserTokens(u.ID, "password_reset_otp")

	err = h.Store.CreateUserToken(&storage.UserToken{
		UserID:    u.ID,
		TokenType: "password_reset_otp",
		TokenHash: hashToken(otp),
		ExpiresAt: time.Now().Add(10 * time.Minute), // 10-minute expiration
	})
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Send OTP email (or log to terminal as fallback)
	_ = SendOTP(u.Email, otp)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(genericMsg)
}

type VerifyOTPRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}

	if !authRateLimiter.isAllowed("ip_verify:"+ip, 10, 5*time.Minute) {
		http.Error(w, "Too many requests. Please try again later.", http.StatusTooManyRequests)
		return
	}

	u, err := h.Store.GetUserByEmail(req.Email)
	if err != nil || u == nil {
		http.Error(w, "Invalid verification code or email", http.StatusBadRequest)
		return
	}

	tokenHash := hashToken(req.Code)
	ut, err := h.Store.GetUserToken(tokenHash, "password_reset_otp")
	if err != nil || ut == nil || ut.UserID != u.ID {
		http.Error(w, "Invalid verification code or email", http.StatusBadRequest)
		return
	}

	if time.Now().After(ut.ExpiresAt) {
		_ = h.Store.DeleteUserToken(tokenHash)
		http.Error(w, "Verification code has expired", http.StatusBadRequest)
		return
	}

	// OTP is valid! Delete it so it cannot be used again
	_ = h.Store.DeleteUserToken(tokenHash)

	// Generate a secure reset token for ResetPassword step
	resetToken, err := auth.GenerateRandomToken()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_ = h.Store.DeleteUserTokens(u.ID, "password_reset")
	err = h.Store.CreateUserToken(&storage.UserToken{
		UserID:    u.ID,
		TokenType: "password_reset",
		TokenHash: hashToken(resetToken),
		ExpiresAt: time.Now().Add(10 * time.Minute), // Valid for 10 minutes
	})
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"reset_token": resetToken,
	})
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
		http.Error(w, "Reset token has expired", http.StatusBadRequest)
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

	// Immediately invalidate the reset token and all active sessions
	_ = h.Store.DeleteUserToken(tokenHash)
	_ = h.Store.DeleteAllSessionsForUser(ut.UserID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Password reset successfully"})
}

