// Instala skills anim3d-* em uma pasta de skills (padrão: ~/.claude/skills), resolvendo as dependências do skill.meta.json.
// Sem rede, sem executar código das skills. Nunca sobrescreve sem --force.
//
// Uso:  node scripts/instalar.mjs <skill...>|--todas [--destino <pasta>] [--dry-run] [--force] [--sem-exemplos]
//       node scripts/instalar.mjs anim3d-infra-validacao --dry-run
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const NOME_VALIDO = /^anim3d-[a-z0-9-]+$/;

/** Lê o skill.meta.json de cada skill da pasta fonte. */
export function lerMetas(raiz) {
  const metas = new Map();
  for (const d of readdirSync(raiz)) {
    if (!NOME_VALIDO.test(d) || !existsSync(join(raiz, d, 'SKILL.md'))) continue;
    const p = join(raiz, d, 'skill.meta.json');
    metas.set(d, existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { dependencias: [] });
  }
  return metas;
}

/** Fecho transitivo das dependências. Com exemplos, inclui também `dependenciasExemplo` (o exemplo importa essas skills). */
export function resolver(pedidas, metas, { comExemplos = true } = {}) {
  const ordem = [];
  const visto = new Set();
  const visita = (n) => {
    if (visto.has(n)) return;
    if (!metas.has(n)) throw new Error(`skill desconhecida: ${n}`);
    visto.add(n);
    const m = metas.get(n);
    for (const d of [...(m.dependencias ?? []), ...(comExemplos ? (m.dependenciasExemplo ?? []) : [])]) visita(d);
    ordem.push(n);
  };
  pedidas.forEach(visita);
  return ordem;
}

const ignorar = (rel, comExemplos) => rel.split(sep).includes('node_modules') || (!comExemplos && rel.split(sep)[0] === 'exemplo');

function arquivos(dir, comExemplos, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const nome of readdirSync(dir).sort()) {
    const p = join(dir, nome);
    const rel = relative(base, p);
    if (ignorar(rel, comExemplos)) continue;
    if (statSync(p).isDirectory()) arquivos(p, comExemplos, base, out);
    else out.push(rel.split(sep).join('/'));
  }
  return out;
}

/** Impressão digital do conteúdo (caminhos + bytes), para saber se destino e fonte são iguais. */
export function impressao(dir, comExemplos = true) {
  const h = createHash('sha256');
  for (const rel of arquivos(dir, comExemplos)) h.update(rel).update(readFileSync(join(dir, ...rel.split('/'))));
  return h.digest('hex');
}

/** Decide o que fazer com cada skill: novo, igual, difere (só sobrescreve com --force). */
export function planejar(raiz, destino, lista, { comExemplos = true, force = false } = {}) {
  return lista.map((nome) => {
    const alvo = join(destino, nome);
    if (!existsSync(alvo)) return { nome, estado: 'novo', copiar: true };
    const igual = impressao(join(raiz, nome), comExemplos) === impressao(alvo, comExemplos);
    if (igual) return { nome, estado: 'igual', copiar: false };
    return { nome, estado: 'difere', copiar: force };
  });
}

export function aplicar(raiz, destino, plano, { comExemplos = true } = {}) {
  mkdirSync(destino, { recursive: true });
  for (const p of plano) {
    if (!p.copiar) continue;
    const alvo = join(destino, p.nome);
    rmSync(alvo, { recursive: true, force: true });
    cpSync(join(raiz, p.nome), alvo, { recursive: true, filter: (src) => !ignorar(relative(join(raiz, p.nome), src), comExemplos) });
  }
}

function principal(argv) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const flags = new Set(argv.filter((a) => a.startsWith('--') && a !== '--destino'));
  const i = argv.indexOf('--destino');
  const destino = resolve(i >= 0 ? argv[i + 1] : join(homedir(), '.claude', 'skills'));
  const posValorDestino = i >= 0 ? i + 1 : -1;
  const nomes = argv.filter((a, k) => !a.startsWith('--') && k !== posValorDestino);
  const metas = lerMetas(raiz);
  if (destino === raiz || destino.startsWith(raiz + sep)) throw new Error('o destino não pode ficar dentro da pasta fonte');
  for (const n of nomes) if (!NOME_VALIDO.test(n)) throw new Error(`nome de skill inválido: ${n}`);
  const pedidas = flags.has('--todas') ? [...metas.keys()] : nomes;
  if (!pedidas.length) throw new Error('informe uma ou mais skills, ou --todas');
  const comExemplos = !flags.has('--sem-exemplos');
  const lista = resolver(pedidas, metas, { comExemplos });
  const plano = planejar(raiz, destino, lista, { comExemplos, force: flags.has('--force') });
  const extras = lista.filter((n) => !pedidas.includes(n));
  console.log(`Destino: ${destino}${flags.has('--dry-run') ? '  (simulação: nada será gravado)' : ''}`);
  if (extras.length) console.log(`Dependências incluídas: ${extras.join(', ')}`);
  for (const p of plano) {
    const acao = p.estado === 'novo' ? 'instalar' : p.estado === 'igual' ? 'já atualizada' : p.copiar ? 'sobrescrever (--force)' : 'DIFERE: pulada (use --force para sobrescrever)';
    console.log(`  ${p.nome.padEnd(28)} ${acao}`);
  }
  if (!flags.has('--dry-run')) aplicar(raiz, destino, plano, { comExemplos });
  const puladas = plano.filter((p) => p.estado === 'difere' && !p.copiar).length;
  if (puladas) { console.log(`\n${puladas} skill(s) diferem da fonte e não foram tocadas.`); process.exitCode = 2; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { principal(process.argv.slice(2)); } catch (e) { console.error(`erro: ${e.message}`); process.exitCode = 1; }
}
