// Invólucro que decide entre cena 3D, versão estática e fallback, e carrega a cena sob demanda.
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { temWebGL, useMovimentoReduzido } from './ambiente';
import { useProximo } from './viewport';

/** Props que toda cena carregada recebe. Passe `aoFalhar` para <GuardaContexto aoPerder={aoFalhar} />. */
export interface PropsCena {
  aoFalhar: () => void;
  /** true quando a cena foi carregada com "reduzir movimento" ativo: corte animações não essenciais. */
  movimentoReduzido: boolean;
}

export type ModoCena = 'fallback' | 'reduzido' | 'cena';
/** Por que o fallback está na tela: mostre uma mensagem honesta para cada caso. */
export type MotivoFallback = 'aguardando' | 'sem-webgl' | 'erro';

/** Cascata da skill anim3d-performance-a11y, como função pura (testável). */
export function decidirModo(a: {
  webgl: boolean;
  reduzido: boolean;
  proximo: boolean;
  falhou: boolean;
  /** Ferramentas (gêmeo digital, mapa, editor): o 3D é o conteúdo, então carrega mesmo com movimento reduzido. */
  cenaComReduzido?: boolean;
}): ModoCena {
  if (!a.webgl || a.falhou) return 'fallback';
  if (a.reduzido && !a.cenaComReduzido) return 'reduzido';
  return a.proximo ? 'cena' : 'fallback';
}

class LimiteDeErro extends Component<{ fallback: ReactNode; aoErro: () => void; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {
    this.props.aoErro();
  }
  render() {
    return this.state.erro ? this.props.fallback : this.props.children;
  }
}

export interface Cena3DSeguraProps<P extends object = object> {
  /** `() => import('./MinhaCena')` declarado FORA do componente (módulo com export default). */
  carregar: () => Promise<{ default: ComponentType<P & PropsCena> }>;
  /** Dados repassados à cena (o desenho é dado, não código). */
  props?: P;
  /** Poster/SVG sem WebGL, carregando ou com erro. Como função, recebe o motivo para mensagens honestas. */
  fallback: ReactNode | ((motivo: MotivoFallback) => ReactNode);
  /** Estado final estático para movimento reduzido (cenas decorativas). Padrão: `fallback`. */
  reduzido?: ReactNode;
  /**
   * true = carrega a cena mesmo com "reduzir movimento" e passa `movimentoReduzido` a ela.
   * Use quando o 3D é a ferramenta (mapa, gêmeo digital), não enfeite. Padrão: false.
   */
  cenaComMovimentoReduzido?: boolean;
  /** Descrição da cena. Sem ela, a cena é tratada como decorativa (aria-hidden). */
  rotulo?: string;
  /** Reserva o espaço e evita salto de layout (CLS). Ex.: '16 / 9'. */
  aspecto?: string;
  margem?: string;
  className?: string;
  style?: CSSProperties;
}

export function Cena3DSegura<P extends object = object>({
  carregar,
  props,
  fallback,
  reduzido,
  cenaComMovimentoReduzido = false,
  rotulo,
  aspecto = '16 / 9',
  margem = '200px',
  className,
  style,
}: Cena3DSeguraProps<P>) {
  const [ref, proximo] = useProximo<HTMLDivElement>(margem);
  const movimentoReduzido = useMovimentoReduzido();
  const [webgl, setWebgl] = useState<boolean | null>(null); // decidido no cliente: SSR e hidratação começam no fallback
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setWebgl(temWebGL()), []);
  const Cena = useMemo(() => lazy(carregar), [carregar]);
  const aoFalhar = useCallback(() => setFalhou(true), []);

  const modo = decidirModo({ webgl: !!webgl, reduzido: movimentoReduzido, proximo, falhou, cenaComReduzido: cenaComMovimentoReduzido });
  const motivo: MotivoFallback = webgl === false ? 'sem-webgl' : falhou ? 'erro' : 'aguardando';
  const render = (m: MotivoFallback) => (typeof fallback === 'function' ? fallback(m) : fallback);
  const a11y = rotulo ? { role: 'group', 'aria-label': rotulo } : { 'aria-hidden': true as const };

  return (
    <div
      ref={ref}
      className={className}
      data-modo={modo}
      data-motivo={modo === 'fallback' ? motivo : undefined}
      style={{ position: 'relative', aspectRatio: aspecto, ...style }}
      {...a11y}
    >
      {modo === 'cena' ? (
        <LimiteDeErro fallback={render('erro')} aoErro={aoFalhar}>
          <Suspense fallback={render('aguardando')}>
            <Cena {...((props ?? {}) as P)} aoFalhar={aoFalhar} movimentoReduzido={movimentoReduzido} />
          </Suspense>
        </LimiteDeErro>
      ) : modo === 'reduzido' ? (
        (reduzido ?? render(motivo))
      ) : (
        render(motivo)
      )}
    </div>
  );
}
