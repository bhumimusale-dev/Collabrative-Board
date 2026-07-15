import * as Y from 'yjs';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  avatar: string;
  cursor?: { x: number; y: number } | null;
  lastActive: number;
}

export class CollabProvider {
  private url: string;
  private doc: Y.Doc;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private offlineQueue: Uint8Array[] = [];
  private onStateChangeCallbacks: ((state: ConnectionState) => void)[] = [];
  private onAwarenessChangeCallbacks: ((users: Map<string, UserPresence>) => void)[] = [];
  
  // Local user presence
  private localUser: UserPresence;
  // Map of clientID string to user presence
  private presences: Map<string, UserPresence> = new Map();

  constructor(url: string, doc: Y.Doc, localUser: UserPresence) {
    this.url = url;
    this.doc = doc;
    this.localUser = localUser;

    // Listen to local document updates to broadcast to the network
    this.doc.on('update', (update, origin) => {
      // Avoid circular updates from the WebSocket connection itself
      if (origin !== this) {
        this.sendUpdate(update);
      }
    });

    this.connect();
    
    // Heartbeat check for stale users in awareness
    setInterval(() => this.cleanupStalePresences(), 5000);
  }

  public get ConnectionState(): ConnectionState {
    return this.state;
  }

  public onStateChange(cb: (state: ConnectionState) => void) {
    this.onStateChangeCallbacks.push(cb);
    cb(this.state);
  }

  public onAwarenessChange(cb: (users: Map<string, UserPresence>) => void) {
    this.onAwarenessChangeCallbacks.push(cb);
    cb(this.presences);
  }

  private updateState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChangeCallbacks.forEach((cb) => cb(newState));
    }
  }

  private connect() {
    if (this.ws) return;
    this.updateState('connecting');

    const ws = new WebSocket(this.url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.updateState('connected');
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      logMessage("Connected to Collab Server");

      // 1. Flush the offline queue of updates made while disconnected
      this.flushOfflineQueue();

      // 2. Send local presence to server immediately
      this.broadcastLocalPresence();
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      const data = new Uint8Array(event.data);
      this.handleIncomingMessage(data);
    };

    ws.onclose = () => {
      this.cleanupConnection();
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      this.cleanupConnection();
      this.scheduleReconnect();
    };
  }

  private cleanupConnection() {
    this.ws = null;
    this.updateState('disconnected');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleIncomingMessage(data: Uint8Array) {
    if (data.length < 2) return;
    const messageType = data[0];
    const syncType = data[1];

    if (messageType === 0) { // Sync Message
      if (syncType === 1 || syncType === 2) {
        // Extract update data (bytes after [messageType, syncType])
        const update = data.subarray(2);
        if (update.length > 0) {
          Y.applyUpdate(this.doc, update, this);
        }
      } else if (syncType === 0) {
        // Sync Step 1: Server wants our state vector.
        // In our passive architecture, we can reply by sending our local state vector if requested,
        // but simple update streaming works out of the box. We can send our local state vector back
        // as a confirmation, or a Sync Step 2 update of our doc. Let's send a full sync state:
        const localUpdate = Y.encodeStateAsUpdate(this.doc);
        const reply = new Uint8Array(2 + localUpdate.length);
        reply[0] = 0; // Sync
        reply[1] = 2; // Update
        reply.set(localUpdate, 2);
        this.sendRaw(reply);
      }
    } else if (messageType === 1) { // Awareness Message
      try {
        const payloadStr = new TextDecoder().decode(data.subarray(1));
        const payload = JSON.parse(payloadStr) as { clientID: string; presence: UserPresence | null };
        if (payload.presence === null) {
          this.presences.delete(payload.clientID);
        } else {
          payload.presence.lastActive = Date.now();
          this.presences.set(payload.clientID, payload.presence);
        }
        this.triggerAwarenessCallbacks();
      } catch (e) {
        console.error("Failed to parse awareness payload", e);
      }
    }
  }

  private sendUpdate(update: Uint8Array) {
    // Protocol prefix: [messageSync = 0, messageUpdate = 2]
    const packet = new Uint8Array(2 + update.length);
    packet[0] = 0;
    packet[1] = 2;
    packet.set(update, 2);

    if (this.state === 'connected' && this.ws) {
      this.sendRaw(packet);
    } else {
      // Buffer in offline queue for auto-sync on reconnect
      this.offlineQueue.push(packet);
      logMessage(`Buffered offline update. Queue size: ${this.offlineQueue.length}`);
    }
  }

  private flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    logMessage(`Flushing ${this.offlineQueue.length} offline updates to server`);
    for (const packet of this.offlineQueue) {
      this.sendRaw(packet);
    }
    this.offlineQueue = [];
  }

  private sendRaw(data: Uint8Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data.buffer as ArrayBuffer);
    }
  }

  // Awareness / Cursor Synchronization
  public updateLocalCursor(x: number | null, y: number | null) {
    this.localUser.cursor = x !== null && y !== null ? { x, y } : null;
    this.localUser.lastActive = Date.now();
    this.broadcastLocalPresence();
  }

  public updateLocalUser(fields: Partial<UserPresence>) {
    this.localUser = { ...this.localUser, ...fields, lastActive: Date.now() };
    this.broadcastLocalPresence();
  }

  private broadcastLocalPresence() {
    // Format as: [messageAwareness = 1, ...JSONString]
    const payload = JSON.stringify({
      clientID: this.doc.clientID.toString(),
      presence: this.localUser,
    });
    const bytes = new TextEncoder().encode(payload);
    const packet = new Uint8Array(1 + bytes.length);
    packet[0] = 1; // Awareness message
    packet.set(bytes, 1);

    this.sendRaw(packet);
  }

  private cleanupStalePresences() {
    const now = Date.now();
    let changed = false;
    for (const [clientId, presence] of this.presences.entries()) {
      // If inactive for more than 10 seconds, remove from active presence list
      if (now - presence.lastActive > 10000) {
        this.presences.delete(clientId);
        changed = true;
      }
    }
    if (changed) {
      this.triggerAwarenessCallbacks();
    }
  }

  private triggerAwarenessCallbacks() {
    this.onAwarenessChangeCallbacks.forEach((cb) => cb(new Map(this.presences)));
  }

  public destroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      // Tell others we are leaving
      const leavePayload = JSON.stringify({
        clientID: this.doc.clientID.toString(),
        presence: null,
      });
      const bytes = new TextEncoder().encode(leavePayload);
      const packet = new Uint8Array(1 + bytes.length);
      packet[0] = 1;
      packet.set(bytes, 1);
      this.sendRaw(packet);
      this.ws.close();
    }
  }
}

function logMessage(msg: string) {
  console.log(`[CollabProvider] ${msg}`);
}
