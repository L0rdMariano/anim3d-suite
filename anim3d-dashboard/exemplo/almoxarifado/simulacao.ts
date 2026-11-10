// Motor da operação de ponta a ponta (sem three.js, testável em Node):
// caminhão → recebimento → conferência → armazenagem → separação → esteira → embalagem → expedição → caminhão.
// A cena 3D, a planta 2D e os gráficos só LEEM este estado; quem avança o tempo é `passo(dt)`.
import { meiaLargura, meioComprimento, statusDe, xCorredor, type Almoxarifado, type Posicao, type Sku } from './dados';

export interface Vec {
  x: number;
  z: number;
}

export type IdSetor = 'recebimento' | 'conferencia' | 'armazenagem' | 'separacao' | 'embalagem' | 'expedicao';

export interface Setor {
  id: IdSetor;
  nome: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cor: string;
  descricao: string;
}

/** Corredor de circulação entre as estantes e os setores da frente. */
export const FAIXA = 15;
export const Z_PAREDE = 24;
export const PREDIO = { x0: -31, x1: 31, z0: -15, z1: Z_PAREDE };

export const SETORES: Setor[] = [
  { id: 'recebimento', nome: 'Recebimento', x0: -31, x1: -15, z0: 16.6, z1: Z_PAREDE, cor: '#38bdf8', descricao: 'Descarga dos caminhões na doca' },
  { id: 'conferencia', nome: 'Conferência', x0: -14.5, x1: -3.5, z0: 16.6, z1: Z_PAREDE, cor: '#a78bfa', descricao: 'Inspeção e liberação dos paletes' },
  { id: 'armazenagem', nome: 'Armazenagem', x0: -meiaLargura - 1, x1: meiaLargura + 1, z0: -meioComprimento - 2.5, z1: meioComprimento + 2.5, cor: '#818cf8', descricao: 'Estantes porta-paletes endereçadas' },
  { id: 'separacao', nome: 'Separação', x0: -3, x1: 7, z0: 16.6, z1: Z_PAREDE, cor: '#fbbf24', descricao: 'Paletes viram caixas de pedido' },
  { id: 'embalagem', nome: 'Embalagem', x0: 7.5, x1: 17.5, z0: 16.6, z1: Z_PAREDE, cor: '#f472b6', descricao: 'Envolvimento e etiquetagem' },
  { id: 'expedicao', nome: 'Expedição', x0: 18, x1: 31, z0: 16.6, z1: Z_PAREDE, cor: '#4ade80', descricao: 'Carregamento e saída' },
];

export const DOCA_RECEB = { x: -23 };
export const DOCA_EXPED = { x: 24.5 };
export const SLOTS_CONFERENCIA: Vec[] = [-12.5, -10, -7.5, -5].map((x) => ({ x, z: 20.2 }));
export const ESTACOES_SEPARACAO: Vec[] = [-0.5, 4].map((x) => ({ x, z: 19.4 }));
export const ESTEIRA = { x0: -2, x1: DOCA_EXPED.x, z: 22.2 };
export const COMPRIMENTO_ESTEIRA = ESTEIRA.x1 - ESTEIRA.x0;
export const S_EMBALAGEM = 12.5 - ESTEIRA.x0;
/** Traseira do caminhão encostado na doca. */
export const Z_CAMINHAO_DOCADO = Z_PAREDE + 0.4;
const Z_CAMINHAO_FORA = 62;

const VEL = 3.6; // m/s
const VEL_GIRO = 2.6; // rad/s
const VEL_GARFO = 1.4; // m/s
const VEL_ESTEIRA = 1.6;
const VEL_CAMINHAO = 9;
const ESPACO_CAIXAS = 0.85;
const T_CONFERENCIA = 4;
const T_EMBALAGEM = 1.4;
const CAIXAS_POR_PALETE = 3;
const PALETES_POR_CAMINHAO = 4;
const CAPACIDADE_EXPEDICAO = 9;

export interface Carga {
  id: number;
  sku: Sku | null;
  qtd: number;
}

export interface Slot extends Vec {
  carga: Carga | null;
  reservado: boolean;
  timer: number;
  conferido: boolean;
}

export interface Estacao extends Vec {
  carga: Carga | null;
  reservado: boolean;
  timer: number;
  geradas: number;
}

export interface Caixa {
  id: number;
  s: number;
  embalada: boolean;
  espera: number;
}

export interface Caminhao {
  tipo: 'recebimento' | 'expedicao';
  x: number;
  /** Z da traseira do baú. */
  z: number;
  estado: 'chegando' | 'docado' | 'saindo' | 'fora';
  carga: number;
  capacidade: number;
  timer: number;
  /** Abertura da porta da doca, 0..1. */
  porta: number;
}

type Etapa =
  | { t: 'mover'; rota: Vec[] }
  | { t: 'girar'; ang: number }
  | { t: 'garfo'; alt: number }
  | { t: 'esperar'; s: number }
  | { t: 'acao'; f: () => void };

export interface Empilhadeira extends Vec {
  id: number;
  nome: string;
  papel: 'recebimento' | 'armazenagem';
  /** Rumo: frente = (sin ang, cos ang). */
  ang: number;
  garfo: number;
  carga: Carga | null;
  etapas: Etapa[];
  tarefa: string;
  casa: Vec;
  percorrido: number;
  viagens: number;
}

export interface Registro {
  id: number;
  hora: string;
  setor: IdSetor;
  texto: string;
}

export interface Contadores {
  recebidos: number;
  conferidos: number;
  armazenados: number;
  separados: number;
  embaladas: number;
  expedidas: number;
  caminhoesEntrada: number;
  caminhoesSaida: number;
}

export interface Amostra extends Contadores {
  hora: string;
}

const difAng = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Rota em "L" pela faixa de circulação (nunca atravessa as estantes). */
export function rota(de: Vec, para: Vec): Vec[] {
  const pts: Vec[] = [];
  if (Math.abs(de.z - FAIXA) > 0.05) pts.push({ x: de.x, z: FAIXA });
  if (Math.abs(para.x - de.x) > 0.05 || pts.length) pts.push({ x: para.x, z: FAIXA });
  pts.push({ x: para.x, z: para.z });
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) > 0.01);
}

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

export class Simulacao {
  t = 0;
  velocidade = 1;
  pausado = false;
  versao = 0;
  readonly empilhadeiras: Empilhadeira[];
  readonly slots: Slot[];
  readonly estacoes: Estacao[];
  readonly caixas: Caixa[] = [];
  readonly receb: Caminhao;
  readonly exped: Caminhao;
  readonly cont: Contadores = { recebidos: 0, conferidos: 0, armazenados: 0, separados: 0, embaladas: 0, expedidas: 0, caminhoesEntrada: 0, caminhoesSaida: 0 };
  readonly historico: Amostra[] = [];
  readonly registros: Registro[] = [];
  /** Posições de estante alteradas desde a última leitura (a cena repinta só estas). */
  readonly binsSujos = new Set<number>();
  private readonly reservas = new Set<number>();
  private readonly ouvintes = new Set<() => void>();
  private ids = 1;
  private proximaAmostra = 0;
  private ultimaNotificacao = -1;
  private readonly r: () => number;

  constructor(readonly almox: Almoxarifado, semente = 11) {
    this.r = prng(semente);
    const mk = (id: number, nome: string, papel: Empilhadeira['papel'], casa: Vec): Empilhadeira => ({
      id, nome, papel, x: casa.x, z: casa.z, ang: Math.PI, garfo: 0.15, carga: null, etapas: [], tarefa: 'Aguardando', casa, percorrido: 0, viagens: 0,
    });
    this.empilhadeiras = [
      mk(1, 'EMP-01', 'recebimento', { x: -18, z: FAIXA }),
      mk(2, 'EMP-02', 'armazenagem', { x: -2, z: FAIXA }),
      mk(3, 'EMP-03', 'armazenagem', { x: 10, z: FAIXA }),
    ];
    this.slots = SLOTS_CONFERENCIA.map((p) => ({ ...p, carga: null, reservado: false, timer: 0, conferido: false }));
    this.estacoes = ESTACOES_SEPARACAO.map((p) => ({ ...p, carga: null, reservado: false, timer: 0, geradas: 0 }));
    this.receb = { tipo: 'recebimento', x: DOCA_RECEB.x, z: Z_CAMINHAO_FORA - 20, estado: 'chegando', carga: PALETES_POR_CAMINHAO, capacidade: PALETES_POR_CAMINHAO, timer: 0, porta: 0 };
    this.exped = { tipo: 'expedicao', x: DOCA_EXPED.x, z: Z_CAMINHAO_DOCADO, estado: 'docado', carga: 0, capacidade: CAPACIDADE_EXPEDICAO, timer: 0, porta: 1 };
  }

  // ---------- leitura ----------
  relogio(t = this.t): string {
    const min = 8 * 60 + Math.floor(t); // 1 s de simulação = 1 min de operação
    return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }

  assinar = (cb: () => void) => {
    this.ouvintes.add(cb);
    return () => this.ouvintes.delete(cb);
  };
  lerVersao = () => this.versao;

  filas() {
    return {
      recebimento: this.receb.estado === 'docado' ? this.receb.carga : 0,
      conferencia: this.slots.filter((s) => s.carga && !s.conferido).length,
      aguardandoArmazenagem: this.slots.filter((s) => s.carga && s.conferido).length,
      separacao: this.estacoes.filter((e) => e.carga).length,
      esteira: this.caixas.filter((c) => !c.embalada).length,
      prontas: this.caixas.filter((c) => c.embalada).length,
    };
  }

  // ---------- avanço do tempo ----------
  passo(dtReal: number): void {
    if (this.pausado) return;
    let dt = Math.min(dtReal, 0.1) * this.velocidade;
    while (dt > 1e-6) {
      const h = Math.min(dt, 0.05);
      this.avancar(h);
      dt -= h;
    }
    if (this.t - this.ultimaNotificacao >= 0.25) {
      this.ultimaNotificacao = this.t;
      this.versao++;
      this.ouvintes.forEach((cb) => cb());
    }
  }

  private avancar(dt: number) {
    this.t += dt;
    this.caminhao(this.receb, dt);
    this.caminhao(this.exped, dt);
    for (const s of this.slots)
      if (s.carga && !s.conferido) {
        s.timer += dt;
        if (s.timer >= T_CONFERENCIA) {
          s.conferido = true;
          this.cont.conferidos++;
          this.registrar('conferencia', `Palete ${s.carga.sku?.codigo ?? ''} conferido e liberado`);
        }
      }
    this.separacao(dt);
    this.esteira(dt);
    for (const e of this.empilhadeiras) {
      if (!e.etapas.length) this.decidir(e);
      this.executar(e, dt);
    }
    if (this.t >= this.proximaAmostra) {
      this.proximaAmostra += 10; // a cada 10 min de operação
      this.historico.push({ hora: this.relogio(), ...this.cont });
      if (this.historico.length > 49) this.historico.shift();
    }
  }

  private registrar(setor: IdSetor, texto: string) {
    this.registros.unshift({ id: this.ids++, hora: this.relogio(), setor, texto });
    if (this.registros.length > 60) this.registros.pop();
  }

  private caminhao(c: Caminhao, dt: number) {
    c.porta += ((c.estado === 'docado' ? 1 : 0) - c.porta) * Math.min(1, dt * 3);
    switch (c.estado) {
      case 'fora':
        c.timer -= dt;
        if (c.timer <= 0) {
          c.estado = 'chegando';
          c.z = Z_CAMINHAO_FORA;
          c.carga = c.tipo === 'recebimento' ? PALETES_POR_CAMINHAO : 0;
        }
        break;
      case 'chegando':
        c.z = Math.max(Z_CAMINHAO_DOCADO, c.z - VEL_CAMINHAO * dt * Math.min(1, (c.z - Z_CAMINHAO_DOCADO) / 6 + 0.25));
        if (c.z <= Z_CAMINHAO_DOCADO + 0.01) {
          c.estado = 'docado';
          c.timer = 0;
          if (c.tipo === 'recebimento') {
            this.cont.caminhoesEntrada++;
            this.registrar('recebimento', `Caminhão encostou na doca com ${c.carga} paletes`);
          } else this.registrar('expedicao', 'Caminhão vazio encostou para carregamento');
        }
        break;
      case 'docado': {
        const pronto = c.tipo === 'recebimento' ? c.carga === 0 : c.carga >= c.capacidade;
        c.timer = pronto ? c.timer + dt : 0;
        if (pronto && c.timer > 1.2) {
          c.estado = 'saindo';
          if (c.tipo === 'expedicao') {
            this.cont.caminhoesSaida++;
            this.registrar('expedicao', `Caminhão saiu com ${c.carga} caixas`);
          } else this.registrar('recebimento', 'Caminhão descarregado liberado');
        }
        break;
      }
      case 'saindo':
        c.z += VEL_CAMINHAO * dt;
        if (c.z >= Z_CAMINHAO_FORA) {
          c.estado = 'fora';
          c.timer = c.tipo === 'recebimento' ? 6 : 2.5;
        }
        break;
    }
  }

  private separacao(dt: number) {
    for (const e of this.estacoes) {
      if (!e.carga) continue;
      e.timer += dt;
      const s = e.x - ESTEIRA.x0;
      if (e.geradas < CAIXAS_POR_PALETE && e.timer >= 1.6 * (e.geradas + 1) && this.caixas.every((c) => Math.abs(c.s - s) > ESPACO_CAIXAS)) {
        this.caixas.push({ id: this.ids++, s, embalada: false, espera: 0 });
        e.geradas++;
      }
      if (e.geradas >= CAIXAS_POR_PALETE && e.timer > 1.6 * CAIXAS_POR_PALETE + 1) {
        this.registrar('separacao', `Pedido separado: ${CAIXAS_POR_PALETE} caixas de ${e.carga.sku?.nome ?? 'material'}`);
        e.carga = null;
        e.timer = 0;
        e.geradas = 0;
      }
    }
  }

  private esteira(dt: number) {
    this.caixas.sort((a, b) => b.s - a.s); // da frente para trás
    for (let i = 0; i < this.caixas.length; i++) {
      const c = this.caixas[i];
      const limite = i === 0 ? COMPRIMENTO_ESTEIRA : this.caixas[i - 1].s - ESPACO_CAIXAS;
      if (!c.embalada && c.s >= S_EMBALAGEM - 1e-6) {
        c.s = S_EMBALAGEM;
        c.espera += dt;
        if (c.espera >= T_EMBALAGEM) {
          c.embalada = true;
          this.cont.embaladas++;
        }
        continue;
      }
      let alvo = c.s + VEL_ESTEIRA * dt;
      if (!c.embalada) alvo = Math.min(alvo, S_EMBALAGEM);
      c.s = Math.max(c.s, Math.min(alvo, limite));
    }
    const frente = this.caixas[0];
    if (frente && frente.s >= COMPRIMENTO_ESTEIRA - 1e-6 && this.exped.estado === 'docado' && this.exped.carga < this.exped.capacidade) {
      this.caixas.shift();
      this.exped.carga++;
      this.cont.expedidas++;
    }
  }

  // ---------- decisões das empilhadeiras ----------
  private sortear<T>(lista: T[]): T | undefined {
    return lista.length ? lista[Math.floor(this.r() * lista.length)] : undefined;
  }

  private corredorDe(p: Posicao): Vec {
    return { x: xCorredor(p.corredor), z: p.z };
  }

  private decidir(e: Empilhadeira) {
    if (e.papel === 'recebimento') return this.decidirRecebimento(e);
    return this.decidirArmazenagem(e);
  }

  private ocioso(e: Empilhadeira) {
    e.tarefa = 'Aguardando tarefa';
    const longe = Math.hypot(e.x - e.casa.x, e.z - e.casa.z) > 0.3;
    e.etapas = longe ? [{ t: 'mover', rota: rota(e, e.casa) }, { t: 'esperar', s: 0.5 }] : [{ t: 'esperar', s: 0.5 }];
  }

  private decidirRecebimento(e: Empilhadeira) {
    const c = this.receb;
    const slot = this.slots.find((s) => !s.carga && !s.reservado);
    if (c.estado !== 'docado' || c.carga <= 0 || !slot) return this.ocioso(e);
    slot.reservado = true;
    c.carga--; // reservado na hora: o palete sai do caminhão quando o garfo pega
    const pega: Vec = { x: DOCA_RECEB.x, z: Z_PAREDE - 1.4 };
    const solta: Vec = { x: slot.x, z: slot.z - 1.5 };
    const carga: Carga = { id: this.ids++, sku: this.sortear(this.almox.skus) ?? null, qtd: 0 };
    if (carga.sku) carga.qtd = Math.round(carga.sku.minimo * (1.2 + this.r() * 1.5));
    e.tarefa = 'Descarregando caminhão';
    e.etapas = [
      { t: 'mover', rota: rota(e, pega) },
      { t: 'garfo', alt: 0.15 },
      { t: 'acao', f: () => {
        e.carga = carga;
        this.cont.recebidos++;
        e.tarefa = 'Levando à conferência';
        this.registrar('recebimento', `${e.nome} descarregou ${carga.sku?.nome ?? 'palete'}`);
      } },
      { t: 'garfo', alt: 0.4 },
      { t: 'mover', rota: rota(pega, solta) },
      { t: 'garfo', alt: 0.15 },
      { t: 'acao', f: () => {
        slot.carga = carga;
        slot.reservado = false;
        slot.timer = 0;
        slot.conferido = false;
        e.carga = null;
        e.viagens++;
      } },
      { t: 'mover', rota: [{ x: solta.x, z: FAIXA }] },
    ];
  }

  private decidirArmazenagem(e: Empilhadeira) {
    // 1) prioridade: guardar paletes já conferidos
    const slot = this.slots.find((s) => s.carga && s.conferido && !s.reservado);
    const vazio = slot && this.sortear(this.almox.posicoes.filter((p) => statusDe(p) === 'vazio' && !this.reservas.has(p.indice)));
    if (slot && vazio) {
      slot.reservado = true;
      this.reservas.add(vazio.indice);
      const pega: Vec = { x: slot.x, z: slot.z - 1.5 };
      const corredor = this.corredorDe(vazio);
      e.tarefa = `Armazenando em ${vazio.codigo}`;
      e.etapas = [
        { t: 'mover', rota: rota(e, pega) },
        { t: 'garfo', alt: 0.15 },
        { t: 'acao', f: () => {
          e.carga = slot.carga;
          slot.carga = null;
          slot.reservado = false;
          slot.conferido = false;
        } },
        { t: 'garfo', alt: 0.4 },
        { t: 'mover', rota: rota(pega, corredor) },
        { t: 'girar', ang: vazio.lado > 0 ? Math.PI / 2 : -Math.PI / 2 },
        { t: 'garfo', alt: vazio.y + 0.08 },
        { t: 'esperar', s: 0.4 },
        { t: 'acao', f: () => {
          const c = e.carga;
          vazio.sku = c?.sku ?? null;
          vazio.qtd = c?.qtd ?? 0;
          vazio.ultimaMov = this.relogio();
          e.carga = null;
          e.viagens++;
          this.reservas.delete(vazio.indice);
          this.binsSujos.add(vazio.indice);
          this.cont.armazenados++;
          this.registrar('armazenagem', `${e.nome} guardou ${vazio.sku?.nome ?? 'palete'} em ${vazio.codigo}`);
        } },
        { t: 'garfo', alt: 0.15 },
        { t: 'mover', rota: [{ x: corredor.x, z: FAIXA }] },
      ];
      return;
    }
    // 2) atender pedido: levar um palete da estante para a separação
    const est = this.estacoes.find((s) => !s.carga && !s.reservado);
    const origem = est && this.sortear(this.almox.posicoes.filter((p) => (statusDe(p) === 'ok' || statusDe(p) === 'baixo') && !this.reservas.has(p.indice)));
    if (est && origem) {
      est.reservado = true;
      this.reservas.add(origem.indice);
      const corredor = this.corredorDe(origem);
      const solta: Vec = { x: est.x, z: est.z - 1.5 };
      e.tarefa = `Separando de ${origem.codigo}`;
      e.etapas = [
        { t: 'mover', rota: rota(e, corredor) },
        { t: 'girar', ang: origem.lado > 0 ? Math.PI / 2 : -Math.PI / 2 },
        { t: 'garfo', alt: origem.y + 0.08 },
        { t: 'esperar', s: 0.4 },
        { t: 'acao', f: () => {
          e.carga = { id: this.ids++, sku: origem.sku, qtd: origem.qtd };
          this.registrar('armazenagem', `${e.nome} retirou ${origem.sku?.nome ?? 'palete'} de ${origem.codigo}`);
          origem.sku = null;
          origem.qtd = 0;
          origem.ultimaMov = this.relogio();
          this.reservas.delete(origem.indice);
          this.binsSujos.add(origem.indice);
          this.cont.separados++;
        } },
        { t: 'garfo', alt: 0.4 },
        { t: 'mover', rota: rota(corredor, solta) },
        { t: 'garfo', alt: 0.15 },
        { t: 'acao', f: () => {
          est.carga = e.carga;
          est.reservado = false;
          est.timer = 0;
          est.geradas = 0;
          e.carga = null;
          e.viagens++;
        } },
        { t: 'mover', rota: [{ x: solta.x, z: FAIXA }] },
      ];
      return;
    }
    this.ocioso(e);
  }

  private executar(e: Empilhadeira, dt: number) {
    let resto = dt;
    for (let guarda = 0; resto > 1e-6 && e.etapas.length && guarda < 64; guarda++) {
      const et = e.etapas[0];
      if (et.t === 'mover') {
        const alvo = et.rota[0];
        if (!alvo) {
          e.etapas.shift();
          continue;
        }
        const dx = alvo.x - e.x, dz = alvo.z - e.z, d = Math.hypot(dx, dz);
        if (d < 1e-3) {
          et.rota.shift();
          if (!et.rota.length) e.etapas.shift();
          continue;
        }
        const dif = difAng(Math.atan2(dx, dz), e.ang);
        if (Math.abs(dif) > 0.04) {
          const giro = Math.sign(dif) * Math.min(Math.abs(dif), VEL_GIRO * resto);
          e.ang += giro;
          resto -= Math.abs(giro) / VEL_GIRO;
          continue;
        }
        e.ang = Math.atan2(dx, dz);
        const passo = Math.min(d, VEL * resto);
        e.x += (dx / d) * passo;
        e.z += (dz / d) * passo;
        e.percorrido += passo;
        resto -= passo / VEL;
      } else if (et.t === 'girar') {
        const dif = difAng(et.ang, e.ang);
        const giro = Math.sign(dif) * Math.min(Math.abs(dif), VEL_GIRO * resto);
        e.ang += giro;
        resto -= Math.abs(giro) / VEL_GIRO;
        if (Math.abs(difAng(et.ang, e.ang)) < 1e-3) e.etapas.shift();
      } else if (et.t === 'garfo') {
        const d = et.alt - e.garfo;
        const passo = Math.sign(d) * Math.min(Math.abs(d), VEL_GARFO * resto);
        e.garfo += passo;
        resto -= Math.abs(passo) / VEL_GARFO;
        if (Math.abs(et.alt - e.garfo) < 1e-3) e.etapas.shift();
      } else if (et.t === 'esperar') {
        et.s -= resto;
        if (et.s <= 0) {
          resto = -et.s;
          e.etapas.shift();
        } else resto = 0;
      } else {
        e.etapas.shift();
        et.f();
      }
    }
  }
}
