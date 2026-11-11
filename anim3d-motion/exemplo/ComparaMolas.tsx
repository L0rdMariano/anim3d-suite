// Exemplo anim3d-motion · Mola × curva fixa, lado a lado. Clique em "Alternar alvo" VÁRIAS VEZES, no meio do movimento:
// as molas continuam a velocidade e mudam de direção com naturalidade; a curva fixa é reiniciada e "para e arranca".
// Também mostra a trajetória de cada preset (calculada pelo motor) e o tempo real de assentamento.
import { useEffect, useMemo, useRef, useState } from 'react';
import { EASE, lerp, useMovimentoReduzido } from '@anim3d/kit';
import { MOLAS, passoMola, regime, tempoDeAssentamento, zeta, type EstadoMola, type ParamMola } from '../motor/mola';

const NOMES = Object.keys(MOLAS) as (keyof typeof MOLAS)[];
const COR = ['#22d3ee', '#3ddc97', '#ffd23f', '#ff8a3d', '#c4b5fd'];
const DURACAO_CURVA = 0.45; // s

/** Pontos (tempo → posição) da mola partindo do repouso: o que o motor calcula, desenhado. */
function trajetoria(p: ParamMola, total = 1.6, n = 120): [number, number][] {
  let e: EstadoMola = { x: 0, v: 0 };
  const pts: [number, number][] = [[0, 0]];
  for (let i = 1; i <= n; i++) {
    e = passoMola(p, e, 1, total / n);
    pts.push([(i / n) * total, e.x]);
  }
  return pts;
}

export function ComparaMolas() {
  const reduzido = useMovimentoReduzido();
  const [alvo, setAlvo] = useState(1);
  const bolas = useRef<(HTMLSpanElement | null)[]>([]);
  const estados = useRef<EstadoMola[]>(NOMES.map(() => ({ x: 0, v: 0 })));
  const curva = useRef({ de: 0, para: 1, inicio: 0, x: 0 });
  const alvoRef = useRef(alvo);
  alvoRef.current = alvo;

  const dados = useMemo(
    () => NOMES.map((n) => ({ n, p: MOLAS[n] as ParamMola, z: zeta(MOLAS[n]), r: regime(MOLAS[n]), t: tempoDeAssentamento(MOLAS[n]), pts: trajetoria(MOLAS[n]) })),
    [],
  );

  // a curva fixa reinicia a cada troca de alvo, partindo de onde está (velocidade volta a zero: é o ponto da demonstração)
  useEffect(() => {
    curva.current = { de: curva.current.x, para: alvo, inicio: performance.now(), x: curva.current.x };
  }, [alvo]);

  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const quadro = (agora: number) => {
      const dt = Math.min(0.1, (agora - ultimo) / 1000);
      ultimo = agora;
      NOMES.forEach((n, i) => {
        estados.current[i] = reduzido ? { x: alvoRef.current, v: 0 } : passoMola(MOLAS[n], estados.current[i], alvoRef.current, dt);
        const b = bolas.current[i];
        if (b) b.style.left = `${estados.current[i].x * 100}%`;
      });
      const c = curva.current;
      const k = reduzido ? 1 : Math.min(1, (agora - c.inicio) / 1000 / DURACAO_CURVA);
      c.x = lerp(c.de, c.para, EASE.padrao(k));
      const b = bolas.current[NOMES.length];
      if (b) b.style.left = `${c.x * 100}%`;
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [reduzido]);

  const W = 260;
  const H = 70;
  return (
    <div style={{ padding: 16, display: 'grid', gap: 14, overflow: 'hidden', boxSizing: 'border-box', minWidth: 0, color: 'var(--texto, #e5e7eb)', font: '13px/1.4 system-ui, sans-serif' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setAlvo((a) => 1 - a)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--borda, #334)', background: 'var(--superficie, #0d1222)', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}>
          Alternar alvo
        </button>
        <small style={{ color: 'var(--suave, #94a3b8)' }}>Clique várias vezes rápido: veja quem continua a velocidade e quem "para e arranca".</small>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {dados.map((d, i) => (
          <div key={d.n} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600 }}>{d.n}</span>
            <div style={{ position: 'relative', height: 22, borderRadius: 11, background: 'var(--superficie, #0d1222)', border: '1px solid var(--borda, #334)' }}>
              <span ref={(el) => { bolas.current[i] = el; }} style={{ position: 'absolute', top: 2, width: 16, height: 16, marginLeft: -8, borderRadius: '50%', background: COR[i], boxShadow: `0 0 8px ${COR[i]}` }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, color: '#ff3b5c' }}>curva fixa</span>
          <div style={{ position: 'relative', height: 22, borderRadius: 11, background: 'var(--superficie, #0d1222)', border: '1px solid #ff3b5c66' }}>
            <span ref={(el) => { bolas.current[NOMES.length] = el; }} style={{ position: 'absolute', top: 2, width: 16, height: 16, marginLeft: -8, borderRadius: '50%', background: '#ff3b5c', boxShadow: '0 0 8px #ff3b5c' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {dados.map((d, i) => (
          <figure key={d.n} style={{ margin: 0, padding: 8, border: '1px solid var(--borda, #334)', borderRadius: 8, background: 'var(--superficie, #0d1222)' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Trajetória da mola ${d.n}`}>
              <line x1="0" x2={W} y1={H - 10 - 50} y2={H - 10 - 50} stroke="var(--borda, #334)" strokeDasharray="3 3" />
              <polyline fill="none" stroke={COR[i]} strokeWidth="2" points={d.pts.map(([t, x]) => `${(t / 1.6) * W},${H - 10 - x * 50}`).join(' ')} />
            </svg>
            <figcaption style={{ fontSize: 11.5, color: 'var(--suave, #94a3b8)' }}>
              <b style={{ color: COR[i] }}>{d.n}</b> · ζ {d.z.toFixed(2)} · {d.r} · assenta em {d.t.toFixed(2)} s
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
