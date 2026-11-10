---
name: anim3d-app-ui
description: "Micro-animações 3D e pseudo-3D dentro da interface de aplicações: loaders, estados vazios, confirmações, transições entre telas, cartões com profundidade e feedback de ação. Use para animações curtas de UI em SaaS, apps e dashboards."
---

# Animação 3D de UI (micro-interações)

Aqui o 3D é **feedback**, não espetáculo. Se o usuário percebe a animação em vez da informação, ela está longa ou grande demais.

## Regra de tamanho e duração

| Tipo | Duração | Tecnologia ideal |
|---|---|---|
| Hover / press | 120–200 ms | CSS `transform` (translateZ, rotateX/Y), `perspective` |
| Transição de tela/cartão | 250–400 ms | CSS 3D ou FLIP; sem WebGL |
| Confirmação (sucesso/erro) | 400–800 ms | Lottie/Rive; 3D só se for marca |
| Loader | em loop, discreto | CSS/SVG; 3D apenas se a espera for longa (> 2 s) |
| Estado vazio | em loop lento | Cena R3F pequena ou Lottie, pausa fora da viewport |

Se a interação ocorre dezenas de vezes por sessão, ela deve ser **curta e quase invisível**. Espetáculo só para o que ocorre uma vez (primeira abertura, conquista).

## Exemplo pronto (`exemplo/MicroInteracoes.tsx` + `microInteracoes.css`)

Cinco peças independentes, cada uma copiável sozinha: cartão que inclina com brilho, cartão que vira (botão com `aria-pressed`), botão com profundidade, salvar com loader de cubo (`useEsperaVisivel`: atraso de 400 ms e mínimo de 600 ms) e pilha de cartões que abre no hover ou foco.

## Receitas CSS 3D (custo quase zero)

```css
.cartao-3d { transform-style: preserve-3d; perspective: 800px; }
.cartao-3d > .face {
  transition: transform 180ms cubic-bezier(.2,.8,.2,1);
  will-change: transform;           /* só durante a interação */
}
.cartao-3d:hover > .face { transform: translateZ(8px) rotateX(2deg); }
@media (prefers-reduced-motion: reduce) {
  .cartao-3d > .face { transition: none; transform: none; }
}
```

- Anime só `transform` e `opacity` (compostos pela GPU). Nunca `top/left/width`.
- Inclinação seguindo o ponteiro: ≤ 8°, com suavização; desligue em `pointer: coarse`.

Em JS (FLIP, Web Animations API, spring própria), use do kit (`../anim3d-fundamentos/kit/`): `EASE.entrada`/`EASE.saida` (mesmas curvas do CSS), `DURACAO`, `amortecer` e `useMovimentoReduzido()`, que reage ao vivo à preferência do sistema.

## Quando usar R3F numa UI

Objeto de marca no estado vazio, conquista, mascote, seletor de produto 3D. Regras: canvas pequeno (≤ 320 px), `frameloop="demand"`, sempre via `Cena3DSegura` (carga sob demanda + fallback), descarte ao desmontar. Um app com vários canvases simultâneos estoura contextos WebGL (limite ~8–16): compartilhe um canvas ou use um por tela.

## Princípios de movimento

1. **Causa visível**: o movimento nasce do elemento acionado.
2. **Continuidade**: elemento que sai/entra mantém identidade (mesma origem e destino).
3. **Easing**: entrada desacelera (`.2,.8,.2,1`), saída acelera (`.4,0,1,1`). Nunca linear em UI.
4. **Orquestração**: no máximo 3 elementos animando juntos; escalone em 30–50 ms.
5. **Interrompível**: o usuário pode clicar de novo sem esperar a animação acabar.
6. **Nunca bloqueie**: a ação acontece imediatamente; a animação é só o reflexo.

## Acessibilidade

- `prefers-reduced-motion`: troque movimento por fade ou mudança instantânea; sem rotação nem parallax.
- Nada pisca mais de 3 vezes por segundo.
- O estado (sucesso, erro, carregando) também em texto/`aria-live`, não só na animação.

## Checklist

- [ ] Duração dentro da tabela
- [ ] Só `transform`/`opacity`
- [ ] Movimento reduzido tratado
- [ ] Interrompível e sem bloquear a ação
- [ ] Estado comunicado também em texto
