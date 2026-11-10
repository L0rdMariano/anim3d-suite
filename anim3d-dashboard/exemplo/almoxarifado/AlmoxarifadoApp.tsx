// Exemplo anim3d-dashboard · Almoxarifado 3D de ponta a ponta (app completo).
// Shell: barra lateral (setores + telas), cabeçalho (busca, relógio, velocidade), indicadores,
// mapa 3D com planta 2D e painel por setor com gráficos; telas de Inventário e Movimentações.
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Cena3DSegura, useMovimentoReduzido, type MotivoFallback } from '@anim3d/kit';
import { buscar, gerarAlmoxarifado, indicadores, LETRAS, ROTULO_STATUS, statusDe, GEO, type Posicao, type Status } from './dados';
import { SETORES, Simulacao, type Amostra, type IdSetor } from './simulacao';
import { BarrasH, Empilhada, Linhas, Medidor } from './Graficos';
import { Planta } from './Planta';
import type { PropsAlmoxarifado } from './AlmoxarifadoCena';
import './almoxarifado.css';

const carregar = () => import('./AlmoxarifadoCena');
const COR_STATUS: Record<Status, string> = { ok: '#c9a46c', baixo: '#f59e0b', critico: '#ef4444', vazio: '#475569' };
type Tela = 'mapa' | 'inventario' | 'movimentacoes';

const deltas = (h: Amostra[], campo: keyof Omit<Amostra, 'hora'>) => h.slice(1).map((a, i) => a[campo] - h[i][campo]);

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ICONES = {
  geral: 'M3 12l9-8 9 8M5 10v10h14V10',
  inventario: 'M4 6h16M4 12h16M4 18h10',
  movs: 'M4 17l5-5 4 4 7-8M15 8h5v5',
  galeria: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
};

// A cena só re-renderiza quando as props dela mudam (o painel atualiza 4×/s).
const Mapa3D = memo(function Mapa3D(props: PropsAlmoxarifado) {
  return (
    <Cena3DSegura
      carregar={carregar}
      props={props}
      aspecto="auto"
      // o mapa é a ferramenta, não enfeite: carrega mesmo com "reduzir movimento" (a simulação começa pausada)
      cenaComMovimentoReduzido
      style={{ position: 'absolute', inset: 0 }}
      rotulo="Almoxarifado em 3D: arraste para girar, botão direito para mover, rolagem para aproximar. Clique num palete para detalhes."
      fallback={(motivo) => <AvisoSem3D motivo={motivo} />}
    />
  );
});

function AvisoSem3D({ motivo }: { motivo: MotivoFallback }) {
  if (motivo === 'aguardando')
    return (
      <div className="sem-3d">
        <span className="girando" aria-hidden="true" />
        Carregando mapa 3D…
      </div>
    );
  if (motivo === 'erro')
    return (
      <div className="sem-3d">
        <div>
          <b>O mapa 3D parou (erro ou perda do contexto gráfico).</b>
          <p>Inventário e Movimentações continuam funcionando.</p>
          <button className="chip ativo" onClick={() => location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    );
  return (
    <div className="sem-3d">
      <div>
        <b>Este navegador não liberou WebGL para a página.</b>
        <p>
          Ative em <i>Configurações → Sistema → Usar aceleração gráfica quando disponível</i> e reinicie o navegador. Em
          acesso remoto/VM sem GPU, confira <code>chrome://gpu</code> (WebGL deve estar “Hardware accelerated” ou “Software only”).
        </p>
        <p>Enquanto isso, use Inventário e Movimentações.</p>
      </div>
    </div>
  );
}

export function AlmoxarifadoApp() {
  const almox = useMemo(() => gerarAlmoxarifado(7), []);
  const sim = useMemo(() => new Simulacao(almox), [almox]);
  useSyncExternalStore(sim.assinar, sim.lerVersao);

  const [tela, setTela] = useState<Tela>('mapa');
  const [setor, setSetorBruto] = useState<IdSetor | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Status | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [menu, setMenu] = useState(false);
  const [, forcar] = useState(0);
  const dica = useRef<HTMLDivElement>(null);
  const reduzido = useMovimentoReduzido();
  // "reduzir movimento": o mapa aparece parado; a operação só anda quando a pessoa pede (▶)
  useEffect(() => {
    if (reduzido) {
      sim.pausado = true;
      forcar((n) => n + 1);
    }
  }, [reduzido, sim]);

  const destaques = useMemo(() => buscar(almox, busca), [almox, busca]);
  const setSetor = useCallback((s: IdSetor | null) => {
    setSetorBruto(s);
    setSel(null);
    setTela('mapa');
    setMenu(false);
  }, []);
  const selecionar = useCallback((i: number | null) => {
    setSel(i);
    if (i !== null) setTela('mapa');
  }, []);

  const k = indicadores(almox);
  const c = sim.cont;
  const h = sim.historico;
  const rotulos = h.slice(1).map((a) => a.hora);
  const posSel = sel === null ? null : almox.posicoes[sel];
  const setorAtual = SETORES.find((s) => s.id === setor);
  const filas = sim.filas();

  const navSetor = (id: IdSetor | null, rotulo: string, cor: string | null, contagem?: number) => (
    <button key={id ?? 'geral'} className={`nav-item ${tela === 'mapa' && setor === id ? 'ativo' : ''}`} onClick={() => setSetor(id)} aria-current={tela === 'mapa' && setor === id ? 'page' : undefined}>
      {cor ? <i className="ponto" style={{ background: cor }} /> : <Icone d={ICONES.geral} />}
      <span>{rotulo}</span>
      {contagem !== undefined && contagem > 0 && <small className="contagem">{contagem}</small>}
    </button>
  );

  return (
    <div className="almox" data-menu={menu}>
      <aside className="lateral" aria-label="Navegação">
        <div className="marca">
          <span className="logo">▣</span>
          <div>
            <strong>Almoxarifado</strong>
            <small>Centro de distribuição</small>
          </div>
        </div>
        <nav>
          <p className="grupo">Operação</p>
          {navSetor(null, 'Visão geral', null)}
          {navSetor('recebimento', 'Recebimento', SETORES[0].cor, filas.recebimento)}
          {navSetor('conferencia', 'Conferência', SETORES[1].cor, filas.conferencia + filas.aguardandoArmazenagem)}
          {navSetor('armazenagem', 'Armazenagem', SETORES[2].cor, k.criticos)}
          {navSetor('separacao', 'Separação', SETORES[3].cor, filas.separacao)}
          {navSetor('embalagem', 'Embalagem', SETORES[4].cor, filas.esteira)}
          {navSetor('expedicao', 'Expedição', SETORES[5].cor, sim.exped.carga)}
          <p className="grupo">Gestão</p>
          <button className={`nav-item ${tela === 'inventario' ? 'ativo' : ''}`} onClick={() => { setTela('inventario'); setMenu(false); }}>
            <Icone d={ICONES.inventario} />
            <span>Inventário</span>
          </button>
          <button className={`nav-item ${tela === 'movimentacoes' ? 'ativo' : ''}`} onClick={() => { setTela('movimentacoes'); setMenu(false); }}>
            <Icone d={ICONES.movs} />
            <span>Movimentações</span>
          </button>
          <p className="grupo">Suíte anim3d</p>
          <a className="nav-item" href="./galeria.html">
            <Icone d={ICONES.galeria} />
            <span>Galeria de exemplos</span>
          </a>
        </nav>
        <div className="frota">
          <p className="grupo">Empilhadeiras</p>
          {sim.empilhadeiras.map((e) => (
            <div key={e.id} className="frota-item">
              <i className="ponto" style={{ background: e.papel === 'recebimento' ? '#38bdf8' : '#facc15' }} />
              <div>
                <b>{e.nome}</b>
                <small>{e.tarefa}</small>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <button className="veu" aria-label="Fechar menu" onClick={() => setMenu(false)} />

      <div className="principal">
        <header className="cabecalho">
          <button className="icone-btn so-mobile" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <Icone d={ICONES.menu} />
          </button>
          <div className="titulo">
            <small>Almoxarifado Central</small>
            <h1>{tela === 'inventario' ? 'Inventário' : tela === 'movimentacoes' ? 'Movimentações' : setorAtual ? setorAtual.nome : 'Visão geral'}</h1>
          </div>
          <label className="busca">
            <Icone d={ICONES.busca} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar SKU, item ou posição (ex.: C-D-05)" aria-label="Buscar" />
            {busca.length >= 2 && <small>{destaques.length}</small>}
          </label>
          <div className="relogio" aria-live="off">
            <b>{sim.relogio()}</b>
            <small>{sim.pausado ? 'pausado' : `${sim.velocidade}× tempo real`}</small>
          </div>
          <div className="controles" role="group" aria-label="Simulação">
            <button className="icone-btn" onClick={() => { sim.pausado = !sim.pausado; forcar((n) => n + 1); }} aria-label={sim.pausado ? 'Retomar' : 'Pausar'}>
              {sim.pausado ? '▶' : '❚❚'}
            </button>
            {[1, 2, 4].map((v) => (
              <button key={v} className={`chip ${sim.velocidade === v ? 'ativo' : ''}`} onClick={() => { sim.velocidade = v; forcar((n) => n + 1); }}>
                {v}×
              </button>
            ))}
          </div>
        </header>

        <section className="kpis" aria-label="Indicadores">
          <Kpi rotulo="Ocupação" valor={`${Math.round(k.ocupacao * 100)}%`} sub={`${k.ocupadas}/${k.total} posições`} />
          <Kpi rotulo="Itens críticos" valor={k.criticos} sub={`${k.baixos} abaixo do mínimo`} alerta={k.criticos > 0} />
          <Kpi rotulo="Paletes recebidos" valor={c.recebidos} sub={`${c.caminhoesEntrada} caminhões`} />
          <Kpi rotulo="Armazenados" valor={c.armazenados} sub={`${filas.aguardandoArmazenagem} aguardando`} />
          <Kpi rotulo="Caixas expedidas" valor={c.expedidas} sub={`${c.caminhoesSaida} caminhões saíram`} />
          <Kpi rotulo="Na esteira" valor={filas.esteira + filas.prontas} sub={`${filas.prontas} embaladas`} />
        </section>

        {tela === 'mapa' && (
          <div className="area-mapa">
            <section className="viewport">
              <Mapa3D sim={sim} setor={setor} selecionado={sel} filtro={filtro} destaques={destaques} aoSelecionar={selecionar} aoSetor={setSetor} dica={dica} />
              <div ref={dica} className="dica-3d" role="status" />
              <div className="sobre-vista topo-esq">
                {(['todos', 'ok', 'baixo', 'critico', 'vazio'] as const).map((f) => (
                  <button key={f} className={`chip ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
                    {f !== 'todos' && <i className="ponto" style={{ background: COR_STATUS[f] }} />}
                    {f === 'todos' ? 'Todos' : ROTULO_STATUS[f]}
                  </button>
                ))}
              </div>
              <div className="sobre-vista base-esq">
                <Planta sim={sim} setor={setor} aoSetor={setSetor} selecionado={posSel} />
              </div>
              <div className="sobre-vista base-dir dica-uso">Arraste: girar · Botão direito: mover · Rolagem: zoom · Clique: detalhes</div>
              {reduzido && sim.pausado && (
                <div className="sobre-vista aviso-movimento" role="status">
                  “Reduzir movimento” está ativo no sistema: a operação está pausada.
                  <button
                    className="chip ativo"
                    onClick={() => {
                      sim.pausado = false;
                      forcar((n) => n + 1);
                    }}
                  >
                    ▶ Iniciar simulação
                  </button>
                </div>
              )}
            </section>
            <aside className="painel" aria-label="Detalhes">
              {posSel && <DetalhePosicao p={posSel} aoFechar={() => setSel(null)} />}
              <PainelSetor id={setor} sim={sim} k={k} rotulos={rotulos} aoSelecionar={selecionar} almox={almox.posicoes} />
            </aside>
          </div>
        )}
        {tela === 'inventario' && <Inventario posicoes={almox.posicoes} busca={busca} aoAbrir={selecionar} />}
        {tela === 'movimentacoes' && (
          <div className="pagina">
            <Linhas
              titulo="Produtividade por 10 min"
              rotulos={rotulos}
              altura={160}
              series={[
                { nome: 'Recebidos', cor: '#38bdf8', valores: deltas(h, 'recebidos') },
                { nome: 'Armazenados', cor: '#818cf8', valores: deltas(h, 'armazenados') },
                { nome: 'Separados', cor: '#fbbf24', valores: deltas(h, 'separados') },
                { nome: 'Caixas expedidas', cor: '#4ade80', valores: deltas(h, 'expedidas') },
              ]}
            />
            <TabelaRegistros sim={sim} />
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ rotulo, valor, sub, alerta }: { rotulo: string; valor: ReactNode; sub: string; alerta?: boolean }) {
  return (
    <div className={`kpi ${alerta ? 'alerta' : ''}`}>
      <small>{rotulo}</small>
      <b>{valor}</b>
      <span>{sub}</span>
    </div>
  );
}

function DetalhePosicao({ p, aoFechar }: { p: Posicao; aoFechar: () => void }) {
  const s = statusDe(p);
  return (
    <section className="cartao detalhe">
      <header>
        <div>
          <small>Posição</small>
          <h2>{p.codigo}</h2>
        </div>
        <button className="icone-btn" onClick={aoFechar} aria-label="Fechar detalhe">
          ×
        </button>
      </header>
      <p className="status" style={{ color: COR_STATUS[s] }}>
        ● {ROTULO_STATUS[s]}
      </p>
      {p.sku ? (
        <>
          <h3>{p.sku.nome}</h3>
          <dl>
            <dt>SKU</dt>
            <dd>{p.sku.codigo}</dd>
            <dt>Categoria</dt>
            <dd>{p.sku.categoria}</dd>
            <dt>Validade</dt>
            <dd>{p.validade}</dd>
            <dt>Última mov.</dt>
            <dd>{p.ultimaMov}</dd>
            <dt>Endereço</dt>
            <dd>
              Corredor {LETRAS[p.corredor]}, lado {p.lado < 0 ? 'esquerdo' : 'direito'}, baia {p.baia + 1}, nível {p.nivel + 1}
            </dd>
          </dl>
          <Medidor rotulo={`Estoque (${p.sku.unidade}) · mínimo ${p.sku.minimo}`} valor={p.qtd} max={Math.max(p.qtd, p.sku.minimo * 2)} cor={COR_STATUS[s]} />
        </>
      ) : (
        <p className="vazio">Posição livre: a próxima armazenagem pode usá-la.</p>
      )}
    </section>
  );
}

function PainelSetor({ id, sim, k, rotulos, aoSelecionar, almox }: {
  id: IdSetor | null;
  sim: Simulacao;
  k: ReturnType<typeof indicadores>;
  rotulos: string[];
  aoSelecionar: (i: number) => void;
  almox: Posicao[];
}) {
  const h = sim.historico;
  const c = sim.cont;
  const registros = sim.registros.filter((r) => !id || r.setor === id).slice(0, 6);
  const setor = SETORES.find((s) => s.id === id);
  const ocupacaoCorredor = Array.from({ length: GEO.corredores }, (_, i) => {
    const doCorredor = almox.filter((p) => p.corredor === i);
    return { rotulo: `Corredor ${LETRAS[i]}`, valor: Math.round((doCorredor.filter((p) => statusDe(p) !== 'vazio').length / doCorredor.length) * 100) };
  });
  const criticos = almox.filter((p) => statusDe(p) === 'critico').slice(0, 6);

  let conteudo: ReactNode;
  switch (id) {
    case null:
      conteudo = (
        <>
          <div className="fluxo" aria-label="Fluxo de ponta a ponta">
            {[
              ['Recebidos', c.recebidos, SETORES[0].cor],
              ['Conferidos', c.conferidos, SETORES[1].cor],
              ['Armazenados', c.armazenados, SETORES[2].cor],
              ['Separados', c.separados, SETORES[3].cor],
              ['Embaladas', c.embaladas, SETORES[4].cor],
              ['Expedidas', c.expedidas, SETORES[5].cor],
            ].map(([r, v, cor]) => (
              <div key={r as string} className="etapa" style={{ borderColor: cor as string }}>
                <b>{v}</b>
                <small>{r}</small>
              </div>
            ))}
          </div>
          <Linhas
            titulo="Fluxo por 10 min de operação"
            rotulos={rotulos}
            series={[
              { nome: 'Recebidos', cor: '#38bdf8', valores: deltas(h, 'recebidos') },
              { nome: 'Separados', cor: '#fbbf24', valores: deltas(h, 'separados') },
              { nome: 'Expedidas', cor: '#4ade80', valores: deltas(h, 'expedidas') },
            ]}
          />
          <Empilhada
            titulo="Situação do estoque (posições)"
            partes={[
              { rotulo: 'Normal', valor: k.ocupadas - k.criticos - k.baixos, cor: COR_STATUS.ok },
              { rotulo: 'Baixo', valor: k.baixos, cor: COR_STATUS.baixo },
              { rotulo: 'Crítico', valor: k.criticos, cor: COR_STATUS.critico },
              { rotulo: 'Vazio', valor: k.vazios, cor: COR_STATUS.vazio },
            ]}
          />
          <BarrasH titulo="Ocupação por corredor" itens={ocupacaoCorredor} formato={(v) => `${v}%`} max={100} />
        </>
      );
      break;
    case 'recebimento':
      conteudo = (
        <>
          <Estado rotulo="Caminhão na doca" valor={rotuloCaminhao(sim.receb.estado)} />
          <Medidor rotulo="Paletes a descarregar" valor={sim.receb.estado === 'docado' ? sim.receb.carga : 0} max={sim.receb.capacidade} cor={setor!.cor} />
          <Linhas titulo="Paletes recebidos por 10 min" rotulos={rotulos} series={[{ nome: 'Recebidos', cor: setor!.cor, valores: deltas(h, 'recebidos') }]} />
        </>
      );
      break;
    case 'conferencia':
      conteudo = (
        <>
          <BarrasH
            titulo="Baias de conferência"
            max={4}
            itens={sim.slots.map((s, i) => ({
              rotulo: `Baia ${i + 1} · ${!s.carga ? 'livre' : s.conferido ? 'liberado' : 'conferindo'}`,
              valor: !s.carga ? 0 : s.conferido ? 4 : Math.min(4, s.timer),
              cor: s.conferido ? '#4ade80' : setor!.cor,
            }))}
            formato={(v) => `${Math.round((v / 4) * 100)}%`}
          />
          <Linhas titulo="Conferidos por 10 min" rotulos={rotulos} series={[{ nome: 'Conferidos', cor: setor!.cor, valores: deltas(h, 'conferidos') }]} />
        </>
      );
      break;
    case 'armazenagem':
      conteudo = (
        <>
          <BarrasH titulo="Ocupação por corredor" itens={ocupacaoCorredor} formato={(v) => `${v}%`} max={100} />
          <BarrasH
            titulo="Itens críticos (clique para localizar)"
            itens={criticos.map((p) => ({ rotulo: `${p.codigo} · ${p.sku?.nome}`, valor: p.qtd, cor: COR_STATUS.critico, aoClicar: () => aoSelecionar(p.indice) }))}
            formato={(v) => `${v}`}
          />
          <Linhas
            titulo="Entradas e saídas por 10 min"
            rotulos={rotulos}
            series={[
              { nome: 'Armazenados', cor: setor!.cor, valores: deltas(h, 'armazenados') },
              { nome: 'Retirados', cor: '#fbbf24', valores: deltas(h, 'separados') },
            ]}
          />
        </>
      );
      break;
    case 'separacao':
      conteudo = (
        <>
          <BarrasH
            titulo="Estações de separação"
            max={3}
            itens={sim.estacoes.map((e, i) => ({ rotulo: `Estação ${i + 1} · ${e.carga ? 'separando' : 'livre'}`, valor: e.carga ? e.geradas : 0, cor: setor!.cor }))}
            formato={(v) => `${v}/3 caixas`}
          />
          <Linhas titulo="Paletes separados por 10 min" rotulos={rotulos} series={[{ nome: 'Separados', cor: setor!.cor, valores: deltas(h, 'separados') }]} />
        </>
      );
      break;
    case 'embalagem':
      conteudo = (
        <>
          <Estado rotulo="Caixas aguardando embalagem" valor={String(sim.filas().esteira)} />
          <Estado rotulo="Embaladas aguardando caminhão" valor={String(sim.filas().prontas)} />
          <Linhas titulo="Caixas embaladas por 10 min" rotulos={rotulos} series={[{ nome: 'Embaladas', cor: setor!.cor, valores: deltas(h, 'embaladas') }]} />
        </>
      );
      break;
    case 'expedicao':
      conteudo = (
        <>
          <Estado rotulo="Caminhão na doca" valor={rotuloCaminhao(sim.exped.estado)} />
          <Medidor rotulo="Carregamento" valor={sim.exped.carga} max={sim.exped.capacidade} cor={setor!.cor} />
          <Linhas titulo="Caixas expedidas por 10 min" rotulos={rotulos} series={[{ nome: 'Expedidas', cor: setor!.cor, valores: deltas(h, 'expedidas') }]} />
        </>
      );
      break;
  }

  return (
    <>
      <section className="cartao">
        <header>
          <div>
            <small>{setor ? 'Setor' : 'Operação'}</small>
            <h2>
              {setor && <i className="ponto" style={{ background: setor.cor }} />}
              {setor ? setor.nome : 'Ponta a ponta'}
            </h2>
          </div>
        </header>
        {setor && <p className="descricao">{setor.descricao}</p>}
        {conteudo}
      </section>
      <section className="cartao">
        <header>
          <h2>Últimos eventos</h2>
        </header>
        <ul className="eventos">
          {registros.map((r) => (
            <li key={r.id}>
              <time>{r.hora}</time>
              <i className="ponto" style={{ background: SETORES.find((s) => s.id === r.setor)?.cor }} />
              <span>{r.texto}</span>
            </li>
          ))}
          {!registros.length && <li className="vazio">Aguardando atividade…</li>}
        </ul>
      </section>
    </>
  );
}

const rotuloCaminhao = (e: string) => ({ chegando: 'Chegando', docado: 'Encostado', saindo: 'Saindo', fora: 'Sem caminhão' })[e] ?? e;

function Estado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="estado">
      <span>{rotulo}</span>
      <b>{valor}</b>
    </div>
  );
}

function Inventario({ posicoes, busca, aoAbrir }: { posicoes: Posicao[]; busca: string; aoAbrir: (i: number) => void }) {
  const [filtro, setFiltro] = useState<Status | 'todos'>('todos');
  const t = busca.trim().toLowerCase();
  const linhas = posicoes.filter(
    (p) =>
      (filtro === 'todos' || statusDe(p) === filtro) &&
      (!t || p.codigo.toLowerCase().includes(t) || p.sku?.nome.toLowerCase().includes(t) || p.sku?.codigo.toLowerCase().includes(t)),
  );
  return (
    <div className="pagina">
      <div className="filtros">
        {(['todos', 'ok', 'baixo', 'critico', 'vazio'] as const).map((f) => (
          <button key={f} className={`chip ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todos' ? 'Todos' : ROTULO_STATUS[f]}
          </button>
        ))}
        <small>{linhas.length} posições</small>
      </div>
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Posição</th>
              <th>SKU</th>
              <th>Item</th>
              <th>Categoria</th>
              <th className="num">Qtd</th>
              <th className="num">Mínimo</th>
              <th>Status</th>
              <th>Última mov.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhas.slice(0, 250).map((p) => {
              const s = statusDe(p);
              return (
                <tr key={p.indice}>
                  <td className="mono">{p.codigo}</td>
                  <td className="mono">{p.sku?.codigo ?? '—'}</td>
                  <td>{p.sku?.nome ?? '—'}</td>
                  <td>{p.sku?.categoria ?? '—'}</td>
                  <td className="num">{p.qtd}</td>
                  <td className="num">{p.sku?.minimo ?? '—'}</td>
                  <td>
                    <span className="selo" style={{ color: COR_STATUS[s], borderColor: COR_STATUS[s] }}>
                      {ROTULO_STATUS[s]}
                    </span>
                  </td>
                  <td>{p.ultimaMov}</td>
                  <td>
                    <button className="link" onClick={() => aoAbrir(p.indice)}>
                      Ver no mapa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabelaRegistros({ sim }: { sim: Simulacao }) {
  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Setor</th>
            <th>Evento</th>
          </tr>
        </thead>
        <tbody>
          {sim.registros.map((r) => {
            const s = SETORES.find((x) => x.id === r.setor)!;
            return (
              <tr key={r.id}>
                <td className="mono">{r.hora}</td>
                <td>
                  <i className="ponto" style={{ background: s.cor }} /> {s.nome}
                </td>
                <td>{r.texto}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
