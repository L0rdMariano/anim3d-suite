// Exemplo anim3d-wifi-rf · Cobertura Wi-Fi sobre a planta dos 3 andares do prédio do exemplo RackEmpresa.
// Canvas 2D (planta é 2D: three seria custo sem ganho). O mapa é CALCULADO por `motor/rf.ts`; a onda só revela o que já foi calculado.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as PtrEvent } from 'react';
import { useMovimentoReduzido, useTokens } from '@anim3d/kit';
import { nivelDe, PERDA_MATERIAL, type AP, type Banda, type Material, type Nivel } from '../motor/rf';
import { ANDARES, apsDaEmpresa, cobertura, LARGURA, paredes, POTENCIA_PADRAO_DBM, PROFUNDIDADE } from './wifiDados';
import './cobertura.css';

const PX = 32; // pixels internos por metro
const PASSO_TECLA = 0.5;
const MAX_APS = 6;

// Cores por tokens (--cw-*); os valores padrão ficam nesta linha PADRAO.
const MAPA = { bom: '--cw-bom', aceitavel: '--cw-aceitavel', fraco: '--cw-fraco', semSinal: '--cw-sem-sinal', fundo: '--cw-fundo', ap: '--cw-ap', texto: '--cw-texto', drywall: '--cw-drywall', vidro: '--cw-vidro', tijolo: '--cw-tijolo', concreto: '--cw-concreto', metal: '--cw-metal' } as const;
const PADRAO: Record<keyof typeof MAPA, string> = { bom: '#3ddc97', aceitavel: '#b6e36b', fraco: '#f0a53a', semSinal: '#27333f', fundo: '#0a141d', ap: '#22d3ee', texto: '#cdeffb', drywall: '#8aa1b4', vidro: '#7dd3fc', tijolo: '#d98a5f', concreto: '#e6edf3', metal: '#ff6b8a' };
const ROTULO_NIVEL: Record<Nivel, string> = { bom: 'Bom (≥ −67 dBm)', aceitavel: 'Aceitável (≥ −75)', fraco: 'Fraco (≥ −85)', 'sem-sinal': 'Sem sinal' };
const MATERIAIS: Material[] = ['drywall', 'vidro', 'tijolo', 'concreto', 'metal'];
const NOME_MATERIAL: Record<Material, string> = { drywall: 'Drywall', vidro: 'Vidro', tijolo: 'Tijolo', concreto: 'Concreto', metal: 'Metal' };

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function CoberturaWifi() {
  const cor = useTokens(MAPA, PADRAO);
  const reduzido = useMovimentoReduzido();
  const [andar, setAndar] = useState(0);
  const [banda, setBanda] = useState<Banda>('5');
  const [aps, setAps] = useState<AP[]>(() => apsDaEmpresa());
  const [selecionado, setSelecionado] = useState<string>('ap-0');
  const [onda, setOnda] = useState<number | null>(null); // raio da frente de onda em metros; null = mapa completo
  const canvas = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<string | null>(null);
  const ps = useMemo(() => paredes(), []);

  const { celulas, resumo } = useMemo(() => cobertura(aps, banda, andar, ps), [aps, banda, andar, ps]);
  const apsDoAndar = useMemo(() => aps.filter((a) => a.andar === andar), [aps, andar]);
  const porId = useMemo(() => new Map(aps.map((a) => [a.id, a])), [aps]);

  const corNivel = useCallback((n: Nivel) => (n === 'bom' ? cor.bom : n === 'aceitavel' ? cor.aceitavel : n === 'fraco' ? cor.fraco : cor.semSinal), [cor]);

  const desenhar = useCallback(() => {
    const c = canvas.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = cor.fundo;
    g.fillRect(0, 0, c.width, c.height);
    const passo = 0.5 * PX;
    for (const cel of celulas) {
      const ap = porId.get(cel.ap);
      const dist = ap ? Math.hypot(cel.x - ap.x, cel.y - ap.y) : 0;
      const visivel = onda === null || dist <= onda;
      g.globalAlpha = visivel ? 0.88 : 0.1;
      g.fillStyle = corNivel(cel.nivel);
      g.fillRect(cel.x * PX - passo / 2, cel.y * PX - passo / 2, passo, passo);
    }
    g.globalAlpha = 1;
    // paredes do andar: contorno escuro por baixo (legível sobre qualquer cor do mapa) e cor do material por cima;
    // a espessura cresce com a perda do material (concreto e metal são mais grossos)
    g.lineCap = 'round';
    for (const w of ps.filter((p) => p.andar === andar)) {
      const esp = 2.5 + PERDA_MATERIAL[w.material]['5'] / 5;
      g.beginPath();
      g.moveTo(w.x1 * PX, w.y1 * PX);
      g.lineTo(w.x2 * PX, w.y2 * PX);
      g.strokeStyle = cor.fundo;
      g.lineWidth = esp + 3;
      g.stroke();
      g.strokeStyle = cor[w.material];
      g.lineWidth = esp;
      g.stroke();
    }
    // frente de onda e APs
    for (const ap of apsDoAndar) {
      if (onda !== null) {
        g.strokeStyle = cor.ap;
        g.globalAlpha = Math.max(0, 1 - onda / 26);
        g.lineWidth = 2;
        g.beginPath();
        g.arc(ap.x * PX, ap.y * PX, onda * PX, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
      g.fillStyle = cor.ap;
      g.strokeStyle = ap.id === selecionado ? '#ffffff' : cor.fundo;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(ap.x * PX, ap.y * PX, 9, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = cor.texto;
      g.font = '600 12px ui-monospace, Consolas, monospace';
      g.fillText(ap.id.toUpperCase(), ap.x * PX + 13, ap.y * PX + 4);
    }
  }, [celulas, porId, onda, ps, andar, apsDoAndar, cor, corNivel, selecionado]);

  useEffect(() => { desenhar(); }, [desenhar]);

  // onda: 0 → 26 m em ~2,6 s; com movimento reduzido o mapa completo aparece direto
  const tocar = useCallback(() => {
    if (reduzido) { setOnda(null); return; }
    const t0 = performance.now();
    let raf = 0;
    const passo = (agora: number) => {
      const r = ((agora - t0) / 2600) * 26;
      if (r >= 26) { setOnda(null); return; }
      setOnda(r);
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [reduzido]);
  useEffect(() => tocar(), [tocar]); // toca uma vez ao abrir

  const mover = (id: string, x: number, y: number) =>
    setAps((l) => l.map((a) => (a.id === id ? { ...a, x: Math.max(0.5, Math.min(LARGURA - 0.5, x)), y: Math.max(0.5, Math.min(PROFUNDIDADE - 0.5, y)) } : a)));

  const paraPlanta = (e: PtrEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * LARGURA, y: ((e.clientY - r.top) / r.height) * PROFUNDIDADE };
  };
  const aoPressionar = (e: PtrEvent<HTMLCanvasElement>) => {
    const p = paraPlanta(e);
    const perto = apsDoAndar.map((a) => ({ a, d: Math.hypot(a.x - p.x, a.y - p.y) })).sort((u, v) => u.d - v.d)[0];
    if (perto && perto.d < 1.4) {
      arrasto.current = perto.a.id;
      setSelecionado(perto.a.id);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const aoMover = (e: PtrEvent<HTMLCanvasElement>) => {
    if (!arrasto.current) return;
    const p = paraPlanta(e);
    mover(arrasto.current, p.x, p.y);
  };
  const aoTeclar = (e: KeyboardEvent, ap: AP) => {
    const passo = e.shiftKey ? 2 : PASSO_TECLA;
    const d: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    if (d[e.key]) { e.preventDefault(); mover(ap.id, ap.x + d[e.key][0], ap.y + d[e.key][1]); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && apsDoAndar.length > 0) { e.preventDefault(); setAps((l) => l.filter((a) => a.id !== ap.id)); }
  };

  const adicionar = () => {
    if (aps.length >= MAX_APS) return;
    const id = `ap-x${aps.length}`;
    setAps((l) => [...l, { id, x: LARGURA / 2, y: PROFUNDIDADE / 2, andar, txDbm: POTENCIA_PADRAO_DBM }]);
    setSelecionado(id);
  };

  const original = useMemo(() => apsDaEmpresa(), []);
  const mudou = aps.length !== original.length || aps.some((a, i) => original[i]?.x !== a.x || original[i]?.y !== a.y);
  const nSemSinal = Math.round(resumo.semSinal * celulas.length);
  const pior = celulas.length ? celulas.reduce((m, c) => (c.dbm < m.dbm ? c : m)) : null;
  const sel = porId.get(selecionado);

  return (
    <div className="cw-raiz">
      <div className="cw-corpo">
        <div className="cw-palco">
          <div className="cw-barra">
            <div className="cw-grupo" role="group" aria-label="Andar">
              {ANDARES.map((nome, i) => <button key={nome} className={andar === i ? 'ativo' : ''} onClick={() => { setAndar(i); setSelecionado(aps.find((a) => a.andar === i)?.id ?? ''); }}>{nome}</button>)}
            </div>
            <div className="cw-grupo" role="group" aria-label="Banda">
              <button className={banda === '2.4' ? 'ativo' : ''} onClick={() => setBanda('2.4')}>2,4 GHz</button>
              <button className={banda === '5' ? 'ativo' : ''} onClick={() => setBanda('5')}>5 GHz</button>
            </div>
            <button onClick={() => tocar()} disabled={reduzido}>▶ Onda</button>
          </div>
          <canvas
            ref={canvas}
            className="cw-canvas"
            width={LARGURA * PX}
            height={PROFUNDIDADE * PX}
            role="img"
            aria-label={`Mapa de cobertura Wi-Fi do ${ANDARES[andar]} em ${banda === '5' ? '5' : '2,4'} GHz: ${pct(resumo.bom)} da área com sinal bom`}
            onPointerDown={aoPressionar}
            onPointerMove={aoMover}
            onPointerUp={() => { arrasto.current = null; }}
          />
          <ul className="cw-legenda" aria-label="Legenda">
            {(['bom', 'aceitavel', 'fraco', 'sem-sinal'] as Nivel[]).map((n) => <li key={n}><i style={{ background: corNivel(n) }} />{ROTULO_NIVEL[n]}</li>)}
          </ul>
          <ul className="cw-legenda" aria-label="Materiais das paredes">
            {MATERIAIS.map((m) => <li key={m}><i className="linha" style={{ background: cor[m] }} />{NOME_MATERIAL[m]} −{PERDA_MATERIAL[m][banda]} dB</li>)}
          </ul>
        </div>

        <aside className="cw-painel" aria-label="Resultado">
          <section>
            <h3>{ANDARES[andar]} <small>{banda === '5' ? '5 GHz' : '2,4 GHz'}</small></h3>
            <dl className="cw-metricas">
              <div><dt>Sinal bom</dt><dd>{pct(resumo.bom)}</dd></div>
              <div><dt>Pelo menos aceitável</dt><dd>{pct(resumo.aceitavel)}</dd></div>
              <div><dt>Sem sinal útil</dt><dd className={nSemSinal ? 'aviso' : ''}>{pct(resumo.semSinal)}</dd></div>
            </dl>
            {pior && <p className="cw-nota">Pior ponto: {pior.dbm.toFixed(0)} dBm ({ROTULO_NIVEL[nivelDe(pior.dbm)].split(' (')[0].toLowerCase()}) em ({pior.x.toFixed(1)} m, {pior.y.toFixed(1)} m).</p>}
          </section>

          <section>
            <h3>Pontos de acesso</h3>
            <p className="cw-nota">Arraste no mapa, ou use as setas no ponto selecionado (Shift = 2 m, Delete remove).</p>
            <div className="cw-chips" role="group" aria-label="Pontos de acesso deste andar">
              {apsDoAndar.map((a) => (
                <button key={a.id} className={selecionado === a.id ? 'ativo' : ''} onClick={() => setSelecionado(a.id)} onKeyDown={(e) => aoTeclar(e, a)} aria-label={`${a.id}, x ${a.x.toFixed(1)} m, y ${a.y.toFixed(1)} m`}>
                  {a.id.toUpperCase()} <small>({a.x.toFixed(1)}, {a.y.toFixed(1)})</small>
                </button>
              ))}
              <button onClick={adicionar} disabled={aps.length >= MAX_APS}>+ AP neste andar</button>
              <button onClick={() => { setAps(apsDaEmpresa()); setSelecionado('ap-0'); }} disabled={!mudou}>Restaurar</button>
            </div>
            {sel && sel.andar !== andar && <p className="cw-nota">O ponto selecionado está em outro andar.</p>}
          </section>

          <section>
            <h3>Por que 5 GHz cobre menos</h3>
            <p className="cw-nota">Cada parede cobra mais em 5 GHz (concreto: −{PERDA_MATERIAL.concreto['5']} dB contra −{PERDA_MATERIAL.concreto['2.4']} dB) e a perda em espaço livre também é maior. Troque a banda e veja o mapa encolher atrás do poço do elevador.</p>
          </section>

          <section>
            <h3>Limites</h3>
            <p className="cw-nota">Modelo de pré-projeto (perda log-distância + paredes + lajes). Os valores de material são de partida, sem fonte primária registrada; não substitui site survey.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default CoberturaWifi;
