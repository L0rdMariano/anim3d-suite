// Mede, de forma barata e reprodutível, se cada pedido de evals/roteamento.json casa com a `description` da skill esperada.
// ATENÇÃO: é um PROXY LEXICAL (sobreposição de palavras ponderada), não o modelo real escolhendo skills. Ele acha descrições que
// colidem ou que não trazem as palavras que o usuário diria; não prova que o agente vai acertar. Sem rede, sem dependências.
//
// Uso: node scripts/avaliar-roteamento.mjs [--minimo-top3 0.9] [--verbose]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const iMin = argv.indexOf('--minimo-top3');
const minimo = iMin >= 0 ? Number(argv[iMin + 1]) : null;

const PARADAS = new Set('para com uma uns que por dos das nos nas num aos ele ela mais como mas ser sua seu quero preciso fazer usar uso entre sobre ate sem pelo pela este esta isso esse essa dele quais qual onde estao esta tem'.split(' '));
const sem = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Tokens com radical grosseiro (6 letras) para casar plural e flexões ("cabos"/"cabo", "conexão"/"conexões"). */
const tokens = (t) => sem(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !PARADAS.has(w)).map((w) => w.slice(0, 6));

const skills = readdirSync(raiz)
  .filter((d) => d.startsWith('anim3d-') && d !== 'anim3d-roteador' && existsSync(join(raiz, d, 'SKILL.md')))
  .map((nome) => {
    const txt = readFileSync(join(raiz, nome, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
    const desc = (txt.match(/^description:\s*(.*)$/m)?.[1] ?? '').replace(/^"|"$/g, '');
    const ts = [...tokens(desc), ...tokens(nome.replace(/-/g, ' ')), ...tokens(nome.replace(/-/g, ' '))]; // o nome pesa em dobro
    return { nome, tf: ts.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map()) };
  });
const df = new Map();
for (const s of skills) for (const t of s.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
const idf = (t) => Math.log(1 + skills.length / (df.get(t) ?? 0.5));

function ranking(pedido) {
  const ts = [...new Set(tokens(pedido))];
  return skills
    .map((s) => ({ nome: s.nome, nota: ts.reduce((n, t) => n + (s.tf.has(t) ? idf(t) * (1 + Math.log(s.tf.get(t))) : 0), 0) }))
    .sort((a, b) => b.nota - a.nota);
}

const { casos } = JSON.parse(readFileSync(join(raiz, 'evals', 'roteamento.json'), 'utf8'));
let top1 = 0;
let top3 = 0;
const falhas = [];
const confusao = new Map();
for (const c of casos) {
  const r = ranking(c.pedido);
  const pos = r.findIndex((x) => c.esperado.includes(x.nome));
  if (pos === 0) top1++;
  if (pos >= 0 && pos < 3 && r[pos].nota > 0) top3++;
  if (pos !== 0) {
    falhas.push({ pedido: c.pedido, esperado: c.esperado.join('|'), obtido: `${r[0].nome} (${r[0].nota.toFixed(1)})`, posicao: pos + 1 });
    const k = `${c.esperado[0]} ← ${r[0].nome}`;
    confusao.set(k, (confusao.get(k) ?? 0) + 1);
  } else if (verbose) console.log(`ok   ${c.pedido}`);
}
const n = casos.length;
console.log(`Casos: ${n}   top-1: ${top1}/${n} (${Math.round((top1 / n) * 100)}%)   top-3: ${top3}/${n} (${Math.round((top3 / n) * 100)}%)   [proxy lexical]`);
for (const f of falhas) console.log(`  ✗ "${f.pedido}"\n      esperado ${f.esperado} · 1º foi ${f.obtido} · esperado ficou em #${f.posicao}`);
if (confusao.size) console.log('\nConfusões mais frequentes (esperado ← obtido):\n' + [...confusao].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${v}× ${k}`).join('\n'));
if (minimo !== null && top3 / n < minimo) { console.error(`\ntop-3 abaixo do mínimo ${minimo}`); process.exit(1); }
