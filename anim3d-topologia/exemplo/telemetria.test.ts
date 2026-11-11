import { describe, expect, it } from 'vitest';
import { fontePolling, fonteSimulada, gerarTelemetria, urlSegura, type EstadoFonte } from './fontesDados';
import { aplicar, aplicarNaTopologia, corUtilizacao, HISTORICO, maisCarregados, rgbUtilizacao, telemetriaVazia, utilizacao, validarMensagem, VALIDADE_MS } from './telemetria';
import { topologiaExemplo } from './topologiaSim';

describe('validação de mensagens externas', () => {
  it('aceita enlace, disp e lote; ignora lixo', () => {
    const m = validarMensagem({ tipo: 'lote', itens: [{ tipo: 'enlace', id: 'l6', mbps: 42.5, ms: 18, perdaPct: 0.4, ativo: true }, { tipo: 'disp', id: 'srv1', ligado: true, cpuPct: 30 }, 'lixo', null, 7] });
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ tipo: 'enlace', id: 'l6', mbps: 42.5 });
  });

  it('descarta ids inválidos e tipos desconhecidos (nada de HTML/script como id)', () => {
    expect(validarMensagem({ tipo: 'enlace', id: '<img src=x onerror=1>' })).toEqual([]);
    expect(validarMensagem({ tipo: 'enlace' })).toEqual([]);
    expect(validarMensagem({ tipo: 'outro', id: 'a' })).toEqual([]);
    expect(validarMensagem('texto')).toEqual([]);
  });

  it('limita faixas e rejeita não-números', () => {
    const [m] = validarMensagem({ tipo: 'enlace', id: 'a', mbps: -5, ms: 1e12, perdaPct: 250 });
    expect(m).toMatchObject({ mbps: 0, ms: 60000, perdaPct: 100 });
    const [n] = validarMensagem({ tipo: 'enlace', id: 'a', mbps: 'rápido', ms: NaN, perdaPct: Infinity, ativo: 'sim' });
    expect(n).toMatchObject({ mbps: undefined, ms: undefined, perdaPct: undefined, ativo: undefined });
  });

  it('limita o tamanho do lote e a profundidade', () => {
    const muitos = Array.from({ length: 2000 }, () => ({ tipo: 'enlace', id: 'a', mbps: 1 }));
    expect(validarMensagem(muitos)).toHaveLength(500);
    expect(validarMensagem({ tipo: 'lote', itens: { tipo: 'lote', itens: { tipo: 'lote', itens: [{ tipo: 'enlace', id: 'a' }] } } })).toEqual([]);
  });
});

describe('estado ao vivo', () => {
  it('aplica, mescla campos ausentes e limita o histórico', () => {
    let t = telemetriaVazia();
    t = aplicar(t, validarMensagem({ tipo: 'enlace', id: 'l6', mbps: 10, ms: 18 }), 1000);
    t = aplicar(t, validarMensagem({ tipo: 'enlace', id: 'l6', perdaPct: 2 }), 2000); // só perda: mantém mbps e ms
    expect(t.enlaces.l6).toMatchObject({ mbps: 10, ms: 18, perdaPct: 2, t: 2000 });
    for (let i = 0; i < HISTORICO + 20; i++) t = aplicar(t, validarMensagem({ tipo: 'enlace', id: 'l6', mbps: i }), 3000 + i);
    expect(t.hist.l6).toHaveLength(HISTORICO);
    expect(t.hist.l6[HISTORICO - 1]).toBe(HISTORICO + 19);
  });

  it('não altera o estado anterior (imutável)', () => {
    const a = telemetriaVazia();
    const b = aplicar(a, validarMensagem({ tipo: 'disp', id: 'x', ligado: false }), 1);
    expect(a.disps).toEqual({});
    expect(b.disps.x.ligado).toBe(false);
  });

  it('sobrepõe a topologia pelo que a rede real informa, ignorando dado velho', () => {
    const topo = topologiaExemplo();
    let t = telemetriaVazia();
    t = aplicar(t, validarMensagem([{ tipo: 'disp', id: 'rt1', ligado: false }, { tipo: 'enlace', id: 'l6', ativo: false, ms: 55 }]), 10_000);
    const viva = aplicarNaTopologia(topo, t, 12_000);
    expect(viva.disps.find((d) => d.id === 'rt1')!.ligado).toBe(false);
    expect(viva.enlaces.find((e) => e.id === 'l6')).toMatchObject({ ativo: false, ms: 55 });
    expect(topo.disps.find((d) => d.id === 'rt1')!.ligado).toBe(true); // o modelo editável não muda
    const velho = aplicarNaTopologia(topo, t, 10_000 + VALIDADE_MS + 1);
    expect(velho.disps.find((d) => d.id === 'rt1')!.ligado).toBe(true);
  });

  it('utilização e cor vão do verde ao vermelho', () => {
    expect(utilizacao(50, 100)).toBe(0.5);
    expect(utilizacao(5, 0)).toBe(0);
    expect(rgbUtilizacao(0)).toEqual([61, 220, 151]);
    expect(rgbUtilizacao(1)).toEqual([255, 59, 92]);
    expect(corUtilizacao(2)).toBe(corUtilizacao(1));
  });

  it('resume os enlaces mais carregados', () => {
    const topo = topologiaExemplo();
    const t = aplicar(telemetriaVazia(), validarMensagem([{ tipo: 'enlace', id: 'l6', mbps: 90 }, { tipo: 'enlace', id: 'l4', mbps: 300 }]), 1);
    const top = maisCarregados(topo, t, 2);
    expect(top[0]).toMatchObject({ id: 'l6', util: 0.9 }); // 90/100 (WAN) > 300/1000
    expect(top).toHaveLength(2);
  });
});

describe('fontes de dados', () => {
  it('a simulada é determinística, cobre todos os itens e respeita as faixas', () => {
    const topo = topologiaExemplo();
    const a = JSON.stringify(gerarTelemetria(topo, 12.3));
    expect(a).toBe(JSON.stringify(gerarTelemetria(topo, 12.3)));
    const msgs = validarMensagem(gerarTelemetria(topo, 12.3));
    expect(msgs.filter((m) => m.tipo === 'enlace')).toHaveLength(topo.enlaces.length);
    expect(msgs.filter((m) => m.tipo === 'disp')).toHaveLength(topo.disps.length);
    for (const m of msgs) if (m.tipo === 'enlace') expect(m.mbps!).toBeLessThanOrEqual((topo.enlaces.find((e) => e.id === m.id)!.mbpsMax ?? 100) * 1.0);
  });

  it('a simulada gera congestionamento em algum momento', () => {
    const topo = topologiaExemplo();
    let pico = 0;
    for (let t = 0; t < 120; t += 1) for (const m of validarMensagem(gerarTelemetria(topo, t))) if (m.tipo === 'enlace') pico = Math.max(pico, utilizacao(m.mbps!, topo.enlaces.find((e) => e.id === m.id)!.mbpsMax));
    expect(pico).toBeGreaterThan(0.85);
  });

  it('fonteSimulada emite um lote e para ao cancelar', () => {
    const recebido: unknown[] = [];
    const estados: EstadoFonte[] = [];
    const parar = fonteSimulada(() => topologiaExemplo()).iniciar((b) => recebido.push(b), (e) => estados.push(e));
    expect(recebido).toHaveLength(1);
    expect(estados[0].fase).toBe('ao-vivo');
    parar();
  });

  it('polling emite o JSON e reporta erro HTTP', async () => {
    const recebido: unknown[] = [];
    const estados: EstadoFonte[] = [];
    const ok = (async () => ({ ok: true, json: async () => ({ tipo: 'disp', id: 'a' }) })) as unknown as typeof fetch;
    const p1 = fontePolling('http://x/t', 60_000, ok).iniciar((b) => recebido.push(b), (e) => estados.push(e));
    await new Promise((r) => setTimeout(r, 10));
    p1();
    expect(recebido).toEqual([{ tipo: 'disp', id: 'a' }]);
    const ruim = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    const p2 = fontePolling('http://x/t', 60_000, ruim).iniciar(() => undefined, (e) => estados.push(e));
    await new Promise((r) => setTimeout(r, 10));
    p2();
    expect(estados.some((e) => e.fase === 'erro' && /503/.test(e.detalhe ?? ''))).toBe(true);
  });

  it('urlSegura só aceita os protocolos permitidos', () => {
    expect(urlSegura('http://127.0.0.1:5181/eventos', ['http:', 'https:'])).toBe('http://127.0.0.1:5181/eventos');
    expect(urlSegura('javascript:alert(1)', ['http:', 'https:'])).toBeNull();
    expect(urlSegura('ws://x/y', ['http:', 'https:'])).toBeNull();
    expect(urlSegura('não é url', ['http:'])).toBeNull();
  });
});
