import React, { createContext, useContext, useEffect, useState } from 'react';
import { globalBoardStore } from '../crdt/boardStore';

interface ShortcutContextType {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  registerPluginShortcut: (keys: string, callback: () => void) => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export const useShortcuts = () => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider');
  }
  return context;
};

const isInputActive = () => {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || active.hasAttribute('contenteditable');
};

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [pluginShortcuts, setPluginShortcuts] = useState<Map<string, () => void>>(new Map());

  const registerPluginShortcut = (keys: string, callback: () => void) => {
    setPluginShortcuts(prev => {
      const next = new Map(prev);
      next.set(keys.toLowerCase(), callback);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputActive()) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // 1. Plugin-registered custom shortcuts
      const combination = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${key}`;
      if (pluginShortcuts.has(combination)) {
        e.preventDefault();
        pluginShortcuts.get(combination)!();
        return;
      }

      // 2. Editing Shortcuts
      if (ctrl && key === 'z') {
        e.preventDefault();
        if (shift) {
          globalBoardStore.redo();
        } else {
          globalBoardStore.undo();
        }
        return;
      }
      if (ctrl && (key === 'y' || (shift && key === 'z'))) {
        e.preventDefault();
        globalBoardStore.redo();
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        globalBoardStore.deleteSelected();
        return;
      }
      if (ctrl && key === 'a') {
        e.preventDefault();
        globalBoardStore.selectAll();
        return;
      }
      if (ctrl && key === 'c') {
        e.preventDefault();
        globalBoardStore.copySelected();
        return;
      }
      if (ctrl && key === 'x') {
        e.preventDefault();
        globalBoardStore.cutSelected();
        return;
      }
      if (ctrl && key === 'v') {
        e.preventDefault();
        globalBoardStore.paste();
        return;
      }
      if (ctrl && key === 'd') {
        e.preventDefault();
        globalBoardStore.duplicateSelected();
        return;
      }
      if (ctrl && key === 'l') {
        e.preventDefault();
        if (shift) {
          globalBoardStore.unlockSelected();
        } else {
          globalBoardStore.lockSelected();
        }
        return;
      }

      // 3. Navigation Shortcuts
      if (ctrl && (key === '=' || key === '+')) {
        e.preventDefault();
        // Zoom in by 10%
        const z = globalBoardStore.getZoom();
        globalBoardStore.setZoom(Math.min(4, z + 0.1));
        return;
      }
      if (ctrl && (key === '-' || key === '_')) {
        e.preventDefault();
        // Zoom out by 10%
        const z = globalBoardStore.getZoom();
        globalBoardStore.setZoom(Math.max(0.1, z - 0.1));
        return;
      }
      if (ctrl && key === '0') {
        e.preventDefault();
        globalBoardStore.setZoom(1);
        return;
      }

      // Arrow Keys movement
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const step = shift ? 25 : 5;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;

        globalBoardStore.getSelectedIds().forEach(id => {
          const el = globalBoardStore.elementsMap.get(id);
          if (el && !el.isLocked) {
            globalBoardStore.updateElement(id, {
              x: el.x + dx,
              y: el.y + dy
            });
          }
        });
        return;
      }

      // Escape key to deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        globalBoardStore.clearSelection();
        return;
      }

      // 4. Tools Shortcuts
      if (!ctrl && !shift) {
        if (key === 'v') {
          globalBoardStore.setTool('select');
          return;
        }
        if (key === 'r') {
          globalBoardStore.setTool('rectangle');
          return;
        }
        if (key === 'o') {
          globalBoardStore.setTool('circle');
          return;
        }
        if (key === 't') {
          globalBoardStore.setTool('text');
          return;
        }
        if (key === 's') {
          globalBoardStore.setTool('sticky');
          return;
        }
        if (key === 'e') {
          globalBoardStore.setTool('eraser');
          return;
        }
        if (key === 'b' || key === 'p') {
          globalBoardStore.setTool('freehand');
          return;
        }
      }

      // 5. General Shortcuts
      if (ctrl && key === '/') {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      // Ctrl + N (New Board mockup redirect)
      if (ctrl && key === 'n') {
        e.preventDefault();
        const accept = window.confirm("Create a new whiteboard canvas?");
        if (accept) {
          window.location.href = '/dashboard';
        }
        return;
      }
      // Ctrl + P (Export board trigger)
      if (ctrl && key === 'p') {
        e.preventDefault();
        alert("Preparing board export. Please select layout options.");
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pluginShortcuts]);

  return (
    <ShortcutContext.Provider value={{ showHelp, setShowHelp, registerPluginShortcut }}>
      {children}
      {showHelp && <ShortcutDialog onClose={() => setShowHelp(false)} />}
    </ShortcutContext.Provider>
  );
};

// Help Sheet Dialog Component
const ShortcutDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0D0F12]/95" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 text-left text-slate-100 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Keyboard Shortcuts Reference</h3>
            <p className="text-xs text-slate-400">Boost your productivity with quick board controls</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-6 text-xs leading-relaxed">
          {/* Editing Column */}
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-850 pb-1">Editing</span>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-400">Undo</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + Z</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Redo</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + Y</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Delete</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Del / Backspace</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Select All</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + A</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Copy</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + C</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Paste</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + V</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Duplicate</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + D</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Lock Shape</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + L</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Unlock Shape</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl+Shift+L</kbd></div>
            </div>
          </div>

          {/* Tools & Navigation */}
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-850 pb-1">Tools & Navigation</span>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-400">Selection Tool</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">V</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Rectangle</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">R</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Circle</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">O</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Text Tool</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">T</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Sticky Note</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">S</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Pencil / Brush</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">P / B</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Eraser</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">E</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Move Shapes</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Arrow Keys</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Zoom In / Out</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + (+ / -)</kbd></div>
              <div className="flex justify-between"><span className="text-slate-400">Reset Zoom</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono">Ctrl + 0</kbd></div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 text-[10px] text-center text-slate-500">
          Tip: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono">Ctrl + /</kbd> anywhere on the board to toggle this dialog.
        </div>
      </div>
    </div>
  );
};
