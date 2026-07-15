const API_BASE = 'http://localhost:8080/api';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  theme: string;
  language?: string;
  timezone?: string;
  email_verified?: boolean;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  type: string;
}

export interface Board {
  id: string;
  owner_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  visibility: string;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string;
  author_id: string;
  org_id?: string;
  thumbnail?: string;
  download_count: number;
  install_count: number;
  rating: number;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface BoardVersion {
  id: string;
  board_id: string;
  name: string;
  description: string;
  version_number: number;
  crdt_update: string; // Base64
  author_id: string;
  author_name: string;
  author_avatar: string;
  created_at: string;
}

class ApiService {
  private accessToken: string | null = null;

  public setToken(token: string | null) {
    this.accessToken = token;
  }

  public getToken() {
    return this.accessToken;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const headers = new Headers(options.headers || {});
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register' && path !== '/auth/refresh') {
      // Auto token refresh fallback
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(path, options);
      }
      throw new Error('Session expired');
    }

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'API request failed');
    }

    return response.json();
  }

  public async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        this.setToken(data.access_token);
        return true;
      }
    } catch (e) {
      console.error('Token refresh failed', e);
    }
    this.setToken(null);
    return false;
  }

  // Auth Operations
  public async login(req: any): Promise<{ access_token: string; user: User }> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    this.setToken(data.access_token);
    return data;
  }

  public async register(req: any): Promise<User> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  // Workspace Operations
  public async getWorkspaces(): Promise<Workspace[]> {
    return this.request('/workspaces');
  }

  public async createWorkspace(name: string, type = 'team'): Promise<Workspace> {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }

  // Board Operations
  public async getBoards(workspaceId: string): Promise<Board[]> {
    return this.request(`/boards?workspace_id=${workspaceId}`);
  }

  public async createBoard(workspaceId: string, name: string, description = ''): Promise<Board> {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        name,
        description,
        visibility: 'private',
      }),
    });
  }

  public async updateBoardStatus(boardId: string, payload: { is_starred: boolean; is_archived: boolean; is_deleted: boolean }): Promise<void> {
    return this.request('/boards/status', {
      method: 'PATCH',
      body: JSON.stringify({
        board_id: boardId,
        ...payload,
      }),
    });
  }

  // Profile and Password Reset Operations
  public async verifyEmail(token: string): Promise<any> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public async forgotPassword(email: string): Promise<any> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(token: string, password: string): Promise<any> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  public async getProfile(): Promise<User> {
    return this.request('/users/profile');
  }

  public async updateProfile(payload: { name?: string; username?: string; bio?: string; theme?: string; language?: string; timezone?: string }): Promise<User> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async uploadAvatar(formData: FormData): Promise<{ avatar_url: string }> {
    return this.request('/users/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  public async createBoardVersion(boardId: string, name: string, description: string, crdtUpdate: string): Promise<BoardVersion> {
    return this.request('/boards/versions', {
      method: 'POST',
      body: JSON.stringify({
        board_id: boardId,
        name,
        description,
        crdt_update: crdtUpdate,
      }),
    });
  }

  public async getBoardVersions(boardId: string): Promise<BoardVersion[]> {
    return this.request(`/boards/versions?board_id=${boardId}`);
  }
}

export const api = new ApiService();
