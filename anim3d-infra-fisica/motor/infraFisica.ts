// Motor da infraestrutura física: racks em U, portas, cabos e caminho pela eletrocalha. Sem React, sem three.
// Unidades: metros e watts. U = 44,45 mm. Posição de rack conta de baixo para cima, a partir de 1.

export const U_METROS = 0.04445;
export type TipoEquip = 'switch' | 'patch-panel' | 'servidor' | 'roteador' | 'firewall' | 'ups' | 'ap' | 'pc' | 'tomada';
/** Equipamentos passivos não aparecem na topologia lógica: o sinal só atravessa. */
export const PASSIVOS: TipoEquip[] = ['patch-panel', 'tomada'];

export type Ponto3 = [number, number, number];
export interface Equipamento { id: string; nome: string; tipo: TipoEquip; alturaU: number; potenciaW: number; portas: number; salaId: string; }
export interface Rack { id: string; nome: string; totalU: number; salaId: string; capacidadeW: number; }
export interface Instalacao { equipamentoId: string; rackId: string; uInicial: number; }
export interface Extremo { equipamentoId: string; porta: number; }
export interface Cabo { id: string; de: Extremo; para: Extremo; meio: 'cobre' | 'fibra'; caminho: Ponto3[]; }
export interface ModeloFisico { racks: Rack[]; equipamentos: Equipamento[]; instalacoes: Instalacao[]; cabos: Cabo[]; }

export interface Ocupacao { slots: (string | null)[]; conflitos: { u: number; ids: string[] }[]; foraDoRack: string[]; }

/** Mapa de U do rack: `slots[u-1]` é o equipamento que ocupa o U. Sobreposição e excesso de altura viram diagnóstico, não exceção. */
export function ocupacaoRack(rack: Rack, instalacoes: Instalacao[], equips: Equipamento[]): Ocupacao {
  const slots: (string | null)[] = Array(rack.totalU).fill(null);
  const conflitos = new Map<number, string[]>();
  const foraDoRack: string[] = [];
  for (const ins of instalacoes.filter((i) => i.rackId === rack.id)) {
    const eq = equips.find((e) => e.id === ins.equipamentoId);
    if (!eq) continue;
    if (ins.uInicial < 1 || ins.uInicial + eq.alturaU - 1 > rack.totalU) foraDoRack.push(eq.id);
    for (let u = ins.uInicial; u < ins.uInicial + eq.alturaU; u++) {
      if (u < 1 || u > rack.totalU) continue;
      if (slots[u - 1]) conflitos.set(u, [...(conflitos.get(u) ?? [slots[u - 1]!]), eq.id]);
      else slots[u - 1] = eq.id;
    }
  }
  return { slots, conflitos: [...conflitos].map(([u, ids]) => ({ u, ids })), foraDoRack };
}

/** Primeiro U livre que comporta `alturaU` U seguidos (ou null). */
export function acharVaga(ocup: Ocupacao, alturaU: number): number | null {
  for (let u = 1; u + alturaU - 1 <= ocup.slots.length; u++) {
    if (ocup.slots.slice(u - 1, u - 1 + alturaU).every((s) => s === null)) return u;
  }
  return null;
}

/** Centro vertical (m) do equipamento instalado: é daqui que o cabo sai no 3D. */
export const alturaDoU = (ins: Instalacao, eq: Equipamento) => (ins.uInicial - 1 + eq.alturaU / 2) * U_METROS;

export const distancia = (a: Ponto3, b: Ponto3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Comprimento só dos trechos do caminho (sem folga). */
export function comprimentoTrechos(caminho: Ponto3[]): number {
  let total = 0;
  for (let i = 1; i < caminho.length; i++) total += distancia(caminho[i - 1], caminho[i]);
  return total;
}

/** Comprimento real: trechos + folga de manobra em cada ponta. */
export const comprimentoCabo = (caminho: Ponto3[], folgaPorPonta = 1.5) => comprimentoTrechos(caminho) + 2 * folgaPorPonta;

export interface GrafoEletrocalha { nos: Record<string, Ponto3>; trechos: [string, string][]; }

/**
 * Caminho do cabo pela eletrocalha (Dijkstra). Por padrão encaixa origem e destino no nó MAIS PRÓXIMO; entre andares isso erra
 * (a tomada do 2º andar a 3,6 m fica mais perto da calha do térreo a 2,6 m do que da sua, a 5,8 m). Passe `fixar` para escolher o nó.
 */
export function rotearPelaEletrocalha(g: GrafoEletrocalha, origem: Ponto3, destino: Ponto3, fixar: { origem?: string; destino?: string } = {}): Ponto3[] | null {
  const ids = Object.keys(g.nos);
  if (!ids.length) return null;
  const maisProximo = (p: Ponto3) => ids.reduce((m, id) => (distancia(g.nos[id], p) < distancia(g.nos[m], p) ? id : m));
  const ini = fixar.origem ?? maisProximo(origem);
  const fim = fixar.destino ?? maisProximo(destino);
  if (!g.nos[ini] || !g.nos[fim]) return null;
  const dist = new Map<string, number>([[ini, 0]]);
  const prev = new Map<string, string>();
  const aberto = new Set([ini]);
  while (aberto.size) {
    const atual = [...aberto].reduce((m, id) => (dist.get(id)! < dist.get(m)! ? id : m));
    aberto.delete(atual);
    if (atual === fim) break;
    for (const [a, b] of g.trechos) {
      const outro = a === atual ? b : b === atual ? a : null;
      if (!outro || !g.nos[outro]) continue;
      const d = dist.get(atual)! + distancia(g.nos[atual], g.nos[outro]);
      if (d < (dist.get(outro) ?? Infinity)) { dist.set(outro, d); prev.set(outro, atual); aberto.add(outro); }
    }
  }
  if (!dist.has(fim)) return null;
  const nos: string[] = [fim];
  while (nos[0] !== ini) nos.unshift(prev.get(nos[0])!);
  return [origem, ...nos.map((id) => g.nos[id]), destino];
}

/** Portas em uso por equipamento (cada extremo de cabo ocupa uma porta). */
export function portasUsadas(cabos: Cabo[]): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const c of cabos) for (const x of [c.de, c.para]) m.set(x.equipamentoId, (m.get(x.equipamentoId) ?? new Set<number>()).add(x.porta));
  return m;
}

export interface CaminhoFisico {
  /** Cabos na ordem em que o sinal os percorre, a partir do equipamento de origem. */
  cabos: Cabo[];
  /** Equipamentos tocados, incluindo passivos (tomada, patch panel). */
  equipamentos: string[];
  /** Primeiro equipamento ATIVO alcançado; null se a cadeia termina numa porta de passivo sem continuação. */
  fim: string | null;
  /** Soma dos trechos de todos os cabos da cadeia. */
  metros: number;
  /** Canal completo: `metros` + folga de manobra nas duas pontas do canal. É este valor que tem limite de 100 m em cobre. */
  canalM: number;
}

/** Segue o sinal de `inicio` atravessando passivos pela MESMA porta até o próximo ativo. */
export function rastrearCaminhoFisico(m: ModeloFisico, inicio: string): CaminhoFisico {
  const tipo = new Map(m.equipamentos.map((e) => [e.id, e.tipo]));
  const usados = new Set<string>();
  const cabos: Cabo[] = [];
  const equipamentos = [inicio];
  let fim: string | null = null;
  let atual: Cabo | undefined = m.cabos.find((c) => c.de.equipamentoId === inicio || c.para.equipamentoId === inicio);
  let de = inicio;
  for (let guarda = 0; atual && guarda < 12; guarda++) {
    usados.add(atual.id);
    cabos.push(atual);
    const outro: Extremo = atual.de.equipamentoId === de ? atual.para : atual.de;
    equipamentos.push(outro.equipamentoId);
    const t = tipo.get(outro.equipamentoId);
    if (!t || !PASSIVOS.includes(t)) { fim = outro.equipamentoId; break; }
    de = outro.equipamentoId;
    atual = m.cabos.find((c) => !usados.has(c.id) && [c.de, c.para].some((x) => x.equipamentoId === outro.equipamentoId && x.porta === outro.porta));
  }
  const metros = cabos.reduce((s, c) => s + comprimentoTrechos(c.caminho), 0);
  return { cabos, equipamentos, fim, metros, canalM: metros + 3 };
}
