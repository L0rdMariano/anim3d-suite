import { describe, expect, it } from 'vitest';
import { centroidePais, paisNoPonto, uvParaLatLon } from './mapaPaises';
import { idPorAlfa3, infoPais } from './paisesInfo';

describe('país sob um ponto do mapa', () => {
  it('acha países conhecidos pelas coordenadas', () => {
    expect(paisNoPonto(-10, -52)?.nome).toBe('Brazil');
    expect(paisNoPonto(40, -100)?.nome).toBe('United States of America');
    expect(paisNoPonto(35.7, 139.7)?.nome).toBe('Japan');
    expect(paisNoPonto(48.8, 2.3)?.nome).toBe('France');
    expect(paisNoPonto(-25, 134)?.nome).toBe('Australia');
    expect(paisNoPonto(66, -175)?.nome).toBe('Russia'); // Chukotka, a leste da linha de data
    expect(paisNoPonto(66, 175)?.nome).toBe('Russia');
  });

  it('devolve null no oceano', () => {
    expect(paisNoPonto(0, -30)).toBeNull(); // Atlântico
    expect(paisNoPonto(-40, -120)).toBeNull(); // Pacífico Sul
  });

  it('uv de textura vira latitude/longitude (v=1 é o polo norte)', () => {
    expect(uvParaLatLon(0.5, 0.5)).toEqual({ lon: 0, lat: 0 });
    expect(uvParaLatLon(0, 1)).toEqual({ lon: -180, lat: 90 });
  });

  it('o centro do país cai dentro dele (Brasil, EUA, Rússia)', () => {
    for (const id of ['076', '840', '643']) {
      const c = centroidePais(id)!;
      expect(c, id).not.toBeNull();
      expect(paisNoPonto(c.lat, c.lon)?.id, id).toBe(id);
    }
  });
});

describe('ficha de país', () => {
  it('o id do mapa casa com os dados (nome em português, capital, fronteiras)', () => {
    const br = infoPais(paisNoPonto(-10, -52)!.id)!;
    expect(br.n).toBe('Brasil');
    expect(br.c).toBe('Brasília');
    expect(br.b).toContain('ARG');
    expect(infoPais(idPorAlfa3('ARG')!)?.n).toBe('Argentina');
    if (br.p !== null) expect(br.p).toBeGreaterThan(200e6); // sem população na versão offline (npm run dados completa)
  });
});
