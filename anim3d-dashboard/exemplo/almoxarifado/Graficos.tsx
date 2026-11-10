// Gráficos 2D leves (SVG puro) para os painéis. Valores exatos sempre em texto; cor nunca é a única pista.
import type { ReactNode } from 'react';

export interface Serie {
  nome: string;
  cor: string;
  valores: number[];
}

export function Linhas({ series, rotulos, altura = 130, titulo }: { series: Serie[]; rotulos: string[]; altura?: number; titulo: string }) {
  const W = 320, H = altura, m = { l: 26, r: 8, t: 8, b: 18 };
  const n = Math.max(1, ...series.map((s) => s.valores.length));
  const max = Math.max(1, ...series.flatMap((s) => s.valores));
  const topo = Math.ceil(max / 2) * 2;
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - m.l - m.r));
  const y = (v: number) => H - m.b - (v / topo) * (H - m.t - m.b);
  const passo = Math.max(1, Math.ceil(n / 5));
  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}: ${series.map((s) => `${s.nome} último ${s.valores.at(-1) ?? 0}`).join(', ')}`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={m.l} x2={W - m.r} y1={y(topo * f)} y2={y(topo * f)} className="grade" />
            <text x={m.l - 4} y={y(topo * f) + 3} textAnchor="end" className="eixo">
              {Math.round(topo * f)}
            </text>
          </g>
        ))}
        {rotulos.map((r, i) =>
          i % passo === 0 ? (
            <text key={i} x={x(i)} y={H - 4} textAnchor="middle" className="eixo">
              {r}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.nome}>
            <polyline points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" />
            {s.valores.length > 0 && <circle cx={x(s.valores.length - 1)} cy={y(s.valores.at(-1)!)} r={3} fill={s.cor} />}
          </g>
        ))}
      </svg>
      <ul className="legenda">
        {series.map((s) => (
          <li key={s.nome}>
            <i style={{ background: s.cor }} />
            {s.nome} <b>{s.valores.at(-1) ?? 0}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function BarrasH({ itens, titulo, formato = (v) => String(v), max }: {
  itens: { rotulo: string; valor: number; cor?: string; aoClicar?: () => void }[];
  titulo: string;
  formato?: (v: number) => string;
  max?: number;
}) {
  const topo = max ?? Math.max(1, ...itens.map((i) => i.valor));
  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      <ul className="barras">
        {itens.map((i) => {
          const conteudo: ReactNode = (
            <>
              <span className="rot">{i.rotulo}</span>
              <span className="trilho">
                <span style={{ width: `${(i.valor / topo) * 100}%`, background: i.cor ?? 'var(--cor-primaria)' }} />
              </span>
              <b>{formato(i.valor)}</b>
            </>
          );
          return <li key={i.rotulo}>{i.aoClicar ? <button onClick={i.aoClicar}>{conteudo}</button> : conteudo}</li>;
        })}
      </ul>
    </figure>
  );
}

export function Empilhada({ partes, titulo }: { partes: { rotulo: string; valor: number; cor: string }[]; titulo: string }) {
  const total = Math.max(1, partes.reduce((s, p) => s + p.valor, 0));
  return (
    <figure className="grafico">
      <figcaption>{titulo}</figcaption>
      <div className="empilhada" role="img" aria-label={partes.map((p) => `${p.rotulo}: ${p.valor}`).join(', ')}>
        {partes.map((p) => (
          <span key={p.rotulo} style={{ flexGrow: p.valor, background: p.cor }} title={`${p.rotulo}: ${p.valor}`} />
        ))}
      </div>
      <ul className="legenda">
        {partes.map((p) => (
          <li key={p.rotulo}>
            <i style={{ background: p.cor }} />
            {p.rotulo} <b>{p.valor}</b> <small>{Math.round((p.valor / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Medidor({ valor, max, rotulo, cor }: { valor: number; max: number; rotulo: string; cor: string }) {
  return (
    <div className="medidor">
      <div className="medidor-topo">
        <span>{rotulo}</span>
        <b>
          {valor}/{max}
        </b>
      </div>
      <div className="trilho" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor} aria-label={rotulo}>
        <span style={{ width: `${Math.min(100, (valor / max) * 100)}%`, background: cor }} />
      </div>
    </div>
  );
}
