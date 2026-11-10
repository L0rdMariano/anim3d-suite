// Tempo, easing e suavização. Sem dependências: funciona em qualquer cena (R3F, CSS, canvas).

/** Durações padrão (ms). Ajuste aos tokens do design system. */
export const DURACAO = { curta: 180, media: 320, longa: 600 } as const;

export const limitar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progresso 0..1 de uma animação que começou em `inicio` (ms) e dura `duracao` (ms). */
export const progresso = (agora: number, inicio: number, duracao: number) =>
  duracao <= 0 ? 1 : limitar((agora - inicio) / duracao);

/** Curva de Bézier cúbica (mesma semântica de `cubic-bezier()` do CSS). */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (alvo: number): number => {
    if (alvo <= 0) return 0;
    if (alvo >= 1) return 1;
    let t = alvo;
    for (let i = 0; i < 8; i++) { // Newton
      const erro = x(t) - alvo;
      if (Math.abs(erro) < 1e-6) return y(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= erro / d;
    }
    let lo = 0, hi = 1; t = alvo; // bisseção de reserva
    for (let i = 0; i < 30; i++) {
      const v = x(t);
      if (Math.abs(v - alvo) < 1e-6) break;
      if (v < alvo) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return y(t);
  };
}

/** Easings de UI: entrada desacelera, saída acelera. Nunca linear em interface. */
export const EASE = {
  entrada: bezier(0.2, 0.8, 0.2, 1),
  saida: bezier(0.4, 0, 1, 1),
  padrao: bezier(0.4, 0, 0.2, 1),
} as const;

/**
 * Aproxima `atual` de `alvo` de forma independente do FPS.
 * `k` ~ 4 (lento) a 20 (rápido). `delta` em segundos (o 2º argumento do useFrame).
 */
export const amortecer = (atual: number, alvo: number, k: number, delta: number) =>
  lerp(atual, alvo, 1 - Math.exp(-k * Math.min(delta, 0.1)));
