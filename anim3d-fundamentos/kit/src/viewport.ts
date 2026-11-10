// Viewport: carregar perto da tela e progresso de rolagem sem re-render.
import { useEffect, useRef, useState } from 'react';
import { limitar } from './movimento';

/**
 * `proximo` vira true quando o elemento chega a `margem` da viewport.
 * `umaVez` (padrão) desliga o observador depois: ideal para carregar a cena sob demanda.
 * Com `umaVez: false` serve para pausar fora da tela.
 */
export function useProximo<T extends Element>(margem = '200px', umaVez = true) {
  const ref = useRef<T>(null);
  const [proximo, setProximo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setProximo(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setProximo(true);
          if (umaVez) obs.disconnect();
        } else if (!umaVez) setProximo(false);
      },
      { rootMargin: margem },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margem, umaVez]);
  return [ref, proximo] as const;
}

/** Progresso 0..1 do elemento atravessando a viewport (0 = entrando por baixo, 1 = saiu por cima). */
export function calcularProgresso(topo: number, altura: number, alturaJanela: number): number {
  const total = altura + alturaJanela;
  return total <= 0 ? 0 : limitar((alturaJanela - topo) / total);
}

/**
 * Lê o progresso de rolagem do elemento numa ref (sem setState). A rolagem continua nativa:
 * ouvinte passivo, nada de preventDefault. Use `aoMudar` para chamar `invalidate()` da cena.
 */
export function useProgressoScroll<T extends HTMLElement>(aoMudar?: (p: number) => void) {
  const alvo = useRef<T>(null);
  const progresso = useRef(0);
  const cb = useRef(aoMudar);
  cb.current = aoMudar;
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      const el = alvo.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = calcularProgresso(r.top, r.height, window.innerHeight);
      if (p !== progresso.current) {
        progresso.current = p;
        cb.current?.(p);
      }
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    return () => {
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return { alvo, progresso };
}
