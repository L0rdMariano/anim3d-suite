// Valida o padrão das skills (docs/PADRAO-DE-SKILL.md). Sem dependências. Uso: node scripts/validar-skills.mjs
// Erros (saída 1): defeitos objetivos. Avisos: itens conhecidos que ainda não foram resolvidos.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Skills anteriores ao padrão cujas faltas viram aviso. Vazio desde 2026-11-11 (todas têm skill.meta.json). */
const LEGADO = new Set([]);
const MAX_LINHAS = 150;
const MARCAS = /\b(aws|amazon web services|azure|google cloud|microsoft|equinix|oracle cloud|alibaba)\b/i;
const KIT = 'anim3d-fundamentos';

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

/** Arquivos de código da skill (sem node_modules e sem dados gerados). */
function codigo(dir) {
  const out = [];
  const visita = (d) => {
    for (const nome of readdirSync(d)) {
      if (nome === 'node_modules' || nome === 'dados') continue;
      const p = join(d, nome);
      if (statSync(p).isDirectory()) visita(p);
      else if (/\.(ts|tsx|mjs)$/.test(nome)) out.push(p);
    }
  };
  visita(dir);
  return out;
}

/** Skills que o código de `arquivo` importa (outras pastas anim3d-* ou o alias do kit). */
function importados(arquivo, dono) {
  const txt = readFileSync(arquivo, 'utf8');
  const achados = new Set();
  for (const m of txt.matchAll(/from\s+'((?:\.\.\/)+)(anim3d-[a-z0-9-]+)\//g)) if (m[2] !== dono) achados.add(m[2]);
  if (dono !== KIT && /from\s+'@anim3d\/kit(\/[\w-]+)?'/.test(txt)) achados.add(KIT);
  return achados;
}

const skills = readdirSync(raiz)
  .filter((d) => d.startsWith('anim3d-') && statSync(join(raiz, d)).isDirectory() && existsSync(join(raiz, d, 'SKILL.md')))
  .sort();
const metas = new Map();

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
      if (j.nome && j.nome !== nome) erro(nome, `skill.meta.json "nome" (${j.nome}) difere da pasta`);
      metas.set(nome, j);
    } catch {
      erro(nome, 'skill.meta.json não é JSON válido');
    }
  }
}

// --- dependências entre skills: declaradas, existentes, sem ciclo, e iguais ao que o código realmente importa
for (const nome of skills) {
  const j = metas.get(nome);
  if (!j) continue;
  const exec = j.dependencias ?? [];
  const exemplo = j.dependenciasExemplo ?? [];
  for (const d of [...exec, ...exemplo]) if (!skills.includes(d)) erro(nome, `dependência "${d}" não existe`);
  if (exec.includes(nome) || exemplo.includes(nome)) erro(nome, 'depende de si mesma');

  for (const arq of codigo(join(raiz, nome))) {
    const rel = relative(join(raiz, nome), arq).replace(/\\/g, '/');
    const emExemplo = rel.startsWith('exemplo/');
    const permitido = new Set(emExemplo ? [...exec, ...exemplo] : exec);
    for (const usado of importados(arq, nome)) {
      if (!permitido.has(usado)) erro(nome, `${rel} importa ${usado}, que não está em "${emExemplo ? 'dependencias/dependenciasExemplo' : 'dependencias'}" do skill.meta.json`);
    }
  }
}
// ciclos só nas dependências de execução (dependenciasExemplo pode apontar "para cima" sem formar ciclo de instalação mínima)
const estado = new Map();
const visita = (n, caminho) => {
  if (estado.get(n) === 2) return;
  if (estado.get(n) === 1) { erro(n, `ciclo de dependências: ${[...caminho, n].join(' → ')}`); return; }
  estado.set(n, 1);
  for (const d of metas.get(n)?.dependencias ?? []) if (metas.has(d)) visita(d, [...caminho, n]);
  estado.set(n, 2);
};
for (const n of metas.keys()) visita(n, []);

// --- cores hex soltas (regra: tokens). Ignora preto/branco e a linha do mapa de valores padrão do useTokens (PADRAO)
for (const nome of skills) {
  let total = 0;
  for (const arq of codigo(join(raiz, nome))) {
    if (/\.test\./.test(arq) || !/\.tsx?$/.test(arq)) continue;
    for (const linha of readFileSync(arq, 'utf8').split('\n')) {
      if (/PADRAO|anim3d-hex-ok/.test(linha)) continue;
      total += [...linha.matchAll(/#[0-9a-fA-F]{6}\b/g)].filter((m) => !/^#(000000|ffffff)$/i.test(m[0])).length;
    }
  }
  if (total) aviso(nome, `${total} cor(es) hex soltas no código (regra: tokens via useTokens; valores padrão do useTokens ficam numa linha com PADRAO)`);
}

console.log(`Skills verificadas: ${skills.length}`);
for (const a of avisos) console.log(`  aviso  ${a}`);
for (const e of erros) console.log(`  ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} erro(s).` : '\nPadrão de skills: OK.');
process.exit(erros.length ? 1 : 0);
