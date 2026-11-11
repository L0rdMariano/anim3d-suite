import { describe, expect, it } from 'vitest';
import { tracar } from '../../anim3d-topologia/exemplo/topologiaSim';
import { impactoDeFalha, ordemDeDescoberta } from '../motor/redeLogica';
import { ANCORA, camadaDe, comDesligado, layout, redeDaEmpresa, SEMENTE } from './redeExemplo';

describe('rede lógica da empresa (derivada dos cabos)', () => {
  const { topo, salaDe } = redeDaEmpresa();

  it('só aparecem dispositivos ativos: sem patch panel, tomada ou UPS', () => {
    const ids = topo.disps.map((d) => d.id);
    expect(ids.some((id) => /^(pp|tom)/.test(id) || id === 'ups')).toBe(false);
    expect(ids).toEqual(expect.arrayContaining(['rt', 'fw', 'core', 'acc1', 'acc2', 'arq', 'pc-2-3', 'ap-2']));
  });

  it('a descoberta a partir do núcleo encontra TODA a rede, em ondas crescentes', () => {
    const ordem = ordemDeDescoberta(topo, SEMENTE);
    expect(ordem).toHaveLength(topo.disps.length);
    expect(ordem[0]).toMatchObject({ id: SEMENTE, onda: 0 });
    const onda = (id: string) => ordem.find((o) => o.id === id)!.onda;
    expect(onda('fw')).toBe(1);
    expect(onda('rt')).toBe(2);
    expect(onda('acc1')).toBe(1);
    expect(onda('pc-0-1')).toBe(2);
  });

  it('com o SW-ACC2 desligado, a descoberta NÃO enxerga o 3º andar (estações e AP)', () => {
    const ordem = ordemDeDescoberta(comDesligado(topo, 'acc2'), SEMENTE).map((o) => o.id);
    for (const id of ['pc-2-1', 'pc-2-2', 'pc-2-3', 'ap-2']) expect(ordem).not.toContain(id);
    for (const id of ['pc-0-1', 'pc-1-1', 'ap-0', 'ap-1', 'arq']) expect(ordem).toContain(id);
  });

  it('o que a descoberta não vê é exatamente o que o impacto de falha acusa (estações)', () => {
    const t = comDesligado(topo, 'acc2');
    const vistos = new Set(ordemDeDescoberta(t, SEMENTE).map((o) => o.id));
    const impacto = impactoDeFalha(topo, 'acc2', ANCORA, salaDe);
    expect(impacto.semConexao.sort()).toEqual(['pc-2-1', 'pc-2-2', 'pc-2-3']);
    for (const id of impacto.semConexao) expect(vistos.has(id)).toBe(false);
  });

  it('o pacote da estação ao servidor é entregue, e para no switch desligado com o motivo', () => {
    expect(tracar(topo, 'pc-1-2', ANCORA, 'icmp').status).toBe('entregue');
    const r = tracar(comDesligado(topo, 'acc1'), 'pc-1-2', ANCORA, 'icmp');
    expect(r.status).toBe('descartado');
    expect(r.motivo).toMatch(/desligado/i);
  });

  it('layout: todo dispositivo tem posição dentro da área e camadas na ordem borda → pontas', () => {
    const pos = layout(topo, 760, 420);
    for (const d of topo.disps) {
      expect(pos[d.id]).toBeDefined();
      expect(pos[d.id].x).toBeGreaterThanOrEqual(0);
      expect(pos[d.id].x).toBeLessThanOrEqual(760);
    }
    expect(pos.rt.y).toBeLessThan(pos.fw.y);
    expect(pos.fw.y).toBeLessThan(pos.core.y);
    expect(pos.core.y).toBeLessThan(pos.acc1.y);
    expect(pos.acc1.y).toBeLessThan(pos['pc-0-1'].y);
    expect(camadaDe('ap-1')).toBe(4);
  });
});
