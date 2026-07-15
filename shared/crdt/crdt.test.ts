import { HybridLogicalClock } from './clocks';
import { LWWRegister } from './registers';
import { LWWMap } from './map';
import { RGAList } from './rga';

function runTests() {
  console.log("=== STARTING CRDT SUITE ===");

  // 1. Test HLC Causality
  const hlcA = new HybridLogicalClock('client-A');
  const hlcB = new HybridLogicalClock('client-B');

  const t1 = hlcA.tick(1000);
  const t2 = hlcB.tick(1000);

  // t1 and t2 are concurrent at same physical time. Tie broken by client ID.
  const cmp = HybridLogicalClock.compare(t1, t2);
  if (cmp >= 0) throw new Error("Client A should be ordered before Client B");
  console.log("✓ Clock ordering passed");

  // 2. Test LWW Register
  const regA = new LWWRegister("val-A", t1);
  const updated = regA.merge("val-B", t2);
  if (!updated || regA.getValue() !== "val-B") {
    throw new Error("LWW Register merge failed: Client B's write should win");
  }
  console.log("✓ LWW Register merge passed");

  // 3. Test LWW Map
  const mapA = new LWWMap<string>(hlcA);
  const mapB = new LWWMap<string>(hlcB);

  const uA = mapA.set("title", "Miro");
  const uB = mapB.set("title", "Figma");

  // Merge mapB updates into mapA
  mapA.merge([uB]);
  // Since B's timestamp was higher (due to nodeId tie break), title should be Figma
  if (mapA.get("title") !== "Figma") {
    throw new Error("LWW Map merge did not resolve to Figma");
  }
  console.log("✓ LWW Map merge passed");

  // 4. Test RGA Concurrent Inserts
  const rgaA = new RGAList<string>("client-A");
  const rgaB = new RGAList<string>("client-B");

  // Client A inserts "X" at index 0
  const nodeX = rgaA.insert(0, "X");
  // Client B inserts "Y" at index 0 concurrently
  const nodeY = rgaB.insert(0, "Y");

  // Merge nodes cross-site
  rgaA.mergeNode(nodeY);
  rgaB.mergeNode(nodeX);

  const arrA = rgaA.toArray();
  const arrB = rgaB.toArray();

  if (JSON.stringify(arrA) !== JSON.stringify(arrB)) {
    throw new Error(`RGA divergence: Client A has ${arrA}, Client B has ${arrB}`);
  }
  console.log(`✓ RGA concurrent insert sync passed: converged on ${JSON.stringify(arrA)}`);
  console.log("=== ALL CRDT TESTS PASSED SUCCESSFULLY ===");
}

try {
  runTests();
} catch (e) {
  console.error("Test failed", e);
  process.exit(1);
}
