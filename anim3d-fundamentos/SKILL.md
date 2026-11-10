---
name: anim3d-fundamentos
description: "Base técnica e kit de código testado de toda cena 3D web da suíte anim3d: Canvas React Three Fiber, carregamento sob demanda com fallback (Cena3DSegura), câmera e enquadramento, luz, tokens de cor, easing, loop sob demanda e timeline. Use sempre que for montar, revisar ou depurar uma cena three.js/R3F, mesmo que o pedido não diga 'skill' ou 'fundamentos'."
---

# Fundamentos de cena 3D

Stack padrão: `three` + `@react-three/fiber` (R3F). `@react-three/drei` só com aprovação de dependência; muita coisa vem de `three/examples/jsm` ou do kit abaixo.

## 0. Use o kit (não reescreva)

`kit/` nesta pasta tem utilitários testados (21 testes; validados em navegador com React 19, R3F 9, three 0.187). Leia `kit/README.md` e copie `kit/src/` para o projeto. Os mais usados:

| Precisa de | Use |
|---|---|
| Carregar a cena só perto da tela, com fallback, movimento reduzido e erro | `Cena3DSegura` |
| Cores do design system, relidas ao trocar tema | `useTokens(MAPA, PADRAO)` (objetos declarados fora do componente) |
| Easing de UI e suavização independente de FPS | `EASE.entrada`, `EASE.saida`, `amortecer(atual, alvo, k, delta)` |
| Enquadrar a câmera pelo conteúdo | `enquadrarOrto` / `enquadrarPerspectiva` (de `@anim3d/kit/cena`) |
| Pausar fora da tela, degradar qualidade, perda de contexto | `PausaAutomatica`, `MonitorQualidade`, `GuardaContexto` |
| Progresso de rolagem sem re-render | `useProgressoScroll` |

**Duas entradas, por um motivo medido:** `@anim3d/kit` é leve (pode ir na página) e `@anim3d/kit/cena` puxa o three (só dentro do módulo da cena carregado por `import()`). Misturar levou o bundle inicial de 223 KB para 1,15 MB.

## 1. Esqueleto mínimo

```tsx
// Pagina.tsx
const carregar = () => import('./MinhaCena');
<Cena3DSegura carregar={carregar} props={dados} fallback={<Poster />} rotulo="Descrição" aspecto="16 / 9" />

// MinhaCena.tsx
export default function MinhaCena({ aoFalhar, ...dados }: Dados & PropsCena) {
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [6, 6, 6], fov: 35 }}>
      <Luzes />
      <Conteudo {...dados} />
      <GuardaContexto aoPerder={aoFalhar} />
    </Canvas>
  );
}
```

- `frameloop="demand"` + `invalidate()` a cada mudança. Use `"always"` só com animação contínua visível, junto de `PausaAutomatica`.
- Em `"demand"`, uma animação se mantém chamando `invalidate()` dentro do `useFrame` **enquanto não convergiu** (veja `anim3d-dashboard/exemplo/Colunas3DCena.tsx`).
- O que é declarado em JSX o R3F descarta sozinho; objetos criados à mão (glTF clonado) → `descartar(obj)`.

## 2. Câmera

| Visual | Câmera |
|---|---|
| Diagrama / dashboard / isométrico | `<Canvas orthographic camera={{ position: [10,10,10], zoom: 40 }}>` + `enquadrarOrto` no resize |
| Produto / hero / objeto | Perspectiva, `fov` 25–40 (longo = menos distorção) |
| Mobile | fov mais estreito, objeto centralizado, folga nas bordas |

Enquadre por cálculo (caixa envolvente), não por números mágicos. Considere tudo que se move: no hero de exemplo, satélites a raio 1,7 saíam da tela com a câmera a z = 5; foi preciso z = 6,5.

## 3. Luz (three ≥ r155: intensidade física)

Desde a r155 a intensidade não é mais multiplicada por π. Valores antigos (ambiente 0,5) deixam a cor do token quase preta: `#4f46e5` virou azul-marinho no teste. Ponto de partida que preserva a cor da marca:

```tsx
<ambientLight intensity={1.1} />
<directionalLight position={[2, 6, 3]} intensity={2.2} />   {/* principal, alta: sombra curta */}
<directionalLight position={[-3, -1, -2]} intensity={0.6} /> {/* preenchimento */}
```

Sombras: `shadows="percentage"` (o `soft`/PCFSoft foi removido no three recente; `shadows={true}` usa soft e gera aviso). Só `castShadow` no que importa, `shadow-mapSize` ≤ 1024, luz principal alta. Orçamento apertado → sombra falsa (disco `meshBasicMaterial` translúcido).

## 4. Tokens (nada de cor solta)

```ts
const MAPA = { primaria: '--cor-primaria', destaque: '--cor-destaque' }; // fora do componente
const PADRAO = { primaria: '#4f46e5', destaque: '#22d3ee' };
const cores = useTokens(MAPA, PADRAO); // relê em troca de tema (class/data-theme/prefers-color-scheme)
```

`THREE.Color` aceita hex, `rgb()`, `hsl()` e nomes, mas não aceita `oklch()`/`lab()` nem o formato só de canais do Tailwind (`--primary: 79 70 229`). Nesses casos, crie variáveis paralelas em hex/rgb só para a cena, ou converta o valor antes (ex.: `rgb(${valor})` para canais). Confira a cor na captura do navegador.

Movimento também é token: `DURACAO.curta=180`, `media=320`, `longa=600` ms; `EASE.entrada` para entrar, `EASE.saida` para sair.

## 5. Animação

- Interpole a partir de **tempo**, não de contagem de frames: `lerp(a, b, EASE.entrada(progresso(agora, inicio, dur)))`.
- Suavização contínua: `amortecer(x, alvo, k, delta)`; o resultado é o mesmo a 30 ou 60 FPS (há teste no kit).
- Sequências: um **relógio único** em `ref`; só o trecho atual vai para o estado do React; a cena fica em `memo`.
- Dentro de `useFrame`: nada de `new Vector3()`, `setState` ou alocação. Reuse objetos de módulo (`const _o = new Object3D()`).
- Muitos objetos iguais → `InstancedMesh` (1 draw call). Após `setMatrixAt`, marque `instanceMatrix.needsUpdate` e chame `computeBoundingSphere()`, senão o hover (raycast) erra.

## 6. Estética

Low poly, faces chapadas (`flatShading`), 2–3 cores por cena, um destaque. O 3D serve ao conteúdo: se a página continua clara sem a animação, está certo.

## 7. Checklist antes de entregar

- [ ] Cena via `Cena3DSegura`, com `fallback` e `rotulo` (ou decorativa de propósito)
- [ ] `three` fora do bundle inicial (só `@anim3d/kit/cena` dentro da cena)
- [ ] `frameloop` adequado; pausa fora da tela
- [ ] Cores por tokens, luz que preserva a cor do token, tema claro e escuro
- [ ] Enquadramento cobre tudo que se move, em todas as larguras
- [ ] Verificado em navegador real (`anim3d-performance-a11y/scripts/verificar-navegador.mjs`)
