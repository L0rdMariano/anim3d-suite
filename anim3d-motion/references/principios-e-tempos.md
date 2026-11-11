# Princípios e tempos (valores de partida)

Números para começar, não leis. Ajuste pela personalidade do estilo e **sempre** valide vendo a animação rodar.

## Durações

| Tipo de movimento | Duração |
|---|---|
| Microinteração (hover, foco, toggle) | 120–200 ms |
| Transição de UI (abrir painel, trocar aba) | 200–350 ms |
| Entrada de elemento | 300–500 ms |
| Troca de cena / voo de câmera | 600–1200 ms |
| Animação ambiente (respiração, flutuação) | 3–6 s por ciclo |
| Loop de fundo (órbita, campo) | 8–30 s |

- **Saída ≈ 60–70% da entrada.**
- **Distância longa → duração um pouco maior**, mas não proporcional (raiz da distância funciona melhor que linear).
- Abaixo de ~100 ms o olho não percebe a curva; acima de ~1 s o usuário espera.

## Curvas (Bézier, do kit: `EASE`)

| Uso | Curva | Sensação |
|---|---|---|
| Algo **entra** na tela | `EASE.entrada` (desacelera no fim) | chega e assenta |
| Algo **sai** da tela | `EASE.saida` (acelera) | vai embora |
| Algo **se move dentro** da tela | `EASE.padrao` (ease in-out) | natural |
| Rotação contínua, barra de progresso | linear | constante, de propósito |

Interface nunca em linear (parece defeito).

## Molas (presets de `motor/mola.ts`)

| Preset | ζ | Sensação | Uso |
|---|---|---|---|
| `suave` | ≈ 1,0 | chega sem oscilar, discreta | UI geral, painéis |
| `padrao` | ≈ 1,0 | quase crítica, um toque de vida | seguir mouse, arrastar |
| `firme` | ≈ 0,87 | rápida, leve ultrapassagem | botões, foco |
| `elastica` | ≈ 0,45 | passa e volta | brinquedo, celebração |
| `pesada` | ≈ 1,2 | lenta e sem ultrapassar | objeto grande, luxo |

ζ < 1 oscila; ζ = 1 é a mais rápida sem oscilar; ζ > 1 é mais lenta. Use `tempoDeAssentamento(preset)` para saber a duração real (ex.: sincronizar uma legenda).

## Os 12 princípios clássicos, aplicados

| Princípio | Em 3D/web |
|---|---|
| Comprimir e esticar | escala volumétrica leve em impacto (≈ 1,05 × 0,95), só em objetos "macios" |
| Antecipação | recuo de 5–10% antes do movimento principal |
| Encenação | um foco por vez; o resto mais apagado |
| Ação direta e pose a pose | defina poses-chave (linha do tempo), deixe a mola/curva preencher |
| Continuidade e sobreposição | partes secundárias terminam 40–120 ms depois |
| Aceleração e desaceleração | nunca linear em interface; mola ou ease |
| Arcos | trajetórias curvas; elevação no meio do caminho |
| Ação secundária | pequeno movimento que reforça (brilho, partículas) sem competir |
| Temporização | rápido = leve/ágil, lento = pesado/importante |
| Exagero | overshoot de UI ≤ 10–15%; elástica só em contexto brincalhão |
| Desenho sólido | volume e perspectiva consistentes (luz e sombra coerentes) |
| Apelo | movimento agradável de ver; teste com olhos, não só com números |

## Coreografia

- **Stagger:** 30–60 ms por item; total ≤ ~400 ms; limite o número de itens escalonados (acima de ~12, agrupe).
- **Ordem:** leitura (esquerda→direita, cima→baixo) ou importância; nunca aleatória em informação.
- **Hierarquia temporal:** o elemento principal começa primeiro e assenta primeiro; os secundários seguem.

## Câmera

- Duração ≥ 600 ms; ease in-out; velocidade angular baixa (rotação rápida causa enjoo).
- Não atravesse geometria; mantenha o horizonte estável.
- Parallax por ponteiro ≤ 8°.
- Troca de alvo no meio do voo: use mola na posição/alvo da câmera (continua a velocidade).

## Loops

- O estado em `t = T` é **igual** ao de `t = 0` **e** com a mesma velocidade (sem "tranco" na emenda).
- Prefira senos com períodos inteiros e/ou `vaivem`.
- Em ambiente: ciclos longos e **fases diferentes** por elemento.

## Independência do FPS

- `amortecer(atual, alvo, k, delta)` do kit para aproximação simples.
- `passoMola(...)` quando precisa de velocidade (analítica: sem Euler).
- Limite `delta` a ~0,1 s ao voltar de aba oculta.

## Movimento reduzido

Mantenha o que **informa** (mudança de estado, progresso), tire o que **decora** (flutuação, parallax, rotação). Troque deslocamento por fade; duração ≤ 150 ms; sem oscilação nem escala grande.
