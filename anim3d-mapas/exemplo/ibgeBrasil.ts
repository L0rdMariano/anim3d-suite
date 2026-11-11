// Dados do IBGE por Unidade da Federação (snapshot gerado por dados/gerar-dados.mjs) + geometria e escalas do mapa.
// Sem React e sem three: testável em Node.
import dados from './dados/ibge-brasil.json';

export interface Estado {
  id: string;
  sigla: string;
  nome: string;
  regiao: string;
  capital: string;
  populacao: number;
  areaKm2: number;
  /** PIB a preços correntes, em mil reais. */
  pibMilReais: number;
  municipios: number;
  /** Polígonos [lon, lat]: cada polígono é uma lista de anéis (o primeiro é o contorno). */
  poligonos: number[][][][];
}

export const ESTADOS = dados.estados as unknown as Estado[];
export const anoCenso = dados.anoCenso;
export const anoPib = dados.anoPib;
export const fonteIbge = `${dados.fonte} · coletado em ${dados.gerado}`;

// ---------- métricas ----------
export type MetricaId = 'populacao' | 'densidade' | 'pibpc' | 'area' | 'municipios';

const nf = new Intl.NumberFormat('pt-BR');
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const nfCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const densidade = (e: Estado) => e.populacao / e.areaKm2;
export const pibPerCapita = (e: Estado) => (e.pibMilReais * 1000) / e.populacao;
/** PIB em bilhões de reais. */
export const pibBilhoes = (e: Estado) => e.pibMilReais / 1e6;

export interface Metrica {
  id: MetricaId;
  rotulo: string;
  curto: string;
  valor: (e: Estado) => number;
  formatar: (n: number) => string;
  /** Escala de cor: log para grandezas muito desiguais (SP × RR), linear para o resto. */
  escala: 'log' | 'linear';
}

export const METRICAS: Metrica[] = [
  { id: 'populacao', rotulo: `População (Censo ${anoCenso})`, curto: 'População', valor: (e) => e.populacao, formatar: (n) => nfCompacto.format(n), escala: 'log' },
  { id: 'densidade', rotulo: 'Densidade demográfica', curto: 'Densidade', valor: densidade, formatar: (n) => `${nf1.format(n)} hab/km²`, escala: 'log' },
  { id: 'pibpc', rotulo: `PIB per capita (${anoPib})`, curto: 'PIB per capita', valor: pibPerCapita, formatar: (n) => `R$ ${nf.format(Math.round(n))}`, escala: 'linear' },
  { id: 'area', rotulo: 'Área territorial', curto: 'Área', valor: (e) => e.areaKm2, formatar: (n) => `${nfCompacto.format(n)} km²`, escala: 'log' },
  { id: 'municipios', rotulo: 'Municípios', curto: 'Municípios', valor: (e) => e.municipios, formatar: (n) => nf.format(n), escala: 'log' },
];
export const metricaPorId = (id: MetricaId) => METRICAS.find((m) => m.id === id)!;

/** Estados do maior para o menor valor da métrica. */
export const ranking = (m: Metrica): Estado[] => [...ESTADOS].sort((a, b) => m.valor(b) - m.valor(a));
export const posicao = (m: Metrica, e: Estado): number => ranking(m).findIndex((x) => x.id === e.id) + 1;

/** Posição 0..1 do valor na escala da métrica (0 = menor estado, 1 = maior). */
export function normalizar(m: Metrica, valor: number): number {
  const vs = ESTADOS.map(m.valor);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  if (max === min) return 0.5;
  const f = m.escala === 'log' ? (x: number) => Math.log(x) : (x: number) => x;
  return (f(valor) - f(min)) / (f(max) - f(min));
}

const PARADAS: [number, [number, number, number]][] = [
  [0, [11, 42, 61]],
  [0.3, [15, 90, 120]],
  [0.6, [23, 152, 184]],
  [0.85, [34, 211, 238]],
  [1, [201, 248, 255]],
];
/** Escala sequencial escura → ciano brilhante (t de 0 a 1). */
export function corEscala(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < PARADAS.length; i++) {
    const [t1, c1] = PARADAS[i];
    if (x <= t1) {
      const [t0, c0] = PARADAS[i - 1];
      const k = (x - t0) / (t1 - t0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',')})`;
    }
  }
  return `rgb(${PARADAS[PARADAS.length - 1][1].join(',')})`;
}

// ---------- totais do país ----------
export const TOTAIS = {
  populacao: ESTADOS.reduce((s, e) => s + e.populacao, 0),
  areaKm2: ESTADOS.reduce((s, e) => s + e.areaKm2, 0),
  pibMilReais: ESTADOS.reduce((s, e) => s + e.pibMilReais, 0),
  municipios: ESTADOS.reduce((s, e) => s + e.municipios, 0),
};

// ---------- geometria: projeção equiretangular corrigida pelo cosseno da latitude média ----------
const COS_LAT = Math.cos((-14 * Math.PI) / 180);
const ilhaPequena = (poli: number[][][]) => {
  const xs = poli[0].map((p) => p[0]);
  const ys = poli[0].map((p) => p[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) < 1;
};

// o enquadramento usa só o território contínuo: ilhas oceânicas distantes não encolhem o mapa
const caixa = (() => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const e of ESTADOS)
    for (const poli of e.poligonos) {
      if (ilhaPequena(poli)) continue;
      for (const [lon, lat] of poli[0]) {
        x0 = Math.min(x0, lon);
        x1 = Math.max(x1, lon);
        y0 = Math.min(y0, lat);
        y1 = Math.max(y1, lat);
      }
    }
  return { x0, x1, y0, y1 };
})();

const px = (lon: number) => (lon - caixa.x0) * COS_LAT;
const py = (lat: number) => caixa.y1 - lat;
export const VIEWBOX = { largura: (caixa.x1 - caixa.x0) * COS_LAT, altura: caixa.y1 - caixa.y0 };

const r2 = (n: number) => Math.round(n * 100) / 100;
export const caminho = (e: Estado): string =>
  e.poligonos.map((poli) => poli.map((anel) => `M${anel.map(([lon, lat]) => `${r2(px(lon))},${r2(py(lat))}`).join('L')}Z`).join('')).join('');

/** Centro do maior polígono do estado, em coordenadas do viewBox (rótulo e marcador). */
export function centroide(e: Estado): [number, number] {
  let melhor: number[][] | null = null;
  let area = 0;
  for (const poli of e.poligonos) {
    let a = 0;
    const r = poli[0];
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    if (Math.abs(a) > area) ((area = Math.abs(a)), (melhor = r));
  }
  const r = melhor!;
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    cx += (r[i][0] + r[i + 1][0]) * f;
    cy += (r[i][1] + r[i + 1][1]) * f;
    a += f;
  }
  return [r2(px(cx / (3 * a))), r2(py(cy / (3 * a)))];
}

export const fmtInteiro = (n: number) => nf.format(Math.round(n));
export const fmtCompacto = (n: number) => nfCompacto.format(n);
export const fmtDecimal = (n: number) => nf1.format(n);
