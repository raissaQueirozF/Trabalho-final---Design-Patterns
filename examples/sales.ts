import {
  createPipeline,
  DefaultStageFactory,
  FilterStage,
  MapPropertyStage,
  PredicateSpecification,
  TimedAuditDecorator,
} from '../src/index.js';

type Sale = { id: string; customer: string; amount: number; status: string };
const factory = new DefaultStageFactory();
const audits: unknown[] = [];
const minimumAmount = new PredicateSpecification<Sale>(
  (sale) => sale.amount >= 50,
);
const pipeline = createPipeline<Sale>()
  .add(
    new TimedAuditDecorator(
      factory.normalizeStrings<Sale>(['customer', 'status']),
      (entry) => {
        audits.push(entry);
      },
    ),
  )
  .add(factory.requiredFields<Sale>(['id', 'customer']))
  .add(new MapPropertyStage('status', (status) => status.toUpperCase()))
  .add(factory.uniqueBy<Sale>((sale) => sale.id))
  .add(new FilterStage(minimumAmount))
  .build();
pipeline.subscribe((event) => {
  if (event.type === 'stage:complete')
    console.log(`${event.stage}: ${event.recordCount} registros`);
  if (event.type === 'stage:failure') console.error(event.error);
});

const input: Sale[] = [
  { id: 'A-1', customer: '  Loja Um ', amount: 120, status: 'approved' },
  { id: 'A-2', customer: 'Loja Dois', amount: 20, status: 'pending' },
  { id: 'A-1', customer: 'Duplicata', amount: 80, status: 'approved' },
  { id: 'A-3', customer: '', amount: 90, status: 'approved' },
];
const result = await pipeline.run(input);
console.log(JSON.stringify({ result, audits }));
