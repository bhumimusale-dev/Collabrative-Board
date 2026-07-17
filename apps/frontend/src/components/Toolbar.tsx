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
  Sparkles,
  Triangle,
  Diamond,
  Star,
  Cloud,
  Hexagon,
  ArrowUpRight,
  Minus,
  Highlighter,
  Eraser
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

  // Submenu states
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showLinesDropdown, setShowLinesDropdown] = useState(false);
  const [showDrawDropdown, setShowDrawDropdown] = useState(false);

  const primaryTools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'select', icon: <MousePointer className="w-5 h-5" />, label: 'Select' },
    { type: 'text', icon: <Type className="w-5 h-5" />, label: 'Text' },
    { type: 'sticky', icon: <StickyNote className="w-5 h-5" />, label: 'Sticky Note' },
    { type: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
    { type: 'circle', icon: <CircleIcon className="w-5 h-5" />, label: 'Circle' },
  ];

  const extraShapes: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'triangle', icon: <Triangle className="w-4 h-4" />, label: 'Triangle' },
    { type: 'diamond', icon: <Diamond className="w-4 h-4" />, label: 'Diamond' },
    { type: 'star', icon: <Star className="w-4 h-4" />, label: 'Star' },
    { type: 'cloud', icon: <Cloud className="w-4 h-4" />, label: 'Cloud' },
    { type: 'hexagon', icon: <Hexagon className="w-4 h-4" />, label: 'Hexagon' },
    { type: 'roundedRectangle', icon: <Square className="w-4 h-4 rounded" />, label: 'Rounded Rect' },
  ];

  const lineTools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line' },
    { type: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, label: 'Arrow' },
  ];

  const drawTools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'freehand', icon: <Brush className="w-4 h-4" />, label: 'Pen' },
    { type: 'highlighter', icon: <Highlighter className="w-4 h-4" />, label: 'Highlighter' },
    { type: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser' },
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
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto z-40">
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
      <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-200/50 dark:border-zinc-800/50 relative">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5">
          {primaryTools.map((t) => (
            <button
              key={t.type}
              onClick={() => {
                store.setTool(t.type);
                setShowShapesDropdown(false);
                setShowLinesDropdown(false);
                setShowDrawDropdown(false);
              }}
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

          {/* Shapes Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowShapesDropdown(!showShapesDropdown);
                setShowLinesDropdown(false);
                setShowDrawDropdown(false);
              }}
              className={`p-2 rounded-xl transition-all duration-200 ${
                extraShapes.some(x => x.type === currentTool)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
              title="More Shapes"
            >
              <Triangle className="w-5 h-5" />
            </button>
            {showShapesDropdown && (
              <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 glass-panel p-2 rounded-xl grid grid-cols-3 gap-1 border border-slate-200/50 dark:border-zinc-800/50 z-50 min-w-[140px]">
                {extraShapes.map(sh => (
                  <button
                    key={sh.type}
                    onClick={() => {
                      store.setTool(sh.type);
                      setShowShapesDropdown(false);
                    }}
                    className={`p-2 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center ${currentTool === sh.type ? 'bg-indigo-600/10 text-indigo-500 font-semibold' : ''}`}
                    title={sh.label}
                  >
                    {sh.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines / Arrows Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLinesDropdown(!showLinesDropdown);
                setShowShapesDropdown(false);
                setShowDrawDropdown(false);
              }}
              className={`p-2 rounded-xl transition-all duration-200 ${
                lineTools.some(x => x.type === currentTool)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
              title="Lines & Connectors"
            >
              <Minus className="w-5 h-5" />
            </button>
            {showLinesDropdown && (
              <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 glass-panel p-2 rounded-xl flex flex-col gap-1 border border-slate-200/50 dark:border-zinc-800/50 z-50 min-w-[100px]">
                {lineTools.map(lt => (
                  <button
                    key={lt.type}
                    onClick={() => {
                      store.setTool(lt.type);
                      setShowLinesDropdown(false);
                    }}
                    className={`p-2 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 ${currentTool === lt.type ? 'bg-indigo-600/10 text-indigo-500 font-semibold' : ''}`}
                    title={lt.label}
                  >
                    {lt.icon}
                    <span className="text-[10px]">{lt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Drawing Pens Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDrawDropdown(!showDrawDropdown);
                setShowShapesDropdown(false);
                setShowLinesDropdown(false);
              }}
              className={`p-2 rounded-xl transition-all duration-200 ${
                drawTools.some(x => x.type === currentTool)
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
              title="Draw Tools"
            >
              <Brush className="w-5 h-5" />
            </button>
            {showDrawDropdown && (
              <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 glass-panel p-2 rounded-xl flex flex-col gap-1 border border-slate-200/50 dark:border-zinc-800/50 z-50 min-w-[110px]">
                {drawTools.map(dt => (
                  <button
                    key={dt.type}
                    onClick={() => {
                      store.setTool(dt.type);
                      setShowDrawDropdown(false);
                    }}
                    className={`p-2 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 ${currentTool === dt.type ? 'bg-indigo-600/10 text-indigo-500 font-semibold' : ''}`}
                    title={dt.label}
                  >
                    {dt.icon}
                    <span className="text-[10px]">{dt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
