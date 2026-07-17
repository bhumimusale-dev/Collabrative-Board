import React from 'react';
import { useBoard } from '../hooks/useBoard';
import type { BoardElement } from '../crdt/boardStore';
import { 
  Lock, 
  Unlock, 
  ArrowUp, 
  ArrowDown, 
  ChevronUp, 
  ChevronDown, 
  FlipHorizontal, 
  FlipVertical, 
  RotateCw, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough
} from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const store = useBoard();
  const selectedIds = store.getSelectedIds();
  const elements = store.getElements();

  if (selectedIds.size === 0) return null;

  const selectedElements = elements.filter(el => selectedIds.has(el.id));
  const firstEl = selectedElements[0];

  const updateSelectedStyle = (updates: Partial<BoardElement>) => {
    store.doc.transact(() => {
      selectedIds.forEach((id) => {
        store.updateElement(id, updates);
      });
    });
  };

  const handleAlign = (dir: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    store.alignSelected(dir);
  };

  const handleDistribute = (dir: 'horizontal' | 'vertical') => {
    store.distributeSelected(dir);
  };

  const colors = [
    { name: 'Transparent', value: 'transparent' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Dark', value: '#0f172a' },
    { name: 'Light', value: '#f8fafc' },
  ];

  return (
    <div className="absolute top-20 right-6 w-72 max-h-[80vh] overflow-y-auto flat-card p-5 rounded-3xl border border-[#E2E5E9] dark:border-[#2A2F35] text-[#1A1D21] dark:text-zinc-200 z-40 space-y-6 shadow-2xl animate-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5F6B7A] dark:text-zinc-500">
          Properties ({selectedIds.size} selected)
        </h3>
      </div>

      {/* Alignment / Distribution */}
      {selectedIds.size >= 2 && (
        <div className="space-y-2.5">
          <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500">Alignment</label>
          <div className="grid grid-cols-6 gap-1">
            <button onClick={() => handleAlign('left')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Left"><AlignLeft className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleAlign('center')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Center"><AlignCenter className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleAlign('right')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Right"><AlignRight className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleAlign('top')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Top" style={{ transform: 'rotate(90deg)' }}><AlignLeft className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleAlign('middle')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Middle" style={{ transform: 'rotate(90deg)' }}><AlignCenter className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleAlign('bottom')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Align Bottom" style={{ transform: 'rotate(90deg)' }}><AlignRight className="w-4 h-4 mx-auto" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => handleDistribute('horizontal')} className="py-1.5 px-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold rounded-xl transition-all">Distribute H</button>
            <button onClick={() => handleDistribute('vertical')} className="py-1.5 px-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold rounded-xl transition-all">Distribute V</button>
          </div>
        </div>
      )}

      {/* Geometry / Transform */}
      <div className="space-y-3">
        <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500">Transform</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => store.rotateSelected(90)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all flex flex-col items-center gap-1 font-semibold text-[10px]" title="Rotate 90 deg"><RotateCw className="w-4 h-4" /><span>+90°</span></button>
          <button onClick={() => store.flipSelected('h')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all flex flex-col items-center gap-1 font-semibold text-[10px]" title="Flip Horizontal"><FlipHorizontal className="w-4 h-4" /><span>Flip H</span></button>
          <button onClick={() => store.flipSelected('v')} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all flex flex-col items-center gap-1 font-semibold text-[10px]" title="Flip Vertical"><FlipVertical className="w-4 h-4" /><span>Flip V</span></button>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          <button onClick={() => store.bringToFront()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Bring to Front"><ChevronUp className="w-4 h-4 mx-auto" /></button>
          <button onClick={() => store.bringForward()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Bring Forward"><ArrowUp className="w-4 h-4 mx-auto" /></button>
          <button onClick={() => store.sendBackward()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Send Backward"><ArrowDown className="w-4 h-4 mx-auto" /></button>
          <button onClick={() => store.sendToBack()} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition-all" title="Send to Back"><ChevronDown className="w-4 h-4 mx-auto" /></button>
        </div>
      </div>

      {/* Lock / Unlock */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500">Locking</label>
        <div className="flex gap-2">
          <button 
            onClick={() => store.lockSelected()} 
            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
          <button 
            onClick={() => store.unlockSelected()} 
            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock</span>
          </button>
        </div>
      </div>

      {/* Fill Color */}
      <div className="space-y-2.5">
        <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500">Fill Color</label>
        <div className="flex flex-wrap gap-1.5">
          {colors.map(col => (
            <button 
              key={col.value}
              onClick={() => updateSelectedStyle({ fill: col.value === 'transparent' ? 'transparent' : `${col.value}26` })}
              style={{ backgroundColor: col.value === 'transparent' ? 'transparent' : col.value }}
              className={`w-6 h-6 rounded-full border transition-all ${
                firstEl?.fill?.startsWith(col.value) ? 'ring-2 ring-teal-500 scale-110 border-white' : 'border-slate-300 dark:border-zinc-700'
              } flex items-center justify-center`}
              title={col.name}
            >
              {col.value === 'transparent' && <span className="text-[10px] text-[#5F6B7A]">×</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Style */}
      <div className="space-y-4">
        <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500 block">Border / Stroke</label>
        {/* Stroke Color */}
        <div className="flex flex-wrap gap-1.5">
          {colors.filter(c => c.value !== 'transparent').map(col => (
            <button 
              key={col.value}
              onClick={() => updateSelectedStyle({ stroke: col.value })}
              style={{ backgroundColor: col.value }}
              className={`w-6 h-6 rounded-full border transition-all ${
                firstEl?.stroke === col.value ? 'ring-2 ring-teal-500 scale-110 border-white' : 'border-slate-300 dark:border-zinc-700'
              }`}
              title={col.name}
            />
          ))}
        </div>
        {/* Stroke Width */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-[#5F6B7A] dark:text-zinc-500 block">Stroke Width ({firstEl?.strokeWidth || 2}px)</span>
          <input 
            type="range" 
            min={1} 
            max={12} 
            value={firstEl?.strokeWidth || 2}
            onChange={(e) => updateSelectedStyle({ strokeWidth: parseInt(e.target.value) })}
            className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
        </div>
        {/* Border Style */}
        <div className="grid grid-cols-3 gap-2">
          {['solid', 'dashed', 'dotted'].map(st => (
            <button 
              key={st}
              onClick={() => updateSelectedStyle({ borderStyle: st as any })}
              className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border ${
                (firstEl?.borderStyle || 'solid') === st ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Typography settings (If type is text or sticky note) */}
      {(firstEl?.type === 'text' || firstEl?.type === 'sticky') && (
        <div className="space-y-4 pt-4 border-t border-[#E2E5E9] dark:border-zinc-850">
          <label className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500 block">Typography</label>
          {/* Font Sizes */}
          <div className="grid grid-cols-4 gap-1.5">
            {[12, 16, 20, 24, 32, 48].slice(0, 4).map(sz => (
              <button 
                key={sz}
                onClick={() => updateSelectedStyle({ fontSize: sz })}
                className={`py-1 rounded-lg text-xs font-semibold transition-all border ${
                  (firstEl?.fontSize || 20) === sz ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>
          {/* Typography formats */}
          <div className="grid grid-cols-4 gap-1.5">
            <button 
              onClick={() => updateSelectedStyle({ fontWeight: firstEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`p-2 rounded-xl transition-all border ${firstEl.fontWeight === 'bold' ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4 mx-auto" />
            </button>
            <button 
              onClick={() => updateSelectedStyle({ fontStyle: firstEl.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`p-2 rounded-xl transition-all border ${firstEl.fontStyle === 'italic' ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4 mx-auto" />
            </button>
            <button 
              onClick={() => updateSelectedStyle({ textDecoration: firstEl.textDecoration === 'underline' ? 'none' : 'underline' })}
              className={`p-2 rounded-xl transition-all border ${firstEl.textDecoration === 'underline' ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850'}`}
              title="Underline"
            >
              <Underline className="w-4 h-4 mx-auto" />
            </button>
            <button 
              onClick={() => updateSelectedStyle({ textDecoration: firstEl.textDecoration === 'line-through' ? 'none' : 'line-through' })}
              className={`p-2 rounded-xl transition-all border ${firstEl.textDecoration === 'line-through' ? 'bg-teal-600 border-teal-600 text-[#1A1D21]' : 'bg-transparent border-slate-200 dark:border-zinc-850'}`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Opacity & Shadow */}
      <div className="space-y-4 pt-4 border-t border-[#E2E5E9] dark:border-zinc-850">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500 block">Opacity ({Math.round((firstEl?.opacity ?? 1) * 100)}%)</span>
          <input 
            type="range" 
            min={0} 
            max={100} 
            value={Math.round((firstEl?.opacity ?? 1) * 100)}
            onChange={(e) => updateSelectedStyle({ opacity: parseInt(e.target.value) / 100 })}
            className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#5F6B7A] dark:text-zinc-500 block">Corner Radius ({firstEl?.cornerRadius ?? 4}px)</span>
          <input 
            type="range" 
            min={0} 
            max={50} 
            value={firstEl?.cornerRadius ?? 4}
            onChange={(e) => updateSelectedStyle({ cornerRadius: parseInt(e.target.value) })}
            className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
        </div>
      </div>
    </div>
  );
};
