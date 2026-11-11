// Exemplo anim3d-topologia · Cena 3D da topologia de rede em ambiente corporativo de Sala Cofre / Piso Elevado
// de Datacenter: bancada técnica modular em alumínio/grafite, calhas de fibra óptica sob o piso, iluminação de
// estúdio com sombras reais (modo claro de engenharia e modo escuro de NOC), modelos 3D de hardware de rede
// (roteador, switch 24p, firewall UTM, rack de servidores blade, workstation e gateway WAN / Globo de Backbone),
// cabos com espessura e cor pela utilização ao vivo (Mbps), pacote com rastro e ondas de entrega/descarte.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Vector3,
} from 'three';
import { amortecer, type PropsCena } from '@anim3d/kit';
import { GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';
import { rgbUtilizacao, utilizacao, type Telemetria } from './telemetria';
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
  noite?: boolean;
  telemetria?: Telemetria | null;
  aoVivo?: boolean;
  aoCliqueDisp: (id: string) => void;
  aoCliqueEnlace: (id: string) => void;
  /** Coordenadas no espaço 2D do editor (o mesmo que o SVG usa). */
  aoMoverDisp: (id: string, x: number, y: number) => void;
  aoFimSalto: (passo: number) => void;
  aoFundo: () => void;
}

// O editor 2D guarda x em [0,760] e y em [0,480]; no mundo 3D isso vira o piso técnico (x,z) e a camada define a elevação.
const ESCALA = 29;
const ALTURA: Record<TipoDisp, number> = { nuvem: 1.35, firewall: 0.95, roteador: 0.8, switch: 0.42, servidor: 0, pc: 0 };
const mundo = (d: Disp) => new Vector3((d.x - 380) / ESCALA, ALTURA[d.tipo], (d.y - 240) / ESCALA);
const centro = (d: Disp) => mundo(d).add(new Vector3(0, 0.38, 0));
const paraEditor = (x: number, z: number) => ({ x: Math.max(34, Math.min(726, x * ESCALA + 380)), y: Math.max(34, Math.min(440, z * ESCALA + 240)) });

export const COR_TIPO_3D: Record<TipoDisp, string> = {
  roteador: '#06b6d4',
  switch: '#10b981',
  firewall: '#f97316',
  servidor: '#8b5cf6',
  pc: '#3b82f6',
  nuvem: '#0ea5e9',
};
const Y = new Vector3(0, 1, 0);
const ERRO = '#ff3b5c';
const OK = '#3ddc97';

interface Efeitos {
  alerta: Map<string, number>;
  entrega: Map<string, number>;
}

// ---------------------------------------------------------------- Piso Elevado de Datacenter (Sala Cofre / NOC)
const CALHAS_Z = [-4.2, 0, 4.2];
const CALHAS_X = [-7.8, 0, 7.8];
const CANTOS_SALA: [number, number][] = [
  [-13.8, -8.8],
  [13.8, -8.8],
  [-13.8, 8.8],
  [13.8, 8.8],
];

function PisoDatacenter({ noite }: { noite: boolean }) {
  const corPlacas = noite ? '#0f172a' : '#e2e8f0';
  const corBordaSup = noite ? '#1e293b' : '#cbd5e1';
  const corChassiBase = noite ? '#090f1d' : '#94a3b8';
  const corSubPiso = noite ? '#050a14' : '#64748b';
  const corGradePiso = noite ? '#1e3a5f' : '#94a3b8';
  const corGradeFundo = noite ? '#0c192e' : '#cbd5e1';
  const corFibra = noite ? '#0ea5e9' : '#0284c7';

  return (
    <group>
      {/* Plano de horizonte de estúdio técnico (sem nuvens, sem rochas) */}
      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={noite ? '#050b14' : '#dbe3ee'} roughness={0.95} />
      </mesh>
      <gridHelper args={[96, 48, corGradeFundo, corGradeFundo]} position={[0, -0.7, 0]} />

      {/* Plinto estrutural metálico da Sala Cofre (piso elevado industrial) */}
      <mesh position={[0, -0.44, 0]} receiveShadow>
        <boxGeometry args={[29.2, 0.52, 19.2]} />
        <meshStandardMaterial color={corSubPiso} roughness={0.7} metalness={0.35} />
      </mesh>
      <mesh position={[0, -0.14, 0]} receiveShadow>
        <boxGeometry args={[28.6, 0.18, 18.6]} />
        <meshStandardMaterial color={corChassiBase} roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Friso luminoso técnico de perímetro da Sala Cofre */}
      <mesh position={[0, -0.22, 9.32]}>
        <boxGeometry args={[28.4, 0.035, 0.04]} />
        <meshBasicMaterial color={corFibra} transparent opacity={noite ? 0.75 : 0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.22, -9.32]}>
        <boxGeometry args={[28.4, 0.035, 0.04]} />
        <meshBasicMaterial color={corFibra} transparent opacity={noite ? 0.75 : 0.5} toneMapped={false} />
      </mesh>

      {/* Superfície de placas técnicas modulares do piso elevado */}
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[28.0, 0.06, 18.0]} />
        <meshStandardMaterial color={corPlacas} roughness={0.82} metalness={0.12} />
      </mesh>

      {/* Moldura chanfrada de contenção das placas */}
      <mesh position={[0, 0.01, -8.92]} receiveShadow>
        <boxGeometry args={[28.0, 0.05, 0.18]} />
        <meshStandardMaterial color={corBordaSup} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.01, 8.92]} receiveShadow>
        <boxGeometry args={[28.0, 0.05, 0.18]} />
        <meshStandardMaterial color={corBordaSup} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[-13.92, 0.01, 0]} receiveShadow>
        <boxGeometry args={[0.18, 0.05, 18.0]} />
        <meshStandardMaterial color={corBordaSup} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[13.92, 0.01, 0]} receiveShadow>
        <boxGeometry args={[0.18, 0.05, 18.0]} />
        <meshStandardMaterial color={corBordaSup} roughness={0.6} metalness={0.25} />
      </mesh>

      {/* Malha modular de placas de piso elevado (60x60cm) */}
      <gridHelper args={[27.6, 24, corGradePiso, corGradePiso]} position={[0, 0.008, 0]} />

      {/* Calhas ópticas longitudinais e transversais embutidas no piso elevado */}
      {CALHAS_Z.map((z, i) => (
        <group key={`cz-${i}`} position={[0, 0.005, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[26.8, 0.28]} />
            <meshStandardMaterial color={noite ? '#081120' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <planeGeometry args={[26.6, 0.055]} />
            <meshBasicMaterial color={corFibra} transparent opacity={noite ? 0.55 : 0.42} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {CALHAS_X.map((x, i) => (
        <group key={`cx-${i}`} position={[x, 0.004, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.26, 17.2]} />
            <meshStandardMaterial color={noite ? '#081120' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <planeGeometry args={[0.05, 17.0]} />
            <meshBasicMaterial color={corFibra} transparent opacity={noite ? 0.48 : 0.36} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Colunas técnicas de ancoragem / PDU nos 4 vértices da Sala Cofre */}
      {CANTOS_SALA.map(([cx, cz], i) => (
        <group key={i} position={[cx, 0.14, cz]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.28, 0.42]} />
            <meshStandardMaterial color={noite ? '#1e293b' : '#64748b'} roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.3, 0.025, 0.3]} />
            <meshBasicMaterial color={corFibra} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- modelos 3D de hardware de rede
function ChassisMat({ cor, ligado, roughness = 0.65, metalness = 0.15 }: { cor: string; ligado: boolean; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={cor} roughness={roughness} metalness={metalness} transparent opacity={ligado ? 1 : 0.42} />;
}

function LedMat({ cor, ligado, brilho = 0.75 }: { cor: string; ligado: boolean; brilho?: number }) {
  return <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={ligado ? brilho : 0.02} roughness={0.3} transparent opacity={ligado ? 1 : 0.35} />;
}

/** Modelos procedurais de hardware de rede com acabamento tátil estilo Commit City (chassis claros/escuros, faixas de cor e LEDs). */
function Modelo({
  tipo,
  ligado,
  noite,
  cpuPct,
  led,
}: {
  tipo: TipoDisp;
  ligado: boolean;
  noite: boolean;
  cpuPct?: number | null;
  led: RefObject<Group | null>;
}) {
  const cor = COR_TIPO_3D[tipo];
  const chassiClaro = noite ? '#cbd5e1' : '#e7e2d8';
  const chassiEscuro = noite ? '#1e293b' : '#334155';

  switch (tipo) {
    case 'roteador':
      return (
        <group>
          {/* corpo cilíndrico chanfrado com faixa ciano e setas de roteamento no topo */}
          <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.66, 0.72, 0.32, 12]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.68, 0.68, 0.07, 12]} />
            <LedMat cor={cor} ligado={ligado} brilho={0.55} />
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.52, 0.56, 0.04, 12]} />
            <ChassisMat cor={chassiEscuro} ligado={ligado} />
          </mesh>
          {/* cruz de roteamento no topo */}
          {[0, Math.PI / 2].map((rot, i) => (
            <mesh key={i} position={[0, 0.36, 0]} rotation={[0, rot, 0]}>
              <boxGeometry args={[0.68, 0.025, 0.09]} />
              <LedMat cor="#ffffff" ligado={ligado} brilho={0.85} />
            </mesh>
          ))}
          {/* 4 antenas articuladas com pontas luminosas */}
          <group ref={led}>
            {[0, 1, 2, 3].map((i) => {
              const ang = (i * Math.PI) / 2 + Math.PI / 4;
              return (
                <group key={i} position={[Math.cos(ang) * 0.48, 0.32, Math.sin(ang) * 0.48]}>
                  <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[0.028, 0.04, 0.4, 8]} />
                    <ChassisMat cor={chassiEscuro} ligado={ligado} />
                  </mesh>
                  <mesh position={[0, 0.42, 0]}>
                    <sphereGeometry args={[0.055, 8, 8]} />
                    <LedMat cor={cor} ligado={ligado} brilho={0.95} />
                  </mesh>
                </group>
              );
            })}
          </group>
        </group>
      );

    case 'switch':
      return (
        <group>
          {/* chassi de switch rack 24 portas com painel frontal e LEDs por porta */}
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.56, 0.34, 0.88]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[1.58, 0.04, 0.9]} />
            <LedMat cor={cor} ligado={ligado} brilho={0.45} />
          </mesh>
          {/* painel frontal escuro */}
          <mesh position={[0, 0.18, 0.445]}>
            <boxGeometry args={[1.42, 0.22, 0.02]} />
            <ChassisMat cor={chassiEscuro} ligado={ligado} />
          </mesh>
          {/* 2 fileiras de portas RJ45 com LEDs piscantes */}
          <group ref={led}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} position={[-0.55 + i * 0.22, 0.21, 0.46]}>
                <boxGeometry args={[0.13, 0.09, 0.02]} />
                <LedMat cor="#34d399" ligado={ligado} brilho={0.95} />
              </mesh>
            ))}
          </group>
        </group>
      );

    case 'firewall':
      return (
        <group>
          {/* muralha/appliance de segurança em blocos blindados + arco de inspeção */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.58, 0.14, 0.64]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <group ref={led}>
            {[0, 1, 2].map((r) =>
              [0, 1].map((c) => (
                <mesh key={`${r}${c}`} position={[(c - 0.5) * 0.74 + (r % 2 ? 0.16 : -0.16), 0.24 + r * 0.25, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.7, 0.21, 0.48]} />
                  <LedMat cor={cor} ligado={ligado} brilho={0.35} />
                </mesh>
              )),
            )}
          </group>
          <mesh position={[0, 0.92, 0]} castShadow>
            <boxGeometry args={[1.5, 0.1, 0.56]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
        </group>
      );

    case 'servidor': {
      // Torre de rack de servidores estilo Commit City (módulos empilhados com faixas amarelas/roxas e barra de CPU)
      const carga = Math.min(1, Math.max(0.15, (cpuPct ?? 35) / 100));
      return (
        <group>
          {/* gabinete principal da torre de servidores */}
          <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.08, 1.36, 0.86]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          {/* 4 gavetas blade + faixas horizontais */}
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[0, 0.22 + i * 0.31, 0]}>
              <mesh position={[0, 0, 0.435]}>
                <boxGeometry args={[0.92, 0.22, 0.02]} />
                <ChassisMat cor={chassiEscuro} ligado={ligado} />
              </mesh>
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[1.12, 0.035, 0.9]} />
                <LedMat cor="#eab308" ligado={ligado} brilho={0.35} />
              </mesh>
            </group>
          ))}
          {/* LEDs de atividade por gaveta + barra lateral de carga de CPU */}
          <group ref={led}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0.32, 0.22 + i * 0.31, 0.45]}>
                <boxGeometry args={[0.14, 0.065, 0.02]} />
                <LedMat cor="#3ddc97" ligado={ligado} brilho={1} />
              </mesh>
            ))}
          </group>
          {/* indicador luminoso vertical de CPU na fachada */}
          <mesh position={[-0.38, 0.15 + (carga * 1.05) / 2, 0.45]}>
            <boxGeometry args={[0.06, carga * 1.05, 0.025]} />
            <LedMat cor={carga > 0.8 ? '#ef4444' : cor} ligado={ligado} brilho={0.9} />
          </mesh>
        </group>
      );
    }

    case 'pc':
      return (
        <group>
          {/* base + gabinete mini-tower + monitor ultrawide com tela luminosa */}
          <mesh position={[-0.22, 0.04, 0.12]} castShadow>
            <boxGeometry args={[0.52, 0.05, 0.36]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <mesh position={[-0.22, 0.25, 0.02]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.42, 8]} />
            <ChassisMat cor={chassiEscuro} ligado={ligado} />
          </mesh>
          <mesh position={[-0.22, 0.58, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.56, 0.08]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <mesh position={[-0.22, 0.58, 0.065]}>
            <planeGeometry args={[0.8, 0.44]} />
            <meshBasicMaterial color={ligado ? '#2563eb' : '#0f172a'} toneMapped={false} />
          </mesh>
          {/* gabinete desktop ao lado do monitor */}
          <mesh position={[0.38, 0.28, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 0.54, 0.46]} />
            <ChassisMat cor={chassiClaro} ligado={ligado} />
          </mesh>
          <mesh position={[0.38, 0.44, 0.275]}>
            <boxGeometry args={[0.16, 0.05, 0.02]} />
            <LedMat cor={cor} ligado={ligado} brilho={0.85} />
          </mesh>
        </group>
      );

    case 'nuvem':
      return (
        <group>
          {/* Base de Gateway WAN / Core Uplink BGP */}
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.64, 0.74, 0.2, 16]} />
            <ChassisMat cor={chassiEscuro} ligado={ligado} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.56, 0.6, 0.05, 16]} />
            <LedMat cor={cor} ligado={ligado} brilho={0.65} />
          </mesh>
          {/* Globo Geodésico de Backbone Global + anéis de fibra óptica */}
          <group ref={led} position={[0, 0.68, 0]}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.42, 1]} />
              <meshStandardMaterial
                color={noite ? '#0f172a' : '#1e293b'}
                emissive="#0284c7"
                emissiveIntensity={ligado ? 0.35 : 0.02}
                roughness={0.45}
                metalness={0.3}
                flatShading
              />
            </mesh>
            <mesh>
              <icosahedronGeometry args={[0.44, 1]} />
              <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={ligado ? 0.85 : 0.25} toneMapped={false} />
            </mesh>
            <mesh rotation={[Math.PI / 3, 0.3, 0]}>
              <torusGeometry args={[0.56, 0.022, 8, 36]} />
              <LedMat cor="#38bdf8" ligado={ligado} brilho={0.95} />
            </mesh>
            <mesh rotation={[-Math.PI / 3, -0.4, Math.PI / 6]}>
              <torusGeometry args={[0.62, 0.018, 8, 36]} />
              <LedMat cor="#22d3ee" ligado={ligado} brilho={0.85} />
            </mesh>
          </group>
        </group>
      );
  }
}

interface PropsDisp {
  d: Disp;
  cpuPct?: number | null;
  sel: boolean;
  pendente: boolean;
  modo: 'mover' | 'ligar';
  noite: boolean;
  ocupado: RefObject<boolean>;
  efeitos: RefObject<Efeitos>;
  reduzido: boolean;
  aoClique: (id: string) => void;
  aoMover: (id: string, x: number, y: number) => void;
}

function Dispositivo3D({ d, cpuPct, sel, pendente, modo, noite, ocupado, efeitos, reduzido, aoClique, aoMover }: PropsDisp) {
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
  const cor = COR_TIPO_3D[d.tipo];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = grupo.current;
    if (!g) return;
    const tAlerta = efeitos.current.alerta.get(d.id);
    const tremor = tAlerta !== undefined && t - tAlerta < 0.6 && !reduzido ? Math.sin((t - tAlerta) * 60) * 0.06 * (1 - (t - tAlerta) / 0.6) : 0;
    g.position.set(pos.x + tremor, pos.y, pos.z);
    if (led.current && d.ligado) {
      if (d.tipo === 'nuvem' && !reduzido) {
        led.current.rotation.y = t * 0.45;
      }
      led.current.children.forEach((c, i) => {
        const m = (c as Mesh).material as MeshStandardMaterial | undefined;
        if (m && 'emissiveIntensity' in m) m.emissiveIntensity = reduzido ? 0.8 : 0.4 + 0.6 * Math.max(0, Math.sin(t * (2 + i * 0.7) + i * 1.7));
      });
    }
    if (anel.current) {
      anel.current.visible = sel || pendente || hover;
      anel.current.rotation.z = reduzido ? 0 : t * 0.8;
      (anel.current.material as MeshBasicMaterial).color.set(pendente ? '#ffd23f' : sel ? (noite ? '#ffffff' : '#0f172a') : cor);
    }
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
      <Modelo tipo={d.tipo} ligado={d.ligado} noite={noite} cpuPct={cpuPct} led={led} />
      {/* pedestal / base modular estilo Commit City no piso da plataforma */}
      {altura > 0 && (
        <mesh position={[0, -altura / 2 + 0.02, 0]}>
          <cylinderGeometry args={[0.025, 0.025, altura, 8]} />
          <meshBasicMaterial color={cor} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -altura + 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.92, 0.98, 0.06, 20]} />
        <meshStandardMaterial color={noite ? '#1e293b' : '#d6d1c4'} roughness={0.85} />
      </mesh>
      <mesh position={[0, -altura + 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 0.88, 28]} />
        <meshBasicMaterial color={cor} side={DoubleSide} transparent opacity={d.ligado ? 0.65 : 0.15} toneMapped={false} />
      </mesh>
      <mesh ref={anel} position={[0, -altura + 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.02, 1.12, 40, 1]} />
        <meshBasicMaterial color={cor} side={DoubleSide} transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={onda} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 0.72, 48, 1]} />
        <meshBasicMaterial ref={ondaMat} side={DoubleSide} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, 0.45, 0]}
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
        <sphereGeometry args={[1.05, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- cabos de rede
function Cabo({
  e,
  a,
  b,
  mbps,
  aoVivo,
  noite,
  percorrido,
  corPacote,
  sel,
  aoClique,
}: {
  e: Enlace;
  a: Disp;
  b: Disp;
  mbps?: number;
  aoVivo: boolean;
  noite: boolean;
  percorrido: boolean;
  corPacote: string;
  sel: boolean;
  aoClique: (id: string) => void;
}) {
  const mat = useRef<MeshBasicMaterial>(null);
  const { pos, quat, comp } = useMemo(() => {
    const pa = centro(a);
    const pb = centro(b);
    const dir = pb.clone().sub(pa);
    return { pos: pa.clone().add(pb).multiplyScalar(0.5), quat: new Quaternion().setFromUnitVectors(Y, dir.clone().normalize()), comp: dir.length() };
  }, [a, b]);
  useFrame(({ clock }) => {
    if (mat.current && !e.ativo) mat.current.opacity = 0.35 + 0.45 * Math.max(0, Math.sin(clock.elapsedTime * 7));
  });

  const util = aoVivo && mbps !== undefined ? utilizacao(mbps, e.mbpsMax) : 0;
  const [r, g, bl] = rgbUtilizacao(util);
  const corViva = `rgb(${r},${g},${bl})`;
  const cor = !e.ativo ? ERRO : percorrido ? corPacote : sel ? (noite ? '#ffffff' : '#0f172a') : aoVivo && util > 0.55 ? corViva : noite ? '#38bdf8' : '#475569';
  const raio = percorrido || sel ? 0.056 : (e.mbpsMax ?? 100) >= 1000 ? 0.042 : 0.03;

  return (
    <group position={pos} quaternion={quat}>
      <mesh scale={[1, comp, 1]}>
        <cylinderGeometry args={[raio, raio, 1, 10]} />
        <meshBasicMaterial ref={mat} color={cor} transparent opacity={e.ativo ? (percorrido ? 1 : 0.88) : 0.65} toneMapped={false} />
      </mesh>
      {percorrido && (
        <mesh scale={[1, comp, 1]}>
          <cylinderGeometry args={[0.14, 0.14, 1, 10]} />
          <meshBasicMaterial color={corPacote} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh scale={[1, comp, 1]} onClick={(ev) => (ev.stopPropagation(), aoClique(e.id))} onPointerOver={(ev) => ev.stopPropagation()}>
        <cylinderGeometry args={[0.22, 0.22, 1, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Fluxo de pacotes nos cabos ativos: velocidade e cor respondem à telemetria de utilização (Mbps). */
function Trafego({ topo, tel, aoVivo, noite, ativo }: { topo: Topologia; tel?: Telemetria | null; aoVivo: boolean; noite: boolean; ativo: boolean }) {
  const N = 160;
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
      const util = aoVivo && tel ? utilizacao(tel.enlaces[e.id]?.mbps ?? 25, e.mbpsMax) : 0.3;
      const vel = 0.16 + Math.min(1, util) * 0.28;
      const t = (i * 0.37 + clock.elapsedTime * (vel + (i % 5) * 0.04)) % 1;
      const k = i % 2 ? t : 1 - t;
      pos.setXYZ(i, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
    }
    pos.needsUpdate = true;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color={noite ? '#7ee9fb' : '#0284c7'}
        size={noite ? 0.1 : 0.13}
        sizeAttenuation
        transparent
        opacity={0.85}
        blending={noite ? AdditiveBlending : undefined}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

// ---------------------------------------------------------------- pacote rastreado
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
    g.position.y += Math.sin(e * Math.PI) * 0.2 * (p.acao === 'descartou' ? 0 : 1);
    const escala = p.acao === 'descartou' ? 1 + 0.5 * Math.sin(k * 14) : 1;
    g.scale.setScalar(escala);
    cabeca.current?.color.set(p.acao === 'descartou' ? ERRO : corPacote);

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
          <sphereGeometry args={[0.17, 16, 12]} />
          <meshBasicMaterial ref={cabeca} color={corPacote} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.36, 16, 12]} />
          <meshBasicMaterial color={corPacote} transparent opacity={0.28} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial size={0.22} sizeAttenuation vertexColors transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
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
const VISTA_INICIAL = { az: 0.48, pol: 1.0 };
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
      if (!ultimo || ocupado.current) return;
      const o = orbita.current;
      o.az -= (e.clientX - ultimo.x) * 0.006;
      o.pol = Math.max(0.15, Math.min(1.42, o.pol - (e.clientY - ultimo.y) * 0.006));
      ultimo = { x: e.clientX, y: e.clientY };
      o.ocioso = 0;
    };
    const cima = () => (ultimo = null);
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
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
    if (!reduzido && !parado && o.ocioso > 8) o.az += dt * 0.04;
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
  const {
    topo,
    selecionado,
    modo,
    pendente,
    resultado,
    anim,
    aoCliqueEnlace,
    aoCliqueDisp,
    aoMoverDisp,
    aoFundo,
    corPacote,
    noite = false,
    telemetria,
    aoVivo = false,
    movimentoReduzido,
    aoFalhar,
  } = props;
  const [nivel, setNivel] = useState(0);
  const ocupado = useRef(false);
  const efeitos = useRef<Efeitos>({ alerta: new Map(), entrega: new Map() });
  const orbita = useRef<Orbita>({ ...VISTA_INICIAL, dist: 24, distAlvo: 24, ocioso: 0, fit: 24, manual: false });
  const rotulos = useRef<HTMLDivElement>(null);
  const disp = (id: string) => topo.disps.find((d) => d.id === id);
  const percorridos = new Set(resultado && anim.passo >= 0 ? resultado.passos.slice(0, anim.passo + 1).map((p) => p.enlace).filter((x): x is string => !!x) : []);

  useEffect(() => {
    efeitos.current.alerta.clear();
    efeitos.current.entrega.clear();
  }, [resultado]);

  return (
    <div className={`tp3-raiz ${noite ? 'tp3-noite' : 'tp3-dia'}`}>
      <Canvas
        frameloop="always"
        shadows={nivel < 2}
        dpr={nivel >= 2 ? 0.75 : nivel >= 1 ? 1 : [1, 2]}
        camera={{ position: [8, 12, 12], fov: 40, near: 0.1, far: 140 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        style={{ touchAction: 'none' }}
        onPointerMissed={aoFundo}
      >
        <ambientLight intensity={noite ? 0.75 : 1.45} color={noite ? '#64748b' : '#f8f5ff'} />
        <directionalLight
          position={[10, 18, 10]}
          intensity={noite ? 1.1 : 1.95}
          color={noite ? '#bae6fd' : '#fff8eb'}
          castShadow={nivel < 2}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <hemisphereLight args={[noite ? '#38bdf8' : '#ffffff', noite ? '#0f172a' : '#94a3b8', noite ? 0.35 : 0.55]} />

        <PisoDatacenter noite={noite} />
        <Camara orbita={orbita} ocupado={ocupado} reduzido={movimentoReduzido} parado={!!resultado || !!selecionado} />

        {topo.enlaces.map((e) => {
          const a = disp(e.a);
          const b = disp(e.b);
          return a && b ? (
            <Cabo
              key={e.id}
              e={e}
              a={a}
              b={b}
              mbps={telemetria?.enlaces[e.id]?.mbps}
              aoVivo={aoVivo}
              noite={noite}
              percorrido={percorridos.has(e.id)}
              corPacote={corPacote}
              sel={selecionado?.id === e.id}
              aoClique={aoCliqueEnlace}
            />
          ) : null;
        })}
        {topo.disps.map((d) => (
          <Dispositivo3D
            key={d.id}
            d={d}
            cpuPct={aoVivo ? telemetria?.disps[d.id]?.cpuPct : undefined}
            sel={selecionado?.id === d.id}
            pendente={pendente === d.id}
            modo={modo}
            noite={noite}
            ocupado={ocupado}
            efeitos={efeitos}
            reduzido={movimentoReduzido}
            aoClique={aoCliqueDisp}
            aoMover={aoMoverDisp}
          />
        ))}
        <Trafego topo={topo} tel={telemetria} aoVivo={aoVivo} noite={noite} ativo={!movimentoReduzido && nivel < 2} />
        <Pacote props={props} efeitos={efeitos} reduzido={movimentoReduzido} />
        <Rotulos topo={topo} raiz={rotulos} />

        <PausaAutomatica />
        <MonitorQualidade alvo={24} maxNivel={3} aoMudar={setNivel} />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>

      <div ref={rotulos} className="tp3-rotulos" aria-hidden="true">
        {topo.disps.map((d) => (
          <span key={d.id} className={`${d.ligado ? '' : 'off'} ${selecionado?.id === d.id ? 'sel' : ''}`} style={{ ['--cor-disp' as string]: COR_TIPO_3D[d.tipo] }}>
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
