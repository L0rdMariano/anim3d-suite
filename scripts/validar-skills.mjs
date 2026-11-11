// Valida o padrão das skills (docs/PADRAO-DE-SKILL.md). Sem dependências. Uso: node scripts/validar-skills.mjs
// Erros (saída 1): defeitos objetivos. Avisos: itens que skills antigas ainda não têm; skills NOVAS (fora de LEGADO) os têm como erro.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Skills que existiam antes do padrão: faltas de `skill.meta.json` são aviso, não erro. */
const LEGADO = new Set(['anim3d-roteador', 'anim3d-fundamentos', 'anim3d-saas', 'anim3d-dashboard', 'anim3d-mobile', 'anim3d-app-ui', 'anim3d-performance-a11y', 'anim3d-assets', 'anim3d-mapas', 'anim3d-topologia']);
const MAX_LINHAS = 150;
const MARCAS = /\b(aws|amazon web services|azure|google cloud|microsoft|equinix|oracle cloud|alibaba)\b/i;

const erros = [];
const avisos = [];
const erro = (skill, msg) => erros.push(`${skill}: ${msg}`);
const aviso = (skill, msg) => avisos.push(`${skill}: ${msg}`);

function frontmatter(texto) {
  const m = texto.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const campos = {};
  for (const linha of m[1].split('\n')) {
    const k = linha.match(/^([\w-]+):\s*(.*)$/);
    if (k) campos[k[1]] = k[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return campos;
}

const skills = readdirSync(raiz)
  .filter((d) => d.startsWith('anim3d-') && statSync(join(raiz, d)).isDirectory() && existsSync(join(raiz, d, 'SKILL.md')))
  .sort();

for (const nome of skills) {
  const dir = join(raiz, nome);
  const texto = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const linhas = texto.replace(/\r\n/g, '\n').split('\n').length;
  const fm = frontmatter(texto);
  const legado = LEGADO.has(nome);

  if (!fm) {
    erro(nome, 'sem frontmatter (--- name/description ---)');
    continue;
  }
  if (fm.name !== nome) erro(nome, `frontmatter name "${fm.name}" difere do nome da pasta`);
  if (!fm.description || fm.description.length < 80) erro(nome, 'description curta demais (diga o que faz e quando usar, ≥ 80 caracteres)');
  else if (!/\bUse\b|\buse\b/.test(fm.description)) erro(nome, 'description não diz QUANDO usar (falta "Use ao/antes/sempre que ...")');
  if (linhas > MAX_LINHAS) (legado ? aviso : erro)(nome, `SKILL.md tem ${linhas} linhas (limite ${MAX_LINHAS}): mova o detalhe para references/`);

  // caminhos citados em `crase` que começam por exemplo/, references/, scripts/, assets/, motor/ ou testes/ precisam existir
  for (const m of texto.matchAll(/`((?:exemplo|references|scripts|assets|motor|testes)\/[^\s`*]+)`/g)) {
    const alvo = m[1].replace(/[.,;:)]+$/, '');
    if (/[<>{}|]|\.\.\.$/.test(alvo)) continue;
    // aceita componente citado sem extensão (exemplo/Ecossistema3D → .tsx/.ts)
    const existe = ['', '.tsx', '.ts', '.css', '.md', '.json', '.mjs'].some((ext) => existsSync(join(dir, alvo + ext)));
    if (!existe) erro(nome, `cita \`${alvo}\` mas o caminho não existe`);
  }
  // links markdown relativos
  for (const m of texto.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
    const alvo = m[1].split('#')[0];
    if (alvo && !existsSync(resolve(dir, alvo))) erro(nome, `link quebrado: ${m[1]}`);
  }
  if (MARCAS.test(texto)) aviso(nome, 'cita nome de empresa/produto de nuvem: conteúdo deve ser genérico (confira se é só referência)');

  const meta = join(dir, 'skill.meta.json');
  if (!existsSync(meta)) (legado ? aviso : erro)(nome, 'sem skill.meta.json (versão, licenças, dependências)');
  else {
    try {
      const j = JSON.parse(readFileSync(meta, 'utf8'));
      for (const c of ['versao', 'licencas', 'dependencias', 'compatibilidade']) if (!(c in j)) erro(nome, `skill.meta.json sem o campo "${c}"`);
    } catch {
      erro(nome, 'skill.meta.json não é JSON válido');
    }
  }
}

console.log(`Skills verificadas: ${skills.length}`);
for (const a of avisos) console.log(`  aviso  ${a}`);
for (const e of erros) console.log(`  ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} erro(s).` : '\nPadrão de skills: OK.');
process.exit(erros.length ? 1 : 0);
