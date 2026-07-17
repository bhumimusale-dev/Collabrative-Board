import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  UserPlus,
  Sparkles,
  Settings,
  Bell,
  Search,
  Activity,
  Layers,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { Workspace, Board, Organization, Team } from '../services/api';
import { useAuth } from './AuthContext';
import { BillingPortal } from './BillingPortal';
import { TemplatesModal } from './TemplatesModal';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core organization, teams and workspace data structures
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);

  // Navigation and UI view tabs
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'boards' | 'members' | 'settings' | 'activities'>('dashboard');
  const [boardSubView, setBoardSubView] = useState<'all' | 'starred' | 'personal' | 'team' | 'shared' | 'archive' | 'trash'>('all');
  
  // Lists for management panels
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [billingDetails, setBillingDetails] = useState<any>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Permissions and roles
  const [userOrgRole, setUserOrgRole] = useState<string>('viewer'); // owner, admin, editor, viewer

  // Dropdown states
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [isSidebarOpen] = useState(true);

  // New Creation Modals / Forms States
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');



  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Editor forms for Settings Tab
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDomain, setEditOrgDomain] = useState('');
  const [editOrgDesc, setEditOrgDesc] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');

  // Quick inputs
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Check URL parameters for direct invitation links
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite_token');
    if (inviteToken) {
      handleDirectInvite(inviteToken);
    } else {
      loadInitialOrgs();
    }
  }, []);

  // Whenever Organization changes, load corresponding Teams, Members and Activity Logs
  useEffect(() => {
    if (activeOrg) {
      loadTeams(activeOrg.id);
      loadOrgMembers(activeOrg.id);
      loadActivityLogs(activeOrg.id);
      loadNotifications();
      // Prep settings editor values
      setEditOrgName(activeOrg.name || '');
      setEditOrgDomain(activeOrg.domain || '');
      setEditOrgDesc(activeOrg.description || '');

      // Load user org role
      const loadUserRole = async () => {
        try {
          const members = await api.getOrgMembers(activeOrg.id);
          const current = members.find(m => m.user_id === user?.id);
          if (current) {
            setUserOrgRole(current.role);
          } else {
            setUserOrgRole(activeOrg.owner_id === user?.id ? 'owner' : 'viewer');
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadUserRole();
    }
  }, [activeOrg]);

  // Whenever Team changes, load Workspaces and Billing info
  useEffect(() => {
    if (activeTeam) {
      loadTeamWorkspaces(activeTeam.id);
      loadBillingDetails(activeTeam.id);
      setEditTeamName(activeTeam.name || '');
      setEditTeamDesc(activeTeam.description || '');
    } else {
      setWorkspaces([]);
      setActiveWorkspace(null);
    }
  }, [activeTeam]);

  // Load boards when workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      loadBoards(activeWorkspace.id);
    } else {
      setBoards([]);
    }
  }, [activeWorkspace]);

  const handleDirectInvite = async (token: string) => {
    const accept = window.confirm("You have a pending team invitation! Would you like to accept and join?");
    try {
      if (accept) {
        await api.respondToInvitation(token, 'accept');
        showToast("Joined the team successfully!");
      } else {
        await api.respondToInvitation(token, 'decline');
        showToast("Invitation declined.", "info");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to respond to invitation.", "error");
    } finally {
      window.history.replaceState({}, document.title, "/dashboard");
      loadInitialOrgs();
    }
  };

  const loadInitialOrgs = async () => {
    try {
      const orgList = await api.getOrganizations();
      setOrganizations(orgList || []);
      if (orgList && orgList.length > 0) {
        setActiveOrg(orgList[0]);
      } else {
        // Automatically create a default organization for a new user if none exists
        const defaultOrg = await api.createOrganization(`${user?.name || 'My'}'s Space`, '', 'Default organization workspace');
        setOrganizations([defaultOrg]);
        setActiveOrg(defaultOrg);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Failed to load organizations.");
    }
  };

  const loadTeams = async (orgId: string) => {
    try {
      const teamList = await api.getTeams(orgId);
      setTeams(teamList || []);
      if (teamList && teamList.length > 0) {
        setActiveTeam(teamList[0]);
      } else {
        // Create default general team
        const defaultTeam = await api.createTeam(orgId, 'General Team', 'Collaborative general workspace team');
        setTeams([defaultTeam]);
        setActiveTeam(defaultTeam);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrgMembers = async (orgId: string) => {
    try {
      const members = await api.getOrgMembers(orgId);
      setOrgMembers(members || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTeamWorkspaces = async (teamId: string) => {
    try {
      const wsList = await api.getTeamWorkspaces(teamId);
      setWorkspaces(wsList || []);
      if (wsList && wsList.length > 0) {
        setActiveWorkspace(wsList[0]);
      } else {
        // Create general workspace
        const generalWs = await api.createWorkspace('General Workspace', 'team', teamId);
        setWorkspaces([generalWs]);
        setActiveWorkspace(generalWs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBillingDetails = async (teamId: string) => {
    try {
      const details = await api.getBillingDetails(teamId);
      setBillingDetails(details);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBoards = async (workspaceId: string) => {
    try {
      const list = await api.getBoards(workspaceId);
      setBoards(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadActivityLogs = async (orgId: string) => {
    try {
      const logs = await api.getActivityLogs(orgId);
      setActivityLogs(logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const o = await api.createOrganization(newOrgName.trim(), newOrgDomain.trim(), newOrgDesc.trim());
      setOrganizations([...organizations, o]);
      setActiveOrg(o);
      setShowOrgModal(false);
      setNewOrgName('');
      setNewOrgDomain('');
      setNewOrgDesc('');
      showToast("Organization created successfully!");
    } catch (e) {
      showToast("Failed to create organization", "error");
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !editOrgName.trim()) return;
    try {
      const updated = await api.updateOrganization(activeOrg.id, editOrgName.trim(), editOrgDomain.trim(), editOrgDesc.trim());
      setActiveOrg(updated);
      setOrganizations(organizations.map(o => o.id === updated.id ? updated : o));
      showToast("Organization settings updated!");
    } catch (e) {
      showToast("Failed to update organization settings", "error");
    }
  };

  const handleDeleteOrg = async () => {
    if (!activeOrg) return;
    const confirm = window.confirm(`WARNING: This will permanently delete organization "${activeOrg.name}" and all its teams/boards. Are you sure?`);
    if (!confirm) return;

    try {
      await api.deleteOrganization(activeOrg.id);
      const remaining = organizations.filter(o => o.id !== activeOrg.id);
      setOrganizations(remaining);
      if (remaining.length > 0) {
        setActiveOrg(remaining[0]);
      } else {
        setActiveOrg(null);
      }
      showToast("Organization deleted", "info");
    } catch (e: any) {
      showToast(e.message || "Failed to delete organization", "error");
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !activeOrg) return;
    try {
      const t = await api.createTeam(activeOrg.id, newTeamName.trim(), newTeamDesc.trim());
      setTeams([...teams, t]);
      setActiveTeam(t);
      setShowTeamModal(false);
      setNewTeamName('');
      setNewTeamDesc('');
      showToast(`Team "${t.name}" created!`);
    } catch (e) {
      showToast("Failed to create team", "error");
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !editTeamName.trim()) return;
    try {
      const updated = await api.updateTeam(activeTeam.id, editTeamName.trim(), editTeamDesc.trim());
      setActiveTeam(updated);
      setTeams(teams.map(t => t.id === updated.id ? updated : t));
      showToast("Team settings updated!");
    } catch (e) {
      showToast("Failed to update team settings", "error");
    }
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam || !activeOrg) return;
    const confirm = window.confirm(`Are you sure you want to delete the team "${activeTeam.name}"?`);
    if (!confirm) return;
    try {
      await api.deleteTeam(activeTeam.id);
      const remaining = teams.filter(t => t.id !== activeTeam.id);
      setTeams(remaining);
      if (remaining.length > 0) {
        setActiveTeam(remaining[0]);
      } else {
        setActiveTeam(null);
      }
      showToast("Team deleted successfully", "info");
    } catch (e) {
      showToast("Failed to delete team", "error");
    }
  };



  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim() || !activeWorkspace) return;
    try {
      const b = await api.createBoard(activeWorkspace.id, newBoardName.trim(), newBoardDesc.trim());
      setNewBoardName('');
      setNewBoardDesc('');
      showToast(`Board "${b.name}" created!`);
      navigate(`/board/${b.id}`);
    } catch (e: any) {
      showToast(e.message || "Failed to create board. You might need to upgrade your subscription.", "error");
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;
    setIsInviting(true);
    setInviteSuccess(false);
    try {
      await api.sendInvitation(activeTeam.id, inviteEmail.trim(), inviteRole);
      setInviteSuccess(true);
      setInviteEmail('');
      showToast("Invitation sent! (Logged to server terminal)");
    } catch (e: any) {
      showToast(e.message || "Failed to invite member.", "error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, targetRole: string) => {
    if (!activeOrg) return;
    try {
      await api.updateOrgMemberRole(activeOrg.id, targetUserId, targetRole);
      showToast("Member role updated");
      loadOrgMembers(activeOrg.id);
    } catch (e) {
      showToast("Failed to update role", "error");
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeOrg) return;
    const confirm = window.confirm("Are you sure you want to remove this member?");
    if (!confirm) return;
    try {
      await api.removeOrgMember(activeOrg.id, targetUserId);
      showToast("Member removed from organization");
      loadOrgMembers(activeOrg.id);
    } catch (e) {
      showToast("Failed to remove member", "error");
    }
  };

  const handleLeaveOrg = async () => {
    if (!activeOrg || !user) return;
    const confirm = window.confirm("Are you sure you want to leave this organization?");
    if (!confirm) return;
    try {
      await api.removeOrgMember(activeOrg.id, user.id);
      showToast("You left the organization");
      loadInitialOrgs();
    } catch (e) {
      showToast("Failed to leave organization", "error");
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
      showToast(b.is_starred ? "Unstarred board" : "Starred board");
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
      showToast(b.is_archived ? "Unarchived board" : "Archived board");
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
      showToast(toTrash ? "Board moved to trash" : "Board restored");
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationsAsRead();
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredBoards = () => {
    let result = boards || [];
    
    // Search filter
    if (searchQuery.trim()) {
      result = result.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tab sub-view filters
    return result.filter((b) => {
      if (boardSubView === 'trash') return b.is_deleted;
      if (b.is_deleted) return false;

      if (boardSubView === 'starred') return b.is_starred;
      if (boardSubView === 'archive') return b.is_archived;
      if (boardSubView === 'personal') return b.visibility === 'private' && !b.is_archived;
      if (boardSubView === 'team') return b.visibility === 'shared' && !b.is_archived;
      
      return !b.is_archived;
    });
  };

  const getFilteredMembers = () => {
    let result = orgMembers || [];

    if (memberFilter.trim()) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(memberFilter.toLowerCase()) || 
        m.email.toLowerCase().includes(memberFilter.toLowerCase()) ||
        m.username.toLowerCase().includes(memberFilter.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter);
    }

    return result;
  };

  if (errorMessage) {
    return (
      <div className="w-full min-h-screen bg-white text-[#1A1D21] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 border border-red-600 bg-[#F8FAFB] rounded-3xl text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#1A1D21]">Oops! Something went wrong</h2>
          <p className="text-[#5F6B7A] text-sm leading-relaxed">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-semibold shadow-lg shadow-teal-600/10 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white text-[#1A1D21] flex flex-col md:flex-row font-sans relative overflow-hidden selection:bg-teal-500 selection:text-[#1A1D21]">
      
      {/* Background Ornaments / Ambient Lights */}
      <div className="absolute top-0 right-0 w-[45rem] h-[45rem] bg-teal-600/5 rounded-full blur-[12rem] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[35rem] h-[35rem] bg-teal-500/10 rounded-full blur-[10rem] pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3.5 bg-[#F8FAFB] border border-[#E2E5E9] rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.type === 'info' && <Bell className="w-4 h-4 text-teal-400" />}
          <span className="text-xs font-medium text-[#1A1D21]">{toast.message}</span>
        </div>
      )}

      {/* Responsive Left Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen z-30 bg-[#F8FAFB] border-r border-[#E2E5E9] flex flex-col justify-between transition-all duration-300 ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
        }`}
      >
        <div className="flex flex-col overflow-y-auto flex-1 px-4 py-6 space-y-7">
          {/* Workspace Switcher / Org details */}
          <div className="relative">
            <button 
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="w-full flex items-center justify-between p-2 rounded-2xl bg-white/95 border border-[#E2E5E9] hover:border-teal-500/30 transition-all text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-purple-600 flex items-center justify-center text-sm font-bold text-[#1A1D21] shadow-md shadow-teal-600/10">
                  {activeOrg?.name?.charAt(0) || 'W'}
                </div>
                {isSidebarOpen && (
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#1A1D21] truncate">{activeOrg?.name || 'Workspace'}</h4>
                    <span className="text-[10px] text-[#9AA4AB] block truncate">{activeOrg?.domain || 'collab.space'}</span>
                  </div>
                )}
              </div>
              {isSidebarOpen && <ChevronDown className="w-4 h-4 text-[#5F6B7A]" />}
            </button>

            {/* Org Switcher Dropdown */}
            {showOrgDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-[#F8FAFB] border border-[#E2E5E9] rounded-2xl p-2.5 shadow-2xl z-50 space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#9AA4AB] px-2 block mb-1">Organizations</span>
                {organizations.map(o => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setActiveOrg(o);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      activeOrg?.id === o.id ? 'bg-teal-600/10 text-teal-400 font-semibold' : 'hover:bg-[#F0F2F4]/60 text-[#5F6B7A]'
                    }`}
                  >
                    <span className="truncate">{o.name}</span>
                    {o.id === activeOrg?.id && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                  </button>
                ))}
                <div className="border-t border-[#E2E5E9] mt-2 pt-2">
                  <button 
                    onClick={() => {
                      setShowOrgDropdown(false);
                      setShowOrgModal(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-[#F0F2F4]/60 text-xs font-semibold text-teal-400 rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Teams Switcher Section */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB] block px-2">Teams</span>
            <div className="relative">
              <button 
                onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F0F2F4]/60 transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[10px] font-bold text-teal-400">
                    {activeTeam?.name?.charAt(0) || 'T'}
                  </div>
                  {isSidebarOpen && (
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#1A1D21] truncate block">{activeTeam?.name || 'General Team'}</span>
                      <span className="text-[10px] text-[#9AA4AB] block truncate">{workspaces.length} workspaces</span>
                    </div>
                  )}
                </div>
                {isSidebarOpen && <ChevronDown className="w-3.5 h-3.5 text-[#5F6B7A]" />}
              </button>

              {showTeamDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-[#F8FAFB] border border-[#E2E5E9] rounded-xl p-2 shadow-xl z-50 space-y-1">
                  {teams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTeam(t);
                        setShowTeamDropdown(false);
                      }}
                      className={`w-full p-2 rounded-lg text-left text-xs transition-colors ${
                        activeTeam?.id === t.id ? 'bg-teal-600/10 text-teal-400 font-semibold' : 'hover:bg-[#F0F2F4] text-[#5F6B7A]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                  <div className="border-t border-[#E2E5E9] mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowTeamDropdown(false);
                        setShowTeamModal(true);
                      }}
                      className="w-full flex items-center gap-2 p-1.5 hover:bg-[#F0F2F4] text-xs font-semibold text-teal-400 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Team</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB] block px-2 mb-2">Navigation</span>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'dashboard' ? 'bg-teal-600 text-[#1A1D21] shadow-lg shadow-teal-600/10' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-[#F0F2F4]/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {isSidebarOpen && <span>Overview</span>}
            </button>
            <button
              onClick={() => setCurrentTab('boards')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'boards' ? 'bg-teal-600 text-[#1A1D21] shadow-lg shadow-teal-600/10' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-[#F0F2F4]/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              {isSidebarOpen && <span>Boards & Canvases</span>}
            </button>
            <button
              onClick={() => setCurrentTab('members')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'members' ? 'bg-teal-600 text-[#1A1D21] shadow-lg shadow-teal-600/10' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-[#F0F2F4]/50'
              }`}
            >
              <Users className="w-4 h-4" />
              {isSidebarOpen && <span>Members & Invites</span>}
            </button>
            <button
              onClick={() => setCurrentTab('activities')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'activities' ? 'bg-teal-600 text-[#1A1D21] shadow-lg shadow-teal-600/10' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-[#F0F2F4]/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              {isSidebarOpen && <span>Activity Trail</span>}
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'settings' ? 'bg-teal-600 text-[#1A1D21] shadow-lg shadow-teal-600/10' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-[#F0F2F4]/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              {isSidebarOpen && <span>Settings & Billing</span>}
            </button>
          </div>
        </div>

        {/* User profile and logout */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-[#E2E5E9] bg-[#F8FAFB]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#E2E5E9] border border-[#CDD2D8] flex items-center justify-center font-bold text-[#1A1D21] shadow-inner">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-[#1A1D21] truncate">{user?.name || 'Default User'}</h5>
                  <span className="text-[10px] text-[#9AA4AB] block truncate">{user?.email}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-[#E2E5E9] rounded-lg text-[#5F6B7A] hover:text-slate-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen pb-16">
        
        {/* Sticky Topbar */}
        <header className="sticky top-0 bg-white/95 border-b border-[#E2E5E9] z-20 px-6 py-4 flex items-center justify-between">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5F6B7A]">
            <button className="hover:text-slate-200" onClick={() => setCurrentTab('dashboard')}>
              {activeOrg?.name || 'Workspace'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#5F6B7A]" />
            <span className="text-[#1A1D21] font-bold capitalize">{currentTab}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA4AB]" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-56 rounded-full bg-slate-905 border border-[#E2E5E9] text-xs text-[#1A1D21] focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotificationsMenu(!showNotificationsMenu);
                  if (!showNotificationsMenu) handleMarkNotificationsRead();
                }}
                className="p-2 bg-[#F8FAFB] border border-[#E2E5E9] rounded-xl hover:bg-[#E2E5E9] transition-colors relative"
              >
                <Bell className="w-4 h-4 text-[#5F6B7A]" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                )}
              </button>

              {showNotificationsMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-[#F8FAFB] border border-[#E2E5E9] rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E5E9] pb-2">
                    <h4 className="text-xs font-bold text-[#1A1D21]">Notifications</h4>
                    <span className="text-[10px] text-[#9AA4AB]">{notifications.length} total</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2.5">
                    {notifications.length === 0 ? (
                      <p className="text-center text-[10px] text-[#9AA4AB] py-6">No notifications found.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-white/95 border border-slate-855/60 text-left text-xs">
                          <h5 className="font-bold text-[#1A1D21]">{n.title}</h5>
                          <p className="text-[#5F6B7A] mt-1 text-[11px] leading-relaxed">{n.content}</p>
                          <span className="text-[9px] text-[#9AA4AB] block mt-2">{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <button 
              onClick={() => {
                setCurrentTab('boards');
                setBoardSubView('all');
                setTimeout(() => {
                  const el = document.getElementById('boardNameInput');
                  if (el) el.focus();
                }, 100);
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-bold shadow-lg shadow-teal-600/10 flex items-center gap-2 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Board</span>
            </button>
          </div>
        </header>

        {/* Tab Components */}
        <div className="p-6 md:p-8 flex-1">
          {currentTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Quick Actions Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-xl flex items-center justify-between group hover:border-teal-500/30 transition-all duration-300">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#9AA4AB]">Collaborate</span>
                    <h3 className="text-sm font-bold text-[#1A1D21]">Create Board</h3>
                    <p className="text-xs text-[#5F6B7A]">Launch a new canvas workspace</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentTab('boards');
                      setBoardSubView('all');
                    }}
                    className="p-3 bg-teal-600/10 hover:bg-teal-600 text-teal-400 hover:text-white rounded-2xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-xl flex items-center justify-between group hover:border-teal-500/30 transition-all duration-300">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#9AA4AB]">Scale</span>
                    <h3 className="text-sm font-bold text-[#1A1D21]">Invite Member</h3>
                    <p className="text-xs text-[#5F6B7A]">Bring new minds into the team</p>
                  </div>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="p-3 bg-teal-600/10 hover:bg-teal-600 text-teal-400 hover:text-white rounded-2xl transition-all"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-xl flex items-center justify-between group hover:border-teal-500/30 transition-all duration-300">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#9AA4AB]">Coordinate</span>
                    <h3 className="text-sm font-bold text-[#1A1D21]">Create Team</h3>
                    <p className="text-xs text-[#5F6B7A]">Assemble team boards together</p>
                  </div>
                  <button 
                    onClick={() => setShowTeamModal(true)}
                    className="p-3 bg-teal-600/10 hover:bg-teal-600 text-teal-400 hover:text-white rounded-2xl transition-all"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Statistics & Billing details */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl bg-slate-905 border border-[#E2E5E9] flex flex-col justify-between h-36">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB]">Boards Created</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-[#1A1D21]">{boards.length}</span>
                    <span className="text-xs text-[#9AA4AB]">/ {billingDetails?.board_limit || 3} limit</span>
                  </div>
                  <div className="w-full bg-[#E2E5E9] h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-teal-500 h-full rounded-full transition-all duration-550" 
                      style={{ width: `${Math.min(100, (boards.length / (billingDetails?.board_limit || 3)) * 100)}%` }} 
                    />
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-slate-905 border border-[#E2E5E9] flex flex-col justify-between h-36">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB]">Team Members</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-[#1A1D21]">{orgMembers.length}</span>
                    <span className="text-xs text-[#9AA4AB]">/ {billingDetails?.member_limit || 3} limit</span>
                  </div>
                  <div className="w-full bg-[#E2E5E9] h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-teal-500 h-full rounded-full transition-all duration-550" 
                      style={{ width: `${Math.min(100, (orgMembers.length / (billingDetails?.member_limit || 3)) * 100)}%` }} 
                    />
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-slate-905 border border-[#E2E5E9] flex flex-col justify-between h-36">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB]">Active Tier Plan</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-black uppercase text-[#1A1D21] bg-teal-600/10 px-3 py-1 rounded-xl border border-teal-500/20 text-teal-400">
                      {billingDetails?.plan || 'Free'}
                    </span>
                    <button 
                      onClick={() => setShowBillingModal(true)}
                      className="text-[10px] font-extrabold text-teal-500 hover:underline"
                    >
                      Manage Plan
                    </button>
                  </div>
                  <span className="text-[10px] text-[#9AA4AB] block mt-3">Storage space: {billingDetails?.storage_limit || '50 MB'}</span>
                </div>
                <div className="p-6 rounded-3xl bg-slate-905 border border-[#E2E5E9] flex flex-col justify-between h-36">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#9AA4AB]">Storage Consumption</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-bold text-[#1A1D21]">0.2 MB</span>
                    <span className="text-xs text-[#9AA4AB]">/ {billingDetails?.storage_limit || '50 MB'}</span>
                  </div>
                  <div className="w-full bg-[#E2E5E9] h-1.5 rounded-full overflow-hidden mt-3">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>
              </div>

              {/* Recent Activity Logs list and Boards list side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent activity */}
                <div className="lg:col-span-1 p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1A1D21]">Team Activity</h3>
                    <button onClick={() => setCurrentTab('activities')} className="text-[10px] font-extrabold text-teal-400 hover:underline">View All</button>
                  </div>
                  <div className="space-y-4 max-h-72 overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-[#9AA4AB] text-center py-8">No activities recorded yet.</p>
                    ) : (
                      activityLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="flex gap-3 text-xs leading-normal">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-[#5F6B7A]">{l.user_name || 'Collaborator'}</span>{' '}
                            <span className="text-[#5F6B7A] font-normal">{l.details || l.action}</span>
                            <span className="text-[9px] text-[#9AA4AB] block mt-0.5">{new Date(l.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent boards */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1A1D21]">Recent Boards</h3>
                    <button onClick={() => setCurrentTab('boards')} className="text-[10px] font-extrabold text-teal-400 hover:underline">All Boards</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {boards.slice(0, 4).map(b => (
                      <div
                        key={b.id}
                        onClick={() => navigate(`/board/${b.id}`)}
                        className="p-4 rounded-2xl bg-white/95 border border-[#E2E5E9] hover:border-teal-500/35 transition-all text-left cursor-pointer flex flex-col justify-between h-28 group"
                      >
                        <div>
                          <h4 className="font-bold text-[#1A1D21] group-hover:text-white text-xs truncate">{b.name}</h4>
                          <p className="text-[10px] text-[#9AA4AB] mt-1 line-clamp-2 leading-relaxed">{b.description || 'No description'}</p>
                        </div>
                        <span className="text-[9px] text-[#5F6B7A] self-end">Private</span>
                      </div>
                    ))}
                    {boards.length === 0 && (
                      <div className="col-span-2 text-center py-10 text-xs text-[#9AA4AB]">
                        Create your first board to start collaborating!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'boards' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Creator input panel */}
              {(() => {
                const canCreateBoard = userOrgRole === 'owner' || userOrgRole === 'admin' || userOrgRole === 'editor';
                return canCreateBoard && (
                <form onSubmit={handleCreateBoard} className="p-6 rounded-3xl bg-[#F8FAFB] border border-slate-800/85 shadow-lg flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block">Board Name</label>
                    <input
                      id="boardNameInput"
                      type="text"
                      required
                      placeholder="e.g. Brainstorming Session"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block">Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Design critique & spatial mapping"
                      value={newBoardDesc}
                      onChange={(e) => setNewBoardDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowTemplates(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-[#F0F2F4] hover:bg-[#E2E5E9] border border-[#E2E5E9] text-[#5F6B7A] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Templates</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-bold shadow-lg shadow-teal-600/10 transition-all"
                    >
                      Create Canvas
                    </button>
                  </div>
                </form>
                );
              })()}

              {/* Sub-view filters */}
              <div className="flex flex-wrap gap-2.5 border-b border-slate-855 pb-4">
                {[
                  { key: 'all', label: 'All Boards' },
                  { key: 'starred', label: 'Starred' },
                  { key: 'personal', label: 'Personal' },
                  { key: 'team', label: 'Team Shared' },
                  { key: 'archive', label: 'Archived' },
                  { key: 'trash', label: 'Trash Bin' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setBoardSubView(item.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      boardSubView === item.key ? 'bg-teal-600/15 text-teal-400 border border-teal-500/20' : 'text-[#5F6B7A] hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Boards Grid */}
              {getFilteredBoards().length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-[#E2E5E9] bg-slate-900/10">
                  <Folder className="w-8 h-8 text-[#5F6B7A] mx-auto mb-3" />
                  <p className="text-[#5F6B7A] text-xs font-semibold">No boards found in this view.</p>
                  <p className="text-[10px] text-[#5F6B7A] mt-1">Get started by creating a new collaborative board above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredBoards().map((b) => (
                    <div 
                      key={b.id}
                      className="p-6 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44 shadow-lg cursor-pointer group"
                      onClick={() => !b.is_deleted && navigate(`/board/${b.id}`)}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-[#1A1D21] group-hover:text-white truncate max-w-[180px] text-sm transition-colors">
                            {b.name}
                          </h3>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => toggleStar(b)}
                              className={`p-1.5 rounded-lg hover:bg-[#F0F2F4] transition-colors ${
                                b.is_starred ? 'text-amber-400 bg-amber-500/5 border border-amber-500/10' : 'text-[#9AA4AB] hover:text-slate-300'
                              }`}
                              title={b.is_starred ? 'Unstar Board' : 'Star Board'}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button 
                              onClick={() => toggleArchive(b)}
                              className={`p-1.5 rounded-lg hover:bg-[#F0F2F4] transition-colors ${
                                b.is_archived ? 'text-teal-400 bg-teal-500/5 border border-teal-500/10' : 'text-[#9AA4AB] hover:text-slate-300'
                              }`}
                              title={b.is_archived ? 'Unarchive Board' : 'Archive Board'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[#5F6B7A] mt-2 line-clamp-2 leading-relaxed font-normal">
                          {b.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[#E2E5E9]" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#9AA4AB] bg-white px-2.5 py-0.5 rounded-full border border-[#E2E5E9]">
                          {b.visibility}
                        </span>
                        
                        {b.is_deleted ? (
                          <button 
                            onClick={() => moveBoardToTrash(b, false)}
                            className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                          >
                            Restore
                          </button>
                        ) : (
                          <button 
                            onClick={() => moveBoardToTrash(b, true)}
                            className="p-1.5 hover:bg-red-500/5 rounded-lg text-[#9AA4AB] hover:text-red-400 transition-colors"
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
            </div>
          )}

          {currentTab === 'members' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Member Invite Header Form */}
              <div className="flex flex-col md:flex-row gap-4 items-end justify-between p-6 bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl">
                <form onSubmit={handleSendInvite} className="w-full flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="collaborator@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="w-full sm:w-48 space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-600/10 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isInviting ? 'Inviting...' : 'Invite'}</span>
                  </button>
                </form>
              </div>

              {/* Members Table Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#F8FAFB] p-4 border border-[#E2E5E9] rounded-2xl">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA4AB]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E2E5E9] text-xs text-[#1A1D21] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#E2E5E9] text-xs text-[#5F6B7A] focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {/* Responsive Members List */}
              <div className="border border-[#E2E5E9] rounded-3xl bg-[#F8FAFB] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/95 border-b border-[#E2E5E9] text-[#5F6B7A] font-bold">
                        <th className="p-4">Name / Username</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {getFilteredMembers().map((m) => (
                        <tr key={m.user_id} className="hover:bg-[#F0F2F4]/40 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E2E5E9] flex items-center justify-center font-bold text-[#1A1D21]">
                              {m.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-[#1A1D21]">{m.name}</div>
                              <div className="text-[10px] text-[#9AA4AB]">@{m.username}</div>
                            </div>
                          </td>
                          <td className="p-4 text-[#5F6B7A]">{m.email}</td>
                          <td className="p-4">
                            <select
                              value={m.role}
                              disabled={m.role === 'owner' || userOrgRole === 'viewer'}
                              onChange={(e) => handleUpdateMemberRole(m.user_id, e.target.value)}
                              className="bg-white border border-[#E2E5E9] rounded-lg px-2 py-1 text-xs text-[#5F6B7A] focus:outline-none disabled:opacity-50"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            {m.user_id !== user?.id ? (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                disabled={userOrgRole === 'viewer'}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={handleLeaveOrg}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg transition-all text-xs font-semibold"
                              >
                                Leave Workspace
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'activities' && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-[#E2E5E9] pb-3">
                <h2 className="text-base font-bold text-[#1A1D21]">Activity Trail Log</h2>
                <button onClick={() => activeOrg && loadActivityLogs(activeOrg.id)} className="p-2 bg-[#F8FAFB] border border-[#E2E5E9] rounded-lg hover:bg-[#E2E5E9] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-[#5F6B7A]" />
                </button>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2E5E9]">
                {activityLogs.map((l) => (
                  <div key={l.id} className="relative text-xs text-left leading-relaxed">
                    <div className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 bg-teal-500 flex items-center justify-center shrink-0" />
                    <div>
                      <span className="font-bold text-[#1A1D21]">{l.user_name || 'Collaborator'}</span>{' '}
                      <span className="text-[#5F6B7A]">{l.details || l.action}</span>
                      <span className="text-[10px] text-[#9AA4AB] block mt-1">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p className="text-[#9AA4AB] text-center py-10">No activities log found.</p>
                )}
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
              {/* Org settings form */}
              <div className="p-6 bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1D21]">Organization Settings</h3>
                  <p className="text-xs text-[#5F6B7A] mt-0.5">Customize workspace information.</p>
                </div>
                <form onSubmit={handleUpdateOrg} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB]">Org Name</label>
                    <input
                      type="text"
                      required
                      value={editOrgName}
                      onChange={(e) => setEditOrgName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB]">Domain / URL Prefix</label>
                    <input
                      type="text"
                      value={editOrgDomain}
                      onChange={(e) => setEditOrgDomain(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#9AA4AB]">Description</label>
                    <textarea
                      value={editOrgDesc}
                      onChange={(e) => setEditOrgDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 h-20"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-600/10"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Team Settings Panel */}
              {activeTeam && (
                <div className="p-6 bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21]">Team Configuration</h3>
                    <p className="text-xs text-[#5F6B7A] mt-0.5">Edit settings for team "{activeTeam.name}".</p>
                  </div>
                  <form onSubmit={handleUpdateTeam} className="space-y-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#9AA4AB]">Team Name</label>
                      <input
                        type="text"
                        required
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#9AA4AB]">Team Description</label>
                      <input
                        type="text"
                        value={editTeamDesc}
                        onChange={(e) => setEditTeamDesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-600/10"
                      >
                        Update Team
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteTeam}
                        className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Delete Team
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Danger Zone */}
              <div className="p-6 bg-red-500/5 border border-red-500/15 rounded-3xl space-y-4 text-left">
                <div>
                  <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                  <p className="text-xs text-[#5F6B7A] mt-0.5">Destructive actions for organization managers.</p>
                </div>
                <button
                  onClick={handleDeleteOrg}
                  disabled={userOrgRole !== 'owner'}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-[#1A1D21] rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Delete Organization Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && activeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/95" onClick={() => setShowInviteModal(false)} />
          <form onSubmit={handleSendInvite} className="relative bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-[#1A1D21]">
            <div>
              <h3 className="text-base font-bold text-[#1A1D21]">Invite to Team Workspace</h3>
              <p className="text-xs text-[#5F6B7A] mt-1">Send a direct token link to invite users.</p>
            </div>
            
            {inviteSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                Invitation sent successfully! Link is printed to backend server log.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Target Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
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
                className="flex-1 py-2.5 bg-[#E2E5E9] hover:bg-slate-750 text-[#5F6B7A] rounded-xl font-semibold text-xs transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl font-semibold text-xs transition-all shadow-lg shadow-teal-600/10"
              >
                {isInviting ? 'Inviting...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Org Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/95" onClick={() => setShowOrgModal(false)} />
          <form onSubmit={handleCreateOrg} className="relative bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-[#1A1D21]">
            <div>
              <h3 className="text-base font-bold text-[#1A1D21]">New Organization</h3>
              <p className="text-xs text-[#5F6B7A] mt-1">Spin up a new workspace tenant.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Domain URL Prefix (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. acme"
                  value={newOrgDomain}
                  onChange={(e) => setNewOrgDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 py-2.5 bg-[#E2E5E9] hover:bg-slate-750 text-[#5F6B7A] rounded-xl font-semibold text-xs transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl font-semibold text-xs transition-all shadow-lg shadow-teal-600/10">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/95" onClick={() => setShowTeamModal(false)} />
          <form onSubmit={handleCreateTeam} className="relative bg-[#F8FAFB] border border-slate-855 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-[#1A1D21]">
            <div>
              <h3 className="text-base font-bold text-[#1A1D21]">Create New Team</h3>
              <p className="text-xs text-[#5F6B7A] mt-1">Spin up a team unit within the organization.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineering"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#9AA4AB] block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Design systems and UI specs"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-2.5 bg-[#E2E5E9] hover:bg-slate-750 text-[#5F6B7A] rounded-xl font-semibold text-xs transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-[#1A1D21] rounded-xl font-semibold text-xs transition-all shadow-lg shadow-teal-600/10">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Billing Portal Modal */}
      {activeTeam && (
        <BillingPortal
          teamId={activeTeam.id}
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          onPlanChanged={() => {
            if (activeTeam) loadBillingDetails(activeTeam.id);
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={async (_, templateId) => {
            if (!activeWorkspace) return;
            const name = window.prompt("Enter board name:", `Template ${templateId.replace('-', ' ')}`);
            if (!name) return;
            try {
              const b = await api.createBoard(activeWorkspace.id, name);
              navigate(`/board/${b.id}?template=${templateId}`);
            } catch (e) {
              showToast("Failed to create template board", "error");
            }
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;
