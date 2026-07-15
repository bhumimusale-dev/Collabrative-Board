import type { BoardElement } from '../crdt/boardStore';
import { BoardStore } from '../crdt/boardStore';

export const generateTemplateElements = (id: string, name: string): BoardElement[] => {
  const parentId = `${id}-${Date.now()}`;
  const list: BoardElement[] = [];

  if (id.includes('kanban') || id.includes('scrum')) {
    list.push(
      { id: `${parentId}-col1`, type: 'rectangle', x: 100, y: 100, width: 250, height: 400, fill: 'rgba(59, 130, 246, 0.04)', stroke: '#3b82f6', strokeWidth: 2, zIndex: 1 },
      { id: `${parentId}-col1-txt`, type: 'text', x: 120, y: 120, width: 150, height: 30, text: 'TO DO', fill: '#3b82f6', stroke: '#3b82f6', strokeWidth: 1, zIndex: 2 },
      { id: `${parentId}-col2`, type: 'rectangle', x: 400, y: 100, width: 250, height: 400, fill: 'rgba(245, 158, 11, 0.04)', stroke: '#f59e0b', strokeWidth: 2, zIndex: 1 },
      { id: `${parentId}-col2-txt`, type: 'text', x: 420, y: 120, width: 150, height: 30, text: 'IN PROGRESS', fill: '#f59e0b', stroke: '#f59e0b', strokeWidth: 1, zIndex: 2 },
      { id: `${parentId}-card1`, type: 'sticky', x: 120, y: 170, width: 210, height: 90, fill: '#fef08a', stroke: '#ca8a04', strokeWidth: 1, text: 'Update SaaS logo', zIndex: 3 }
    );
  } else if (id.includes('swot')) {
    list.push(
      { id: `${parentId}-s`, type: 'rectangle', x: 100, y: 100, width: 280, height: 280, fill: 'rgba(16, 185, 129, 0.04)', stroke: '#10b981', strokeWidth: 2, zIndex: 1 },
      { id: `${parentId}-s-txt`, type: 'text', x: 120, y: 120, width: 200, height: 30, text: 'STRENGTHS', fill: '#10b981', stroke: '#10b981', strokeWidth: 1, zIndex: 2 },
      { id: `${parentId}-w`, type: 'rectangle', x: 410, y: 100, width: 280, height: 280, fill: 'rgba(239, 68, 68, 0.04)', stroke: '#ef4444', strokeWidth: 2, zIndex: 1 },
      { id: `${parentId}-w-txt`, type: 'text', x: 430, y: 120, width: 200, height: 30, text: 'WEAKNESSES', fill: '#ef4444', stroke: '#ef4444', strokeWidth: 1, zIndex: 2 }
    );
  } else if (id.includes('mindmap')) {
    list.push(
      { id: `${parentId}-core`, type: 'circle', x: 300, y: 200, width: 140, height: 140, fill: 'rgba(99, 102, 241, 0.1)', stroke: '#6366f1', strokeWidth: 3, zIndex: 1 },
      { id: `${parentId}-core-txt`, type: 'text', x: 320, y: 260, width: 100, height: 20, text: 'Core Idea', fill: '#6366f1', stroke: '#6366f1', strokeWidth: 1, zIndex: 2 },
      { id: `${parentId}-node1`, type: 'rectangle', x: 100, y: 120, width: 120, height: 50, fill: 'rgba(244, 63, 94, 0.05)', stroke: '#f43f5e', strokeWidth: 2, zIndex: 3 }
    );
  } else {
    list.push(
      { id: `${parentId}-box`, type: 'rectangle', x: 200, y: 120, width: 340, height: 220, fill: 'rgba(99, 102, 241, 0.05)', stroke: '#6366f1', strokeWidth: 2, zIndex: 1 },
      { id: `${parentId}-lbl`, type: 'text', x: 230, y: 210, width: 280, height: 30, text: name, fill: '#6366f1', stroke: '#6366f1', strokeWidth: 1, zIndex: 2 },
      { id: `${parentId}-stk`, type: 'sticky', x: 590, y: 140, width: 160, height: 160, fill: '#bfdbfe', stroke: '#2563eb', strokeWidth: 1, text: `Use this ${name} framework to organize steps and ideas.`, zIndex: 3 }
    );
  }
  return list;
};

export const fetchAndApplyTemplate = async (templateId: string, store: BoardStore): Promise<void> => {
  let list: BoardElement[] = [];

  // Map JSON file name based on ID
  let jsonName = '';
  if (templateId === 'login-screen') jsonName = 'login-screen.json';
  else if (templateId === 'kanban-board') jsonName = 'kanban-board.json';
  else if (templateId === 'basic-flowchart') jsonName = 'basic-flowchart.json';
  else if (templateId === 'swot-analysis') jsonName = 'swot-analysis.json';
  else if (templateId === 'mindmap') jsonName = 'mindmap.json';

  if (jsonName) {
    try {
      const res = await fetch(`/templates/${jsonName}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.elements)) {
          const uid = Date.now();
          list = data.elements.map((el: any) => ({
            ...el,
            id: `${el.id}-${uid}`,
            zIndex: el.zIndex || 0
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load JSON template asset, falling back to generator', e);
    }
  }

  if (list.length === 0) {
    // Generate dynamically if fetch fails or is not a pre-designed static asset
    const name = templateId.replace('-', ' ').toUpperCase();
    list = generateTemplateElements(templateId, name);
  }

  // Clear existing items and populate Yjs map
  store.doc.transact(() => {
    store.elementsMap.clear();
    list.forEach(el => {
      store.elementsMap.set(el.id, el);
    });
  });
};
