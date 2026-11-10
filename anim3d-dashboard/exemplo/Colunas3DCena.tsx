// Cena: InstancedMesh (1 draw call para todas as colunas), câmera ortográfica isométrica,
// frameloop "demand" e transição de valores sem re-render por tick.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box3, BoxGeometry, Color, Object3D, Vector3, type InstancedMesh, type OrthographicCamera } from 'three';
import { amortecer, useTokens, type PropsCena } from '@anim3d/kit';
import { enquadrarOrto, GuardaContexto } from '@anim3d/kit/cena';

export interface Ponto {
  rotulo: string;
  valor: number;
}
export interface PropsColunas {
  pontos: Ponto[];
  /** Colunas da grade; as linhas saem de pontos.length / colunas. */
  colunas: number;
}

const MAPA = { primaria: '--cor-primaria', destaque: '--cor-destaque', chao: '--cor-superficie' };
const PADRAO = { primaria: '#4f46e5', destaque: '#f97316', chao: '#e5e7eb' };
const ALTURA_MAX = 4;
const PASSO = 1.3;
const fmt = new Intl.NumberFormat('pt-BR');

const geometria = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // base no chão
const _o = new Object3D();
const _c = new Color();

function posicao(i: number, colunas: number, linhas: number): [number, number] {
  return [(i % colunas - (colunas - 1) / 2) * PASSO, (Math.floor(i / colunas) - (linhas - 1) / 2) * PASSO];
}

function Colunas({ pontos, colunas, cores, foco, aoFocar }: PropsColunas & {
  cores: typeof PADRAO;
  foco: number | null;
  aoFocar: (i: number | null) => void;
}) {
  const malha = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const linhas = Math.ceil(pontos.length / colunas);
  const max = Math.max(...pontos.map((p) => p.valor), 1);
  const alvos = useMemo(() => pontos.map((p) => Math.max((p.valor / max) * ALTURA_MAX, 0.02)), [pontos, max]);
  const atuais = useRef<number[]>([]);

  useLayoutEffect(() => {
    // novos itens nascem do chão: entrada animada na primeira carga
    atuais.current = alvos.map((_, i) => atuais.current[i] ?? 0.02);
    invalidate();
  }, [alvos, invalidate]);

  useLayoutEffect(() => {
    const m = malha.current;
    if (!m) return;
    // escala sequencial com significado: valor baixo = primária apagada, alto = destaque; foco = branco
    const base = new Color(cores.primaria).multiplyScalar(0.55);
    const topo = new Color(cores.destaque);
    pontos.forEach((p, i) =>
      m.setColorAt(i, i === foco ? _c.set('#ffffff') : _c.copy(base).lerp(topo, (p.valor / max) ** 1.5)),
    );
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [pontos, foco, cores, max, invalidate]);

  useFrame((_, delta) => {
    const m = malha.current;
    if (!m) return;
    let movendo = false;
    alvos.forEach((alvo, i) => {
      const h = amortecer(atuais.current[i], alvo, 10, delta);
      atuais.current[i] = Math.abs(h - alvo) < 1e-3 ? alvo : h;
      if (atuais.current[i] !== alvo) movendo = true;
      const [x, z] = posicao(i, colunas, linhas);
      _o.position.set(x, 0, z);
      _o.scale.set(0.9, atuais.current[i], 0.9);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere(); // o raycast do hover usa a esfera das instâncias
    if (movendo) invalidate(); // em "demand", só pede o próximo quadro enquanto anima
  });

  return (
    <instancedMesh
      ref={malha}
      args={[geometria, undefined, pontos.length]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        aoFocar(e.instanceId ?? null);
      }}
      onPointerOut={() => aoFocar(null)}
    >
      <meshStandardMaterial flatShading />
    </instancedMesh>
  );
}

function Enquadrar({ colunas, linhas }: { colunas: number; linhas: number }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const { width, height } = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const meiaX = (colunas * PASSO) / 2;
    const meiaZ = (linhas * PASSO) / 2;
    enquadrarOrto(camera, new Box3(new Vector3(-meiaX, 0, -meiaZ), new Vector3(meiaX, ALTURA_MAX, meiaZ)), width, height);
    invalidate();
  }, [camera, width, height, colunas, linhas, invalidate]);
  return null;
}

export default function Colunas3DCena({ pontos, colunas, aoFalhar }: PropsColunas & PropsCena) {
  const cores = useTokens(MAPA, PADRAO);
  const [foco, setFoco] = useState<number | null>(null);
  const linhas = Math.ceil(pontos.length / colunas);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [10, 10, 10], zoom: 40 }}
        onPointerMissed={() => setFoco(null)}
      >
        {/* Luz física (three ≥ r155): ambiente ~1 + principal ~2 mantêm a cor do token reconhecível. */}
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 10, 6]} intensity={2} />
        <directionalLight position={[-6, 4, -2]} intensity={0.5} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
          <planeGeometry args={[colunas * PASSO + 0.6, linhas * PASSO + 0.6]} />
          <meshBasicMaterial color={cores.chao} />
        </mesh>
        <Colunas pontos={pontos} colunas={colunas} cores={cores} foco={foco} aoFocar={setFoco} />
        <Enquadrar colunas={colunas} linhas={linhas} />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>
      {foco !== null && pontos[foco] && (
        <div role="status" className="dica-coluna" style={{ position: 'absolute', top: 8, left: 8 }}>
          {pontos[foco].rotulo}: <strong>{fmt.format(pontos[foco].valor)}</strong>
        </div>
      )}
    </div>
  );
}
