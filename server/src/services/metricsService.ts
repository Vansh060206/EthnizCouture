export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private statusCodes: Record<string, number> = {};
  private durations: number[] = [];
  private readonly maxDurationsSample = 1000;
  private slowRequestsCount = 0;
  private paymentFailures = 0;
  private inventoryConflicts = 0;
  private startTime = Date.now();

  recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    
    // Group status codes
    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    this.statusCodes[statusKey] = (this.statusCodes[statusKey] || 0) + 1;

    if (statusCode >= 400) {
      this.totalErrors++;
    }

    if (durationMs > 500) {
      this.slowRequestsCount++;
    }

    // Keep rolling sample of recent durations for percentile calculations
    this.durations.push(durationMs);
    if (this.durations.length > this.maxDurationsSample) {
      this.durations.shift();
    }
  }

  recordPaymentFailure(): void {
    this.paymentFailures++;
  }

  recordInventoryConflict(): void {
    this.inventoryConflicts++;
  }

  getMetrics() {
    const sorted = [...this.durations].sort((a, b) => a - b);
    const count = sorted.length;
    const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
    const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;
    const avg = count > 0 ? Math.round((sorted.reduce((a, b) => a + b, 0) / count) * 100) / 100 : 0;

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate: this.totalRequests > 0 ? Math.round((this.totalErrors / this.totalRequests) * 10000) / 100 : 0,
      statusCodes: this.statusCodes,
      latency: {
        avgMs: avg,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        sampleSize: count,
        slowRequestsOver500ms: this.slowRequestsCount
      },
      events: {
        paymentFailures: this.paymentFailures,
        inventoryConflicts: this.inventoryConflicts
      },
      memoryUsage: {
        heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100
      }
    };
  }
}

export const metricsService = new MetricsService();
