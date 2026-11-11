// Ficha de país a partir do snapshot gerado por dados/gerar-dados.mjs (world-countries + Banco Mundial).
import snapshot from './dados/paises.json';

export interface InfoPais {
  /** ISO 3166-1 alfa-3 */
  g: string;
  n: string;
  o: string;
  c: string | null;
  a: number | null;
  r: string;
  s: string | null;
  i: string[];
  m: string[];
  b: string[];
  p: number | null;
  pa: number | null;
  t: string | null;
  d: string | null;
  u: boolean;
}

const base = snapshot.paises as unknown as Record<string, InfoPais>;
const porAlfa3 = new Map(Object.entries(base).map(([id, i]) => [i.g, id]));

export const fonteDosPaises = `${snapshot.fonte} · ${snapshot.gerado}`;
export const infoPais = (id: string): InfoPais | undefined => base[id];
/** id numérico do país a partir do código alfa-3 (usado nas fronteiras). */
export const idPorAlfa3 = (g: string): string | undefined => porAlfa3.get(g);

const REGIOES: Record<string, string> = { Africa: 'África', Americas: 'Américas', Asia: 'Ásia', Europe: 'Europa', Oceania: 'Oceania', Antarctic: 'Antártida' };
const SUB: Record<string, string> = {
  'South America': 'América do Sul', 'Northern America': 'América do Norte', 'Central America': 'América Central', Caribbean: 'Caribe',
  'Northern Europe': 'Norte da Europa', 'Western Europe': 'Europa Ocidental', 'Eastern Europe': 'Leste Europeu', 'Southern Europe': 'Sul da Europa',
  'Central Europe': 'Europa Central', 'Southeast Europe': 'Sudeste Europeu', 'Northern Africa': 'Norte da África', 'Western Africa': 'África Ocidental',
  'Eastern Africa': 'África Oriental', 'Middle Africa': 'África Central', 'Southern Africa': 'Sul da África', 'Central Asia': 'Ásia Central',
  'Western Asia': 'Oeste da Ásia', 'Eastern Asia': 'Leste Asiático', 'South-Eastern Asia': 'Sudeste Asiático', 'Southern Asia': 'Sul da Ásia',
  'Australia and New Zealand': 'Austrália e Nova Zelândia', Melanesia: 'Melanésia', Micronesia: 'Micronésia', Polynesia: 'Polinésia',
};
export const regiaoPt = (i: InfoPais) => [REGIOES[i.r] ?? i.r, i.s ? (SUB[i.s] ?? i.s) : null].filter(Boolean).join(' · ');

let idiomas: Intl.DisplayNames | undefined;
let moedas: Intl.DisplayNames | undefined;
const seguro = (f: () => string | undefined, reserva: string) => {
  try {
    return f() ?? reserva;
  } catch {
    return reserva;
  }
};
export const nomeIdioma = (codigo: string) => {
  idiomas ??= new Intl.DisplayNames(['pt-BR'], { type: 'language' });
  const nome = seguro(() => idiomas!.of(codigo), codigo);
  return nome.charAt(0).toUpperCase() + nome.slice(1);
};
export const nomeMoeda = (codigo: string) => {
  moedas ??= new Intl.DisplayNames(['pt-BR'], { type: 'currency' });
  return `${seguro(() => moedas!.of(codigo), codigo)} (${codigo})`;
};

const nf = new Intl.NumberFormat('pt-BR');
const nfCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
export const fmtPessoas = (n: number) => (n >= 1e6 ? nfCompacto.format(n) : nf.format(n));
export const fmtArea = (km2: number) => `${nf.format(Math.round(km2))} km²`;
export const fmtDensidade = (p: number, a: number) => `${nf.format(Math.round((p / a) * 10) / 10)} hab/km²`;
