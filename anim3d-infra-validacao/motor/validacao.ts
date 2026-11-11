// Validação de consistência do projeto de infraestrutura, inventário e comparação com o mundo real (gêmeo digital).
// Cada regra devolve achados com severidade, objeto e texto: a interface lista e seleciona o objeto; nada de "projeto inválido" genérico.
import { comprimentoCabo, ocupacaoRack, portasUsadas, rastrearCaminhoFisico, type ModeloFisico, type TipoEquip } from '../../anim3d-infra-fisica/motor/infraFisica';

export type Severidade = 'erro' | 'aviso';
export interface Achado { regra: string; severidade: Severidade; objeto: string; mensagem: string; }

/** Limite de canal de cobre (par trançado): 90 m permanentes + 10 m de manobra. */
export const LIMITE_COBRE_M = 100;
const EM_RACK: TipoEquip[] = ['switch', 'patch-panel', 'servidor', 'roteador', 'firewall', 'ups'];

export function validarProjeto(m: ModeloFisico): Achado[] {
  const a: Achado[] = [];
  const eq = new Map(m.equipamentos.map((e) => [e.id, e]));
  const nome = (id: string) => eq.get(id)?.nome ?? id;

  for (const r of m.racks) {
    const o = ocupacaoRack(r, m.instalacoes, m.equipamentos);
    for (const c of o.conflitos) a.push({ regra: 'rack-sobreposicao', severidade: 'erro', objeto: r.id, mensagem: `${r.nome}: U${c.u} ocupado por ${c.ids.map(nome).join(' e ')}` });
    for (const id of o.foraDoRack) a.push({ regra: 'rack-fora', severidade: 'erro', objeto: id, mensagem: `${nome(id)} não cabe no ${r.nome} (${r.totalU} U)` });
    const watts = m.instalacoes.filter((i) => i.rackId === r.id).reduce((s, i) => s + (eq.get(i.equipamentoId)?.potenciaW ?? 0), 0);
    if (watts > r.capacidadeW) a.push({ regra: 'energia-rack', severidade: 'erro', objeto: r.id, mensagem: `${r.nome}: ${watts} W acima da capacidade de ${r.capacidadeW} W` });
    else if (watts > 0.8 * r.capacidadeW) a.push({ regra: 'energia-rack', severidade: 'aviso', objeto: r.id, mensagem: `${r.nome}: ${watts} W, mais de 80% de ${r.capacidadeW} W (sem folga para crescer)` });
  }
  const instalados = new Set(m.instalacoes.map((i) => i.equipamentoId));
  for (const e of m.equipamentos) if (EM_RACK.includes(e.tipo) && !instalados.has(e.id)) a.push({ regra: 'sem-rack', severidade: 'aviso', objeto: e.id, mensagem: `${e.nome} (${e.tipo}) não está instalado em nenhum rack` });

  const doubleUse = new Map<string, string[]>();
  for (const c of m.cabos) {
    for (const x of [c.de, c.para]) {
      const e = eq.get(x.equipamentoId);
      if (!e) { a.push({ regra: 'cabo-orfao', severidade: 'erro', objeto: c.id, mensagem: `Cabo ${c.id} aponta para equipamento inexistente (${x.equipamentoId})` }); continue; }
      if (x.porta < 1 || x.porta > e.portas) a.push({ regra: 'porta-inexistente', severidade: 'erro', objeto: c.id, mensagem: `${e.nome} não tem a porta ${x.porta} (tem ${e.portas})` });
      const k = `${x.equipamentoId}:${x.porta}`;
      doubleUse.set(k, [...(doubleUse.get(k) ?? []), c.id]);
    }
    const len = comprimentoCabo(c.caminho);
    if (c.meio === 'cobre' && len > LIMITE_COBRE_M) a.push({ regra: 'cabo-comprimento', severidade: 'erro', objeto: c.id, mensagem: `Cabo ${c.id}: ${len.toFixed(0)} m passa de ${LIMITE_COBRE_M} m em cobre (use fibra ou um switch intermediário)` });
  }
  // patch panel: a porta recebe um cabo frontal e um traseiro; qualquer outro ativo duplicado é erro
  for (const [k, ids] of doubleUse) {
    const [eid] = k.split(':');
    const limite = eq.get(eid)?.tipo === 'patch-panel' || eq.get(eid)?.tipo === 'tomada' ? 2 : 1;
    if (ids.length > limite) a.push({ regra: 'porta-duplicada', severidade: 'erro', objeto: eid, mensagem: `${nome(eid)} porta ${k.split(':')[1]} tem ${ids.length} cabos (${ids.join(', ')})` });
  }
  // o limite de 100 m vale para o CANAL inteiro (patch + horizontal + patch), não para cada cabo
  for (const e of m.equipamentos) {
    if (e.tipo !== 'pc' && e.tipo !== 'ap') continue;
    const p = rastrearCaminhoFisico(m, e.id);
    if (p.cabos.length > 1 && p.cabos.every((c) => c.meio === 'cobre') && p.canalM > LIMITE_COBRE_M) {
      a.push({ regra: 'canal-comprimento', severidade: 'erro', objeto: e.id, mensagem: `${e.nome}: canal de ${p.canalM.toFixed(0)} m (${p.cabos.length} cabos) passa de ${LIMITE_COBRE_M} m, mesmo com cada cabo abaixo do limite` });
    }
  }
  const ligados = portasUsadas(m.cabos);
  for (const e of m.equipamentos) if (e.tipo === 'tomada' && !ligados.has(e.id)) a.push({ regra: 'tomada-sem-cabo', severidade: 'aviso', objeto: e.id, mensagem: `Tomada ${e.nome} sem cabo até o patch panel` });
  return a;
}

export function inventario(m: ModeloFisico): { id: string; nome: string; tipo: string; rack: string; u: string; potenciaW: number; portasUsadas: number; portas: number }[] {
  const usadas = portasUsadas(m.cabos);
  return m.equipamentos.map((e) => {
    const ins = m.instalacoes.find((i) => i.equipamentoId === e.id);
    const rack = m.racks.find((r) => r.id === ins?.rackId);
    return { id: e.id, nome: e.nome, tipo: e.tipo, rack: rack?.nome ?? '—', u: ins ? (e.alturaU > 1 ? `U${ins.uInicial}-U${ins.uInicial + e.alturaU - 1}` : `U${ins.uInicial}`) : '—', potenciaW: e.potenciaW, portasUsadas: usadas.get(e.id)?.size ?? 0, portas: e.portas };
  });
}

export interface Observado { equipamentos: string[]; /** "a:porta|b:porta", em qualquer ordem. */ cabos: string[]; }
const chaveCabo = (a: string, b: string) => [a, b].sort().join('|');

/** Gêmeo digital: o que o projeto diz × o que a rede real reporta. */
export function diferencaComRealidade(m: ModeloFisico, real: Observado) {
  const previstos = new Set(m.cabos.map((c) => chaveCabo(`${c.de.equipamentoId}:${c.de.porta}`, `${c.para.equipamentoId}:${c.para.porta}`)));
  const vistos = new Set(real.cabos.map((c) => { const [a, b] = c.split('|'); return chaveCabo(a, b); }));
  const conhecidos = new Set(m.equipamentos.map((e) => e.id));
  return {
    equipamentosAusentes: m.equipamentos.filter((e) => !real.equipamentos.includes(e.id)).map((e) => e.id),
    equipamentosDesconhecidos: real.equipamentos.filter((id) => !conhecidos.has(id)),
    cabosAusentes: [...previstos].filter((k) => !vistos.has(k)),
    cabosNaoDocumentados: [...vistos].filter((k) => !previstos.has(k)),
  };
}
