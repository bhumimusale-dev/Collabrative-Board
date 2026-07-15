/**
 * Lamport Clock implementation.
 * Provides logical timestamps to order events in a distributed system.
 */
export class LamportClock {
  private counter: number;
  private nodeId: string;

  constructor(nodeId: string, initialCounter = 0) {
    this.nodeId = nodeId;
    this.counter = initialCounter;
  }

  public getCounter(): number {
    return this.counter;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  /**
   * Increments the clock for a local event.
   */
  public tick(): number {
    this.counter++;
    return this.counter;
  }

  /**
   * Merges the local clock with a received remote clock value.
   * Compares counters and moves local counter ahead.
   */
  public merge(remoteTime: number): number {
    this.counter = Math.max(this.counter, remoteTime) + 1;
    return this.counter;
  }
}

/**
 * Hybrid Logical Clock (HLC) implementation.
 * Combines physical time with logical sequence numbers to maintain causality
 * even in the presence of physical clock skews.
 */
export interface HLCTime {
  physical: number; // T
  logical: number;  // C
  nodeId: string;
}

export class HybridLogicalClock {
  private latestTime: HLCTime;

  constructor(nodeId: string) {
    this.latestTime = {
      physical: 0,
      logical: 0,
      nodeId,
    };
  }

  public getTime(): HLCTime {
    return { ...this.latestTime };
  }

  /**
   * Generates a new HLC timestamp for a local event.
   */
  public tick(physicalNow = Date.now()): HLCTime {
    const prev = this.latestTime;

    if (physicalNow > prev.physical) {
      prev.physical = physicalNow;
      prev.logical = 0;
    } else {
      prev.logical++;
    }

    this.latestTime = prev;
    return { ...this.latestTime };
  }

  /**
   * Merges a received remote HLC timestamp with the local HLC state.
   */
  public merge(remote: HLCTime, physicalNow = Date.now()): HLCTime {
    const local = this.latestTime;
    const maxPhysical = Math.max(local.physical, remote.physical, physicalNow);

    if (maxPhysical === local.physical && maxPhysical === remote.physical) {
      local.logical = Math.max(local.logical, remote.logical) + 1;
    } else if (maxPhysical === local.physical) {
      local.logical++;
    } else if (maxPhysical === remote.physical) {
      local.physical = remote.physical;
      local.logical = remote.logical + 1;
    } else {
      local.physical = maxPhysical;
      local.logical = 0;
    }

    this.latestTime = local;
    return { ...this.latestTime };
  }

  /**
   * Compares two HLC timestamps.
   * Returns -1 if a < b, 1 if a > b, 0 if equal.
   */
  public static compare(a: HLCTime, b: HLCTime): number {
    if (a.physical !== b.physical) {
      return a.physical < b.physical ? -1 : 1;
    }
    if (a.logical !== b.logical) {
      return a.logical < b.logical ? -1 : 1;
    }
    if (a.nodeId !== b.nodeId) {
      return a.nodeId < b.nodeId ? -1 : 1;
    }
    return 0;
  }
}
