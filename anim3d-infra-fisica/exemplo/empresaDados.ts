// Exemplo: rack de TI de uma empresa de médio porte (~120 pessoas, 3 andares). Dados puros, sem React nem three.
// Escopo honesto: o rack é completo (42 U); dos ~120 pontos de rede, o modelo documenta uma AMOSTRA de 3 pontos + 1 AP por andar.
import {
  alturaDoU,
  comprimentoTrechos,
  rotearPelaEletrocalha,
  U_METROS,
  type Cabo,
  type Equipamento,
  type GrafoEletrocalha,
  type Instalacao,
  type ModeloFisico,
  type Ponto3,
  type Rack,
  type TipoEquip,
} from '../motor/infraFisica';

export interface SalaInfo { id: string; nome: string; andar: number; }
export const SALAS: SalaInfo[] = [
  { id: 'sala-ti', nome: 'Sala de TI (térreo)', andar: 0 },
  { id: 'andar0', nome: 'Térreo · Comercial', andar: 0 },
  { id: 'andar1', nome: '2º andar · Administrativo', andar: 1 },
  { id: 'andar2', nome: '3º andar · Desenvolvimento', andar: 2 },
];
export const ALTURA_ANDAR = 3.2;
export const RACK_LARGURA = 0.6;
export const RACK_PROFUNDIDADE = 1.0;
/** Face frontal do rack (equipamentos e portas ficam em z = RACK_FRENTE). */
export const RACK_FRENTE = 0.42;
const RACK_BASE_Y = 0.1;

/** Calha: sala de TI → prumada (vertical, atravessa os andares) → distribuição de cada andar. */
export const ELETROCALHA: GrafoEletrocalha = {
  nos: {
    ti: [0, 2.6, 0],
    p0: [5, 2.6, -7],
    p1: [5, 2.6 + ALTURA_ANDAR, -7],
    p2: [5, 2.6 + 2 * ALTURA_ANDAR, -7],
    f0: [18, 2.6, -7],
    f1: [18, 2.6 + ALTURA_ANDAR, -7],
    f2: [18, 2.6 + 2 * ALTURA_ANDAR, -7],
  },
  trechos: [['ti', 'p0'], ['p0', 'p1'], ['p1', 'p2'], ['p0', 'f0'], ['p1', 'f1'], ['p2', 'f2']],
};

const eq = (id: string, nome: string, tipo: TipoEquip, alturaU: number, potenciaW: number, portas: number, salaId: string): Equipamento => ({ id, nome, tipo, alturaU, potenciaW, portas, salaId });

const EQUIP_RACK: Equipamento[] = [
  eq('ups', 'UPS-01 (5 kVA)', 'ups', 3, 100, 1, 'sala-ti'),
  eq('nas', 'NAS-BKP', 'servidor', 2, 250, 2, 'sala-ti'),
  eq('virt1', 'SRV-VIRT1', 'servidor', 2, 550, 2, 'sala-ti'),
  eq('virt2', 'SRV-VIRT2', 'servidor', 2, 550, 2, 'sala-ti'),
  eq('arq', 'SRV-ARQ', 'servidor', 2, 400, 2, 'sala-ti'),
  eq('app', 'SRV-APP', 'servidor', 1, 250, 2, 'sala-ti'),
  eq('ad', 'SRV-AD', 'servidor', 1, 200, 2, 'sala-ti'),
  eq('rt', 'RT-ISP', 'roteador', 1, 40, 4, 'sala-ti'),
  eq('fw', 'FW-BORDA', 'firewall', 1, 80, 8, 'sala-ti'),
  eq('core', 'SW-CORE', 'switch', 1, 150, 24, 'sala-ti'),
  eq('acc1', 'SW-ACC1 (48p PoE)', 'switch', 1, 130, 48, 'sala-ti'),
  eq('pp0', 'PP-TERREO', 'patch-panel', 1, 0, 24, 'sala-ti'),
  eq('pp1', 'PP-ANDAR2', 'patch-panel', 1, 0, 24, 'sala-ti'),
  eq('acc2', 'SW-ACC2 (48p PoE)', 'switch', 1, 130, 48, 'sala-ti'),
  eq('pp2', 'PP-ANDAR3', 'patch-panel', 1, 0, 24, 'sala-ti'),
];

/** U inicial (de baixo para cima). Pesados embaixo; U 14–21 e 31–42 livres para crescer. */
const U_INICIAL: Record<string, number> = {
  ups: 1, nas: 4, virt1: 6, virt2: 8, arq: 10, app: 12, ad: 13,
  rt: 22, fw: 23, core: 24, acc1: 25, pp0: 26, pp1: 27, acc2: 28, pp2: 29,
};

export const RACK: Rack = { id: 'rack01', nome: 'RACK-01', totalU: 42, salaId: 'sala-ti', capacidadeW: 4500 };

export interface PontoRede { pc: string; tomada: string; andar: number; ppId: string; portaPP: number; swId: string; portaSw: number; }
/** Amostra de pontos: 3 estações por andar. O PP e o switch usam portas diferentes de propósito (a porta do PP é a que o sinal atravessa). */
const PONTOS: PontoRede[] = [
  { pc: 'pc-0-1', tomada: 'tom-0-1', andar: 0, ppId: 'pp0', portaPP: 3, swId: 'acc1', portaSw: 3 },
  { pc: 'pc-0-2', tomada: 'tom-0-2', andar: 0, ppId: 'pp0', portaPP: 7, swId: 'acc1', portaSw: 7 },
  { pc: 'pc-0-3', tomada: 'tom-0-3', andar: 0, ppId: 'pp0', portaPP: 12, swId: 'acc1', portaSw: 12 },
  { pc: 'pc-1-1', tomada: 'tom-1-1', andar: 1, ppId: 'pp1', portaPP: 4, swId: 'acc1', portaSw: 24 },
  { pc: 'pc-1-2', tomada: 'tom-1-2', andar: 1, ppId: 'pp1', portaPP: 9, swId: 'acc1', portaSw: 29 },
  { pc: 'pc-1-3', tomada: 'tom-1-3', andar: 1, ppId: 'pp1', portaPP: 15, swId: 'acc1', portaSw: 35 },
  { pc: 'pc-2-1', tomada: 'tom-2-1', andar: 2, ppId: 'pp2', portaPP: 5, swId: 'acc2', portaSw: 5 },
  { pc: 'pc-2-2', tomada: 'tom-2-2', andar: 2, ppId: 'pp2', portaPP: 10, swId: 'acc2', portaSw: 10 },
  { pc: 'pc-2-3', tomada: 'tom-2-3', andar: 2, ppId: 'pp2', portaPP: 16, swId: 'acc2', portaSw: 16 },
];
const NOMES_PC = ['PC-T01', 'PC-T02', 'PC-T03', 'PC-A201', 'PC-A202', 'PC-A203', 'PC-A301', 'PC-A302', 'PC-A303'];
const NOME_ANDAR = ['T', 'A2', 'A3'];

export const posPiso = (andar: number, x: number, z: number, h = 0.4): Ponto3 => [x, andar * ALTURA_ANDAR + h, z];

/** Posição 3D da porta `porta` de um equipamento instalado no rack (frente do rack). */
export function posicaoPortaNoRack(m: ModeloFisico, equipId: string, porta: number): Ponto3 {
  const e = m.equipamentos.find((x) => x.id === equipId)!;
  const ins = m.instalacoes.find((i) => i.equipamentoId === equipId)!;
  const n = Math.max(1, e.portas);
  const x = n === 1 ? 0 : -0.2 + ((porta - 1) / (n - 1)) * 0.4;
  return [x, RACK_BASE_Y + alturaDoU(ins, e), RACK_FRENTE + 0.02];
}

export function posicaoExterna(id: string): Ponto3 {
  const m = id.match(/^(tom|pc|ap)-(\d)(?:-(\d))?$/);
  if (!m) throw new Error(`posição externa desconhecida: ${id}`);
  const andar = Number(m[2]);
  const n = Number(m[3] ?? 4);
  const x = 12 + n * 3.4;
  if (m[1] === 'tom') return posPiso(andar, x, -7.4, 0.4);
  if (m[1] === 'pc') return posPiso(andar, x, -6.2, 0.8);
  return posPiso(andar, 16, 0, ALTURA_ANDAR - 0.25); // AP no teto, no meio do andar
}

/** Constrói o modelo físico completo: equipamentos do rack, pontos de rede, APs e todos os cabos com caminho real. */
export function empresaMedioPorte(): ModeloFisico {
  const equipamentos: Equipamento[] = [...EQUIP_RACK];
  const instalacoes: Instalacao[] = Object.entries(U_INICIAL).map(([equipamentoId, uInicial]) => ({ equipamentoId, rackId: RACK.id, uInicial }));
  const base: ModeloFisico = { racks: [RACK], equipamentos, instalacoes, cabos: [] };
  const cabos: Cabo[] = [];
  const porta = (id: string, p: number) => posicaoPortaNoRack(base, id, p);
  const patchNoRack = (id: string, a: string, pa: number, b: string, pb: number, meio: Cabo['meio'] = 'cobre'): Cabo => {
    const i = porta(a, pa);
    const f = porta(b, pb);
    // sai pela frente, sobe/desce pelo organizador lateral e volta à porta destino
    const lado = RACK_LARGURA / 2 - 0.04;
    return { id, de: { equipamentoId: a, porta: pa }, para: { equipamentoId: b, porta: pb }, meio, caminho: [i, [i[0], i[1], RACK_FRENTE + 0.1], [lado, i[1], RACK_FRENTE + 0.1], [lado, f[1], RACK_FRENTE + 0.1], [f[0], f[1], RACK_FRENTE + 0.1], f] };
  };

  // backbone e servidores no core
  cabos.push(patchNoRack('bb-rt-fw', 'rt', 1, 'fw', 1), patchNoRack('bb-fw-core', 'fw', 2, 'core', 1));
  cabos.push(patchNoRack('bb-core-acc1', 'core', 2, 'acc1', 48, 'fibra'), patchNoRack('bb-core-acc2', 'core', 3, 'acc2', 48, 'fibra'));
  (['virt1', 'virt2', 'arq', 'app', 'ad', 'nas'] as const).forEach((s, i) => cabos.push(patchNoRack(`srv-${s}`, s, 1, 'core', 5 + i)));

  PONTOS.forEach((p, i) => {
    equipamentos.push(eq(p.pc, NOMES_PC[i], 'pc', 0, 0, 1, `andar${p.andar}`), eq(p.tomada, `T-${NOME_ANDAR[p.andar]}-${(i % 3) + 1}`, 'tomada', 0, 0, 1, `andar${p.andar}`));
  });
  const aps = [0, 1, 2].map((andar) => ({ id: `ap-${andar}`, andar, nome: `AP-${NOME_ANDAR[andar]}`, ppId: `pp${andar}`, portaPP: 20, swId: andar === 2 ? 'acc2' : 'acc1', portaSw: andar === 2 ? 20 : andar === 1 ? 40 : 20 }));
  for (const a of aps) equipamentos.push(eq(a.id, a.nome, 'ap', 0, 15, 1, `andar${a.andar}`));

  const horizontal = (id: string, origemId: string, ppId: string, portaPP: number, meio: Cabo['meio'] = 'cobre'): Cabo => {
    const o = posicaoExterna(origemId);
    const d = porta(ppId, portaPP);
    const andar = Number(origemId.split('-')[1]);
    const via = rotearPelaEletrocalha(ELETROCALHA, o, d, { origem: `f${andar}`, destino: 'ti' }) ?? [o, d];
    const lado: Ponto3 = [d[0], d[1], RACK_FRENTE + 0.1];
    return { id, de: { equipamentoId: origemId, porta: 1 }, para: { equipamentoId: ppId, porta: portaPP }, meio, caminho: [...via.slice(0, -1), [d[0], 2.2, RACK_FRENTE + 0.1], lado, d] };
  };

  PONTOS.forEach((p) => {
    const pc = posicaoExterna(p.pc);
    const tom = posicaoExterna(p.tomada);
    cabos.push({ id: `cp-${p.pc}`, de: { equipamentoId: p.pc, porta: 1 }, para: { equipamentoId: p.tomada, porta: 1 }, meio: 'cobre', caminho: [pc, [pc[0], tom[1], pc[2]], tom] });
    cabos.push(horizontal(`hz-${p.pc}`, p.tomada, p.ppId, p.portaPP));
    cabos.push(patchNoRack(`pt-${p.pc}`, p.ppId, p.portaPP, p.swId, p.portaSw));
  });
  for (const a of aps) {
    cabos.push(horizontal(`hz-${a.id}`, a.id, a.ppId, a.portaPP));
    cabos.push(patchNoRack(`pt-${a.id}`, a.ppId, a.portaPP, a.swId, a.portaSw));
  }
  return { ...base, equipamentos, cabos };
}

/** Pontos de rede para a interface (id do PC + nome + andar). */
export function pontosDeRede(m: ModeloFisico): { pc: string; nome: string; andar: number }[] {
  return m.equipamentos.filter((e) => e.tipo === 'pc').map((e) => ({ pc: e.id, nome: e.nome, andar: Number(e.salaId.replace('andar', '')) }));
}

export const ipsDaEmpresa = (m: ModeloFisico): Record<string, string> => {
  const ips: Record<string, string> = { rt: '203.0.113.2', fw: '10.0.0.1', core: '10.0.0.2', acc1: '10.0.0.3', acc2: '10.0.0.4', arq: '10.0.1.10', ad: '10.0.1.11', app: '10.0.1.12', virt1: '10.0.1.20', virt2: '10.0.1.21', nas: '10.0.1.30' };
  m.equipamentos.filter((e) => e.tipo === 'pc').forEach((e, i) => { ips[e.id] = `10.${10 + Number(e.salaId.replace('andar', ''))}.0.${10 + (i % 3)}`; });
  return ips;
};

export const salaDeEquip = (m: ModeloFisico): Record<string, string> => Object.fromEntries(m.equipamentos.map((e) => [e.id, e.salaId]));

/** Centro 3D de um equipamento de rack (para câmera, rótulo e destaque). */
export function centroNoRack(m: ModeloFisico, equipId: string): Ponto3 {
  const e = m.equipamentos.find((x) => x.id === equipId)!;
  const ins = m.instalacoes.find((i) => i.equipamentoId === equipId)!;
  return [0, RACK_BASE_Y + alturaDoU(ins, e), RACK_FRENTE];
}

/** Variante com defeitos de projeto, para mostrar a validação funcionando. Cada defeito é independente e identificável. */
export function comDefeitos(m: ModeloFisico): ModeloFisico {
  const c: ModeloFisico = JSON.parse(JSON.stringify(m));
  c.instalacoes.find((i) => i.equipamentoId === 'app')!.uInicial = 13; // 1) SRV-APP sobre SRV-AD
  c.equipamentos.find((e) => e.id === 'virt1')!.potenciaW = 2400; // 2) estoura a UPS
  const longo = c.cabos.find((x) => x.id === 'hz-pc-2-3')!; // 3) cabo horizontal com desvio enorme (canal > 100 m)
  longo.caminho = [...longo.caminho.slice(0, -1), [30, 9, -7], [-30, 9, -7], longo.caminho[longo.caminho.length - 1]];
  c.cabos.push({ id: 'dup-acc1-3', de: { equipamentoId: 'arq', porta: 2 }, para: { equipamentoId: 'acc1', porta: 3 }, meio: 'cobre', caminho: [[0, 0.5, 0.4], [0.1, 0.5, 0.4]] }); // 4) porta do ACC1 já usada
  return c;
}

export const resumoRack = (m: ModeloFisico) => {
  const ocupados = m.instalacoes.reduce((s, i) => s + (m.equipamentos.find((e) => e.id === i.equipamentoId)?.alturaU ?? 0), 0);
  const watts = m.instalacoes.reduce((s, i) => s + (m.equipamentos.find((e) => e.id === i.equipamentoId)?.potenciaW ?? 0), 0);
  return { ocupados, livres: RACK.totalU - ocupados, watts, capacidadeW: RACK.capacidadeW, cabos: m.cabos.length, metrosDeCabo: Math.round(m.cabos.reduce((s, c) => s + comprimentoTrechos(c.caminho), 0)) };
};

export const ALTURA_RACK_M = RACK.totalU * U_METROS;
export const baseDoRack = RACK_BASE_Y;
