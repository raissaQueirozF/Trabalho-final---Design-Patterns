export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T> {
    return new CompositeSpecification(
      (value) => this.isSatisfiedBy(value) && other.isSatisfiedBy(value),
    );
  }
  or(other: Specification<T>): Specification<T> {
    return new CompositeSpecification(
      (value) => this.isSatisfiedBy(value) || other.isSatisfiedBy(value),
    );
  }
  not(): Specification<T> {
    return new CompositeSpecification((value) => !this.isSatisfiedBy(value));
  }
}

class CompositeSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly predicate: (candidate: T) => boolean) {
    super();
  }
  isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
}

export class PredicateSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly predicate: (candidate: T) => boolean) {
    super();
  }
  isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
}
