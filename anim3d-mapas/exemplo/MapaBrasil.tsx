// Mapa do Brasil por estado com dados do IBGE: mapa coroplético clicável + painel de informações.
// SVG puro (leve, nítido, acessível por teclado). Dados: snapshot em dados/ibge-brasil.json.
import { useEffect, useMemo, useState } from 'react';
import {
  anoCenso,
  anoPib,
  caminho,
  centroide,
  corEscala,
  densidade,
  ESTADOS,
  fmtCompacto,
  fmtDecimal,
  fmtInteiro,
  fonteIbge,
  METRICAS,
  metricaPorId,
  normalizar,
  pibBilhoes,
  pibPerCapita,
  posicao,
  ranking,
  TOTAIS,
  VIEWBOX,
  type Estado,
  type MetricaId,
} from './ibgeBrasil';

function PainelEstado({ e, aoFechar }: { e: Estado; aoFechar: () => void }) {
  const dens = densidade(e);
  const pc = pibPerCapita(e);
  const rank = (id: MetricaId) => `${posicao(metricaPorId(id), e)}º de 27`;
  return (
    <section className="cc-painel" aria-label={`Detalhes de ${e.nome}`}>
      <header>
        <div>
          <small>
            REGIÃO {e.regiao.toUpperCase()} · {e.sigla}
          </small>
          <h2>{e.nome}</h2>
          <span className="cc-coord">Capital: {e.capital}</span>
        </div>
        <button className="cc-fechar" onClick={aoFechar} aria-label="Fechar detalhes (Esc)">
          ✕
        </button>
      </header>
      <dl className="cc-stats">
        <div>
          <dt>População ({anoCenso})</dt>
          <dd>{fmtInteiro(e.populacao)}</dd>
        </div>
        <div>
          <dt>% do Brasil</dt>
          <dd>{fmtDecimal((e.populacao / TOTAIS.populacao) * 100)}%</dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd className="cc-pequeno">{fmtInteiro(e.areaKm2)} km²</dd>
        </div>
        <div>
          <dt>Densidade</dt>
          <dd className="cc-pequeno">{fmtDecimal(dens)} hab/km²</dd>
        </div>
        <div>
          <dt>PIB ({anoPib})</dt>
          <dd className="cc-pequeno">R$ {fmtDecimal(pibBilhoes(e))} bi</dd>
        </div>
        <div>
          <dt>PIB per capita</dt>
          <dd className="cc-pequeno">R$ {fmtInteiro(pc)}</dd>
        </div>
      </dl>
      <div className="cc-bloco">
        <span>Municípios</span>
        <b>{fmtInteiro(e.municipios)}</b>
      </div>
      <div className="cc-bloco">
        <span>Posição entre os estados</span>
        <ul className="cc-posicoes">
          <li>População <b>{rank('populacao')}</b></li>
          <li>Área <b>{rank('area')}</b></li>
          <li>Densidade <b>{rank('densidade')}</b></li>
          <li>PIB per capita <b>{rank('pibpc')}</b></li>
        </ul>
      </div>
      <small className="cc-fonte">Fonte: IBGE</small>
    </section>
  );
}

function Ranking({ metrica, aoSelecionar }: { metrica: MetricaId; aoSelecionar: (id: string) => void }) {
  const m = metricaPorId(metrica);
  const lista = useMemo(() => ranking(m), [m]);
  const max = m.valor(lista[0]);
  return (
    <section className="cc-lista cc-br-ranking" aria-label={`Ranking por ${m.curto}`}>
      <h2>BRASIL</h2>
      <dl className="cc-br-totais">
        <div><dt>População</dt><dd>{fmtCompacto(TOTAIS.populacao)}</dd></div>
        <div><dt>Área</dt><dd>{fmtCompacto(TOTAIS.areaKm2)} km²</dd></div>
        <div><dt>Municípios</dt><dd>{fmtInteiro(TOTAIS.municipios)}</dd></div>
        <div><dt>PIB {anoPib}</dt><dd>R$ {fmtDecimal(TOTAIS.pibMilReais / 1e9)} tri</dd></div>
      </dl>
      <h2 className="cc-br-sub">RANKING · {m.curto.toUpperCase()}</h2>
      <ul>
        {lista.slice(0, 10).map((e, i) => (
          <li key={e.id}>
            <button onClick={() => aoSelecionar(e.id)}>
              <i className="cc-br-pos">{i + 1}</i>
              <span>{e.nome}</span>
              <b>{m.formatar(m.valor(e))}</b>
              <span className="cc-barra" style={{ ['--v' as string]: `${(m.valor(e) / max) * 100}%` }} />
            </button>
          </li>
        ))}
      </ul>
      <small className="cc-dica">Clique num estado do mapa ou da lista</small>
    </section>
  );
}

export default function MapaBrasil({ aoVoltar }: { aoVoltar: () => void }) {
  const [metrica, setMetrica] = useState<MetricaId>('populacao');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const m = metricaPorId(metrica);
  const geom = useMemo(() => ESTADOS.map((e) => ({ e, d: caminho(e), c: centroide(e) })), []);
  const sel = ESTADOS.find((e) => e.id === selecionado);
  const dica = ESTADOS.find((e) => e.id === (hover ?? selecionado));

  useEffect(() => {
    const esc = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (selecionado) setSelecionado(null);
      else aoVoltar();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [selecionado, aoVoltar]);

  const vals = ESTADOS.map(m.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  return (
    <div className="cc-raiz cc-br" data-metrica={metrica}>
      <header className="cc-br-topo">
        <nav aria-label="Navegação" className="cc-br-trilha">
          <button onClick={aoVoltar}>◂ Mundo</button>
          <span aria-hidden="true">›</span>
          <b aria-current="page">Brasil</b>
          <span className="cc-sim" title="Dados oficiais do IBGE (snapshot local)" style={{ borderColor: 'var(--cc-ok)', color: 'var(--cc-ok)' }}>
            IBGE
          </span>
        </nav>
        <div className="cc-br-metricas" role="group" aria-label="Indicador exibido no mapa">
          {METRICAS.map((x) => (
            <button key={x.id} className={x.id === metrica ? 'ativo' : ''} aria-pressed={x.id === metrica} onClick={() => setMetrica(x.id)}>
              {x.curto}
            </button>
          ))}
        </div>
      </header>

      <div className="cc-br-mapa">
        <svg viewBox={`0 0 ${VIEWBOX.largura} ${VIEWBOX.altura}`} role="group" aria-label={`Mapa do Brasil por estado: ${m.rotulo}`} preserveAspectRatio="xMidYMid meet">
          <g>
            {geom.map(({ e, d }, i) => {
              const v = m.valor(e);
              return (
                <path
                  key={e.id}
                  d={d}
                  className={`cc-uf${e.id === selecionado ? ' sel' : ''}${e.id === hover ? ' hover' : ''}`}
                  style={{ fill: corEscala(normalizar(m, v)), animationDelay: `${i * 18}ms` }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${e.nome}: ${m.formatar(v)}`}
                  aria-pressed={e.id === selecionado}
                  onClick={() => setSelecionado(e.id === selecionado ? null : e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setSelecionado(e.id === selecionado ? null : e.id);
                    }
                  }}
                  onPointerEnter={() => setHover(e.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(e.id)}
                  onBlur={() => setHover(null)}
                />
              );
            })}
          </g>
          <g className="cc-uf-siglas" aria-hidden="true">
            {geom.map(({ e, c }) => (
              <text key={e.id} x={c[0]} y={c[1]} className={e.areaKm2 < 60000 ? 'pequeno' : ''}>
                {e.sigla}
              </text>
            ))}
          </g>
          {sel && (
            <g className="cc-uf-marca" aria-hidden="true">
              <circle cx={centroide(sel)[0]} cy={centroide(sel)[1] + 0.9} r="0.5" />
              <circle cx={centroide(sel)[0]} cy={centroide(sel)[1] + 0.9} r="0.5" className="onda" />
            </g>
          )}
        </svg>
        {dica && (
          <div className="cc-br-dica" aria-hidden="true">
            <b>{dica.nome}</b>
            <span>{m.formatar(m.valor(dica))}</span>
          </div>
        )}
      </div>

      <aside className="cc-lateral">{sel ? <PainelEstado e={sel} aoFechar={() => setSelecionado(null)} /> : <Ranking metrica={metrica} aoSelecionar={setSelecionado} />}</aside>

      <footer className="cc-br-legenda">
        <span>{m.rotulo}</span>
        <div>
          <small>{m.formatar(min)}</small>
          <i aria-hidden="true" />
          <small>{m.formatar(max)}</small>
        </div>
        <small className="cc-br-fonte" title={fonteIbge}>
          Fonte: IBGE
        </small>
      </footer>
    </div>
  );
}
