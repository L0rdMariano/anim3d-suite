---
name: anim3d-roteador
description: "Porta de entrada da suíte de animações 3D para SaaS, mobile, dashboards e aplicações. Use antes de criar, propor ou revisar qualquer animação 3D, pseudo-3D ou visual com three.js/React Three Fiber/WebGL, incluindo hero animado, objeto girando, gráfico 3D, cena isométrica, efeito de profundidade, parallax, Lottie/Rive ou 'deixar a tela mais viva', mesmo que o pedido não diga '3D'. Decide se 3D é necessário, escolhe a tecnologia, fixa orçamento e fallback e indica qual skill anim3d-* seguir."
---

# Roteador da suíte anim3d

Antes de escrever código, responda estas quatro perguntas. Elas decidem tudo.

## 1. Qual é o contexto?

| Contexto | Skill a seguir | Intenção do 3D |
|---|---|---|
| Landing, hero, onboarding, marketing de SaaS | `anim3d-saas` | Impressionar e explicar em 5 s |
| Painel, KPIs, mapas, grafos, métricas | `anim3d-dashboard` | Revelar estrutura; nunca decorar |
| App nativo ou web mobile | `anim3d-mobile` | Leve, tátil, sem esgotar bateria |
| Loader, estado vazio, transição, micro-interação | `anim3d-app-ui` | Dar feedback, durar < 1 s |
| Mapa, globo, mapa-múndi, mapa do Brasil, centro de comando, fluxos entre lugares | `anim3d-mapas` | Localizar, comparar e acompanhar fluxos |
| Escolher o visual ou 'estilo' (premium, futurista, vidro, neon, orgânico, brutalista, sala de controle...) | `anim3d-estilos` | Fixar luz, material, paleta e câmera antes do código |
| Qualquer animação: timing, easing, mola, coreografia, câmera, loop, movimento reduzido | `anim3d-motion` | Movimento com personalidade, sem salto e sem depender do FPS |
| Topologia de rede, simulador de pacotes, estilo Packet Tracer, troubleshooting | `anim3d-topologia` | Montar a rede e entender onde o pacote para |
| Diagrama isométrico de arquitetura/fluxo | `anim3d-dashboard` (exemplo `Ecossistema3D`) | Explicar sistema |
| Gêmeo digital / operação ao vivo (armazém, fábrica) | `anim3d-dashboard` (exemplo `almoxarifado/`) | Explorar e acompanhar |

Para qualquer coisa geográfica (mapa, globo, país/estado clicável, dados do IBGE), siga `anim3d-mapas`. Para topologia de rede, editor de dispositivos/cabos ou simulação de pacotes, siga `anim3d-topologia`.

Em qualquer visual novo, aplique **antes do código** `anim3d-estilos` (fixa o estilo) e `anim3d-motion` (fixa o movimento).

Sempre aplique também: `anim3d-fundamentos` (base da cena), `anim3d-performance-a11y` (orçamento, fallback, movimento reduzido) e `anim3d-assets` (se houver modelo `.glb`).

## 2. 3D real é necessário? (árvore de decisão)

1. O movimento comunica algo que 2D não comunica (profundidade, rotação de objeto, relação espacial)? **Não** → CSS/Lottie/Rive/SVG. Pare aqui.
2. Basta um objeto girando ou inclinando com o mouse? → **CSS 3D** (`perspective` + `transform-style: preserve-3d`), custo quase zero.
3. É uma animação pré-definida, sem interação? → **vídeo** (WebM/MP4 curto, `muted loop playsinline`) ou **Lottie/Rive**.
4. Precisa reagir a dados, câmera ou clique em tempo real? → **WebGL com React Three Fiber (R3F)**.
5. Mobile nativo (React Native)? → `@react-three/fiber/native` + `expo-gl`, ou Rive/Lottie se o orçamento for apertado.

Regra: **a tecnologia mais barata que entrega o efeito vence.**

## 3. Qual é o orçamento?

| Alvo | Triângulos | Draw calls | Textura total | Bundle da cena (gz) |
|---|---|---|---|---|
| Desktop SaaS | ≤ 150k | ≤ 100 | ≤ 8 MB | ≤ 250 KB + three |
| Dashboard | ≤ 80k | ≤ 60 | ≤ 4 MB | ≤ 200 KB + three |
| Mobile | ≤ 40k | ≤ 30 | ≤ 2 MB | ≤ 150 KB + three |
| UI micro | ≤ 5k | ≤ 10 | 0–512 KB | carregamento sob demanda |

Estourou? Reduza antes de otimizar código: menos objetos, instâncias, texturas menores.

## 4. Qual é o fallback?

Toda animação 3D precisa de versão estática ou 2D para: sem WebGL, `prefers-reduced-motion`, jsdom/testes, dispositivo fraco e impressão. Veja `anim3d-performance-a11y`.

## Saída esperada deste passo

Antes de codar, registre em 4 linhas: **contexto · tecnologia · orçamento · fallback**. Exemplo:
`Hero de SaaS · R3F com frameloop demand · desktop 100k tri · fallback = imagem WebP do primeiro frame`.

## Linguagem visual comum

Paleta e movimento vêm de tokens (veja `anim3d-fundamentos`). Nunca invente cores na cena: leia as variáveis do design system do produto.

## Código pronto (não reinvente)

- Kit testado: `../anim3d-fundamentos/kit/` (`Cena3DSegura`, tokens, easing, enquadramento, qualidade adaptativa). Leia o `README.md` dele.
- Exemplos verificados em navegador: `../anim3d-saas/exemplo/` (hero) e `../anim3d-dashboard/exemplo/` (colunas 3D).
- Verificação: `../anim3d-performance-a11y/scripts/verificar-navegador.mjs`.

Ao terminar, não diga que funciona sem testes, build e capturas em navegador real (veja `anim3d-performance-a11y`).
