package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"collabboard-backend/internal/storage"
)

type UserHandler struct {
	Store *storage.Store
}

type UpdateProfileRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Bio      string `json:"bio"`
	Theme    string `json:"theme"`
	Language string `json:"language"`
	Timezone string `json:"timezone"`
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	u, err := h.Store.GetUserByID(userID)
	if err != nil || u == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	u, err := h.Store.GetUserByID(userID)
	if err != nil || u == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Update only if values are provided or we can update all
	if req.Name != "" {
		u.Name = req.Name
	}
	if req.Username != "" {
		u.Username = req.Username
	}
	u.Bio = req.Bio
	if req.Theme != "" {
		u.Theme = req.Theme
	}
	if req.Language != "" {
		u.Language = req.Language
	}
	if req.Timezone != "" {
		u.Timezone = req.Timezone
	}

	if err := h.Store.UpdateUser(u); err != nil {
		http.Error(w, "Failed to update profile: username might already be in use", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := GetUserIDFromContext(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Limit upload size to 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "File exceeds 5MB limit", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "Failed to parse file upload", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(handler.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		http.Error(w, "Unsupported file format. Use JPG, PNG, GIF or WEBP", http.StatusBadRequest)
		return
	}

	// Ensure upload directory exists
	uploadDir := "./uploads/avatars"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		http.Error(w, "Failed to write file to disk", http.StatusInternalServerError)
		return
	}

	// Update user in DB
	u, err := h.Store.GetUserByID(userID)
	if err != nil || u == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Store URL relative path
	u.Avatar = fmt.Sprintf("http://localhost:8080/uploads/avatars/%s", filename)
	if err := h.Store.UpdateUser(u); err != nil {
		http.Error(w, "Failed to update avatar path", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"avatar_url": u.Avatar})
}
