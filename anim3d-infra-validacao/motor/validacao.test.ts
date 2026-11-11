import { describe, expect, it } from 'vitest';
import type { Cabo, Equipamento, ModeloFisico } from '../../anim3d-infra-fisica/motor/infraFisica';
import { diferencaComRealidade, inventario, validarProjeto } from './validacao';

const e = (id: string, tipo: Equipamento['tipo'], extra: Partial<Equipamento> = {}): Equipamento => ({ id, nome: id, tipo, alturaU: 1, potenciaW: 100, portas: 24, salaId: 's', ...extra });
const cabo = (id: string, a: string, pa: number, b: string, pb: number, x = 5, meio: Cabo['meio'] = 'cobre'): Cabo => ({ id, de: { equipamentoId: a, porta: pa }, para: { equipamentoId: b, porta: pb }, meio, caminho: [[0, 0, 0], [x, 0, 0]] });
const base = (): ModeloFisico => ({
  racks: [{ id: 'r1', nome: 'Rack A', totalU: 10, salaId: 's', capacidadeW: 500 }],
  equipamentos: [e('sw', 'switch'), e('srv', 'servidor', { alturaU: 2, potenciaW: 300 }), e('pc', 'pc')],
  instalacoes: [{ equipamentoId: 'sw', rackId: 'r1', uInicial: 1 }, { equipamentoId: 'srv', rackId: 'r1', uInicial: 3 }],
  cabos: [cabo('c1', 'srv', 1, 'sw', 1), cabo('c2', 'pc', 1, 'sw', 2)],
});
const regras = (m: ModeloFisico) => validarProjeto(m).map((a) => `${a.severidade}:${a.regra}`);

describe('validação do projeto', () => {
  it('projeto consistente passa', () => {
    expect(validarProjeto(base())).toEqual([]);
  });
  it('rack sobreposto', () => {
    const m = base();
    m.instalacoes[1].uInicial = 1;
    expect(regras(m)).toContain('erro:rack-sobreposicao');
  });
  it('energia: aviso acima de 80% e erro acima da capacidade', () => {
    const m = base(); // 400 W de 500
    expect(regras(m)).toEqual([]);
    m.equipamentos[1].potenciaW = 340; // 440 W = 88%
    expect(regras(m)).toEqual(['aviso:energia-rack']);
    m.equipamentos[1].potenciaW = 450; // 550 W
    expect(regras(m)).toEqual(['erro:energia-rack']);
  });
  it('porta inexistente e porta usada por dois cabos', () => {
    const m = base();
    m.cabos.push(cabo('c3', 'pc', 1, 'sw', 99), cabo('c4', 'srv', 1, 'sw', 5));
    const r = regras(m);
    expect(r).toContain('erro:porta-inexistente');
    expect(r).toContain('erro:porta-duplicada'); // srv porta 1 em c1 e c4
  });
  it('cobre acima de 100 m é erro, fibra não', () => {
    const m = base();
    m.cabos.push(cabo('c5', 'pc', 3, 'sw', 3, 99)); // 99 + 3 de folga
    expect(regras(m)).toContain('erro:cabo-comprimento');
    m.cabos[2].meio = 'fibra';
    expect(regras(m)).not.toContain('erro:cabo-comprimento');
  });
  it('canal acima de 100 m é erro mesmo com cada cabo abaixo do limite', () => {
    const m = base();
    m.equipamentos.push(e('pc9', 'pc', { alturaU: 0 }), e('tom', 'tomada', { portas: 1, potenciaW: 0 }), e('pp2', 'patch-panel', { potenciaW: 0 }));
    m.instalacoes.push({ equipamentoId: 'pp2', rackId: 'r1', uInicial: 6 });
    // 3 + 90 + 1: nenhum cabo passa de 100 m sozinho, o canal (94 + 3 de folga = 97) ainda cabe
    m.cabos.push(cabo('h1', 'pc9', 1, 'tom', 1, 3), cabo('h2', 'tom', 1, 'pp2', 4, 90), cabo('h3', 'pp2', 4, 'sw', 9, 1));
    expect(regras(m)).not.toContain('erro:canal-comprimento');
    m.cabos.find((c) => c.id === 'h2')!.caminho = [[0, 0, 0], [97, 0, 0]]; // cabo 97+3 = 100 ok; canal 101 + 3 = 104
    const r = validarProjeto(m);
    expect(r.map((x) => x.regra)).toContain('canal-comprimento');
    expect(r.map((x) => x.regra)).not.toContain('cabo-comprimento');
  });
  it('patch panel aceita dois cabos na mesma porta (frente e fundo)', () => {
    const m = base();
    m.equipamentos.push(e('pp', 'patch-panel', { potenciaW: 0 }));
    m.instalacoes.push({ equipamentoId: 'pp', rackId: 'r1', uInicial: 6 });
    m.cabos.push(cabo('c6', 'pc', 4, 'pp', 7), cabo('c7', 'pp', 7, 'sw', 4));
    expect(regras(m)).toEqual([]);
  });
  it('ativo de rack fora de rack gera aviso', () => {
    const m = base();
    m.instalacoes.pop();
    expect(regras(m)).toContain('aviso:sem-rack');
  });
});

describe('inventário e gêmeo digital', () => {
  it('inventário traz rack, U e portas usadas', () => {
    const inv = inventario(base());
    expect(inv.find((x) => x.id === 'srv')).toMatchObject({ rack: 'Rack A', u: 'U3-U4', portasUsadas: 1 });
    expect(inv.find((x) => x.id === 'pc')!.rack).toBe('—');
  });
  it('compara projeto com a rede real, em qualquer ordem de extremos', () => {
    const d = diferencaComRealidade(base(), { equipamentos: ['sw', 'srv', 'camera9'], cabos: ['sw:1|srv:1', 'sw:7|camera9:1'] });
    expect(d.equipamentosAusentes).toEqual(['pc']);
    expect(d.equipamentosDesconhecidos).toEqual(['camera9']);
    expect(d.cabosAusentes).toEqual(['pc:1|sw:2']);
    expect(d.cabosNaoDocumentados).toEqual(['camera9:1|sw:7']);
  });
});
