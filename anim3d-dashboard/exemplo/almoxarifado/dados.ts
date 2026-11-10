// Modelo do almoxarifado: geometria, catálogo, posições endereçadas e indicadores.
// Determinístico (semente): o mesmo armazém em todo carregamento, sem backend.

export type Status = 'ok' | 'baixo' | 'critico' | 'vazio';

export interface Sku {
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  minimo: number;
}

export interface Posicao {
  indice: number;
  /** Endereço: corredor-lado-baia-nível, ex.: C-D-05-3 (E = esquerda, D = direita). */
  codigo: string;
  corredor: number;
  lado: -1 | 1;
  baia: number;
  nivel: number;
  /** Centro do palete no mundo (y = topo da longarina onde ele apoia). */
  x: number;
  y: number;
  z: number;
  sku: Sku | null;
  qtd: number;
  validade: string;
  ultimaMov: string;
}

export const GEO = {
  corredores: 6,
  baias: 8,
  niveis: 4,
  larguraBaia: 2.7,
  profRack: 1.1,
  alturaNivel: 1.55,
  larguraCorredor: 3.4,
  folgaCostas: 0.3,
} as const;

export const LETRAS = 'ABCDEFGH';
export const passoCorredor = GEO.larguraCorredor + 2 * GEO.profRack + GEO.folgaCostas;
export const xCorredor = (c: number) => (c - (GEO.corredores - 1) / 2) * passoCorredor;
export const xRack = (c: number, lado: -1 | 1) => xCorredor(c) + lado * (GEO.larguraCorredor / 2 + GEO.profRack / 2);
export const zBaia = (b: number) => (b - (GEO.baias - 1) / 2) * GEO.larguraBaia;
export const yNivel = (n: number) => 0.12 + n * GEO.alturaNivel;
export const alturaRack = yNivel(GEO.niveis) + 0.2;
export const meiaLargura = (GEO.corredores * passoCorredor) / 2;
export const meioComprimento = (GEO.baias * GEO.larguraBaia) / 2;

const CATALOGO: [string, string, string, number][] = [
  ['Parafuso sextavado M8', 'Fixação', 'cx', 40], ['Porca autotravante M10', 'Fixação', 'cx', 30],
  ['Arruela lisa 1/2"', 'Fixação', 'cx', 25], ['Rebite pop 4,8 mm', 'Fixação', 'cx', 20],
  ['Luva nitrílica G', 'EPI', 'cx', 60], ['Óculos de proteção', 'EPI', 'un', 50],
  ['Capacete classe B', 'EPI', 'un', 30], ['Protetor auricular', 'EPI', 'par', 80],
  ['Cabo flexível 2,5 mm²', 'Elétrica', 'rolo', 15], ['Disjuntor 32 A', 'Elétrica', 'un', 24],
  ['Fita isolante 20 m', 'Elétrica', 'un', 100], ['Lâmpada LED tubular', 'Elétrica', 'un', 48],
  ['Rolamento 6204', 'Mecânica', 'un', 36], ['Correia em V A-42', 'Mecânica', 'un', 18],
  ['Filtro de ar industrial', 'Mecânica', 'un', 22], ['Graxa de lítio 1 kg', 'Lubrificação', 'un', 20],
  ['Óleo hidráulico 20 L', 'Lubrificação', 'bd', 12], ['Óleo 15W40 20 L', 'Lubrificação', 'bd', 10],
  ['Papel A4 (caixa)', 'Escritório', 'cx', 40], ['Toner preto', 'Escritório', 'un', 16],
  ['Pallet wrap 500 mm', 'Embalagem', 'rolo', 30], ['Caixa papelão G', 'Embalagem', 'un', 200],
  ['Fita adesiva 48 mm', 'Embalagem', 'un', 120], ['Etiqueta térmica 100x50', 'Embalagem', 'rolo', 50],
  ['Detergente industrial 5 L', 'Limpeza', 'gl', 24], ['Pano de limpeza (fardo)', 'Limpeza', 'fd', 15],
  ['Válvula esfera 1"', 'Hidráulica', 'un', 20], ['Tubo PVC 50 mm', 'Hidráulica', 'br', 30],
  ['Mangueira 3/4" 50 m', 'Hidráulica', 'rolo', 8], ['Conector rápido 1/4"', 'Pneumática', 'un', 60],
];

function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const statusDe = (p: Posicao): Status => {
  if (!p.sku || p.qtd <= 0) return 'vazio';
  if (p.qtd < p.sku.minimo * 0.5) return 'critico';
  if (p.qtd < p.sku.minimo) return 'baixo';
  return 'ok';
};

export const ROTULO_STATUS: Record<Status, string> = { ok: 'Normal', baixo: 'Abaixo do mínimo', critico: 'Crítico', vazio: 'Vazio' };

export interface Almoxarifado {
  skus: Sku[];
  posicoes: Posicao[];
}

export function gerarAlmoxarifado(semente = 7): Almoxarifado {
  const r = prng(semente);
  const skus: Sku[] = CATALOGO.map(([nome, categoria, unidade, minimo], i) => ({
    codigo: `SKU-${(1040 + i * 7).toString().padStart(5, '0')}`,
    nome,
    categoria,
    unidade,
    minimo,
  }));
  const posicoes: Posicao[] = [];
  const hoje = new Date(2026, 10, 10);
  for (let c = 0; c < GEO.corredores; c++)
    for (const lado of [-1, 1] as const)
      for (let b = 0; b < GEO.baias; b++)
        for (let n = 0; n < GEO.niveis; n++) {
          const vazio = r() < 0.16;
          // categorias agrupadas por corredor (como num almoxarifado real), com alguma mistura
          const sku = vazio ? null : skus[Math.floor(((c * 5 + r() * 9) % skus.length))];
          const sorteio = r();
          const qtd = !sku ? 0 : Math.round(sku.minimo * (sorteio < 0.1 ? 0.2 + r() * 0.25 : sorteio < 0.25 ? 0.55 + r() * 0.4 : 1 + r() * 2.2));
          const validade = new Date(hoje.getTime() + (30 + r() * 600) * 864e5);
          const ultima = new Date(hoje.getTime() - r() * 40 * 864e5);
          posicoes.push({
            indice: posicoes.length,
            codigo: `${LETRAS[c]}-${lado < 0 ? 'E' : 'D'}-${String(b + 1).padStart(2, '0')}-${n + 1}`,
            corredor: c,
            lado,
            baia: b,
            nivel: n,
            x: xRack(c, lado),
            y: yNivel(n),
            z: zBaia(b),
            sku,
            qtd,
            validade: validade.toLocaleDateString('pt-BR'),
            ultimaMov: ultima.toLocaleDateString('pt-BR'),
          });
        }
  return { skus, posicoes };
}

export interface Indicadores {
  total: number;
  ocupadas: number;
  ocupacao: number;
  criticos: number;
  baixos: number;
  vazios: number;
  unidades: number;
}

export function indicadores(a: Almoxarifado): Indicadores {
  let ocupadas = 0, criticos = 0, baixos = 0, vazios = 0, unidades = 0;
  for (const p of a.posicoes) {
    const s = statusDe(p);
    if (s === 'vazio') vazios++;
    else ocupadas++;
    if (s === 'critico') criticos++;
    if (s === 'baixo') baixos++;
    unidades += p.qtd;
  }
  return { total: a.posicoes.length, ocupadas, ocupacao: ocupadas / a.posicoes.length, criticos, baixos, vazios, unidades };
}

/** Busca por código de posição, código de SKU ou nome (sem acento/caixa). */
export function buscar(a: Almoxarifado, termo: string): number[] {
  const n = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const t = n(termo.trim());
  if (t.length < 2) return [];
  return a.posicoes
    .filter((p) => n(p.codigo).includes(t) || (p.sku && (n(p.sku.codigo).includes(t) || n(p.sku.nome).includes(t))))
    .map((p) => p.indice);
}
