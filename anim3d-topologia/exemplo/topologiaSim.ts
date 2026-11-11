// Motor da topologia de rede (estilo Packet Tracer): sem React, sem three, 100% testável.
// Dado um grafo de dispositivos e enlaces, calcula a rota de um pacote e o RASTREIO salto a salto:
// em que ponto foi entregue ou descartado e por quê (dispositivo desligado, enlace caído, regra de firewall, sem rota).
// A interface só desenha o resultado; o modo "depurar" percorre `passos` um a um.

export type TipoDisp = 'roteador' | 'switch' | 'pc' | 'servidor' | 'firewall' | 'nuvem';
export type Protocolo = 'icmp' | 'http' | 'ssh' | 'dns';

export const PROTOCOLOS: Protocolo[] = ['icmp', 'http', 'ssh', 'dns'];
export const ROTULO_PROTOCOLO: Record<Protocolo, string> = { icmp: 'ICMP (ping)', http: 'HTTP', ssh: 'SSH', dns: 'DNS' };
export const ROTULO_TIPO: Record<TipoDisp, string> = {
  roteador: 'Roteador',
  switch: 'Switch',
  pc: 'Computador',
  servidor: 'Servidor',
  firewall: 'Firewall',
  nuvem: 'Internet',
};
/** Dispositivos que originam ou recebem tráfego. */
export const EH_HOST: Record<TipoDisp, boolean> = { roteador: false, switch: false, pc: true, servidor: true, firewall: false, nuvem: true };

export interface Disp {
  id: string;
  tipo: TipoDisp;
  nome: string;
  x: number;
  y: number;
  ip?: string;
  ligado: boolean;
  /** Só firewall: protocolos descartados. */
  bloqueia?: Protocolo[];
}

export interface Enlace {
  id: string;
  a: string;
  b: string;
  ativo: boolean;
  /** Latência do enlace em milissegundos. */
  ms: number;
  /** Capacidade em Mbps (para calcular a utilização com telemetria ao vivo). Padrão 100. */
  mbpsMax?: number;
}

export interface Topologia {
  disps: Disp[];
  enlaces: Enlace[];
}

export type Acao = 'encaminhou' | 'descartou';
export interface Passo {
  /** Dispositivo onde o pacote está. */
  de: string;
  /** Próximo dispositivo (igual a `de` quando o pacote foi descartado aqui). */
  para: string;
  enlace: string | null;
  ms: number;
  acao: Acao;
  motivo?: string;
}

export interface Resultado {
  status: 'entregue' | 'descartado';
  passos: Passo[];
  /** Rota tentada, do origem ao último dispositivo alcançado. */
  rota: string[];
  totalMs: number;
  motivo?: string;
}

const porId = <T extends { id: string }>(l: T[], id: string) => l.find((x) => x.id === id);

/** Vizinhos de `id`, opcionalmente só pelos enlaces ativos e dispositivos ligados. */
function vizinhos(t: Topologia, id: string, somenteVivos: boolean): { para: string; enlace: Enlace }[] {
  const r: { para: string; enlace: Enlace }[] = [];
  for (const e of t.enlaces) {
    const outro = e.a === id ? e.b : e.b === id ? e.a : null;
    if (!outro || !porId(t.disps, outro)) continue;
    if (somenteVivos && (!e.ativo || !porId(t.disps, outro)!.ligado)) continue;
    r.push({ para: outro, enlace: e });
  }
  return r;
}

/** Caminho de menor latência (Dijkstra). `somenteVivos=false` ignora falhas: é a rota "pretendida". */
export function melhorRota(t: Topologia, origem: string, destino: string, somenteVivos = true): { ids: string[]; enlaces: Enlace[]; ms: number } | null {
  if (!porId(t.disps, origem) || !porId(t.disps, destino)) return null;
  const dist = new Map<string, number>([[origem, 0]]);
  const prev = new Map<string, { de: string; enlace: Enlace }>();
  const aberto = new Set<string>([origem]);
  while (aberto.size) {
    let atual = '';
    let melhor = Infinity;
    for (const id of aberto) if ((dist.get(id) ?? Infinity) < melhor) ((melhor = dist.get(id)!), (atual = id));
    aberto.delete(atual);
    if (atual === destino) break;
    for (const { para, enlace } of vizinhos(t, atual, somenteVivos)) {
      const novo = melhor + enlace.ms;
      if (novo < (dist.get(para) ?? Infinity)) {
        dist.set(para, novo);
        prev.set(para, { de: atual, enlace });
        aberto.add(para);
      }
    }
  }
  if (!dist.has(destino)) return null;
  const ids = [destino];
  const enlaces: Enlace[] = [];
  for (let cur = destino; cur !== origem; ) {
    const p = prev.get(cur)!;
    enlaces.unshift(p.enlace);
    ids.unshift(p.de);
    cur = p.de;
  }
  return { ids, enlaces, ms: dist.get(destino)! };
}

const nomeDe = (t: Topologia, id: string) => porId(t.disps, id)?.nome ?? id;

/** Rastreia um pacote de `origem` a `destino` com o `protocolo`. É o coração do modo depurar. */
export function tracar(t: Topologia, origem: string, destino: string, protocolo: Protocolo): Resultado {
  const o = porId(t.disps, origem);
  const d = porId(t.disps, destino);
  const falha = (motivo: string, rota: string[], passos: Passo[], onde: string): Resultado => {
    passos.push({ de: onde, para: onde, enlace: null, ms: 0, acao: 'descartou', motivo });
    return { status: 'descartado', passos, rota, totalMs: passos.reduce((s, p) => s + p.ms, 0), motivo };
  };
  if (!o || !d) return { status: 'descartado', passos: [], rota: [], totalMs: 0, motivo: 'origem ou destino inexistente' };
  if (origem === destino) return falha('origem e destino são o mesmo dispositivo', [origem], [], origem);
  if (!o.ligado) return falha(`${o.nome} está desligado`, [origem], [], origem);

  const viva = melhorRota(t, origem, destino, true);
  if (!viva) {
    // Sem rota viva: anda pela rota pretendida e para no primeiro defeito, dizendo qual.
    const ideal = melhorRota(t, origem, destino, false);
    if (!ideal) return falha(`sem rota: ${d.nome} não está conectado à rede de ${o.nome}`, [origem], [], origem);
    const passos: Passo[] = [];
    const rota = [origem];
    for (let i = 0; i < ideal.enlaces.length; i++) {
      const e = ideal.enlaces[i];
      const prox = ideal.ids[i + 1];
      const proxDisp = porId(t.disps, prox)!;
      if (!e.ativo) return falha(`enlace caído entre ${nomeDe(t, ideal.ids[i])} e ${proxDisp.nome}`, rota, passos, ideal.ids[i]);
      passos.push({ de: ideal.ids[i], para: prox, enlace: e.id, ms: e.ms, acao: 'encaminhou' });
      rota.push(prox);
      if (!proxDisp.ligado) return falha(`${proxDisp.nome} está desligado`, rota, passos, prox);
    }
    return falha('sem rota disponível', rota, passos, origem);
  }

  const passos: Passo[] = [];
  const rota = [origem];
  for (let i = 0; i < viva.enlaces.length; i++) {
    const e = viva.enlaces[i];
    const aqui = porId(t.disps, viva.ids[i])!;
    const prox = porId(t.disps, viva.ids[i + 1])!;
    // regra do firewall vale para o pacote que ENTRA nele
    passos.push({ de: aqui.id, para: prox.id, enlace: e.id, ms: e.ms, acao: 'encaminhou' });
    rota.push(prox.id);
    if (prox.tipo === 'firewall' && prox.bloqueia?.includes(protocolo)) {
      return falha(`regra do firewall ${prox.nome} bloqueia ${ROTULO_PROTOCOLO[protocolo]}`, rota, passos, prox.id);
    }
  }
  return { status: 'entregue', passos, rota, totalMs: viva.ms };
}

// ---------- validação ----------
export interface Aviso {
  nivel: 'erro' | 'aviso';
  texto: string;
  disp?: string;
}

export function validar(t: Topologia): Aviso[] {
  const av: Aviso[] = [];
  const ids = new Set(t.disps.map((x) => x.id));
  const ips = new Map<string, string>();
  for (const x of t.disps) {
    if (x.ip) {
      const outro = ips.get(x.ip);
      if (outro) av.push({ nivel: 'erro', texto: `IP ${x.ip} duplicado em ${nomeDe(t, outro)} e ${x.nome}`, disp: x.id });
      ips.set(x.ip, x.id);
    }
    if (EH_HOST[x.tipo] && x.tipo !== 'nuvem' && !x.ip) av.push({ nivel: 'aviso', texto: `${x.nome} não tem IP`, disp: x.id });
    if (!t.enlaces.some((e) => e.a === x.id || e.b === x.id)) av.push({ nivel: 'aviso', texto: `${x.nome} não está ligado a nada`, disp: x.id });
  }
  for (const e of t.enlaces) if (!ids.has(e.a) || !ids.has(e.b)) av.push({ nivel: 'erro', texto: `enlace ${e.id} aponta para dispositivo inexistente` });
  return av;
}

// ---------- edição (funções puras: devolvem uma topologia nova) ----------
let contador = 1;
export const novoId = (prefixo: string) => `${prefixo}${Date.now().toString(36)}${contador++}`;

export function ligar(t: Topologia, a: string, b: string, ms = 5): Topologia {
  if (a === b || t.enlaces.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return t;
  return { ...t, enlaces: [...t.enlaces, { id: novoId('e'), a, b, ativo: true, ms }] };
}

export function remover(t: Topologia, id: string): Topologia {
  return { disps: t.disps.filter((d) => d.id !== id), enlaces: t.enlaces.filter((e) => e.id !== id && e.a !== id && e.b !== id) };
}

/** Topologia de exemplo: LAN com switch, roteador, firewall, servidores e internet. */
export function topologiaExemplo(): Topologia {
  const d = (id: string, tipo: TipoDisp, nome: string, x: number, y: number, extra: Partial<Disp> = {}): Disp => ({ id, tipo, nome, x, y, ligado: true, ...extra });
  return {
    disps: [
      d('pc1', 'pc', 'PC-Vendas', 84, 91, { ip: '192.168.1.10' }),
      d('pc2', 'pc', 'PC-RH', 84, 228, { ip: '192.168.1.11' }),
      d('pc3', 'pc', 'PC-TI', 84, 365, { ip: '192.168.1.12' }),
      d('sw1', 'switch', 'SW-Andar1', 228, 228),
      d('rt1', 'roteador', 'RT-Borda', 380, 228, { ip: '192.168.1.1' }),
      d('fw1', 'firewall', 'FW-Principal', 524, 228, { bloqueia: ['ssh'] }),
      d('net', 'nuvem', 'Internet', 669, 228),
      d('sw2', 'switch', 'SW-DMZ', 380, 380),
      d('srv1', 'servidor', 'SRV-Web', 274, 426, { ip: '10.0.0.10' }),
      d('srv2', 'servidor', 'SRV-Arquivos', 486, 426, { ip: '10.0.0.11' }),
    ],
    enlaces: [
      { id: 'l1', a: 'pc1', b: 'sw1', ativo: true, ms: 1, mbpsMax: 1000 },
      { id: 'l2', a: 'pc2', b: 'sw1', ativo: true, ms: 1, mbpsMax: 1000 },
      { id: 'l3', a: 'pc3', b: 'sw1', ativo: true, ms: 1, mbpsMax: 1000 },
      { id: 'l4', a: 'sw1', b: 'rt1', ativo: true, ms: 2, mbpsMax: 1000 },
      { id: 'l5', a: 'rt1', b: 'fw1', ativo: true, ms: 2, mbpsMax: 1000 },
      { id: 'l6', a: 'fw1', b: 'net', ativo: true, ms: 18, mbpsMax: 100 },
      { id: 'l7', a: 'rt1', b: 'sw2', ativo: true, ms: 2, mbpsMax: 1000 },
      { id: 'l8', a: 'sw2', b: 'srv1', ativo: true, ms: 1, mbpsMax: 1000 },
      { id: 'l9', a: 'sw2', b: 'srv2', ativo: true, ms: 1, mbpsMax: 1000 },
    ],
  };
}
