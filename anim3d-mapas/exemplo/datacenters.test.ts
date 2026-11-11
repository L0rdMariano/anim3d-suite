import { describe, expect, it } from 'vitest';
import { DATACENTERS, dataCentersDoPais } from './datacenters';
import { idPorAlfa3, infoPais } from './paisesInfo';

describe('hubs de data center', () => {
  it('ids únicos e coordenadas válidas', () => {
    expect(new Set(DATACENTERS.map((d) => d.id)).size).toBe(DATACENTERS.length);
    for (const d of DATACENTERS) {
      expect(d.lat, d.id).toBeGreaterThanOrEqual(-90);
      expect(d.lat, d.id).toBeLessThanOrEqual(90);
      expect(d.lon, d.id).toBeGreaterThanOrEqual(-180);
      expect(d.lon, d.id).toBeLessThanOrEqual(180);
    }
  });

  it('todo hub aponta para um país que existe nos dados (cada país tem ficha)', () => {
    for (const d of DATACENTERS) {
      const id = idPorAlfa3(d.pais);
      expect(id, `${d.cidade} → ${d.pais}`).toBeDefined();
      expect(infoPais(id!)?.g).toBe(d.pais);
    }
  });

  it('o hub cai perto do país certo (sanidade de coordenadas)', () => {
    const brasil = dataCentersDoPais('BRA');
    expect(brasil.length).toBeGreaterThanOrEqual(5);
    for (const d of brasil) {
      expect(d.lat).toBeLessThan(6);
      expect(d.lat).toBeGreaterThan(-34);
      expect(d.lon).toBeLessThan(-34);
      expect(d.lon).toBeGreaterThan(-74);
    }
    expect(dataCentersDoPais('USA').length).toBeGreaterThanOrEqual(8);
    expect(dataCentersDoPais('XXX')).toEqual([]);
  });

  it('nenhum nome de empresa na lista (regra da suíte: conteúdo genérico)', () => {
    const proibidos = /aws|amazon|azure|microsoft|google|equinix|digital realty|oracle|alibaba|meta\b/i;
    for (const d of DATACENTERS) expect(proibidos.test(d.cidade), d.cidade).toBe(false);
  });
});
