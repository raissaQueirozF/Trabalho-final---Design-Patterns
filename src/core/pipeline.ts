import type {
  ErrorStrategy,
  PipelineEvent,
  PipelineListener,
  PipelineResult,
  ProcessingStage,
  StageFailure,
} from './contracts.js';
import { StopOnErrorStrategy } from './strategies.js';

type ErasedStage = ProcessingStage<unknown, unknown>;

/** Pipeline executor (Builder constructs this immutable stage list). */
export class Pipeline<Input, Output> {
  private readonly listeners = new Set<PipelineListener>();
  constructor(
    private readonly stages: readonly ErasedStage[],
    private readonly strategy: ErrorStrategy,
  ) {}

  subscribe(listener: PipelineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async run(input: readonly Input[]): Promise<PipelineResult<Output>> {
    const runId = globalThis.crypto.randomUUID();
    const failures: StageFailure[] = [];
    const listenerFailures: Error[] = [];
    const rejected: unknown[] = [];
    let records: readonly unknown[] = input;
    let status: PipelineResult<Output>['status'] = 'completed';
    await this.emit({ type: 'pipeline:start', runId }, listenerFailures);
    for (const [stageIndex, stage] of this.stages.entries()) {
      await this.emit(
        { type: 'stage:start', runId, stage: stage.name, stageIndex },
        listenerFailures,
      );
      try {
        const result = await stage.execute(records, { runId, stageIndex });
        records = result.records;
        if (result.rejected) rejected.push(...result.rejected);
        await this.emit(
          {
            type: 'stage:complete',
            runId,
            stage: stage.name,
            stageIndex,
            recordCount: records.length,
            rejectedCount: result.rejected?.length ?? 0,
          },
          listenerFailures,
        );
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        const failure: StageFailure = {
          stage: stage.name,
          stageIndex,
          error,
          safeToContinue: stage.safeToContinueAfterFailure === true,
        };
        failures.push(failure);
        await this.emit(
          {
            type: 'stage:failure',
            runId,
            stage: stage.name,
            stageIndex,
            error,
          },
          listenerFailures,
        );
        if (this.strategy.onFailure(failure) === 'stop') {
          status = 'failed';
          break;
        }
      }
    }
    if (failures.length > 0) status = 'failed';
    await this.emit(
      { type: 'pipeline:complete', runId, status },
      listenerFailures,
    );
    return {
      runId,
      status,
      records: records as readonly Output[],
      rejected,
      failures,
      listenerFailures,
    };
  }

  private async emit(event: PipelineEvent, failures: Error[]): Promise<void> {
    for (const listener of [...this.listeners]) {
      try {
        await listener(event);
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        failures.push(error);
        if (event.type !== 'listener:failure') {
          for (const observer of [...this.listeners]) {
            try {
              await observer({
                type: 'listener:failure',
                runId: event.runId,
                eventType: event.type,
                error,
              });
            } catch (nested) {
              failures.push(
                nested instanceof Error ? nested : new Error(String(nested)),
              );
            }
          }
        }
      }
    }
  }
}

export class PipelineBuilder<Input, Current = Input> {
  private readonly stages: ErasedStage[] = [];
  private strategy: ErrorStrategy = new StopOnErrorStrategy();
  add<Next>(
    stage: ProcessingStage<Current, Next>,
  ): PipelineBuilder<Input, Next> {
    this.stages.push(stage as ErasedStage);
    return this as unknown as PipelineBuilder<Input, Next>;
  }
  withErrorStrategy(strategy: ErrorStrategy): this {
    this.strategy = strategy;
    return this;
  }
  build(): Pipeline<Input, Current> {
    if (this.stages.length === 0)
      throw new Error('A pipeline must contain at least one stage.');
    return new Pipeline<Input, Current>([...this.stages], this.strategy);
  }
}

export function createPipeline<Input>(): PipelineBuilder<Input> {
  return new PipelineBuilder<Input>();
}
