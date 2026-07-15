import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import { useBoard } from '../hooks/useBoard';
import { QuadTree } from '../../../../shared/canvas/spatialIndex';
import type { Box } from '../../../../shared/canvas/spatialIndex';
import type { BoardElement } from '../crdt/boardStore';

export const WhiteboardCanvas: React.FC = () => {
  const store = useBoard();
  const elements = store.getElements();
  const selectedIds = store.getSelectedIds();
  const tool = store.getTool();
  const pan = store.getPan();
  const zoom = store.getZoom();

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Drawing draft state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftElement, setDraftElement] = useState<Partial<BoardElement> | null>(null);

  // QuadTree states
  const [qtree, setQtree] = useState<QuadTree | null>(null);
  const [visibleElements, setVisibleElements] = useState<BoardElement[]>(elements);

  // Keyboard and resize hooks
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rebuild QuadTree when canvas elements count updates
  useEffect(() => {
    if (elements.length === 0) {
      setQtree(null);
      setVisibleElements([]);
      return;
    }
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    elements.forEach(el => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
      if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
    });

    const width = Math.max(20000, (maxX - minX) * 2);
    const height = Math.max(20000, (maxY - minY) * 2);
    const bounds = { x: minX - width / 4, y: minY - height / 4, width, height };

    const q = new QuadTree(0, bounds);
    elements.forEach(el => {
      q.insert({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width || 10,
        height: el.height || 10
      });
    });
    setQtree(q);
  }, [elements]);

  // Culling query loop running on pan and zoom updates
  useEffect(() => {
    if (!qtree) {
      setVisibleElements(elements);
      return;
    }
    const margin = 100;
    const viewport = {
      x: -pan.x / zoom - margin,
      y: -pan.y / zoom - margin,
      width: dimensions.width / zoom + margin * 2,
      height: dimensions.height / zoom + margin * 2,
    };
    const results: Box[] = [];
    qtree.retrieve(results, viewport);

    const visibleSet = new Set(results.map(r => r.id));
    setVisibleElements(elements.filter(el => visibleSet.has(el.id)));
  }, [qtree, pan, zoom, dimensions, elements]);

  // Update Konva Transformer nodes based on selected elements
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    const transformer = transformerRef.current;

    const selectedNodes: Konva.Node[] = [];
    selectedIds.forEach((id) => {
      const node = stage.findOne(`#${id}`);
      if (node) {
        selectedNodes.push(node);
      }
    });

    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  // Convert client cursor space to absolute canvas coordinates
  const getCanvasCoords = (_e?: any): { x: number; y: number } => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };

    return {
      x: (pointer.x - pan.x) / zoom,
      y: (pointer.y - pan.y) / zoom,
    };
  };

  // Canvas Mouse Events
  const handleMouseDown = (e: any) => {
    // If clicked on stage empty space, clear selection
    const clickedOnStage = e.target === e.target.getStage();
    const coords = getCanvasCoords(e);

    // Pan canvas with middle mouse or Space+Drag or just select tool empty space click
    if (tool === 'select') {
      if (clickedOnStage) {
        store.clearSelection();
      }
      return;
    }

    // Start drawing a new element
    setIsDrawing(true);
    const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (tool === 'freehand') {
      setDraftElement({
        id,
        type: 'freehand',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'none',
        stroke: store.getStrokeColor(),
        strokeWidth: 4,
        points: [coords.x, coords.y],
      });
    } else {
      setDraftElement({
        id,
        type: tool as any,
        x: coords.x,
        y: coords.y,
        width: 10,
        height: 10,
        fill: tool === 'sticky' ? '#fef08a' : store.getFillColor(),
        stroke: tool === 'sticky' ? '#eab308' : store.getStrokeColor(),
        strokeWidth: tool === 'sticky' ? 1 : 2,
        text: tool === 'sticky' ? 'Double click to edit' : tool === 'text' ? 'Text' : '',
      });
    }
  };

  const handleMouseMove = (e: any) => {
    const coords = getCanvasCoords(e);

    // Update real-time cursor coordinate in collaborative Awareness provider
    if (store.provider) {
      store.provider.updateLocalCursor(coords.x, coords.y);
    }

    if (!isDrawing || !draftElement) return;

    if (draftElement.type === 'freehand') {
      const pts = draftElement.points ? [...draftElement.points, coords.x, coords.y] : [coords.x, coords.y];
      setDraftElement({ ...draftElement, points: pts });
    } else {
      const width = coords.x - (draftElement.x || 0);
      const height = coords.y - (draftElement.y || 0);
      setDraftElement({
        ...draftElement,
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? coords.x : draftElement.x,
        y: height < 0 ? coords.y : draftElement.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && draftElement) {
      store.addElement(draftElement as BoardElement);
      // Automatically switch to select tool after drawing shapes/sticky notes
      if (draftElement.type !== 'freehand') {
        store.setTool('select');
        store.selectElement(draftElement.id!);
      }
    }
    setIsDrawing(false);
    setDraftElement(null);
  };

  const handleStageDrag = (e: any) => {
    // Stage drag is used for panning the board
    if (tool !== 'select') return;
    const stage = e.target;
    store.setPan(stage.x(), stage.y());
  };

  // Zoom with trackpad / scroll wheel
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - pan.x) / oldScale,
      y: (pointer.y - pan.y) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    store.setZoom(newScale);

    // Re-adjust pan coordinates to zoom towards the mouse cursor
    const newPan = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    store.setPan(newPan.x, newPan.y);
  };

  // Handle transformations (resize/drag of elements)
  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const id = node.id();
    
    const updates: Partial<BoardElement> = {
      x: node.x(),
      y: node.y(),
    };

    if (node.width() && node.scaleX()) {
      updates.width = Math.max(5, node.width() * node.scaleX());
      node.scaleX(1);
    }
    if (node.height() && node.scaleY()) {
      updates.height = Math.max(5, node.height() * node.scaleY());
      node.scaleY(1);
    }

    store.updateElement(id, updates);
  };

  const handleDragEnd = (e: any) => {
    const node = e.target;
    const id = node.id();
    store.updateElement(id, {
      x: node.x(),
      y: node.y(),
    });
  };

  // double click to edit text/sticky contents
  const handleDoubleClick = (el: BoardElement) => {
    if (el.type !== 'text' && el.type !== 'sticky') return;
    const newText = window.prompt('Edit text:', el.text || '');
    if (newText !== null) {
      store.updateElement(el.id, { text: newText });
    }
  };

  return (
    <div className={`w-full h-full outline-none overflow-hidden ${store.isDarkMode() ? 'grid-bg-dark bg-[#121212]' : 'grid-bg-light bg-slate-50'}`}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable={tool === 'select' && !isDrawing}
        onDragEnd={handleStageDrag}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="outline-none"
      >
        <Layer>
          {visibleElements.map((el) => {

            // Shape Rendering
            if (el.type === 'rectangle') {
              return (
                <Rect
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fill={el.fill}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  draggable={tool === 'select' && !el.isLocked}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                  onClick={() => tool === 'select' && store.selectElement(el.id)}
                  cornerRadius={4}
                />
              );
            }

            if (el.type === 'circle') {
              return (
                <Circle
                  key={el.id}
                  id={el.id}
                  x={el.x + el.width / 2}
                  y={el.y + el.height / 2}
                  radius={Math.max(el.width, el.height) / 2}
                  fill={el.fill}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  draggable={tool === 'select' && !el.isLocked}
                  onDragEnd={(e) => {
                    const node = e.target as any;
                    const r = node.radius();
                    store.updateElement(el.id, {
                      x: node.x() - r,
                      y: node.y() - r,
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target as any;
                    const r = node.radius() * node.scaleX();
                    node.scaleX(1);
                    node.scaleY(1);
                    store.updateElement(el.id, {
                      x: node.x() - r,
                      y: node.y() - r,
                      width: r * 2,
                      height: r * 2,
                    });
                  }}
                  onClick={() => tool === 'select' && store.selectElement(el.id)}
                />
              );
            }

            if (el.type === 'text') {
              return (
                <Text
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  text={el.text || ''}
                  fontSize={20}
                  fontFamily="'Outfit', sans-serif"
                  fill={store.isDarkMode() ? '#f8fafc' : '#0f172a'}
                  draggable={tool === 'select' && !el.isLocked}
                  onDragEnd={handleDragEnd}
                  onClick={() => tool === 'select' && store.selectElement(el.id)}
                  onDblClick={() => handleDoubleClick(el)}
                />
              );
            }

            if (el.type === 'sticky') {
              return (
                <Group
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  draggable={tool === 'select' && !el.isLocked}
                  onDragEnd={handleDragEnd}
                  onClick={() => tool === 'select' && store.selectElement(el.id)}
                  onDblClick={() => handleDoubleClick(el)}
                >
                  <Rect
                    width={el.width}
                    height={el.height}
                    fill={el.fill}
                    stroke={el.stroke}
                    strokeWidth={el.strokeWidth}
                    shadowColor="rgba(0,0,0,0.15)"
                    shadowBlur={10}
                    shadowOffset={{ x: 3, y: 5 }}
                    cornerRadius={8}
                  />
                  <Text
                    text={el.text || ''}
                    width={el.width - 20}
                    x={10}
                    y={10}
                    fontSize={16}
                    fontFamily="'Outfit', sans-serif"
                    fill="#1e293b"
                  />
                </Group>
              );
            }

            if (el.type === 'freehand') {
              return (
                <Line
                  key={el.id}
                  id={el.id}
                  points={el.points || []}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={tool === 'select' && !el.isLocked}
                  onDragEnd={handleDragEnd}
                  onClick={() => tool === 'select' && store.selectElement(el.id)}
                />
              );
            }

            return null;
          })}

          {/* Render local drawing draft */}
          {draftElement && (
            <>
              {draftElement.type === 'freehand' && (
                <Line
                  points={draftElement.points || []}
                  stroke={draftElement.stroke}
                  strokeWidth={draftElement.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {draftElement.type === 'rectangle' && (
                <Rect
                  x={draftElement.x}
                  y={draftElement.y}
                  width={draftElement.width}
                  height={draftElement.height}
                  fill={draftElement.fill}
                  stroke={draftElement.stroke}
                  strokeWidth={draftElement.strokeWidth}
                />
              )}
              {draftElement.type === 'circle' && (
                <Circle
                  x={(draftElement.x || 0) + (draftElement.width || 0) / 2}
                  y={(draftElement.y || 0) + (draftElement.height || 0) / 2}
                  radius={Math.max(draftElement.width || 0, draftElement.height || 0) / 2}
                  fill={draftElement.fill}
                  stroke={draftElement.stroke}
                  strokeWidth={draftElement.strokeWidth}
                />
              )}
              {draftElement.type === 'sticky' && (
                <Rect
                  x={draftElement.x}
                  y={draftElement.y}
                  width={draftElement.width}
                  height={draftElement.height}
                  fill={draftElement.fill}
                  stroke={draftElement.stroke}
                  strokeWidth={draftElement.strokeWidth}
                />
              )}
            </>
          )}

          {/* Konva Transformer for manipulation handles */}
          {tool === 'select' && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          )}

          {/* Multi-user live cursor rendering */}
          {store.getActiveUsers().map((user) => {
            if (!user.cursor || user.id === store.doc.clientID.toString()) return null;
            return (
              <Group key={user.id} x={user.cursor.x} y={user.cursor.y}>
                {/* Mouse Cursor Pointer SVG representation */}
                <Line
                  points={[0, 0, 4, 15, 8, 11, 14, 14, 16, 12, 10, 9, 15, 5]}
                  fill={user.color}
                  closed
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <Group x={12} y={15}>
                  <Rect
                    width={user.name.length * 8 + 16}
                    height={20}
                    fill={user.color}
                    cornerRadius={4}
                  />
                  <Text
                    text={user.name}
                    x={8}
                    y={4}
                    fontSize={10}
                    fill="#ffffff"
                    fontStyle="bold"
                  />
                </Group>
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
