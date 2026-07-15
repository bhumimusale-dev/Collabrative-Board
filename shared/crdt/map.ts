import { HLCTime, HybridLogicalClock } from './clocks';
import { LWWRegister } from './registers';

export interface MapUpdatePayload<T> {
  key: string;
  value: T;
  timestamp: HLCTime;
}

/**
 * LWWMap implements a Map CRDT.
 * Internally, it manages a dictionary of keys mapped to LWWRegisters.
 */
export class LWWMap<T> {
  private registers: Map<string, LWWRegister<T>> = new Map();
  private hlc: HybridLogicalClock;

  constructor(hlc: HybridLogicalClock) {
    this.hlc = hlc;
  }

  public get(key: string): T | undefined {
    return this.registers.get(key)?.getValue();
  }

  public has(key: string): boolean {
    return this.registers.has(key);
  }

  public set(key: string, value: T): MapUpdatePayload<T> {
    let register = this.registers.get(key);
    let timestamp: HLCTime;

    if (!register) {
      timestamp = this.hlc.tick();
      register = new LWWRegister(value, timestamp);
      this.registers.set(key, register);
    } else {
      timestamp = register.set(value, this.hlc);
    }

    return { key, value, timestamp };
  }

  public keys(): string[] {
    return Array.from(this.registers.keys());
  }

  public entries(): [string, T][] {
    const list: [string, T][] = [];
    for (const [k, reg] of this.registers.entries()) {
      list.push([k, reg.getValue()]);
    }
    return list;
  }

  /**
   * Merges a batch of key updates (delta updates) into the Map.
   */
  public merge(updates: MapUpdatePayload<T>[]): boolean {
    let hasChanges = false;
    for (const update of updates) {
      let localReg = this.registers.get(update.key);
      if (!localReg) {
        this.registers.set(update.key, new LWWRegister(update.value, update.timestamp));
        this.hlc.merge(update.timestamp);
        hasChanges = true;
      } else {
        const changed = localReg.merge(update.value, update.timestamp);
        if (changed) {
          this.hlc.merge(update.timestamp);
          hasChanges = true;
        }
      }
    }
    return hasChanges;
  }
}
