import type {
  ProcessingContext,
  ProcessingStage,
  StageResult,
} from '../core/contracts.js';

export interface AuditEntry {
  readonly stage: string;
  readonly runId: string;
  readonly inputCount: number;
  readonly outputCount: number;
  readonly durationMs: number;
}
export type AuditSink = (entry: AuditEntry) => void | Promise<void>;

/** Decorator adds timing and audit output while preserving the wrapped stage result. */
export class TimedAuditDecorator<Input, Output> implements ProcessingStage<
  Input,
  Output
> {
  readonly name: string;
  get safeToContinueAfterFailure(): boolean {
    return this.wrapped.safeToContinueAfterFailure === true;
  }
  constructor(
    private readonly wrapped: ProcessingStage<Input, Output>,
    private readonly sink: AuditSink,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.name = wrapped.name;
  }
  async execute(
    records: readonly Input[],
    context: ProcessingContext,
  ): Promise<StageResult<Output>> {
    const start = this.now();
    let result: StageResult<Output>;
    try {
      result = await this.wrapped.execute(records, context);
    } catch (error) {
      await this.sink({
        stage: this.name,
        runId: context.runId,
        inputCount: records.length,
        outputCount: 0,
        durationMs: this.now() - start,
      });
      throw error;
    }
    await this.sink({
      stage: this.name,
      runId: context.runId,
      inputCount: records.length,
      outputCount: result.records.length,
      durationMs: this.now() - start,
    });
    return result;
  }
}
