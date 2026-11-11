// Exemplo anim3d-wifi-rf: planta dos 3 andares do prédio do exemplo RackEmpresa (anim3d-infra-fisica) com paredes por material.
// Os APs vêm do MESMO modelo do rack (posicaoExterna), então o Wi-Fi e a infraestrutura nunca discordam de onde o AP está.
// Planta em metros: x de 0 a 28 (esquerda→direita), y de 0 a 16 (fundo→frente). Mundo 3D → planta: x+3, z+8.
import { posicaoExterna } from '../../anim3d-infra-fisica/exemplo/empresaDados';
import { mapaDeCobertura, percentualCoberto, type AP, type Banda, type Celula, type Material, type Parede } from '../motor/rf';

export const LARGURA = 28;
export const PROFUNDIDADE = 16;
export const ANDARES = ['Térreo · Comercial', '2º andar · Administrativo', '3º andar · Desenvolvimento'];
export const POTENCIA_PADRAO_DBM = 20;

const par = (andar: number, material: Material, x1: number, y1: number, x2: number, y2: number): Parede => ({ andar, material, x1, y1, x2, y2 });
/** Caixa fechada (4 paredes) de um mesmo material, como a sala de TI e o poço do elevador. */
const caixa = (andar: number, material: Material, x1: number, y1: number, x2: number, y2: number): Parede[] => [
  par(andar, material, x1, y1, x2, y1), par(andar, material, x2, y1, x2, y2), par(andar, material, x2, y2, x1, y2), par(andar, material, x1, y2, x1, y1),
];

export function paredes(): Parede[] {
  return [
    // térreo: sala de TI em concreto, divisória de drywall com porta (vão de 6 a 10 m) e sala de reunião em vidro
    ...caixa(0, 'concreto', 0, 5, 6, 11),
    par(0, 'drywall', 12, 0, 12, 6), par(0, 'drywall', 12, 10, 12, 16),
    par(0, 'vidro', 22, 2, 22, 14),
    // 2º andar: poço de elevador em tijolo, divisórias de drywall com porta
    ...caixa(1, 'tijolo', 12, 6, 16, 10),
    par(1, 'drywall', 8, 0, 8, 5), par(1, 'drywall', 8, 11, 8, 16),
    par(1, 'drywall', 24, 0, 24, 16),
    // 3º andar: poço de elevador em concreto, parede de tijolo e divisória longa
    ...caixa(2, 'concreto', 12, 6, 16, 10),
    par(2, 'drywall', 10, 0, 10, 16),
    par(2, 'tijolo', 21, 0, 21, 7),
  ];
}

/** APs do modelo do rack (um por andar), na planta. */
export function apsDaEmpresa(): AP[] {
  return [0, 1, 2].map((andar) => {
    const p = posicaoExterna(`ap-${andar}`);
    return { id: `ap-${andar}`, x: p[0] + 3, y: p[2] + 8, andar, txDbm: POTENCIA_PADRAO_DBM };
  });
}

export const PASSO_M = 0.5;

export interface ResumoAndar { bom: number; aceitavel: number; semSinal: number; }
export function cobertura(aps: AP[], banda: Banda, andar: number, ps: Parede[] = paredes()): { celulas: Celula[]; resumo: ResumoAndar } {
  const celulas = mapaDeCobertura(aps, ps, banda, { largura: LARGURA, profundidade: PROFUNDIDADE, andar }, PASSO_M);
  const aceitavel = percentualCoberto(celulas, 'aceitavel');
  return { celulas, resumo: { bom: percentualCoberto(celulas, 'bom'), aceitavel, semSinal: 1 - percentualCoberto(celulas, 'fraco') } };
}
