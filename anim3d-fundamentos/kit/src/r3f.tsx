// Componentes que vivem DENTRO do <Canvas> do React Three Fiber.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { criarMedidorQualidade, type OpcoesMedidor } from './qualidade';

/**
 * Iluminação de estúdio para reflexos (metal, vidro, verniz) sem baixar HDR:
 * gera um mapa de ambiente a partir de uma sala virtual. Custo único na montagem.
 */
export function AmbienteEstudio({ intensidade = 1 }: { intensidade?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const sala = new RoomEnvironment();
    const env = pmrem.fromScene(sala, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensidade;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensidade]);
  return null;
}

/**
 * Pausa o render quando o canvas sai da tela ou a aba fica oculta e retoma no modo original.
 * Use em cenas com frameloop="always"; em "demand" ele só evita invalidates inúteis.
 */
export function PausaAutomatica({ margem = '0px' }: { margem?: string }) {
  const canvas = useThree((s) => s.gl.domElement);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const atual = useThree((s) => s.frameloop);
  const modoOriginal = useRef<'always' | 'demand'>(atual === 'never' ? 'always' : atual);
  if (atual !== 'never') modoOriginal.current = atual;

  useEffect(() => {
    let naTela = true;
    const aplicar = () =>
      setFrameloop(naTela && document.visibilityState !== 'hidden' ? modoOriginal.current : 'never');
    const obs =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([e]) => {
            naTela = e.isIntersecting;
            aplicar();
          }, { rootMargin: margem })
        : undefined;
    obs?.observe(canvas);
    document.addEventListener('visibilitychange', aplicar);
    return () => {
      obs?.disconnect();
      document.removeEventListener('visibilitychange', aplicar);
    };
  }, [canvas, setFrameloop, margem]);
  return null;
}

/**
 * Mede FPS e chama `aoMudar(nivel)` ao degradar. Só mede com frameloop="always":
 * em "demand" as pausas entre quadros pareceriam FPS baixo e derrubariam a qualidade à toa,
 * então ele fica inerte. Para medir em "demand", alimente `criarMedidorQualidade` só
 * durante sequências contínuas de quadros (ex.: enquanto a animação de entrada roda).
 */
export function MonitorQualidade({
  aoMudar,
  ...opcoes
}: OpcoesMedidor & { aoMudar: (nivel: number) => void }) {
  const medidor = useRef(criarMedidorQualidade(opcoes));
  const cb = useRef(aoMudar);
  cb.current = aoMudar;
  const frameloop = useThree((s) => s.frameloop);
  useFrame((_, delta) => {
    if (frameloop !== 'always') return;
    const novo = medidor.current.quadro(delta);
    if (novo !== null) cb.current(novo);
  });
  return null;
}

/**
 * Trata a perda do contexto WebGL (GPU reiniciada, aba em segundo plano no mobile, muitos canvases).
 * `aoPerder` normalmente vem de Cena3DSegura e troca a cena pelo fallback.
 */
export function GuardaContexto({ aoPerder }: { aoPerder: () => void }) {
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const perder = (e: Event) => {
      e.preventDefault();
      aoPerder();
    };
    canvas.addEventListener('webglcontextlost', perder);
    return () => canvas.removeEventListener('webglcontextlost', perder);
  }, [canvas, aoPerder]);
  return null;
}
