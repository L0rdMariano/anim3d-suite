import { describe, expect, it } from 'vitest';
import { caminho, centroide, corEscala, densidade, ESTADOS, METRICAS, normalizar, pibPerCapita, posicao, ranking, TOTAIS, VIEWBOX } from './ibgeBrasil';

const uf = (sigla: string) => ESTADOS.find((e) => e.sigla === sigla)!;

describe('dados do IBGE por estado', () => {
  it('traz as 27 UFs com totais coerentes com o Censo 2022', () => {
    expect(ESTADOS).toHaveLength(27);
    expect(TOTAIS.populacao).toBeGreaterThan(203e6);
    expect(TOTAIS.populacao).toBeLessThan(204e6);
    expect(TOTAIS.municipios).toBe(5571); // 5.570 municípios + Distrito Federal
    expect(TOTAIS.areaKm2).toBeGreaterThan(8.4e6);
    expect(TOTAIS.areaKm2).toBeLessThan(8.6e6);
  });

  it('rankings conhecidos', () => {
    const m = (id: string) => METRICAS.find((x) => x.id === id)!;
    expect(ranking(m('populacao'))[0].sigla).toBe('SP');
    expect(ranking(m('area'))[0].sigla).toBe('AM');
    expect(ranking(m('densidade'))[0].sigla).toBe('DF');
    expect(ranking(m('municipios'))[0].sigla).toBe('MG');
    expect(ranking(m('pibpc'))[0].sigla).toBe('DF');
    expect(posicao(m('populacao'), uf('RR'))).toBe(27);
  });

  it('indicadores derivados fazem sentido', () => {
    expect(densidade(uf('SP'))).toBeGreaterThan(150);
    expect(densidade(uf('AM'))).toBeLessThan(3);
    expect(pibPerCapita(uf('DF'))).toBeGreaterThan(pibPerCapita(uf('MA')) * 2);
  });
});

describe('mapa', () => {
  it('cada estado gera um caminho SVG e o centro fica dentro do viewBox', () => {
    for (const e of ESTADOS) {
      expect(caminho(e).startsWith('M'), e.sigla).toBe(true);
      const [x, y] = centroide(e);
      expect(x, e.sigla).toBeGreaterThan(0);
      expect(x, e.sigla).toBeLessThan(VIEWBOX.largura);
      expect(y, e.sigla).toBeGreaterThan(0);
      expect(y, e.sigla).toBeLessThan(VIEWBOX.altura);
    }
  });

  it('norte fica acima do sul e oeste à esquerda do leste', () => {
    expect(centroide(uf('RR'))[1]).toBeLessThan(centroide(uf('RS'))[1]);
    expect(centroide(uf('AC'))[0]).toBeLessThan(centroide(uf('PB'))[0]);
  });

  it('escala de cor vai de 0 a 1 e é monotônica no mínimo e no máximo', () => {
    const m = METRICAS[0];
    expect(normalizar(m, m.valor(uf('RR')))).toBeCloseTo(0, 6);
    expect(normalizar(m, m.valor(uf('SP')))).toBeCloseTo(1, 6);
    expect(corEscala(0)).not.toBe(corEscala(1));
    expect(corEscala(-5)).toBe(corEscala(0));
    expect(corEscala(9)).toBe(corEscala(1));
  });
});
