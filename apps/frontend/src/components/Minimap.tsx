import React from 'react';
import { useBoard } from '../hooks/useBoard';

export const Minimap: React.FC = () => {
  const store = useBoard();
  const elements = store.getElements();
  const pan = store.getPan();
  const zoom = store.getZoom();

  if (elements.length === 0) return null;

  // Calculate board bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });

  // Handle single element edge case or zero dimension
  const width = Math.max(maxX - minX, 500);
  const height = Math.max(maxY - minY, 500);

  // Add padding
  minX -= 100;
  minY -= 100;
  const totalW = width + 200;
  const totalH = height + 200;

  // Minimap sizes
  const mapW = 160;
  const mapH = 100;

  const scaleX = mapW / totalW;
  const scaleY = mapH / totalH;
  const mapScale = Math.min(scaleX, scaleY);

  // Translate client coordinate to minimap point
  const mapCoords = (x: number, y: number) => {
    return {
      x: (x - minX) * mapScale,
      y: (y - minY) * mapScale,
    };
  };

  // Viewport coords
  const viewX = -pan.x / zoom;
  const viewY = -pan.y / zoom;
  const viewW = window.innerWidth / zoom;
  const viewH = window.innerHeight / zoom;

  const viewportMap = mapCoords(viewX, viewY);
  const viewportSize = {
    w: viewW * mapScale,
    h: viewH * mapScale,
  };

  return (
    <div className="absolute bottom-6 right-6 pointer-events-auto glass-panel p-2 rounded-2xl border border-slate-200/50 dark:border-zinc-800/50 select-none">
      <div 
        className="relative bg-slate-100/60 dark:bg-zinc-950/60 rounded-lg overflow-hidden border border-slate-200/20 dark:border-zinc-800/20"
        style={{ width: mapW, height: mapH }}
      >
        {/* Render elements as small colored rectangles */}
        {elements.map((el) => {
          const pt = mapCoords(el.x, el.y);
          const w = Math.max(2, el.width * mapScale);
          const h = Math.max(2, el.height * mapScale);

          return (
            <div
              key={el.id}
              className="absolute bg-indigo-500/40 dark:bg-indigo-400/30 rounded-[1px]"
              style={{
                left: pt.x,
                top: pt.y,
                width: w,
                height: h,
              }}
            />
          );
        })}

        {/* Render viewport frame box overlay */}
        <div
          className="absolute border border-indigo-600 dark:border-indigo-400 bg-indigo-500/10 rounded"
          style={{
            left: Math.max(0, Math.min(viewportMap.x, mapW - 10)),
            top: Math.max(0, Math.min(viewportMap.y, mapH - 10)),
            width: Math.max(10, Math.min(viewportSize.w, mapW)),
            height: Math.max(10, Math.min(viewportSize.h, mapH)),
          }}
        />
      </div>
    </div>
  );
};
