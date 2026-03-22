import { useEffect, useRef } from 'react';
import * as os from 'node:os';
import type { AppAction } from '../types.js';

const POLL_INTERVAL = 3_000;

/**
 * Poll system CPU and memory stats every 3 seconds.
 * CPU is derived from os.cpus() idle delta between polls.
 */
export function useSystemStats(dispatch: React.Dispatch<AppAction>): void {
  const prevCpuRef = useRef<{ idle: number; total: number } | null>(null);

  useEffect(() => {
    function getCpuTotals() {
      const cpus = os.cpus();
      let idle = 0;
      let total = 0;
      for (const cpu of cpus) {
        idle += cpu.times.idle;
        total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
      }
      return { idle, total };
    }

    // Seed the first measurement
    prevCpuRef.current = getCpuTotals();

    const timer = setInterval(() => {
      const now = getCpuTotals();
      const prev = prevCpuRef.current!;
      const idleDelta = now.idle - prev.idle;
      const totalDelta = now.total - prev.total;
      const cpuUsage = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
      prevCpuRef.current = now;

      const memTotal = os.totalmem();
      const memFree = os.freemem();
      const memUsed = memTotal - memFree;
      const loadAvg = os.loadavg()[0] || 0;

      dispatch({
        type: 'SET_SYSTEM_STATS',
        stats: { cpuUsage, memUsed, memTotal, loadAvg },
      });
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [dispatch]);
}
