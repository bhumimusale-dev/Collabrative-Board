import React, { useEffect, useState } from 'react';
import { Layout, X, RefreshCw, Star } from 'lucide-react';
import { api } from '../services/api';
import type { Template } from '../services/api';
import { useBoard } from '../hooks/useBoard';
import type { BoardElement } from '../crdt/boardStore';

interface TemplatesModalProps {
  onClose: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ onClose }) => {
  const store = useBoard();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/templates`, {
        headers: { 'Authorization': `Bearer ${api.getToken()}` }
      });
      if (res.ok) {
        const list = await res.json();
        setTemplates(list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertTemplate = async (t: Template) => {
    // Standard shapes insert fallback if template data is empty
    if (t.name.toLowerCase().includes('scrum') || t.name.toLowerCase().includes('kanban')) {
      // Generate some default board shapes (like a kanban template!)
      const parentId = `group-${Date.now()}`;
      const shapes: BoardElement[] = [
        {
          id: `${parentId}-todo`,
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 250,
          height: 400,
          fill: 'rgba(59, 130, 246, 0.05)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          zIndex: 1,
        },
        {
          id: `${parentId}-todo-title`,
          type: 'text',
          x: 120,
          y: 120,
          width: 100,
          height: 30,
          text: 'To Do',
          fill: '#3b82f6',
          stroke: '#3b82f6',
          strokeWidth: 1,
          zIndex: 1,
        },
        {
          id: `${parentId}-done`,
          type: 'rectangle',
          x: 400,
          y: 100,
          width: 250,
          height: 400,
          fill: 'rgba(16, 185, 129, 0.05)',
          stroke: '#10b981',
          strokeWidth: 2,
          zIndex: 1,
        },
        {
          id: `${parentId}-done-title`,
          type: 'text',
          x: 420,
          y: 120,
          width: 100,
          height: 30,
          text: 'Done',
          fill: '#10b981',
          stroke: '#10b981',
          strokeWidth: 1,
          zIndex: 1,
        }
      ];

      shapes.forEach(shape => store.addElement(shape));
    } else {
      // General diagram template fallback
      const parentId = `template-${Date.now()}`;
      const shapes: BoardElement[] = [
        {
          id: `${parentId}-rect`,
          type: 'rectangle',
          x: 200,
          y: 150,
          width: 200,
          height: 120,
          fill: 'rgba(139, 92, 246, 0.08)',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          zIndex: 1,
        },
        {
          id: `${parentId}-text`,
          type: 'text',
          x: 230,
          y: 200,
          width: 120,
          height: 30,
          text: t.name,
          fill: '#8b5cf6',
          stroke: '#8b5cf6',
          strokeWidth: 1,
          zIndex: 1,
        }
      ];
      shapes.forEach(shape => store.addElement(shape));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Insert Canvas Template</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-10 justify-center">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading diagram templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No templates found. Go to the marketplace to publish templates first!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => handleInsertTemplate(t)}
                className="p-4 rounded-xl bg-slate-850 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30 cursor-pointer transition-all flex flex-col justify-between h-36"
              >
                <div>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.category}
                  </span>
                  <h4 className="font-bold text-slate-100 mt-2 truncate text-sm">{t.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-normal">
                    {t.description || 'Click to load templates shapes.'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/40">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{t.rating.toFixed(1)}</span>
                  </div>
                  <span>{t.download_count} installs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default TemplatesModal;
