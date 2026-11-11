// Exemplo anim3d-infra-fisica · Cena 3D do rack de uma empresa de médio porte e do prédio de 3 andares.
// Tudo sai do ModeloFisico: o 3D não inventa posição, porta ou cabo. Duas vistas na mesma cena (rack em tamanho real e prédio).
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BufferGeometry, CurvePath, Color, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineCurve3, Matrix4, Mesh, Quaternion, TubeGeometry, Vector3 } from 'three';
import { amortecer, useTokens, type PropsCena } from '@anim3d/kit';
import { GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';
import { ocupacaoRack, portasUsadas, U_METROS, type CaminhoFisico, type GrafoEletrocalha, type ModeloFisico, type Ponto3, type TipoEquip } from '../motor/infraFisica';
import { ALTURA_ANDAR, ELETROCALHA, posicaoExterna, posicaoPortaNoRack, RACK, RACK_FRENTE, RACK_LARGURA, RACK_PROFUNDIDADE, baseDoRack, ALTURA_RACK_M } from './empresaDados';

export type VistaRack = 'rack' | 'predio';

export interface PropsRack3D {
  modelo: ModeloFisico;
  vista: VistaRack;
  /** Estação (PC) cujo caminho físico está destacado. */
  caminho: CaminhoFisico | null;
  /** Muda a cada clique em "Reproduzir" para reiniciar a animação do cabo. */
  reproducao: number;
  desligado: string | null;
  /** Hosts sem conexão (resultado de impactoDeFalha). */
  isolados: string[];
  salasIsoladas: string[];
  /** Equipamentos com achado de validação. */
  marcados: string[];
  selecionado: string | null;
  aoSelecionar: (id: string) => void;
}

// Cores por tokens (variáveis CSS --ri-*); o padrão cobre testes e temas sem as variáveis com estética corporativa de Datacenter/NOC.
const MAPA = { chassi: '--ri-chassi', painel: '--ri-painel-3d', ok: '--ri-ok', erro: '--ri-erro', aviso: '--ri-aviso', destaque: '--ri-destaque', livre: '--ri-livre', calha: '--ri-calha', piso: '--ri-piso', andar: '--ri-andar', cabo: '--ri-cabo', rede: '--ri-rede', servidor: '--ri-servidor', passivo: '--ri-passivo', luzCeu: '--ri-luz-ceu', luzChao: '--ri-luz-chao', luzRecorte: '--ri-luz-recorte' } as const;
const PADRAO: Record<keyof typeof MAPA, string> = { chassi: '#182433', painel: '#334155', ok: '#10b981', erro: '#ef4444', aviso: '#f59e0b', destaque: '#06b6d4', livre: '#090f17', calha: '#64748b', piso: '#09101d', andar: '#1e293b', cabo: '#0284c7', rede: '#0ea5e9', servidor: '#6366f1', passivo: '#475569', luzCeu: '#f8fafc', luzChao: '#020617', luzRecorte: '#38bdf8' };
type Paleta = Record<keyof typeof MAPA, string>;

const COR_TIPO: Record<TipoEquip, keyof Paleta> = { switch: 'rede', roteador: 'rede', firewall: 'rede', servidor: 'servidor', ups: 'chassi', 'patch-panel': 'passivo', ap: 'chassi', pc: 'chassi', tomada: 'passivo' };
const LARGURA_19 = 0.482;
const PROF_TIPO = (t: TipoEquip) => (t === 'servidor' || t === 'ups' ? 0.46 : t === 'patch-panel' ? 0.08 : 0.3);

const limpar = (pts: Ponto3[]): Vector3[] => {
  const v = pts.map((p) => new Vector3(...p));
  return v.filter((p, i) => i === 0 || p.distanceTo(v[i - 1]) > 1e-4);
};

// ---------------------------------------------------------------- câmera
interface Orbita { yaw: number; pitch: number; zoom: number }
const VISTAS: Record<VistaRack, { alvo: Vector3; dist: number; az: number; pol: number }> = {
  rack: { alvo: new Vector3(0, 1.02, 0.3), dist: 3.1, az: 0.42, pol: 1.42 },
  predio: { alvo: new Vector3(11, 4.6, -1), dist: 42, az: 0.7, pol: 1.0 },
};

function Camara({ vista, reduzido, orbita }: { vista: VistaRack; reduzido: boolean; orbita: RefObject<Orbita> }) {
  const { camera, gl } = useThree();
  const estado = useRef({ alvo: VISTAS[vista].alvo.clone(), dist: VISTAS[vista].dist, az: VISTAS[vista].az, pol: VISTAS[vista].pol });
  useEffect(() => {
    if (orbita.current) Object.assign(orbita.current, { yaw: 0, pitch: 0, zoom: 1 });
  }, [vista, orbita]);
  useEffect(() => {
    const el = gl.domElement;
    let ultimo: { x: number; y: number } | null = null;
    const baixo = (e: PointerEvent) => { ultimo = { x: e.clientX, y: e.clientY }; };
    const mover = (e: PointerEvent) => {
      if (!ultimo || !orbita.current) return;
      orbita.current.yaw -= (e.clientX - ultimo.x) * 0.006;
      orbita.current.pitch = Math.max(-0.7, Math.min(0.5, orbita.current.pitch - (e.clientY - ultimo.y) * 0.004));
      ultimo = { x: e.clientX, y: e.clientY };
    };
    const solto = () => { ultimo = null; };
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // a roda sozinha rola a página
      e.preventDefault();
      if (orbita.current) orbita.current.zoom = Math.max(0.35, Math.min(2.2, orbita.current.zoom * (e.deltaY > 0 ? 1.08 : 0.92)));
    };
    el.addEventListener('pointerdown', baixo);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', solto);
    el.addEventListener('wheel', roda, { passive: false });
    return () => { el.removeEventListener('pointerdown', baixo); window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', solto); el.removeEventListener('wheel', roda); };
  }, [gl, orbita]);

  useFrame((_, delta) => {
    const alvo = VISTAS[vista];
    const o = orbita.current ?? { yaw: 0, pitch: 0, zoom: 1 };
    const e = estado.current;
    const k = reduzido ? 1000 : 4.5;
    e.alvo.set(amortecer(e.alvo.x, alvo.alvo.x, k, delta), amortecer(e.alvo.y, alvo.alvo.y, k, delta), amortecer(e.alvo.z, alvo.alvo.z, k, delta));
    e.dist = amortecer(e.dist, alvo.dist * o.zoom, k, delta);
    e.az = amortecer(e.az, alvo.az + o.yaw, k, delta);
    e.pol = amortecer(e.pol, alvo.pol - o.pitch, k, delta);
    camera.position.set(e.alvo.x + e.dist * Math.sin(e.pol) * Math.sin(e.az), e.alvo.y + e.dist * Math.cos(e.pol), e.alvo.z + e.dist * Math.sin(e.pol) * Math.cos(e.az));
    camera.lookAt(e.alvo);
  });
  return null;
}

// ---------------------------------------------------------------- rack
function Equipamento3D({ modelo, id, cor, p, desligado, marcado, selecionado, aoSelecionar }: { modelo: ModeloFisico; id: string; cor: string; p: Paleta; desligado: boolean; marcado: boolean; selecionado: boolean; aoSelecionar: (id: string) => void }) {
  const e = modelo.equipamentos.find((x) => x.id === id)!;
  const ins = modelo.instalacoes.find((x) => x.equipamentoId === id)!;
  const h = e.alturaU * U_METROS - 0.004;
  const y = baseDoRack + (ins.uInicial - 1 + e.alturaU / 2) * U_METROS;
  const prof = PROF_TIPO(e.tipo);
  const alerta = marcado ? p.erro : selecionado ? p.destaque : null;
  return (
    <group
      position={[0, y, RACK_FRENTE - prof / 2]}
      onClick={(ev: ThreeEvent<MouseEvent>) => { if (ev.delta < 6) { ev.stopPropagation(); aoSelecionar(id); } }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[LARGURA_19, h, prof]} />
        <meshStandardMaterial color={cor} roughness={0.48} metalness={0.22} transparent={desligado} opacity={desligado ? 0.35 : 1} emissive={alerta ?? '#000000'} emissiveIntensity={alerta ? 0.6 : 0} />
      </mesh>
      {/* Moldura frontal chanfrada de rack técnico */}
      <mesh position={[0, 0, prof / 2 + 0.002]}>
        <boxGeometry args={[LARGURA_19 - 0.015, h * 0.76, 0.004]} />
        <meshStandardMaterial color={e.tipo === 'patch-panel' ? p.calha : p.painel} roughness={0.65} metalness={0.18} transparent={desligado} opacity={desligado ? 0.3 : 1} />
      </mesh>
      {/* Friso luminoso sutil de identificação do equipamento */}
      <mesh position={[-LARGURA_19 / 2 + 0.02, 0, prof / 2 + 0.005]}>
        <boxGeometry args={[0.012, h * 0.5, 0.003]} />
        <meshBasicMaterial color={alerta ?? (desligado ? p.livre : cor)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Todas as portas do rack em um único InstancedMesh: a cor diz livre / em uso / no caminho destacado / apagada. */
function Portas3D({ modelo, caminho, desligado, p }: { modelo: ModeloFisico; caminho: CaminhoFisico | null; desligado: string | null; p: Paleta }) {
  const ref = useRef<InstancedMesh>(null);
  const lista = useMemo(() => {
    const out: { eq: string; porta: number; pos: Ponto3; larg: number }[] = [];
    for (const e of modelo.equipamentos) {
      if (!modelo.instalacoes.some((i) => i.equipamentoId === e.id) || e.tipo === 'ups') continue;
      for (let n = 1; n <= e.portas; n++) out.push({ eq: e.id, porta: n, pos: posicaoPortaNoRack(modelo, e.id, n), larg: Math.min(0.014, (0.4 / Math.max(1, e.portas)) * 0.75) });
    }
    return out;
  }, [modelo]);
  const usadas = useMemo(() => portasUsadas(modelo.cabos), [modelo]);
  const noCaminho = useMemo(() => new Set(caminho ? caminho.cabos.flatMap((c) => [`${c.de.equipamentoId}:${c.de.porta}`, `${c.para.equipamentoId}:${c.para.porta}`]) : []), [caminho]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new Matrix4();
    const c = new Color();
    lista.forEach((it, i) => {
      mat.makeScale(it.larg / 0.01, 1, 1).setPosition(it.pos[0], it.pos[1], it.pos[2]);
      m.setMatrixAt(i, mat);
      const emUso = usadas.get(it.eq)?.has(it.porta);
      c.set(it.eq === desligado ? p.livre : noCaminho.has(`${it.eq}:${it.porta}`) ? p.destaque : emUso ? p.ok : p.livre);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lista, usadas, noCaminho, desligado, p]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lista.length]} frustumCulled={false}>
      <boxGeometry args={[0.01, 0.011, 0.008]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function Rack3D(props: PropsRack3D & { p: Paleta }) {
  const { modelo, p, desligado, marcados, selecionado, aoSelecionar, caminho } = props;
  const instalados = modelo.instalacoes.map((i) => i.equipamentoId);
  const livres = useMemo(() => {
    const o = ocupacaoRack(RACK, modelo.instalacoes, modelo.equipamentos);
    const runs: { u: number; n: number }[] = [];
    o.slots.forEach((s, i) => {
      if (s) return;
      const ult = runs[runs.length - 1];
      if (ult && ult.u + ult.n === i + 1) ult.n++;
      else runs.push({ u: i + 1, n: 1 });
    });
    return runs;
  }, [modelo]);
  const poste = (x: number, z: number) => (
    <mesh key={`${x}${z}`} position={[x, baseDoRack + ALTURA_RACK_M / 2, z]}>
      <boxGeometry args={[0.04, ALTURA_RACK_M + 0.06, 0.04]} />
      <meshStandardMaterial color={p.chassi} roughness={0.5} metalness={0.15} />
    </mesh>
  );
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => poste((sx * RACK_LARGURA) / 2, (sz * RACK_PROFUNDIDADE) / 2))}
      {[baseDoRack - 0.02, baseDoRack + ALTURA_RACK_M + 0.04].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[RACK_LARGURA, 0.04, RACK_PROFUNDIDADE]} />
          <meshStandardMaterial color={p.chassi} roughness={0.6} metalness={0.15} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * RACK_LARGURA) / 2, baseDoRack + ALTURA_RACK_M / 2, 0]}>
          <boxGeometry args={[0.005, ALTURA_RACK_M, RACK_PROFUNDIDADE]} />
          <meshStandardMaterial color={p.destaque} transparent opacity={0.07} />
        </mesh>
      ))}
      {livres.map((r) => (
        <mesh key={r.u} position={[0, baseDoRack + (r.u - 1 + r.n / 2) * U_METROS, RACK_FRENTE - 0.01]}>
          <boxGeometry args={[LARGURA_19, r.n * U_METROS - 0.006, 0.01]} />
          <meshStandardMaterial color={p.livre} transparent opacity={0.45} />
        </mesh>
      ))}
      {instalados.map((id) => {
        const e = modelo.equipamentos.find((x) => x.id === id)!;
        return <Equipamento3D key={id} modelo={modelo} id={id} cor={p[COR_TIPO[e.tipo]]} p={p} desligado={desligado === id} marcado={marcados.includes(id)} selecionado={selecionado === id} aoSelecionar={aoSelecionar} />;
      })}
      <Portas3D modelo={modelo} caminho={caminho} desligado={desligado} p={p} />
    </group>
  );
}

// ---------------------------------------------------------------- prédio
function Calha({ de, para, cor }: { de: Ponto3; para: Ponto3; cor: string }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new Vector3(...de);
    const b = new Vector3(...para);
    const dir = b.clone().sub(a);
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir.clone().normalize()), len: dir.length() };
  }, [de, para]);
  return (
    <mesh position={pos} quaternion={quat}>
      <boxGeometry args={[len, 0.08, 0.3]} />
      <meshStandardMaterial color={cor} roughness={0.6} metalness={0.12} />
    </mesh>
  );
}

function Predio3D({ modelo, p, isolados, salasIsoladas, caminho, selecionado }: { modelo: ModeloFisico; p: Paleta; isolados: string[]; salasIsoladas: string[]; caminho: CaminhoFisico | null; selecionado: string | null }) {
  const grafo: GrafoEletrocalha = ELETROCALHA;
  const hosts = modelo.equipamentos.filter((e) => ['pc', 'tomada', 'ap'].includes(e.tipo));
  const noCaminho = new Set(caminho?.equipamentos ?? []);
  return (
    <group>
      {[0, 1, 2].map((a) => {
        const isolado = salasIsoladas.includes(`andar${a}`);
        return (
          <group key={a}>
            <mesh position={[11, a * ALTURA_ANDAR - 0.1, 0]}>
              <boxGeometry args={[28, 0.14, 16]} />
              <meshStandardMaterial color={isolado ? p.erro : p.andar} roughness={0.8} transparent opacity={isolado ? 0.55 : 0.5} emissive={isolado ? p.erro : '#000000'} emissiveIntensity={isolado ? 0.35 : 0} />
            </mesh>
            <mesh position={[11, a * ALTURA_ANDAR + ALTURA_ANDAR / 2 - 0.1, 0]}>
              <boxGeometry args={[28, ALTURA_ANDAR - 0.14, 16]} />
              <meshBasicMaterial color={p.destaque} wireframe transparent opacity={0.06} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[5, 5.8 - 0.4, -7]}>
        <cylinderGeometry args={[0.16, 0.16, 6.6, 12]} />
        <meshStandardMaterial color={p.calha} metalness={0.15} roughness={0.4} />
      </mesh>
      {grafo.trechos.map(([a, b]) => <Calha key={`${a}${b}`} de={grafo.nos[a]} para={grafo.nos[b]} cor={p.calha} />)}
      {hosts.map((e) => {
        const pos = posicaoExterna(e.id);
        const sem = isolados.includes(e.id);
        const ativo = noCaminho.has(e.id) || selecionado === e.id;
        const cor = sem ? p.erro : ativo ? p.destaque : e.tipo === 'pc' ? p.painel : e.tipo === 'ap' ? p.ok : p.calha;
        const tam: [number, number, number] = e.tipo === 'pc' ? [0.55, 0.38, 0.4] : e.tipo === 'ap' ? [0.4, 0.08, 0.4] : [0.14, 0.14, 0.04];
        return (
          <mesh key={e.id} position={pos}>
            <boxGeometry args={tam} />
            <meshStandardMaterial color={cor} emissive={sem || ativo ? cor : '#000000'} emissiveIntensity={sem || ativo ? 0.6 : 0} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, ALTURA_RACK_M / 2 + baseDoRack, 0]}>
        <boxGeometry args={[RACK_LARGURA + 0.3, ALTURA_RACK_M, RACK_PROFUNDIDADE + 0.3]} />
        <meshStandardMaterial color={p.chassi} metalness={0.15} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- cabos
/** Todos os cabos do modelo como linhas finas (uma chamada de desenho). */
function TodosOsCabos({ modelo, cor }: { modelo: ModeloFisico; cor: string }) {
  const geo = useMemo(() => {
    const v: number[] = [];
    for (const c of modelo.cabos) {
      const pts = limpar(c.caminho);
      for (let i = 1; i < pts.length; i++) v.push(pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(v, 3));
    return g;
  }, [modelo]);
  const mat = useMemo(() => new LineBasicMaterial({ color: cor, transparent: true, opacity: 0.55 }), [cor]);
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}

const RADIAL = 6;
/** O cabo do ponto selecionado "cresce" do PC ao switch; a luz da ponta marca o ponto atingido. TubeGeometry usa getPointAt (distância
 *  real), então o drawRange é proporcional aos METROS percorridos; o count tem de ser múltiplo de RADIAL*6 (um segmento inteiro). */
function CaminhoAnimado({ caminho, reproducao, reduzido, cor, raio }: { caminho: CaminhoFisico | null; reproducao: number; reduzido: boolean; cor: string; raio: number }) {
  const dados = useMemo(() => {
    if (!caminho || !caminho.cabos.length) return null;
    let inicio = 0;
    const trechos = caminho.cabos.map((c, i) => {
      const direto = c.de.equipamentoId === caminho.equipamentos[i];
      const pts = limpar(direto ? c.caminho : [...c.caminho].reverse());
      const curva = new CurvePath<Vector3>();
      for (let k = 1; k < pts.length; k++) curva.add(new LineCurve3(pts[k - 1], pts[k]));
      const len = curva.getLength();
      const seg = Math.max(8, Math.ceil(len * 8));
      const geo = new TubeGeometry(curva, seg, raio, RADIAL, false);
      const t = { curva, len, seg, geo, inicio };
      inicio += len;
      return t;
    });
    return { trechos, total: inicio };
  }, [caminho, raio]);
  useEffect(() => () => dados?.trechos.forEach((t) => t.geo.dispose()), [dados]);

  const t0 = useRef(0);
  const cabeca = useRef<Mesh>(null);
  const agora = useRef(0);
  useEffect(() => { t0.current = agora.current; }, [reproducao, caminho]);
  useFrame((s) => {
    agora.current = s.clock.elapsedTime;
    if (!dados) return;
    const dur = 2.6;
    const f = reduzido ? 1 : Math.min(1, (s.clock.elapsedTime - t0.current) / dur);
    const eased = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    const dist = eased * dados.total;
    for (const t of dados.trechos) {
      const frac = Math.max(0, Math.min(1, (dist - t.inicio) / t.len));
      t.geo.setDrawRange(0, Math.floor(frac * t.seg) * RADIAL * 6);
      if (cabeca.current && dist >= t.inicio && dist <= t.inicio + t.len + 1e-6) cabeca.current.position.copy(t.curva.getPointAt(Math.min(1, Math.max(0, frac))));
    }
    if (cabeca.current) cabeca.current.visible = true;
  });
  if (!dados) return null;
  return (
    <group>
      {dados.trechos.map((t, i) => (
        <mesh key={i} geometry={t.geo}>
          <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.9} roughness={0.4} />
        </mesh>
      ))}
      <mesh ref={cabeca} visible={false}>
        <sphereGeometry args={[raio * 3.5, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- rótulos HTML projetados
interface ItemRotulo { id: string; texto: string; pos: Vector3; /** coluna do rótulo (0 ou 1): itens de 1 U vizinhos alternam para não se sobrepor */ col?: number }
function Projetor({ itens, raiz }: { itens: ItemRotulo[]; raiz: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const el = raiz.current;
    if (!el) return;
    itens.forEach((it, i) => {
      const span = el.children[i] as HTMLElement | undefined;
      if (!span) return;
      v.copy(it.pos).project(camera);
      span.style.display = v.z < 1 ? '' : 'none';
      span.style.transform = `translate(${(v.x * 0.5 + 0.5) * size.width + (it.col ?? 0) * Math.min(150, size.width * 0.3)}px, ${(-v.y * 0.5 + 0.5) * size.height}px)`;
    });
  });
  return null;
}

// ---------------------------------------------------------------- cena
export default function RackEmpresa3DCena(props: PropsRack3D & PropsCena) {
  const { modelo, vista, caminho, reproducao, desligado, isolados, salasIsoladas, selecionado, aoSelecionar, aoFalhar, movimentoReduzido } = props;
  const p = useTokens(MAPA, PADRAO);
  const [nivel, setNivel] = useState(0);
  const orbita = useRef<Orbita>({ yaw: 0, pitch: 0, zoom: 1 });
  const rotulos = useRef<HTMLDivElement>(null);

  const itens = useMemo<ItemRotulo[]>(() => {
    if (vista === 'rack') {
      return [...modelo.instalacoes].sort((a, b) => a.uInicial - b.uInicial).map((i, k) => {
        const e = modelo.equipamentos.find((x) => x.id === i.equipamentoId)!;
        const y = baseDoRack + (i.uInicial - 1 + e.alturaU / 2) * U_METROS;
        return { id: e.id, texto: `U${i.uInicial}${e.alturaU > 1 ? `–${i.uInicial + e.alturaU - 1}` : ''} · ${e.nome}`, pos: new Vector3(RACK_LARGURA / 2 + 0.05, y, RACK_FRENTE), col: k % 2 };
      });
    }
    return [
      { id: 'a0', texto: 'Térreo · Comercial', pos: new Vector3(22, 0.2, 8.4) },
      { id: 'a1', texto: '2º andar · Administrativo', pos: new Vector3(22, ALTURA_ANDAR + 0.2, 8.4) },
      { id: 'a2', texto: '3º andar · Desenvolvimento', pos: new Vector3(22, 2 * ALTURA_ANDAR + 0.2, 8.4) },
      { id: 'ti', texto: 'Sala de TI · RACK-01', pos: new Vector3(0, 2.4, 0.9) },
      { id: 'pr', texto: 'Prumada', pos: new Vector3(5, 9.4, -7) },
    ];
  }, [modelo, vista]);

  return (
    <div className="ri-cena">
      <Canvas frameloop="always" shadows={nivel < 2} dpr={nivel >= 2 ? 0.75 : nivel >= 1 ? 1 : [1, 2]} camera={{ position: [3, 2, 4], fov: 38, near: 0.05, far: 200 }} gl={{ antialias: true, alpha: true }} style={{ touchAction: 'none' }}>
        <ambientLight intensity={0.85} color="#e2e8f0" />
        <hemisphereLight args={[p.luzCeu, p.luzChao, 0.75]} />
        <directionalLight position={[6, 12, 8]} intensity={1.8} castShadow={nivel < 2} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />
        <directionalLight position={[-6, 4, -4]} intensity={0.65} color={p.luzRecorte} />
        <Camara vista={vista} reduzido={movimentoReduzido} orbita={orbita} />

        {/* Piso técnico modular de Datacenter (Sala Cofre / Prédio) */}
        <group position={[vista === 'rack' ? 0 : 11, -0.015, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[vista === 'rack' ? 3.6 : 32, 48]} />
            <meshStandardMaterial color={p.piso} roughness={0.88} metalness={0.15} />
          </mesh>
          <gridHelper args={[vista === 'rack' ? 4 : 48, vista === 'rack' ? 10 : 32, '#1e3a5f', '#0f172a']} position={[0, 0.005, 0]} />
        </group>

        {vista === 'rack' ? <Rack3D {...props} p={p} /> : <Predio3D modelo={modelo} p={p} isolados={isolados} salasIsoladas={salasIsoladas} caminho={caminho} selecionado={selecionado} />}
        <TodosOsCabos modelo={modelo} cor={p.cabo} />
        <CaminhoAnimado caminho={caminho} reproducao={reproducao} reduzido={movimentoReduzido} cor={p.destaque} raio={vista === 'rack' ? 0.014 : 0.1} />
        <Projetor itens={itens} raiz={rotulos} />

        <PausaAutomatica />
        <MonitorQualidade alvo={24} maxNivel={3} aoMudar={setNivel} />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>

      <div ref={rotulos} className="ri-rotulos" aria-hidden="true">
        {itens.map((it) => (
          <span key={it.id} className={`${it.id === selecionado ? 'sel' : ''} ${it.id === desligado ? 'off' : ''}`}>{it.texto}</span>
        ))}
      </div>

      {/* 3D não tem foco por equipamento: a lista é a alternativa de teclado e leitor de tela */}
      <ul className="ri-acessivel" aria-label="Equipamentos do rack">
        {modelo.instalacoes.map((i) => {
          const e = modelo.equipamentos.find((x) => x.id === i.equipamentoId)!;
          return <li key={e.id}><button onClick={() => aoSelecionar(e.id)}>{`${e.nome}, U${i.uInicial}${e.id === desligado ? ', desligado' : ''}`}</button></li>;
        })}
      </ul>
    </div>
  );
}
