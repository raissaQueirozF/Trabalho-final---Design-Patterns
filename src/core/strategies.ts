import type { ErrorStrategy, StageFailure } from './contracts.js';

export class StopOnErrorStrategy implements ErrorStrategy {
  readonly name = 'stop-on-error';
  onFailure(): 'stop' {
    return 'stop';
  }
}

/** Continues only when the failing stage explicitly guarantees its input remains valid. */
export class ContinueWhenSafeStrategy implements ErrorStrategy {
  readonly name = 'continue-when-safe';
  onFailure(failure: StageFailure): 'continue' | 'stop' {
    return failure.safeToContinue ? 'continue' : 'stop';
  }
}
