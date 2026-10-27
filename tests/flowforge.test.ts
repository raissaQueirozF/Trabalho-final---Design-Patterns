import { describe, expect, it } from 'vitest';
import {
  ContinueWhenSafeStrategy,
  createPipeline,
  DefaultStageFactory,
  FilterStage,
  FunctionStageAdapter,
  MapPropertyStage,
  PredicateSpecification,
  RequiredFieldsStage,
  TimedAuditDecorator,
  type ProcessingStage,
} from '../src/index.js';

type Row = { id: string; amount: number; label?: string };
const ctx = { runId: 'test-run', stageIndex: 0 };

describe('standard stages and Specifications', () => {
  it('validates, normalizes, maps, filters and removes duplicates', async () => {
    const f = new DefaultStageFactory();
    const keep = new PredicateSpecification<Row>((r) => r.amount >= 10);
    const result = await createPipeline<Row>()
      .add(f.normalizeStrings<Row>(['id']))
      .add(f.requiredFields<Row>(['id']))
      .add(new MapPropertyStage('id', (id) => id.toUpperCase()))
      .add(f.uniqueBy<Row>((r) => r.id))
      .add(new FilterStage(keep))
      .build()
      .run([
        { id: ' a ', amount: 11 },
        { id: 'a', amount: 99 },
        { id: '', amount: 2 },
      ]);
    expect(result.records).toEqual([{ id: 'A', amount: 11 }]);
    expect(result.rejected).toHaveLength(2);
  });
  it('rejects an invalid empty validation configuration', () => {
    expect(() => new RequiredFieldsStage<Row>([])).toThrow();
  });
  it('composes AND, OR and NOT', () => {
    const large = new PredicateSpecification<number>((n) => n > 10);
    const even = new PredicateSpecification<number>((n) => n % 2 === 0);
    expect(large.and(even).isSatisfiedBy(12)).toBe(true);
    expect(large.or(even).isSatisfiedBy(8)).toBe(true);
    expect(large.not().isSatisfiedBy(8)).toBe(true);
  });
});

describe('pipeline policies, events, adapters and decorators', () => {
  it('requires at least one stage and defaults to stop-on-error', async () => {
    expect(() => createPipeline<Row>().build()).toThrow();
    const fails: ProcessingStage<Row, Row> = {
      name: 'fail',
      execute: () => {
        throw new Error('bad row');
      },
    };
    const result = await createPipeline<Row>()
      .add(fails)
      .build()
      .run([{ id: '1', amount: 1 }]);
    expect(result.status).toBe('failed');
    expect(result.failures[0]?.stage).toBe('fail');
  });
  it('continues only when explicitly marked safe and reports listeners', async () => {
    const safeFail: ProcessingStage<Row, Row> = {
      name: 'safe',
      safeToContinueAfterFailure: true,
      execute: () => {
        throw Error('safe failure');
      },
    };
    const adapter = new FunctionStageAdapter<Row, Row>('copy', (records) => ({
      records: [...records],
    }));
    const pipeline = createPipeline<Row>()
      .withErrorStrategy(new ContinueWhenSafeStrategy())
      .add(safeFail)
      .add(adapter)
      .build();
    const events: string[] = [];
    pipeline.subscribe((event) => {
      events.push(event.type);
      if (event.type === 'pipeline:start') throw Error('observer broke');
    });
    const result = await pipeline.run([{ id: 'x', amount: 1 }]);
    expect(result.records).toEqual([{ id: 'x', amount: 1 }]);
    expect(result.status).toBe('failed');
    expect(result.failures).toHaveLength(1);
    expect(result.listenerFailures).toHaveLength(1);
    expect(events).toContain('listener:failure');
    expect(events).toContain('stage:complete');
  });
  it('does not continue after a transformation failure marked unsafe', async () => {
    const unsafe: ProcessingStage<Row, Row> = {
      name: 'transform',
      execute: () => {
        throw Error('transform failed');
      },
    };
    const pipeline = createPipeline<Row>()
      .withErrorStrategy(new ContinueWhenSafeStrategy())
      .add(unsafe)
      .add(
        new FunctionStageAdapter<Row, Row>('next', (records) => ({ records })),
      )
      .build();
    const result = await pipeline.run([{ id: 'x', amount: 1 }]);
    expect(result.status).toBe('failed');
  });
  it('decorates a stage and preserves its result', async () => {
    const entries: number[] = [];
    let tick = 0;
    const wrapped: ProcessingStage<Row, Row> = {
      name: 'copy',
      execute: (records) => ({ records }),
    };
    const decorator = new TimedAuditDecorator(
      wrapped,
      (entry) => {
        entries.push(entry.outputCount);
      },
      () => tick++ * 3,
    );
    expect(await decorator.execute([{ id: 'x', amount: 1 }], ctx)).toEqual({
      records: [{ id: 'x', amount: 1 }],
    });
    expect(entries).toEqual([1]);
  });
  it('allows a subclass to specialize Factory Method creation', () => {
    class NamedFactory extends DefaultStageFactory {
      protected override createRequiredFields<T extends object>(
        fields: readonly (keyof T)[],
      ): ProcessingStage<T, T> {
        return {
          ...super.createRequiredFields(fields),
          name: 'named-required-fields',
        };
      }
    }
    const stage = new NamedFactory().requiredFields<Row>(['id']);
    expect(stage.name).toBe('named-required-fields');
  });
  it('runs a consumer-owned stage without modifying the executor', async () => {
    class AddLabel implements ProcessingStage<Row, Row & { label: string }> {
      readonly name = 'add-label';
      execute(records: readonly Row[]) {
        return { records: records.map((row) => ({ ...row, label: 'custom' })) };
      }
    }
    const result = await createPipeline<Row>()
      .add(new AddLabel())
      .build()
      .run([{ id: 'x', amount: 1 }]);
    expect(result.records).toEqual([{ id: 'x', amount: 1, label: 'custom' }]);
  });
  it('removes a listener when the unsubscribe function is called', async () => {
    const pipeline = createPipeline<Row>()
      .add(
        new FunctionStageAdapter<Row, Row>('copy', (records) => ({ records })),
      )
      .build();
    let eventCount = 0;
    const unsubscribe = pipeline.subscribe(() => {
      eventCount += 1;
    });
    unsubscribe();
    await pipeline.run([]);
    expect(eventCount).toBe(0);
  });
  it('isolates run ids across executions', async () => {
    const pipeline = createPipeline<Row>()
      .add(
        new FunctionStageAdapter<Row, Row>('copy', (records) => ({ records })),
      )
      .build();
    const [a, b] = await Promise.all([pipeline.run([]), pipeline.run([])]);
    expect(a.runId).not.toBe(b.runId);
  });
});
