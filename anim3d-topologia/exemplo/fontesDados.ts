// Fontes de telemetria plugáveis. Uma fonte só sabe EMITIR dados brutos (`unknown`); quem consome valida com `validarMensagem`.
// Assim trocar simulada → ponte local → Prometheus/Zabbix (via um adaptador seu) não muda a tela.
// Sem React e sem three. As fontes de rede (SSE, WebSocket, polling) usam as APIs do navegador e são injetáveis para teste.
import type { Topologia } from './topologiaSim';

export type EstadoFonte = { fase: 'conectando' | 'ao-vivo' | 'erro' | 'parado'; detalhe?: string };

export interface Fonte {
  id: string;
  rotulo: string;
  /** Começa a emitir. Devolve a função que para tudo (chamada ao desconectar ou trocar de fonte). */
  iniciar(emitir: (bruto: unknown) => void, estado: (e: EstadoFonte) => void): () => void;
}

// ---------- aleatório determinístico ----------
function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- simulada ----------
/**
 * Telemetria plausível para a topologia, como função PURA do tempo `t` (segundos): cada enlace oscila numa fase própria,
 * ganha picos de congestionamento (utilização ~95% por alguns segundos) e perda eventual; latência sobe com a carga.
 */
export function gerarTelemetria(topo: Topologia, t: number, semente = 3): unknown[] {
  const itens: unknown[] = [];
  topo.enlaces.forEach((e, i) => {
    const r = aleatorio(semente * 1000 + i * 97 + Math.floor(t));
    const fase = i * 1.7;
    const cap = e.mbpsMax ?? 100;
    let util = 0.32 + 0.22 * Math.sin(t / 9 + fase) + 0.08 * Math.sin(t / 2.3 + fase * 2) + (r() - 0.5) * 0.06;
    // congestionamento: um enlace por vez, a cada ~40 s, durante ~7 s
    const ciclo = Math.floor(t / 40);
    const alvo = Math.floor(aleatorio(semente + ciclo)() * topo.enlaces.length);
    if (alvo === i && t % 40 < 7) util = 0.92 + r() * 0.07;
    util = Math.min(0.99, Math.max(0.01, util));
    const congestionado = util > 0.85;
    itens.push({
      tipo: 'enlace',
      id: e.id,
      mbps: Math.round(util * cap * 10) / 10,
      ms: Math.round(e.ms * (1 + util * 0.8 + (congestionado ? r() * 2 : 0) + r() * 0.15) * 10) / 10,
      perdaPct: congestionado ? Math.round(r() * 40) / 10 : r() < 0.04 ? 0.5 : 0,
      ativo: e.ativo,
    });
  });
  topo.disps.forEach((d, i) => {
    const r = aleatorio(semente * 7000 + i * 31 + Math.floor(t / 2));
    itens.push({ tipo: 'disp', id: d.id, ligado: d.ligado, ms: Math.round((0.3 + r() * 1.2) * 10) / 10, cpuPct: Math.round(15 + 25 * (0.5 + 0.5 * Math.sin(t / 11 + i)) + r() * 8) });
  });
  return itens;
}

export function fonteSimulada(topo: () => Topologia, semente = 3): Fonte {
  return {
    id: 'simulada',
    rotulo: 'Simulada (demonstração)',
    iniciar(emitir, estado) {
      const t0 = Date.now();
      const passo = () => emitir({ tipo: 'lote', itens: gerarTelemetria(topo(), (Date.now() - t0) / 1000, semente) });
      passo();
      estado({ fase: 'ao-vivo', detalhe: 'gerada no navegador' });
      const i = setInterval(passo, 1000);
      return () => clearInterval(i);
    },
  };
}

// ---------- rede ----------
/** Server-Sent Events: uma linha `data: {json}` por mensagem. É o que a ponte local usa. */
export function fonteSSE(url: string, criar: (u: string) => EventSource = (u) => new EventSource(u)): Fonte {
  return {
    id: 'sse',
    rotulo: `SSE ${url}`,
    iniciar(emitir, estado) {
      estado({ fase: 'conectando' });
      const es = criar(url);
      es.onopen = () => estado({ fase: 'ao-vivo' });
      es.onerror = () => estado({ fase: 'erro', detalhe: 'sem conexão com a fonte (a ponte está rodando?)' });
      es.onmessage = (ev) => {
        try {
          emitir(JSON.parse(ev.data));
        } catch {
          /* linha inválida: ignora, a validação cuida do resto */
        }
      };
      return () => es.close();
    },
  };
}

export function fonteWebSocket(url: string, criar: (u: string) => WebSocket = (u) => new WebSocket(u)): Fonte {
  return {
    id: 'ws',
    rotulo: `WebSocket ${url}`,
    iniciar(emitir, estado) {
      estado({ fase: 'conectando' });
      const ws = criar(url);
      ws.onopen = () => estado({ fase: 'ao-vivo' });
      ws.onerror = () => estado({ fase: 'erro', detalhe: 'falha na conexão WebSocket' });
      ws.onclose = () => estado({ fase: 'parado' });
      ws.onmessage = (ev) => {
        try {
          emitir(JSON.parse(String(ev.data)));
        } catch {
          /* ignora */
        }
      };
      return () => ws.close();
    },
  };
}

/** Consulta uma URL JSON a cada `ms` ms (Prometheus/Zabbix/LibreNMS atrás de um adaptador que devolva o formato de `telemetria.ts`). */
export function fontePolling(url: string, ms = 2000, buscar: typeof fetch = (...a) => fetch(...a)): Fonte {
  return {
    id: 'polling',
    rotulo: `HTTP ${url} a cada ${ms / 1000}s`,
    iniciar(emitir, estado) {
      let ativo = true;
      estado({ fase: 'conectando' });
      const ciclo = async () => {
        try {
          const r = await buscar(url, { cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          if (ativo) {
            emitir(await r.json());
            estado({ fase: 'ao-vivo' });
          }
        } catch (e) {
          if (ativo) estado({ fase: 'erro', detalhe: e instanceof Error ? e.message : 'falha na consulta' });
        }
      };
      void ciclo();
      const i = setInterval(() => void ciclo(), ms);
      return () => {
        ativo = false;
        clearInterval(i);
      };
    },
  };
}

/** Só aceita URLs http(s)/ws(s) bem formadas; evita `javascript:`/`data:` digitados no campo de URL. */
export function urlSegura(texto: string, protocolos: string[]): string | null {
  try {
    const u = new URL(texto.trim());
    return protocolos.includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}
