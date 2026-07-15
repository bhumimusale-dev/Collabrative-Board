package auth

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword generates a bcrypt hash of the password with a default cost of 12.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(bytes), nil
}

// CheckPasswordHash compares a password with its hashed representation.
// Returns true if the password matches.
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
