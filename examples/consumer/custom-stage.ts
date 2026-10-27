import {
  createPipeline,
  type ProcessingStage,
  type StageResult,
} from 'flowforge';

type Sale = { id: string; amount: number; tax: number };

// Consumer-owned Command: FlowForge core does not know this class exists.
class AddTaxTotal implements ProcessingStage<Sale, Sale & { total: number }> {
  readonly name = 'add-tax-total';
  execute(records: readonly Sale[]): StageResult<Sale & { total: number }> {
    return {
      records: records.map((sale) => ({
        ...sale,
        total: sale.amount + sale.tax,
      })),
    };
  }
}

const pipeline = createPipeline<Sale>().add(new AddTaxTotal()).build();
const result = await pipeline.run([{ id: 'S-1', amount: 100, tax: 8 }]);
console.log(JSON.stringify(result.records));
