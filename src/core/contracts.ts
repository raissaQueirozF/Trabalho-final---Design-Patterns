export type StageResult<T> = {
  readonly records: readonly T[];
  readonly rejected?: readonly unknown[];
};

export interface ProcessingContext {
  readonly runId: string;
  readonly stageIndex: number;
}

/** A Command: one independently executable pipeline operation. */
export interface ProcessingStage<Input, Output> {
  readonly name: string;
  readonly safeToContinueAfterFailure?: boolean;
  execute(
    records: readonly Input[],
    context: ProcessingContext,
  ): StageResult<Output> | Promise<StageResult<Output>>;
}

export type PipelineEvent =
  | { readonly type: 'pipeline:start'; readonly runId: string }
  | {
      readonly type: 'stage:start';
      readonly runId: string;
      readonly stage: string;
      readonly stageIndex: number;
    }
  | {
      readonly type: 'stage:complete';
      readonly runId: string;
      readonly stage: string;
      readonly stageIndex: number;
      readonly recordCount: number;
      readonly rejectedCount: number;
    }
  | {
      readonly type: 'stage:failure';
      readonly runId: string;
      readonly stage: string;
      readonly stageIndex: number;
      readonly error: Error;
    }
  | {
      readonly type: 'pipeline:complete';
      readonly runId: string;
      readonly status: 'completed' | 'failed';
    }
  | {
      readonly type: 'listener:failure';
      readonly runId: string;
      readonly eventType: PipelineEvent['type'];
      readonly error: Error;
    };

export type PipelineListener = (event: PipelineEvent) => void | Promise<void>;
export type StageFailure = {
  readonly stage: string;
  readonly stageIndex: number;
  readonly error: Error;
  readonly safeToContinue: boolean;
};
export interface ErrorStrategy {
  readonly name: string;
  onFailure(failure: StageFailure): 'continue' | 'stop';
}
export type PipelineResult<T> = {
  readonly runId: string;
  readonly status: 'completed' | 'failed';
  readonly records: readonly T[];
  readonly rejected: readonly unknown[];
  readonly failures: readonly StageFailure[];
  readonly listenerFailures: readonly Error[];
};
