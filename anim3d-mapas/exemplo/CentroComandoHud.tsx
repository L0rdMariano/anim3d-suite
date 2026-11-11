// HUD em HTML do Centro de Comando: tudo que é texto e número fica fora do canvas (legível, selecionável, acessível).
// Lê a simulação direto; quem renderiza decide a frequência (a cena atualiza ~3x/s).
import type { RefObject } from 'react';
import { nomeEnDoPais, paisNoPonto } from './mapaPaises';
import { dataCentersDoPais } from './datacenters';
import { fmtArea, fmtDensidade, fmtPessoas, fonteDosPaises, idPorAlfa3, infoPais, nomeIdioma, nomeMoeda, regiaoPt } from './paisesInfo';
import {
  ataquesPorMinuto,
  estadoDoNo,
  NOS,
  ROTULO_PAPEL,
  ROTULO_SEVERIDADE,
  taxaBloqueio,
  vetorPredominante,
  type Evento,
  type No,
  type Simulacao,
} from './centroComandoSim';

/** Forma do mapa: plano (o mundo todo legível, padrão) ou globo (vitrine). */
export type Projecao = 'plano' | 'globo';

export interface HudRefs {
  raiz: RefObject<HTMLDivElement | null>;
  painel: RefObject<HTMLElement | null>;
  linha: RefObject<SVGPathElement | null>;
  ponto: RefObject<SVGCircleElement | null>;
  rotulo: RefObject<HTMLDivElement | null>;
  /** Contêiner dos nomes de países e cidades (a cena posiciona cada filho a cada quadro). */
  paises: RefObject<HTMLDivElement | null>;
  /** Rótulos de cidade dos data centers do país selecionado (a cena preenche e posiciona). */
  dcs: RefObject<HTMLDivElement | null>;
}

const nf = new Intl.NumberFormat('pt-BR');
const nome = (id: string) => NOS.find((n) => n.id === id)?.nome ?? id;
const ROTULO_ESTADO = { normal: 'NORMAL', 'sob-ataque': 'SOB ATAQUE', mitigado: 'MITIGADO' } as const;

function relogio(s: number) {
  const m = Math.floor(s / 60);
  return `+${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
const fmtVolume = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${nf.format(mb)} MB`);

function Sparkline({ valores }: { valores: number[] }) {
  const max = Math.max(...valores, 3);
  const w = 100;
  const h = 28;
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * w},${h - (v / max) * (h - 3) - 1}`);
  return (
    <svg className="cc-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Ataques recebidos nos últimos 60 segundos">
      <polyline points={`0,${h} ${pts.join(' ')} ${w},${h}`} className="cc-spark-area" />
      <polyline points={pts.join(' ')} className="cc-spark-linha" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Painel({ no, sim, refs, aoFechar, aoSelecionar }: { no: No; sim: Simulacao; refs: HudRefs; aoFechar: () => void; aoSelecionar: (id: string) => void }) {
  const e = sim.estat[no.id];
  const estado = estadoDoNo(sim, no.id);
  const recentes = sim.log.filter((x) => x.tipo === 'ataque' && x.destino === no.id).slice(0, 4);
  return (
    <section ref={refs.painel} className="cc-painel" aria-label={`Detalhes de ${no.nome}`}>
      <header>
        <div>
          <small>{ROTULO_PAPEL[no.papel].toUpperCase()}</small>
          <h2>{no.nome}</h2>
          <span className="cc-coord">
            {no.pais} · {Math.abs(no.lat).toFixed(2)}°{no.lat < 0 ? 'S' : 'N'} {Math.abs(no.lon).toFixed(2)}°{no.lon < 0 ? 'O' : 'L'}
          </span>
        </div>
        <button className="cc-fechar" onClick={aoFechar} aria-label="Fechar detalhes (Esc)">
          ✕
        </button>
      </header>
      <p className={`cc-estado cc-estado-${estado}`}>
        <i aria-hidden="true" /> {ROTULO_ESTADO[estado]}
      </p>
      <dl className="cc-stats">
        <div>
          <dt>Ataques recebidos</dt>
          <dd>{nf.format(e.recebidos)}</dd>
        </div>
        <div>
          <dt>Bloqueados</dt>
          <dd>{Math.round(taxaBloqueio(e) * 100)}%</dd>
        </div>
        <div>
          <dt>Origem de ataques</dt>
          <dd>{nf.format(e.origemAtaques)}</dd>
        </div>
        <div>
          <dt>Tráfego</dt>
          <dd>{fmtVolume(Math.round(e.fluxoMb))}</dd>
        </div>
      </dl>
      <div className="cc-bloco">
        <span>Últimos 60 s</span>
        <Sparkline valores={e.historico} />
      </div>
      <div className="cc-bloco">
        <span>Vetor predominante</span>
        <b>{vetorPredominante(e)}</b>
      </div>
      <div className="cc-bloco">
        <span>Eventos recentes</span>
        {recentes.length === 0 ? (
          <em className="cc-vazio">Nenhum ataque recente.</em>
        ) : (
          <ul className="cc-recentes">
            {recentes.map((x) => (
              <li key={x.id}>
                <i className={`cc-sev cc-sev-${x.severidade}`} aria-hidden="true" />
                <button onClick={() => aoSelecionar(x.origem)} title={`Ir para ${nome(x.origem)}`}>
                  {x.vetor} ← {nome(x.origem)}
                </button>
                <small>{x.bloqueado ? 'bloqueado' : 'passou'}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const paisDoNo = new Map<string, string | undefined>();
const paisDoPonto = (n: No) => {
  if (!paisDoNo.has(n.id)) paisDoNo.set(n.id, paisNoPonto(n.lat, n.lon)?.id);
  return paisDoNo.get(n.id);
};

function PainelPais({ id, sim, refs, aoFechar, aoPais, aoAbrirBrasil }: { id: string; sim: Simulacao; refs: HudRefs; aoFechar: () => void; aoPais: (id: string) => void; aoAbrirBrasil?: () => void }) {
  const info = infoPais(id);
  const pontos = NOS.filter((n) => paisDoPonto(n) === id);
  const recebidos = pontos.reduce((s, n) => s + sim.estat[n.id].recebidos, 0);
  const bloqueados = pontos.reduce((s, n) => s + sim.estat[n.id].bloqueados, 0);
  const titulo = info?.n ?? nomeEnDoPais(id);
  return (
    <section ref={refs.painel} className="cc-painel" aria-label={`Detalhes de ${titulo}`}>
      <header>
        <div>
          <small>PAÍS{info ? ` · ${info.g}` : ''}</small>
          <h2>{titulo}</h2>
          {info && <span className="cc-coord">{info.o !== info.n ? info.o : regiaoPt(info)}</span>}
        </div>
        <button className="cc-fechar" onClick={aoFechar} aria-label="Fechar detalhes (Esc)">
          ✕
        </button>
      </header>
      {info ? (
        <>
          <dl className="cc-stats">
            <div>
              <dt>População{info.pa ? ` (${info.pa})` : ''}</dt>
              <dd>{info.p ? fmtPessoas(info.p) : '—'}</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd className="cc-pequeno">{info.a ? fmtArea(info.a) : '—'}</dd>
            </div>
            <div>
              <dt>Capital</dt>
              <dd className="cc-pequeno">{info.c ?? '—'}</dd>
            </div>
            <div>
              <dt>Densidade</dt>
              <dd className="cc-pequeno">{info.p && info.a ? fmtDensidade(info.p, info.a) : '—'}</dd>
            </div>
          </dl>
          {info?.g === 'BRA' && aoAbrirBrasil && (
            <button className="cc-acao" onClick={aoAbrirBrasil}>
              Abrir mapa do Brasil · dados do IBGE →
            </button>
          )}
          <div className="cc-bloco">
            <span>Região</span>
            <b className="cc-normal">{regiaoPt(info)}</b>
          </div>
          {info.i.length > 0 && (
            <div className="cc-bloco">
              <span>Idiomas</span>
              <b className="cc-normal">{info.i.map(nomeIdioma).join(', ')}</b>
            </div>
          )}
          {info.m.length > 0 && (
            <div className="cc-bloco">
              <span>Moeda</span>
              <b className="cc-normal">{info.m.map(nomeMoeda).join(', ')}</b>
            </div>
          )}
          {info.b.length > 0 && (
            <div className="cc-bloco">
              <span>Fronteiras ({info.b.length})</span>
              <div className="cc-vizinhos">
                {info.b.map((g) => {
                  const vid = idPorAlfa3(g);
                  const v = vid ? infoPais(vid) : undefined;
                  return vid && v ? (
                    <button key={g} onClick={() => aoPais(vid)}>
                      {v.n}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="cc-vazio">Sem ficha de dados para este território.</p>
      )}
      {info && dataCentersDoPais(info.g).length > 0 && (
        <div className="cc-bloco">
          <span>Data centers ({dataCentersDoPais(info.g).length}) · hubs principais</span>
          <div className="cc-vizinhos cc-dcs-lista">
            {dataCentersDoPais(info.g).map((d) => (
              <span key={d.id}>{d.cidade}</span>
            ))}
          </div>
        </div>
      )}
      <div className="cc-bloco">
        <span>Rede neste país</span>
        {pontos.length === 0 ? (
          <em className="cc-vazio">Nenhum ponto de presença monitorado.</em>
        ) : (
          <b className="cc-normal">
            {pontos.map((n) => n.nome).join(', ')} · {nf.format(recebidos)} ataques, {recebidos ? Math.round((bloqueados / recebidos) * 100) : 100}% bloqueados
          </b>
        )}
      </div>
      <small className="cc-fonte">Fonte: {fonteDosPaises}</small>
    </section>
  );
}

function Lista({ sim, aoSelecionar }: { sim: Simulacao; aoSelecionar: (id: string) => void }) {
  const ordenados = [...NOS].sort((a, b) => sim.estat[b.id].recebidos - sim.estat[a.id].recebidos).slice(0, 8);
  const max = Math.max(...ordenados.map((n) => sim.estat[n.id].recebidos), 1);
  return (
    <section className="cc-lista" aria-label="Pontos mais atacados">
      <h2>PONTOS MAIS ATACADOS</h2>
      <ul>
        {ordenados.map((n) => {
          const estado = estadoDoNo(sim, n.id);
          return (
            <li key={n.id}>
              <button onClick={() => aoSelecionar(n.id)}>
                <i className={`cc-pt cc-pt-${estado}`} aria-hidden="true" />
                <span>{n.nome}</span>
                <b>{nf.format(sim.estat[n.id].recebidos)}</b>
                <span className="cc-barra" style={{ ['--v' as string]: `${(sim.estat[n.id].recebidos / max) * 100}%` }} />
              </button>
            </li>
          );
        })}
      </ul>
      <small className="cc-dica">Clique num país ou ponto do globo, ou na lista</small>
    </section>
  );
}

function ItemFeed({ e, aoSelecionar }: { e: Evento; aoSelecionar: (id: string) => void }) {
  return (
    <li className={`cc-item cc-item-${e.severidade}`}>
      <button onClick={() => aoSelecionar(e.destino)} title={`Ir para ${nome(e.destino)}`}>
        <time>{relogio(e.t)}</time>
        <span className={`cc-tag cc-sev-${e.severidade}`}>{ROTULO_SEVERIDADE[e.severidade]}</span>
        <span className="cc-vetor">{e.vetor}</span>
        <span className="cc-rota">
          {nome(e.origem)} → {nome(e.destino)}
        </span>
        <span className={e.bloqueado ? 'cc-res cc-ok' : 'cc-res cc-falha'}>{e.bloqueado ? 'BLOQUEADO' : 'PASSOU'}</span>
      </button>
    </li>
  );
}

export function CentroComandoHud({ sim, selecionado, aoSelecionar, pais, aoPais, aoAbrirBrasil, refs, zoom, aoZoom, paises, projecao, aoProjecao, dcAtivo, aoDcAtivo }: { sim: Simulacao; selecionado: string | null; aoSelecionar: (id: string | null) => void; pais: string | null; aoPais: (id: string | null) => void; aoAbrirBrasil?: () => void; refs: HudRefs; zoom: number; aoZoom: (z: number) => void; paises: string[]; projecao: Projecao; aoProjecao: (p: Projecao) => void; dcAtivo: boolean; aoDcAtivo: (v: boolean) => void }) {
  const no = selecionado ? NOS.find((n) => n.id === selecionado) : undefined;
  const ataques = sim.log.filter((e) => e.tipo === 'ataque').slice(0, 6);
  const apm = ataquesPorMinuto(sim);
  const bloqueio = sim.totais.ataques ? Math.round((sim.totais.bloqueados / sim.totais.ataques) * 100) : 100;
  const gbs = sim.t > 1 ? sim.totais.fluxoMb / 1024 / sim.t : 0;
  const campanha = sim.campanha ? NOS.find((n) => n.id === sim.campanha!.alvo) : undefined;

  return (
    <div className="cc-hud">
      <svg className="cc-chamada" aria-hidden="true">
        <path ref={refs.linha} d="M0 0" />
        <circle ref={refs.ponto} r="4" />
      </svg>
      <div ref={refs.paises} className="cc-paises" aria-hidden="true">
        {paises.map((n) => (
          <span key={n} className="cc-pais">
            {n}
          </span>
        ))}
        {NOS.map((n) => (
          <span key={n.id} className="cc-cidade">
            {n.nome}
          </span>
        ))}
      </div>
      <div ref={refs.dcs} className="cc-paises cc-dcs" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className="cc-dc-rotulo" />
        ))}
      </div>
      <div ref={refs.rotulo} className="cc-rotulo-no" aria-hidden="true" />
      <div className="cc-zoom" role="group" aria-label="Zoom do mapa">
        <button onClick={() => aoZoom(Math.min(2, zoom + 1))} disabled={zoom >= 2} aria-label="Aproximar">+</button>
        <button onClick={() => aoZoom(Math.max(0, zoom - 1))} disabled={zoom <= 0} aria-label="Afastar">−</button>
        <button className={`cc-camada${dcAtivo ? ' ativo' : ''}`} aria-pressed={dcAtivo} onClick={() => aoDcAtivo(!dcAtivo)} aria-label="Data centers" title="Mostrar ou ocultar os hubs de data center">
          <i aria-hidden="true" />
        </button>
      </div>

      <header className="cc-topo">
        <div>
          <b>CENTRO DE OPERAÇÕES DE REDE</b>
          <span className="cc-sim" title="Os eventos são gerados por uma simulação, não são ataques reais">
            SIMULAÇÃO
          </span>
        </div>
        <time>{relogio(sim.t)}</time>
        <div className="cc-proj" role="group" aria-label="Forma do mapa">
          <button className={projecao === 'plano' ? 'ativo' : ''} aria-pressed={projecao === 'plano'} onClick={() => aoProjecao('plano')}>
            Plano
          </button>
          <button className={projecao === 'globo' ? 'ativo' : ''} aria-pressed={projecao === 'globo'} onClick={() => aoProjecao('globo')}>
            Globo
          </button>
        </div>
      </header>

      {campanha && (
        <p className="cc-alerta" role="status">
          <i aria-hidden="true" /> CAMPANHA DETECTADA · {sim.campanha!.vetor} contra {campanha.nome}
        </p>
      )}

      <dl className="cc-contadores">
        <div>
          <dt>Ataques / min</dt>
          <dd>{nf.format(apm)}</dd>
        </div>
        <div>
          <dt>Bloqueados</dt>
          <dd className="cc-ok">{bloqueio}%</dd>
        </div>
        <div>
          <dt>Tráfego</dt>
          <dd>{gbs.toFixed(1).replace('.', ',')} GB/s</dd>
        </div>
      </dl>

      <aside className="cc-lateral">
        {no ? (
          <Painel no={no} sim={sim} refs={refs} aoFechar={() => aoSelecionar(null)} aoSelecionar={aoSelecionar} />
        ) : pais ? (
          <PainelPais id={pais} sim={sim} refs={refs} aoFechar={() => aoPais(null)} aoPais={aoPais} aoAbrirBrasil={aoAbrirBrasil} />
        ) : (
          <Lista sim={sim} aoSelecionar={aoSelecionar} />
        )}
      </aside>

      <ol className="cc-feed" aria-label="Eventos de segurança recentes" aria-live="off">
        {ataques.map((e) => (
          <ItemFeed key={e.id} e={e} aoSelecionar={aoSelecionar} />
        ))}
      </ol>

      <ul className="cc-legenda" aria-label="Legenda">
        <li><i className="cc-sev-critica" />Crítico</li>
        <li><i className="cc-sev-alta" />Alto</li>
        <li><i className="cc-sev-media" />Médio</li>
        <li><i className="cc-leg-fluxo" />Fluxo</li>
        <li><i className="cc-leg-escudo" />Bloqueado</li>
        <li><i className="cc-leg-dc" />Data center</li>
      </ul>
    </div>
  );
}
