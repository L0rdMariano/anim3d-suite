// Planta baixa 2D ao vivo: setores clicáveis, estantes, esteira, caminhões e empilhadeiras (posição real da simulação).
// Atualiza os atributos SVG direto (requestAnimationFrame), sem re-render do React.
import { useEffect, useRef } from 'react';
import { GEO, meioComprimento, xRack, type Posicao } from './dados';
import { ESTEIRA, PREDIO, SETORES, type IdSetor, type Simulacao } from './simulacao';

export function Planta({ sim, setor, aoSetor, selecionado }: {
  sim: Simulacao;
  setor: IdSetor | null;
  aoSetor: (s: IdSetor | null) => void;
  selecionado: Posicao | null;
}) {
  const emp = useRef<(SVGGElement | null)[]>([]);
  const cam = useRef<(SVGRectElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const laco = () => {
      sim.empilhadeiras.forEach((e, i) => {
        emp.current[i]?.setAttribute('transform', `translate(${e.x} ${e.z}) rotate(${(-e.ang * 180) / Math.PI})`);
      });
      [sim.receb, sim.exped].forEach((c, i) => {
        const r = cam.current[i];
        if (!r) return;
        r.setAttribute('y', String(c.z));
        r.style.display = c.estado === 'fora' || c.z > 40 ? 'none' : '';
      });
      raf = requestAnimationFrame(laco);
    };
    laco();
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  return (
    <svg className="planta" viewBox={`${PREDIO.x0 - 1} ${PREDIO.z0 - 1} ${PREDIO.x1 - PREDIO.x0 + 2} ${PREDIO.z1 - PREDIO.z0 + 9}`} aria-label="Planta baixa do almoxarifado">
      <rect x={PREDIO.x0} y={PREDIO.z0} width={PREDIO.x1 - PREDIO.x0} height={PREDIO.z1 - PREDIO.z0} className="planta-predio" />
      {SETORES.map((s) => (
        <rect
          key={s.id}
          x={s.x0 + 0.2}
          y={s.z0 + 0.2}
          width={s.x1 - s.x0 - 0.4}
          height={s.z1 - s.z0 - 0.4}
          rx={0.6}
          fill={s.cor}
          fillOpacity={setor === s.id ? 0.4 : 0.14}
          stroke={s.cor}
          strokeWidth={setor === s.id ? 0.5 : 0.2}
          style={{ cursor: 'pointer' }}
          onClick={() => aoSetor(setor === s.id ? null : s.id)}
        >
          <title>{s.nome}</title>
        </rect>
      ))}
      {Array.from({ length: GEO.corredores }, (_, c) =>
        ([-1, 1] as const).map((l) => (
          <rect key={`${c}${l}`} x={xRack(c, l) - GEO.profRack / 2} y={-meioComprimento} width={GEO.profRack} height={meioComprimento * 2} className="planta-rack" />
        )),
      )}
      <line x1={ESTEIRA.x0} x2={ESTEIRA.x1} y1={ESTEIRA.z} y2={ESTEIRA.z} className="planta-esteira" />
      {[0, 1].map((i) => (
        <rect key={i} ref={(el) => void (cam.current[i] = el)} x={(i ? sim.exped.x : sim.receb.x) - 1.3} y={30} width={2.6} height={12} rx={0.4} className="planta-caminhao" />
      ))}
      {selecionado && <circle cx={selecionado.x} cy={selecionado.z} r={1.4} className="planta-sel" />}
      {sim.empilhadeiras.map((e, i) => (
        <g key={e.id} ref={(el) => void (emp.current[i] = el)}>
          <circle r={1.1} fill={e.papel === 'recebimento' ? '#38bdf8' : '#facc15'} stroke="#0b0f1d" strokeWidth={0.3} />
          <path d="M0 0.4 L0 1.9" stroke="#0b0f1d" strokeWidth={0.45} />
        </g>
      ))}
    </svg>
  );
}
