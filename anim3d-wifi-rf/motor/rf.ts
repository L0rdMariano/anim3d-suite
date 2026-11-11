// Propagação Wi-Fi em planta: perda log-distância + atenuação por parede cruzada + atenuação por laje. Sem React, sem three.
// Valores de material são de PLANEJAMENTO (ordem de grandeza); calibre com medição no local antes de prometer cobertura.

export type Banda = '2.4' | '5';
export interface AP { id: string; x: number; y: number; andar: number; txDbm: number; }
export interface Parede { x1: number; y1: number; x2: number; y2: number; andar: number; material: Material; }
export type Material = 'drywall' | 'vidro' | 'tijolo' | 'concreto' | 'metal';

/** dB perdidos ao atravessar um elemento do material. 5 GHz perde mais que 2,4 GHz em todos. */
export const PERDA_MATERIAL: Record<Material, Record<Banda, number>> = {
  drywall: { '2.4': 3, '5': 4 },
  vidro: { '2.4': 2, '5': 3 },
  tijolo: { '2.4': 6, '5': 9 },
  concreto: { '2.4': 12, '5': 18 },
  metal: { '2.4': 25, '5': 30 },
};
export const PERDA_LAJE: Record<Banda, number> = { '2.4': 15, '5': 20 };
const FREQ_MHZ: Record<Banda, number> = { '2.4': 2437, '5': 5500 };
/** Expoente de perda em ambiente interno de escritório (2 = espaço livre). */
export const EXPOENTE = 3;

export const perdaEspacoLivreDb = (dMetros: number, banda: Banda) => 20 * Math.log10(Math.max(dMetros, 1e-3)) + 20 * Math.log10(FREQ_MHZ[banda]) - 27.55;

/** Os segmentos AB e CD se cruzam (pontos próprios, sem colinearidade)? */
function cruza(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = o(ax, ay, bx, by, cx, cy), d2 = o(ax, ay, bx, by, dx, dy), d3 = o(cx, cy, dx, dy, ax, ay), d4 = o(cx, cy, dx, dy, bx, by);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export interface Ponto { x: number; y: number; andar: number; }

/** Sinal recebido (dBm) em `p`. Distância 3D: andar vale `alturaAndar` metros, e cada laje atravessada soma sua perda. */
export function sinalEm(ap: AP, p: Ponto, paredes: Parede[], banda: Banda, alturaAndar = 3): number {
  const dz = Math.abs(p.andar - ap.andar) * alturaAndar;
  const d = Math.max(1, Math.hypot(p.x - ap.x, p.y - ap.y, dz));
  const caminho = perdaEspacoLivreDb(1, banda) + 10 * EXPOENTE * Math.log10(d);
  // paredes só contam no andar do AP quando o ponto está no mesmo andar; entre andares conta a laje
  const noMesmoAndar = ap.andar === p.andar;
  const nParedes = noMesmoAndar ? paredes.filter((w) => w.andar === p.andar && cruza(ap.x, ap.y, p.x, p.y, w.x1, w.y1, w.x2, w.y2)).reduce((s, w) => s + PERDA_MATERIAL[w.material][banda], 0) : 0;
  const lajes = Math.abs(p.andar - ap.andar) * PERDA_LAJE[banda];
  return ap.txDbm - caminho - nParedes - lajes;
}

export type Nivel = 'bom' | 'aceitavel' | 'fraco' | 'sem-sinal';
/** Limiares usuais de projeto: voz/vídeo ≥ -67 dBm; dados ≥ -75; abaixo disso a conexão cai. */
export const nivelDe = (dbm: number): Nivel => (dbm >= -67 ? 'bom' : dbm >= -75 ? 'aceitavel' : dbm >= -85 ? 'fraco' : 'sem-sinal');

export interface Celula { x: number; y: number; dbm: number; nivel: Nivel; ap: string; }

/** Mapa de calor: cada célula usa o MELHOR AP. É isto que a interface pinta, nunca uma esfera em volta do AP. */
export function mapaDeCobertura(aps: AP[], paredes: Parede[], banda: Banda, area: { largura: number; profundidade: number; andar: number }, passo = 1): Celula[] {
  const out: Celula[] = [];
  for (let y = passo / 2; y < area.profundidade; y += passo) {
    for (let x = passo / 2; x < area.largura; x += passo) {
      let melhor = { dbm: -Infinity, ap: '' };
      for (const ap of aps) {
        const dbm = sinalEm(ap, { x, y, andar: area.andar }, paredes, banda);
        if (dbm > melhor.dbm) melhor = { dbm, ap: ap.id };
      }
      out.push({ x, y, dbm: melhor.dbm, nivel: nivelDe(melhor.dbm), ap: melhor.ap });
    }
  }
  return out;
}

/** Fração (0..1) da área com pelo menos o nível pedido. */
export function percentualCoberto(celulas: Celula[], minimo: Nivel = 'aceitavel'): number {
  const ordem: Nivel[] = ['sem-sinal', 'fraco', 'aceitavel', 'bom'];
  return celulas.length ? celulas.filter((c) => ordem.indexOf(c.nivel) >= ordem.indexOf(minimo)).length / celulas.length : 0;
}
