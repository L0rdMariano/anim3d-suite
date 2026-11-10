---
name: anim3d-mobile
description: "Animações 3D para mobile: React Native (@react-three/fiber/native + expo-gl), web mobile, gestos, bateria, temperatura e alternativas leves (Rive/Lottie). Use ao criar ou revisar 3D em aplicativo ou página para celular."
---

# 3D para mobile

Celular tem GPU modesta, esquenta, gasta bateria e o dedo é também o scroll. Projete para o pior aparelho do seu público.

## Escolha da tecnologia

| Situação | Opção |
|---|---|
| Ícone/ilustração animada, loader, onboarding simples | **Rive** ou **Lottie** (preferir) |
| Objeto 3D interativo no app nativo | `@react-three/fiber/native` + `expo-gl` |
| Página web aberta no celular | R3F web com orçamento mobile (veja `anim3d-roteador`) |
| Demonstração não interativa | Vídeo curto (`playsinline muted loop`) |

## Regras de desempenho

1. **Orçamento mobile**: ≤ 40k triângulos, ≤ 30 draw calls, texturas ≤ 2 MB no total, ≤ 1024 px por lado.
2. `dpr` máximo **1.5** no aparelho comum; 1 em modelos fracos. Use degradação adaptativa: se o FPS médio cair abaixo de ~45, baixe `dpr` e desligue sombras.
3. **Sem sombras reais**: use sombra falsa (disco translúcido) e `MeshBasicMaterial`/`Lambert`.
4. **Sem pós-processamento** (bloom, SSAO) no mobile.
5. `frameloop="demand"` e pausa quando o app vai para segundo plano (`AppState`) ou a tela perde foco.
6. Limite o FPS de animações decorativas a 30.
7. Carregue o modelo sob demanda, após a primeira renderização útil da tela.
8. Cuide de memória: libere geometrias/texturas ao sair da tela; o sistema mata apps que passam do limite.

## Exemplo: celular 3D com app animado (`exemplo/Celular3D*.tsx`)

Vitrine de app: corpo `ExtrudeGeometry` com material físico reflexivo (`AmbienteEstudio`), tela desenhada em `CanvasTexture` a 24 fps (saldo, gráfico, barras, transações) e cartões de notificação flutuando. Use-o na web e na landing do app. No nativo, reaproveite o desenho da tela e troque o Canvas.

## Esqueleto React Native

```tsx
import { Canvas } from '@react-three/fiber/native';
import { AppState, AccessibilityInfo } from 'react-native';
import { criarMedidorQualidade } from './anim3d/kit/qualidade'; // lógica pura do kit, sem DOM

// pausa em segundo plano: AppState 'background' → frameloop="never"
// movimento reduzido: AccessibilityInfo.isReduceMotionEnabled() + evento 'reduceMotionChanged'
<Canvas frameloop={ativo ? 'demand' : 'never'} dpr={nivel >= 1 ? 1 : 1.5}>…</Canvas>
```

Do kit (`../anim3d-fundamentos/kit/src/`), servem no nativo os módulos sem DOM: `movimento.ts`, `qualidade.ts`, `three-util.ts`. Os hooks de `ambiente.ts`, `viewport.ts` e `tokens.ts` e o `Cena3DSegura` são da web; no nativo, troque-os por `AppState`/`AccessibilityInfo` e tema do app. Na **web mobile**, use o kit inteiro normalmente.

## Toque e gestos

- **Alvo de toque ≥ 44 pt.** Itens 3D pequenos ganham área de acerto invisível maior (mesh transparente).
- **Não capture o scroll.** Se a cena está dentro de uma lista/página, arrastar com um dedo rola. Rotação/zoom só em modo explícito ("toque para explorar") ou com dois dedos.
- Feedback imediato (< 100 ms) no toque: realce/escala, e `Haptics` leve quando fizer sentido.
- Ocupe a largura: em tela estreita o conteúdo pode ficar numa janela rolável horizontal com dica "Arraste para o lado".

## Layout

- Altura em `dvh` na web (a barra de endereço some e aparece); respeite *safe areas* no nativo.
- Retrato e paisagem: recalcule o enquadramento da câmera no `onLayout`/resize.
- Texto sempre em componente nativo/HTML, nunca textura 3D para conteúdo essencial.

## Acessibilidade

- `accessibilityLabel` descrevendo a cena; o conteúdo vital também em texto.
- Respeite "Reduzir movimento" (`AccessibilityInfo.isReduceMotionEnabled` no RN, `prefers-reduced-motion` na web): mostre o estado final estático.

## Testes

- Aparelho real de entrada (não só simulador): FPS, temperatura após 3 min, bateria.
- Perfil: Xcode Instruments / Android GPU Profiler, ou monitor de FPS do próprio app.
- Rede lenta: o modelo carrega com indicador e a tela funciona sem ele.
- Matriz mínima: Android de entrada, iPhone de 2–3 anos atrás, tablet.
