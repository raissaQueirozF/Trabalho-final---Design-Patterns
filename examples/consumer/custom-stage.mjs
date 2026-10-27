import { createPipeline } from 'flowforge';

class AddTaxTotal {
  name = 'add-tax-total';
  execute(records) {
    return {
      records: records.map((sale) => ({
        ...sale,
        total: sale.amount + sale.tax,
      })),
    };
  }
}

const result = await createPipeline()
  .add(new AddTaxTotal())
  .build()
  .run([{ id: 'S-1', amount: 100, tax: 8 }]);
console.log(JSON.stringify(result.records));
if (result.records[0]?.total !== 108)
  throw new Error('Consumer extension returned an unexpected result.');
