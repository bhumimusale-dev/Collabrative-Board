package api

import (
	"context"
	"net/http"
	"strings"

	"collabboard-backend/internal/auth"
)

type contextKey string

const UserIDContextKey contextKey = "userID"

// AuthMiddleware intercepts HTTP requests to validate JWT access tokens.
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Unauthorized: invalid header format", http.StatusUnauthorized)
			return
		}

		accessToken := parts[1]
		userID, err := auth.ValidateAccessToken(accessToken)
		if err != nil {
			http.Error(w, "Unauthorized: invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Inject UserID into request context
		ctx := context.WithValue(r.Context(), UserIDContextKey, userID)
		next(w, r.WithContext(ctx))
	}
}

// GetUserIDFromContext retrieves the authenticated user ID from context.
func GetUserIDFromContext(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(UserIDContextKey).(string)
	return userID, ok
}
