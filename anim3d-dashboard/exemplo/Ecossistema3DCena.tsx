// Exemplo anim3d-dashboard · Ecossistema isométrico: blocos low poly, cabos no chão e pacotes de dados
// percorrendo as rotas (InstancedMesh: 1 draw call para todos). Hover ergue o sistema e mostra o fluxo.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Box3,
  BoxGeometry,
  Color,
  CurvePath,
  Group,
  LineCurve3,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
  type InstancedMesh,
  type OrthographicCamera,
} from 'three';
import { amortecer, useTokens, type PropsCena } from '@anim3d/kit';
import { AmbienteEstudio, enquadrarOrto, GuardaContexto, PausaAutomatica } from '@anim3d/kit/cena';
import type { DadosEcossistema, Modelo, No } from './ecossistemaDados';

const MAPA = {
  primaria: '--cor-primaria',
  destaque: '--cor-destaque',
  sucesso: '--cor-sucesso',
  plataforma: '--cor-plataforma',
  bloco: '--cor-bloco',
  cabo: '--cor-cabo',
};
const PADRAO = {
  primaria: '#818cf8',
  destaque: '#fb923c',
  sucesso: '#4ade80',
  plataforma: '#161b2e',
  bloco: '#2a3150',
  cabo: '#3b4470',
};
type Cores = typeof PADRAO;

const ALTURA: Record<Modelo, number> = { saas: 1, mobile: 1.05, painel: 0.95, portao: 0.85, guarita: 0.85, dw: 1.05, banco: 0.8, etl: 0.9, fonte: 0.5 };
const _o = new Object3D();
const _v = new Vector3();

// ---------- modelos low poly (só caixas e cilindros) ----------
function Cx({ p, s, m }: { p: [number, number, number]; s: [number, number, number]; m: MeshStandardMaterial }) {
  return (
    <mesh position={p} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}
function Cil({ p, r, h, m }: { p: [number, number, number]; r: number; h: number; m: MeshStandardMaterial }) {
  return (
    <mesh position={p} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 24]} />
    </mesh>
  );
}

interface Materiais {
  bloco: MeshStandardMaterial;
  tela: MeshStandardMaterial;
  destaque: MeshStandardMaterial;
  alerta: MeshStandardMaterial;
  sucesso: MeshStandardMaterial;
}

function Engrenagem({ m }: { m: MeshStandardMaterial }) {
  const ref = useRef<Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 1.2;
  });
  return (
    <group ref={ref} position={[0, 0.72, 0]}>
      <Cil p={[0, 0, 0]} r={0.26} h={0.12} m={m} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * 0.3, 0, Math.sin((i / 8) * Math.PI * 2) * 0.3]} rotation-y={-(i / 8) * Math.PI * 2} material={m}>
          <boxGeometry args={[0.1, 0.12, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

function Modelo3D({ modelo, m }: { modelo: Modelo; m: Materiais }): ReactNode {
  switch (modelo) {
    case 'saas':
      return (
        <>
          <Cx p={[0, 0.12, 0]} s={[0.5, 0.08, 0.35]} m={m.bloco} />
          <Cx p={[0, 0.3, 0]} s={[0.08, 0.3, 0.08]} m={m.bloco} />
          <Cx p={[0, 0.72, 0]} s={[1.3, 0.78, 0.08]} m={m.bloco} />
          <Cx p={[0, 0.72, 0.045]} s={[1.18, 0.66, 0.01]} m={m.tela} />
          <Cx p={[-0.32, 0.9, 0.055]} s={[0.4, 0.06, 0.01]} m={m.destaque} />
          <Cx p={[0.2, 0.62, 0.055]} s={[0.6, 0.28, 0.01]} m={m.bloco} />
        </>
      );
    case 'mobile':
      return (
        <>
          <Cx p={[0, 0.58, 0]} s={[0.56, 1.0, 0.08]} m={m.bloco} />
          <Cx p={[0, 0.58, 0.045]} s={[0.48, 0.88, 0.01]} m={m.tela} />
          <Cx p={[0, 0.8, 0.055]} s={[0.36, 0.14, 0.01]} m={m.destaque} />
          <Cx p={[0, 0.52, 0.055]} s={[0.36, 0.08, 0.01]} m={m.bloco} />
          <Cx p={[0, 0.38, 0.055]} s={[0.36, 0.08, 0.01]} m={m.bloco} />
        </>
      );
    case 'painel':
      return (
        <>
          <Cx p={[0, 0.12, 0]} s={[0.5, 0.08, 0.35]} m={m.bloco} />
          <Cx p={[0, 0.3, 0]} s={[0.08, 0.3, 0.08]} m={m.bloco} />
          <Cx p={[0, 0.7, 0]} s={[1.3, 0.72, 0.08]} m={m.bloco} />
          <Cx p={[0, 0.7, 0.045]} s={[1.18, 0.6, 0.01]} m={m.tela} />
          {[0.18, 0.32, 0.24, 0.42, 0.3].map((h, i) => (
            <Cx key={i} p={[-0.4 + i * 0.2, 0.46 + h / 2, 0.06]} s={[0.12, h, 0.02]} m={i === 3 ? m.destaque : m.sucesso} />
          ))}
        </>
      );
    case 'portao':
      return (
        <>
          <Cx p={[-0.42, 0.42, 0]} s={[0.16, 0.84, 0.3]} m={m.bloco} />
          <Cx p={[0.42, 0.42, 0]} s={[0.16, 0.84, 0.3]} m={m.bloco} />
          <Cx p={[0, 0.9, 0]} s={[1.08, 0.14, 0.34]} m={m.bloco} />
          <Cx p={[0, 0.8, 0]} s={[0.66, 0.04, 0.04]} m={m.destaque} />
        </>
      );
    case 'guarita':
      return (
        <>
          <Cx p={[0, 0.36, 0]} s={[0.62, 0.72, 0.62]} m={m.bloco} />
          <Cx p={[0, 0.78, 0]} s={[0.8, 0.1, 0.8]} m={m.bloco} />
          <Cx p={[0, 0.46, 0.315]} s={[0.36, 0.2, 0.01]} m={m.alerta} />
        </>
      );
    case 'dw':
      return (
        <>
          {[0.18, 0.5, 0.82].map((y, i) => (
            <group key={i}>
              <Cil p={[0, y, 0]} r={0.6} h={0.26} m={m.bloco} />
              <Cil p={[0, y + 0.135, 0]} r={0.62} h={0.012} m={i === 2 ? m.destaque : m.tela} />
            </group>
          ))}
        </>
      );
    case 'banco':
      return (
        <>
          {[0.18, 0.5].map((y, i) => (
            <group key={i}>
              <Cil p={[0, y, 0]} r={0.45} h={0.26} m={m.bloco} />
              <Cil p={[0, y + 0.135, 0]} r={0.47} h={0.012} m={m.tela} />
            </group>
          ))}
        </>
      );
    case 'etl':
      return (
        <>
          <Cx p={[0, 0.32, 0]} s={[1.1, 0.56, 0.8]} m={m.bloco} />
          <Cx p={[0, 0.32, 0.405]} s={[0.8, 0.08, 0.01]} m={m.sucesso} />
          <Engrenagem m={m.destaque} />
        </>
      );
    case 'fonte':
      return (
        <>
          <Cx p={[0, 0.2, 0]} s={[0.8, 0.4, 0.6]} m={m.bloco} />
          <Cx p={[0, 0.41, 0]} s={[0.6, 0.02, 0.4]} m={m.tela} />
        </>
      );
  }
}

// ---------- cabos e pacotes ----------
function caminho(a: No, b: No): CurvePath<Vector3> {
  const y = 0.06;
  const pts =
    a.x === b.x
      ? [new Vector3(a.x, y, a.z), new Vector3(b.x, y, b.z)]
      : (() => {
          const zm = (a.z + b.z) / 2;
          return [new Vector3(a.x, y, a.z), new Vector3(a.x, y, zm), new Vector3(b.x, y, zm), new Vector3(b.x, y, b.z)];
        })();
  const c = new CurvePath<Vector3>();
  for (let i = 0; i < pts.length - 1; i++) c.add(new LineCurve3(pts[i], pts[i + 1]));
  return c;
}

function Sistema({ no, m, foco, aoFocar }: { no: No; m: Materiais; foco: boolean; aoFocar: (id: string | null) => void }) {
  const ref = useRef<Group>(null);
  useFrame((_, d) => {
    const g = ref.current;
    if (g) g.position.y = amortecer(g.position.y, foco ? 0.22 : 0, 12, d);
  });
  return (
    <group position={[no.x, 0, no.z]}>
      <mesh position={[0, 0.02, 0]} receiveShadow material={foco ? m.destaque : m.tela}>
        <boxGeometry args={[1.5, 0.04, 1.2]} />
      </mesh>
      <group
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          aoFocar(no.id);
        }}
        onPointerOut={() => aoFocar(null)}
      >
        <Modelo3D modelo={no.modelo} m={m} />
      </group>
    </group>
  );
}

function Rede({ dados, cores, foco, aoFocar, cartao }: {
  dados: DadosEcossistema;
  cores: Cores;
  foco: string | null;
  aoFocar: (id: string | null) => void;
  cartao: RefObject<HTMLDivElement | null>;
}) {
  const porId = useMemo(() => new Map(dados.nos.map((n) => [n.id, n])), [dados]);

  const m = useMemo<Materiais>(
    () => ({
      bloco: new MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 }),
      tela: new MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }),
      destaque: new MeshStandardMaterial({ roughness: 0.4, toneMapped: false }),
      alerta: new MeshStandardMaterial({ roughness: 0.4, toneMapped: false }),
      sucesso: new MeshStandardMaterial({ roughness: 0.4, toneMapped: false }),
    }),
    [],
  );
  const matCabo = useMemo(() => new MeshStandardMaterial({ roughness: 0.6 }), []);
  const matCaboAtivo = useMemo(() => new MeshStandardMaterial({ roughness: 0.4, toneMapped: false }), []);
  const matPacote = useMemo(() => new MeshStandardMaterial({ toneMapped: false }), []);
  const geoPacote = useMemo(() => new BoxGeometry(0.2, 0.2, 0.2), []); // estável: args novos recriariam o objeto

  useEffect(() => {
    m.bloco.color.set(cores.bloco);
    m.tela.color.set(cores.primaria).multiplyScalar(0.35);
    m.tela.emissive.set(cores.primaria).multiplyScalar(0.25);
    m.destaque.color.set(cores.destaque);
    m.destaque.emissive.set(cores.destaque).multiplyScalar(0.6);
    m.alerta.color.set('#f87171');
    m.alerta.emissive.set('#f87171').multiplyScalar(0.6);
    m.sucesso.color.set(cores.sucesso);
    m.sucesso.emissive.set(cores.sucesso).multiplyScalar(0.5);
    matCabo.color.set(cores.cabo);
    matCaboAtivo.color.set(cores.primaria);
    matCaboAtivo.emissive.set(cores.primaria).multiplyScalar(0.5);
  }, [cores, m, matCabo, matCaboAtivo]);

  // um cabo por par (ida e volta usam o mesmo)
  const cabos = useMemo(() => {
    const vistos = new Map<string, { chave: string; a: string; b: string; curva: CurvePath<Vector3>; geo: TubeGeometry }>();
    for (const r of dados.rotas) {
      const [a, b] = [r.de, r.ate].sort();
      const chave = `${a}|${b}`;
      if (vistos.has(chave)) continue;
      const curva = caminho(porId.get(r.de)!, porId.get(r.ate)!);
      vistos.set(chave, { chave, a, b, curva, geo: new TubeGeometry(curva, 64, 0.035, 6, false) });
    }
    return vistos;
  }, [dados, porId]);
  useEffect(() => () => cabos.forEach((c) => c.geo.dispose()), [cabos]);

  const rotas = useMemo(
    () =>
      dados.rotas.map((r) => {
        const [a, b] = [r.de, r.ate].sort();
        const cabo = cabos.get(`${a}|${b}`)!;
        // a curva foi criada de r0.de → r0.ate; se esta rota anda ao contrário, inverte
        const primeiro = dados.rotas.find((x) => [x.de, x.ate].sort().join('|') === cabo.chave)!;
        return { ...r, curva: cabo.curva, inverso: primeiro.de !== r.de };
      }),
    [dados, cabos],
  );

  const pacotes = useRef<InstancedMesh>(null);
  const corTipo = useMemo(() => ({ pedido: new Color(), resposta: new Color(), carga: new Color() }), []);
  useEffect(() => {
    corTipo.pedido.set(cores.destaque).multiplyScalar(1.4);
    corTipo.resposta.set('#ffffff').multiplyScalar(1.3);
    corTipo.carga.set(cores.sucesso).multiplyScalar(1.4);
    const p = pacotes.current;
    if (!p) return;
    rotas.forEach((r, i) => p.setColorAt(i, corTipo[r.tipo]));
    if (p.instanceColor) p.instanceColor.needsUpdate = true;
  }, [cores, rotas, corTipo]);

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame((estado) => {
    const p = pacotes.current;
    if (p) {
      const t = estado.clock.elapsedTime % dados.ciclo;
      rotas.forEach((r, i) => {
        let u = (t - r.t + dados.ciclo) % dados.ciclo;
        u /= dados.duracao;
        if (u <= 1) {
          r.curva.getPointAt(r.inverso ? 1 - u : u, _o.position);
          _o.position.y = 0.16;
          _o.scale.setScalar(Math.sin(u * Math.PI) * 0.6 + 0.6);
        } else _o.scale.setScalar(0);
        _o.updateMatrix();
        p.setMatrixAt(i, _o.matrix);
      });
      p.instanceMatrix.needsUpdate = true;
    }
    // cartão HTML preso ao sistema em foco (move o elemento direto, sem re-render)
    const el = cartao.current;
    const no = foco ? porId.get(foco) : undefined;
    if (el && no) {
      _v.set(no.x, ALTURA[no.modelo] + 0.4, no.z).project(camera);
      el.style.transform = `translate(${((_v.x + 1) / 2) * size.width}px, ${((1 - _v.y) / 2) * size.height}px) translate(-50%, -100%)`;
    }
  });

  return (
    <>
      <mesh position={[0.9, -0.12, 0.7]} receiveShadow>
        <boxGeometry args={[12.6, 0.24, 12.2]} />
        <meshStandardMaterial color={cores.plataforma} roughness={0.9} />
      </mesh>
      <gridHelper args={[12, 24, cores.cabo, cores.cabo]} position={[0.9, 0.005, 0.7]} />
      {[...cabos.values()].map((c) => (
        <mesh key={c.chave} geometry={c.geo} material={foco && (c.a === foco || c.b === foco) ? matCaboAtivo : matCabo} />
      ))}
      <instancedMesh ref={pacotes} args={[geoPacote, matPacote, rotas.length]} />
      {dados.nos.map((no) => (
        <Sistema key={no.id} no={no} m={m} foco={foco === no.id} aoFocar={aoFocar} />
      ))}
    </>
  );
}

function Enquadrar() {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const { width, height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    enquadrarOrto(camera, new Box3(new Vector3(-5.4, 0, -5.4), new Vector3(7.2, 1.2, 6.8)), width, height, 1.02);
  }, [camera, width, height]);
  return null;
}

export default function Ecossistema3DCena({ dados, aoFalhar }: { dados: DadosEcossistema } & PropsCena) {
  const cores = useTokens(MAPA, PADRAO);
  const [foco, setFoco] = useState<string | null>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const no = foco ? dados.nos.find((n) => n.id === foco) : undefined;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas orthographic shadows="percentage" dpr={[1, 2]} camera={{ position: [10, 10, 10], zoom: 40 }} onPointerMissed={() => setFoco(null)}>
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[6, 12, 4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
        />
        <AmbienteEstudio intensidade={0.35} />
        <Rede dados={dados} cores={cores} foco={foco} aoFocar={setFoco} cartao={cartao} />
        <Enquadrar />
        <PausaAutomatica />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>
      <div
        ref={cartao}
        role="status"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          display: no ? 'block' : 'none',
          background: 'var(--cartao-fundo, rgba(12,16,32,.92))',
          border: '1px solid var(--cor-cabo, #3b4470)',
          color: 'var(--texto, #f3f4f6)',
          borderRadius: 10,
          padding: '10px 12px',
          font: '12px/1.5 ui-monospace, monospace',
          minWidth: 220,
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        }}
      >
        {no && (
          <>
            <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{no.nome}</strong>
            {no.fluxo.map((linha) => {
              const [rotulo, ...resto] = linha.split(':');
              return resto.length ? (
                <div key={linha}>
                  <span style={{ color: 'var(--cor-destaque, #fb923c)' }}>{rotulo}:</span>
                  {resto.join(':')}
                </div>
              ) : (
                <div key={linha}>{linha}</div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
