package api

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
)

// SendOTP sends a 6-digit OTP code to the recipient email.
// It uses SMTP if configured, or prints to the console log as a fallback.
func SendOTP(to string, code string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")

	subject := "Subject: CollabBoard X - Password Reset Verification Code\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 20px;">
			<div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
				<h2 style="color: #6366f1; margin-bottom: 20px;">CollabBoard X</h2>
				<p>You requested a password reset. Use the verification code below to proceed with setting a new password:</p>
				<div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #ffffff; text-align: center; margin: 30px 0; padding: 15px; background-color: #0f172a; border-radius: 8px;">
					%s
				</div>
				<p style="font-size: 14px; color: #94a3b8;">This code is valid for 10 minutes. If you did not make this request, please ignore this email.</p>
			</div>
		</body>
		</html>
	`, code)

	msg := []byte(subject + mime + body)

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" {
		// Fallback: Console Logging
		log.Printf("\n==================================================\n[MOCK EMAIL] OTP verification code for %s: %s\n==================================================\n", to, code)
		return nil
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)

	if smtpFrom == "" {
		smtpFrom = smtpUser
	}

	err := smtp.SendMail(addr, auth, smtpFrom, []string{to}, msg)
	if err != nil {
		log.Printf("Failed to send SMTP email to %s: %v", to, err)
		return fmt.Errorf("failed to send SMTP email: %w", err)
	}

	return nil
}
