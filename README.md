# FlowForge

Biblioteca TypeScript para montar e executar pipelines de processamento de registros em memória. O consumidor combina operações tipadas sem alterar o executor para cada nova operação.

## Escopo

FlowForge trata dados em memória, de forma assíncrona e sem servidor ou interface. O exemplo usa vendas fictícias. O executor transmite os registros aceitos de cada etapa para a seguinte; registros recusados por validação ou filtro ficam em `rejected`; erros de etapa ficam em `failures`. Uma falha interrompe o fluxo por padrão. A estratégia `ContinueWhenSafeStrategy` continua somente quando a etapa marca explicitamente que preservar a entrada é seguro; a execução ainda relata falha.

Listeners são aguardados em sequência. Exceções dos listeners não interrompem o pipeline: são acumuladas em `listenerFailures` e notificadas pelo evento `listener:failure`. Cada execução cria seu próprio identificador e acumula seus próprios resultados. Dados não são clonados genericamente: etapas que transformam registros devem retornar novos objetos se precisarem evitar mutação.

## Requisitos e instalação

- Node.js 22 ou superior; desenvolvido e validado no Node v24.15.0.
- TypeScript 5.8+, npm 11+.

```sh
npm install
npm run build
npm test
npm run demo:sales
```

Para instalar o artefato local em outro projeto antes de uma eventual publicação, gere o tarball e instale-o no consumidor:

```sh
npm pack --pack-destination examples/consumer
cd examples/consumer
npm install
npm run demo
```

O pacote ainda não foi publicado no registry npm.

## Uso

```ts
import {
  createPipeline,
  DefaultStageFactory,
  FilterStage,
  PredicateSpecification,
} from 'flowforge';

type Sale = { id: string; amount: number };
const stages = new DefaultStageFactory();
const eligible = new PredicateSpecification<Sale>((sale) => sale.amount >= 50);
const pipeline = createPipeline<Sale>()
  .add(stages.requiredFields<Sale>(['id']))
  .add(new FilterStage(eligible))
  .build();
const result = await pipeline.run([{ id: 'S-1', amount: 80 }]);
console.log(result.records);
```

O exemplo completo com normalização, validação, transformação, deduplicação, filtro, listener e auditoria está em [`examples/sales.ts`](examples/sales.ts). Para demonstrar uma classe de etapa feita por consumidor, veja [`examples/consumer/custom-stage.ts`](examples/consumer/custom-stage.ts) e [`examples/consumer/custom-stage.mjs`](examples/consumer/custom-stage.mjs). O script consumidor importa o pacote compilado/empacotado.

## Falhas, eventos e observabilidade

`StopOnErrorStrategy` interrompe na primeira exceção de etapa. `ContinueWhenSafeStrategy` só segue se a etapa declarou `safeToContinueAfterFailure`; nesse caso, preserva-se a entrada anterior, e a falha continua visível no resultado. Use essa marca apenas para etapas cujo efeito permite essa semântica. Listeners podem ser removidos usando a função retornada por `subscribe`.

`TimedAuditDecorator` mede tempo e chama um `AuditSink`, preservando o resultado da etapa. Falha no sink também falha a etapa decorada e é tratada pela estratégia do pipeline.

## Design Patterns e localização

| Padrão         | Participantes                                 | Arquivos                                              | Demonstração/teste                             |
| -------------- | --------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Builder        | `PipelineBuilder`, `Pipeline`                 | `src/core/pipeline.ts`                                | `examples/sales.ts`, `tests/flowforge.test.ts` |
| Command        | `ProcessingStage`, operações                  | `src/core/contracts.ts`, `src/processors/standard.ts` | operação customizada e testes                  |
| Strategy       | `ErrorStrategy`, duas estratégias             | `src/core/strategies.ts`                              | testes de falha segura/insegura                |
| Observer       | `subscribe`, listeners/eventos                | `src/core/pipeline.ts`, `src/core/contracts.ts`       | teste de eventos e listener quebrado           |
| Decorator      | `TimedAuditDecorator`                         | `src/patterns/decorators.ts`                          | teste de preservação e auditoria               |
| Factory Method | `StandardStageFactory`, `DefaultStageFactory` | `src/patterns/factory.ts`                             | teste de criação                               |
| Adapter        | `FunctionStageAdapter`                        | `src/patterns/adapter.ts`                             | usado em testes                                |
| Specification  | `BaseSpecification`, `PredicateSpecification` | `src/patterns/specification.ts`                       | teste AND/OR/NOT                               |

## SOLID

- **SRP:** executor, estratégias, operações, regras e auditoria têm responsabilidades separadas.
- **OCP/DIP:** o executor usa `ProcessingStage` e pode aceitar uma implementação de consumidor sem conhecer a classe concreta.
- **LSP/ISP:** operações compartilham um contrato pequeno; quem implementa processamento não precisa implementar API de eventos ou auditoria.

## Desenvolvimento

```sh
npm test
npm run typecheck
npm run build
npm run lint
npm pack --dry-run
```

Arquitetura e apresentação: [`docs/architecture.md`](docs/architecture.md), [`docs/presentation.md`](docs/presentation.md), [`docs/checklists.md`](docs/checklists.md).

## Limitações e pendências

- Sem persistência, paralelismo entre registros, retentativas ou streaming; todas as etapas rodam sequencialmente em memória.
- Falha de uma etapa não oferece isolamento ou rollback de efeitos colaterais externos.
- Nome completo dos integrantes: **[PENDENTE — fornecer nomes do grupo]**.
- Link do vídeo: **[PENDENTE — adicionar link do YouTube]**.
- Licença: **[PENDENTE — decisão do grupo]**. O pacote declara `UNLICENSED` até essa decisão; não distribuir publicamente antes de resolver.

## Licença

Pendente de decisão do grupo. Ver [`LICENSE-PENDING.md`](LICENSE-PENDING.md).
