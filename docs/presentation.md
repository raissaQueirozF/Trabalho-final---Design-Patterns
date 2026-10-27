# Apoio à apresentação

## Roteiro de demonstração

1. `npm ci` e `npm run build` para compilar o pacote.
2. `npm test` para demonstrar os contratos sob teste.
3. Demonstre o cenário principal por `node examples/sales.mjs`, que importa a API pública compilada.
4. `npm pack --dry-run` mostra os arquivos distribuídos.
5. Gere o arquivo com `npm pack --pack-destination examples/consumer`. Em `examples/consumer`, rode `npm install` e `npm run demo`; resultado esperado: `[ {"id":"S-1","amount":100,"tax":8,"total":108} ]` (sem espaços relevantes).

## Oito padrões

| Integrante sugerido | Padrões                   | Problema e alternativa simples                                                                                                 | Consequência sem padrão                                                    |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1                   | Builder, Command          | Builder encadeia configuração; Command uniformiza etapas. Alternativa: arrays de funções e configuração manual.                | Configuração espalhada e executor acoplado a formatos distintos.           |
| 2                   | Strategy, Observer        | Trocar política de erro e observar eventos. Alternativa: condicionais e callbacks fixos.                                       | Executor cresce em ramificações e telemetria fica acoplada.                |
| 3                   | Decorator, Factory Method | Acrescentar auditoria e especializar criação. Alternativa: lógica de auditoria dentro de cada etapa e `new` direto no cliente. | Duplicação de efeitos transversais e criação presa à implementação padrão. |
| 4                   | Adapter, Specification    | Integrar funções e compor regras. Alternativa: wrappers manuais e predicados inline.                                           | Contratos heterogêneos e regras repetidas difíceis de testar.              |

Trechos para mostrar: `ProcessingStage` (`src/core/contracts.ts`), falha segura (`src/core/pipeline.ts`), `TimedAuditDecorator` e `DefaultStageFactory`. O exemplo externo prova OCP porque só implementa o contrato e usa o builder público.

## Perguntas prováveis

- **Por que o pipeline não continua sempre?** A etapa que lança pode ter produzido estado parcial desconhecido. Só continuamos se o autor declara que a entrada anterior segue válida; ainda reportamos a falha.
- **O que acontece se um listener falha?** A falha não altera o resultado de negócio nem interrompe execução; ela aparece em `listenerFailures`, com evento dedicado.
- **Por que Command e Adapter não são o mesmo padrão?** Command modela uma operação executável; Adapter converte uma função existente para esse contrato.
- **A Factory é realmente Factory Method?** Sim: `StandardStageFactory` expõe métodos públicos que delegam em métodos protegidos abstratos e sobrescrevíveis para cada família de operação. `DefaultStageFactory` cria os processadores concretos.
- **O pipeline é transacional?** Não. Ele executa em memória e não reverte efeitos externos; etapas devem evitar efeitos colaterais ou documentá-los.
- **Como a extensão respeita OCP?** O consumidor acrescenta uma classe `ProcessingStage` sem editar o executor ou registrar o tipo.

## Pendências do grupo

Inserir nomes completos, escolher licença e atualizar o link do vídeo. A divisão sugerida atribui dois padrões diferentes por integrante, sem inventar nomes.
