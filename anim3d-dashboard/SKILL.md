---
name: anim3d-dashboard
description: "3D em dashboards e painéis de dados: barras/colunas 3D, grafos de dependência, KPIs em profundidade, gêmeo digital operacional (armazém, fábrica, operação ao vivo), diagrama isométrico de arquitetura e transições entre visões. Use ao decidir se e como usar 3D em tela de análise de dados, painel de operação ou diagrama de sistema."
---

# 3D em dashboards

Dashboard serve à **leitura precisa de dados**. 3D distorce comprimento e área, então a regra de partida é: **na dúvida, 2D**.

## Quando 3D se justifica

| Caso | Justifica? | Como |
|---|---|---|
| Topologia / arquitetura / grafo de dependências | Sim | Ortográfica isométrica, nós como blocos, arestas como cabos |
| Mapa geográfico com altura (densidade) | Sim | Colunas sobre mapa plano, rótulos em HTML |
| Série temporal, comparação de valores | **Não** | Gráfico 2D (veja skill `dataviz`) |
| Pizza / rosca 3D | **Não, nunca** | Perspectiva falseia o ângulo |
| Transição entre visões, "wow" de abertura | Pontual | ≤ 600 ms, uma vez por sessão |

## Regras de leitura

1. **Câmera ortográfica**; sem perspectiva a comparação de altura continua honesta.
2. **Valores exatos em HTML**: rótulos, tooltips e tabela acessível ao lado. O 3D mostra a forma, o texto mostra o número.
3. **Eixo e escala visíveis**: linhas de base no chão, grade discreta.
4. **Cor com significado e redundância**: nunca só cor (forma ou rótulo também). Paleta validada da skill `dataviz`.
5. **Sem rotação livre.** Pan limitado + zoom com Ctrl/Cmd + rolagem; a rolagem comum rola a página.
6. **Hover/clique**: destaca o item e abre cartão HTML com detalhes; Esc e clique no vazio fecham.
7. **Animação de dados com propósito**: entrada escalonada (≤ 40 ms entre itens) na primeira carga; atualizações em tempo real interpolam o valor (300 ms), sem refazer a cena.

## Desempenho

- Centenas de itens iguais → `InstancedMesh` com `setMatrixAt`; atualize só o que mudou e marque `instanceMatrix.needsUpdate`.
- `frameloop="demand"`: renderize quando o dado muda ou o usuário interage.
- Dados chegam por WebSocket/polling → atualize `ref`, chame `invalidate()`; não passe cada tick pelo estado do React.
- Pare em aba oculta e fora da viewport.

## Estados obrigatórios

Carregando (esqueleto 2D), vazio (mensagem + ação), erro (mensagem + tentar de novo), sem WebGL (versão SVG/2D completa). O fallback 2D não é opcional: é o que sai em PDF/impressão e em testes.

## Exemplo completo: almoxarifado 3D de ponta a ponta (`exemplo/almoxarifado/`)

App de tela cheia (barra lateral, cabeçalho, sem margens externas) que simula a operação por setores: caminhão → recebimento → conferência → armazenagem (384 posições endereçadas) → separação → esteira → embalagem → expedição → caminhão.

| Arquivo | Papel |
|---|---|
| `dados.ts` | Geometria, catálogo, posições, status de estoque, indicadores, busca. Determinístico (semente). |
| `simulacao.ts` | **Motor sem three.js**: empilhadeiras com fila de etapas (mover, girar, garfo, esperar, ação), caminhões, conferência, esteira com espaçamento, histórico e registros. `passo(dt)` avança; todos os outros só leem. |
| `simulacao.test.ts` | Invariantes: fluxo completo acontece, conservação de paletes, ninguém sai do prédio, esteira sem sobreposição. |
| `AlmoxarifadoCena.tsx` | Prédio por setores, estantes e paletes instanciados, empilhadeiras, caminhões com porta de doca, esteira com envolvedora, OrbitControls com limites e voo da câmera até setor/posição. |
| `Planta.tsx` | Planta 2D ao vivo (SVG atualizado por rAF, sem re-render). |
| `Graficos.tsx` | Linhas, barras, empilhada e medidor em SVG puro. |
| `AlmoxarifadoApp.tsx` + `.css` | Shell do app, painéis por setor, Inventário e Movimentações. |

Padrões a copiar:
- **Simulação separada da cena.** A lógica é testável em Node, e a cena, a planta e os gráficos leem o mesmo estado. React só é notificado 4×/s (`useSyncExternalStore`), e a cena fica em `memo` para não re-renderizar com o painel.
- **Gêmeo digital pode girar.** Aqui a rotação livre é justificada (exploração espacial, não leitura de gráfico), mas com limites (`maxPolarAngle`, distância) e o app em tela cheia, sem rolagem de página para capturar.
- O status do estoque aparece por cor e também em texto (legenda, cartão, tabela).

## Exemplo: ecossistema isométrico (`exemplo/Ecossistema3D*.tsx` + `ecossistemaDados.ts`)

Aplicações → portões de API → dados ← ETL ← fontes, com pacotes em `InstancedMesh` percorrendo `CurvePath` e cartão HTML preso ao sistema em foco. O desenho é um objeto de dados.

## Exemplo: colunas 3D (verificado em navegador)

`exemplo/Colunas3D.tsx` + `exemplo/Colunas3DCena.tsx`: grade de colunas (ex.: região × mês) com `InstancedMesh` (1 draw call), câmera ortográfica enquadrada por `enquadrarOrto`, `frameloop="demand"` com transição de valores que só pede frames enquanto anima, hover com destaque e valor exato em HTML, fallback de barras 2D e tabela acessível. Depende do kit (`../anim3d-fundamentos/kit/`).

**Armadilha medida:** tabela acessível com `class="sr-only"` direto na `<table>` não encolhe (tabela ignora `height: 1px`) e, mesmo absoluta, esticou a página em 600 px. Envolva-a num `<div className="sr-only">`.

## Modelo de dados

O desenho é **dado, não código**. A cena recebe `{ nos, arestas, valores }`; adicionar um painel novo não exige mexer no componente 3D. Para diagramas isométricos de arquitetura, reaproveite `exemplo/Ecossistema3D` (dados em `ecossistemaDados.ts`).

## Checklist

- [ ] 3D realmente supera o gráfico 2D equivalente
- [ ] Ortográfica, sem rotação livre
- [ ] Números exatos em HTML acessível
- [ ] Atualização por `ref` + `invalidate`, sem re-render por tick
- [ ] Fallback 2D completo

## Mapas e globos

Mapa-múndi 3D, globo com fluxos/ataques, mapa por estado (IBGE), centro de comando: use a skill `anim3d-mapas`.
