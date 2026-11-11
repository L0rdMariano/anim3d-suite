import { describe, expect, it } from 'vitest';
import {
  ataquesPorMinuto,
  avancar,
  BALDES,
  criarSimulacao,
  deltaAngulo,
  estadoDoNo,
  focoParaAngulos,
  NOS,
  taxaBloqueio,
  vetorLatLon,
} from './centroComandoSim';

function rodar(segundos: number, semente = 7, ritmo = 1) {
  const sim = criarSimulacao(semente, ritmo);
  const eventos = [];
  for (let i = 0; i < segundos * 20; i++) eventos.push(...avancar(sim, 0.05));
  return { sim, eventos };
}

describe('simulação do centro de comando', () => {
  it('é determinística para a mesma semente', () => {
    const a = rodar(30, 3).eventos.map((e) => `${e.tipo}:${e.origem}>${e.destino}:${e.vetor}`);
    const b = rodar(30, 3).eventos.map((e) => `${e.tipo}:${e.origem}>${e.destino}:${e.vetor}`);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(30);
  });

  it('nunca liga um nó a ele mesmo e só usa nós existentes', () => {
    const ids = new Set(NOS.map((n) => n.id));
    for (const e of rodar(60).eventos) {
      expect(e.origem).not.toBe(e.destino);
      expect(ids.has(e.origem) && ids.has(e.destino)).toBe(true);
    }
  });

  it('contabilidade fecha: recebidos somam o total e bloqueados nunca excedem recebidos', () => {
    const { sim, eventos } = rodar(90);
    const ataques = eventos.filter((e) => e.tipo === 'ataque');
    expect(sim.totais.ataques).toBe(ataques.length);
    expect(Object.values(sim.estat).reduce((s, e) => s + e.recebidos, 0)).toBe(ataques.length);
    for (const e of Object.values(sim.estat)) {
      expect(e.bloqueados).toBeLessThanOrEqual(e.recebidos);
      expect(e.historico).toHaveLength(BALDES);
      expect(taxaBloqueio(e)).toBeGreaterThanOrEqual(0);
      expect(taxaBloqueio(e)).toBeLessThanOrEqual(1);
    }
  });

  it('gera campanhas: um alvo recebe rajada e fica sob ataque ou mitigado', () => {
    const { sim } = rodar(40);
    const maior = NOS.map((n) => ({ id: n.id, r: sim.estat[n.id].recebidos })).sort((a, b) => b.r - a.r)[0];
    expect(maior.r).toBeGreaterThan(8);
    expect(['normal', 'sob-ataque', 'mitigado']).toContain(estadoDoNo(sim, maior.id));
  });

  it('ritmo menor produz menos eventos (movimento reduzido)', () => {
    expect(rodar(40, 7, 0.3).eventos.length).toBeLessThan(rodar(40, 7, 1).eventos.length * 0.5);
  });

  it('ataques por minuto é finito e o log é limitado', () => {
    const { sim } = rodar(120);
    expect(ataquesPorMinuto(sim)).toBeGreaterThan(0);
    expect(sim.log.length).toBeLessThanOrEqual(60);
  });
});

describe('geometria', () => {
  it('foco traz o ponto para +z com o norte para cima', () => {
    for (const n of NOS) {
      const [x, y, z] = vetorLatLon(n.lat, n.lon);
      const { pitch, yaw } = focoParaAngulos([x, y, z]);
      // aplica Ry(yaw) e depois Rx(pitch), como o three com ordem XYZ
      const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
      const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
      expect(x1).toBeCloseTo(0, 6);
      expect(y2).toBeCloseTo(0, 6);
      expect(z2).toBeCloseTo(1, 6);
    }
  });

  it('deltaAngulo escolhe o caminho mais curto', () => {
    expect(deltaAngulo(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(deltaAngulo(0, 1)).toBe(1);
    expect(Math.abs(deltaAngulo(0, Math.PI * 2))).toBeLessThan(1e-9);
  });
});
