import { describe, expect, it } from 'vitest';
import { criarLinha, escalonar } from './linha';
import { emRepouso, MOLAS, passoMola, passoMolaVetor, regime, tempoDeAssentamento, zeta, type EstadoMola, type ParamMola } from './mola';

const simular = (p: ParamMola, dt: number, total: number, alvo = 1): EstadoMola[] => {
  let e: EstadoMola = { x: 0, v: 0 };
  const saida = [e];
  for (let t = 0; t < total - 1e-9; t += dt) {
    e = passoMola(p, e, alvo, dt);
    saida.push(e);
  }
  return saida;
};

describe('mola analítica', () => {
  it('converge ao alvo em todos os presets', () => {
    for (const [nome, p] of Object.entries(MOLAS)) {
      const f = simular(p, 1 / 60, 8).at(-1)!;
      expect(f.x, nome).toBeCloseTo(1, 3);
      expect(Math.abs(f.v), nome).toBeLessThan(1e-2);
    }
  });

  it('independe do FPS: um passo de 1 s = 120 passos de 1/120 s = dois passos desiguais', () => {
    for (const p of Object.values(MOLAS)) {
      const a = passoMola(p, { x: 0, v: 3 }, 1, 1);
      let b: EstadoMola = { x: 0, v: 3 };
      for (let i = 0; i < 120; i++) b = passoMola(p, b, 1, 1 / 120);
      const c = passoMola(p, passoMola(p, { x: 0, v: 3 }, 1, 0.3), 1, 0.7);
      expect(b.x).toBeCloseTo(a.x, 9);
      expect(b.v).toBeCloseTo(a.v, 8);
      expect(c.x).toBeCloseTo(a.x, 9);
    }
  });

  it('é estável com dt enorme (aba que ficou oculta): sem NaN, sem explosão', () => {
    for (const p of Object.values(MOLAS)) {
      const r = passoMola(p, { x: 0, v: 0 }, 1, 30);
      expect(Number.isFinite(r.x) && Number.isFinite(r.v)).toBe(true);
      expect(r.x).toBeCloseTo(1, 6);
    }
  });

  it('regimes: crítica não ultrapassa o alvo; elástica ultrapassa; superamortecida é lenta e sem ultrapassar', () => {
    const critica: ParamMola = { rigidez: 100, amortecimento: 20, massa: 1 }; // ζ = 1
    expect(regime(critica)).toBe('critica');
    expect(Math.max(...simular(critica, 1 / 120, 3).map((e) => e.x))).toBeLessThanOrEqual(1 + 1e-9);

    expect(regime(MOLAS.elastica)).toBe('subamortecida');
    expect(Math.max(...simular(MOLAS.elastica, 1 / 120, 3).map((e) => e.x))).toBeGreaterThan(1.1); // overshoot visível

    const lenta: ParamMola = { rigidez: 100, amortecimento: 40, massa: 1 }; // ζ = 2
    expect(regime(lenta)).toBe('superamortecida');
    expect(Math.max(...simular(lenta, 1 / 120, 6).map((e) => e.x))).toBeLessThanOrEqual(1 + 1e-9);
    expect(tempoDeAssentamento(lenta)).toBeGreaterThan(tempoDeAssentamento(critica));
  });

  it('o fator ζ dos presets bate com a descrição', () => {
    expect(zeta(MOLAS.elastica)).toBeLessThan(0.6);
    expect(zeta(MOLAS.suave)).toBeGreaterThan(0.95);
    expect(zeta(MOLAS.pesada)).toBeGreaterThan(1);
  });

  it('continua de onde estava ao trocar o alvo (sem salto de posição nem de velocidade)', () => {
    const p = MOLAS.padrao;
    const antes = simular(p, 1 / 60, 0.2).at(-1)!;
    const depois = passoMola(p, antes, 5, 0); // troca de alvo no mesmo instante
    expect(depois.x).toBe(antes.x);
    expect(depois.v).toBe(antes.v);
    const logo = passoMola(p, antes, 5, 1 / 240);
    expect(Math.abs(logo.x - antes.x)).toBeLessThan(0.1); // movimento contínuo
  });

  it('repouso e tempo de assentamento', () => {
    expect(emRepouso({ x: 1.0004, v: 0.0002 }, 1)).toBe(true);
    expect(emRepouso({ x: 1.2, v: 0 }, 1)).toBe(false);
    expect(tempoDeAssentamento(MOLAS.firme)).toBeLessThan(tempoDeAssentamento(MOLAS.pesada));
    expect(tempoDeAssentamento(MOLAS.elastica)).toBeGreaterThan(0);
  });

  it('versão vetorial anda cada eixo de forma independente', () => {
    const r = passoMolaVetor(MOLAS.padrao, { x: [0, 10], v: [0, 0] }, [1, 10], 0.1);
    expect(r.x[0]).toBeGreaterThan(0);
    expect(r.x[1]).toBe(10); // já estava no alvo
  });
});

describe('linha do tempo', () => {
  const linha = criarLinha(
    [
      { chave: 'x', quadros: [{ t: 0, valor: 0 }, { t: 1, valor: 10 }, { t: 3, valor: 4 }] },
      { chave: 'opacidade', quadros: [{ t: 0.5, valor: 0 }, { t: 1.5, valor: 1, ease: (k) => k }] },
    ],
    { rotulos: { entrada: 0, topo: 1 } },
  );

  it('acerta os valores nos quadros-chave e fixa nas pontas', () => {
    expect(linha.em(0).x).toBe(0);
    expect(linha.em(1).x).toBe(10);
    expect(linha.em(3).x).toBe(4);
    expect(linha.em(99).x).toBe(4);
    expect(linha.em(-5).x).toBe(0);
    expect(linha.em(0.2).opacidade).toBe(0); // antes do primeiro quadro da faixa
    expect(linha.duracao).toBe(3);
  });

  it('é contínua (sem saltos entre trechos)', () => {
    for (let t = 0.001; t < 3; t += 0.01) {
      const d = Math.abs(linha.em(t + 0.001).x - linha.em(t).x);
      expect(d).toBeLessThan(0.2);
    }
    expect(Math.abs(linha.em(1 + 1e-9).x - linha.em(1 - 1e-9).x)).toBeLessThan(1e-4);
  });

  it('usa a curva do quadro de chegada (linear na opacidade)', () => {
    expect(linha.em(1).opacidade).toBeCloseTo(0.5, 6);
  });

  it('rótulos e erro para rótulo inexistente', () => {
    expect(linha.rotulo('topo')).toBe(1);
    expect(() => linha.rotulo('nada')).toThrow();
  });

  it('laço fecha sem salto e vai-e-vem é simétrico', () => {
    const l = criarLinha([{ chave: 'a', quadros: [{ t: 0, valor: 0 }, { t: 2, valor: 1 }] }], { repetir: 'vaivem' });
    expect(l.em(0.5).a).toBeCloseTo(l.em(3.5).a, 9);
    expect(l.em(2).a).toBeCloseTo(1, 9);
    expect(l.em(4).a).toBeCloseTo(0, 9);
    const laco = criarLinha([{ chave: 'a', quadros: [{ t: 0, valor: 0 }, { t: 2, valor: 1 }, { t: 2, valor: 0 }] }], { repetir: 'laco' });
    expect(laco.em(0.7).a).toBeCloseTo(laco.em(2.7).a, 9);
  });

  it('escalonar espalha os atrasos de 0 ao total', () => {
    expect([0, 1, 2, 3].map((i) => escalonar(i, 4, 0.3))).toEqual([0, 0.1, 0.2, 0.3].map((v) => expect.closeTo(v, 9)));
    expect(escalonar(0, 1, 5)).toBe(0);
  });
});
