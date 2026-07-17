import React from 'react';
import { 
  Download, 
  Upload, 
  Image as ImageIcon,
  Sparkles,
  Wifi,
  WifiOff,
  History
} from 'lucide-react';
import { useBoard } from '../hooks/useBoard';
import type { BoardElement } from '../crdt/boardStore';
import { VersionHistoryModal } from './VersionHistoryModal';

export const TopBar: React.FC = () => {
  const store = useBoard();
  const roomName = store.getActiveRoom();
  const connectionState = store.getConnectionState();
  const users = store.getActiveUsers();
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(store.getElements(), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${roomName}-board.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as BoardElement[];
          if (Array.isArray(parsed)) {
            parsed.forEach((el) => {
              store.addElement(el);
            });
          }
        } catch (err) {
          alert("Invalid Board JSON file");
        }
      };
    }
  };

  const handleExportPNG = () => {
    const stage = document.querySelector('.konvajs-content') as any;
    if (stage && stage.querySelector('canvas')) {
      const canvas = stage.querySelector('canvas');
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `${roomName}-board.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleAISuggestion = () => {
    // Premium Simulated AI features
    const prompts = [
      "Brainstorming: 3 ideas for a new collaborative feature",
      "Retrospective: Keep, Start, Stop items",
      "Architecture design: Draw a load balancer node layout"
    ];
    const chosenPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    const id = `element-ai-${Date.now()}`;
    store.addElement({
      id,
      type: 'sticky',
      x: 100 - store.getPan().x / store.getZoom(),
      y: 150 - store.getPan().y / store.getZoom(),
      width: 200,
      height: 180,
      fill: '#a7f3d0', // Light green AI color
      stroke: '#059669',
      strokeWidth: 1,
      text: `🤖 AI Assistant\nPrompt: ${chosenPrompt}\n\n1. Real-time CRDT updates\n2. Local persistence layer\n3. Responsive culling engine`
    });
  };

  return (
    <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-auto select-none">
      {/* Room Name & Sync Status */}
      <div className="flat-card px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-[#E2E5E9] dark:border-[#2A2F35]">
        <span className="text-sm font-semibold tracking-wide bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
          CollabBoard
        </span>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800" />
        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
          {roomName}
        </span>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 ml-2">
          {connectionState === 'connected' ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              <Wifi className="w-3.5 h-3.5" />
              Synced
            </span>
          ) : connectionState === 'connecting' ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full animate-pulse">
              Connecting...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Avatars & Control Panel */}
      <div className="flex items-center gap-4">
        {/* Active Collaborators */}
        {users.length > 0 && (
          <div className="flat-card px-3 py-1.5 rounded-2xl flex items-center -space-x-2 border border-[#E2E5E9] dark:border-[#2A2F35]">
            {users.map((user) => (
              <img
                key={user.id}
                src={user.avatar}
                alt={user.name}
                title={`${user.name} (Online)`}
                style={{ borderColor: user.color }}
                className="w-8 h-8 rounded-full border-2 bg-slate-100 object-cover"
              />
            ))}
          </div>
        )}

        {/* Board Operations */}
        <div className="flat-card px-3 py-2 rounded-2xl flex items-center gap-1.5 border border-[#E2E5E9] dark:border-[#2A2F35]">
          <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-[#5F6B7A] dark:text-zinc-300 transition-colors cursor-pointer" title="Import JSON">
            <Upload className="w-4 h-4" />
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>
          <button 
            onClick={handleExportJSON} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-[#5F6B7A] dark:text-zinc-300 transition-colors" 
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExportPNG} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-[#5F6B7A] dark:text-zinc-300 transition-colors" 
            title="Download PNG image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800" />
          
          <button 
            onClick={handleAISuggestion} 
            className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded-xl text-teal-500 dark:text-teal-400 transition-colors flex items-center gap-1 text-xs font-semibold" 
            title="Simulate AI Sticky Note"
          >
            <Sparkles className="w-4 h-4" />
            AI Note
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800" />

          <button 
            onClick={() => setIsHistoryOpen(true)} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-[#5F6B7A] dark:text-zinc-300 transition-colors flex items-center gap-1 text-xs font-semibold" 
            title="Open Version History"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      <VersionHistoryModal 
        boardId={roomName}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};
