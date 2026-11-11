// Gera os snapshots de dados do Centro de Comando. Rode quando quiser atualizar (precisa de internet):
//   node anim3d-mapas/exemplo/dados/gerar-dados.mjs               (tudo; precisa de internet)
//   node anim3d-mapas/exemplo/dados/gerar-dados.mjs --so-paises --offline   (só países, sem rede e sem população)
// ATENÇÃO: paises.json é derivado do pacote world-countries (licença ODbL 1.0) e por isso NÃO é versionado (ver .gitignore e
// THIRD_PARTY_NOTICES.md). Gere-o localmente. ibge-brasil.json (dados abertos do IBGE) continua versionado, com atribuição.
// Fontes: IBGE (API de localidades, malhas e agregados), Banco Mundial (população) e o pacote world-countries.
// O exemplo usa só os JSON gerados, então funciona offline.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const aqui = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const offline = args.has('--offline');
const soPaises = args.has('--so-paises');
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const arred = (n) => Math.round(n * 1000) / 1000;

// ---------- países ----------
const paises = require('world-countries');
let pop = new Map();
if (!offline) {
  try {
    const wb = await get('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&mrnev=1');
    pop = new Map(wb[1].filter((x) => x.value).map((x) => [x.countryiso3code, { p: x.value, ano: Number(x.date) }]));
  } catch (e) {
    console.warn(`Aviso: população do Banco Mundial indisponível (${e.message}); seguindo sem população.`);
  }
}
const saidaPaises = {};
for (const c of paises) {
  if (!c.ccn3) continue;
  const p = pop.get(c.cca3);
  saidaPaises[c.ccn3] = {
    g: c.cca3,
    n: c.translations?.por?.common ?? c.name.common,
    o: c.translations?.por?.official ?? c.name.official,
    c: c.capital?.[0] ?? null,
    a: c.area ?? null,
    r: c.region,
    s: c.subregion || null,
    i: Object.keys(c.languages ?? {}),
    m: Object.keys(c.currencies ?? {}),
    b: c.borders ?? [],
    p: p?.p ?? null,
    pa: p?.ano ?? null,
    t: c.tld?.[0] ?? null,
    d: c.idd?.root ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '') : null,
    u: c.unMember,
  };
}
writeFileSync(join(aqui, 'paises.json'), JSON.stringify({ fonte: 'world-countries + Banco Mundial (SP.POP.TOTL)', gerado: new Date().toISOString().slice(0, 10), paises: saidaPaises }));
console.log('países:', Object.keys(saidaPaises).length, pop.size ? `(população de ${pop.size})` : '(sem população)');
if (soPaises || offline) process.exit(0); // o Brasil/IBGE exige rede e é opcional aqui

// ---------- Brasil (IBGE) ----------
const CAPITAIS = {
  RO: 'Porto Velho', AC: 'Rio Branco', AM: 'Manaus', RR: 'Boa Vista', PA: 'Belém', AP: 'Macapá', TO: 'Palmas',
  MA: 'São Luís', PI: 'Teresina', CE: 'Fortaleza', RN: 'Natal', PB: 'João Pessoa', PE: 'Recife', AL: 'Maceió', SE: 'Aracaju', BA: 'Salvador',
  MG: 'Belo Horizonte', ES: 'Vitória', RJ: 'Rio de Janeiro', SP: 'São Paulo', PR: 'Curitiba', SC: 'Florianópolis', RS: 'Porto Alegre',
  MS: 'Campo Grande', MT: 'Cuiabá', GO: 'Goiânia', DF: 'Brasília',
};
const base = 'https://servicodados.ibge.gov.br/api';
const [ufs, malha, censoPop, censoArea, pib, municipios] = await Promise.all([
  get(`${base}/v1/localidades/estados?orderBy=nome`),
  get(`${base}/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo+json&qualidade=minima`),
  get(`${base}/v3/agregados/4714/periodos/-1/variaveis/93?localidades=N3[all]`),
  get(`${base}/v3/agregados/4714/periodos/-1/variaveis/6318?localidades=N3[all]`),
  get(`${base}/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N3[all]`),
  get(`${base}/v1/localidades/municipios`),
]);
const serie = (agg) => {
  const s = agg[0].resultados[0].series;
  const ano = Object.keys(s[0].serie)[0];
  return { ano, por: new Map(s.map((x) => [x.localidade.id, Number(x.serie[ano])])) };
};
const sPop = serie(censoPop), sArea = serie(censoArea), sPib = serie(pib);
const nMun = new Map();
for (const m of municipios) {
  const id = String(m.microrregiao?.mesorregiao?.UF?.id ?? m['regiao-imediata']?.['regiao-intermediaria']?.UF?.id);
  nMun.set(id, (nMun.get(id) ?? 0) + 1);
}
const geo = new Map(malha.features.map((f) => [f.properties.codarea, f.geometry]));
const q = (geom) => ({
  type: geom.type,
  coordinates: (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates).map((poly) => poly.map((anel) => anel.map(([x, y]) => [arred(x), arred(y)]))),
});
const estados = ufs.map((u) => {
  const id = String(u.id);
  return {
    id,
    sigla: u.sigla,
    nome: u.nome,
    regiao: u.regiao.nome,
    capital: CAPITAIS[u.sigla],
    populacao: sPop.por.get(id),
    areaKm2: sArea.por.get(id),
    pibMilReais: sPib.por.get(id),
    municipios: nMun.get(id) ?? 0,
    poligonos: q(geo.get(id)).coordinates,
  };
});
writeFileSync(
  join(aqui, 'ibge-brasil.json'),
  JSON.stringify({ fonte: 'IBGE: Censo Demográfico (agregado 4714), Contas Regionais (agregado 5938), Malhas e Localidades', anoCenso: sPop.ano, anoPib: sPib.ano, gerado: new Date().toISOString().slice(0, 10), estados }),
);
console.log('estados:', estados.length, 'pop total:', estados.reduce((s, e) => s + e.populacao, 0), 'municípios:', estados.reduce((s, e) => s + e.municipios, 0));
