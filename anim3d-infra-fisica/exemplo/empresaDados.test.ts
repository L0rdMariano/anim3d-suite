import { describe, expect, it } from 'vitest';
import { ocupacaoRack, rastrearCaminhoFisico } from '../motor/infraFisica';
import { gerarTopologiaLogica, impactoDeFalha } from '../../anim3d-rede-logica/motor/redeLogica';
import { inventario, validarProjeto } from '../../anim3d-infra-validacao/motor/validacao';
import { tracar } from '../../anim3d-topologia/exemplo/topologiaSim';
import { comDefeitos, empresaMedioPorte, ipsDaEmpresa, pontosDeRede, RACK, resumoRack, salaDeEquip } from './empresaDados';

describe('rack da empresa de médio porte', () => {
  const m = empresaMedioPorte();

  it('o projeto de referência passa na validação sem nenhum achado', () => {
    expect(validarProjeto(m)).toEqual([]);
  });

  it('rack de 42 U com metade livre para crescer e energia confortável', () => {
    const r = resumoRack(m);
    expect(r.ocupados).toBe(21);
    expect(r.livres).toBe(21);
    expect(r.watts).toBe(2830 + 0); // soma dos ativos; patch panels são passivos (0 W)
    expect(r.watts / r.capacidadeW).toBeLessThan(0.8);
    const o = ocupacaoRack(RACK, m.instalacoes, m.equipamentos);
    expect(o.conflitos).toEqual([]);
    expect(o.slots.slice(13, 21).every((s) => s === null)).toBe(true); // U14–U21 livres
  });

  it('cada ponto de rede atravessa tomada e patch panel e chega a um switch dentro de 100 m', () => {
    const pontos = pontosDeRede(m);
    expect(pontos).toHaveLength(9);
    for (const p of pontos) {
      const c = rastrearCaminhoFisico(m, p.pc);
      expect(c.cabos).toHaveLength(3);
      expect(['acc1', 'acc2']).toContain(c.fim);
      expect(c.canalM).toBeLessThan(100);
      expect(c.canalM).toBeGreaterThan(20); // passa pela calha, nunca em linha reta
    }
  });

  it('andares mais altos têm cabo mais longo (a prumada sobe)', () => {
    const metros = (pc: string) => rastrearCaminhoFisico(m, pc).metros;
    expect(metros('pc-1-1')).toBeGreaterThan(metros('pc-0-1'));
    expect(metros('pc-2-1')).toBeGreaterThan(metros('pc-1-1'));
  });

  it('a topologia lógica sai dos cabos: PC liga direto no switch e alcança o servidor', () => {
    const t = gerarTopologiaLogica(m, ipsDaEmpresa(m));
    const l = t.enlaces.find((e) => e.a === 'pc-2-1' || e.b === 'pc-2-1')!;
    expect([l.a, l.b].sort()).toEqual(['acc2', 'pc-2-1']);
    expect(t.disps.some((d) => d.id.startsWith('pp') || d.id.startsWith('tom'))).toBe(false);
    const r = tracar(t, 'pc-2-1', 'arq', 'icmp');
    expect(r.status).toBe('entregue');
    expect(r.rota).toEqual(['pc-2-1', 'acc2', 'core', 'arq']);
  });

  it('derrubar o SW-ACC2 isola só o 3º andar; derrubar o CORE isola todos os andares', () => {
    const t = gerarTopologiaLogica(m);
    const sala = salaDeEquip(m);
    const a2 = impactoDeFalha(t, 'acc2', 'arq', sala);
    expect(a2.salasTotalmenteIsoladas).toEqual(['andar2']);
    const core = impactoDeFalha(t, 'core', 'arq', sala);
    expect(core.salasTotalmenteIsoladas).toEqual(expect.arrayContaining(['andar0', 'andar1', 'andar2']));
  });

  it('o inventário mostra rack, U e portas usadas', () => {
    const acc1 = inventario(m).find((x) => x.id === 'acc1')!;
    expect(acc1).toMatchObject({ rack: 'RACK-01', u: 'U25' });
    expect(acc1.portasUsadas).toBe(6 + 2 + 1); // 6 pontos (térreo e 2º andar) + 2 APs + uplink do core
  });

  it('com defeitos injetados, a validação aponta exatamente os problemas criados', () => {
    const regras = new Set(validarProjeto(comDefeitos(m)).map((a) => a.regra));
    for (const r of ['rack-sobreposicao', 'energia-rack', 'canal-comprimento', 'porta-duplicada']) expect(regras).toContain(r);
  });
});
