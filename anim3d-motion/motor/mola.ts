// Mola amortecida com solução ANALÍTICA: o resultado não depende do FPS nem do tamanho do passo (dt de 1 ms ou de 2 s
// chegam ao mesmo estado) e nunca "explode" como a integração de Euler. Sem React e sem three: serve em R3F, CSS e canvas.
//
// Modelo: massa m presa a um alvo por uma mola de rigidez k com amortecimento c.  x'' = -(k/m)(x - alvo) - (c/m) x'
// Regime pelo fator de amortecimento ζ = c / (2√(k·m)):  ζ < 1 oscila (elástica) · ζ = 1 crítica (mais rápida sem oscilar) · ζ > 1 lenta.

export interface ParamMola {
  /** Rigidez k: maior = mais rápida. */
  rigidez: number;
  /** Amortecimento c: maior = menos oscilação. */
  amortecimento: number;
  /** Massa m: maior = mais pesada e lenta. */
  massa: number;
}

export interface EstadoMola {
  x: number;
  v: number;
}

/** Presets nomeados (dão personalidade ao movimento; veja references/principios-e-tempos.md). */
export const MOLAS = {
  /** UI discreta: chega sem oscilar. ζ ≈ 1,0 */
  suave: { rigidez: 120, amortecimento: 22, massa: 1 },
  /** Padrão geral: quase crítica, com um toque de vida. ζ ≈ 1,0 */
  padrao: { rigidez: 170, amortecimento: 26, massa: 1 },
  /** Resposta rápida e firme (botões, foco). ζ ≈ 0,87 */
  firme: { rigidez: 300, amortecimento: 30, massa: 1 },
  /** Elástica: passa do alvo e volta (brincalhão). ζ ≈ 0,45 */
  elastica: { rigidez: 180, amortecimento: 12, massa: 1 },
  /** Pesada e lenta (objeto grande, luxo). ζ ≈ 1,2 */
  pesada: { rigidez: 60, amortecimento: 24, massa: 1.6 },
} as const satisfies Record<string, ParamMola>;

/** Fator de amortecimento ζ. */
export const zeta = (p: ParamMola) => p.amortecimento / (2 * Math.sqrt(p.rigidez * p.massa));

export type Regime = 'subamortecida' | 'critica' | 'superamortecida';
/** Rótulo para humanos: ζ dentro de ±0,02 de 1 conta como crítica (a diferença não se vê). O cálculo em `passoMola` usa a fórmula exata. */
export const regime = (p: ParamMola): Regime => {
  const z = zeta(p);
  return Math.abs(z - 1) < 0.02 ? 'critica' : z < 1 ? 'subamortecida' : 'superamortecida';
};

/**
 * Avança a mola `dt` segundos em direção a `alvo` e devolve o novo estado (o anterior não é alterado).
 * É exata: `passoMola(p, passoMola(p, e, a, 0.3), a, 0.7)` ≈ `passoMola(p, e, a, 1)`.
 */
export function passoMola(p: ParamMola, e: EstadoMola, alvo: number, dt: number): EstadoMola {
  if (dt <= 0) return { x: e.x, v: e.v };
  const w0 = Math.sqrt(p.rigidez / p.massa);
  const z = zeta(p);
  const y0 = e.x - alvo; // deslocamento em relação ao alvo
  const v0 = e.v;
  let y: number;
  let v: number;
  if (Math.abs(z - 1) < 1e-6) {
    // crítica: y = e^{-w0 t}(y0 + C t)
    const C = v0 + w0 * y0;
    const ex = Math.exp(-w0 * dt);
    y = ex * (y0 + C * dt);
    v = ex * (C - w0 * (y0 + C * dt));
  } else if (z < 1) {
    // subamortecida: oscila com frequência wd
    const a = z * w0;
    const wd = w0 * Math.sqrt(1 - z * z);
    const B = (v0 + a * y0) / wd;
    const ex = Math.exp(-a * dt);
    const c = Math.cos(wd * dt);
    const s = Math.sin(wd * dt);
    y = ex * (y0 * c + B * s);
    v = ex * (-a * (y0 * c + B * s) + (-y0 * wd * s + B * wd * c));
  } else {
    // superamortecida: soma de duas exponenciais
    const raiz = Math.sqrt(z * z - 1);
    const r1 = -w0 * (z - raiz);
    const r2 = -w0 * (z + raiz);
    const A = (v0 - r2 * y0) / (r1 - r2);
    const B = y0 - A;
    const e1 = Math.exp(r1 * dt);
    const e2 = Math.exp(r2 * dt);
    y = A * e1 + B * e2;
    v = A * r1 * e1 + B * r2 * e2;
  }
  return { x: alvo + y, v };
}

/** Repouso: perto do alvo e quase parada. Use para parar de renderizar (`frameloop="demand"`) quando a animação acabou. */
export const emRepouso = (e: EstadoMola, alvo: number, eps = 1e-3, epsV = 1e-3) => Math.abs(e.x - alvo) < eps && Math.abs(e.v) < epsV;

/** Mola em vários eixos (posição 3D, cor, escala...). Cada eixo é independente. */
export function passoMolaVetor(p: ParamMola, e: { x: number[]; v: number[] }, alvo: number[], dt: number): { x: number[]; v: number[] } {
  const x: number[] = [];
  const v: number[] = [];
  for (let i = 0; i < e.x.length; i++) {
    const r = passoMola(p, { x: e.x[i], v: e.v[i] }, alvo[i], dt);
    x.push(r.x);
    v.push(r.v);
  }
  return { x, v };
}

/**
 * Tempo (s) para a mola, partindo de `de` em repouso até `para`, ficar a menos de `tolerancia` (fração do salto) do alvo.
 * Serve para saber a duração real de um preset (ex.: sincronizar uma sombra ou uma legenda).
 */
export function tempoDeAssentamento(p: ParamMola, tolerancia = 0.01, passo = 1 / 240, maximo = 10): number {
  let e: EstadoMola = { x: 0, v: 0 };
  for (let t = 0; t < maximo; t += passo) {
    e = passoMola(p, e, 1, passo);
    // dentro da banda de tolerância de agora em diante: confere o restante da trajetória
    if (Math.abs(e.x - 1) <= tolerancia && Math.abs(e.v) < 5 * tolerancia) {
      let ok = true;
      let f = e;
      for (let k = 0; k < 240 && ok; k++) {
        f = passoMola(p, f, 1, passo);
        if (Math.abs(f.x - 1) > tolerancia) ok = false;
      }
      if (ok) return t;
    }
  }
  return maximo;
}
