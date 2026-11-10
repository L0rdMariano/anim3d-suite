import { describe, expect, it } from 'vitest';
import { GEO, gerarAlmoxarifado, indicadores, meiaLargura, meioComprimento, statusDe } from './dados';
import { FAIXA, rota, Simulacao } from './simulacao';

function rodar(segundos: number) {
  const sim = new Simulacao(gerarAlmoxarifado(7));
  for (let t = 0; t < segundos; t += 0.05) sim.passo(0.05);
  return sim;
}

describe('almoxarifado: dados', () => {
  it('gera todas as posições endereçadas e únicas', () => {
    const a = gerarAlmoxarifado(7);
    expect(a.posicoes).toHaveLength(GEO.corredores * 2 * GEO.baias * GEO.niveis);
    expect(new Set(a.posicoes.map((p) => p.codigo)).size).toBe(a.posicoes.length);
    const k = indicadores(a);
    expect(k.ocupacao).toBeGreaterThan(0.6);
    expect(k.criticos + k.baixos).toBeGreaterThan(0);
  });
});

describe('almoxarifado: rotas', () => {
  it('passam pela faixa de circulação e nunca cortam as estantes', () => {
    const r = rota({ x: -10, z: 3 }, { x: 8, z: 20 });
    expect(r[0]).toEqual({ x: -10, z: FAIXA });
    expect(r.at(-1)).toEqual({ x: 8, z: 20 });
    // segmentos só horizontais ou verticais
    let ant = { x: -10, z: 3 };
    for (const p of r) {
      expect(p.x === ant.x || p.z === ant.z).toBe(true);
      ant = p;
    }
  });
});

describe('almoxarifado: operação de ponta a ponta', () => {
  const sim = rodar(900); // 15 h de operação

  it('o fluxo completo acontece: recebe, confere, armazena, separa, embala e expede', () => {
    const c = sim.cont;
    expect(c.caminhoesEntrada).toBeGreaterThan(2);
    expect(c.recebidos).toBeGreaterThan(8);
    expect(c.conferidos).toBeGreaterThan(5);
    expect(c.armazenados).toBeGreaterThan(5);
    expect(c.separados).toBeGreaterThan(5);
    expect(c.embaladas).toBeGreaterThan(10);
    expect(c.expedidas).toBeGreaterThan(10);
    expect(c.caminhoesSaida).toBeGreaterThan(0);
  });

  it('nada se perde: paletes recebidos = em trânsito + conferência + armazenados', () => {
    const naConferencia = sim.slots.filter((s) => s.carga).length;
    const nosGarfos = sim.empilhadeiras.filter((e) => e.carga && e.papel === 'recebimento').length;
    const indoGuardar = sim.empilhadeiras.filter((e) => e.carga && e.tarefa.startsWith('Armazenando')).length;
    expect(sim.cont.recebidos).toBe(sim.cont.armazenados + naConferencia + nosGarfos + indoGuardar);
  });

  it('empilhadeiras trabalham e ficam dentro do prédio', () => {
    for (const e of sim.empilhadeiras) {
      expect(e.viagens).toBeGreaterThan(2);
      expect(Number.isFinite(e.x) && Number.isFinite(e.z)).toBe(true);
      expect(Math.abs(e.x)).toBeLessThan(31);
      expect(e.z).toBeLessThan(24);
      expect(e.z).toBeGreaterThan(-meioComprimento - 1);
      expect(e.garfo).toBeGreaterThanOrEqual(0);
    }
    expect(meiaLargura).toBeLessThan(31);
  });

  it('estoque e esteira consistentes', () => {
    for (const p of sim.almox.posicoes) {
      expect(p.qtd).toBeGreaterThanOrEqual(0);
      if (statusDe(p) === 'vazio') expect(p.qtd === 0 || p.sku === null).toBe(true);
    }
    const s = [...sim.caixas].sort((a, b) => a.s - b.s);
    for (let i = 1; i < s.length; i++) expect(s[i].s - s[i - 1].s).toBeGreaterThan(0.8);
    expect(sim.historico.length).toBeGreaterThan(10);
    expect(sim.registros.length).toBeGreaterThan(10);
  });
});
