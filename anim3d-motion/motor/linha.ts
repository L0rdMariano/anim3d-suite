// Linha do tempo de keyframes: função pura do tempo. Sem React e sem three; ligue ao `useFrame`, à rolagem ou a um vídeo.
// Cada faixa anima UM valor numérico (posição x, opacidade, escala...). `em(t)` devolve todos os valores no instante t.
import { EASE, lerp } from '@anim3d/kit';

export type Easing = (k: number) => number;

export interface Quadro {
  /** Instante em segundos. */
  t: number;
  valor: number;
  /** Curva do trecho que TERMINA neste quadro (padrão: EASE.padrao). */
  ease?: Easing;
}

export interface Faixa {
  chave: string;
  quadros: Quadro[];
}

export type Repeticao = false | 'laco' | 'vaivem';

export interface OpcoesLinha {
  /** Nomes de instantes (ex.: { entrada: 0, saida: 2.4 }). */
  rotulos?: Record<string, number>;
  /** `laco` volta ao início; `vaivem` ida e volta (sem salto). Padrão: não repete (fica no último valor). */
  repetir?: Repeticao;
}

export interface Linha {
  duracao: number;
  /** Valor de cada faixa no instante `t` (segundos). Fora do intervalo, fixa nas pontas (ou repete). */
  em(t: number): Record<string, number>;
  rotulo(nome: string): number;
}

export function criarLinha(faixas: Faixa[], opcoes: OpcoesLinha = {}): Linha {
  const ordenadas = faixas.map((f) => ({ chave: f.chave, quadros: [...f.quadros].sort((a, b) => a.t - b.t) }));
  const duracao = Math.max(0, ...ordenadas.map((f) => f.quadros[f.quadros.length - 1]?.t ?? 0));
  const repetir = opcoes.repetir ?? false;

  const tempoLocal = (t: number): number => {
    if (duracao === 0) return 0;
    if (repetir === 'laco') return ((t % duracao) + duracao) % duracao;
    if (repetir === 'vaivem') {
      const ciclo = ((t % (2 * duracao)) + 2 * duracao) % (2 * duracao);
      return ciclo <= duracao ? ciclo : 2 * duracao - ciclo;
    }
    return Math.min(duracao, Math.max(0, t));
  };

  const valorDaFaixa = (q: Quadro[], t: number): number => {
    if (q.length === 0) return 0;
    if (t <= q[0].t) return q[0].valor;
    const ultimo = q[q.length - 1];
    if (t >= ultimo.t) return ultimo.valor;
    // busca binária do trecho [i, i+1] que contém t
    let lo = 0;
    let hi = q.length - 1;
    while (hi - lo > 1) {
      const meio = (lo + hi) >> 1;
      if (q[meio].t <= t) lo = meio;
      else hi = meio;
    }
    const a = q[lo];
    const b = q[hi];
    const k = (t - a.t) / (b.t - a.t);
    return lerp(a.valor, b.valor, (b.ease ?? EASE.padrao)(k));
  };

  return {
    duracao,
    em(t) {
      const tl = tempoLocal(t);
      const r: Record<string, number> = {};
      for (const f of ordenadas) r[f.chave] = valorDaFaixa(f.quadros, tl);
      return r;
    },
    rotulo(nome) {
      const v = opcoes.rotulos?.[nome];
      if (v === undefined) throw new Error(`rótulo desconhecido: ${nome}`);
      return v;
    },
  };
}

/** Atraso escalonado (stagger): instante em que o item `i` de `n` começa, espalhando `total` segundos. */
export const escalonar = (i: number, n: number, total: number) => (n <= 1 ? 0 : (i / (n - 1)) * total);
