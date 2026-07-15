package websocket

import (
	"log"
	"sync"
	"collabboard-backend/internal/storage"
)

type Room struct {
	Name       string
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	Store      *storage.Store
	Mutex      sync.RWMutex
}

func NewRoom(name string, store *storage.Store) *Room {
	return &Room{
		Name:       name,
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
		Store:      store,
	}
}

func (r *Room) Run() {
	for {
		select {
		case client := <-r.Register:
			r.Mutex.Lock()
			r.Clients[client] = true
			r.Mutex.Unlock()
			log.Printf("Client registered in room: %s", r.Name)

			// 1. Send all stored updates to the newly joined client so they reconstruct the document state
			updates, err := r.Store.GetUpdates(r.Name)
			if err != nil {
				log.Printf("Error getting updates from store: %v", err)
			} else {
				log.Printf("Sending %d stored updates to new client", len(updates))
				for _, update := range updates {
					// Format as: [messageSync = 0, messageSyncStep2 = 1, ...update]
					msg := make([]byte, 2+len(update))
					msg[0] = 0 // Sync message
					msg[1] = 1 // Sync Step 2
					copy(msg[2:], update)
					client.Send <- msg
				}
			}

			// 2. Initiate Yjs Sync Step 1 (Request client state vector)
			// Format as: [messageSync = 0, messageSyncStep1 = 0, sv_length = 0]
			syncStep1 := []byte{0, 0, 0}
			client.Send <- syncStep1

		case client := <-r.Unregister:
			r.Mutex.Lock()
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)
				log.Printf("Client unregistered from room: %s", r.Name)
			}
			r.Mutex.Unlock()

		case message := <-r.Broadcast:
			r.Mutex.RLock()
			for client := range r.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					r.Mutex.RUnlock()
					r.Mutex.Lock()
					delete(r.Clients, client)
					r.Mutex.Unlock()
					r.Mutex.RLock()
				}
			}
			r.Mutex.RUnlock()
		}
	}
}

func (r *Room) HandleMessage(sender *Client, msg []byte) {
	if len(msg) < 2 {
		return
	}

	messageType := msg[0]
	syncType := msg[1]

	if messageType == 0 { // Sync Message
		if syncType == 1 || syncType == 2 {
			// Extract Yjs update (bytes after the first 2 protocol prefix bytes)
			updateData := msg[2:]
			if len(updateData) > 0 {
				// Persist update to SQLite database
				if err := r.Store.SaveUpdate(r.Name, updateData); err != nil {
					log.Printf("Error saving update to store: %v", err)
				}
			}
		}
		// Broadcast sync message to all other clients in the room
		r.broadcastToOthers(sender, msg)

	} else if messageType == 1 { // Awareness Message
		// Broadcast ephemeral awareness (cursors, presence) to all other clients
		r.broadcastToOthers(sender, msg)
	}
}

func (r *Room) broadcastToOthers(sender *Client, message []byte) {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()
	for client := range r.Clients {
		if client != sender {
			select {
			case client.Send <- message:
			default:
				// If send buffer is full, connection will be cleaned up
			}
		}
	}
}
