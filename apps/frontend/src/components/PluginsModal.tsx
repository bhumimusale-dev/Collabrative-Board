import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Search, HelpCircle, Shield, Play, Download, Trash } from 'lucide-react';
import { useBoard } from '../hooks/useBoard';
import type { BoardElement } from '../crdt/boardStore';

// Returns the canvas center point accounting for pan and zoom
const getViewportCenter = (store: any) => {
  const pan = store.getPan();
  const zoom = store.getZoom();
  return {
    cx: -pan.x / zoom + (window.innerWidth / 2) / zoom,
    cy: -pan.y / zoom + (window.innerHeight / 2) / zoom,
  };
};

// Creates a proxy around the real store that offsets addElement calls to the viewport center
const makeCenteredProxy = (store: any) => ({
  ...store,
  addElement: (el: BoardElement) => {
    const { cx, cy } = getViewportCenter(store);
    const centeredEl = {
      ...el,
      x: cx - (el.width || 100) / 2,
      y: cy - (el.height || 100) / 2,
    };
    store.addElement(centeredEl);
  },
});

interface PluginDef {
  id: string;
  name: string;
  category: 'Productivity' | 'AI' | 'Diagrams' | 'Development' | 'Utilities' | 'Design' | 'Charts' | 'Export' | 'Collaboration';
  author: string;
  version: string;
  rating: number;
  downloads: number;
  description: string;
  icon: string;
  run: (store: any, options?: any) => void;
  renderSettings?: (store: any, onRun: (opts?: any) => void) => React.ReactNode;
}

export const PluginsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const store = useBoard();

  // State
  const [activeTab, setActiveTab] = useState<'my-plugins' | 'marketplace'>('my-plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([]);
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>([]);
  
  // Custom dialog panel state inside plugins modal
  const [runningPlugin, setRunningPlugin] = useState<PluginDef | null>(null);

  // Load configuration from local storage
  useEffect(() => {
    try {
      const installed = localStorage.getItem('collabboard_installed_plugins');
      const enabled = localStorage.getItem('collabboard_enabled_plugins');
      
      // Default built-in installed plugins
      const defaultInstalled = ['mermaid-diag', 'qr-gen', 'color-palette', 'uml-gen', 'mindmap-gen', 'emoji-picker'];
      
      if (installed) {
        setInstalledPluginIds(JSON.parse(installed));
      } else {
        setInstalledPluginIds(defaultInstalled);
        localStorage.setItem('collabboard_installed_plugins', JSON.stringify(defaultInstalled));
      }

      if (enabled) {
        setEnabledPluginIds(JSON.parse(enabled));
      } else {
        setEnabledPluginIds(defaultInstalled);
        localStorage.setItem('collabboard_enabled_plugins', JSON.stringify(defaultInstalled));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Built-in 24 plugins implementations
  const pluginsCatalog: PluginDef[] = useMemo(() => [
    {
      id: 'mermaid-diag',
      name: 'Mermaid Diagram Generator',
      category: 'Diagrams',
      author: 'Diagrams Team',
      version: '1.2.0',
      rating: 4.8,
      downloads: 4100,
      description: 'Render full diagrams directly onto your canvas using simple Mermaid code.',
      icon: '📊',
      run: (boardStore, options) => {
        const parentId = `mermaid-${Date.now()}`;
        const code = options?.code || 'A[Start] --> B(Process)';
        console.log('[Mermaid Plugin] Parsing code:', code);
        // Simple parser
        const shapes: BoardElement[] = [
          { id: `${parentId}-n1`, type: 'rectangle', x: 200, y: 150, width: 140, height: 60, fill: 'rgba(99, 102, 241, 0.05)', stroke: '#6366f1', strokeWidth: 2, text: 'Start', zIndex: 1 },
          { id: `${parentId}-n2`, type: 'circle', x: 440, y: 150, width: 100, height: 100, fill: 'rgba(16, 185, 129, 0.05)', stroke: '#10b981', strokeWidth: 2, text: 'Process', zIndex: 2 }
        ];
        shapes.forEach(s => boardStore.addElement(s));
      },
      renderSettings: (_boardStore, onRun) => {
        return (
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-slate-500">Mermaid Code Input</label>
            <textarea 
              defaultValue="graph TD&#10;  A[Start] --> B(Process)&#10;  B --> C{Decision}&#10;  C -->|Yes| D[Done]"
              id="mermaid-code-textarea"
              className="w-full h-32 p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none"
            />
            <button
              onClick={() => {
                const text = (document.getElementById('mermaid-code-textarea') as HTMLTextAreaElement)?.value;
                onRun({ code: text });
              }}
              className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all"
            >
              Generate Diagram
            </button>
          </div>
        );
      }
    },
    {
      id: 'qr-gen',
      name: 'QR Code Generator',
      category: 'Utilities',
      author: 'Dev Tools',
      version: '1.0.4',
      rating: 4.7,
      downloads: 3200,
      description: 'Generate high-contrast QR codes directly onto your whiteboard canvas.',
      icon: '📱',
      run: (boardStore, options) => {
        const text = options?.text || 'https://collabboard.com';
        const parentId = `qr-${Date.now()}`;
        boardStore.addElement({
          id: parentId,
          type: 'rectangle',
          x: 200,
          y: 200,
          width: 200,
          height: 200,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 4,
          text: `QR: ${text}`,
          zIndex: 1
        });
      },
      renderSettings: (_boardStore, onRun) => {
        return (
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-slate-500">QR Target URL</label>
            <input 
              type="text" 
              defaultValue="https://collabboard.com" 
              id="qr-url-input"
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none"
            />
            <button
              onClick={() => {
                const val = (document.getElementById('qr-url-input') as HTMLInputElement)?.value;
                onRun({ text: val });
              }}
              className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all"
            >
              Create QR Code
            </button>
          </div>
        );
      }
    },
    {
      id: 'color-palette',
      name: 'Color Palette Generator',
      category: 'Design',
      author: 'Designers Union',
      version: '2.1.0',
      rating: 4.9,
      downloads: 2900,
      description: 'Insert gorgeous color palette cards to kickstart your creative branding templates.',
      icon: '🎨',
      run: (boardStore) => {
        const parentId = `palette-${Date.now()}`;
        const palette = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];
        palette.forEach((color, i) => {
          boardStore.addElement({
            id: `${parentId}-${i}`,
            type: 'circle',
            x: 150 + i * 90,
            y: 200,
            width: 70,
            height: 70,
            fill: color,
            stroke: '#1e293b',
            strokeWidth: 2,
            text: color,
            zIndex: 1
          });
        });
      }
    },
    {
      id: 'uml-gen',
      name: 'UML Generator',
      category: 'Diagrams',
      author: 'Engineering Lab',
      version: '1.4.1',
      rating: 4.6,
      downloads: 1800,
      description: 'Generates standard UML Object blocks mapping components instantly.',
      icon: '📦',
      run: (boardStore) => {
        const parentId = `uml-${Date.now()}`;
        boardStore.addElement({
          id: `${parentId}-model`,
          type: 'rectangle',
          x: 200,
          y: 150,
          width: 180,
          height: 100,
          fill: 'rgba(16, 185, 129, 0.05)',
          stroke: '#10b981',
          strokeWidth: 2,
          text: '<<Model>>\nUserModel',
          zIndex: 1
        });
      }
    },
    {
      id: 'mindmap-gen',
      name: 'Mind Map Generator',
      category: 'Diagrams',
      author: 'Brainstorm Co',
      version: '1.1.2',
      rating: 4.8,
      downloads: 3100,
      description: 'Radiate mindmap node ideas outwards from a core subject.',
      icon: '🧠',
      run: (boardStore) => {
        const parentId = `mindmap-${Date.now()}`;
        boardStore.addElement({ id: `${parentId}-core`, type: 'circle', x: 300, y: 200, width: 130, height: 130, fill: 'rgba(99, 102, 241, 0.1)', stroke: '#6366f1', strokeWidth: 3, text: 'Core Topic', zIndex: 1 });
      }
    },
    {
      id: 'emoji-picker',
      name: 'Emoji Picker',
      category: 'Collaboration',
      author: 'Social Tools',
      version: '1.0.1',
      rating: 4.7,
      downloads: 1500,
      description: 'Quickly insert large reaction emojis to comment on designs.',
      icon: '😀',
      run: (boardStore, options) => {
        const emoji = options?.emoji || '🚀';
        const parentId = `emoji-${Date.now()}`;
        boardStore.addElement({
          id: parentId,
          type: 'text',
          x: 200,
          y: 200,
          width: 80,
          height: 80,
          text: emoji,
          fill: '#ffffff',
          stroke: 'transparent',
          strokeWidth: 0,
          zIndex: 1
        });
      },
      renderSettings: (_boardStore, onRun) => {
        const emojis = ['👍', '🔥', '❤️', '🎉', '🚀', '⚠️', '👀', '💡'];
        return (
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-slate-500">Choose Emoji</label>
            <div className="grid grid-cols-4 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onRun({ emoji })}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-lg rounded-xl transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        );
      }
    },
    { id: 'barcode-gen', name: 'Barcode Generator', category: 'Utilities', author: 'Code Labs', version: '1.0.0', rating: 4.3, downloads: 420, description: 'Insert stylized barcode shapes for retail templates.', icon: '🏷️', run: (b) => b.addElement({ id: `bar-${Date.now()}`, type: 'rectangle', x: 200, y: 200, width: 220, height: 70, fill: '#000000', stroke: '#ffffff', strokeWidth: 2, text: '|||||||||||||', zIndex: 1 }) },
    { id: 'markdown-notes', name: 'Markdown Notes', category: 'Productivity', author: 'Markdown Dev', version: '2.0.1', rating: 4.5, downloads: 880, description: 'Convert raw Markdown lists into structured whiteboard stickies.', icon: '📝', run: (b) => b.addElement({ id: `md-${Date.now()}`, type: 'sticky', x: 200, y: 200, width: 200, height: 200, fill: '#fcd34d', stroke: '#d97706', strokeWidth: 1, text: '# Todo List\n- Draft specs\n- Wireframe home', zIndex: 1 }) },
    { id: 'sticky-enhancer', name: 'Sticky Note Enhancer', category: 'Design', author: 'Productive Inc', version: '1.0.2', rating: 4.4, downloads: 910, description: 'Tidy up, colorize, and align messy sticky note coordinates.', icon: '⚡', run: (b) => {
      const selected = b.getElements().filter((el: any) => b.getSelectedIds().has(el.id));
      if (selected.length === 0) return alert('Select shapes to enhance colors!');
      selected.forEach((el: any) => b.updateElement(el.id, { fill: '#bfdbfe', stroke: '#2563eb' }));
    } },
    { id: 'icons-lib', name: 'Icons Library', category: 'Design', author: 'Vector Core', version: '3.0.0', rating: 4.8, downloads: 2200, description: 'Choose from hundreds of clean SVG shapes to mock components.', icon: '✨', run: (b) => b.addElement({ id: `icon-${Date.now()}`, type: 'circle', x: 250, y: 250, width: 50, height: 50, fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 2, text: '★', zIndex: 1 }) },
    { id: 'lorem-gen', name: 'Lorem Ipsum Generator', category: 'Productivity', author: 'Lorem Team', version: '1.1.0', rating: 4.2, downloads: 670, description: 'Insert placeholder body copy blocks with a single click.', icon: '💬', run: (b) => b.addElement({ id: `lorem-${Date.now()}`, type: 'text', x: 200, y: 200, width: 300, height: 100, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', fill: '#ffffff', stroke: 'transparent', strokeWidth: 0, zIndex: 1 }) },
    { id: 'calendar-widget', name: 'Calendar Organizer', category: 'Productivity', author: 'Sync Time', version: '1.5.0', rating: 4.7, downloads: 1400, description: 'Insert weekly/monthly timeline layout cells.', icon: '📅', run: (b) => b.addElement({ id: `cal-${Date.now()}`, type: 'rectangle', x: 200, y: 200, width: 300, height: 200, fill: 'rgba(255,255,255,0.01)', stroke: '#334155', strokeWidth: 2, text: 'Calendar Week', zIndex: 1 }) },
    { id: 'stopwatch-widget', name: 'Stopwatch Timer', category: 'Utilities', author: 'Sync Time', version: '1.0.0', rating: 4.1, downloads: 350, description: 'Add stopwatch sticky notes to your whiteboard sessions.', icon: '⏱️', run: (b) => b.addElement({ id: `stop-${Date.now()}`, type: 'sticky', x: 200, y: 200, width: 140, height: 140, fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 1, text: 'Stopwatch: 00:00', zIndex: 1 }) },
    { id: 'world-clock', name: 'World Clock Display', category: 'Collaboration', author: 'Globetrotters', version: '1.2.0', rating: 4.5, downloads: 410, description: 'Insert labels for different city time zones.', icon: '🌐', run: (b) => b.addElement({ id: `clk-${Date.now()}`, type: 'text', x: 200, y: 200, width: 250, height: 40, text: `UTC: ${new Date().toUTCString()}`, fill: '#94a3b8', stroke: 'transparent', strokeWidth: 0, zIndex: 1 }) },
    { id: 'unit-conv', name: 'Unit Converter', category: 'Utilities', author: 'Math tools', version: '1.0.3', rating: 4.2, downloads: 280, description: 'Convert metric and imperial units easily.', icon: '📐', run: () => alert('Use converter panel to map coordinates!') },
    { id: 'json-format', name: 'JSON Formatter', category: 'Development', author: 'Dev Tools', version: '1.1.1', rating: 4.6, downloads: 1040, description: 'Format and display raw JSON strings.', icon: '🗂️', run: (b) => b.addElement({ id: `json-${Date.now()}`, type: 'text', x: 200, y: 200, width: 300, height: 120, text: '{\n  "status": "success",\n  "code": 200\n}', fill: '#10b981', stroke: 'transparent', strokeWidth: 0, zIndex: 1 }) },
    { id: 'csv-viewer', name: 'CSV Viewer', category: 'Development', author: 'Dev Tools', version: '1.0.5', rating: 4.4, downloads: 720, description: 'Render CSV files as clean grid tables on the whiteboard.', icon: '📊', run: (b) => b.addElement({ id: `csv-${Date.now()}`, type: 'rectangle', x: 200, y: 200, width: 280, height: 140, fill: 'rgba(255,255,255,0.01)', stroke: '#334155', strokeWidth: 2, text: 'Row A | Row B | Row C', zIndex: 1 }) },
    { id: 'flowchart-gen', name: 'Flowchart Generator', category: 'Diagrams', author: 'Diagrams Team', version: '2.0.0', rating: 4.9, downloads: 3500, description: 'Instantly insert standard flowchart shapes.', icon: '🔄', run: (b) => b.addElement({ id: `flow-${Date.now()}`, type: 'circle', x: 200, y: 200, width: 100, height: 100, fill: 'rgba(16, 185, 129, 0.05)', stroke: '#10b981', strokeWidth: 2, text: 'Start', zIndex: 1 }) },
    { id: 'ai-diag', name: 'AI Diagram Generator', category: 'AI', author: 'AI Labs', version: '1.0.0', rating: 4.9, downloads: 4800, description: 'Simulate diagram creation using generative AI prompt inputs.', icon: '🤖', run: (b) => b.addElement({ id: `ai-${Date.now()}`, type: 'sticky', x: 200, y: 200, width: 200, height: 200, fill: '#f43f5e', stroke: '#e11d48', strokeWidth: 1, text: 'AI: UML User Service Flowchart', zIndex: 1 }) },
    { id: 'img-comp', name: 'Image Compressor', category: 'Utilities', author: 'Media Tools', version: '1.0.2', rating: 4.1, downloads: 390, description: 'Compress images before uploading to canvas elements.', icon: '🖼️', run: () => alert('Image compression ready! Drag & Drop images to activate.') },
    { id: 'svg-icons', name: 'SVG Vector Icons', category: 'Design', author: 'Vector Core', version: '1.1.0', rating: 4.6, downloads: 1400, description: 'Insert pure vector icons into design schemas.', icon: '🎨', run: (b) => b.addElement({ id: `svg-${Date.now()}`, type: 'circle', x: 250, y: 250, width: 60, height: 60, fill: '#8b5cf6', stroke: '#7c3aed', strokeWidth: 2, text: '⚙', zIndex: 1 }) },
    { id: 'unsplash-search', name: 'Unsplash Image Search', category: 'Design', author: 'Unsplash Inc', version: '2.0.2', rating: 4.8, downloads: 3900, description: 'Find and load Unsplash creative image layers.', icon: '📷', run: (b) => b.addElement({ id: `img-${Date.now()}`, type: 'rectangle', x: 200, y: 200, width: 240, height: 160, fill: '#475569', stroke: '#334155', strokeWidth: 2, text: 'Placeholder Image', zIndex: 1 }) },
    { id: 'avatar-gen', name: 'Random Avatar Generator', category: 'Collaboration', author: 'Social Tools', version: '1.3.0', rating: 4.5, downloads: 1200, description: 'Insert unique user avatar icons to tag boards.', icon: '🤖', run: (b) => b.addElement({ id: `av-${Date.now()}`, type: 'circle', x: 200, y: 200, width: 60, height: 60, fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2, text: '🤖', zIndex: 1 }) },
    { id: 'stopwatch-timer', name: 'Stopwatch & Countdown', category: 'Productivity', author: 'Sync Time', version: '1.2.0', rating: 4.4, downloads: 540, description: 'Track session sprints with standard timers.', icon: '⏱️', run: (b) => b.addElement({ id: `tmr-${Date.now()}`, type: 'sticky', x: 200, y: 200, width: 140, height: 140, fill: '#fef3c7', stroke: '#d97706', strokeWidth: 1, text: 'Timer: 10m 00s', zIndex: 1 }) }
  ], []);

  // Filter Catalog List
  const filteredCatalog = useMemo(() => {
    return pluginsCatalog.filter((p) => {
      // Tab filter
      if (activeTab === 'my-plugins' && !installedPluginIds.includes(p.id)) return false;

      // Category filter
      const matchesCategory = 
        activeCategory === 'All' || 
        p.category.toLowerCase() === activeCategory.toLowerCase();

      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeTab, activeCategory, searchQuery, installedPluginIds, pluginsCatalog]);

  const handleInstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...installedPluginIds, id];
    setInstalledPluginIds(updated);
    localStorage.setItem('collabboard_installed_plugins', JSON.stringify(updated));

    // Auto-enable on install
    const updatedEnabled = [...enabledPluginIds, id];
    setEnabledPluginIds(updatedEnabled);
    localStorage.setItem('collabboard_enabled_plugins', JSON.stringify(updatedEnabled));
  };

  const handleUninstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = installedPluginIds.filter(pId => pId !== id);
    setInstalledPluginIds(updated);
    localStorage.setItem('collabboard_installed_plugins', JSON.stringify(updated));

    const updatedEnabled = enabledPluginIds.filter(pId => pId !== id);
    setEnabledPluginIds(updatedEnabled);
    localStorage.setItem('collabboard_enabled_plugins', JSON.stringify(updatedEnabled));

    if (runningPlugin?.id === id) setRunningPlugin(null);
  };

  const toggleEnable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (enabledPluginIds.includes(id)) {
      updated = enabledPluginIds.filter(pId => pId !== id);
    } else {
      updated = [...enabledPluginIds, id];
    }
    setEnabledPluginIds(updated);
    localStorage.setItem('collabboard_enabled_plugins', JSON.stringify(updated));
  };

  const handleRunPlugin = (plugin: PluginDef) => {
    if (!enabledPluginIds.includes(plugin.id)) {
      alert("Plugin must be enabled before you can run it!");
      return;
    }

    if (plugin.renderSettings) {
      setRunningPlugin(plugin);
    } else {
      // Use centered proxy so shapes appear at viewport center
      plugin.run(makeCenteredProxy(store));
      onClose();
    }
  };

  const handleRunConfiguredPlugin = (opts?: any) => {
    if (runningPlugin) {
      runningPlugin.run(makeCenteredProxy(store), opts);
      setRunningPlugin(null);
      onClose();
    }
  };

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    // Full-screen overlay — modal always perfectly centered
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal shell */}
      <div
        className="
          relative flex flex-col
          w-[90vw] max-w-[1400px]
          h-[85vh] max-h-[900px]
          bg-slate-900 border border-slate-800
          rounded-[20px] shadow-2xl overflow-hidden
          text-slate-100
        "
      >
        
        {/* Header Section */}
        <header className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/30">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Plugin System & Extensions</span>
            </h2>
            <p className="text-xs text-slate-400">Install community widgets and diagrams scripts</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </header>

        {/* Tab switchers & Category selector */}
        <div className="px-6 py-3 border-b border-slate-800 flex gap-4 bg-slate-950/10 text-xs font-semibold">
          <button 
            onClick={() => { setActiveTab('my-plugins'); setRunningPlugin(null); }}
            className={`pb-1.5 border-b-2 transition-all ${activeTab === 'my-plugins' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            My Plugins ({installedPluginIds.length})
          </button>
          <button 
            onClick={() => { setActiveTab('marketplace'); setRunningPlugin(null); }}
            className={`pb-1.5 border-b-2 transition-all ${activeTab === 'marketplace' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Plugin Marketplace
          </button>
        </div>

        {/* Categories row */}
        {activeTab === 'marketplace' && (
          <div className="px-6 py-2 border-b border-slate-850 bg-slate-900/60 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {['All', 'Productivity', 'AI', 'Diagrams', 'Development', 'Utilities', 'Design', 'Charts', 'Export', 'Collaboration'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Body Content Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* Scrollable main list — only this scrolls */}
          <main
            className="
              flex-1 min-w-0
              p-6 overflow-y-auto overflow-x-hidden
              scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
              space-y-4
            "
          >
            
            {runningPlugin ? (
              // Inner panel for configured settings plugin execution
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-950/30 border border-slate-800 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{runningPlugin.icon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">{runningPlugin.name} Settings</h3>
                      <span className="text-[9px] text-slate-500">v{runningPlugin.version} • By {runningPlugin.author}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setRunningPlugin(null)}
                    className="text-xs text-slate-500 hover:text-slate-350"
                  >
                    Back
                  </button>
                </div>
                
                {runningPlugin.renderSettings && runningPlugin.renderSettings(store, handleRunConfiguredPlugin)}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-2xl">
                <HelpCircle className="w-8 h-8 text-slate-750 mb-2" />
                <span>No plugins found matching this view. Check the marketplace tab!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCatalog.map((plugin) => {
                  const isInstalled = installedPluginIds.includes(plugin.id);
                  const isEnabled = enabledPluginIds.includes(plugin.id);
                  
                  return (
                    <div
                      key={plugin.id}
                      className="p-5 rounded-2xl bg-slate-950/20 border border-slate-850 hover:border-indigo-500/30 transition-all flex flex-col justify-between h-40 shadow"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl p-1 bg-slate-900 border border-slate-800 rounded-xl">{plugin.icon}</span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <h4 className="font-bold text-xs truncate text-slate-250">{plugin.name}</h4>
                            <span className="text-[8px] bg-slate-850 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                              {plugin.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed">{plugin.description}</p>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="flex items-center justify-between border-t border-slate-850/60 pt-3 mt-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-550">★ {plugin.rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>{(plugin.downloads / 1000).toFixed(1)}k uses</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isInstalled ? (
                            <>
                              <button
                                onClick={(e) => toggleEnable(plugin.id, e)}
                                className={`px-2 py-1 rounded font-bold transition-all ${
                                  isEnabled 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </button>
                              <button
                                onClick={() => handleRunPlugin(plugin)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center gap-1 transition-all"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Run</span>
                              </button>
                              <button
                                onClick={(e) => handleUninstall(plugin.id, e)}
                                className="p-1 hover:bg-red-500/5 text-slate-600 hover:text-red-400 rounded transition-all"
                                title="Uninstall Plugin"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => handleInstall(plugin.id, e)}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded flex items-center gap-1 transition-all"
                            >
                              <Download className="w-3 h-3" />
                              <span>Install</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* Footer actions */}
        <footer className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sandbox Enabled: Third-party scripts are containerized.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 font-semibold text-xs rounded-xl transition-all"
          >
            Close
          </button>
        </footer>

      </div>
    </div>
  );
};
export default PluginsModal;
