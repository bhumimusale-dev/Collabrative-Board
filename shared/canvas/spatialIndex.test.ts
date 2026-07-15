import { QuadTree, Box } from './spatialIndex';

function runTests() {
  console.log("=== STARTING SPATIAL INDEX SUITE ===");

  // Initialize a QuadTree covering a large virtual space
  const bounds = { x: -10000, y: -10000, width: 20000, height: 20000 };
  const qtree = new QuadTree(0, bounds);

  // 1. Generate 10,000 scattered objects
  const objectsCount = 10000;
  const items: Box[] = [];

  const tStartInsert = Date.now();
  for (let i = 0; i < objectsCount; i++) {
    const w = 50 + Math.random() * 100;
    const h = 50 + Math.random() * 100;
    const x = -8000 + Math.random() * 16000;
    const y = -8000 + Math.random() * 16000;

    const box: Box = { id: `obj-${i}`, x, y, width: w, height: h };
    items.push(box);
    qtree.insert(box);
  }
  const tEndInsert = Date.now();
  console.log(`✓ Inserted ${objectsCount} items in ${tEndInsert - tStartInsert}ms`);

  // 2. Query a typical screen viewport (0, 0, 1920, 1080)
  const viewport = { x: 0, y: 0, width: 1920, height: 1080 };
  
  const tStartQuery = performance.now();
  const results: Box[] = [];
  qtree.retrieve(results, viewport);
  const tEndQuery = performance.now();

  console.log(`✓ Queried viewport in ${(tEndQuery - tStartQuery).toFixed(4)}ms. Found ${results.length} objects inside viewport.`);

  // 3. Linear scan fallback comparison (to verify correctness)
  const linearResults = items.filter((item) => {
    return (
      item.x < viewport.x + viewport.width &&
      item.x + item.width > viewport.x &&
      item.y < viewport.y + viewport.height &&
      item.y + item.height > viewport.y
    );
  });

  if (results.length !== linearResults.length) {
    throw new Error(`Divergence! QuadTree found ${results.length}, Linear scan found ${linearResults.length}`);
  }
  console.log("✓ Correctness verification passed (match with linear scan fallback)");
  console.log("=== ALL SPATIAL TESTS PASSED SUCCESSFULLY ===");
}

try {
  runTests();
} catch (e) {
  console.error("Test failed", e);
  process.exit(1);
}
