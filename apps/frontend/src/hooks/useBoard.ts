import { useEffect, useState } from 'react';
import { globalBoardStore, BoardStore } from '../crdt/boardStore';

export function useBoard(): BoardStore {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Subscribe to store notifications to trigger state re-renders in React
    const unsubscribe = globalBoardStore.subscribe(() => {
      setTick((tick) => tick + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return globalBoardStore;
}
