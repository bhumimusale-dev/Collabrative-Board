import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout, Download, Star, ArrowLeft, RefreshCw, MessageSquare, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import type { Template, Workspace } from '../services/api';
import { API_BASE } from '../config';

export const Marketplace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const templateIdParam = searchParams.get('template_id') || '';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Workspace lists for install dropdown
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  // Rating review inputs
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    loadTemplates();
    loadWorkspaces();
  }, [searchParams]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${api.getToken()}` }
      });
      if (res.ok) {
        const list = await res.json();
        setTemplates(list || []);

        if (templateIdParam) {
          const matched = list.find((t: Template) => t.id === templateIdParam);
          if (matched) setSelectedTemplate(matched);
        } else {
          setSelectedTemplate(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const list = await api.getWorkspaces();
      setWorkspaces(list);
      if (list.length > 0) setTargetWorkspaceId(list[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInstall = async () => {
    if (!selectedTemplate || !targetWorkspaceId) return;
    setInstalling(true);
    try {
      const res = await fetch(`${API_BASE}/templates/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          workspace_id: targetWorkspaceId
        })
      });
      if (res.ok) {
        const board = await res.json();
        // Redirect directly to the newly cloned board
        navigate(`/board/${board.id}`);
      } else {
        alert('Failed to install template');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInstalling(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      const res = await fetch(`${API_BASE}/templates/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          rating: reviewRating,
          review_text: reviewText
        })
      });
      if (res.ok) {
        setReviewText('');
        alert('Review submitted successfully!');
        loadTemplates(); // reload template avg rating
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      {/* Detail overlay view */}
      {selectedTemplate ? (
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex items-center gap-4">
            <button 
              onClick={() => setSearchParams({})}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-400">Back to Community</span>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left side details */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Layout className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">{selectedTemplate.name}</h1>
                  <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                    {selectedTemplate.category}
                  </span>
                </div>
              </div>

              <p className="text-slate-350 text-base leading-relaxed">
                {selectedTemplate.description || 'No description provided.'}
              </p>

              {/* Simulated Preview Box */}
              <div className="h-64 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-600/5" />
                <span className="text-slate-600 font-semibold text-sm">Spatial Canvas Preview Frame</span>
              </div>

              {/* Review submit form */}
              <form onSubmit={handleReviewSubmit} className="p-6 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  Leave a Review
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-400">Rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-lg p-0.5 ${reviewRating >= star ? 'text-amber-400' : 'text-slate-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  placeholder="Share your thoughts on this diagram template..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </div>

            {/* Right side install sidebar */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-850 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-sm">{selectedTemplate.rating.toFixed(1)} / 5</span>
                </div>
                <div className="text-xs text-slate-400">
                  {selectedTemplate.download_count} installs
                </div>
              </div>

              <div className="w-[1px] h-full bg-slate-800" />

              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Workspace
                </label>
                <select
                  value={targetWorkspaceId}
                  onChange={(e) => setTargetWorkspaceId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-250 text-sm focus:outline-none"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{installing ? 'Cloning...' : 'Use Template'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Grid catalog view
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Community Templates</h1>
                <p className="text-sm text-slate-400">Discover and duplicate premium layout templates</p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading community templates...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSearchParams({ template_id: t.id })}
                  className="p-5 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between h-48 cursor-pointer group shadow-md"
                >
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      {t.category}
                    </span>
                    <h3 className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors mt-2 text-base truncate">
                      {t.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {t.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-xs">{t.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>{t.download_count} installs</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Marketplace;
