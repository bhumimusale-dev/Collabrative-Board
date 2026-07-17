import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, Folder, Layout, Star, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { Board, Template } from '../services/api';
import { API_BASE } from '../config';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [boards, setBoards] = useState<Board[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'boards' | 'templates'>('all');

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'Authorization': `Bearer ${api.getToken()}`,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchParams({ q: searchQuery.trim() });
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFB] text-[#1A1D21] p-8 font-sans">
      <header className="max-w-6xl mx-auto flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-[#E2E5E9] rounded-xl text-[#5F6B7A] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Global Search</h1>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {/* Search input bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search boards, templates, shapes, comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-[#E2E5E9] bg-white text-[#1A1D21] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base shadow-xl"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9AA4AB]" />
        </form>

        {/* Tab filters */}
        <div className="flex items-center gap-2 border-b border-[#E2E5E9] pb-px text-sm">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              tab === 'all' ? 'border-teal-500 text-[#1A1D21]' : 'border-transparent text-[#5F6B7A] hover:text-slate-250'
            }`}
          >
            All Results ({boards.length + templates.length})
          </button>
          <button
            onClick={() => setTab('boards')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              tab === 'boards' ? 'border-teal-500 text-[#1A1D21]' : 'border-transparent text-[#5F6B7A] hover:text-slate-250'
            }`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => setTab('templates')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              tab === 'templates' ? 'border-teal-500 text-[#1A1D21]' : 'border-transparent text-[#5F6B7A] hover:text-slate-250'
            }`}
          >
            Community Templates ({templates.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#5F6B7A]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Searching files and elements...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Boards Section */}
            {(tab === 'all' || tab === 'boards') && boards.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold tracking-widest text-[#9AA4AB]">Boards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boards.map((b) => (
                    <Link
                      key={b.id}
                      to={`/board/${b.id}`}
                      className="p-4 rounded-xl bg-[#F0F2F4] border border-[#E2E5E9] hover:border-[#CDD2D8] transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-sm truncate">{b.name}</h4>
                        <p className="text-xs text-[#5F6B7A] truncate">{b.description || 'No description'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Templates Section */}
            {(tab === 'all' || tab === 'templates') && templates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold tracking-widest text-[#9AA4AB]">Community Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((t) => (
                    <Link
                      key={t.id}
                      to={`/marketplace?template_id=${t.id}`}
                      className="p-4 rounded-xl bg-[#F0F2F4] border border-[#E2E5E9] hover:border-[#CDD2D8] transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                        <Layout className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-sm truncate">{t.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded">
                            {t.category}
                          </span>
                          <span className="text-xs text-[#5F6B7A] flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-current" />
                            {t.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {boards.length === 0 && templates.length === 0 && query && (
              <div className="text-center py-12 text-[#9AA4AB]">
                No matching boards or templates found for "{query}".
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
export default SearchPage;
