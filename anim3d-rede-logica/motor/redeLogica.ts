// Deriva a topologia LÓGICA da física e calcula o impacto de uma falha. Devolve o formato do motor de pacotes de anim3d-topologia.
// Passivos (patch panel, tomada) são atravessados pela MESMA porta e não viram dispositivo.
import { PASSIVOS, comprimentoTrechos, type Cabo, type ModeloFisico, type TipoEquip } from '../../anim3d-infra-fisica/motor/infraFisica';
import type { Disp, Enlace, Topologia, TipoDisp } from '../../anim3d-topologia/exemplo/topologiaSim';

const TIPO_LOGICO: Partial<Record<TipoEquip, TipoDisp>> = { switch: 'switch', servidor: 'servidor', roteador: 'roteador', firewall: 'firewall', pc: 'pc', ap: 'switch' };
const MS_POR_METRO = 0.005; // propagação em cobre ≈ 5 ns/m

interface Ponta { eq: string; porta: number }
interface Seg { a: Ponta; b: Ponta; m: number; id: string }

export function gerarTopologiaLogica(m: ModeloFisico, ips: Record<string, string> = {}): Topologia {
  const passivo = new Set(m.equipamentos.filter((e) => PASSIVOS.includes(e.tipo)).map((e) => e.id));
  const segs: Seg[] = m.cabos.map((c: Cabo) => ({ a: { eq: c.de.equipamentoId, porta: c.de.porta }, b: { eq: c.para.equipamentoId, porta: c.para.porta }, m: comprimentoTrechos(c.caminho), id: c.id }));
  const usados = new Set<number>();
  /** Segue o sinal por passivos até achar um ativo; null se a porta do passivo não tem continuação. */
  const seguir = (ponta: Ponta, metros: number, guarda = 0): { fim: Ponta; metros: number } | null => {
    if (!passivo.has(ponta.eq)) return { fim: ponta, metros };
    if (guarda > 8) return null;
    const j = segs.findIndex((s, k) => !usados.has(k) && [s.a, s.b].some((p) => p.eq === ponta.eq && p.porta === ponta.porta));
    if (j < 0) return null;
    usados.add(j);
    const s = segs[j];
    const outra = s.a.eq === ponta.eq && s.a.porta === ponta.porta ? s.b : s.a;
    return seguir(outra, metros + s.m, guarda + 1);
  };
  const enlaces: Enlace[] = [];
  segs.forEach((s, i) => {
    if (usados.has(i)) return;
    // começa sempre de um ativo; cabo entre dois passivos é tratado quando alguém o alcançar
    const [ini, resto] = passivo.has(s.a.eq) ? [s.b, s.a] : [s.a, s.b];
    if (passivo.has(ini.eq)) return;
    usados.add(i);
    const fim = seguir(resto, s.m);
    if (fim && fim.fim.eq !== ini.eq) enlaces.push({ id: `l-${s.id}`, a: ini.eq, b: fim.fim.eq, ativo: true, ms: Math.max(0.01, +(fim.metros * MS_POR_METRO).toFixed(4)) });
  });
  const disps: Disp[] = m.equipamentos
    .filter((e) => TIPO_LOGICO[e.tipo])
    .map((e, i) => ({ id: e.id, tipo: TIPO_LOGICO[e.tipo]!, nome: e.nome, x: 60 + (i % 6) * 110, y: 60 + Math.floor(i / 6) * 100, ip: ips[e.id], ligado: true }));
  return { disps, enlaces: enlaces.filter((l) => disps.some((d) => d.id === l.a) && disps.some((d) => d.id === l.b)) };
}

export interface Impacto { semConexao: string[]; salasAfetadas: string[]; salasTotalmenteIsoladas: string[]; }

/** Desliga `falho` e diz quais hosts perdem o caminho até `ancora` (servidor/internet), agrupado por sala. */
export function impactoDeFalha(t: Topologia, falho: string, ancora: string, salaDe: Record<string, string>): Impacto {
  const vivo = (id: string) => id !== falho && !!t.disps.find((d) => d.id === id)?.ligado;
  const alcancados = new Set<string>();
  if (vivo(ancora)) {
    const fila = [ancora];
    alcancados.add(ancora);
    while (fila.length) {
      const x = fila.shift()!;
      for (const e of t.enlaces) {
        const o = e.a === x ? e.b : e.b === x ? e.a : null;
        if (o && e.ativo && vivo(o) && !alcancados.has(o)) { alcancados.add(o); fila.push(o); }
      }
    }
  }
  const hosts = t.disps.filter((d) => (d.tipo === 'pc' || d.tipo === 'servidor') && d.id !== falho);
  const semConexao = hosts.filter((d) => !alcancados.has(d.id)).map((d) => d.id);
  const salasAfetadas = [...new Set(semConexao.map((id) => salaDe[id]).filter(Boolean))];
  const salasTotalmenteIsoladas = salasAfetadas.filter((s) => hosts.filter((h) => salaDe[h.id] === s).every((h) => semConexao.includes(h.id)));
  return { semConexao, salasAfetadas, salasTotalmenteIsoladas };
}

/** Ordem de descoberta por ondas (BFS a partir de uma semente): alimenta a animação "Network Discovery". */
export function ordemDeDescoberta(t: Topologia, semente: string): { id: string; via: string | null; onda: number }[] {
  const saida: { id: string; via: string | null; onda: number }[] = [{ id: semente, via: null, onda: 0 }];
  const visto = new Set([semente]);
  for (let i = 0; i < saida.length; i++) {
    const { id, onda } = saida[i];
    for (const e of t.enlaces) {
      const o = e.a === id ? e.b : e.b === id ? e.a : null;
      if (o && e.ativo && !visto.has(o)) { visto.add(o); saida.push({ id: o, via: e.id, onda: onda + 1 }); }
    }
  }
  return saida;
}
