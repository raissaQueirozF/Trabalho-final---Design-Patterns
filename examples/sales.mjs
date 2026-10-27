import {
  createPipeline,
  DefaultStageFactory,
  FilterStage,
  MapPropertyStage,
  PredicateSpecification,
  TimedAuditDecorator,
} from 'flowforge';

const factory = new DefaultStageFactory();
const eligible = new PredicateSpecification((sale) => sale.amount >= 50);
const audits = [];
const pipeline = createPipeline()
  .add(
    new TimedAuditDecorator(
      factory.normalizeStrings(['customer', 'status']),
      (entry) => audits.push(entry),
    ),
  )
  .add(factory.requiredFields(['id', 'customer']))
  .add(new MapPropertyStage('status', (status) => status.toUpperCase()))
  .add(factory.uniqueBy((sale) => sale.id))
  .add(new FilterStage(eligible))
  .build();
const events = [];
pipeline.subscribe((event) => events.push(event.type));

const input = [
  { id: 'A-1', customer: '  Loja Um ', amount: 120, status: 'approved' },
  { id: 'A-2', customer: 'Loja Dois', amount: 20, status: 'pending' },
  { id: 'A-1', customer: 'Duplicata', amount: 80, status: 'approved' },
  { id: 'A-3', customer: '', amount: 90, status: 'approved' },
];
const result = await pipeline.run(input);
console.log(JSON.stringify({ result, audits, events }, null, 2));
