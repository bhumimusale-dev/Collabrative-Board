import { HLCTime, HybridLogicalClock } from './clocks';

/**
 * LWWRegister implements a Last-Write-Wins Register CRDT.
 * It uses Hybrid Logical Clocks (HLC) to guarantee deterministic conflict resolution.
 */
export class LWWRegister<T> {
  private value: T;
  private timestamp: HLCTime;

  constructor(initialValue: T, timestamp: HLCTime) {
    this.value = initialValue;
    this.timestamp = timestamp;
  }

  public getValue(): T {
    return this.value;
  }

  public getTimestamp(): HLCTime {
    return this.timestamp;
  }

  /**
   * Updates the value of the register with a new HLC tick.
   */
  public set(newValue: T, hlc: HybridLogicalClock): HLCTime {
    const nextTimestamp = hlc.tick();
    this.value = newValue;
    this.timestamp = nextTimestamp;
    return nextTimestamp;
  }

  /**
   * Merges with another LWWRegister.
   * Compares the remote timestamp against local using HLC comparison rules.
   * Higher timestamp wins; tie breaks deterministically using Node ID.
   */
  public merge(remoteValue: T, remoteTimestamp: HLCTime): boolean {
    const comparison = HybridLogicalClock.compare(this.timestamp, remoteTimestamp);
    if (comparison < 0) {
      this.value = remoteValue;
      this.timestamp = remoteTimestamp;
      return true; // Local state changed
    }
    return false;
  }
}
