import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  Zap, 
  ArrowRight, 
  Users, 
  CheckCircle,
  LayoutTemplate
} from 'lucide-react';

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
      <main className="w-full max-w-7xl mx-auto px-6 pt-20 pb-28 flex flex-col items-center gap-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-indigo-400 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Next-Generation Infinite Spatial Canvas</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-center max-w-4xl bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          The collaborative workspace{' '}
          <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent mt-2">
            engineered to last.
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-slate-400 text-center max-w-2xl leading-relaxed">
          An offline-first, real-time spatial canvas utilizing state-of-the-art Conflict-free Replicated Data Types (CRDTs). Brainstorm, design systems, and manage workflows with millisecond latency.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link 
            to="/register" 
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            to="/login" 
            className="px-8 py-4 rounded-2xl bg-slate-900/60 hover:bg-slate-850 text-slate-200 font-bold text-sm border border-slate-800 hover:border-slate-700 backdrop-blur-md hover:-translate-y-0.5 transition-all"
          >
            Log In to Workspace
          </Link>
        </div>

        {/* Spatial Preview Canvas mockup */}
        <div className="w-full max-w-5xl mt-16 p-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-slate-800/[0.05] bg-[size:3rem_3rem] pointer-events-none" />
          
          <div className="w-full h-80 rounded-2xl bg-slate-950/80 border border-slate-900 overflow-hidden relative flex items-center justify-center">
            {/* Dots Grid Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Visual Board Mockup Elements */}
            <div className="absolute top-12 left-16 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md shadow-lg flex flex-col gap-2">
              <div className="text-xs font-bold text-indigo-300">CRDT Sync State</div>
              <div className="text-[10px] text-slate-400 font-mono">vector_clock: [192, 45, 87]</div>
            </div>

            <div className="absolute top-28 right-24 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-md shadow-lg max-w-xs">
              <div className="text-xs font-bold text-purple-300 mb-1">Architecture Mindmap</div>
              <div className="text-[10px] text-slate-400">Offline changes broadcast automatically via binary sync streams.</div>
            </div>

            <div className="absolute bottom-16 left-1/3 p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 backdrop-blur-md shadow-lg flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
              <span className="text-xs font-semibold text-pink-300">Live Workspace Syncing</span>
            </div>

            {/* Simulated Live Cursors */}
            <div className="absolute top-20 left-1/2 flex items-center gap-1.5 pointer-events-none transition-transform duration-500 hover:translate-x-4">
              <svg className="w-4 h-4 text-emerald-400 fill-emerald-400 filter drop-shadow" viewBox="0 0 24 24">
                <path d="M4.5 2v20l5.8-5.8 5.7 5.8 3-3-5.8-5.7L19 12.8z" />
              </svg>
              <div className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-semibold shadow">
                Emily
              </div>
            </div>

            <div className="absolute bottom-24 right-1/3 flex items-center gap-1.5 pointer-events-none transition-transform duration-500 hover:-translate-x-2">
              <svg className="w-4 h-4 text-amber-400 fill-amber-400 filter drop-shadow" viewBox="0 0 24 24">
                <path d="M4.5 2v20l5.8-5.8 5.7 5.8 3-3-5.8-5.7L19 12.8z" />
              </svg>
              <div className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-semibold shadow">
                Marcus (Offline)
              </div>
            </div>

            <div className="text-center z-10 flex flex-col items-center gap-2">
              <Layers className="w-12 h-12 text-slate-600 animate-bounce" />
              <span className="text-xs text-slate-500 font-medium">Infinite Canvas Workspace</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-900 backdrop-blur-md text-left flex flex-col gap-4 hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Offline-First Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Never lose your progress. Edits are instantly stored locally using IndexedDB and seamlessly synchronized the moment connection is restored.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-900 backdrop-blur-md text-left flex flex-col gap-4 hover:border-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/10 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Real-Time Collaboration</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Work together simultaneously with presence indication, live cursor tracking, organization workspace structure, and team invite sharing.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-900 backdrop-blur-md text-left flex flex-col gap-4 hover:border-pink-500/20 hover:shadow-2xl hover:shadow-pink-500/5 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/10 shadow-inner">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Templates Marketplace</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Install pre-built structures like Mind Maps, Kanban Boards, and SWOT analysis. Rate and review templates dynamically with the community.
            </p>
          </div>
        </div>

        {/* In-depth details section */}
        <div className="mt-28 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-left">
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Engineered with Conflict-free Replicated Data Types (CRDTs)
            </h2>
            <p className="text-slate-455 leading-relaxed text-sm">
              Unlike traditional collaboration boards that overwrite whole canvas elements via websocket broadcasts, CollabBoard X synchronizes using a Yjs CRDT model. This guarantees that concurrent edits automatically merge correctly without data loss or conflicts.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Zero server state replacement issues</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Secure WebSocket (WSS) streaming in production</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Automatic local caching using IndexedDB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900/80 flex flex-col gap-2">
              <span className="text-3xl font-extrabold text-indigo-400">99.9%</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sync Reliability</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900/80 flex flex-col gap-2">
              <span className="text-3xl font-extrabold text-purple-400">&lt; 50ms</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WebSocket Latency</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900/80 flex flex-col gap-2">
              <span className="text-3xl font-extrabold text-pink-400">Unlimited</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace Scale</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-900/80 flex flex-col gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">100%</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offline Functional</span>
            </div>
          </div>
        </div>

        {/* Pricing Sneak Peek */}
        <div className="mt-28 w-full text-center flex flex-col items-center gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Flexible Plans for Every Workspace
            </h2>
            <p className="text-slate-400 max-w-xl text-sm">
              Scale from personal projects to enterprise-wide coordination seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-900/80 flex flex-col justify-between text-left group hover:border-slate-800 transition-all duration-300">
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Free Starter</span>
                <span className="text-3xl font-bold text-white">$0 <span className="text-sm font-normal text-slate-500">/ forever</span></span>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">Perfect for individuals organizing thoughts and drawing mind maps.</p>
                <div className="w-full h-[1px] bg-slate-900 my-4" />
                <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Up to 3 boards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Offline editing & storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Basic templates access</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl bg-indigo-950/10 border border-indigo-500/20 flex flex-col justify-between text-left relative group hover:border-indigo-500/40 transition-all duration-300 shadow-xl shadow-indigo-500/[0.02]">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-[10px] font-extrabold text-white rounded-full uppercase tracking-wider">
                Popular
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Professional</span>
                <span className="text-3xl font-bold text-white">$9 <span className="text-sm font-normal text-slate-500">/ month</span></span>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">Enhanced limits and collaboration access for startup builders.</p>
                <div className="w-full h-[1px] bg-slate-900 my-4" />
                <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Unlimited boards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Full templates installation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Collaborator invite codes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Business Plan */}
            <div className="p-8 rounded-3xl bg-slate-950/40 border border-slate-900/80 flex flex-col justify-between text-left group hover:border-slate-800 transition-all duration-300">
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">Enterprise</span>
                <span className="text-3xl font-bold text-white">$49 <span className="text-sm font-normal text-slate-500">/ month</span></span>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">Complete audit logs, role settings, and custom version controls.</p>
                <div className="w-full h-[1px] bg-slate-900 my-4" />
                <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Priority secure endpoints</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Audit trails & access control</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>Instant team workspace admin</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 text-center text-xs text-slate-500 border-t border-slate-900/60 max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <span>&copy; {new Date().getFullYear()} CollabBoard X. Designed for high performance engineering teams.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Security Details</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

