// Testes do instalador (node --test scripts). Usam pastas temporárias; nada toca ~/.claude.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aplicar, impressao, lerMetas, planejar, resolver } from './instalar.mjs';

function fonteFalsa() {
  const raiz = mkdtempSync(join(tmpdir(), 'anim3d-fonte-'));
  const skill = (nome, meta, arquivos = {}) => {
    mkdirSync(join(raiz, nome, 'exemplo'), { recursive: true });
    writeFileSync(join(raiz, nome, 'SKILL.md'), `---\nname: ${nome}\n---\n`);
    writeFileSync(join(raiz, nome, 'skill.meta.json'), JSON.stringify(meta));
    for (const [rel, txt] of Object.entries({ 'exemplo/a.ts': 'x', ...arquivos })) writeFileSync(join(raiz, nome, rel), txt);
  };
  skill('anim3d-base', { dependencias: [] });
  skill('anim3d-meio', { dependencias: ['anim3d-base'] });
  skill('anim3d-topo', { dependencias: ['anim3d-meio'], dependenciasExemplo: ['anim3d-extra'] });
  skill('anim3d-extra', { dependencias: [] });
  return raiz;
}

test('resolve dependências transitivas na ordem de instalação', () => {
  const raiz = fonteFalsa();
  const metas = lerMetas(raiz);
  assert.deepEqual(resolver(['anim3d-topo'], metas, { comExemplos: false }), ['anim3d-base', 'anim3d-meio', 'anim3d-topo']);
  rmSync(raiz, { recursive: true });
});

test('com exemplos inclui as dependências só do exemplo; sem exemplos não', () => {
  const raiz = fonteFalsa();
  const metas = lerMetas(raiz);
  assert.ok(resolver(['anim3d-topo'], metas, { comExemplos: true }).includes('anim3d-extra'));
  assert.ok(!resolver(['anim3d-topo'], metas, { comExemplos: false }).includes('anim3d-extra'));
  rmSync(raiz, { recursive: true });
});

test('skill desconhecida é erro, não instalação parcial', () => {
  const raiz = fonteFalsa();
  assert.throws(() => resolver(['anim3d-nao-existe'], lerMetas(raiz)), /desconhecida/);
  rmSync(raiz, { recursive: true });
});

test('nunca sobrescreve uma cópia diferente sem --force', () => {
  const raiz = fonteFalsa();
  const destino = mkdtempSync(join(tmpdir(), 'anim3d-dest-'));
  const lista = ['anim3d-base'];
  aplicar(raiz, destino, planejar(raiz, destino, lista));
  writeFileSync(join(destino, 'anim3d-base', 'exemplo', 'a.ts'), 'editado pelo usuário');
  const plano = planejar(raiz, destino, lista);
  assert.equal(plano[0].estado, 'difere');
  aplicar(raiz, destino, plano);
  assert.equal(readFileSync(join(destino, 'anim3d-base', 'exemplo', 'a.ts'), 'utf8'), 'editado pelo usuário');
  aplicar(raiz, destino, planejar(raiz, destino, lista, { force: true }));
  assert.equal(readFileSync(join(destino, 'anim3d-base', 'exemplo', 'a.ts'), 'utf8'), 'x');
  rmSync(raiz, { recursive: true });
  rmSync(destino, { recursive: true });
});

test('cópia idêntica é reconhecida e não é recopiada', () => {
  const raiz = fonteFalsa();
  const destino = mkdtempSync(join(tmpdir(), 'anim3d-dest-'));
  aplicar(raiz, destino, planejar(raiz, destino, ['anim3d-base']));
  assert.equal(planejar(raiz, destino, ['anim3d-base'])[0].estado, 'igual');
  rmSync(raiz, { recursive: true });
  rmSync(destino, { recursive: true });
});

test('naoInstalar: arquivo listado no meta nunca é copiado e não gera "difere" eterno', () => {
  const raiz = fonteFalsa();
  writeFileSync(join(raiz, 'anim3d-base', 'skill.meta.json'), JSON.stringify({ dependencias: [], naoInstalar: ['exemplo/derivado.json'] }));
  writeFileSync(join(raiz, 'anim3d-base', 'exemplo', 'derivado.json'), '{"licenca":"copyleft"}');
  const destino = mkdtempSync(join(tmpdir(), 'anim3d-dest-'));
  aplicar(raiz, destino, planejar(raiz, destino, ['anim3d-base']));
  assert.ok(existsSync(join(destino, 'anim3d-base', 'exemplo', 'a.ts')));
  assert.ok(!existsSync(join(destino, 'anim3d-base', 'exemplo', 'derivado.json')));
  assert.equal(planejar(raiz, destino, ['anim3d-base'])[0].estado, 'igual');
  rmSync(raiz, { recursive: true });
  rmSync(destino, { recursive: true });
});

test('--sem-exemplos não copia a pasta exemplo e a comparação a ignora', () => {
  const raiz = fonteFalsa();
  const destino = mkdtempSync(join(tmpdir(), 'anim3d-dest-'));
  aplicar(raiz, destino, planejar(raiz, destino, ['anim3d-base'], { comExemplos: false }), { comExemplos: false });
  assert.ok(existsSync(join(destino, 'anim3d-base', 'SKILL.md')));
  assert.ok(!existsSync(join(destino, 'anim3d-base', 'exemplo')));
  assert.equal(impressao(join(raiz, 'anim3d-base'), false), impressao(join(destino, 'anim3d-base'), false));
  rmSync(raiz, { recursive: true });
  rmSync(destino, { recursive: true });
});
