// Exemplo anim3d-saas · Globo de conexões: pontos com "continentes" procedurais, arcos animados
// entre cidades, pulsos e brilho de atmosfera. Parallax ≤ 8° só com mouse; qualidade adaptativa.
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  QuadraticBezierCurve3,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { amortecer, entradaPorToque, useTokens, type PropsCena } from '@anim3d/kit';
import { descartar, GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';

const MAPA = { primaria: '--cor-primaria', destaque: '--cor-destaque', globo: '--cor-globo' };
const PADRAO = { primaria: '#818cf8', destaque: '#fb923c', globo: '#0f1630' };
const R = 1.6;
const INCLINACAO_MAX = (8 * Math.PI) / 180;
const SEGMENTOS = 64;
const RADIAIS = 6;

// ---------- geografia procedural (sem baixar mapa) ----------
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function ruido(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi), v = s(y - yi), w = s(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}
const terra = (x: number, y: number, z: number) =>
  ruido(x * 1.7 + 3, y * 1.7, z * 1.7) * 0.65 + ruido(x * 3.6, y * 3.6 + 7, z * 3.6) * 0.35;

/** Pontos de terra (densos, cor cheia) e de oceano (esparsos, cor apagada): o contraste desenha os continentes. */
export function geometriaPontos(): { terra: BufferGeometry; oceano: BufferGeometry } {
  const N = 22000;
  const ouro = Math.PI * (3 - Math.sqrt(5));
  const t: number[] = [];
  const o: number[] = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const x = Math.cos(i * ouro) * r;
    const z = Math.sin(i * ouro) * r;
    if (terra(x, y, z) > 0.5) t.push(x * R, y * R, z * R);
    else if (i % 5 === 0) o.push(x * R, y * R, z * R);
  }
  const geo = (p: number[]) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    return g;
  };
  return { terra: geo(t), oceano: geo(o) };
}

export function texturaCirculo(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  return new CanvasTexture(c);
}

export function latLon(lat: number, lon: number, raio = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new Vector3(-raio * Math.sin(phi) * Math.cos(theta), raio * Math.cos(phi), raio * Math.sin(phi) * Math.sin(theta));
}

const CIDADES: Record<string, [number, number]> = {
  'São Paulo': [-23.5, -46.6], 'Nova York': [40.7, -74], Londres: [51.5, -0.1], Lagos: [6.5, 3.4],
  Mumbai: [19, 72.8], Tóquio: [35.7, 139.7], Sydney: [-33.9, 151.2], Lisboa: [38.7, -9.1],
  'Cidade do México': [19.4, -99.1], Singapura: [1.35, 103.8], Joanesburgo: [-26.2, 28], Santiago: [-33.4, -70.6],
};
const ROTAS: [string, string][] = [
  ['São Paulo', 'Lisboa'], ['São Paulo', 'Nova York'], ['Nova York', 'Londres'], ['Londres', 'Mumbai'],
  ['Lisboa', 'Lagos'], ['Mumbai', 'Singapura'], ['Singapura', 'Tóquio'], ['Tóquio', 'Sydney'],
  ['Cidade do México', 'São Paulo'], ['Lagos', 'Joanesburgo'], ['Santiago', 'São Paulo'], ['Londres', 'Nova York'],
];

export const atmosferaMaterial = () =>
  new ShaderMaterial({
    uniforms: { cor: { value: new Color() } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 cor; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 4.0); gl_FragColor = vec4(cor, f * 0.7); }`,
    transparent: true,
    blending: AdditiveBlending,
    side: BackSide,
    depthWrite: false,
  });

interface Arco {
  geo: TubeGeometry;
  curva: QuadraticBezierCurve3;
  cabeca: Mesh;
  fase: number;
  duracao: number;
}

function Globo({ cores, nivel }: { cores: typeof PADRAO; nivel: number }) {
  const grupo = useRef<Group>(null);
  const toque = useMemo(entradaPorToque, []);
  const animado = nivel < 3;

  const { pontos, circulo, arcosGrupo, arcos, pulsos, matArco, matCabeca, matPulso, atmosfera } = useMemo(() => {
    const matArco = new MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    const matCabeca = new MeshBasicMaterial({ toneMapped: false });
    const matPulso = new MeshBasicMaterial({ transparent: true, side: DoubleSide, depthWrite: false, toneMapped: false });
    const arcosGrupo = new Group();
    const arcos: Arco[] = ROTAS.map(([a, b], i) => {
      const pa = latLon(...CIDADES[a]);
      const pb = latLon(...CIDADES[b]);
      const meio = pa.clone().add(pb).multiplyScalar(0.5);
      meio.normalize().multiplyScalar(R + pa.distanceTo(pb) * 0.42);
      const curva = new QuadraticBezierCurve3(pa, meio, pb);
      const geo = new TubeGeometry(curva, SEGMENTOS, 0.009, RADIAIS, false);
      geo.setDrawRange(0, 0);
      const cabeca = new Mesh(new SphereGeometry(0.028, 12, 12), matCabeca);
      arcosGrupo.add(new Mesh(geo, matArco), cabeca);
      return { geo, curva, cabeca, fase: (i * 0.37) % 1, duracao: 2.6 + (i % 4) * 0.45 };
    });
    const pulsos = Object.values(CIDADES).map(([lat, lon], i) => {
      const p = latLon(lat, lon, R * 1.004);
      const anel = new Mesh(new RingGeometry(0.022, 0.034, 32), matPulso.clone());
      const nucleo = new Mesh(new CircleGeometry(0.018, 16), matCabeca);
      for (const m of [anel, nucleo]) {
        m.position.copy(p);
        m.lookAt(p.clone().multiplyScalar(2));
        arcosGrupo.add(m);
      }
      return { anel, fase: i * 0.29 };
    });
    return {
      pontos: geometriaPontos(),
      circulo: texturaCirculo(),
      arcosGrupo,
      arcos,
      pulsos,
      matArco,
      matCabeca,
      matPulso,
      atmosfera: atmosferaMaterial(),
    };
  }, []);

  useEffect(() => {
    matArco.color.set(cores.destaque);
    matCabeca.color.set(cores.destaque).multiplyScalar(1.6);
    for (const p of pulsos) (p.anel.material as MeshBasicMaterial).color.set(cores.destaque);
    (atmosfera.uniforms.cor.value as Color).set(cores.primaria);
  }, [cores, matArco, matCabeca, pulsos, atmosfera]);

  useEffect(
    () => () => {
      descartar(arcosGrupo);
      pontos.terra.dispose();
      pontos.oceano.dispose();
      circulo.dispose();
      atmosfera.dispose();
      matPulso.dispose();
    },
    [arcosGrupo, pontos, circulo, atmosfera, matPulso],
  );

  useFrame((estado, delta) => {
    const g = grupo.current;
    if (!g) return;
    const t = estado.clock.elapsedTime;
    if (animado) g.rotation.y += delta * 0.07;
    const alvoX = toque ? 0.32 : 0.32 + estado.pointer.y * INCLINACAO_MAX;
    const alvoZ = toque ? 0 : -estado.pointer.x * INCLINACAO_MAX;
    g.rotation.x = amortecer(g.rotation.x, alvoX, 3, delta);
    g.rotation.z = amortecer(g.rotation.z, alvoZ, 3, delta);

    const porSeg = RADIAIS * 6;
    for (const a of arcos) {
      const p = animado ? ((t / a.duracao + a.fase) % 1) * 1.5 : 0.75; // 0..1 desenha, 1..1.5 apaga
      const cabeca = Math.min(p, 1);
      const cauda = Math.min(Math.max(p - 0.5, 0), 1);
      const i0 = Math.floor(cauda * SEGMENTOS);
      const i1 = Math.floor(cabeca * SEGMENTOS);
      a.geo.setDrawRange(i0 * porSeg, (i1 - i0) * porSeg);
      a.cabeca.visible = p < 1;
      if (p < 1) a.curva.getPoint(cabeca, a.cabeca.position);
    }
    for (const p of pulsos) {
      const f = animado ? (t * 0.6 + p.fase) % 1 : 0.3;
      p.anel.scale.setScalar(1 + f * 2.8);
      (p.anel.material as MeshBasicMaterial).opacity = 1 - f;
    }
  });

  return (
    <group ref={grupo} rotation={[0.32, 2.2, 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.985, 64, 64]} />
        <meshStandardMaterial color={cores.globo} roughness={0.85} metalness={0.1} />
      </mesh>
      <points geometry={pontos.terra}>
        {/* toneMapped={false}: o ACES padrão do R3F apaga materiais sem luz (pontos, linhas, brilhos) */}
        <pointsMaterial color={cores.primaria} size={0.03} map={circulo} alphaTest={0.5} sizeAttenuation transparent toneMapped={false} />
      </points>
      <points geometry={pontos.oceano}>
        <pointsMaterial color={cores.primaria} size={0.018} map={circulo} alphaTest={0.5} sizeAttenuation transparent opacity={0.3} toneMapped={false} />
      </points>
      <primitive object={arcosGrupo} />
      <mesh scale={1.1} material={atmosfera}>
        <sphereGeometry args={[R, 64, 64]} />
      </mesh>
    </group>
  );
}

export default function Globo3DCena({ aoFalhar }: PropsCena) {
  const cores = useTokens(MAPA, PADRAO);
  const [nivel, setNivel] = useState(0);
  return (
    <Canvas
      frameloop="always"
      dpr={nivel >= 1 ? 1 : [1, 2]}
      camera={{ position: [0, 0, 6.4], fov: 35 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[-4, 3, 5]} intensity={2.4} />
      <directionalLight position={[5, -2, -3]} intensity={0.8} color={cores.primaria} />
      <Globo cores={cores} nivel={nivel} />
      <PausaAutomatica />
      <MonitorQualidade aoMudar={(n) => (n >= 4 ? aoFalhar() : setNivel(n))} />
      <GuardaContexto aoPerder={aoFalhar} />
    </Canvas>
  );
}
