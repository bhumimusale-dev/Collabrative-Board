import React from 'react';
import { Sparkles, Grid, X, LayoutTemplate } from 'lucide-react';
import { useBoard } from '../hooks/useBoard';
import type { BoardElement } from '../crdt/boardStore';

interface PluginsModalProps {
  onClose: () => void;
}

export const PluginsModal: React.FC<PluginsModalProps> = ({ onClose }) => {
  const store = useBoard();
  const selectedIds = store.getSelectedIds();

  // Plugin 1: Tidy Alignment Grid
  const runTidyPlugin = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least 2 shapes on the canvas to tidy up!');
      return;
    }
    const elementsList = store.getElements().filter(el => selectedIds.has(el.id));
    
    // Sort elements from left to right
    elementsList.sort((a, b) => a.x - b.x);

    let startX = elementsList[0].x;
    let startY = elementsList[0].y;
    const gap = 40;

    elementsList.forEach((el, index) => {
      store.updateElement(el.id, {
        x: startX + index * ((el.width || 100) + gap),
        y: startY
      });
    });

    onClose();
  };

  // Plugin 2: Auto UML Diagram Generator
  const runUMLGenerator = () => {
    const parentId = `uml-${Date.now()}`;
    const shapes: BoardElement[] = [
      {
        id: `${parentId}-controller`,
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 180,
        height: 100,
        fill: 'rgba(59, 130, 246, 0.05)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        zIndex: 1,
      },
      {
        id: `${parentId}-controller-txt`,
        type: 'text',
        x: 120,
        y: 235,
        width: 140,
        height: 30,
        text: '<<Controller>>\nUserController',
        fill: '#3b82f6',
        stroke: '#3b82f6',
        strokeWidth: 1,
        zIndex: 1,
      },
      {
        id: `${parentId}-model`,
        type: 'rectangle',
        x: 380,
        y: 200,
        width: 180,
        height: 100,
        fill: 'rgba(16, 185, 129, 0.05)',
        stroke: '#10b981',
        strokeWidth: 2,
        zIndex: 1,
      },
      {
        id: `${parentId}-model-txt`,
        type: 'text',
        x: 410,
        y: 235,
        width: 120,
        height: 30,
        text: '<<Model>>\nUserModel',
        fill: '#10b981',
        stroke: '#10b981',
        strokeWidth: 1,
        zIndex: 1,
      }
    ];

    shapes.forEach(shape => store.addElement(shape));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Plugin Store & Scripts</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="space-y-4">
          {/* Tidy plugin */}
          <div 
            onClick={runTidyPlugin}
            className="p-4 rounded-2xl bg-slate-850 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30 cursor-pointer transition-all flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Tidy Horizontal Grid</h4>
              <p className="text-xs text-slate-400 mt-0.5">Aligns selected shapes horizontally with uniform gaps</p>
            </div>
          </div>

          {/* UML Generator plugin */}
          <div 
            onClick={runUMLGenerator}
            className="p-4 rounded-2xl bg-slate-850 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/30 cursor-pointer transition-all flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">MVC UML Generator</h4>
              <p className="text-xs text-slate-400 mt-0.5">Generates model-controller block layouts instantly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PluginsModal;
