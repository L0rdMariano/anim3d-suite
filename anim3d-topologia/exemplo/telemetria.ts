// Contrato de telemetria ao vivo da topologia: o que uma fonte de dados (simulada, SSE, WebSocket, polling, ponte local) envia
// e como a tela aplica. Sem React e sem three: testável em Node. Dado externo NUNCA é confiável: tudo passa por `validarMensagem`
// (tipos, faixas, ids) antes de tocar o estado, e nenhum texto vindo da fonte é renderizado como HTML.
import type { Topologia } from './topologiaSim';

// ---------- mensagens ----------
export interface MsgEnlace {
  tipo: 'enlace';
  id: string;
  /** Vazão atual em megabits por segundo (≥ 0). */
  mbps?: number;
  /** Latência medida, em ms. */
  ms?: number;
  /** Perda de pacotes, 0 a 100. */
  perdaPct?: number;
  ativo?: boolean;
}
export interface MsgDisp {
  tipo: 'disp';
  id: string;
  ligado?: boolean;
  ms?: number;
  perdaPct?: number;
  cpuPct?: number;
}
export type Mensagem = MsgEnlace | MsgDisp;

/**
 * Formato aceito (um objeto, uma lista ou um lote):
 *   {"tipo":"enlace","id":"l6","mbps":42.5,"ms":18.2,"perdaPct":0.4,"ativo":true}
 *   {"tipo":"disp","id":"srv1","ligado":true,"ms":0.4,"cpuPct":31}
 *   {"tipo":"lote","itens":[ ... ]}
 */
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const ehId = (v: unknown): v is string => typeof v === 'string' && /^[\w.:-]{1,64}$/.test(v);

export function validarMensagem(x: unknown, profundidade = 0): Mensagem[] {
  if (Array.isArray(x)) return profundidade > 2 ? [] : x.slice(0, 500).flatMap((i) => validarMensagem(i, profundidade + 1));
  if (!x || typeof x !== 'object') return [];
  const o = x as Record<string, unknown>;
  if (o.tipo === 'lote') return profundidade > 2 ? [] : validarMensagem(o.itens, profundidade + 1);
  if (!ehId(o.id)) return [];
  if (o.tipo === 'enlace') {
    const m: MsgEnlace = { tipo: 'enlace', id: o.id, mbps: num(o.mbps, 0, 1e6), ms: num(o.ms, 0, 60000), perdaPct: num(o.perdaPct, 0, 100), ativo: bool(o.ativo) };
    return [m];
  }
  if (o.tipo === 'disp') {
    const m: MsgDisp = { tipo: 'disp', id: o.id, ligado: bool(o.ligado), ms: num(o.ms, 0, 60000), perdaPct: num(o.perdaPct, 0, 100), cpuPct: num(o.cpuPct, 0, 100) };
    return [m];
  }
  return [];
}

// ---------- estado ----------
export interface MetricaEnlace {
  mbps: number;
  ms: number | null;
  perdaPct: number;
  ativo: boolean;
  /** Instante (ms) da última atualização. */
  t: number;
}
export interface MetricaDisp {
  ligado: boolean;
  ms: number | null;
  perdaPct: number;
  cpuPct: number | null;
  t: number;
}
export interface Telemetria {
  enlaces: Record<string, MetricaEnlace>;
  disps: Record<string, MetricaDisp>;
  /** Últimos valores por item: mbps do enlace (chave = id) e latência do dispositivo (chave = `d:id`). */
  hist: Record<string, number[]>;
  /** Mensagens aplicadas desde o início. */
  recebidas: number;
}

export const HISTORICO = 60;
export const telemetriaVazia = (): Telemetria => ({ enlaces: {}, disps: {}, hist: {}, recebidas: 0 });

const empilhar = (h: Record<string, number[]>, chave: string, v: number | null | undefined) => {
  if (v == null) return;
  const l = h[chave] ?? [];
  h[chave] = l.length >= HISTORICO ? [...l.slice(1), v] : [...l, v];
};

/** Aplica mensagens já validadas e devolve um estado novo (o anterior não é alterado). */
export function aplicar(t: Telemetria, msgs: Mensagem[], agora: number): Telemetria {
  if (msgs.length === 0) return t;
  const enlaces = { ...t.enlaces };
  const disps = { ...t.disps };
  const hist = { ...t.hist };
  for (const m of msgs) {
    if (m.tipo === 'enlace') {
      const a = enlaces[m.id];
      const n: MetricaEnlace = { mbps: m.mbps ?? a?.mbps ?? 0, ms: m.ms ?? a?.ms ?? null, perdaPct: m.perdaPct ?? a?.perdaPct ?? 0, ativo: m.ativo ?? a?.ativo ?? true, t: agora };
      enlaces[m.id] = n;
      if (m.mbps !== undefined) empilhar(hist, m.id, n.mbps);
    } else {
      const a = disps[m.id];
      const n: MetricaDisp = { ligado: m.ligado ?? a?.ligado ?? true, ms: m.ms ?? a?.ms ?? null, perdaPct: m.perdaPct ?? a?.perdaPct ?? 0, cpuPct: m.cpuPct ?? a?.cpuPct ?? null, t: agora };
      disps[m.id] = n;
      if (m.ms !== undefined) empilhar(hist, `d:${m.id}`, n.ms);
    }
  }
  return { enlaces, disps, hist, recebidas: t.recebidas + msgs.length };
}

/** Dado parado há mais que isto é tratado como "sem sinal". */
export const VALIDADE_MS = 15000;
export const velho = (m: { t: number } | undefined, agora: number) => !m || agora - m.t > VALIDADE_MS;

/** Utilização do enlace, 0 a 1 (acima de 1 = saturado), dada a capacidade em Mbps. */
export const utilizacao = (mbps: number, capacidade = 100) => (capacidade > 0 ? Math.max(0, mbps / capacidade) : 0);

const PARADAS: [number, [number, number, number]][] = [
  [0, [61, 220, 151]], // verde
  [0.55, [255, 210, 63]], // amarelo
  [1, [255, 59, 92]], // vermelho
];
/** Cor da utilização (verde → amarelo → vermelho): [r, g, b] de 0 a 255. */
export function rgbUtilizacao(u: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, u));
  for (let i = 1; i < PARADAS.length; i++) {
    const [t1, c1] = PARADAS[i];
    if (x <= t1) {
      const [t0, c0] = PARADAS[i - 1];
      const k = (x - t0) / (t1 - t0);
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
    }
  }
  return PARADAS[PARADAS.length - 1][1];
}
export const corUtilizacao = (u: number) => `rgb(${rgbUtilizacao(u).join(',')})`;

/**
 * Topologia "efetiva": o modelo desenhado sobreposto pelo que a rede REAL informa
 * (dispositivo sem resposta = desligado, enlace caído, latência medida). O modelo editável não é alterado.
 */
export function aplicarNaTopologia(topo: Topologia, t: Telemetria, agora: number): Topologia {
  return {
    disps: topo.disps.map((d) => {
      const m = t.disps[d.id];
      return m && !velho(m, agora) ? { ...d, ligado: m.ligado } : d;
    }),
    enlaces: topo.enlaces.map((e) => {
      const m = t.enlaces[e.id];
      if (!m || velho(m, agora)) return e;
      return { ...e, ativo: m.ativo && m.perdaPct < 100, ms: m.ms != null ? Math.max(0.1, m.ms) : e.ms };
    }),
  };
}

/** Os `n` enlaces mais carregados (utilização), para um resumo. */
export function maisCarregados(topo: Topologia, t: Telemetria, n = 3): { id: string; util: number; mbps: number }[] {
  return topo.enlaces
    .map((e) => ({ id: e.id, mbps: t.enlaces[e.id]?.mbps ?? 0, util: utilizacao(t.enlaces[e.id]?.mbps ?? 0, e.mbpsMax) }))
    .filter((x) => t.enlaces[x.id])
    .sort((a, b) => b.util - a.util)
    .slice(0, n);
}
