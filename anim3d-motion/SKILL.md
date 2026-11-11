---
name: anim3d-motion
description: "Motion design para web e 3D: duração, easing, molas, linha do tempo, coreografia (stagger, antecipação, sobreposição), movimento de câmera, loops e movimento reduzido, com motor testado (mola analítica e keyframes). Use ao animar qualquer coisa, quando o movimento parecer duro, artificial, brusco ou 'sem vida', ao escolher entre mola e curva, ao sincronizar vários elementos, ou antes de escrever um useFrame/transição."
---

# Motion design

Movimento tem **personalidade**: pesado e lento = luxo; rápido e elástico = brincalhão; defasado e irregular = orgânico; seco e curto = técnico. Escolha a personalidade (veja `anim3d-estilos`) e depois os números. Valores de partida e a justificativa estão em `references/principios-e-tempos.md`.

## Workflow

1. **Para que serve este movimento?** (informar, dar feedback, guiar o olhar, dar vida). Se não serve a nada, não anime.
2. **Escolha o mecanismo** (tabela abaixo).
3. **Defina duração e curva** pelos valores de partida; ajuste por personalidade.
4. **Trate interrupção**: o usuário vai mudar o alvo no meio do movimento. A velocidade deve **continuar**, nunca zerar.
5. **Coreografe** vários elementos (defasagem, ordem, sobreposição) em vez de animar todos juntos.
6. **Movimento reduzido**: defina a variante (fade ou estado final; sem oscilação nem deslocamento grande).
7. **Verifique**: sem saltos, sem depender do FPS, loop que fecha, `delta` enorme tratado.

## Mola ou curva?

| Situação | Use | Por quê |
|---|---|---|
| Segue o mouse, alvo muda a todo instante, arrastar e soltar | **Mola** (`motor/mola.ts`) | Continua a velocidade ao trocar o alvo; natural |
| Hover, foco, abrir/fechar que pode ser interrompido | **Mola** | Idem |
| Sequência exata, sincronizada com rolagem, vídeo ou outra animação | **Linha do tempo** (`motor/linha.ts`) | Duração e instante precisam ser exatos |
| Entrada única de elemento com duração definida | **Curva** (`EASE.entrada` do kit) | Simples e previsível |
| Rotação contínua, progresso | **Linear** | A exceção: constante de propósito |
| Aproximar suave de um valor, a cada quadro | `amortecer` do kit | Barato, sem estado de velocidade |

**Regra:** se o movimento pode ser interrompido, use mola. Curva reiniciada no meio "para" e arranca (a velocidade vai a zero): fica robótico.

## Motor (testado em Node)

- `motor/mola.ts`: mola amortecida com **solução analítica**. O resultado **independe do FPS** (passo de 1 ms ou de 2 s chega ao mesmo estado), nunca explode e funciona com `delta` gigante (aba que ficou oculta). Presets `suave`, `padrao`, `firme`, `elastica`, `pesada`; `regime()`, `zeta()`, `emRepouso()`, `tempoDeAssentamento()`, `passoMolaVetor()`.
- `motor/linha.ts`: keyframes por faixa, curva por trecho, rótulos, repetição `laco` e `vaivem` sem salto, `escalonar()` para stagger. `em(t)` é função pura do tempo.
- Testes em `motor/motor.test.ts` (independência do FPS, estabilidade, continuidade, loop fechado). Exemplo visual em `exemplo/ComparaMolas.tsx` (galeria, grupo Motion).

```ts
// em R3F: mola por eixo dentro do useFrame, sem estado do React
const e = useRef({ x: [0, 0, 0], v: [0, 0, 0] });
useFrame((_, dt) => {
  e.current = passoMolaVetor(MOLAS.padrao, e.current, alvo, Math.min(dt, 0.1));
  malha.current!.position.set(...(e.current.x as [number, number, number]));
});
```

## Coreografia

- **Defasagem (stagger)** de 30 a 60 ms por item, no máximo ~400 ms no total; ordem por leitura (esq→dir, cima→baixo) ou por importância.
- **Antecipação**: recuo de 5 a 10% na direção oposta antes de um movimento grande.
- **Sobreposição (follow-through)**: partes secundárias terminam 40 a 120 ms depois da principal.
- **Arcos**: trajetórias curvas, não retas, para movimento natural (um pouco de elevação no meio).
- **Overshoot** de UI ≤ 10–15%; a elástica solta (ζ ≈ 0,45) é para algo brincalhão, não para interface séria.
- **Saída mais rápida que entrada** (~60–70% da duração).

## Câmera

Movimentos de câmera **lentos** (≥ 600 ms), ease-in-out, sem atravessar objetos, horizonte estável. Rotação rápida causa enjoo. Parallax por mouse ≤ 8°. Trajetos longos: use Catmull-Rom entre pontos (planejado em `anim3d-cinema`).

## Armadilhas medidas

- **`lerp` com fator fixo por quadro** (`x += (alvo-x)*0.1`) muda de velocidade com o FPS: use `amortecer` ou a mola.
- **Estado do React a cada quadro** (`setState` no `useFrame`) trava: mute refs.
- **Euler com `delta` grande** explode a mola; a versão analítica não.
- **`delta` enorme ao voltar à aba**: limite a `0,1` s (o kit já faz em `amortecer`).
- **Curva reiniciada ao interromper**: a velocidade zera (robótico). Use mola.
- **Todos os elementos com a mesma fase/duração**: parece mecânico. Defasagem e duração levemente diferentes.
- **Loop que não fecha**: o estado em `t = T` deve ser igual ao de `t = 0` (use `vaivem` ou períodos inteiros nos senos).
- **Easing linear em interface**: parece defeito.
- **Animar `width/height/top/left`** em CSS: use `transform` e `opacity`.

## Movimento reduzido

Trocar movimento por **fade ou estado final**; manter o que informa (progresso, mudança de estado) sem oscilação, sem escala grande e com duração curta (≤ 150 ms). Teste com `useMovimentoReduzido` do kit e com `?respeitar=1` na galeria.

## Checklist

- [ ] Existe um motivo para o movimento
- [ ] Mola se pode ser interrompido; linha do tempo se precisa ser exato
- [ ] Duração e curva dos valores de partida, ajustadas à personalidade
- [ ] Interrupção testada (alvo muda no meio) sem salto de velocidade
- [ ] Vários elementos coreografados (defasagem, sobreposição)
- [ ] Independe do FPS e trata `delta` grande
- [ ] Loop fecha; sem estado do React por quadro
- [ ] Variante de movimento reduzido definida
