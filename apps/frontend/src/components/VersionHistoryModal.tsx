import React, { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { api } from '../services/api';
import type { BoardVersion } from '../services/api';
import { globalBoardStore } from '../crdt/boardStore';
import type { BoardElement } from '../crdt/boardStore';

interface VersionHistoryModalProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ boardId, isOpen, onClose }) => {
  const [versions, setVersions] = useState<BoardVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<BoardVersion | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<BoardVersion | null>(null);
  
  // Difference states
  const [diffAdded, setDiffAdded] = useState<BoardElement[]>([]);
  const [diffRemoved, setDiffRemoved] = useState<BoardElement[]>([]);
  const [diffModified, setDiffModified] = useState<{ current: BoardElement; old: BoardElement }[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBoardVersions(boardId);
      setVersions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    } else {
      setSelectedVersion(null);
      setShowCompare(false);
    }
  }, [isOpen, boardId]);

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await globalBoardStore.saveSnapshot(name, description);
      setName('');
      setDescription('');
      await fetchVersions();
    } catch (e: any) {
      setError(e.message || 'Failed to save version snapshot.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (version: BoardVersion) => {
    try {
      globalBoardStore.restoreSnapshot(version.crdt_update);
      setShowRestoreConfirm(null);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Restore failed.');
    }
  };

  // Compare selected version against current canvas
  const handleCompare = (version: BoardVersion) => {
    setSelectedVersion(version);
    
    // 1. Decode version elements
    try {
      const binaryString = atob(version.crdt_update);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, bytes);
      const tempMap = tempDoc.getMap<BoardElement>('elements');
      const oldElementsMap = new Map<string, BoardElement>();
      for (const [key, val] of tempMap.entries()) {
        oldElementsMap.set(key, val);
      }

      // 2. Get current elements
      const currentElements = globalBoardStore.getElements();
      const currentElementsMap = new Map<string, BoardElement>(
        currentElements.map(el => [el.id, el])
      );

      // 3. Compute diffs
      const added: BoardElement[] = [];
      const removed: BoardElement[] = [];
      const modified: { current: BoardElement; old: BoardElement }[] = [];

      currentElements.forEach(currEl => {
        const oldEl = oldElementsMap.get(currEl.id);
        if (!oldEl) {
          added.push(currEl);
        } else if (
          currEl.type !== oldEl.type ||
          currEl.x !== oldEl.x ||
          currEl.y !== oldEl.y ||
          currEl.width !== oldEl.width ||
          currEl.height !== oldEl.height ||
          currEl.fill !== oldEl.fill ||
          currEl.stroke !== oldEl.stroke ||
          currEl.text !== oldEl.text
        ) {
          modified.push({ current: currEl, old: oldEl });
        }
      });

      oldElementsMap.forEach((oldEl, id) => {
        if (!currentElementsMap.has(id)) {
          removed.push(oldEl);
        }
      });

      setDiffAdded(added);
      setDiffRemoved(removed);
      setDiffModified(modified);
      setShowCompare(true);
    } catch (e) {
      console.error('Failed to compare versions:', e);
      setError('Could not decode snapshot for comparison.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/95" onClick={onClose} />

      {/* Main Drawer */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-[#F8FAFB] border-l border-[#E2E5E9] shadow-2xl flex flex-col h-full text-[#1A1D21]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E2E5E9] flex justify-between items-center bg-white/95">
          <div>
            <h2 className="text-lg font-bold text-[#1A1D21]">Version History</h2>
            <p className="text-xs text-[#5F6B7A]">View and restore snapshots of this board</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5F6B7A] hover:text-slate-200 hover:bg-[#E2E5E9] transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Errors */}
        {error && (
          <div className="m-4 p-3 bg-red-500/10 border border-red-600 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Form to Manual Save */}
          <form onSubmit={handleManualSave} className="p-4 bg-white/95 rounded-2xl border border-[#E2E5E9] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6B7A]">Save Current State</h3>
            <div>
              <input
                type="text"
                placeholder="Version Name (e.g. V1 - Initial)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#E2E5E9] bg-white text-[#1A1D21] placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E5E9] bg-white text-[#1A1D21] placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-[#1A1D21] rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving snapshot...' : 'Save Snapshot'}
            </button>
          </form>

          {/* Compare Section Overlay/Panel */}
          {showCompare && selectedVersion && (
            <div className="p-4 bg-teal-950/20 border border-teal-500/20 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-400">Comparing with V{selectedVersion.version_number}</span>
                <button
                  onClick={() => setShowCompare(false)}
                  className="text-[10px] uppercase font-bold text-[#5F6B7A] hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white/95 rounded-lg">
                  <div className="font-bold text-emerald-400">+{diffAdded.length}</div>
                  <div className="text-[10px] text-[#5F6B7A]">Added</div>
                </div>
                <div className="p-2 bg-white/95 rounded-lg">
                  <div className="font-bold text-red-400">-{diffRemoved.length}</div>
                  <div className="text-[10px] text-[#5F6B7A]">Deleted</div>
                </div>
                <div className="p-2 bg-white/95 rounded-lg">
                  <div className="font-bold text-amber-400">~{diffModified.length}</div>
                  <div className="text-[10px] text-[#5F6B7A]">Modified</div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6B7A]">Version History Timeline</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-xs text-[#9AA4AB]">Loading timeline...</span>
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-[#9AA4AB] text-center py-6">No historical snapshots saved yet.</p>
            ) : (
              <div className="relative border-l border-[#E2E5E9] ml-3 pl-6 space-y-6">
                {versions.map((v) => {
                  const isAuto = v.name.startsWith('Auto-save');
                  return (
                    <div key={v.id} className="relative group">
                      
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-[#E2E5E9] ${
                        isAuto ? 'bg-slate-700' : 'bg-teal-500'
                      }`} />

                      <div className="p-3.5 bg-white/95 border border-[#E2E5E9] rounded-xl group-hover:border-[#CDD2D8]/80 transition-all space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-[#1A1D21]">{v.name}</h4>
                            {v.description && <p className="text-[10px] text-[#5F6B7A] mt-0.5">{v.description}</p>}
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            isAuto ? 'bg-[#E2E5E9] text-[#5F6B7A]' : 'bg-teal-500/10 text-teal-400'
                          }`}>
                            V{v.version_number}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#9AA4AB]">
                          {v.author_avatar ? (
                            <img src={v.author_avatar} alt={v.author_name} className="w-4 h-4 rounded-full" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-[#1A1D21] uppercase">
                              {v.author_name.charAt(0)}
                            </div>
                          )}
                          <span>By {v.author_name}</span>
                          <span>•</span>
                          <span>{v.created_at}</span>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleCompare(v)}
                            className="px-2.5 py-1 bg-[#E2E5E9] hover:bg-slate-700 text-[#1A1D21] rounded text-[10px] font-semibold transition-all"
                          >
                            Compare
                          </button>
                          <button
                            onClick={() => setShowRestoreConfirm(v)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-[#1A1D21] rounded text-[10px] font-semibold transition-all"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Overlay */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/95" onClick={() => setShowRestoreConfirm(null)} />
          <div className="relative bg-[#F8FAFB] border border-[#E2E5E9] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto text-xl">
              ⏳
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1D21]">Restore this snapshot?</h3>
              <p className="text-sm text-[#5F6B7A] mt-2">
                You are about to roll back the board to **"{showRestoreConfirm.name}"**. The current elements map will be replaced, and this rollback will synchronize instantly for all other users in this room.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="flex-1 py-2.5 bg-[#E2E5E9] hover:bg-slate-700 text-[#5F6B7A] rounded-xl font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showRestoreConfirm)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-[#1A1D21] rounded-xl font-semibold text-xs transition-all"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VersionHistoryModal;
