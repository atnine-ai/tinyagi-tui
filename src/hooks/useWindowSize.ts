import { useState, useEffect } from 'react';

export interface WindowSize {
  columns: number;
  rows: number;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    columns: process.stdout.columns || 120,
    rows: process.stdout.rows || 40,
  });

  useEffect(() => {
    function onResize() {
      setSize({
        columns: process.stdout.columns || 120,
        rows: process.stdout.rows || 40,
      });
    }

    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  return size;
}
