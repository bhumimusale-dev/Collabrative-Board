import React, { useState } from 'react';
import { 
  MousePointer, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  StickyNote, 
  Brush, 
  Trash2, 
  Undo2, 
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
  LayoutTemplate,
  Sparkles
} from 'lucide-react';
import { useBoard } from '../hooks/useBoard';
import type { ToolType } from '../crdt/boardStore';
import { TemplatesModal } from './TemplatesModal';
import { PluginsModal } from './PluginsModal';

export const Toolbar: React.FC = () => {
  const store = useBoard();
  const currentTool = store.getTool();
  const strokeColor = store.getStrokeColor();
  const darkMode = store.isDarkMode();

  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);

  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'select', icon: <MousePointer className="w-5 h-5" />, label: 'Select' },
    { type: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
    { type: 'circle', icon: <CircleIcon className="w-5 h-5" />, label: 'Circle' },
    { type: 'text', icon: <Type className="w-5 h-5" />, label: 'Text' },
    { type: 'sticky', icon: <StickyNote className="w-5 h-5" />, label: 'Sticky Note' },
    { type: 'freehand', icon: <Brush className="w-5 h-5" />, label: 'Draw' },
  ];

  const colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Orange/Yellow
    '#8b5cf6', // Purple
    '#0f172a', // Dark Gray
    '#ffffff', // White
  ];

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
      {/* Alignment Panel (Visible when elements are selected) */}
      {store.getSelectedIds().size >= 2 && (
        <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-slate-600 dark:text-zinc-300">
          <button 
            onClick={() => store.alignSelected('left')} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => store.alignSelected('center')} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => store.alignSelected('right')} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800" />
          <span className="text-xs font-medium px-1">Align</span>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-200/50 dark:border-zinc-800/50">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5">
          {tools.map((t) => (
            <button
              key={t.type}
              onClick={() => store.setTool(t.type)}
              className={`p-2 rounded-xl transition-all duration-200 ${
                currentTool === t.type
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Color Palette */}
        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                store.setStrokeColor(c);
                store.setFillColor(c === '#ffffff' ? 'rgba(255, 255, 255, 0.1)' : `${c}1a`);
              }}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border transition-transform ${
                strokeColor === c ? 'scale-110 border-slate-400 dark:border-slate-300' : 'border-transparent'
              }`}
            />
          ))}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Actions (Undo/Redo/Delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => store.undo()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => store.redo()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => store.deleteSelected()}
            disabled={store.getSelectedIds().size === 0}
            className={`p-2 rounded-xl transition-colors ${
              store.getSelectedIds().size > 0
                ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500'
                : 'text-slate-300 dark:text-zinc-700 cursor-not-allowed'
            }`}
            title="Delete Selected"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Templates and Plugins Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTemplates(true)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            title="Insert Template"
          >
            <LayoutTemplate className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPlugins(true)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
            title="Run Plugin Script"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Dark Mode Toggle */}
        <button
          onClick={() => store.setDarkMode(!darkMode)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      {showPlugins && <PluginsModal onClose={() => setShowPlugins(false)} />}
    </div>
  );
};
