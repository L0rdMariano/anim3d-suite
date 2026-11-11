// Exemplo anim3d-rede-logica: a rede LÓGICA da empresa do exemplo RackEmpresa, derivada dos cabos físicos (patch panel e tomada somem).
// Dados e layout puros, sem React; a tela só desenha.
import type { Topologia } from '../../anim3d-topologia/exemplo/topologiaSim';
import { empresaMedioPorte, ipsDaEmpresa, salaDeEquip } from '../../anim3d-infra-fisica/exemplo/empresaDados';
import { gerarTopologiaLogica } from '../motor/redeLogica';

/** A descoberta começa no switch de núcleo (é onde um gerenciador de rede enxergaria todos os vizinhos). */
export const SEMENTE = 'core';
/** "Perder a conexão" = perder o servidor de arquivos. */
export const ANCORA = 'arq';

export function redeDaEmpresa() {
  const modelo = empresaMedioPorte();
  return { modelo, topo: gerarTopologiaLogica(modelo, ipsDaEmpresa(modelo)), salaDe: salaDeEquip(modelo) };
}

/** Cópia da topologia com um dispositivo desligado (ou a original se `id` for nulo). */
export const comDesligado = (t: Topologia, id: string | null): Topologia => (id ? { ...t, disps: t.disps.map((d) => (d.id === id ? { ...d, ligado: false } : d)) } : t);

/** Camada vertical de cada dispositivo: borda → firewall → núcleo → acesso e servidores → pontas (estações e APs). */
export const camadaDe = (id: string): number => (id === 'rt' ? 0 : id === 'fw' ? 1 : id === 'core' ? 2 : /^(pc|ap)-/.test(id) ? 4 : 3);

/** Posição de cada dispositivo numa área `largura × altura`: uma linha por camada, pontas ordenadas pelo switch a que se ligam. */
export function layout(t: Topologia, largura = 760, altura = 420): Record<string, { x: number; y: number }> {
  const margem = 44;
  const ids = t.disps.map((d) => d.id);
  const camadas = [0, 1, 2, 3, 4].map((c) => ids.filter((id) => camadaDe(id) === c));
  const pai = (id: string) => {
    const e = t.enlaces.find((x) => (x.a === id || x.b === id) && camadaDe(x.a === id ? x.b : x.a) === 3);
    return e ? (e.a === id ? e.b : e.a) : '';
  };
  const acessos = camadas[3].filter((id) => id.startsWith('acc')).sort();
  const demais = camadas[3].filter((id) => !id.startsWith('acc')).sort();
  // o primeiro switch de acesso fica à esquerda e o último à direita, com os servidores no meio: as pontas de cada um ficam logo abaixo dele
  camadas[3] = [acessos[0], ...demais, ...acessos.slice(1)].filter(Boolean);
  camadas[4] = [...camadas[4]].sort((a, b) => acessos.indexOf(pai(a)) - acessos.indexOf(pai(b)) || a.localeCompare(b));
  // (a ordem das pontas segue a dos switches de acesso, da esquerda para a direita)
  const pos: Record<string, { x: number; y: number }> = {};
  camadas.forEach((lista, c) => {
    lista.forEach((id, i) => {
      const x = lista.length === 1 ? largura / 2 : margem + (i * (largura - 2 * margem)) / (lista.length - 1);
      pos[id] = { x, y: margem + c * ((altura - 2 * margem) / 4) };
    });
  });
  return pos;
}
