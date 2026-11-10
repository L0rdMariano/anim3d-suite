// Degradação adaptativa: mede FPS e desce de nível sem nunca subir de novo (histerese).

export interface OpcoesMedidor {
  /** FPS mínimo aceitável. Padrão 45 (use 30 para cenas decorativas no mobile). */
  alvo?: number;
  /** Janela de medição em segundos. */
  janela?: number;
  /** Segundos ignorados no início e após cada mudança (shaders compilando, GC). */
  aquecimento?: number;
  /** Nível máximo. Sugestão: 1 = dpr 1 · 2 = sem sombras · 3 = animação reduzida · 4 = fallback. */
  maxNivel?: number;
}

/**
 * Medidor puro (testável sem WebGL). Chame `quadro(delta)` a cada frame;
 * devolve o novo nível quando ele muda, senão `null`.
 */
export function criarMedidorQualidade({
  alvo = 45,
  janela = 1.5,
  aquecimento = 1,
  maxNivel = 4,
}: OpcoesMedidor = {}) {
  let tempo = 0;
  let quadros = 0;
  let nivel = 0;
  let espera = aquecimento;
  return {
    get nivel() {
      return nivel;
    },
    quadro(delta: number): number | null {
      if (delta <= 0 || delta > 0.5) return null; // aba oculta ou pausa: ignora
      if (espera > 0) {
        espera -= delta;
        return null;
      }
      tempo += delta;
      quadros++;
      if (tempo < janela) return null;
      const fps = quadros / tempo;
      tempo = 0;
      quadros = 0;
      if (fps < alvo && nivel < maxNivel) {
        nivel++;
        espera = aquecimento;
        return nivel;
      }
      return null;
    },
  };
}
