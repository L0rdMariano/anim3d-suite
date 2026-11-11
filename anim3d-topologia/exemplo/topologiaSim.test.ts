import { describe, expect, it } from 'vitest';
import { ligar, melhorRota, remover, topologiaExemplo, tracar, validar, type Topologia } from './topologiaSim';

const clone = (t: Topologia): Topologia => JSON.parse(JSON.stringify(t));

describe('rota e rastreio de pacotes', () => {
  it('entrega um ping pela rota de menor latência', () => {
    const r = tracar(topologiaExemplo(), 'pc1', 'srv1', 'icmp');
    expect(r.status).toBe('entregue');
    expect(r.rota).toEqual(['pc1', 'sw1', 'rt1', 'sw2', 'srv1']);
    expect(r.totalMs).toBe(1 + 2 + 2 + 1);
    expect(r.passos).toHaveLength(4);
    expect(r.passos.every((p) => p.acao === 'encaminhou')).toBe(true);
  });

  it('o firewall descarta o protocolo bloqueado e diz onde e por quê', () => {
    const r = tracar(topologiaExemplo(), 'pc1', 'net', 'ssh');
    expect(r.status).toBe('descartado');
    expect(r.motivo).toMatch(/firewall FW-Principal bloqueia SSH/);
    const ultimo = r.passos[r.passos.length - 1];
    expect(ultimo.acao).toBe('descartou');
    expect(ultimo.de).toBe('fw1');
    // o mesmo destino por outro protocolo passa
    expect(tracar(topologiaExemplo(), 'pc1', 'net', 'http').status).toBe('entregue');
  });

  it('enlace caído: para no ponto do defeito', () => {
    const t = clone(topologiaExemplo());
    t.enlaces.find((e) => e.id === 'l4')!.ativo = false; // sw1 ↔ rt1
    const r = tracar(t, 'pc1', 'srv1', 'icmp');
    expect(r.status).toBe('descartado');
    expect(r.motivo).toMatch(/enlace caído entre SW-Andar1 e RT-Borda/);
    expect(r.rota).toEqual(['pc1', 'sw1']);
  });

  it('dispositivo desligado no meio do caminho', () => {
    const t = clone(topologiaExemplo());
    t.disps.find((d) => d.id === 'rt1')!.ligado = false;
    const r = tracar(t, 'pc2', 'srv2', 'http');
    expect(r.status).toBe('descartado');
    expect(r.motivo).toMatch(/RT-Borda está desligado/);
  });

  it('origem desligada e origem = destino', () => {
    const t = clone(topologiaExemplo());
    t.disps.find((d) => d.id === 'pc1')!.ligado = false;
    expect(tracar(t, 'pc1', 'srv1', 'icmp').motivo).toMatch(/PC-Vendas está desligado/);
    expect(tracar(topologiaExemplo(), 'pc1', 'pc1', 'icmp').motivo).toMatch(/mesmo dispositivo/);
  });

  it('usa a rota alternativa quando um enlace cai e existe outro caminho', () => {
    const t = clone(topologiaExemplo());
    t.enlaces.push({ id: 'alt', a: 'sw1', b: 'sw2', ativo: true, ms: 9 }); // atalho mais lento
    t.enlaces.find((e) => e.id === 'l4')!.ativo = false;
    const r = tracar(t, 'pc1', 'srv1', 'icmp');
    expect(r.status).toBe('entregue');
    expect(r.rota).toEqual(['pc1', 'sw1', 'sw2', 'srv1']);
  });

  it('rede desconectada: sem rota', () => {
    const t = clone(topologiaExemplo());
    t.disps.push({ id: 'ilha', tipo: 'pc', nome: 'PC-Ilha', x: 0, y: 0, ligado: true, ip: '9.9.9.9' });
    const r = tracar(t, 'pc1', 'ilha', 'icmp');
    expect(r.status).toBe('descartado');
    expect(r.motivo).toMatch(/sem rota/);
  });
});

describe('edição e validação', () => {
  it('ligar não cria enlace duplicado nem para si mesmo; remover leva os enlaces junto', () => {
    const t = topologiaExemplo();
    expect(ligar(t, 'pc1', 'pc1')).toBe(t);
    expect(ligar(t, 'pc1', 'sw1')).toBe(t);
    expect(ligar(t, 'pc1', 'pc2').enlaces).toHaveLength(t.enlaces.length + 1);
    const sem = remover(t, 'sw1');
    expect(sem.disps.find((d) => d.id === 'sw1')).toBeUndefined();
    expect(sem.enlaces.some((e) => e.a === 'sw1' || e.b === 'sw1')).toBe(false);
  });

  it('valida IP duplicado e dispositivo isolado', () => {
    expect(validar(topologiaExemplo()).filter((a) => a.nivel === 'erro')).toEqual([]);
    const t = clone(topologiaExemplo());
    t.disps.find((d) => d.id === 'pc2')!.ip = '192.168.1.10';
    t.disps.push({ id: 'x', tipo: 'switch', nome: 'SW-Solto', x: 0, y: 0, ligado: true });
    const av = validar(t);
    expect(av.some((a) => a.nivel === 'erro' && /duplicado/.test(a.texto))).toBe(true);
    expect(av.some((a) => /SW-Solto não está ligado/.test(a.texto))).toBe(true);
  });

  it('melhorRota ignorando falhas mostra a rota pretendida', () => {
    const t = clone(topologiaExemplo());
    t.enlaces.find((e) => e.id === 'l5')!.ativo = false;
    expect(melhorRota(t, 'pc1', 'net', true)).toBeNull();
    expect(melhorRota(t, 'pc1', 'net', false)?.ids).toEqual(['pc1', 'sw1', 'rt1', 'fw1', 'net']);
  });
});
