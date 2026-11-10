#!/usr/bin/env node
// Verifica uma página com cena 3D num Chrome/Edge real (headless, via DevTools Protocol). Sem dependências: Node ≥ 22.
//
// uso:  node verificar-navegador.mjs <url> [--larguras 1856,1440,768,390] [--altura 900] [--rolar 0]
//                                     [--reduzido] [--saida ./capturas] [--espera 2500]
//
// Para cada largura: captura PNG e imprime JSON com WebGL, modo de cada [data-modo] (Cena3DSegura),
// nº de canvases, rolagem horizontal, altura do documento, caixas principais e erros/avisos do console.
// --reduzido emula prefers-reduced-motion: reduce. SEM a flag, emula no-preference — importante:
// Windows Server e VMs costumam vir com animações do sistema desligadas e o Chrome mostra só o fallback.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const opt = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
if (!url) {
  console.error('uso: node verificar-navegador.mjs <url> [--larguras 1856,1440,768,390] [--reduzido]');
  process.exit(2);
}
const larguras = opt('larguras', '1856,1440,768,390').split(',').map(Number);
const altura = Number(opt('altura', '900'));
const rolar = Number(opt('rolar', '0'));
const espera = Number(opt('espera', '2500'));
const saida = opt('saida', './capturas');
const reduzido = args.includes('--reduzido');
mkdirSync(saida, { recursive: true });

const candidatos = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = candidatos.find((c) => existsSync(c));
if (!chrome) {
  console.error('Chrome/Edge não encontrado. Defina a variável CHROME com o caminho do executável.');
  process.exit(2);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function verificar(largura) {
  const perfil = mkdtempSync(join(tmpdir(), 'anim3d-'));
  const porta = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    `--window-size=${largura},${altura}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let alvo;
    for (let i = 0; i < 60 && !alvo; i++) {
      await dormir(200);
      try {
        alvo = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find((t) => t.type === 'page');
      } catch {}
    }
    if (!alvo) throw new Error('não conectou ao Chrome');
    const ws = new WebSocket(alvo.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pendentes = new Map();
    const console_ = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
      if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
        console_.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (m.method === 'Runtime.exceptionThrown')
        console_.push(`exceção: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    });
    const cmd = (method, params = {}) =>
      new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const avaliar = async (expr) =>
      (await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

    await cmd('Runtime.enable');
    await cmd('Page.enable');
    await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 600 });
    await cmd('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }],
    });
    await cmd('Page.navigate', { url });
    await dormir(espera);
    if (rolar) { await avaliar(`window.scrollTo(0, ${rolar})`); await dormir(espera); }

    const info = await avaliar(`(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const caixa = (e) => { const r = e.getBoundingClientRect(); return { el: e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''), y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }; };
      return {
        webgl: !!gl,
        modos: [...document.querySelectorAll('[data-modo]')].map((e) => e.dataset.modo),
        canvases: document.querySelectorAll('canvas').length,
        rolagemHorizontal: document.documentElement.scrollWidth > innerWidth,
        alturaDoc: document.documentElement.scrollHeight,
        caixas: [...document.querySelectorAll('[data-modo], canvas, table')].map(caixa),
      };
    })()`);
    const png = join(saida, `tela-${largura}${reduzido ? '-reduzido' : ''}.png`);
    const shot = await cmd('Page.captureScreenshot', { format: 'png' });
    writeFileSync(png, Buffer.from(shot.result.data, 'base64'));
    ws.close();
    return { largura, captura: png, ...info, console: console_ };
  } finally {
    proc.kill();
  }
}

const resultados = [];
for (const l of larguras) resultados.push(await verificar(l));
console.log(JSON.stringify(resultados, null, 1));

const problemas = resultados.flatMap((r) => [
  ...(r.rolagemHorizontal ? [`${r.largura}px: rolagem horizontal`] : []),
  ...r.console.filter((c) => c.startsWith('error') || c.startsWith('exceção')).map((c) => `${r.largura}px: ${c}`),
  ...r.caixas.filter((c) => c.el === 'table' && c.h > 50 && c.w < 5).map(() => `${r.largura}px: tabela sr-only esticando a página (envolva num div.sr-only)`),
]);
if (problemas.length) {
  console.error('\nPROBLEMAS:\n- ' + problemas.join('\n- '));
  process.exit(1);
}
console.error(`\nOK em ${larguras.join(', ')}px${reduzido ? ' (movimento reduzido)' : ''}. Revise as capturas em ${saida}.`);
