# Auditoria do kit de skills (2026-11-11)

Escopo: as 16 skills `anim3d-*`, README, plano mestre, galeria e cópias instaladas em `~/.claude/skills`. Método: comparar o que está escrito com o que existe (contagens, arquivos, testes, diferenças de pasta, imports reais), não opinião.

**Veredito:** motor e testes sólidos (métricas de testes da galeria batem com a contagem real). O que "viajava" era a **documentação defasada**, **afirmações sem fonte**, **dependências entre skills não declaradas** (instalação isolada quebrava) e **nenhuma medição de roteamento**. Tudo isso foi tratado; restam os itens da última tabela.

## Corrigido

| Achado | Evidência | Correção |
|---|---|---|
| README listava 8 de 16 skills; plano mestre dizia "10 skills" | contagem de pastas | tabelas e contagem atualizadas |
| Imports entre skills sem declaração (instalar uma skill sozinha quebrava) | `mapas`→`saas`, `rede-logica`→`infra-fisica`/`topologia`, `infra-validacao`→`infra-fisica`, exemplo do rack→3 skills | `dependencias` e `dependenciasExemplo` no `skill.meta.json`; o validador **falha** se um import não estiver declarado |
| **Ciclo** entre skills que eu mesmo criei (`infra-fisica` ↔ `rede-logica`) | grafo de imports | exemplo passou a `dependenciasExemplo`; o validador barra ciclos em `dependencias` |
| `skill.meta.json` com texto livre em vez de nome de skill (`motion`) | o novo validador acusou | corrigido para `anim3d-fundamentos` |
| 10 skills antigas sem `skill.meta.json` | validador (avisos) | criados (versão, licenças, dependências); a `mapas` registra a ODbL dos dados derivados |
| Fonte × instalada divergentes; instalação manual por `cp` (lacuna L7) | `diff` de 13 pastas | `scripts/instalar.mjs` (6 testes): resolve dependências, `--dry-run`, nunca sobrescreve sem `--force`, `--sem-exemplos`; cópias sincronizadas |
| Nenhuma medição de se as skills disparam | inexistente | `evals/roteamento.json` (33 pedidos) + `npm run avaliar:roteamento`; achou 2 descrições com defeito (gêmeo digital e diagrama isométrico), corrigidas em `dashboard` e `infra-validacao` |
| Cores hex soltas no exemplo novo | validador | cores de luz viraram tokens; o validador agora **reporta** hex por skill |
| Afirmações sem teste ou sem fonte (âncora desligada, padrão EIA, números do Wi-Fi, receitas de animação não implementadas) | leitura crítica | teste acrescentado; textos reduzidos ao verificado; seção "Origem dos números"; receitas marcadas "proposta" |
| Defeitos encontrados pelo exemplo do rack | execução no navegador | nó de calha por andar, limite de 100 m por canal, colisão de nome de arquivo (todos com teste) |

## Ainda aberto

| # | Achado | Por que não foi feito agora | Próximo passo |
|---|---|---|---|
| 1 | **Cores hex soltas nas skills antigas** (dashboard 108, topologia 77, mapas 21, mobile 21, motion 15, saas 6) | migrar ~250 cores para tokens sem teste visual automatizado arrisca regressão silenciosa de aparência | capturas de referência por exemplo, depois migrar uma skill por vez; o validador já mostra o número e impede esquecer |
| 2 | O proxy de roteamento é lexical e os 33 casos foram escritos e ajustados por mim (100% é otimista) | não há como chamar o agente real de dentro do repositório | casos novos de quem usa; rodar com o agente de verdade quando houver acesso; separar um conjunto de teste que ninguém ajusta |
| 3 | `anim3d-wifi-rf` e `anim3d-rede-logica` sem exemplo visual | pelo padrão, 1 exemplo por skill | Wi-Fi sobre a planta do `RackEmpresa` |
| 4 | Números do Wi-Fi sem fonte primária | não há norma ou datasheet citável no repositório | confirmar com fabricante ou site survey |
| 5 | Compatibilidade "verificado" só em `estilos` e `motion`; demais "a confirmar" | sem acesso a Codex, Gemini CLI e Cursor | testar quando houver acesso |
| 6 | Projetos de inspiração do rack sem autor, URL e licença | não verificável daqui | preencher `anim3d-infra-fisica/references/inspiracoes.md` |
| 7 | `cena-3d-isometrica` vive só em `~/.claude/skills`, fora da fonte e do instalador | pertence ao dono decidir se entra na suíte | copiar para a fonte e dar `skill.meta.json` |
| 8 | ODbL do `paises.json` e o `git push` | decisão do dono, já registrada no plano | decidir antes de publicar |

## O que a auditoria não cobriu

Não revisei o conteúdo técnico das skills antigas linha a linha (SaaS, mobile, app-ui, assets) e não testei em outros agentes além do Claude Code.
