import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const suite = fileURLToPath(new URL('..', import.meta.url));
const kit = fileURLToPath(new URL('../anim3d-fundamentos/kit/src/', import.meta.url));

/**
 * Com ANIM3D_FECHAR_SOZINHO=1 (usado pelo iniciar-demo.cmd): quando nenhuma página da demo
 * fica aberta por `folga` segundos, o servidor desliga sozinho. A folga cobre recarregar a
 * página e navegar entre o almoxarifado e a galeria (o socket reconecta em ~1 s).
 */
function fecharSozinho(folga = 15): Plugin {
  return {
    name: 'anim3d-fechar-sozinho',
    apply: 'serve',
    configureServer(server) {
      if (process.env.ANIM3D_FECHAR_SOZINHO !== '1') return;
      let jaTeveVisita = false;
      let vazioDesde = 0;
      const timer = setInterval(() => {
        const abertas = server.ws.clients.size;
        if (abertas > 0) {
          jaTeveVisita = true;
          vazioDesde = 0;
          return;
        }
        if (!jaTeveVisita) return; // ainda esperando o navegador abrir
        vazioDesde ||= Date.now();
        if (Date.now() - vazioDesde >= folga * 1000) {
          clearInterval(timer);
          console.log('\n  Nenhuma página aberta: desligando o servidor da demo.\n');
          void server.close().finally(() => process.exit(0));
        }
      }, 1000);
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), fecharSozinho()],
  resolve: {
    alias: [
      { find: /^@anim3d\/kit$/, replacement: kit + 'index.ts' },
      { find: /^@anim3d\/kit\/(.*)$/, replacement: kit + '$1' },
    ],
  },
  server: { port: Number(process.env.ANIM3D_PORTA ?? 5180), strictPort: true, fs: { allow: [suite] } },
  preview: { port: Number(process.env.ANIM3D_PORTA ?? 5180), strictPort: true },
});
