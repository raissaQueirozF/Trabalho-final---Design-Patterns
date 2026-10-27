import type {
  ProcessingContext,
  ProcessingStage,
  StageResult,
} from '../core/contracts.js';

/** Adapter turns a plain sync/async function into a pipeline Command. */
export class FunctionStageAdapter<Input, Output> implements ProcessingStage<
  Input,
  Output
> {
  constructor(
    readonly name: string,
    private readonly operation: (
      records: readonly Input[],
      context: ProcessingContext,
    ) => StageResult<Output> | Promise<StageResult<Output>>,
  ) {
    if (!name.trim()) throw new Error('Adapter stage name cannot be empty.');
  }
  execute(
    records: readonly Input[],
    context: ProcessingContext,
  ): StageResult<Output> | Promise<StageResult<Output>> {
    return this.operation(records, context);
  }
}
