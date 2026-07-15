package storage

import (
	"bytes"
	"os"
	"testing"
)

func TestSQLiteStore(t *testing.T) {
	dbPath := "./test_whiteboard.db"
	defer os.Remove(dbPath)

	store, err := NewStore(dbPath)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()

	room := "test-room"
	update1 := []byte{1, 2, 3, 4}
	update2 := []byte{5, 6, 7, 8}

	// Save updates
	if err := store.SaveUpdate(room, update1); err != nil {
		t.Fatalf("Failed to save update 1: %v", err)
	}
	if err := store.SaveUpdate(room, update2); err != nil {
		t.Fatalf("Failed to save update 2: %v", err)
	}

	// Retrieve updates
	updates, err := store.GetUpdates(room)
	if err != nil {
		t.Fatalf("Failed to get updates: %v", err)
	}

	if len(updates) != 2 {
		t.Errorf("Expected 2 updates, got %d", len(updates))
	}

	if !bytes.Equal(updates[0], update1) {
		t.Errorf("Expected first update to be %v, got %v", update1, updates[0])
	}

	if !bytes.Equal(updates[1], update2) {
		t.Errorf("Expected second update to be %v, got %v", update2, updates[1])
	}

	// Clear room
	if err := store.ClearRoom(room); err != nil {
		t.Fatalf("Failed to clear room: %v", err)
	}

	updates, err = store.GetUpdates(room)
	if err != nil {
		t.Fatalf("Failed to query empty room: %v", err)
	}
	if len(updates) != 0 {
		t.Errorf("Expected 0 updates after clear, got %d", len(updates))
	}
}
