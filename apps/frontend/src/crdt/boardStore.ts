import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { CollabProvider } from '../network/collabProvider';
import type { UserPresence } from '../network/collabProvider';
import { api } from '../services/api';

export interface BoardElement {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'freehand';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  points?: number[];
  pressure?: number[];
  zIndex: number;
  groupId?: string;
  isLocked?: boolean;
}

export type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'freehand' | 'eraser';

export class BoardStore {
  public doc: Y.Doc;
  public elementsMap: Y.Map<BoardElement>;
  public undoManager: Y.UndoManager;
  public provider: CollabProvider | null = null;
  public localPersistence: IndexeddbPersistence | null = null;
  private autoSaveInterval: any = null;

  // UI state
  private selectedIds: Set<string> = new Set();
  private clipboard: BoardElement[] = [];
  private tool: ToolType = 'select';
  private pan = { x: 0, y: 0 };
  private zoom = 1;
  private strokeColor = '#3b82f6'; // Indigo/blue default
  private fillColor = 'rgba(59, 130, 246, 0.1)';
  private activeRoom = 'default-room';
  private darkMode = false;
  private users: Map<string, UserPresence> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  // Listeners
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.doc = new Y.Doc();
    this.elementsMap = this.doc.getMap('elements');
    this.undoManager = new Y.UndoManager(this.elementsMap, {
      captureTimeout: 500,
    });

    // Listen to Yjs changes to trigger re-renders
    this.elementsMap.observe(() => {
      this.notify();
    });

    // Check system preference for dark mode
    if (typeof window !== 'undefined') {
      this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  public initRoom(roomName: string, username: string) {
    this.activeRoom = roomName;

    // Clean up existing providers and timers
    if (this.provider) this.provider.destroy();
    if (this.localPersistence) this.localPersistence.destroy();
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // 1. Setup local IndexedDB persistence
    this.localPersistence = new IndexeddbPersistence(roomName, this.doc);
    this.localPersistence.on('synced', () => {
      console.log('[BoardStore] Local IndexedDB fully loaded and synced');
      this.notify();
    });

    // Generate random avatar & color for the user
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const localUser: UserPresence = {
      id: this.doc.clientID.toString(),
      name: username,
      color: randomColor,
      avatar: randomAvatar,
      lastActive: Date.now(),
    };

    // 2. Setup custom WebSockets CollabProvider
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${wsProto}//${host}/ws/${roomName}`;

    this.provider = new CollabProvider(wsUrl, this.doc, localUser);
    
    this.provider.onStateChange((state) => {
      this.connectionState = state;
      this.notify();
    });

    this.provider.onAwarenessChange((presences) => {
      this.users = presences;
      this.notify();
    });

    // Start 5 minute auto-save interval
    this.autoSaveInterval = setInterval(() => {
      if (this.elementsMap.size > 0) {
        const now = new Date().toLocaleTimeString();
        this.saveSnapshot(`Auto-save ${now}`, 'Automated backup snapshot').catch((err) => {
          console.error('[BoardStore] Auto-save snapshot failed:', err);
        });
      }
    }, 5 * 60 * 1000);
  }

  // State subscriptions
  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // Getters
  public getElements(): BoardElement[] {
    return Array.from(this.elementsMap.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  public getSelectedIds(): Set<string> {
    return this.selectedIds;
  }

  public getTool(): ToolType {
    return this.tool;
  }

  public getPan() {
    return this.pan;
  }

  public getZoom(): number {
    return this.zoom;
  }

  public getStrokeColor(): string {
    return this.strokeColor;
  }

  public getFillColor(): string {
    return this.fillColor;
  }

  public getActiveRoom(): string {
    return this.activeRoom;
  }

  public getConnectionState() {
    return this.connectionState;
  }

  public getActiveUsers(): UserPresence[] {
    return Array.from(this.users.values());
  }

  public isDarkMode(): boolean {
    return this.darkMode;
  }

  // Setters & Actions
  public setTool(tool: ToolType) {
    this.tool = tool;
    if (tool !== 'select') {
      this.selectedIds.clear();
    }
    this.notify();
  }

  public setPan(x: number, y: number) {
    this.pan = { x, y };
    this.notify();
  }

  public setZoom(zoom: number) {
    this.zoom = Math.max(0.1, Math.min(zoom, 10)); // Restrict zoom scale between 10% and 1000%
    this.notify();
  }

  public setStrokeColor(color: string) {
    this.strokeColor = color;
    // Update colors of selected elements
    this.doc.transact(() => {
      this.selectedIds.forEach((id) => {
        const el = this.elementsMap.get(id);
        if (el) {
          this.elementsMap.set(id, { ...el, stroke: color });
        }
      });
    });
    this.notify();
  }

  public setFillColor(color: string) {
    this.fillColor = color;
    this.doc.transact(() => {
      this.selectedIds.forEach((id) => {
        const el = this.elementsMap.get(id);
        if (el) {
          this.elementsMap.set(id, { ...el, fill: color });
        }
      });
    });
    this.notify();
  }

  public setDarkMode(dark: boolean) {
    this.darkMode = dark;
    if (typeof document !== 'undefined') {
      if (dark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
    this.notify();
  }

  public selectElement(id: string, additive = false) {
    if (!additive) {
      this.selectedIds.clear();
    }
    this.selectedIds.add(id);
    this.notify();
  }

  public clearSelection() {
    if (this.selectedIds.size > 0) {
      this.selectedIds.clear();
      this.notify();
    }
  }

  public addElement(element: Omit<BoardElement, 'zIndex'>) {
    // Generate next zIndex
    const elements = this.getElements();
    const nextZIndex = elements.length > 0 ? elements[elements.length - 1].zIndex + 1 : 0;

    const fullElement: BoardElement = {
      ...element,
      zIndex: nextZIndex,
    };

    this.doc.transact(() => {
      this.elementsMap.set(fullElement.id, fullElement);
    });
  }

  public updateElement(id: string, updates: Partial<BoardElement>) {
    const existing = this.elementsMap.get(id);
    if (!existing) return;

    this.doc.transact(() => {
      this.elementsMap.set(id, {
        ...existing,
        ...updates,
      } as BoardElement);
    });
  }

  public deleteSelected() {
    if (this.selectedIds.size === 0) return;
    this.doc.transact(() => {
      this.selectedIds.forEach((id) => {
        this.elementsMap.delete(id);
      });
      this.selectedIds.clear();
    });
    this.notify();
  }

  // Alignment helpers
  public alignSelected(direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    if (this.selectedIds.size < 2) return;
    const selected = Array.from(this.selectedIds)
      .map(id => this.elementsMap.get(id))
      .filter((el): el is BoardElement => !!el);

    if (selected.length < 2) return;

    this.doc.transact(() => {
      let targetVal = 0;

      if (direction === 'left') {
        targetVal = Math.min(...selected.map(el => el.x));
        selected.forEach(el => this.updateElement(el.id, { x: targetVal }));
      } else if (direction === 'top') {
        targetVal = Math.min(...selected.map(el => el.y));
        selected.forEach(el => this.updateElement(el.id, { y: targetVal }));
      } else if (direction === 'right') {
        targetVal = Math.max(...selected.map(el => el.x + el.width));
        selected.forEach(el => this.updateElement(el.id, { x: targetVal - el.width }));
      } else if (direction === 'bottom') {
        targetVal = Math.max(...selected.map(el => el.y + el.height));
        selected.forEach(el => this.updateElement(el.id, { y: targetVal - el.height }));
      } else if (direction === 'center') {
        const centers = selected.map(el => el.x + el.width / 2);
        targetVal = centers.reduce((a, b) => a + b, 0) / centers.length;
        selected.forEach(el => this.updateElement(el.id, { x: targetVal - el.width / 2 }));
      } else if (direction === 'middle') {
        const middles = selected.map(el => el.y + el.height / 2);
        targetVal = middles.reduce((a, b) => a + b, 0) / middles.length;
        selected.forEach(el => this.updateElement(el.id, { y: targetVal - el.height / 2 }));
      }
    });
    this.notify();
  }

  // Undo / Redo interface
  public undo() {
    if (this.undoManager.canUndo()) {
      this.undoManager.undo();
      this.notify();
    }
  }

  public redo() {
    if (this.undoManager.canRedo()) {
      this.undoManager.redo();
      this.notify();
    }
  }

  public destroy() {
    this.listeners.clear();
    if (this.provider) this.provider.destroy();
    if (this.localPersistence) this.localPersistence.destroy();
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Version History Snapshots
  public async saveSnapshot(name: string, description = ''): Promise<void> {
    // 1. Encode Yjs doc state as standard update
    const stateUpdate = Y.encodeStateAsUpdate(this.doc);

    // 2. Convert to binary base64
    let binary = '';
    const len = stateUpdate.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(stateUpdate[i]);
    }
    const base64Update = btoa(binary);

    // 3. Persist to backend database
    await api.createBoardVersion(this.activeRoom, name, description, base64Update);
  }

  public restoreSnapshot(crdtUpdateBase64: string): void {
    // 1. Decode base64 to Uint8Array bytes
    const binaryString = atob(crdtUpdateBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Load into temporary Y.Doc
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, bytes);
    const tempMap = tempDoc.getMap<BoardElement>('elements');

    // 3. Clear and set current elementsMap in transaction to sync peers
    this.doc.transact(() => {
      this.elementsMap.clear();
      for (const [key, value] of tempMap.entries()) {
        this.elementsMap.set(key, value);
      }
    });

    this.notify();
  }

  // Keyboard Edit Operations
  public selectAll() {
    this.selectedIds.clear();
    this.getElements().forEach(el => {
      this.selectedIds.add(el.id);
    });
    this.notify();
  }

  public copySelected() {
    if (this.selectedIds.size === 0) return;
    this.clipboard = this.getElements()
      .filter(el => this.selectedIds.has(el.id))
      .map(el => ({ ...el }));
  }

  public cutSelected() {
    if (this.selectedIds.size === 0) return;
    this.copySelected();
    this.deleteSelected();
  }

  public paste() {
    if (this.clipboard.length === 0) return;
    const uid = Date.now();
    this.doc.transact(() => {
      this.selectedIds.clear();
      this.clipboard.forEach((el, index) => {
        const nextZIndex = this.getElements().length;
        const pasted: BoardElement = {
          ...el,
          id: `${el.id}-pasted-${uid}-${index}`,
          x: el.x + 30,
          y: el.y + 30,
          zIndex: nextZIndex + index
        };
        this.elementsMap.set(pasted.id, pasted);
        this.selectedIds.add(pasted.id);
      });
    });
    this.notify();
  }

  public duplicateSelected() {
    if (this.selectedIds.size === 0) return;
    this.copySelected();
    this.paste();
  }

  public lockSelected() {
    if (this.selectedIds.size === 0) return;
    this.doc.transact(() => {
      this.selectedIds.forEach((id) => {
        this.updateElement(id, { isLocked: true });
      });
    });
    this.notify();
  }

  public unlockSelected() {
    if (this.selectedIds.size === 0) return;
    this.doc.transact(() => {
      this.selectedIds.forEach((id) => {
        this.updateElement(id, { isLocked: false });
      });
    });
    this.notify();
  }
}

// Singleton global instance for ease of React hook consumption
export const globalBoardStore = new BoardStore();
