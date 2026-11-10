// Detecção do ambiente: WebGL, dispositivo fraco, movimento reduzido, aba visível.
import { useSyncExternalStore } from 'react';

/** true se o navegador cria um contexto WebGL. Falso em SSR, jsdom e GPU bloqueada. */
export function temWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // devolve o contexto na hora
    return true;
  } catch {
    return false;
  }
}

/** Heurística de aparelho fraco: ≤ 4 núcleos ou ≤ 4 GB. Confirme medindo FPS (MonitorQualidade). */
export function dispositivoFraco(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nucleos = navigator.hardwareConcurrency ?? 8;
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return nucleos <= 4 || memoria <= 4;
}

/** Toque como entrada principal (celular/tablet): desligue parallax e arrastar-para-mover. */
export function entradaPorToque(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

const Q_REDUZIDO = '(prefers-reduced-motion: reduce)';

function assinarMidia(q: string) {
  return (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const m = window.matchMedia(q);
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  };
}
const lerMidia = (q: string) => () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;

const assinarReduzido = assinarMidia(Q_REDUZIDO);
const lerReduzido = lerMidia(Q_REDUZIDO);

/** Reage ao vivo quando o usuário liga/desliga "reduzir movimento". */
export function useMovimentoReduzido(): boolean {
  return useSyncExternalStore(assinarReduzido, lerReduzido, () => false);
}

function assinarAba(cb: () => void) {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}
const lerAba = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/** false quando a aba está oculta: pause loops e polling. */
export function useAbaVisivel(): boolean {
  return useSyncExternalStore(assinarAba, lerAba, () => true);
}
