type BreakerState = "OPENED" | "HALF" | "CLOSED";

/**
 * Circuit Breaker pattern for handling requests to the remote playback state.
 * Reduces failed requests when Kenku FM is closed.
 * https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern
 */
export class CircuitBreaker<T> {
  private state: BreakerState = "OPENED";
  private readonly openTimeout = 10000;
  private readonly closedTimeout = 15000;
  private readonly failedRequestThreshold = 5;
  private readonly failedRequestPercentageThreshold = 50;

  private halfFinishTime: number | undefined;
  private closedRetryTime: number | undefined;

  private failCount = 0;
  private successCount = 0;

  constructor(private readonly request: () => Promise<T>) {}

  async fire(): Promise<T> {
    if (this.state === "CLOSED") {
      if (!this.closedRetryTime || Date.now() <= this.closedRetryTime) {
        throw new Error("Breaker is closed");
      }
    }

    try {
      const response = await this.request();
      return this.success(response);
    } catch (e) {
      this.fail();
      throw e;
    }
  }

  private resetStatistics(): void {
    this.successCount = 0;
    this.failCount = 0;
    this.halfFinishTime = undefined;
  }

  private success(response: T): T {
    if (this.state === "HALF") {
      this.successCount++;
      if (this.halfFinishTime && Date.now() >= this.halfFinishTime) {
        this.state = "OPENED";
        this.resetStatistics();
      }
    }

    if (this.state === "CLOSED") {
      this.state = "OPENED";
      this.resetStatistics();
    }
    return response;
  }

  private fail(): void {
    if (this.state === "CLOSED") {
      this.closedRetryTime = Date.now() + this.closedTimeout;
      return;
    }

    if (this.state === "OPENED") {
      this.failCount = 1;
      this.state = "HALF";
      this.halfFinishTime = Date.now() + this.openTimeout;
      return;
    }

    if (this.state === "HALF") {
      this.failCount++;

      if (this.halfFinishTime && Date.now() > this.halfFinishTime) {
        this.resetStatistics();
        this.failCount = 1;
        this.halfFinishTime = Date.now() + this.openTimeout;
        return;
      }

      if (this.failCount >= this.failedRequestThreshold) {
        const failRate =
          (this.failCount * 100) / (this.failCount + this.successCount);
        if (failRate >= this.failedRequestPercentageThreshold) {
          this.state = "CLOSED";
          this.resetStatistics();
          this.closedRetryTime = Date.now() + this.closedTimeout;
          return;
        }

        this.resetStatistics();
        this.failCount = 1;
        this.halfFinishTime = Date.now() + this.openTimeout;
      }
    }
  }
}
