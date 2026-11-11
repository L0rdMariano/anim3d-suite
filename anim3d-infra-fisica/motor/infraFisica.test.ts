import { describe, expect, it } from 'vitest';
import { acharVaga, alturaDoU, comprimentoCabo, comprimentoTrechos, ocupacaoRack, rotearPelaEletrocalha, U_METROS, type Equipamento, type Ponto3, type Rack } from './infraFisica';

const rack: Rack = { id: 'r1', nome: 'Rack A', totalU: 12, salaId: 's1', capacidadeW: 2000 };
const eq = (id: string, alturaU: number): Equipamento => ({ id, nome: id, tipo: 'servidor', alturaU, potenciaW: 300, portas: 4, salaId: 's1' });

describe('rack em U', () => {
  it('detecta sobreposição e diz em quais U', () => {
    const o = ocupacaoRack(rack, [{ equipamentoId: 'a', rackId: 'r1', uInicial: 1 }, { equipamentoId: 'b', rackId: 'r1', uInicial: 2 }], [eq('a', 2), eq('b', 2)]);
    expect(o.conflitos).toEqual([{ u: 2, ids: ['a', 'b'] }]);
  });
  it('equipamento que passa do topo vai para foraDoRack', () => {
    const o = ocupacaoRack(rack, [{ equipamentoId: 'a', rackId: 'r1', uInicial: 12 }], [eq('a', 2)]);
    expect(o.foraDoRack).toEqual(['a']);
  });
  it('acha a primeira vaga que comporta a altura inteira', () => {
    const o = ocupacaoRack(rack, [{ equipamentoId: 'a', rackId: 'r1', uInicial: 2 }], [eq('a', 1)]);
    expect(acharVaga(o, 1)).toBe(1);
    expect(acharVaga(o, 2)).toBe(3); // o U1 sozinho não comporta 2U
    expect(acharVaga(o, 13)).toBeNull();
  });
  it('altura do centro do equipamento usa 44,45 mm por U', () => {
    expect(alturaDoU({ equipamentoId: 'a', rackId: 'r1', uInicial: 3 }, eq('a', 2))).toBeCloseTo(3 * U_METROS);
  });
});

describe('cabo pela eletrocalha', () => {
  const g = { nos: { a: [0, 3, 0], b: [10, 3, 0], c: [10, 3, 8] } as Record<string, Ponto3>, trechos: [['a', 'b'], ['b', 'c']] as [string, string][] };
  it('segue a calha (sobe, atravessa, desce), mais longo que a linha reta', () => {
    const origem: Ponto3 = [0, 1, 0];
    const destino: Ponto3 = [10, 1, 8];
    const caminho = rotearPelaEletrocalha(g, origem, destino)!;
    expect(caminho).toHaveLength(5);
    expect(comprimentoTrechos(caminho)).toBeCloseTo(2 + 10 + 8 + 2);
    expect(comprimentoTrechos(caminho)).toBeGreaterThan(Math.hypot(10, 0, 8));
  });
  it('o nó mais próximo pode ser da calha errada: fixe o nó quando há andares', () => {
    const andares = { nos: { f0: [0, 2.6, 0], f1: [0, 5.8, 0], p: [10, 2.6, 0] } as Record<string, Ponto3>, trechos: [['f0', 'p'], ['f1', 'f0']] as [string, string][] };
    const tomada1: Ponto3 = [0, 3.6, 0]; // 2º andar: mais perto de f0 (1,0 m) que de f1 (2,2 m)
    expect(rotearPelaEletrocalha(andares, tomada1, [10, 1, 0])![1]).toEqual([0, 2.6, 0]); // errado: pegou o térreo
    expect(rotearPelaEletrocalha(andares, tomada1, [10, 1, 0], { origem: 'f1' })![1]).toEqual([0, 5.8, 0]);
    expect(rotearPelaEletrocalha(andares, tomada1, [10, 1, 0], { origem: 'nao-existe' })).toBeNull();
  });
  it('folga de manobra entra nas duas pontas', () => {
    expect(comprimentoCabo([[0, 0, 0], [4, 0, 0]], 1.5)).toBe(7);
  });
  it('calha desconectada: sem caminho', () => {
    expect(rotearPelaEletrocalha({ nos: g.nos, trechos: [['a', 'b']] }, [0, 1, 0], [10, 1, 8])).toBeNull();
  });
});
