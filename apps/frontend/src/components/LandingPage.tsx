import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-bold text-white">CX</span>
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-200 to-purple-400 bg-clip-text text-transparent">
            CollabBoard X
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-md shadow-indigo-500/10 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-20 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Infinite Spatial Canvas</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-3xl">
          The collaborative workspace{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
            engineered to last.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl">
          Infinite scaling, offline-first execution, and real-time CRDT updates. Built for modern software teams designing complex spatial structures.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link to="/register" className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-indigo-500/20 transition-transform hover:-translate-y-0.5">
            Create Free Account
          </Link>
          <Link to="/login" className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 transition-transform hover:-translate-y-0.5">
            Log In to Workspace
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-md text-left flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Offline-First Sync</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Edit without connection. Updates are queued locally and synchronized automatically without conflicts when you are reconnected.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-md text-left flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Infinite Workspace</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Create personal or team workspaces. Organize multiple whiteboards and switch between organizations instantly.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 backdrop-blur-md text-left flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Enterprise Security</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Access controls, refresh token rotation, audit trails, and role-based permissions to protect your proprietary design systems.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-slate-500 border-t border-slate-800/55 max-w-7xl mx-auto px-6">
        &copy; {new Date().getFullYear()} CollabBoard X. Designed for high performance engineering teams.
      </footer>
    </div>
  );
};
export default LandingPage;
