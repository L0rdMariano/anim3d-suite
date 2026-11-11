// Mapa-múndi real para o globo: polígonos dos países (Natural Earth 1:110m, pacote world-atlas) desenhados
// numa textura equirretangular, mais a lista de rótulos (nome em português + posição) dos maiores países.
// Módulo de dados: sem three. Só o carregamento da textura usa canvas (navegador).
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import topo from 'world-atlas/countries-110m.json';

export type Anel = number[][];
export type Pais = Feature<Polygon | MultiPolygon, { name: string }>;

const PT: Record<string, string> = {
  Russia: 'Rússia', Canada: 'Canadá', 'United States of America': 'Estados Unidos', China: 'China', Brazil: 'Brasil',
  Australia: 'Austrália', India: 'Índia', Argentina: 'Argentina', Kazakhstan: 'Cazaquistão', Algeria: 'Argélia',
  'Dem. Rep. Congo': 'RD Congo', Greenland: 'Groenlândia', 'Saudi Arabia': 'Arábia Saudita', Mexico: 'México',
  Indonesia: 'Indonésia', Sudan: 'Sudão', Libya: 'Líbia', Iran: 'Irã', Mongolia: 'Mongólia', Peru: 'Peru',
  Chad: 'Chade', Niger: 'Níger', Angola: 'Angola', Mali: 'Mali', 'South Africa': 'África do Sul', Colombia: 'Colômbia',
  Ethiopia: 'Etiópia', Bolivia: 'Bolívia', Mauritania: 'Mauritânia', Egypt: 'Egito', Tanzania: 'Tanzânia',
  Nigeria: 'Nigéria', Venezuela: 'Venezuela', Pakistan: 'Paquistão', Namibia: 'Namíbia', Mozambique: 'Moçambique',
  Turkey: 'Turquia', Chile: 'Chile', Zambia: 'Zâmbia', Myanmar: 'Mianmar', Afghanistan: 'Afeganistão', Somalia: 'Somália',
  'Central African Rep.': 'Rep. Centro-Africana', Ukraine: 'Ucrânia', Madagascar: 'Madagascar', Botswana: 'Botsuana',
  Kenya: 'Quênia', France: 'França', Yemen: 'Iêmen', Thailand: 'Tailândia', Spain: 'Espanha', Turkmenistan: 'Turcomenistão',
  Cameroon: 'Camarões', 'Papua New Guinea': 'Papua-Nova Guiné', Sweden: 'Suécia', Uzbekistan: 'Uzbequistão', Morocco: 'Marrocos',
  Iraq: 'Iraque', Paraguay: 'Paraguai', Zimbabwe: 'Zimbábue', Japan: 'Japão', Germany: 'Alemanha', Congo: 'Congo',
  Finland: 'Finlândia', Vietnam: 'Vietnã', Malaysia: 'Malásia', Norway: 'Noruega', "Côte d'Ivoire": 'Costa do Marfim',
  Poland: 'Polônia', Oman: 'Omã', Italy: 'Itália', Philippines: 'Filipinas', Ecuador: 'Equador', 'New Zealand': 'Nova Zelândia',
  Gabon: 'Gabão', Guinea: 'Guiné', 'United Kingdom': 'Reino Unido', Uganda: 'Uganda', Ghana: 'Gana', Romania: 'Romênia',
  Laos: 'Laos', Guyana: 'Guiana', Belarus: 'Belarus', Kyrgyzstan: 'Quirguistão', Senegal: 'Senegal', Syria: 'Síria',
  Cambodia: 'Camboja', Uruguay: 'Uruguai', Tunisia: 'Tunísia', Suriname: 'Suriname', Nepal: 'Nepal', Bangladesh: 'Bangladesh',
  Tajikistan: 'Tajiquistão', Greece: 'Grécia', Nicaragua: 'Nicarágua', 'North Korea': 'Coreia do Norte', Malawi: 'Maláui',
  Eritrea: 'Eritreia', Benin: 'Benin', Honduras: 'Honduras', Liberia: 'Libéria', Bulgaria: 'Bulgária', Cuba: 'Cuba',
  Guatemala: 'Guatemala', Iceland: 'Islândia', 'South Korea': 'Coreia do Sul', Hungary: 'Hungria', Portugal: 'Portugal',
  Jordan: 'Jordânia', Serbia: 'Sérvia', Azerbaijan: 'Azerbaijão', Austria: 'Áustria', 'United Arab Emirates': 'Emirados Árabes',
  'Czech Rep.': 'Tchéquia', Panama: 'Panamá', 'Sierra Leone': 'Serra Leoa', Ireland: 'Irlanda', Georgia: 'Geórgia',
  'Sri Lanka': 'Sri Lanka', Lithuania: 'Lituânia', Latvia: 'Letônia', Togo: 'Togo', Croatia: 'Croácia', 'Costa Rica': 'Costa Rica',
  Slovakia: 'Eslováquia', 'Dominican Rep.': 'Rep. Dominicana', Estonia: 'Estônia', Denmark: 'Dinamarca', Netherlands: 'Países Baixos',
  Switzerland: 'Suíça', Bhutan: 'Butão', Taiwan: 'Taiwan', Belgium: 'Bélgica', Lesotho: 'Lesoto', Armenia: 'Armênia',
  Albania: 'Albânia', Israel: 'Israel', Lebanon: 'Líbano', Kuwait: 'Kuwait', Qatar: 'Catar', Haiti: 'Haiti', Jamaica: 'Jamaica',
  Moldova: 'Moldávia', 'S. Sudan': 'Sudão do Sul', Burkina: 'Burkina Faso', 'Burkina Faso': 'Burkina Faso', Rwanda: 'Ruanda',
  Slovenia: 'Eslovênia', 'Bosnia and Herz.': 'Bósnia', Macedonia: 'Macedônia do Norte', Montenegro: 'Montenegro',
  Cyprus: 'Chipre', Luxembourg: 'Luxemburgo', Burundi: 'Burundi', Djibouti: 'Djibuti', Gambia: 'Gâmbia', Swaziland: 'Eswatini',
  'Eq. Guinea': 'Guiné Equatorial', 'Guinea-Bissau': 'Guiné-Bissau', Belize: 'Belize', Fiji: 'Fiji', Bahamas: 'Bahamas',
  Singapore: 'Singapura', Brunei: 'Brunei', 'Timor-Leste': 'Timor-Leste', Kosovo: 'Kosovo', 'W. Sahara': 'Saara Ocidental',
  'Falkland Is.': 'Malvinas', 'N. Cyprus': 'Chipre do Norte', Somaliland: 'Somalilândia', 'Solomon Is.': 'Ilhas Salomão', Vanuatu: 'Vanuatu',
  'New Caledonia': 'Nova Caledônia', 'Puerto Rico': 'Porto Rico', Trinidad: 'Trinidad', Palestine: 'Palestina', Bahrain: 'Bahrein',
};

let cache: Pais[] | undefined;
export function paises(): Pais[] {
  cache ??= (feature(topo as never, (topo as never as { objects: { countries: never } }).objects.countries) as unknown as { features: Pais[] }).features;
  return cache;
}

export const aneisDe = (p: Pais): Anel[][] => (p.geometry.type === 'Polygon' ? [p.geometry.coordinates as Anel[]] : (p.geometry.coordinates as Anel[][]));

export function areaAnel(r: Anel): number {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return a / 2;
}

export function centroideAnel(r: Anel): [number, number] {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    cx += (r[i][0] + r[i + 1][0]) * f;
    cy += (r[i][1] + r[i + 1][1]) * f;
    a += f;
  }
  return a === 0 ? [r[0][0], r[0][1]] : [cx / (3 * a), cy / (3 * a)];
}

export interface RotuloPais {
  nome: string;
  lat: number;
  lon: number;
  /** Área aproximada (graus²): maior = rótulo mais importante. */
  peso: number;
}

/** Rótulos dos `max` maiores países, com o centro do maior território (ilhas e exclaves não puxam o rótulo). */
export function rotulosPaises(max = 46): RotuloPais[] {
  const lista: RotuloPais[] = [];
  for (const p of paises()) {
    let melhor: Anel | null = null;
    let area = 0;
    for (const poligono of aneisDe(p)) {
      const a = Math.abs(areaAnel(desembrulhar(poligono[0])));
      if (a > area) ((area = a), (melhor = poligono[0]));
    }
    if (!melhor) continue;
    const [lonBruta, lat] = centroideAnel(desembrulhar(melhor));
    const lon = lonBruta > 180 ? lonBruta - 360 : lonBruta;
    lista.push({ nome: PT[p.properties.name] ?? p.properties.name, lat, lon, peso: area });
  }
  return lista.sort((a, b) => b.peso - a.peso).slice(0, max);
}

/**
 * Traça um anel no canvas quebrando o caminho quando a longitude "salta" mais de 180° entre dois pontos
 * (anéis de Rússia, Fiji e Antártida vêm cortados na linha de data): sem isso aparece uma linha através do mapa inteiro.
 */
export function trazerAnel(ctx: CanvasRenderingContext2D, anel: Anel, X: (lon: number) => number, Y: (lat: number) => number) {
  let anterior = NaN;
  for (const [lon, lat] of anel) {
    if (Number.isNaN(anterior) || Math.abs(lon - anterior) > 180) ctx.moveTo(X(lon), Y(lat));
    else ctx.lineTo(X(lon), Y(lat));
    anterior = lon;
  }
  ctx.closePath();
}

/** Anel cortado na linha de data (vai de ≈ -180 a ≈ 180): desloca as longitudes negativas em +360 para ficar contínuo. */
export function desembrulhar(anel: Anel): Anel {
  let min = Infinity;
  let max = -Infinity;
  for (const [lon] of anel) ((min = Math.min(min, lon)), (max = Math.max(max, lon)));
  return min < -170 && max > 170 ? anel.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]) : anel;
}

/** Desenha o mapa-múndi em `ctx` (equirretangular: x = lon, y = lat). Separado da textura para ser testável. */
export function desenharMapa(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const X = (lon: number) => ((lon + 180) / 360) * W;
  const Y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.fillStyle = '#04101c';
  ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  const tracar = (p: Pais) => {
    ctx.beginPath();
    for (const poligono of aneisDe(p)) for (const anel of poligono) trazerAnel(ctx, anel, X, Y);
  };
  for (const p of paises()) {
    tracar(p);
    ctx.fillStyle = '#0d3a52';
    ctx.fill('evenodd');
  }
  // fronteiras: um traço largo e suave (brilho) e um fino e nítido por cima
  for (const [largura, cor] of [
    [W / 700, 'rgba(34, 211, 238, 0.16)'],
    [W / 2600, 'rgba(120, 232, 255, 0.85)'],
  ] as const) {
    ctx.lineWidth = largura;
    ctx.strokeStyle = cor;
    for (const p of paises()) {
      tracar(p);
      ctx.stroke();
    }
  }
}

/** Textura do globo (3072×1536: nítida de perto, ainda cabe em qualquer GPU). */
export function criarCanvasMapa(W = 3072, H = 1536): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  desenharMapa(c.getContext('2d')!, W, H);
  return c;
}
