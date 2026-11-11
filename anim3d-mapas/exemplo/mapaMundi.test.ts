import { describe, expect, it } from 'vitest';
import { rotulosPaises } from './mapaMundi';

describe('mapa-múndi', () => {
  const r = rotulosPaises(46);
  const por = (n: string) => r.find((p) => p.nome === n);

  it('traz os maiores países com nome em português', () => {
    expect(r).toHaveLength(46);
    for (const n of ['Rússia', 'Brasil', 'Estados Unidos', 'China', 'Austrália', 'Índia']) expect(por(n), n).toBeDefined();
  });

  it('posiciona os rótulos no lugar certo do mundo', () => {
    const br = por('Brasil')!;
    expect(br.lat).toBeLessThan(0);
    expect(br.lat).toBeGreaterThan(-25);
    expect(br.lon).toBeGreaterThan(-65);
    expect(br.lon).toBeLessThan(-45);
    const au = por('Austrália')!;
    expect(au.lat).toBeLessThan(-20);
    expect(au.lon).toBeGreaterThan(125);
    const ind = por('Índia')!;
    expect(ind.lat).toBeGreaterThan(15);
    expect(ind.lon).toBeGreaterThan(75);
  });

  it('ordena do maior para o menor', () => {
    for (let i = 1; i < r.length; i++) expect(r[i - 1].peso).toBeGreaterThanOrEqual(r[i].peso);
  });
});
