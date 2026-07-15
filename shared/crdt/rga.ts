export interface RGANodeId {
  clientId: string;
  seq: number;
}

export interface RGANode<T> {
  id: RGANodeId;
  value: T;
  leftId: RGANodeId | null; // Predecessor ID
  deleted: boolean;
}

/**
 * RGAList implements a Replicated Growable Array (RGA) CRDT.
 * Guarantees conflict-free sequence operations for text, arrays, and canvas layers.
 */
export class RGAList<T> {
  private nodes: RGANode<T>[] = [];
  private clientId: string;
  private seqCounter = 0;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  private static compareIds(a: RGANodeId, b: RGANodeId): number {
    if (a.seq !== b.seq) {
      return a.seq - b.seq;
    }
    return a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0;
  }

  private findNodeIndexById(id: RGANodeId | null): number {
    if (!id) return -1;
    return this.nodes.findIndex((n) => n.id.clientId === id.clientId && n.id.seq === id.seq);
  }

  /**
   * Returns all active (non-tombstoned) elements in order.
   */
  public toArray(): T[] {
    return this.nodes.filter((n) => !n.deleted).map((n) => n.value);
  }

  /**
   * Inserts an element at a given active index.
   */
  public insert(index: number, value: T): RGANode<T> {
    const activeNodes = this.nodes.filter((n) => !n.deleted);
    let leftId: RGANodeId | null = null;

    if (index > 0 && index <= activeNodes.length) {
      leftId = activeNodes[index - 1].id;
    } else if (index > activeNodes.length && activeNodes.length > 0) {
      leftId = activeNodes[activeNodes.length - 1].id;
    }

    this.seqCounter++;
    const newNode: RGANode<T> = {
      id: { clientId: this.clientId, seq: this.seqCounter },
      value,
      leftId,
      deleted: false,
    };

    this.insertNodeLocally(newNode);
    return newNode;
  }

  /**
   * Deletes an element at a given active index (places a tombstone).
   */
  public remove(index: number): RGANodeId | null {
    const activeNodes = this.nodes.filter((n) => !n.deleted);
    if (index < 0 || index >= activeNodes.length) return null;

    const node = activeNodes[index];
    node.deleted = true;
    return node.id;
  }

  /**
   * Merges a remote node insertion into the list.
   */
  public mergeNode(remote: RGANode<T>): boolean {
    const existingIndex = this.findNodeIndexById(remote.id);
    if (existingIndex !== -1) {
      // If it exists but is now deleted in the remote update, apply tombstone
      if (remote.deleted && !this.nodes[existingIndex].deleted) {
        this.nodes[existingIndex].deleted = true;
        return true;
      }
      return false;
    }

    // Insert remote node based on leftId predecessor
    this.insertNodeLocally(remote);
    return true;
  }

  private insertNodeLocally(node: RGANode<T>) {
    // 1. If leftId is null, insert at the beginning of the list, resolving siblings
    if (!node.leftId) {
      let insertPos = 0;
      while (
        insertPos < this.nodes.length &&
        !this.nodes[insertPos].leftId &&
        RGAList.compareIds(this.nodes[insertPos].id, node.id) > 0
      ) {
        insertPos++;
      }
      this.nodes.splice(insertPos, 0, node);
      return;
    }

    // 2. Find predecessor index
    const leftIdx = this.findNodeIndexById(node.leftId);
    if (leftIdx === -1) {
      // Predecessor has not arrived yet. Push to end as fallback (out of order recovery)
      this.nodes.push(node);
      return;
    }

    // 3. Insert after predecessor, skipping concurrent inserts with higher IDs
    let insertPos = leftIdx + 1;
    while (
      insertPos < this.nodes.length &&
      this.nodes[insertPos].leftId &&
      this.nodes[insertPos].leftId!.clientId === node.leftId.clientId &&
      this.nodes[insertPos].leftId!.seq === node.leftId.seq &&
      RGAList.compareIds(this.nodes[insertPos].id, node.id) > 0
    ) {
      insertPos++;
    }

    this.nodes.splice(insertPos, 0, node);
  }
}
