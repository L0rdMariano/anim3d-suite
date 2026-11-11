// Simulação do Centro de Comando: sem three, sem React, 100% testável.
// Gera ataques e fluxos de dados FICTÍCIOS entre pontos de presença, com rajadas (campanhas) ocasionais.
// A cena 3D só desenha o que esta simulação decide; trocar por dados reais = trocar quem chama `avancar`.

export type Severidade = 'media' | 'alta' | 'critica';
export type TipoEvento = 'ataque' | 'fluxo';
export type PapelNo = 'datacenter' | 'nuvem' | 'filial' | 'sensor';

export interface No {
  id: string;
  nome: string;
  pais: string;
  lat: number;
  lon: number;
  papel: PapelNo;
}

export interface Evento {
  id: number;
  /** Segundos de simulação em que nasceu. */
  t: number;
  tipo: TipoEvento;
  origem: string;
  destino: string;
  vetor: string;
  severidade: Severidade;
  bloqueado: boolean;
  /** Volume transferido (ataque: tentativa; fluxo: carga). */
  volumeMb: number;
}

export interface EstatNo {
  recebidos: number;
  bloqueados: number;
  emitidos: number;
  /** Ataques que partiram deste ponto (o ponto como origem). */
  origemAtaques: number;
  fluxoMb: number;
  /** Ataques recebidos por balde de `BALDE_S` segundos, do mais antigo ao mais novo. */
  historico: number[];
  ultimoVetor: string;
  /** Instante do último ataque alto/crítico NÃO bloqueado recebido (para o estado "sob ataque"). */
  ultimoCritico: number;
  vetores: Record<string, number>;
}

export const BALDE_S = 2;
export const BALDES = 30;

export const NOS: No[] = [
  { id: 'gru', nome: 'São Paulo', pais: 'Brasil', lat: -23.5, lon: -46.6, papel: 'datacenter' },
  { id: 'nyc', nome: 'Nova York', pais: 'EUA', lat: 40.7, lon: -74, papel: 'nuvem' },
  { id: 'lis', nome: 'Lisboa', pais: 'Portugal', lat: 38.7, lon: -9.1, papel: 'datacenter' },
  { id: 'fra', nome: 'Frankfurt', pais: 'Alemanha', lat: 50.1, lon: 8.7, papel: 'nuvem' },
  { id: 'lon', nome: 'Londres', pais: 'Reino Unido', lat: 51.5, lon: -0.1, papel: 'filial' },
  { id: 'los', nome: 'Lagos', pais: 'Nigéria', lat: 6.5, lon: 3.4, papel: 'sensor' },
  { id: 'jnb', nome: 'Joanesburgo', pais: 'África do Sul', lat: -26.2, lon: 28, papel: 'filial' },
  { id: 'dxb', nome: 'Dubai', pais: 'Emirados Árabes', lat: 25.2, lon: 55.3, papel: 'sensor' },
  { id: 'bom', nome: 'Mumbai', pais: 'Índia', lat: 19, lon: 72.8, papel: 'datacenter' },
  { id: 'sin', nome: 'Singapura', pais: 'Singapura', lat: 1.35, lon: 103.8, papel: 'nuvem' },
  { id: 'tyo', nome: 'Tóquio', pais: 'Japão', lat: 35.7, lon: 139.7, papel: 'datacenter' },
  { id: 'syd', nome: 'Sydney', pais: 'Austrália', lat: -33.9, lon: 151.2, papel: 'filial' },
  { id: 'mex', nome: 'Cidade do México', pais: 'México', lat: 19.4, lon: -99.1, papel: 'sensor' },
  { id: 'scl', nome: 'Santiago', pais: 'Chile', lat: -33.4, lon: -70.6, papel: 'filial' },
  { id: 'sfo', nome: 'São Francisco', pais: 'EUA', lat: 37.8, lon: -122.4, papel: 'nuvem' },
  { id: 'sel', nome: 'Seul', pais: 'Coreia do Sul', lat: 37.6, lon: 127, papel: 'sensor' },
];

export const VETORES = ['DDoS', 'Força bruta', 'Phishing', 'Injeção SQL', 'Varredura de portas', 'Ransomware', 'Malware'];
export const ROTULO_SEVERIDADE: Record<Severidade, string> = { media: 'MÉDIA', alta: 'ALTA', critica: 'CRÍTICA' };
export const ROTULO_PAPEL: Record<PapelNo, string> = {
  datacenter: 'Data center',
  nuvem: 'Região de nuvem',
  filial: 'Filial',
  sensor: 'Sensor de borda',
};

// ---------- aleatório determinístico (testes e replays reproduzíveis) ----------
export function criarAleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- geometria sem three ----------
/** Vetor unitário (x, y, z) do ponto na esfera. Mesma convenção do globo (-sin φ cos θ, cos φ, sin φ sin θ). */
export function vetorLatLon(lat: number, lon: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

/**
 * Rotação (pitch em X, yaw em Y; ordem XYZ do three) que traz o ponto para a frente da câmera (+z)
 * mantendo o norte para cima. Útil para "voar" até o nó clicado.
 */
export function focoParaAngulos(d: [number, number, number]): { pitch: number; yaw: number } {
  const [x, y, z] = d;
  const yaw = Math.atan2(-x, z);
  const h = Math.hypot(x, z);
  return { yaw, pitch: Math.atan2(y, h) };
}

/** Menor diferença angular em (-π, π]: para interpolar rotações sem dar a volta longa. */
export function deltaAngulo(de: number, para: number): number {
  let d = (para - de) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------- simulação ----------
export interface Simulacao {
  t: number;
  proximoId: number;
  aleatorio: () => number;
  acumAtaque: number;
  acumFluxo: number;
  campanha: { alvo: string; restantes: number; vetor: string; proxima: number } | null;
  proximaCampanha: number;
  estat: Record<string, EstatNo>;
  /** Mais novo primeiro. */
  log: Evento[];
  totais: { ataques: number; bloqueados: number; fluxoMb: number };
  /** Instantes dos ataques recentes, para "ataques por minuto". */
  janela: number[];
  ritmo: number;
}

const estatVazia = (): EstatNo => ({
  recebidos: 0,
  bloqueados: 0,
  emitidos: 0,
  origemAtaques: 0,
  fluxoMb: 0,
  historico: new Array(BALDES).fill(0),
  ultimoVetor: '—',
  ultimoCritico: -Infinity,
  vetores: {},
});

/** `ritmo` multiplica a frequência de eventos (use < 1 com "reduzir movimento"). */
export function criarSimulacao(semente = 7, ritmo = 1): Simulacao {
  const aleatorio = criarAleatorio(semente);
  return {
    t: 0,
    proximoId: 1,
    aleatorio,
    acumAtaque: 0,
    acumFluxo: 0,
    campanha: null,
    proximaCampanha: 14 + aleatorio() * 8,
    estat: Object.fromEntries(NOS.map((n) => [n.id, estatVazia()])),
    log: [],
    totais: { ataques: 0, bloqueados: 0, fluxoMb: 0 },
    janela: [],
    ritmo,
  };
}

const TAXA_ATAQUE = 1.7; // eventos/s
const TAXA_FLUXO = 1.3;
const MAX_LOG = 60;

function sortear<T>(sim: Simulacao, lista: readonly T[]): T {
  return lista[Math.floor(sim.aleatorio() * lista.length) % lista.length];
}

function outroNo(sim: Simulacao, excluir: string, preferir?: PapelNo[]): No {
  const base = preferir ? NOS.filter((n) => preferir.includes(n.papel) && n.id !== excluir) : NOS.filter((n) => n.id !== excluir);
  return sortear(sim, base.length ? base : NOS.filter((n) => n.id !== excluir));
}

function severidadeSorteada(sim: Simulacao): Severidade {
  const r = sim.aleatorio();
  return r < 0.18 ? 'critica' : r < 0.5 ? 'alta' : 'media';
}

function registrar(sim: Simulacao, e: Evento) {
  const de = sim.estat[e.origem];
  const para = sim.estat[e.destino];
  de.emitidos++;
  if (e.tipo === 'ataque') {
    de.origemAtaques++;
    para.recebidos++;
    if (e.bloqueado) para.bloqueados++;
    para.historico[BALDES - 1]++;
    para.ultimoVetor = e.vetor;
    para.vetores[e.vetor] = (para.vetores[e.vetor] ?? 0) + 1;
    if (!e.bloqueado && e.severidade !== 'media') para.ultimoCritico = e.t;
    sim.totais.ataques++;
    if (e.bloqueado) sim.totais.bloqueados++;
    sim.janela.push(e.t);
  } else {
    para.fluxoMb += e.volumeMb;
    de.fluxoMb += e.volumeMb;
    sim.totais.fluxoMb += e.volumeMb;
  }
  sim.log.unshift(e);
  if (sim.log.length > MAX_LOG) sim.log.length = MAX_LOG;
}

function novoAtaque(sim: Simulacao, alvo?: string, vetor?: string): Evento {
  const destino = alvo ? NOS.find((n) => n.id === alvo)! : sortear(sim, NOS.filter((n) => n.papel !== 'sensor'));
  const origem = outroNo(sim, destino.id);
  const severidade = severidadeSorteada(sim);
  // Defesa melhor nos data centers; críticos escapam mais.
  const chaveBloqueio = severidade === 'critica' ? 0.62 : severidade === 'alta' ? 0.8 : 0.93;
  return {
    id: sim.proximoId++,
    t: sim.t,
    tipo: 'ataque',
    origem: origem.id,
    destino: destino.id,
    vetor: vetor ?? sortear(sim, VETORES),
    severidade,
    bloqueado: sim.aleatorio() < chaveBloqueio,
    volumeMb: Math.round(2 + sim.aleatorio() * 480),
  };
}

function novoFluxo(sim: Simulacao): Evento {
  const origem = sortear(sim, NOS.filter((n) => n.papel !== 'sensor'));
  const destino = outroNo(sim, origem.id, ['datacenter', 'nuvem']);
  return {
    id: sim.proximoId++,
    t: sim.t,
    tipo: 'fluxo',
    origem: origem.id,
    destino: destino.id,
    vetor: sortear(sim, ['Replicação', 'Backup', 'API', 'Sincronização', 'Telemetria']),
    severidade: 'media',
    bloqueado: false,
    volumeMb: Math.round(40 + sim.aleatorio() * 2400),
  };
}

/** Avança `dt` segundos e devolve os eventos que nasceram neste intervalo (já registrados nas estatísticas). */
export function avancar(sim: Simulacao, dt: number): Evento[] {
  const novos: Evento[] = [];
  const antes = Math.floor(sim.t / BALDE_S);
  sim.t += dt;
  const passos = Math.floor(sim.t / BALDE_S) - antes;
  for (let i = 0; i < passos; i++) for (const e of Object.values(sim.estat)) (e.historico.shift(), e.historico.push(0));

  sim.acumAtaque += dt * TAXA_ATAQUE * sim.ritmo * (0.6 + sim.aleatorio() * 0.8);
  sim.acumFluxo += dt * TAXA_FLUXO * sim.ritmo * (0.6 + sim.aleatorio() * 0.8);
  while (sim.acumAtaque >= 1) {
    sim.acumAtaque -= 1;
    novos.push(novoAtaque(sim));
  }
  while (sim.acumFluxo >= 1) {
    sim.acumFluxo -= 1;
    novos.push(novoFluxo(sim));
  }

  // Campanha: rajada contra um único alvo (o "ataque do filme").
  if (!sim.campanha && sim.t >= sim.proximaCampanha) {
    const alvo = sortear(sim, NOS.filter((n) => n.papel === 'datacenter' || n.papel === 'nuvem'));
    sim.campanha = { alvo: alvo.id, restantes: 9, vetor: sortear(sim, ['DDoS', 'Ransomware', 'Força bruta']), proxima: sim.t };
  }
  if (sim.campanha && sim.t >= sim.campanha.proxima) {
    const c = sim.campanha;
    novos.push(novoAtaque(sim, c.alvo, c.vetor));
    c.restantes--;
    c.proxima = sim.t + 0.28 / sim.ritmo;
    if (c.restantes <= 0) {
      sim.campanha = null;
      sim.proximaCampanha = sim.t + 20 + sim.aleatorio() * 14;
    }
  }

  for (const e of novos) registrar(sim, e);
  while (sim.janela.length && sim.janela[0] < sim.t - 60) sim.janela.shift();
  return novos;
}

export function ataquesPorMinuto(sim: Simulacao): number {
  const janela = Math.min(60, Math.max(sim.t, 1));
  return Math.round((sim.janela.length / janela) * 60);
}

export type EstadoNo = 'normal' | 'sob-ataque' | 'mitigado';

export function estadoDoNo(sim: Simulacao, id: string): EstadoNo {
  const e = sim.estat[id];
  if (sim.t - e.ultimoCritico < 6) return 'sob-ataque';
  const recentes = e.historico.slice(-5).reduce((a, b) => a + b, 0);
  return recentes >= 4 ? 'mitigado' : 'normal';
}

export function vetorPredominante(e: EstatNo): string {
  let melhor = '—';
  let max = 0;
  for (const [v, n] of Object.entries(e.vetores)) if (n > max) ((max = n), (melhor = v));
  return melhor;
}

export const taxaBloqueio = (e: { recebidos: number; bloqueados: number }) => (e.recebidos ? e.bloqueados / e.recebidos : 1);
