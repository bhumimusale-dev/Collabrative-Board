import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Folder, 
  Star, 
  Archive, 
  Trash2, 
  Plus, 
  LayoutDashboard, 
  ChevronDown, 
  LogOut,
  RefreshCw,
  Menu,
  X,
  Users,
  UserPlus,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';
import type { Workspace, Board, TeamInvitation, TeamMember } from '../services/api';
import { useAuth } from './AuthContext';
import { BillingPortal } from './BillingPortal';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [view, setView] = useState<'all' | 'starred' | 'archive' | 'trash'>('all');
  
  // SaaS States
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string>('owner'); // owner, admin, editor, viewer

  // UI toggles
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();

  // SaaS Modals / Forms
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState('team');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    // Check URL for direct invitation tokens
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite_token');
    if (inviteToken) {
      handleDirectInvite(inviteToken);
    } else {
      loadInitialData();
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      loadBoards(activeWorkspace.id);
      if (activeWorkspace.team_id) {
        loadTeamDetails(activeWorkspace.team_id);
      } else {
        setUserRole('owner'); // Personal workspaces give owner permission
      }
    }
  }, [activeWorkspace]);

  const handleDirectInvite = async (token: string) => {
    const accept = window.confirm("You have a pending team invitation! Would you like to accept and join?");
    try {
      if (accept) {
        await api.respondToInvitation(token, 'accept');
        alert("Joined the team successfully!");
      } else {
        await api.respondToInvitation(token, 'decline');
        alert("Invitation declined.");
      }
    } catch (e: any) {
      alert(e.message || "Failed to respond to invitation.");
    } finally {
      window.location.href = '/dashboard';
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0) {
        setActiveWorkspace(wsList[0]);
      }
      
      // Load pending invitations
      const inviteList = await api.listInvitations();
      setInvitations(inviteList);
    } catch (e) {
      console.error('Failed to load initial workspace data', e);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    try {
      const members = await api.getTeamMembers(teamId);
      setTeamMembers(members);
      
      const currentMember = members.find(m => m.user_id === user?.id);
      if (currentMember) {
        setUserRole(currentMember.role);
      }
    } catch (e) {
      console.error('Failed to load team details', e);
    }
  };

  const loadBoards = async (workspaceId: string) => {
    setLoading(true);
    try {
      const list = await api.getBoards(workspaceId);
      setBoards(list);
    } catch (e) {
      console.error('Failed to load boards', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim() || !activeWorkspace) return;
    if (userRole === 'viewer') {
      alert("Permission Denied: Viewers cannot create boards.");
      return;
    }

    try {
      const b = await api.createBoard(activeWorkspace.id, newBoardName.trim());
      setNewBoardName('');
      navigate(`/board/${b.id}`);
    } catch (e) {
      alert('Failed to create board');
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const newWs = await api.createWorkspace(
        newWorkspaceName.trim(), 
        newWorkspaceType,
        activeWorkspace?.team_id || undefined
      );
      setWorkspaces([...workspaces, newWs]);
      setActiveWorkspace(newWs);
      setNewWorkspaceName('');
      setShowWorkspaceModal(false);
    } catch (e) {
      alert('Failed to create workspace');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace?.team_id) return;
    setIsInviting(true);
    setInviteSuccess(false);

    try {
      await api.sendInvitation(activeWorkspace.team_id, inviteEmail.trim(), inviteRole);
      setInviteSuccess(true);
      setInviteEmail('');
    } catch (e: any) {
      alert(e.message || "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRespondInvitation = async (token: string, action: 'accept' | 'decline') => {
    try {
      await api.respondToInvitation(token, action);
      alert(`Invitation ${action}ed successfully!`);
      // Reload initial data to fetch updated workspaces/invitations
      loadInitialData();
    } catch (e: any) {
      alert(e.message || "Action failed.");
    }
  };

  const toggleStar = async (b: Board) => {
    try {
      await api.updateBoardStatus(b.id, {
        is_starred: !b.is_starred,
        is_archived: b.is_archived,
        is_deleted: b.is_deleted,
      });
      if (activeWorkspace) loadBoards(activeWorkspace.id);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleArchive = async (b: Board) => {
    try {
      await api.updateBoardStatus(b.id, {
        is_starred: b.is_starred,
        is_archived: !b.is_archived,
        is_deleted: b.is_deleted,
      });
      if (activeWorkspace) loadBoards(activeWorkspace.id);
    } catch (e) {
      console.error(e);
    }
  };

  const moveBoardToTrash = async (b: Board, toTrash: boolean) => {
    try {
      await api.updateBoardStatus(b.id, {
        is_starred: b.is_starred,
        is_archived: b.is_archived,
        is_deleted: toTrash,
      });
      if (activeWorkspace) loadBoards(activeWorkspace.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  // Filter boards based on view type
  const getFilteredBoards = () => {
    if (!Array.isArray(boards)) return [];
    return boards.filter((b) => {
      if (view === 'trash') return b.is_deleted;
      if (b.is_deleted) return false;

      if (view === 'starred') return b.is_starred;
      if (view === 'archive') return b.is_archived;
      
      return !b.is_archived;
    });
  };

  // Check permissions based on user role
  const canCreateBoard = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans relative overflow-hidden">
      
      {/* Ambient Radial Lights */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/5 rounded-full blur-[10rem] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-[8rem] pointer-events-none" />

      {/* Mobile Top Navbar */}
      <header className="w-full bg-slate-950 border-b border-slate-800 p-4 flex md:hidden items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            {activeWorkspace?.name?.charAt(0) || 'W'}
          </div>
          <span className="text-sm font-semibold truncate max-w-[150px]">
            {activeWorkspace?.name || 'Workspace'}
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-all"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between z-30 transition-transform duration-300 md:static md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          
          {/* Workspace Switcher */}
          <div className="relative">
            <button 
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                  {activeWorkspace?.name?.charAt(0) || 'W'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold truncate max-w-[120px]">
                    {activeWorkspace?.name || 'Workspace'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Role: {userRole}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showWorkspaceMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 z-40 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setActiveWorkspace(w);
                      setShowWorkspaceMenu(false);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-sm bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                      {w.name.charAt(0)}
                    </div>
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
                
                <div className="border-t border-slate-800 p-2">
                  <button
                    onClick={() => {
                      setShowWorkspaceModal(true);
                      setShowWorkspaceMenu(false);
                    }}
                    className="w-full py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-lg text-xs font-semibold text-indigo-400 text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setView('all');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                view === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>All Boards</span>
            </button>
            <button
              onClick={() => {
                setView('starred');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                view === 'starred' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Starred</span>
            </button>
            <button
              onClick={() => {
                setView('archive');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                view === 'archive' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Archive</span>
            </button>
            <button
              onClick={() => {
                setView('trash');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                view === 'trash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash Bin</span>
            </button>
          </nav>

          {/* SaaS: Team Section in Sidebar */}
          {activeWorkspace?.team_id && (
            <div className="pt-4 border-t border-slate-800/60 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3">Team & SaaS Panel</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowInviteModal(true)}
                  disabled={!canManageMembers}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Invite Collaborator</span>
                </button>
                <button
                  onClick={() => {
                    alert(`Team ID: ${activeWorkspace.team_id}\nMembers:\n${teamMembers.map(m => `- ${m.name} (${m.role})`).join('\n')}`);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
                >
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>View Team Members ({teamMembers.length})</span>
                </button>
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Billing & Plans</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile bottom settings item */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Link 
            to="/profile" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 min-w-0 mr-2"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full object-cover bg-slate-800" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-xs font-semibold uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="text-xs font-semibold truncate text-slate-200">
                {user?.name || 'My Profile'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Settings</span>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto relative bg-slate-900">
        
        {/* Invitations Notification Banner */}
        {invitations.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md relative z-10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center text-sm font-bold">
                ✉
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Pending Team Invitation</span>
                <span className="text-[10px] text-slate-400">You have been invited to join a collaborative team.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRespondInvitation(invitations[0].token, 'accept')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-md shadow-indigo-600/10"
              >
                Accept
              </button>
              <button 
                onClick={() => handleRespondInvitation(invitations[0].token, 'decline')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[10px] font-bold transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white capitalize bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-100 bg-clip-text text-transparent">
              {view} Boards
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage and coordinate your spatial canvas files</p>
          </div>
          
          {/* Create Board Quick Form */}
          {view === 'all' && (
            <form onSubmit={handleCreateBoard} className="flex items-center gap-2.5 w-full sm:w-auto">
              <input
                type="text"
                required
                placeholder={canCreateBoard ? "New Board Name..." : "Creation disabled for Viewers"}
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                disabled={!canCreateBoard}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all backdrop-blur-md disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!canCreateBoard}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Board</span>
              </button>
            </form>
          )}
        </header>

        {/* Statistics Banner */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-10">
            <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">All Boards</span>
              <span className="text-2xl font-black text-slate-100">{boards.filter(b => !b.is_deleted && !b.is_archived).length}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/80">Starred</span>
              <span className="text-2xl font-black text-amber-400">{boards.filter(b => b.is_starred && !b.is_deleted).length}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500/80">Archived</span>
              <span className="text-2xl font-black text-indigo-400">{boards.filter(b => b.is_archived && !b.is_deleted).length}</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-4 flex flex-col gap-1 backdrop-blur-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500/80">Trash Bin</span>
              <span className="text-2xl font-black text-rose-400">{boards.filter(b => b.is_deleted).length}</span>
            </div>
          </div>
        )}

        {/* Loading / Content Container */}
        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 justify-center py-20 relative z-10">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-xs font-semibold">Retrieving workspace...</span>
          </div>
        ) : getFilteredBoards().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-950/10 backdrop-blur-md relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-center mb-4">
              <Folder className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">No boards found in this view.</p>
            <p className="text-[10px] text-slate-600 mt-1">Get started by creating a new collaborative board above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {getFilteredBoards().map((b) => (
              <div 
                key={b.id}
                className="p-6 rounded-3xl bg-slate-950/35 border border-slate-850/80 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-44 shadow-lg backdrop-blur-md cursor-pointer group"
                onClick={() => !b.is_deleted && navigate(`/board/${b.id}`)}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-slate-200 group-hover:text-white truncate max-w-[180px] text-sm transition-colors">
                      {b.name}
                    </h3>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleStar(b)}
                        className={`p-1.5 rounded-lg hover:bg-slate-850 transition-colors ${
                          b.is_starred ? 'text-amber-400 bg-amber-500/5 border border-amber-500/10' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={b.is_starred ? 'Unstar Board' : 'Star Board'}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button 
                        onClick={() => toggleArchive(b)}
                        className={`p-1.5 rounded-lg hover:bg-slate-850 transition-colors ${
                          b.is_archived ? 'text-indigo-400 bg-indigo-500/5 border border-indigo-500/10' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={b.is_archived ? 'Unarchive Board' : 'Archive Board'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-normal">
                    {b.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-850" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800/60">
                    {b.visibility}
                  </span>
                  
                  {b.is_deleted ? (
                    <button 
                      onClick={() => moveBoardToTrash(b, false)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Restore
                    </button>
                  ) : (
                    <button 
                      onClick={() => moveBoardToTrash(b, true)}
                      className="p-1.5 hover:bg-red-500/5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && activeWorkspace?.team_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowInviteModal(false)} />
          <form onSubmit={handleSendInvite} className="relative bg-slate-900 border border-slate-850 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-slate-100">
            <div>
              <h3 className="text-base font-bold text-white">Invite to Team Workspace</h3>
              <p className="text-xs text-slate-400 mt-1">Send a direct token to invite editors or viewers.</p>
            </div>
            
            {inviteSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                Invitation sent successfully! The invite url has been logged to the server terminal.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Target Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="admin">Admin (Manage members & edit boards)</option>
                  <option value="editor">Editor (Create and edit boards)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteSuccess(false);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-xl font-semibold text-xs transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-indigo-600/10"
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowWorkspaceModal(false)} />
          <form onSubmit={handleCreateWorkspace} className="relative bg-slate-900 border border-slate-850 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-slate-100">
            <div>
              <h3 className="text-base font-bold text-white">Create New Workspace</h3>
              <p className="text-xs text-slate-400 mt-1">Set up a space to coordinate boards.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Team Workspace"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Workspace Type</label>
                <select
                  value={newWorkspaceType}
                  onChange={(e) => setNewWorkspaceType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="team">Team Workspace (Shared with team members)</option>
                  <option value="personal">Personal Workspace (Private to you)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWorkspaceModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-xl font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-indigo-600/10"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {activeWorkspace?.team_id && (
        <BillingPortal
          teamId={activeWorkspace.team_id!}
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          onPlanChanged={() => {
            if (activeWorkspace) {
              loadTeamDetails(activeWorkspace.team_id!);
              loadBoards(activeWorkspace.id);
            }
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;
