// Exemplo anim3d-topologia · Editor e simulador de topologia de rede em 3D (com vista 2D) estilo Packet Tracer,
// ambientado em Piso Elevado de Datacenter (Sala Cofre / NOC) e conectado à telemetria ao vivo (`telemetria.ts` + `fontesDados.ts`).
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as PtrEvent } from 'react';
import { Cena3DSegura } from '@anim3d/kit';
import { fontePolling, fonteSimulada, fonteSSE, fonteWebSocket, urlSegura, type EstadoFonte } from './fontesDados';
import {
  aplicar,
  aplicarNaTopologia,
  corUtilizacao,
  maisCarregados,
  telemetriaVazia,
  utilizacao,
  validarMensagem,
  type Telemetria,
} from './telemetria';
import type { Props3D } from './Topologia3DCena';
import {
  EH_HOST,
  ligar,
  novoId,
  PROTOCOLOS,
  remover,
  ROTULO_PROTOCOLO,
  ROTULO_TIPO,
  topologiaExemplo,
  tracar,
  validar,
  type Disp,
  type Protocolo,
  type Resultado,
  type TipoDisp,
  type Topologia as Topo,
} from './topologiaSim';
import './topologia.css';

const carregar3d = () => import('./Topologia3DCena'); // three só carrega quando a vista 3D é usada
const LARGURA = 760;
const ALTURA = 480;
const TIPOS: TipoDisp[] = ['roteador', 'switch', 'firewall', 'servidor', 'pc', 'nuvem'];
const COR_PROTOCOLO: Record<Protocolo, string> = { icmp: '#22d3ee', http: '#3ddc97', ssh: '#ffd23f', dns: '#c4b5fd' };
const COR_TIPO: Record<TipoDisp, string> = {
  roteador: '#06b6d4',
  switch: '#10b981',
  firewall: '#f97316',
  servidor: '#8b5cf6',
  pc: '#3b82f6',
  nuvem: '#0ea5e9',
};

function SparkMini({ valores, cor = '#4f46e5' }: { valores: number[]; cor?: string }) {
  const lista = valores.length >= 2 ? valores.slice(-20) : [12, 18, 15, 24, 20, 28];
  const max = Math.max(...lista, 1);
  const min = Math.min(...lista, 0);
  const faixa = Math.max(1, max - min);
  const w = 76;
  const h = 22;
  const pts = lista.map((v, i) => `${((i / (lista.length - 1)) * w).toFixed(1)},${(h - ((v - min) / faixa) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg className="tp-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={cor} fillOpacity="0.14" />
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icone({ tipo }: { tipo: TipoDisp }) {
  switch (tipo) {
    case 'roteador':
      return (
        <g>
          <circle r="19" />
          <path d="M-12 0H12M0 -12V12M-12 0l4 -3M-12 0l4 3M12 0l-4 -3M12 0l-4 3M0 -12l-3 4M0 -12l3 4M0 12l-3 -4M0 12l3 -4" />
        </g>
      );
    case 'switch':
      return (
        <g>
          <rect x="-24" y="-11" width="48" height="22" rx="3" />
          <path d="M-15 4h4M-7 4h4M1 4h4M9 4h4M-15 -4h30" />
        </g>
      );
    case 'firewall':
      return (
        <g>
          <rect x="-22" y="-16" width="44" height="32" rx="2" />
          <path d="M-22 -5.3H22M-22 5.3H22M-8 -16V-5.3M8 -5.3V5.3M-8 5.3V16" />
        </g>
      );
    case 'servidor':
      return (
        <g>
          <rect x="-16" y="-19" width="32" height="11" rx="2" />
          <rect x="-16" y="-5" width="32" height="11" rx="2" />
          <rect x="-16" y="9" width="32" height="11" rx="2" />
          <path d="M-10 -13.5h4M-10 0.5h4M-10 14.5h4" />
        </g>
      );
    case 'pc':
      return (
        <g>
          <rect x="-19" y="-18" width="38" height="25" rx="2" />
          <path d="M-8 18H8M0 7V18" />
        </g>
      );
    case 'nuvem':
      return (
        <g>
          <circle r="19" />
          <ellipse rx="9" ry="19" />
          <path d="M-19 0H19M-16 -9H16M-16 9H16" />
        </g>
      );
  }
}

interface Anim {
  /** índice do passo mostrado */
  passo: number;
  tocando: boolean;
}

export function Topologia({
  inicial,
  rotulo = 'Editor de topologia de rede com simulação de pacotes',
  vistaInicial = '3d',
}: {
  inicial?: Topo;
  rotulo?: string;
  vistaInicial?: '2d' | '3d';
}) {
  const [topo, setTopo] = useState<Topo>(() => inicial ?? topologiaExemplo());
  const [sel, setSel] = useState<{ tipo: 'd' | 'e'; id: string } | null>(null);
  const [modo, setModo] = useState<'mover' | 'ligar'>('mover');
  const [pendente, setPendente] = useState<string | null>(null);
  const [origem, setOrigem] = useState('pc1');
  const [destino, setDestino] = useState('srv1');
  const [protocolo, setProtocolo] = useState<Protocolo>('icmp');
  const [depurar, setDepurar] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [anim, setAnim] = useState<Anim>({ passo: -1, tocando: false });
  const [copiado, setCopiado] = useState(false);
  const [vista, setVista] = useState<'2d' | '3d'>(vistaInicial);
  const [noite, setNoite] = useState(false);
  const [resumoAberto, setResumoAberto] = useState(false);

  // ---- Telemetria ao vivo (`telemetria.ts` + `fontesDados.ts`) ----
  const [aoVivo, setAoVivo] = useState(true);
  const [tipoFonte, setTipoFonte] = useState<'simulada' | 'sse' | 'ws' | 'polling'>('simulada');
  const [urlFonte, setUrlFonte] = useState('http://127.0.0.1:5181/eventos');
  const [tel, setTel] = useState<Telemetria>(() => telemetriaVazia());
  const [estadoFonte, setEstadoFonte] = useState<EstadoFonte>({ fase: 'parado' });
  const [histTotalMbps, setHistTotalMbps] = useState<number[]>([]);

  const svg = useRef<SVGSVGElement>(null);
  const pacote = useRef<SVGGElement>(null);
  const topoRef = useRef(topo);
  topoRef.current = topo;
  const arrasto = useRef<{ id: string; dx: number; dy: number; x0: number; y0: number; moveu: boolean } | null>(null);

  useEffect(() => {
    if (!aoVivo) {
      setEstadoFonte({ fase: 'parado' });
      return;
    }
    let fonte = fonteSimulada(() => topoRef.current);
    if (tipoFonte === 'sse') {
      const u = urlSegura(urlFonte, ['http:', 'https:']);
      if (!u) {
        setEstadoFonte({ fase: 'erro', detalhe: 'URL HTTP/HTTPS inválida' });
        return;
      }
      fonte = fonteSSE(u);
    } else if (tipoFonte === 'ws') {
      const u = urlSegura(urlFonte, ['ws:', 'wss:']);
      if (!u) {
        setEstadoFonte({ fase: 'erro', detalhe: 'URL WS/WSS inválida' });
        return;
      }
      fonte = fonteWebSocket(u);
    } else if (tipoFonte === 'polling') {
      const u = urlSegura(urlFonte, ['http:', 'https:']);
      if (!u) {
        setEstadoFonte({ fase: 'erro', detalhe: 'URL HTTP/HTTPS inválida' });
        return;
      }
      fonte = fontePolling(u);
    }
    const parar = fonte.iniciar(
      (bruto) => {
        const msgs = validarMensagem(bruto);
        if (msgs.length === 0) return;
        const agora = Date.now();
        setTel((ant) => {
          const novo = aplicar(ant, msgs, agora);
          const soma = Object.values(novo.enlaces).reduce((s, m) => s + (m.mbps ?? 0), 0);
          setHistTotalMbps((h) => [...h.slice(-29), Math.round(soma)]);
          return novo;
        });
      },
      (est) => setEstadoFonte(est),
    );
    return () => parar();
  }, [aoVivo, tipoFonte, urlFonte]);

  const topoEfetiva = useMemo(
    () => (aoVivo && tipoFonte !== 'simulada' ? aplicarNaTopologia(topo, tel, Date.now()) : topo),
    [aoVivo, tipoFonte, topo, tel],
  );

  const hosts = topo.disps.filter((d) => EH_HOST[d.tipo]);
  const avisos = useMemo(() => validar(topo), [topo]);
  const disp = (id: string) => topoEfetiva.disps.find((d) => d.id === id);
  const dSel = sel?.tipo === 'd' ? topo.disps.find((d) => d.id === sel.id) : undefined;
  const eSel = sel?.tipo === 'e' ? topo.enlaces.find((e) => e.id === sel.id) : undefined;

  const topCarregados = useMemo(() => (aoVivo ? maisCarregados(topoEfetiva, tel, 3) : []), [aoVivo, topoEfetiva, tel]);
  const totalMbps = useMemo(
    () => Math.round(topoEfetiva.enlaces.reduce((s, e) => s + (e.ativo ? (tel.enlaces[e.id]?.mbps ?? 0) : 0), 0)),
    [topoEfetiva, tel],
  );
  const maxUtilPct = useMemo(() => Math.round((topCarregados[0]?.util ?? 0) * 100), [topCarregados]);

  /** Qualquer edição que muda a rede invalida o resultado anterior (mover dispositivo não). */
  const editar = useCallback((f: (t: Topo) => Topo) => {
    setTopo(f);
    setResultado(null);
    setAnim({ passo: -1, tocando: false });
  }, []);

  // ---- animação do pacote (2D): um salto por vez; a posição vai por ref ----
  useEffect(() => {
    const g = pacote.current;
    if (!g) return;
    if (!resultado || anim.passo < 0 || anim.passo >= resultado.passos.length) {
      g.style.opacity = '0';
      return;
    }
    const p = resultado.passos[anim.passo];
    const t = topoRef.current;
    const a = t.disps.find((d) => d.id === p.de);
    const b = t.disps.find((d) => d.id === p.para);
    if (!a || !b) return;
    const dur = p.acao === 'descartou' ? 700 : Math.min(950, Math.max(380, 280 + p.ms * 22));
    const inicio = performance.now();
    let raf = 0;
    g.style.opacity = '1';
    const quadro = (agora: number) => {
      const k = Math.min(1, (agora - inicio) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      g.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e} ${a.y + (b.y - a.y) * e})`);
      if (k < 1) raf = requestAnimationFrame(quadro);
      else if (anim.tocando && anim.passo + 1 < resultado.passos.length) setAnim({ passo: anim.passo + 1, tocando: true });
      else if (anim.tocando) setAnim({ passo: anim.passo, tocando: false });
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [anim, resultado]);

  const enviar = () => {
    const r = tracar(topoEfetiva, origem, destino, protocolo);
    setResultado(r);
    setAnim({ passo: r.passos.length ? 0 : -1, tocando: !depurar });
  };
  const limparSim = () => {
    setResultado(null);
    setAnim({ passo: -1, tocando: false });
  };
  const irPasso = (n: number) => resultado && setAnim({ passo: Math.max(0, Math.min(resultado.passos.length - 1, n)), tocando: false });

  // ---- arrastar dispositivos (2D) ----
  const pontoSvg = (e: { clientX: number; clientY: number }) => {
    const s = svg.current!;
    const pt = s.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(s.getScreenCTM()!.inverse());
  };
  const aoCliqueDisp = (d: Disp) => {
    if (modo === 'ligar') {
      if (!pendente) setPendente(d.id);
      else {
        editar((t) => ligar(t, pendente, d.id));
        setPendente(null);
      }
      return;
    }
    setSel({ tipo: 'd', id: d.id });
  };
  const baixo = (e: PtrEvent<SVGGElement>, d: Disp) => {
    if (e.button !== 0) return;
    const p = pontoSvg(e);
    arrasto.current = { id: d.id, dx: d.x - p.x, dy: d.y - p.y, x0: p.x, y0: p.y, moveu: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const mover = (e: PtrEvent<SVGGElement>) => {
    const a = arrasto.current;
    if (!a || modo === 'ligar') return;
    const p = pontoSvg(e);
    if (!a.moveu && Math.hypot(p.x - a.x0, p.y - a.y0) < 4) return;
    a.moveu = true;
    const x = Math.max(34, Math.min(LARGURA - 34, p.x + a.dx));
    const y = Math.max(34, Math.min(ALTURA - 40, p.y + a.dy));
    setTopo((t) => ({ ...t, disps: t.disps.map((d) => (d.id === a.id ? { ...d, x, y } : d)) }));
  };
  const cima = (d: Disp) => {
    const a = arrasto.current;
    arrasto.current = null;
    if (a && !a.moveu) aoCliqueDisp(d);
  };
  const teclado = (e: KeyboardEvent<SVGGElement>, d: Disp) => {
    const passo = e.shiftKey ? 30 : 10;
    const mapa: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      aoCliqueDisp(d);
    } else if (mapa[e.key]) {
      e.preventDefault();
      const [dx, dy] = mapa[e.key];
      setTopo((t) => ({ ...t, disps: t.disps.map((x) => (x.id === d.id ? { ...x, x: Math.max(34, Math.min(LARGURA - 34, x.x + dx)), y: Math.max(34, Math.min(ALTURA - 40, x.y + dy)) } : x)) }));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      editar((t) => remover(t, d.id));
      setSel(null);
    }
  };

  const adicionar = (tipo: TipoDisp) => {
    const n = topo.disps.filter((d) => d.tipo === tipo).length + 1;
    const id = novoId(tipo.slice(0, 2));
    const d: Disp = {
      id,
      tipo,
      nome: `${ROTULO_TIPO[tipo].split(' ')[0]}-${n}`,
      x: 90 + ((topo.disps.length * 71) % 580),
      y: 60 + ((topo.disps.length * 53) % 330),
      ligado: true,
      ip: EH_HOST[tipo] && tipo !== 'nuvem' ? `192.168.9.${10 + topo.disps.length}` : undefined,
      bloqueia: tipo === 'firewall' ? [] : undefined,
    };
    editar((t) => ({ ...t, disps: [...t.disps, d] }));
    setSel({ tipo: 'd', id });
  };
  const atualizarDisp = (id: string, p: Partial<Disp>) => editar((t) => ({ ...t, disps: t.disps.map((d) => (d.id === id ? { ...d, ...p } : d)) }));
  const copiarJson = () => {
    void navigator.clipboard?.writeText(JSON.stringify(topo, null, 2)).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  };
  const carregarJson = () => {
    const texto = window.prompt('Cole o JSON da topologia:');
    if (!texto) return;
    try {
      const t = JSON.parse(texto) as Topo;
      if (!Array.isArray(t.disps) || !Array.isArray(t.enlaces)) throw new Error('formato');
      editar(() => t);
      setSel(null);
    } catch {
      window.alert('JSON inválido: esperado { "disps": [...], "enlaces": [...] }');
    }
  };

  const percorridos = new Set(resultado && anim.passo >= 0 ? resultado.passos.slice(0, anim.passo + 1).map((p) => p.enlace).filter(Boolean) : []);
  const caiu = resultado && resultado.status === 'descartado' && anim.passo >= resultado.passos.length - 1 && !anim.tocando;
  const ultimo = resultado?.passos[resultado.passos.length - 1];
  const passoAtual = resultado && anim.passo >= 0 ? resultado.passos[anim.passo] : undefined;
  const corPacote = COR_PROTOCOLO[protocolo];

  const fimDoSalto = useCallback(
    (passo: number) => setAnim((a) => (a.passo !== passo || !a.tocando ? a : resultado && passo + 1 < resultado.passos.length ? { passo: passo + 1, tocando: true } : { passo, tocando: false })),
    [resultado],
  );
  const mudarSelecao = (id: string, tipo: 'd' | 'e') => setSel({ tipo, id });
  const props3d: Omit<Props3D, 'aoFalhar'> = {
    topo: topoEfetiva,
    selecionado: sel,
    modo,
    pendente,
    resultado,
    anim,
    corPacote: COR_PROTOCOLO[protocolo],
    destino,
    noite,
    telemetria: tel,
    aoVivo,
    aoCliqueDisp: (id: string) => {
      const d = topo.disps.find((x) => x.id === id);
      if (d) aoCliqueDisp(d);
    },
    aoCliqueEnlace: (id: string) => mudarSelecao(id, 'e'),
    aoMoverDisp: (id: string, x: number, y: number) => setTopo((t) => ({ ...t, disps: t.disps.map((d) => (d.id === id ? { ...d, x, y } : d)) })),
    aoFimSalto: fimDoSalto,
    aoFundo: () => (setSel(null), setPendente(null)),
  };

  const svgPlano = (
    <svg ref={svg} className="tp-svg" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={`${rotulo}: ${topo.disps.length} dispositivos e ${topo.enlaces.length} enlaces`} onPointerDown={(e) => e.target === e.currentTarget && (setSel(null), setPendente(null))}>
      <defs>
        <pattern id="tp-grade" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(34,211,238,.07)" />
        </pattern>
      </defs>
      <rect width={LARGURA} height={ALTURA} fill="url(#tp-grade)" onPointerDown={() => (setSel(null), setPendente(null))} />

      {topoEfetiva.enlaces.map((e) => {
        const a = disp(e.a);
        const b = disp(e.b);
        if (!a || !b) return null;
        const cls = ['tp-enlace', !e.ativo && 'caido', percorridos.has(e.id) && 'rota', sel?.id === e.id && 'sel'].filter(Boolean).join(' ');
        return (
          <g key={e.id}>
            <line className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={percorridos.has(e.id) ? { stroke: corPacote } : undefined} />
            <line className="tp-enlace-alvo" x1={a.x} y1={a.y} x2={b.x} y2={b.y} onClick={() => setSel({ tipo: 'e', id: e.id })} />
            <text className="tp-ms" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}>
              {e.ativo ? `${e.ms} ms` : '✕ caído'}
            </text>
          </g>
        );
      })}

      {topoEfetiva.disps.map((d) => (
        <g
          key={d.id}
          className={['tp-disp', `tp-d-${d.tipo}`, !d.ligado && 'off', sel?.id === d.id && 'sel', pendente === d.id && 'pendente'].filter(Boolean).join(' ')}
          transform={`translate(${d.x} ${d.y})`}
          tabIndex={0}
          role="button"
          aria-label={`${ROTULO_TIPO[d.tipo]} ${d.nome}${d.ip ? `, IP ${d.ip}` : ''}${d.ligado ? '' : ', desligado'}`}
          aria-pressed={sel?.id === d.id}
          onPointerDown={(e) => baixo(e, d)}
          onPointerMove={mover}
          onPointerUp={() => cima(d)}
          onKeyDown={(e) => teclado(e, d)}
        >
          <circle className="tp-halo" r="34" />
          <Icone tipo={d.tipo} />
          <text className="tp-nome" y="40">{d.nome}</text>
          {d.ip && <text className="tp-ip" y="52">{d.ip}</text>}
          {d.tipo === 'firewall' && (d.bloqueia?.length ?? 0) > 0 && <text className="tp-regra" y="-24">bloqueia {d.bloqueia!.join(', ')}</text>}
        </g>
      ))}

      {caiu && ultimo && disp(ultimo.de) && (
        <g className="tp-x" transform={`translate(${disp(ultimo.de)!.x} ${disp(ultimo.de)!.y})`} aria-hidden="true">
          <circle r="30" />
          <path d="M-11 -11L11 11M11 -11L-11 11" />
        </g>
      )}
      {resultado?.status === 'entregue' && anim.passo === resultado.passos.length - 1 && !anim.tocando && disp(destino) && (
        <g className="tp-ok" transform={`translate(${disp(destino)!.x} ${disp(destino)!.y})`} aria-hidden="true">
          <circle r="30" />
        </g>
      )}
      <g ref={pacote} className="tp-pacote" style={{ opacity: 0, color: passoAtual?.acao === 'descartou' ? '#ff3b5c' : corPacote }} aria-hidden="true">
        <circle r="13" className="brilho" />
        <circle r="6" />
      </g>
    </svg>
  );

  const composicao = useMemo(
    () =>
      TIPOS.map((t) => ({
        tipo: t,
        rotulo: ROTULO_TIPO[t],
        cor: COR_TIPO[t],
        qtd: topo.disps.filter((d) => d.tipo === t).length,
      })).filter((x) => x.qtd > 0),
    [topo.disps],
  );
  const dispLigados = topoEfetiva.disps.filter((d) => d.ligado).length;

  return (
    <div className="tp-raiz" role="group" aria-label={rotulo}>
      <div className="tp-barra">
        <div className="tp-grupo" role="group" aria-label="Adicionar dispositivo">
          {TIPOS.map((t) => (
            <button key={t} onClick={() => adicionar(t)} title={`Adicionar ${ROTULO_TIPO[t]}`}>
              + {ROTULO_TIPO[t]}
            </button>
          ))}
        </div>
        <div className="tp-grupo" role="group" aria-label="Modo de edição">
          <button className={modo === 'mover' ? 'ativo' : ''} aria-pressed={modo === 'mover'} onClick={() => ((setModo('mover'), setPendente(null)))}>
            Mover
          </button>
          <button className={modo === 'ligar' ? 'ativo' : ''} aria-pressed={modo === 'ligar'} onClick={() => setModo('ligar')} title="Clique em dois dispositivos para ligar um cabo">
            Ligar cabos
          </button>
        </div>
        <div className="tp-grupo" role="group" aria-label="Vista">
          <button className={vista === '3d' ? 'ativo' : ''} aria-pressed={vista === '3d'} onClick={() => setVista('3d')}>
            3D
          </button>
          <button className={vista === '2d' ? 'ativo' : ''} aria-pressed={vista === '2d'} onClick={() => setVista('2d')}>
            2D
          </button>
          {vista === '3d' && (
            <button onClick={() => setNoite((v) => !v)} aria-pressed={noite} title="Alternar iluminação clara e escura na cena 3D">
              {noite ? '☀ Claro' : '☾ Escuro'}
            </button>
          )}
        </div>
        <div className="tp-grupo" role="group" aria-label="Telemetria">
          <button
            className={`tp-pill-vivo ${aoVivo ? 'on' : ''}`}
            aria-pressed={aoVivo}
            onClick={() => setAoVivo((v) => !v)}
            title="Ativar/pausar telemetria de vazão (Mbps), latência e CPU"
          >
            ● Dados ao vivo
          </button>
        </div>
        <div className="tp-grupo">
          <button onClick={() => (editar(() => topologiaExemplo()), setSel(null))}>Exemplo</button>
          <button onClick={copiarJson}>{copiado ? 'Copiado' : 'Copiar JSON'}</button>
          <button onClick={carregarJson}>Carregar JSON</button>
        </div>
      </div>

      <div className="tp-corpo">
        <div className="tp-palco-wrap">
          {vista === '3d' ? (
            <Cena3DSegura<Omit<Props3D, 'aoFalhar'>>
              className="tp-vista3d"
              carregar={carregar3d}
              props={props3d}
              fallback={svgPlano}
              cenaComMovimentoReduzido
              rotulo={`${rotulo} (vista 3D)`}
              aspecto="760 / 480"
              margem="0px"
            />
          ) : (
            svgPlano
          )}

          {/* Painel HUD executivo de telemetria NOC (compacto por padrão para não cobrir os equipamentos 3D) */}
          {vista === '3d' && (
            <aside className={`tp-card-rede ${resumoAberto ? '' : 'fechado'}`} aria-label="Resumo da topologia de rede">
              <div className="tp-cr-topo">
                <span className="tp-cr-logo" aria-hidden="true">⌬</span>
                <div>
                  <strong>NOC · Sala Cofre</strong>
                  <small>
                    {aoVivo
                      ? `● ${dispLigados}/${topo.disps.length} ativos · ${totalMbps} Mbps · Pico ${maxUtilPct}%`
                      : `${dispLigados}/${topo.disps.length} ativos · Modo estático`}
                  </small>
                </div>
                <button
                  className="tp-cr-min"
                  onClick={() => setResumoAberto((v) => !v)}
                  aria-label={resumoAberto ? 'Recolher resumo' : 'Expandir resumo'}
                  title={resumoAberto ? 'Recolher detalhes' : 'Expandir gráficos de telemetria'}
                >
                  {resumoAberto ? '−' : '+'}
                </button>
              </div>
              {resumoAberto && (
                <>
                  <div className="tp-cr-kpis">
                    <div>
                      <small>Ativos</small>
                      <b>{dispLigados}/{topo.disps.length}</b>
                      <span>{topo.enlaces.length} cabos</span>
                    </div>
                    <div>
                      <small>Vazão</small>
                      <b>{aoVivo ? `${totalMbps}` : '—'}</b>
                      <SparkMini valores={histTotalMbps} cor="#4f46e5" />
                    </div>
                    <div>
                      <small>Uso máx.</small>
                      <b>{aoVivo ? `${maxUtilPct}%` : '—'}</b>
                      <SparkMini
                        valores={topCarregados[0] ? (tel.hist[topCarregados[0].id] ?? []) : []}
                        cor={maxUtilPct > 80 ? '#ef4444' : '#10b981'}
                      />
                    </div>
                  </div>
                  <div className="tp-cr-mix">
                    <div className="tp-cr-barra" aria-hidden="true">
                      {composicao.map((c) => (
                        <span key={c.tipo} style={{ flex: c.qtd, background: c.cor }} title={`${c.rotulo}: ${c.qtd}`} />
                      ))}
                    </div>
                    <div className="tp-cr-itens">
                      {composicao.map((c) => (
                        <span key={c.tipo}>
                          <i style={{ background: c.cor }} aria-hidden="true" />
                          {c.rotulo} <b>{c.qtd}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </aside>
          )}
        </div>

        <aside className="tp-lateral">
          <section className="tp-painel" aria-label="Enviar pacote">
            <h2>ENVIAR PACOTE</h2>
            <label>
              Origem
              <select value={origem} onChange={(e) => (setOrigem(e.target.value), limparSim())}>
                {hosts.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Destino
              <select value={destino} onChange={(e) => (setDestino(e.target.value), limparSim())}>
                {hosts.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </label>
            <div className="tp-protos" role="group" aria-label="Protocolo">
              {PROTOCOLOS.map((p) => (
                <button key={p} className={p === protocolo ? 'ativo' : ''} aria-pressed={p === protocolo} onClick={() => (setProtocolo(p), limparSim())} style={{ ['--c' as string]: COR_PROTOCOLO[p] }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="tp-check">
              <input type="checkbox" checked={depurar} onChange={(e) => (setDepurar(e.target.checked), limparSim())} /> Depurar passo a passo
            </label>
            <button className="tp-acao" onClick={enviar} disabled={!origem || !destino}>
              {depurar ? 'Iniciar depuração' : 'Enviar pacote'} ▶
            </button>

            {resultado && (
              <div className="tp-trace" aria-live="polite">
                <p className={`tp-status ${resultado.status}`}>
                  {resultado.status === 'entregue' ? `ENTREGUE · ${resultado.totalMs} ms` : `DESCARTADO · ${resultado.motivo}`}
                </p>
                <ol>
                  {resultado.passos.map((p, i) => (
                    <li key={i} className={`${p.acao} ${i === anim.passo ? 'atual' : ''} ${i > anim.passo ? 'futuro' : ''}`}>
                      <button onClick={() => irPasso(i)} aria-label={`Passo ${i + 1}`}>
                        <b>{i + 1}</b>
                        <span>
                          {p.acao === 'encaminhou' ? `${disp(p.de)?.nome} → ${disp(p.para)?.nome}` : `${disp(p.de)?.nome}: descartado`}
                          {p.motivo && <em>{p.motivo}</em>}
                        </span>
                        {p.acao === 'encaminhou' && <small>{p.ms} ms</small>}
                      </button>
                    </li>
                  ))}
                </ol>
                {depurar && (
                  <div className="tp-passos">
                    <button onClick={() => irPasso(anim.passo - 1)} disabled={anim.passo <= 0}>◀ Anterior</button>
                    <button onClick={() => irPasso(anim.passo + 1)} disabled={anim.passo >= resultado.passos.length - 1}>Próximo ▶</button>
                  </div>
                )}
              </div>
            )}
          </section>

          {(dSel || eSel) && (
            <section className="tp-painel" aria-label="Propriedades">
              {dSel && (
                <>
                  <h2>{ROTULO_TIPO[dSel.tipo].toUpperCase()}</h2>
                  {aoVivo && tel.disps[dSel.id] && (
                    <div className="tp-metricas-vivo">
                      <span>CPU: <b>{tel.disps[dSel.id].cpuPct ?? 0}%</b></span>
                      <span>Resposta: <b>{tel.disps[dSel.id].ms ?? 0} ms</b></span>
                    </div>
                  )}
                  <label>
                    Nome
                    <input value={dSel.nome} onChange={(e) => atualizarDisp(dSel.id, { nome: e.target.value })} />
                  </label>
                  {(EH_HOST[dSel.tipo] || dSel.tipo === 'roteador') && dSel.tipo !== 'nuvem' && (
                    <label>
                      IP
                      <input value={dSel.ip ?? ''} onChange={(e) => atualizarDisp(dSel.id, { ip: e.target.value })} />
                    </label>
                  )}
                  <label className="tp-check">
                    <input type="checkbox" checked={dSel.ligado} onChange={(e) => atualizarDisp(dSel.id, { ligado: e.target.checked })} /> Ligado
                  </label>
                  {dSel.tipo === 'firewall' && (
                    <fieldset>
                      <legend>Bloquear protocolos</legend>
                      {PROTOCOLOS.map((p) => (
                        <label key={p} className="tp-check">
                          <input
                            type="checkbox"
                            checked={dSel.bloqueia?.includes(p) ?? false}
                            onChange={(e) => atualizarDisp(dSel.id, { bloqueia: e.target.checked ? [...(dSel.bloqueia ?? []), p] : (dSel.bloqueia ?? []).filter((x) => x !== p) })}
                          />{' '}
                          {ROTULO_PROTOCOLO[p]}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <button className="tp-perigo" onClick={() => (editar((t) => remover(t, dSel.id)), setSel(null))}>Remover dispositivo</button>
                </>
              )}
              {eSel && (
                <>
                  <h2>ENLACE</h2>
                  <p className="tp-sub">{disp(eSel.a)?.nome} ↔ {disp(eSel.b)?.nome}</p>
                  {aoVivo && (
                    <div className="tp-metricas-vivo">
                      <span>Vazão: <b>{tel.enlaces[eSel.id]?.mbps ?? 0} / {eSel.mbpsMax ?? 100} Mbps ({Math.round(utilizacao(tel.enlaces[eSel.id]?.mbps ?? 0, eSel.mbpsMax) * 100)}%)</b></span>
                      <span>Perda: <b>{tel.enlaces[eSel.id]?.perdaPct ?? 0}%</b></span>
                    </div>
                  )}
                  <label>
                    Latência (ms)
                    <input type="number" min={1} max={500} value={eSel.ms} onChange={(e) => editar((t) => ({ ...t, enlaces: t.enlaces.map((x) => (x.id === eSel.id ? { ...x, ms: Math.max(1, Number(e.target.value) || 1) } : x)) }))} />
                  </label>
                  <label>
                    Capacidade (Mbps)
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      step={10}
                      value={eSel.mbpsMax ?? 100}
                      onChange={(e) => editar((t) => ({ ...t, enlaces: t.enlaces.map((x) => (x.id === eSel.id ? { ...x, mbpsMax: Math.max(10, Number(e.target.value) || 100) } : x)) }))}
                    />
                  </label>
                  <label className="tp-check">
                    <input type="checkbox" checked={eSel.ativo} onChange={(e) => editar((t) => ({ ...t, enlaces: t.enlaces.map((x) => (x.id === eSel.id ? { ...x, ativo: e.target.checked } : x)) }))} /> Enlace ativo
                  </label>
                  <button className="tp-perigo" onClick={() => (editar((t) => remover(t, eSel.id)), setSel(null))}>Remover cabo</button>
                </>
              )}
            </section>
          )}

          <section className="tp-painel" aria-label="Telemetria ao vivo">
            <h2>DADOS AO VIVO {aoVivo ? `· ${estadoFonte.fase} (${tel.recebidas})` : '· PAUSADO'}</h2>
            <label>
              Fonte de telemetria
              <select value={tipoFonte} onChange={(e) => setTipoFonte(e.target.value as typeof tipoFonte)}>
                <option value="simulada">Simulada (no navegador)</option>
                <option value="sse">SSE (ponte local)</option>
                <option value="ws">WebSocket</option>
                <option value="polling">HTTP Polling</option>
              </select>
            </label>
            {tipoFonte !== 'simulada' && (
              <label>
                URL da fonte
                <input value={urlFonte} onChange={(e) => setUrlFonte(e.target.value)} placeholder="http://127.0.0.1:5181/eventos" />
              </label>
            )}
            {aoVivo && topCarregados.length > 0 && (
              <ul className="tp-enlaces-lista">
                {topCarregados.map((r) => {
                  const e = topoEfetiva.enlaces.find((x) => x.id === r.id);
                  if (!e) return null;
                  const pct = Math.min(100, Math.round(r.util * 100));
                  return (
                    <li key={r.id}>
                      <button onClick={() => setSel({ tipo: 'e', id: r.id })}>
                        <div className="tp-enlace-cab">
                          <span>{disp(e.a)?.nome} ↔ {disp(e.b)?.nome}</span>
                          <b>{r.mbps} Mbps ({pct}%)</b>
                        </div>
                        <div className="tp-enlace-barra">
                          <span style={{ width: `${pct}%`, background: corUtilizacao(r.util) }} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {avisos.length > 0 && (
            <section className="tp-painel tp-avisos" aria-label="Avisos da topologia">
              <h2>AVISOS ({avisos.length})</h2>
              <ul>
                {avisos.slice(0, 5).map((a, i) => (
                  <li key={i} className={a.nivel}>
                    <button onClick={() => a.disp && setSel({ tipo: 'd', id: a.disp })}>{a.texto}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      <p className="tp-dica">
        {modo === 'ligar' ? (pendente ? `Escolha o segundo dispositivo para ligar a ${disp(pendente)?.nome}.` : 'Clique no primeiro dispositivo.') : vista === '3d' ? 'Arraste um dispositivo para movê-lo · arraste o fundo para girar a câmera · Ctrl+roda ou +/− para zoom · clique em um cabo para derrubá-lo' : 'Arraste para mover · clique em um cabo para derrubá-lo · setas movem o item focado · Delete remove'}
      </p>
    </div>
  );
}
