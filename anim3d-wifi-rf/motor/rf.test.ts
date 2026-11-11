import { describe, expect, it } from 'vitest';
import { mapaDeCobertura, nivelDe, percentualCoberto, perdaEspacoLivreDb, sinalEm, type AP, type Parede } from './rf';

const ap: AP = { id: 'ap1', x: 0, y: 5, andar: 0, txDbm: 20 };
const parede = (material: Parede['material'], x = 5): Parede => ({ x1: x, y1: 0, x2: x, y2: 10, andar: 0, material });

describe('propagação', () => {
  it('espaço livre a 1 m em 2,4 GHz fica perto de 40 dB', () => {
    expect(perdaEspacoLivreDb(1, '2.4')).toBeGreaterThan(39);
    expect(perdaEspacoLivreDb(1, '2.4')).toBeLessThan(42);
  });
  it('a parede cruzada tira exatamente a perda do material', () => {
    const livre = sinalEm(ap, { x: 10, y: 5, andar: 0 }, [], '2.4');
    expect(livre - sinalEm(ap, { x: 10, y: 5, andar: 0 }, [parede('concreto')], '2.4')).toBeCloseTo(12);
  });
  it('parede que NÃO está no caminho não conta', () => {
    const livre = sinalEm(ap, { x: 4, y: 5, andar: 0 }, [], '2.4');
    expect(sinalEm(ap, { x: 4, y: 5, andar: 0 }, [parede('concreto')], '2.4')).toBe(livre);
  });
  it('5 GHz sofre mais que 2,4 GHz na mesma distância e parede', () => {
    const p = { x: 10, y: 5, andar: 0 };
    const w = [parede('tijolo')];
    expect(sinalEm(ap, p, w, '5')).toBeLessThan(sinalEm(ap, p, w, '2.4') - 6);
  });
  it('laje entre andares atenua mais do que a distância sozinha', () => {
    const acima = sinalEm(ap, { x: 0, y: 5, andar: 1 }, [], '2.4');
    const mesmoAndar3m = sinalEm(ap, { x: 3, y: 5, andar: 0 }, [], '2.4');
    expect(acima).toBeLessThan(mesmoAndar3m - 10);
  });
  it('limiares de nível', () => {
    expect([-60, -70, -80, -90].map(nivelDe)).toEqual(['bom', 'aceitavel', 'fraco', 'sem-sinal']);
  });
});

describe('mapa de cobertura', () => {
  it('a parede de concreto divide a cobertura (não é um círculo)', () => {
    const area = { largura: 20, profundidade: 10, andar: 0 };
    const sem = percentualCoberto(mapaDeCobertura([ap], [], '5', area), 'bom');
    const com = percentualCoberto(mapaDeCobertura([ap], [parede('concreto', 6)], '5', area), 'bom');
    expect(com).toBeLessThan(sem);
  });
  it('cada célula escolhe o melhor AP', () => {
    const celulas = mapaDeCobertura([ap, { ...ap, id: 'ap2', x: 20 }], [], '2.4', { largura: 20, profundidade: 10, andar: 0 });
    expect(celulas.find((c) => c.x < 3)!.ap).toBe('ap1');
    expect(celulas.find((c) => c.x > 17)!.ap).toBe('ap2');
  });
});
