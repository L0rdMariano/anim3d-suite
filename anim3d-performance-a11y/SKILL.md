---
name: anim3d-performance-a11y
description: "Desempenho, fallback e acessibilidade de toda animação 3D da suíte anim3d: detecção de WebGL, movimento reduzido, carga sob demanda, degradação adaptativa, medição e testes. Use antes de entregar ou ao diagnosticar lentidão em cena 3D."
---

# Desempenho, fallback e acessibilidade

## 1. Cascata de decisão em runtime

```
sem WebGL?               → fallback estático (SVG/imagem)
prefers-reduced-motion?  → estado final estático, sem loop
fora da viewport?        → não carrega / pausa
dispositivo fraco?       → perfil baixo (dpr 1, sem sombra, menos itens)
caso contrário           → cena completa
```

**Decoração ou ferramenta?** Para cena decorativa (hero, ilustração), movimento reduzido → versão estática. Para ferramenta (mapa, gêmeo digital, editor 3D), o 3D é o conteúdo: carregue mesmo assim (`cenaComMovimentoReduzido`), corte as animações (`props.movimentoReduzido`: simulação pausada, câmera sem voo) e avise na tela. Esconder o mapa inteiro atrás de "3D indisponível" foi um erro real: no Windows Server o sistema vem com movimento reduzido ligado.

O fallback deve dizer o motivo verdadeiro (`fallback={(motivo) => …}` com `'aguardando' | 'sem-webgl' | 'erro'`), nunca uma frase genérica.

Já implementado e testado: `Cena3DSegura` do kit (`../anim3d-fundamentos/kit/`) aplica essa cascata e expõe `data-modo="cena|reduzido|fallback"`. Use-o em vez de reescrever. Peças soltas: `temWebGL()`, `dispositivoFraco()`, `useMovimentoReduzido()`, `useProximo()`.

## 2. Carga sob demanda

- `import()` dinâmico do componente do Canvas; `three` não entra no bundle inicial.
- Gatilho: `IntersectionObserver` com `rootMargin` de ~200 px.
- Exiba o poster no lugar até a cena estar pronta (sem salto de layout: reserve `aspect-ratio`).
- Modelos pesados: carregue depois do `load` e com `requestIdleCallback`.

## 3. Degradação adaptativa

Meça FPS médio em janela de ~1–2 s. Abaixo de ~45 FPS: degrau 1 → `dpr` 1; degrau 2 → desliga sombras; degrau 3 → animação reduzida; degrau 4 → fallback estático (`aoFalhar()`) **só em cena decorativa**. Em **ferramenta** (mapa, centro de comando, gêmeo digital) nunca caia para o poster por FPS: a animação "começa e para" e o usuário perde a ferramenta. Use `alvo={24} maxNivel={3}`, deixe cada degrau cortar custo (dpr, rótulos, órbitas) e reserve o fallback para perda de contexto WebGL ou erro (veja `anim3d-mapas`). Nunca volte a subir (histerese). Pronto no kit: `<MonitorQualidade aoMudar={n => n >= 4 ? aoFalhar() : setNivel(n)} />` (lógica pura em `criarMedidorQualidade`, que também serve em React Native). Só mede com `frameloop="always"`. Em `"demand"` o componente fica inerte de propósito, porque as pausas entre quadros pareceriam FPS baixo. Nesse modo, alimente `criarMedidorQualidade` só durante sequências contínuas.

## 2b. Bundle

`three` + R3F ≈ 245 KB gz. Devem ficar num chunk carregado por `import()`, nunca no inicial. Confira no build: o chunk de entrada não pode conter `WebGLRenderer`. Causa típica de vazamento: a página importa de um "barril" que reexporta algo de three (por isso o kit tem `@anim3d/kit` e `@anim3d/kit/cena`).

## 4. Medição

| O que | Como |
|---|---|
| Triângulos / draw calls / texturas | `renderer.info.render` e `renderer.info.memory` |
| FPS | Stats / `PerformanceMonitor` / `requestAnimationFrame` |
| Web Vitals | Lighthouse e PageSpeed: LCP, CLS, INP |
| Memória | Chrome DevTools → Memory; geometrias/texturas crescendo = vazamento |
| GPU | Chrome `chrome://gpu`, Spector.js para draw calls |

Compare **antes e depois** da cena. Perdeu em LCP/INP? Reduza ou remova.

## 5. Acessibilidade

- `prefers-reduced-motion`: ouça com `matchMedia(...).addEventListener('change', ...)`; reaja ao vivo.
- Cena decorativa: `aria-hidden="true"`. Cena que informa: `role="group"` + `aria-label` descritivo (não `role="img"` se houver filhos interativos). No `Cena3DSegura`, isso é decidido pelo prop `rotulo`.
- Tabela/texto só para leitor de tela: envolva num `div.sr-only` (uma `<table class="sr-only">` não encolhe e estica a página).
- Todo conteúdo informativo do 3D existe também em texto/tabela.
- Interação por teclado: itens focáveis (`tabindex`), Esc fecha cartões, foco visível.
- Contraste de rótulos ≥ 4.5:1 (texto ≥ 12 px, alvos de toque ≥ 44 px).
- Sem flash > 3 por segundo; pausa/parar disponível em loops longos (WCAG 2.2.2).

## 6. Estabilidade

- Trate `webglcontextlost`: previna o padrão, mostre fallback e restaure em `webglcontextrestored`.
- Descarte geometria/material/textura e `renderer.dispose()` no desmonte.
- Poucos canvases por página (limite de contextos WebGL).
- Em testes (jsdom) não há WebGL: o componente deve cair no fallback sem lançar erro.

## 7. Verificação em navegador real (script pronto)

```bash
node scripts/verificar-navegador.mjs http://localhost:5173/ --larguras 1856,1440,768,390
node scripts/verificar-navegador.mjs http://localhost:5173/ --larguras 390 --reduzido
```

Abre Chrome/Edge headless via DevTools Protocol (sem dependências), captura PNG por largura e relata WebGL, `data-modo` de cada cena, canvases, rolagem horizontal, altura do documento e erros do console. Sai com código 1 se houver problema. **Olhe as capturas**: cor escura demais, objeto cortado e sombra estranha só aparecem na imagem.

Atenção: Windows Server e VMs costumam vir com animações do sistema desligadas, e o Chrome então informa `prefers-reduced-motion: reduce`. Nesse caso a página mostra só o fallback, o que é correto. O script emula `no-preference` por padrão para testar a cena.

## 8. Testes mínimos

- Unitário: invariantes dos dados da cena (sem sobreposição, tempos dentro do ciclo, conexões válidas).
- Unitário: componente renderiza fallback quando WebGL/`matchMedia` ausentes (modelo: `../anim3d-fundamentos/kit/testes/Cena3DSegura.test.tsx`, que usa `vi.mock` no módulo de ambiente; `vi.spyOn` em namespace ESM falha).
- Navegador real em 1856 / 1440 / 768 / 390 de largura e altura baixa (640): cena visível, sem sobreposição.
- Interação: clique abre cartão, Esc/clique no vazio fecha, rolagem comum rola a página, Ctrl + rolagem amplia sem rolar.
- Lighthouse mobile: sem regressão de LCP/CLS.

Não declare "funciona" sem ter rodado testes e build e aberto num navegador de verdade.
