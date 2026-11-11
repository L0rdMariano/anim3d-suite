import { describe, expect, it } from 'vitest';
import { posicaoExterna } from '../../anim3d-infra-fisica/exemplo/empresaDados';
import { apsDaEmpresa, cobertura, LARGURA, paredes, PROFUNDIDADE } from './wifiDados';

describe('Wi-Fi do prédio do exemplo', () => {
  const aps = apsDaEmpresa();

  it('os APs vêm do modelo do rack e ficam dentro da planta', () => {
    expect(aps).toHaveLength(3);
    for (const ap of aps) {
      const p = posicaoExterna(ap.id);
      expect(ap.x).toBeCloseTo(p[0] + 3);
      expect(ap.y).toBeCloseTo(p[2] + 8);
      expect(ap.x).toBeGreaterThan(0);
      expect(ap.x).toBeLessThan(LARGURA);
      expect(ap.y).toBeGreaterThan(0);
      expect(ap.y).toBeLessThan(PROFUNDIDADE);
    }
  });

  it('cada parede pertence a um andar válido e tem comprimento', () => {
    for (const w of paredes()) {
      expect([0, 1, 2]).toContain(w.andar);
      expect(Math.hypot(w.x2 - w.x1, w.y2 - w.y1)).toBeGreaterThan(0);
    }
  });

  it('2,4 GHz cobre mais área "boa" (−67 dBm) que 5 GHz em todos os andares', () => {
    for (const andar of [0, 1, 2]) {
      const a24 = cobertura(aps, '2.4', andar).resumo.bom;
      const a5 = cobertura(aps, '5', andar).resumo.bom;
      expect(a24).toBeGreaterThanOrEqual(a5);
    }
    // e há diferença real em pelo menos um andar, senão a tela não ensina nada
    expect([0, 1, 2].some((a) => cobertura(aps, '2.4', a).resumo.bom > cobertura(aps, '5', a).resumo.bom)).toBe(true);
  });

  it('o poço de elevador em concreto cria sombra: o lado oposto ao AP perde sinal', () => {
    const celulas = cobertura(aps, '5', 2).celulas;
    const dbm = (x: number, y: number) => celulas.reduce((m, c) => (Math.hypot(c.x - x, c.y - y) < Math.hypot(m.x - x, m.y - y) ? c : m)).dbm;
    // AP do 3º andar em (19,8); poço em x 12..16. Ponto atrás do poço vs ponto à mesma distância, sem parede no caminho.
    const atras = dbm(10.5, 8); // 8,5 m, atravessa 2 paredes de concreto do poço (e a divisória em x=10 não está no caminho: fica em 10)
    const livre = dbm(19, 16); // 8 m, sem paredes
    expect(atras).toBeLessThan(livre - 15);
  });

  it('mover o AP muda a cobertura (o mapa responde ao modelo)', () => {
    const base = cobertura(aps, '5', 0).resumo.bom;
    const dentroDaSalaDeTI = aps.map((a) => (a.andar === 0 ? { ...a, x: 3, y: 8 } : a)); // AP trancado na sala de concreto
    expect(cobertura(dentroDaSalaDeTI, '5', 0).resumo.bom).toBeLessThan(base - 0.3);
  });

  it('o AP do próprio andar aumenta a cobertura boa em relação ao AP de baixo sozinho (laje atenua)', () => {
    const so0 = aps.filter((a) => a.andar === 0);
    const andar1Sem = cobertura(so0, '2.4', 1).resumo.bom;
    const andar1Com = cobertura(aps, '2.4', 1).resumo.bom;
    expect(andar1Com).toBeGreaterThan(andar1Sem);
  });
});
