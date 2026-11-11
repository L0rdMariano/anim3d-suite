// Exemplo anim3d-topologia · Cena 3D da topologia: dispositivos modelados em 3D, camadas em altura, cabos, pacote com rastro,
// estouro no descarte e tráfego de fundo. O MOTOR é o mesmo da vista 2D (topologiaSim.ts): esta cena só desenha o estado
// e devolve eventos (clique, arrastar, fim de salto) para o componente pai, que continua sendo o dono dos dados.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Plane, Quaternion, Vector3 } from 'three';
import { amortecer, type PropsCena } from '@anim3d/kit';
import { GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';
import type { Disp, Enlace, Resultado, TipoDisp, Topologia } from './topologiaSim';

export interface Props3D {
  topo: Topologia;
  selecionado: { tipo: 'd' | 'e'; id: string } | null;
  modo: 'mover' | 'ligar';
  pendente: string | null;
  resultado: Resultado | null;
  anim: { passo: number; tocando: boolean };
  corPacote: string;
  destino: string;
  aoCliqueDisp: (id: string) => void;
  aoCliqueEnlace: (id: string) => void;
  /** Coordenadas no espaço 2D do editor (o mesmo que o SVG usa). */
  aoMoverDisp: (id: string, x: number, y: number) => void;
  aoFimSalto: (passo: number) => void;
  aoFundo: () => void;
}

// O editor 2D guarda x em [0,760] e y em [0,480]; no mundo 3D isso vira o chão (x,z) e a camada define a altura.
const ESCALA = 29;
const ALTURA: Record<TipoDisp, number> = { nuvem: 2.6, firewall: 1.2, roteador: 1.0, switch: 0.5, servidor: 0, pc: 0 };
const mundo = (d: Disp) => new Vector3((d.x - 380) / ESCALA, ALTURA[d.tipo], (d.y - 240) / ESCALA);
const centro = (d: Disp) => mundo(d).add(new Vector3(0, 0.3, 0));
const paraEditor = (x: number, z: number) => ({ x: Math.max(34, Math.min(726, x * ESCALA + 380)), y: Math.max(34, Math.min(440, z * ESCALA + 240)) });

const COR_TIPO: Record<TipoDisp, string> = { roteador: '#22d3ee', switch: '#5eead4', firewall: '#ff8a3d', servidor: '#c4b5fd', pc: '#93c5fd', nuvem: '#e2e8f0' };
const Y = new Vector3(0, 1, 0);
const ERRO = '#ff3b5c';
const OK = '#3ddc97';

interface Efeitos {
  alerta: Map<string, number>;
  entrega: Map<string, number>;
}

// ---------------------------------------------------------------- dispositivos
function Material({ cor, ligado, brilho = 0.35 }: { cor: string; ligado: boolean; brilho?: number }) {
  return <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={ligado ? brilho : 0.02} metalness={0.35} roughness={0.5} transparent opacity={ligado ? 1 : 0.35} />;
}

/** Modelos procedurais (sem arquivos .glb): leves, recoloridos por estado e fáceis de trocar por modelos reais. */
function Modelo({ tipo, ligado, led }: { tipo: TipoDisp; ligado: boolean; led: RefObject<Group | null> }) {
  const cor = COR_TIPO[tipo];
  switch (tipo) {
    case 'roteador':
      return (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.62, 0.66, 0.3, 32]} />
            <Material cor={cor} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.035, 8, 40]} />
            <Material cor="#ffffff" ligado={ligado} brilho={0.9} />
          </mesh>
          <group ref={led}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.36, 0.5, Math.sin((i * Math.PI) / 2) * 0.36]}>
                <coneGeometry args={[0.07, 0.3, 8]} />
                <Material cor={cor} ligado={ligado} brilho={0.8} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case 'switch':
      return (
        <group>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[1.5, 0.3, 0.8]} />
            <Material cor={cor} ligado={ligado} />
          </mesh>
          <group ref={led}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} position={[-0.55 + i * 0.22, 0.17, 0.41]}>
                <boxGeometry args={[0.13, 0.1, 0.03]} />
                <Material cor="#ffffff" ligado={ligado} brilho={0.9} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case 'firewall':
      return (
        <group ref={led}>
          {[0, 1, 2].map((r) =>
            [0, 1].map((c) => (
              <mesh key={`${r}${c}`} position={[(c - 0.5) * 0.76 + (r % 2 ? 0.2 : -0.2), 0.14 + r * 0.26, 0]}>
                <boxGeometry args={[0.72, 0.22, 0.42]} />
                <Material cor={cor} ligado={ligado} brilho={0.45} />
              </mesh>
            )),
          )}
        </group>
      );
    case 'servidor':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.15 + i * 0.3, 0]}>
              <boxGeometry args={[0.95, 0.26, 0.7]} />
              <Material cor={cor} ligado={ligado} />
            </mesh>
          ))}
          <group ref={led}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0.34, 0.15 + i * 0.3, 0.36]}>
                <boxGeometry args={[0.1, 0.06, 0.02]} />
                <Material cor="#3ddc97" ligado={ligado} brilho={1} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case 'pc':
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.55, 0.04, 0.38]} />
            <Material cor={cor} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.4, 8]} />
            <Material cor={cor} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.95, 0.58, 0.06]} />
            <Material cor={cor} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.58, 0.035]}>
            <planeGeometry args={[0.85, 0.48]} />
            <meshBasicMaterial color={ligado ? '#1d4ed8' : '#0b1220'} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'nuvem':
      return (
        <group ref={led}>
          {(
            [
              [0, 0.5, 0, 0.42],
              [0.45, 0.4, 0.05, 0.32],
              [-0.45, 0.4, -0.05, 0.34],
              [0.15, 0.62, 0.25, 0.3],
              [-0.2, 0.6, -0.25, 0.28],
            ] as const
          ).map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[r, 20, 16]} />
              <meshStandardMaterial color="#e2e8f0" emissive="#9fb4c7" emissiveIntensity={ligado ? 0.4 : 0.02} transparent opacity={ligado ? 0.85 : 0.3} roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
  }
}

interface PropsDisp {
  d: Disp;
  sel: boolean;
  pendente: boolean;
  modo: 'mover' | 'ligar';
  ocupado: RefObject<boolean>;
  efeitos: RefObject<Efeitos>;
  reduzido: boolean;
  aoClique: (id: string) => void;
  aoMover: (id: string, x: number, y: number) => void;
}

function Dispositivo3D({ d, sel, pendente, modo, ocupado, efeitos, reduzido, aoClique, aoMover }: PropsDisp) {
  const grupo = useRef<Group>(null);
  const led = useRef<Group>(null);
  const anel = useRef<Mesh>(null);
  const onda = useRef<Mesh>(null);
  const ondaMat = useRef<MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const arr = useRef<{ x0: number; y0: number; moveu: boolean } | null>(null);
  const pos = useMemo(() => mundo(d), [d]);
  const plano = useMemo(() => new Plane(new Vector3(0, 1, 0), -(pos.y + 0.3)), [pos.y]);
  const alvo = useMemo(() => new Vector3(), []);
  const altura = ALTURA[d.tipo];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = grupo.current;
    if (!g) return;
    // nuvem flutua; o resto fica no lugar (tremor curto quando um pacote é descartado aqui)
    const tAlerta = efeitos.current.alerta.get(d.id);
    const tremor = tAlerta !== undefined && t - tAlerta < 0.6 && !reduzido ? Math.sin((t - tAlerta) * 60) * 0.06 * (1 - (t - tAlerta) / 0.6) : 0;
    g.position.set(pos.x + tremor, pos.y + (d.tipo === 'nuvem' && !reduzido ? Math.sin(t * 0.9) * 0.08 : 0), pos.z);
    // LEDs/antenas piscam enquanto ligado
    if (led.current && d.ligado) {
      led.current.children.forEach((c, i) => {
        const m = (c as Mesh).material as MeshStandardMaterial | undefined;
        if (m && 'emissiveIntensity' in m) m.emissiveIntensity = reduzido ? 0.8 : 0.4 + 0.6 * Math.max(0, Math.sin(t * (2 + i * 0.7) + i * 1.7));
      });
    }
    if (anel.current) {
      anel.current.visible = sel || pendente || hover;
      anel.current.rotation.z = reduzido ? 0 : t * 0.8;
      (anel.current.material as MeshBasicMaterial).color.set(pendente ? '#ffd23f' : sel ? '#ffffff' : '#22d3ee');
    }
    // onda de efeito: vermelha (descarte) ou verde (entrega)
    const tEntrega = efeitos.current.entrega.get(d.id);
    const inicio = tAlerta !== undefined && (tEntrega === undefined || tAlerta > tEntrega) ? tAlerta : tEntrega;
    const erro = inicio !== undefined && inicio === tAlerta;
    if (onda.current && ondaMat.current) {
      const k = inicio === undefined ? 2 : (t - inicio) / 1.1;
      onda.current.visible = k < 1;
      if (k < 1) {
        onda.current.scale.setScalar(1 + k * 3);
        ondaMat.current.opacity = (1 - k) * 0.9;
        ondaMat.current.color.set(erro ? ERRO : OK);
      }
    }
  });

  const arrastar = (e: ThreeEvent<PointerEvent>) => {
    const a = arr.current;
    if (!a || modo === 'ligar') return;
    if (!a.moveu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 5) return;
    a.moveu = true;
    if (e.ray.intersectPlane(plano, alvo)) {
      const p = paraEditor(alvo.x, alvo.z);
      aoMover(d.id, p.x, p.y);
    }
  };

  return (
    <group ref={grupo} position={pos}>
      <Modelo tipo={d.tipo} ligado={d.ligado} led={led} />
      {/* haste até o chão + disco: dá a leitura de altura (camada) e ancora o dispositivo */}
      {altura > 0 && (
        <mesh position={[0, -altura / 2 + 0.02, 0]}>
          <cylinderGeometry args={[0.012, 0.012, altura, 6]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -altura + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color={COR_TIPO[d.tipo]} transparent opacity={d.ligado ? 0.13 : 0.04} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={anel} position={[0, -altura + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.88, 0.95, 40, 1]} />
        <meshBasicMaterial color="#22d3ee" side={DoubleSide} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={onda} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.55, 0.65, 48, 1]} />
        <meshBasicMaterial ref={ondaMat} side={DoubleSide} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* área de clique e arrasto maior que o modelo */}
      <mesh
        position={[0, 0.35, 0]}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          ocupado.current = true;
          arr.current = { x0: e.clientX, y0: e.clientY, moveu: false };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={arrastar}
        onPointerUp={(e) => {
          e.stopPropagation();
          ocupado.current = false;
          const a = arr.current;
          arr.current = null;
          (e.target as Element).releasePointerCapture?.(e.pointerId);
          if (a && !a.moveu) aoClique(d.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.95, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- cabos
function Cabo({ e, a, b, percorrido, corPacote, sel, aoClique }: { e: Enlace; a: Disp; b: Disp; percorrido: boolean; corPacote: string; sel: boolean; aoClique: (id: string) => void }) {
  const mat = useRef<MeshBasicMaterial>(null);
  const { pos, quat, comp } = useMemo(() => {
    const pa = centro(a);
    const pb = centro(b);
    const dir = pb.clone().sub(pa);
    return { pos: pa.clone().add(pb).multiplyScalar(0.5), quat: new Quaternion().setFromUnitVectors(Y, dir.clone().normalize()), comp: dir.length() };
  }, [a, b]);
  useFrame(({ clock }) => {
    if (mat.current && !e.ativo) mat.current.opacity = 0.35 + 0.45 * Math.max(0, Math.sin(clock.elapsedTime * 7)); // enlace caído pisca
  });
  const cor = !e.ativo ? ERRO : percorrido ? corPacote : sel ? '#ffffff' : '#3b8bb0';
  return (
    <group position={pos} quaternion={quat}>
      <mesh scale={[1, comp, 1]}>
        <cylinderGeometry args={[percorrido || sel ? 0.05 : 0.032, percorrido || sel ? 0.05 : 0.032, 1, 8]} />
        <meshBasicMaterial ref={mat} color={cor} transparent opacity={e.ativo ? (percorrido ? 1 : 0.8) : 0.6} toneMapped={false} />
      </mesh>
      {percorrido && (
        <mesh scale={[1, comp, 1]}>
          <cylinderGeometry args={[0.13, 0.13, 1, 10]} />
          <meshBasicMaterial color={corPacote} transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh scale={[1, comp, 1]} onClick={(ev) => (ev.stopPropagation(), aoClique(e.id))} onPointerOver={(ev) => ev.stopPropagation()}>
        <cylinderGeometry args={[0.2, 0.2, 1, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Partículas de fundo andando nos enlaces ativos: a rede parece viva mesmo sem pacote. */
function Trafego({ topo, ativo }: { topo: Topologia; ativo: boolean }) {
  const N = 150;
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const mapa = useRef(new Map<string, Vector3>());
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(({ clock }) => {
    const pos = geo.getAttribute('position') as Float32BufferAttribute;
    const vivos = topo.enlaces.filter((e) => e.ativo && topo.disps.find((d) => d.id === e.a)?.ligado && topo.disps.find((d) => d.id === e.b)?.ligado);
    mapa.current.clear();
    for (const d of topo.disps) mapa.current.set(d.id, centro(d));
    for (let i = 0; i < N; i++) {
      if (!ativo || vivos.length === 0) {
        pos.setXYZ(i, 0, -50, 0);
        continue;
      }
      const e = vivos[i % vivos.length];
      const a = mapa.current.get(e.a);
      const b = mapa.current.get(e.b);
      if (!a || !b) continue;
      const t = (i * 0.37 + clock.elapsedTime * (0.18 + (i % 5) * 0.05)) % 1;
      const k = i % 2 ? t : 1 - t;
      pos.setXYZ(i, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
    }
    pos.needsUpdate = true;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#7ee9fb" size={0.09} sizeAttenuation transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

// ---------------------------------------------------------------- pacote
let contadorResultado = 0;
function Pacote({ props, efeitos, reduzido }: { props: Props3D; efeitos: RefObject<Efeitos>; reduzido: boolean }) {
  const { resultado, anim, topo, corPacote, destino, aoFimSalto } = props;
  const grupo = useRef<Group>(null);
  const cabeca = useRef<MeshBasicMaterial>(null);
  const idRes = useMemo(() => ++contadorResultado, [resultado]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = useRef({ chave: '', t0: 0, dur: 1, a: new Vector3(), b: new Vector3(), fim: false });
  const rastro = useRef<Vector3[]>([]);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(10 * 3), 3));
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(10 * 3), 3));
    return g;
  }, []);
  const cor = useMemo(() => new Color(), []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (!resultado || anim.passo < 0 || anim.passo >= resultado.passos.length) {
      g.visible = false;
      est.current.chave = '';
      rastro.current.length = 0;
      return;
    }
    const p = resultado.passos[anim.passo];
    const s = est.current;
    const chave = `${idRes}:${anim.passo}`;
    if (chave !== s.chave) {
      const da = topo.disps.find((x) => x.id === p.de);
      const db = topo.disps.find((x) => x.id === p.para);
      if (!da || !db) return;
      s.chave = chave;
      s.t0 = t;
      s.a.copy(centro(da));
      s.b.copy(centro(db));
      s.dur = p.acao === 'descartou' ? 0.8 : Math.min(1.1, Math.max(0.45, 0.32 + p.ms * 0.024));
      s.fim = false;
      if (p.acao === 'descartou') efeitos.current.alerta.set(p.de, t);
    }
    const k = Math.min(1, (t - s.t0) / s.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    g.visible = true;
    g.position.lerpVectors(s.a, s.b, e);
    g.position.y += Math.sin(e * Math.PI) * 0.18 * (p.acao === 'descartou' ? 0 : 1); // pequeno arco: o pacote "salta" entre dispositivos
    const escala = p.acao === 'descartou' ? 1 + 0.5 * Math.sin(k * 14) : 1;
    g.scale.setScalar(escala);
    cabeca.current?.color.set(p.acao === 'descartou' ? ERRO : corPacote);

    // rastro: últimas posições com brilho decrescente
    const hist = rastro.current;
    hist.unshift(g.position.clone());
    if (hist.length > 10) hist.pop();
    const pos = geo.getAttribute('position') as Float32BufferAttribute;
    const col = geo.getAttribute('color') as Float32BufferAttribute;
    cor.set(p.acao === 'descartou' ? ERRO : corPacote);
    for (let i = 0; i < 10; i++) {
      const h = hist[Math.min(i, hist.length - 1)] ?? g.position;
      pos.setXYZ(i, h.x, h.y, h.z);
      const f = reduzido ? 0 : (1 - i / 10) * 0.9;
      col.setXYZ(i, cor.r * f, cor.g * f, cor.b * f);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    if (k >= 1 && !s.fim) {
      s.fim = true;
      if (anim.passo === resultado.passos.length - 1 && resultado.status === 'entregue') efeitos.current.entrega.set(destino, t);
      aoFimSalto(anim.passo);
    }
  });

  return (
    <>
      <group ref={grupo} visible={false}>
        <mesh>
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshBasicMaterial ref={cabeca} color={corPacote} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color={corPacote} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial size={0.2} sizeAttenuation vertexColors transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>
    </>
  );
}

// ---------------------------------------------------------------- câmera e rótulos
interface Orbita {
  az: number;
  pol: number;
  dist: number;
  distAlvo: number;
  ocioso: number;
  /** Distância que enquadra a cena inteira neste palco (muda com a proporção da tela). */
  fit: number;
  /** O usuário mexeu no zoom: não reenquadrar sozinho ao redimensionar. */
  manual: boolean;
}
const VISTA_INICIAL = { az: 0.5, pol: 1.02 };
const DIST_MIN = 7;
const DIST_MAX = 48;
/** A cena ocupa ~±13 × ±9 unidades; palco mais estreito exige câmera mais longe. */
const enquadrar = (aspecto: number) => Math.min(DIST_MAX, 24 * Math.pow(1.5 / Math.max(0.5, aspecto), 0.9));

function Camara({ orbita, ocupado, reduzido, parado }: { orbita: RefObject<Orbita>; ocupado: RefObject<boolean>; reduzido: boolean; parado: boolean }) {
  const { gl, camera, size } = useThree();
  useEffect(() => {
    const o = orbita.current;
    o.fit = enquadrar(size.width / size.height);
    if (!o.manual) o.distAlvo = o.fit;
  }, [size.width, size.height, orbita]);
  useEffect(() => {
    const el = gl.domElement;
    let ultimo: { x: number; y: number } | null = null;
    const baixo = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ultimo = { x: e.clientX, y: e.clientY };
      orbita.current.ocioso = 0;
    };
    const mover = (e: PointerEvent) => {
      if (!ultimo || ocupado.current) return; // arrastando um dispositivo: não gira a câmera
      const o = orbita.current;
      o.az -= (e.clientX - ultimo.x) * 0.006;
      o.pol = Math.max(0.15, Math.min(1.45, o.pol - (e.clientY - ultimo.y) * 0.006));
      ultimo = { x: e.clientX, y: e.clientY };
      o.ocioso = 0;
    };
    const cima = () => (ultimo = null);
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // a roda sozinha rola a página
      e.preventDefault();
      orbita.current.manual = true;
      orbita.current.distAlvo = Math.max(DIST_MIN, Math.min(DIST_MAX, orbita.current.distAlvo * (e.deltaY > 0 ? 1.1 : 0.9)));
    };
    el.addEventListener('pointerdown', baixo);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', cima);
    el.addEventListener('wheel', roda, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', baixo);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', cima);
      el.removeEventListener('wheel', roda);
    };
  }, [gl, orbita, ocupado]);

  useFrame((_, delta) => {
    const o = orbita.current;
    const dt = Math.min(delta, 0.1);
    o.ocioso += dt;
    if (!reduzido && !parado && o.ocioso > 8) o.az += dt * 0.04; // deriva lenta quando nada está acontecendo
    o.dist = amortecer(o.dist, o.distAlvo, 6, dt);
    const alvoY = 0.9;
    camera.position.set(Math.sin(o.az) * Math.sin(o.pol) * o.dist, alvoY + Math.cos(o.pol) * o.dist, Math.cos(o.az) * Math.sin(o.pol) * o.dist);
    camera.lookAt(0, alvoY, 0);
  });
  return null;
}

function Rotulos({ topo, raiz }: { topo: Topologia; raiz: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const filhos = raiz.current?.children;
    if (!filhos) return;
    const cam = camera as PerspectiveCamera;
    cam.updateMatrixWorld();
    topo.disps.forEach((d, i) => {
      const el = filhos[i] as HTMLElement | undefined;
      if (!el) return;
      v.copy(mundo(d)).add(new Vector3(0, -0.2, 0)).project(cam);
      const visivel = v.z < 1;
      el.style.opacity = visivel ? '1' : '0';
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, 4px)`;
    });
  });
  return null;
}

// ---------------------------------------------------------------- cena
export default function Topologia3DCena(props: Props3D & PropsCena) {
  const { topo, selecionado, modo, pendente, resultado, anim, aoCliqueEnlace, aoCliqueDisp, aoMoverDisp, aoFundo, corPacote, movimentoReduzido, aoFalhar } = props;
  const [nivel, setNivel] = useState(0);
  const ocupado = useRef(false);
  const efeitos = useRef<Efeitos>({ alerta: new Map(), entrega: new Map() });
  const orbita = useRef<Orbita>({ ...VISTA_INICIAL, dist: 24, distAlvo: 24, ocioso: 0, fit: 24, manual: false });
  const rotulos = useRef<HTMLDivElement>(null);
  const disp = (id: string) => topo.disps.find((d) => d.id === id);
  const percorridos = new Set(resultado && anim.passo >= 0 ? resultado.passos.slice(0, anim.passo + 1).map((p) => p.enlace).filter((x): x is string => !!x) : []);

  // nova simulação: apaga os efeitos da anterior
  useEffect(() => {
    efeitos.current.alerta.clear();
    efeitos.current.entrega.clear();
  }, [resultado]);

  return (
    <div className="tp3-raiz">
      <Canvas
        frameloop="always"
        dpr={nivel >= 2 ? 0.75 : nivel >= 1 ? 1 : [1, 2]}
        camera={{ position: [8, 12, 12], fov: 40, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        style={{ touchAction: 'none' }}
        onPointerMissed={aoFundo}
      >
        <ambientLight intensity={1.1} color="#6aa7c7" />
        <directionalLight position={[6, 12, 8]} intensity={1.6} />
        <pointLight position={[-10, 6, -8]} intensity={40} color="#0055ff" />
        <pointLight position={[10, 5, 8]} intensity={30} color="#00ffcc" />
        <gridHelper args={[30, 30, '#0a3d62', '#0a2a40']} position={[0, -0.01, 0]} />
        <Camara orbita={orbita} ocupado={ocupado} reduzido={movimentoReduzido} parado={!!resultado || !!selecionado} />

        {topo.enlaces.map((e) => {
          const a = disp(e.a);
          const b = disp(e.b);
          return a && b ? <Cabo key={e.id} e={e} a={a} b={b} percorrido={percorridos.has(e.id)} corPacote={corPacote} sel={selecionado?.id === e.id} aoClique={aoCliqueEnlace} /> : null;
        })}
        {topo.disps.map((d) => (
          <Dispositivo3D key={d.id} d={d} sel={selecionado?.id === d.id} pendente={pendente === d.id} modo={modo} ocupado={ocupado} efeitos={efeitos} reduzido={movimentoReduzido} aoClique={aoCliqueDisp} aoMover={aoMoverDisp} />
        ))}
        <Trafego topo={topo} ativo={!movimentoReduzido && nivel < 2} />
        <Pacote props={props} efeitos={efeitos} reduzido={movimentoReduzido} />
        <Rotulos topo={topo} raiz={rotulos} />

        <PausaAutomatica />
        {/* ferramenta: alvo de 24 fps e nunca cai para o 2D só por FPS (apenas perda de contexto WebGL ou erro) */}
        <MonitorQualidade alvo={24} maxNivel={3} aoMudar={setNivel} />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>

      <div ref={rotulos} className="tp3-rotulos" aria-hidden="true">
        {topo.disps.map((d) => (
          <span key={d.id} className={`${d.ligado ? '' : 'off'} ${selecionado?.id === d.id ? 'sel' : ''}`}>
            <b>{d.nome}</b>
            {d.ip && <i>{d.ip}</i>}
          </span>
        ))}
      </div>

      <div className="tp3-botoes" role="group" aria-label="Câmera">
        <button onClick={() => Object.assign(orbita.current, { manual: true, distAlvo: Math.max(DIST_MIN, orbita.current.distAlvo * 0.8) })} aria-label="Aproximar">+</button>
        <button onClick={() => Object.assign(orbita.current, { manual: true, distAlvo: Math.min(DIST_MAX, orbita.current.distAlvo * 1.25) })} aria-label="Afastar">−</button>
        <button onClick={() => Object.assign(orbita.current, { ...VISTA_INICIAL, distAlvo: orbita.current.fit, manual: false, ocioso: 0 })} aria-label="Restaurar vista" title="Restaurar vista">⟲</button>
      </div>

      {/* alternativa por teclado e leitor de tela: o 3D não tem foco por dispositivo */}
      <ul className="tp3-acessivel" aria-label="Dispositivos">
        {topo.disps.map((d) => (
          <li key={d.id}>
            <button onClick={() => aoCliqueDisp(d.id)}>{`${d.nome}${d.ip ? `, ${d.ip}` : ''}${d.ligado ? '' : ', desligado'}`}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
