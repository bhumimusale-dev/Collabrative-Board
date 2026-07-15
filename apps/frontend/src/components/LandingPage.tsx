import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans relative">
      
      {/* Ambient Radial & Linear Lights */}
      <div className="absolute top-0 left-1/4 w-[35rem] h-[35rem] bg-indigo-600/10 rounded-full blur-[10rem] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[12rem] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[25rem] h-[25rem] bg-pink-500/5 rounded-full blur-[8rem] pointer-events-none" />

      {/* Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-bold text-white">CX</span>
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 to-indigo-200 bg-clip-text text-transparent">
            CollabBoard X
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link 
            to="/register" 
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-indigo-400 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Infinite Spatial Canvas</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          The collaborative workspace{' '}
          <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent mt-2">
            engineered to last.
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Infinite scaling, offline-first execution, and real-time CRDT updates. Built for modern software teams designing complex spatial structures.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Link 
            to="/register" 
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
          >
            Create Free Account
          </Link>
          <Link 
            to="/login" 
            className="px-8 py-4 rounded-2xl bg-slate-900/60 hover:bg-slate-850 text-slate-200 font-bold text-sm border border-slate-800 hover:border-slate-700 backdrop-blur-md hover:-translate-y-0.5 transition-all"
          >
            Log In to Workspace
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-28 w-full">
          <div className="p-6.5 rounded-3xl bg-slate-950/30 border border-slate-850/80 backdrop-blur-md text-left flex flex-col gap-4 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Offline-First Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Edit without connection. Updates are queued locally and synchronized automatically without conflicts when you are reconnected.
            </p>
          </div>

          <div className="p-6.5 rounded-3xl bg-slate-950/30 border border-slate-850/80 backdrop-blur-md text-left flex flex-col gap-4 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/10">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Infinite Workspace</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create personal or team workspaces. Organize multiple whiteboards and switch between organizations instantly.
            </p>
          </div>

          <div className="p-6.5 rounded-3xl bg-slate-950/30 border border-slate-850/80 backdrop-blur-md text-left flex flex-col gap-4 hover:border-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Enterprise Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Access controls, refresh token rotation, audit trails, and role-based permissions to protect your proprietary design systems.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-slate-500 border-t border-slate-900/60 max-w-7xl mx-auto px-6 relative z-10">
        &copy; {new Date().getFullYear()} CollabBoard X. Designed for high performance engineering teams.
      </footer>
    </div>
  );
};

export default LandingPage;
