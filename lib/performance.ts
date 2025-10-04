import { InteractionManager } from 'react-native';

export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();
  private static interactions: Map<string, number> = new Map();

  static startMeasure(label: string): void {
    this.metrics.set(label, Date.now());
    console.log(`[Performance] Started: ${label}`);
  }

  static endMeasure(label: string): number {
    const startTime = this.metrics.get(label);
    if (!startTime) {
      console.warn(`[Performance] No start time found for: ${label}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.delete(label);
    console.log(`[Performance] ${label}: ${duration}ms`);
    return duration;
  }

  static async runAfterInteractions<T>(callback: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(async () => {
        const result = await callback();
        resolve(result);
      });
    });
  }

  static trackInteraction(name: string): void {
    const count = this.interactions.get(name) || 0;
    this.interactions.set(name, count + 1);
    console.log(`[Performance] Interaction: ${name} (${count + 1})`);
  }

  static getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.interactions.forEach((count, name) => {
      metrics[name] = count;
    });
    return metrics;
  }

  static clearMetrics(): void {
    this.metrics.clear();
    this.interactions.clear();
    console.log('[Performance] Metrics cleared');
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export async function measureAsync<T>(
  label: string,
  callback: () => Promise<T>
): Promise<T> {
  PerformanceMonitor.startMeasure(label);
  try {
    const result = await callback();
    PerformanceMonitor.endMeasure(label);
    return result;
  } catch (error) {
    PerformanceMonitor.endMeasure(label);
    throw error;
  }
}

export function measureSync<T>(label: string, callback: () => T): T {
  PerformanceMonitor.startMeasure(label);
  try {
    const result = callback();
    PerformanceMonitor.endMeasure(label);
    return result;
  } catch (error) {
    PerformanceMonitor.endMeasure(label);
    throw error;
  }
}
