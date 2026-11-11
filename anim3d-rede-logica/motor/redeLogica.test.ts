import { describe, expect, it } from 'vitest';
import type { Cabo, Equipamento, ModeloFisico } from '../../anim3d-infra-fisica/motor/infraFisica';
import { tracar } from '../../anim3d-topologia/exemplo/topologiaSim';
import { gerarTopologiaLogica, impactoDeFalha, ordemDeDescoberta } from './redeLogica';

const e = (id: string, tipo: Equipamento['tipo'], salaId: string): Equipamento => ({ id, nome: id, tipo, alturaU: 1, potenciaW: 50, portas: 24, salaId });
const cabo = (id: string, a: string, pa: number, b: string, pb: number, x = 5): Cabo => ({ id, de: { equipamentoId: a, porta: pa }, para: { equipamentoId: b, porta: pb }, meio: 'cobre', caminho: [[0, 0, 0], [x, 0, 0]] });

// pc1 (sala1) → tomada → patch panel porta 7 → sw1 (sala de servidores). srv em sw1. pc2 (sala2) em sw2, que sobe para sw1.
const m: ModeloFisico = {
  racks: [], instalacoes: [],
  equipamentos: [e('pc1', 'pc', 's1'), e('tom1', 'tomada', 's1'), e('pp', 'patch-panel', 'srv'), e('sw1', 'switch', 'srv'), e('srv', 'servidor', 'srv'), e('sw2', 'switch', 's2'), e('pc2', 'pc', 's2')],
  cabos: [cabo('c1', 'pc1', 1, 'tom1', 1, 3), cabo('c2', 'tom1', 1, 'pp', 7, 20), cabo('c3', 'pp', 7, 'sw1', 3, 1), cabo('c4', 'srv', 1, 'sw1', 1), cabo('c5', 'sw1', 24, 'sw2', 24, 30), cabo('c6', 'pc2', 1, 'sw2', 2, 4)],
};
const salaDe = { pc1: 's1', pc2: 's2', srv: 'srv', sw1: 'srv', sw2: 's2' };

describe('topologia lógica a partir da física', () => {
  const t = gerarTopologiaLogica(m);
  it('patch panel e tomada são atravessados: o PC liga direto no switch', () => {
    expect(t.disps.map((d) => d.id).sort()).toEqual(['pc1', 'pc2', 'srv', 'sw1', 'sw2']);
    const l = t.enlaces.find((x) => x.a === 'pc1' || x.b === 'pc1')!;
    expect([l.a, l.b].sort()).toEqual(['pc1', 'sw1']);
    expect(l.ms).toBeCloseTo((3 + 20 + 1) * 0.005);
  });
  it('porta errada no patch panel: o enlace não se forma', () => {
    const quebrado = { ...m, cabos: m.cabos.map((c) => (c.id === 'c3' ? cabo('c3', 'pp', 8, 'sw1', 3, 1) : c)) };
    expect(gerarTopologiaLogica(quebrado).enlaces.some((x) => x.a === 'pc1' || x.b === 'pc1')).toBe(false);
  });
  it('o motor de pacotes de anim3d-topologia roda sobre ela', () => {
    expect(tracar(t, 'pc2', 'srv', 'icmp').status).toBe('entregue');
  });
});

describe('impacto de falha e descoberta', () => {
  const t = gerarTopologiaLogica(m);
  it('desligar o switch da sala de servidores isola as duas salas', () => {
    const r = impactoDeFalha(t, 'sw1', 'srv', salaDe);
    expect(r.semConexao.sort()).toEqual(['pc1', 'pc2']);
    expect(r.salasTotalmenteIsoladas.sort()).toEqual(['s1', 's2']);
  });
  it('desligar o switch da sala 2 só afeta a sala 2', () => {
    expect(impactoDeFalha(t, 'sw2', 'srv', salaDe).salasAfetadas).toEqual(['s2']);
  });
  it('âncora desligada: todos ficam sem conexão, sem lançar erro', () => {
    const r = impactoDeFalha(t, 'srv', 'srv', salaDe);
    expect(r.semConexao.sort()).toEqual(['pc1', 'pc2']);
  });
  it('descoberta não atravessa switch desligado nem parte de semente desligada', () => {
    const off = { ...t, disps: t.disps.map((d) => (d.id === 'sw1' ? { ...d, ligado: false } : d)) };
    expect(ordemDeDescoberta(off, 'srv').map((x) => x.id)).toEqual(['srv']); // sw1 era a única saída do servidor
    expect(ordemDeDescoberta(off, 'sw1')).toEqual([]);
  });
  it('descoberta em ondas a partir do servidor', () => {
    const o = ordemDeDescoberta(t, 'srv');
    expect(o[0]).toEqual({ id: 'srv', via: null, onda: 0 });
    expect(o.find((x) => x.id === 'sw1')!.onda).toBe(1);
    expect(o.find((x) => x.id === 'pc2')!.onda).toBe(3);
    expect(o).toHaveLength(5);
  });
});
