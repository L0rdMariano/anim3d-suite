// Garante que o snapshot DERIVADO de países exista. Ele não é versionado (a base world-countries é ODbL 1.0):
// se faltar, gera uma versão mínima SEM rede e SEM população. Para a versão completa: npm run dados (usa a internet).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'anim3d-mapas', 'exemplo', 'dados');

if (!existsSync(join(pasta, 'paises.json'))) {
  console.log('[dados] paises.json não existe (não é versionado por licença). Gerando a versão mínima, sem rede...');
  const r = spawnSync(process.execPath, [join(pasta, 'gerar-dados.mjs'), '--so-paises', '--offline'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('[dados] falha ao gerar paises.json. Rode: npm install && node anim3d-mapas/exemplo/dados/gerar-dados.mjs');
    process.exit(r.status ?? 1);
  }
  console.log('[dados] pronto. Para incluir população (Banco Mundial): npm run dados');
}
