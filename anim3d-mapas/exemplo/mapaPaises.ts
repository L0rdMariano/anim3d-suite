// Interação com o mapa-múndi: qual país está sob um ponto, centro de cada país e a camada de destaque.
// Sem three: testável em Node. Usa os mesmos polígonos que desenham a textura do globo.
import { aneisDe, areaAnel, centroideAnel, desembrulhar, paises, trazerAnel, type Anel, type Pais } from './mapaMundi';

interface Poligono {
  /** Anéis originais (para desenhar). */
  aneis: Anel[];
  /** Anéis contínuos, sem o corte da linha de data (para teste de ponto e centro). */
  planos: Anel[];
  /** [lonMin, latMin, lonMax, latMax] */
  caixa: [number, number, number, number];
}
interface PaisIndexado {
  id: string;
  nomeEn: string;
  polis: Poligono[];
}
let indice: PaisIndexado[] | undefined;
let porId: Map<string, PaisIndexado> | undefined;
const idDe = (p: Pais) => (p.id != null ? String(p.id) : `x:${p.properties.name}`);

function indexar(): PaisIndexado[] {
  if (!indice) {
    indice = paises().map((p) => ({
      id: idDe(p),
      nomeEn: p.properties.name,
      polis: aneisDe(p).map((aneis) => {
        const planos = aneis.map(desembrulhar);
        const caixa: Poligono['caixa'] = [Infinity, Infinity, -Infinity, -Infinity];
        for (const [lon, lat] of planos[0]) {
          caixa[0] = Math.min(caixa[0], lon);
          caixa[1] = Math.min(caixa[1], lat);
          caixa[2] = Math.max(caixa[2], lon);
          caixa[3] = Math.max(caixa[3], lat);
        }
        return { aneis, planos, caixa };
      }),
    }));
    porId = new Map(indice.map((p) => [p.id, p]));
  }
  return indice;
}

function dentroDoAnel(anel: Anel, lon: number, lat: number): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** País (id numérico ISO 3166 como string) que contém o ponto, ou null no oceano. */
export function paisNoPonto(lat: number, lon: number): { id: string; nome: string } | null {
  for (const p of indexar())
    for (const poli of p.polis)
      // 2ª tentativa com lon + 360: pontos a leste da linha de data de países que a cruzam
      for (const x of [lon, lon + 360]) {
        const [x0, y0, x1, y1] = poli.caixa;
        if (x < x0 || x > x1 || lat < y0 || lat > y1) continue;
        if (!dentroDoAnel(poli.planos[0], x, lat)) continue;
        if (poli.planos.slice(1).some((buraco) => dentroDoAnel(buraco, x, lat))) continue;
        return { id: p.id, nome: p.nomeEn };
      }
  return null;
}

/** Converte a coordenada de textura do three (v = 1 no topo) em latitude/longitude. */
export const uvParaLatLon = (u: number, v: number): { lat: number; lon: number } => ({ lon: u * 360 - 180, lat: v * 180 - 90 });

/** Centro do maior território do país (para voar até ele e ancorar a linha de chamada). */
export function centroidePais(id: string): { lat: number; lon: number } | null {
  indexar();
  const p = porId!.get(id);
  if (!p) return null;
  let melhor: Anel | null = null;
  let area = 0;
  for (const poli of p.polis) {
    const a = Math.abs(areaAnel(poli.planos[0]));
    if (a > area) ((area = a), (melhor = poli.planos[0]));
  }
  if (!melhor) return null;
  const [lonBruta, lat] = centroideAnel(melhor);
  return { lat, lon: lonBruta > 180 ? lonBruta - 360 : lonBruta };
}

export const nomeEnDoPais = (id: string) => (indexar(), porId!.get(id)?.nomeEn ?? id);

/** Camada de destaque (transparente): país sob o mouse e país selecionado. */
export function desenharDestaque(ctx: CanvasRenderingContext2D, W: number, H: number, selecionado: string | null, hover: string | null) {
  ctx.clearRect(0, 0, W, H);
  const X = (lon: number) => ((lon + 180) / 360) * W;
  const Y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.lineJoin = 'round';
  const pintar = (id: string | null, preenchimento: string, traco: string, largura: number) => {
    indexar();
    const p = id ? porId!.get(id) : undefined;
    if (!p) return;
    ctx.beginPath();
    for (const poli of p.polis) for (const anel of poli.aneis) trazerAnel(ctx, anel, X, Y);
    ctx.fillStyle = preenchimento;
    ctx.fill('evenodd');
    ctx.lineWidth = largura;
    ctx.strokeStyle = traco;
    ctx.stroke();
  };
  if (hover && hover !== selecionado) pintar(hover, 'rgba(34, 211, 238, 0.2)', 'rgba(160, 240, 255, 0.8)', W / 1500);
  pintar(selecionado, 'rgba(34, 211, 238, 0.42)', 'rgba(255, 255, 255, 0.95)', W / 900);
}
