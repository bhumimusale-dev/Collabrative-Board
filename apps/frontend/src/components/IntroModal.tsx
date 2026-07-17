import React, { useState } from 'react';

interface IntroModalProps {
  onJoin: (room: string, username: string) => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('design-room-1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !room.trim()) return;
    onJoin(room.trim(), username.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFB] dark:bg-[#0D0F12]/95">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/10 mb-4">
            <span className="text-2xl font-bold text-[#1A1D21]">CB</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1D21] dark:text-zinc-100">Welcome to CollabBoard</h2>
          <p className="text-sm text-[#9AA4AB] dark:text-zinc-400 mt-1.5 text-center">
            A production-ready collaborative whiteboard powered by CRDTs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5F6B7A] dark:text-zinc-500 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-[#1A1D21] dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5F6B7A] dark:text-zinc-500 mb-1">
              Board / Room ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. design-room-1"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-[#1A1D21] dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-[#1A1D21] font-semibold text-sm shadow-md shadow-teal-500/10 hover:shadow-teal-500/10 active:scale-98 transition-all"
          >
            Start Collaborating
          </button>
        </form>
      </div>
    </div>
  );
};
