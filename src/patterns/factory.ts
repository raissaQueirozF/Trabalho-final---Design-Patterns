import type { ProcessingStage } from '../core/contracts.js';
import {
  RequiredFieldsStage,
  NormalizeStringFieldsStage,
  UniqueByStage,
} from '../processors/standard.js';

/** Factory Method: subclasses specialize processor creation while clients depend on this creator. */
export abstract class StandardStageFactory {
  protected abstract createRequiredFields<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T>;
  protected abstract createNormalizeStrings<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T>;
  protected abstract createUniqueBy<T extends object>(
    key: (record: T) => unknown,
  ): ProcessingStage<T, T>;
  requiredFields<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T> {
    return this.createRequiredFields<T>(fields);
  }
  normalizeStrings<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T> {
    return this.createNormalizeStrings<T>(fields);
  }
  uniqueBy<T extends object>(
    key: (record: T) => unknown,
  ): ProcessingStage<T, T> {
    return this.createUniqueBy<T>(key);
  }
}

export class DefaultStageFactory extends StandardStageFactory {
  protected createRequiredFields<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T> {
    return new RequiredFieldsStage<T>(fields);
  }

  protected createNormalizeStrings<T extends object>(
    fields: readonly (keyof T)[],
  ): ProcessingStage<T, T> {
    return new NormalizeStringFieldsStage<T>(fields);
  }

  protected createUniqueBy<T extends object>(
    key: (record: T) => unknown,
  ): ProcessingStage<T, T> {
    return new UniqueByStage<T>(key);
  }
}
