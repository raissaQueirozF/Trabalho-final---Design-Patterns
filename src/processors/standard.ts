import type { ProcessingStage, StageResult } from '../core/contracts.js';
import type { Specification } from '../patterns/specification.js';

export class RequiredFieldsStage<T extends object> implements ProcessingStage<
  T,
  T
> {
  readonly name = 'required-fields';
  constructor(private readonly fields: readonly (keyof T)[]) {
    if (!fields.length)
      throw new Error('At least one required field must be configured.');
  }
  execute(records: readonly T[]): StageResult<T> {
    const accepted: T[] = [];
    const rejected: T[] = [];
    for (const record of records) {
      if (
        this.fields.every(
          (field) =>
            record[field] !== undefined &&
            record[field] !== null &&
            record[field] !== '',
        )
      )
        accepted.push(record);
      else rejected.push(record);
    }
    return { records: accepted, rejected };
  }
}

export class NormalizeStringFieldsStage<
  T extends object,
> implements ProcessingStage<T, T> {
  readonly name = 'normalize-strings';
  constructor(private readonly fields: readonly (keyof T)[]) {}
  execute(records: readonly T[]): StageResult<T> {
    return {
      records: records.map((record) => {
        const normalized = { ...record };
        for (const field of this.fields) {
          const value: unknown = record[field];
          if (typeof value === 'string')
            Object.assign(normalized, {
              [field]: value.trim().replace(/\s+/g, ' '),
            });
        }
        return normalized;
      }),
    };
  }
}

export class MapPropertyStage<
  T extends object,
  K extends keyof T,
> implements ProcessingStage<T, T> {
  readonly name: string;
  constructor(
    private readonly field: K,
    private readonly transform: (value: T[K], record: T) => T[K],
    name = `map-${String(field)}`,
  ) {
    this.name = name;
  }
  execute(records: readonly T[]): StageResult<T> {
    return {
      records: records.map((record) => ({
        ...record,
        [this.field]: this.transform(record[this.field], record),
      })),
    };
  }
}

export class FilterStage<T> implements ProcessingStage<T, T> {
  readonly name: string;
  constructor(
    private readonly specification: Specification<T>,
    name = 'filter',
  ) {
    this.name = name;
  }
  execute(records: readonly T[]): StageResult<T> {
    const accepted: T[] = [];
    const rejected: T[] = [];
    for (const record of records)
      (this.specification.isSatisfiedBy(record) ? accepted : rejected).push(
        record,
      );
    return { records: accepted, rejected };
  }
}

export class UniqueByStage<T> implements ProcessingStage<T, T> {
  readonly name = 'unique-by';
  constructor(private readonly keyOf: (record: T) => unknown) {}
  execute(records: readonly T[]): StageResult<T> {
    const seen = new Set<unknown>();
    const accepted: T[] = [];
    const rejected: T[] = [];
    for (const record of records) {
      const key = this.keyOf(record);
      if (seen.has(key)) rejected.push(record);
      else {
        seen.add(key);
        accepted.push(record);
      }
    }
    return { records: accepted, rejected };
  }
}
