// Cena 3D do almoxarifado: prédio por setores, estantes instanciadas (1 draw call por peça),
// empilhadeiras, caminhões, conferência, separação, esteira e embalagem — tudo lido da Simulacao.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { amortecer, useTokens, type PropsCena } from '@anim3d/kit';
import { AmbienteEstudio, GuardaContexto, PausaAutomatica } from '@anim3d/kit/cena';
import { alturaRack, GEO, LETRAS, meioComprimento, statusDe, xCorredor, xRack, yNivel, type Posicao, type Status } from './dados';
import {
  COMPRIMENTO_ESTEIRA,
  DOCA_EXPED,
  DOCA_RECEB,
  ESTEIRA,
  FAIXA,
  PREDIO,
  S_EMBALAGEM,
  SETORES,
  Z_PAREDE,
  type Caminhao as TCaminhao,
  type Empilhadeira as TEmp,
  type IdSetor,
  type Simulacao,
} from './simulacao';

export interface PropsAlmoxarifado {
  sim: Simulacao;
  setor: IdSetor | null;
  selecionado: number | null;
  filtro: Status | 'todos';
  destaques: number[];
  aoSelecionar: (i: number | null) => void;
  aoSetor: (s: IdSetor | null) => void;
  dica: RefObject<HTMLDivElement | null>;
}

const MAPA = {
  primaria: '--cor-primaria',
  destaque: '--cor-destaque',
  sucesso: '--cor-sucesso',
  piso: '--cor-plataforma',
  bloco: '--cor-bloco',
  rack: '--cor-rack',
};
const PADRAO = { primaria: '#818cf8', destaque: '#fb923c', sucesso: '#4ade80', piso: '#161b2e', bloco: '#2a3150', rack: '#3b5bdb' };
type Cores = typeof PADRAO;

const COR_STATUS: Record<Status, string> = { ok: '#c9a46c', baixo: '#f59e0b', critico: '#ef4444', vazio: '#000000' };
const _o = new Object3D();
const _c = new Color();

// ---------- utilitários ----------
function texturaTexto(texto: string, cor: string, px = 64) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = `700 ${px}px system-ui`;
  c.width = Math.ceil(ctx.measureText(texto).width + px);
  c.height = Math.ceil(px * 1.5);
  ctx.font = `700 ${px}px system-ui`;
  ctx.fillStyle = cor;
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, px / 2, c.height / 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return { t, aspecto: c.width / c.height };
}

function Rotulo({ texto, cor, x, z, altura = 1.2, opacidade = 0.9 }: { texto: string; cor: string; x: number; z: number; altura?: number; opacidade?: number }) {
  const { t, aspecto } = useMemo(() => texturaTexto(texto, cor), [texto, cor]);
  useEffect(() => () => t.dispose(), [t]);
  return (
    <mesh position={[x, 0.03, z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[altura * aspecto, altura]} />
      <meshBasicMaterial map={t} transparent opacity={opacidade} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Cx(props: { p: [number, number, number]; s: [number, number, number]; cor?: string; m?: MeshStandardMaterial; sombra?: boolean }) {
  return (
    <mesh position={props.p} castShadow={props.sombra !== false} receiveShadow material={props.m}>
      <boxGeometry args={props.s} />
      {!props.m && <meshStandardMaterial color={props.cor} roughness={0.7} />}
    </mesh>
  );
}

// ---------- prédio e setores ----------
function Predio({ cores, setor, aoSetor }: { cores: Cores; setor: IdSetor | null; aoSetor: (s: IdSetor | null) => void }) {
  const w = PREDIO.x1 - PREDIO.x0;
  const d = PREDIO.z1 - PREDIO.z0;
  const cx = (PREDIO.x0 + PREDIO.x1) / 2;
  const cz = (PREDIO.z0 + PREDIO.z1) / 2;
  const portas = [DOCA_RECEB.x, DOCA_EXPED.x];
  const frente: [number, number][] = [];
  let x = PREDIO.x0;
  for (const p of portas) {
    frente.push([x, p - 2.4]);
    x = p + 2.4;
  }
  frente.push([x, PREDIO.x1]);
  return (
    <>
      <mesh position={[cx, -0.06, cz]} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={cores.piso} roughness={0.95} />
      </mesh>
      <mesh position={[cx, -0.2, cz + 8]} receiveShadow>
        <boxGeometry args={[w + 30, 0.1, d + 60]} />
        <meshStandardMaterial color="#0b0e18" roughness={1} />
      </mesh>
      {/* paredes baixas (deixam ver o interior) */}
      <Cx p={[cx, 0.45, PREDIO.z0]} s={[w, 0.9, 0.3]} cor={cores.bloco} />
      <Cx p={[PREDIO.x0, 0.45, cz]} s={[0.3, 0.9, d]} cor={cores.bloco} />
      <Cx p={[PREDIO.x1, 0.45, cz]} s={[0.3, 0.9, d]} cor={cores.bloco} />
      {frente.map(([a, b]) => (
        <Cx key={a} p={[(a + b) / 2, 0.6, Z_PAREDE]} s={[b - a, 1.2, 0.3]} cor={cores.bloco} />
      ))}
      {/* setores no piso: clique para focar */}
      {SETORES.map((s) => {
        const ativo = setor === s.id;
        return (
          <group key={s.id}>
            <mesh
              position={[(s.x0 + s.x1) / 2, 0.012, (s.z0 + s.z1) / 2]}
              rotation-x={-Math.PI / 2}
              onClick={(e) => {
                if (e.delta > 4) return;
                e.stopPropagation();
                aoSetor(ativo ? null : s.id);
              }}
            >
              <planeGeometry args={[s.x1 - s.x0 - 0.2, s.z1 - s.z0 - 0.2]} />
              <meshBasicMaterial color={s.cor} transparent opacity={ativo ? 0.3 : 0.14} depthWrite={false} toneMapped={false} />
            </mesh>
            <Rotulo texto={s.nome.toUpperCase()} cor={s.cor} x={(s.x0 + s.x1) / 2} z={s.id === 'armazenagem' ? s.z1 - 1 : s.z0 + 1.1} altura={s.id === 'armazenagem' ? 1.6 : 1.25} />
          </group>
        );
      })}
      {/* faixa de circulação: tracejado amarelo */}
      <Tracejado z={FAIXA - 1.4} />
      <Tracejado z={FAIXA + 1.4} />
      {Array.from({ length: GEO.corredores }, (_, c) => (
        <Rotulo key={c} texto={LETRAS[c]} cor="#e5e7eb" x={xCorredor(c)} z={meioComprimento + 1.3} altura={1.4} />
      ))}
    </>
  );
}

function Tracejado({ z }: { z: number }) {
  const ref = useRef<InstancedMesh>(null);
  const n = 52;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < n; i++) {
      _o.position.set(PREDIO.x0 + 1 + i * 1.18, 0.02, z);
      _o.scale.set(1, 1, 1);
      _o.rotation.set(0, 0, 0);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [z]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <boxGeometry args={[0.7, 0.01, 0.12]} />
      <meshBasicMaterial color="#facc15" toneMapped={false} />
    </instancedMesh>
  );
}

// ---------- estantes (estrutura) ----------
function Estantes({ cores }: { cores: Cores }) {
  const montantes = useRef<InstancedMesh>(null);
  const longarinas = useRef<InstancedMesh>(null);
  const linhas = GEO.corredores * 2;
  const nMont = linhas * (GEO.baias + 1) * 2;
  const nLong = linhas * GEO.baias * GEO.niveis * 2;
  useLayoutEffect(() => {
    const mm = montantes.current, ml = longarinas.current;
    if (!mm || !ml) return;
    let i = 0, j = 0;
    _o.rotation.set(0, 0, 0);
    _o.scale.set(1, 1, 1);
    for (let c = 0; c < GEO.corredores; c++)
      for (const lado of [-1, 1] as const) {
        const x = xRack(c, lado);
        for (const face of [-1, 1]) {
          const fx = x + (face * GEO.profRack) / 2;
          for (let k = 0; k <= GEO.baias; k++) {
            _o.position.set(fx, alturaRack / 2, (k - GEO.baias / 2) * GEO.larguraBaia);
            _o.updateMatrix();
            mm.setMatrixAt(i++, _o.matrix);
          }
          for (let b = 0; b < GEO.baias; b++)
            for (let n = 1; n <= GEO.niveis; n++) {
              _o.position.set(fx, n === GEO.niveis ? alturaRack - 0.08 : yNivel(n) - 0.07, (b - (GEO.baias - 1) / 2) * GEO.larguraBaia);
              _o.updateMatrix();
              ml.setMatrixAt(j++, _o.matrix);
            }
        }
      }
    mm.instanceMatrix.needsUpdate = true;
    ml.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={montantes} args={[undefined, undefined, nMont]} castShadow receiveShadow>
        <boxGeometry args={[0.09, alturaRack, 0.09]} />
        <meshStandardMaterial color={cores.rack} roughness={0.5} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={longarinas} args={[undefined, undefined, nLong]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.12, GEO.larguraBaia]} />
        <meshStandardMaterial color={cores.destaque} roughness={0.5} metalness={0.2} />
      </instancedMesh>
    </>
  );
}

// ---------- paletes nas estantes (vivos) ----------
function Paletes({ sim, filtro, selecionado, destaques, aoSelecionar, cores, dica }: Omit<PropsAlmoxarifado, 'setor' | 'aoSetor'> & { cores: Cores }) {
  const base = useRef<InstancedMesh>(null);
  const carga = useRef<InstancedMesh>(null);
  const hover = useRef<number | null>(null);
  const posicoes = sim.almox.posicoes;
  const n = posicoes.length * 2; // 2 paletes por baia
  const geoBase = useMemo(() => new BoxGeometry(1.0, 0.14, 1.15), []);
  const geoCarga = useMemo(() => new BoxGeometry(0.95, 1, 1.05).translate(0, 0.5, 0), []);
  const destaqueSet = useMemo(() => new Set(destaques), [destaques]);

  const cor = (p: Posicao): Color => {
    const s = statusDe(p);
    if (p.indice === selecionado) return _c.set('#ffffff');
    if (p.indice === hover.current) return _c.set(cores.primaria).multiplyScalar(1.4);
    if (destaqueSet.has(p.indice)) return _c.set(cores.primaria);
    if (filtro !== 'todos' && s !== filtro) return _c.set('#3a3f55');
    return _c.set(COR_STATUS[s]);
  };

  const atualizar = (p: Posicao) => {
    const mb = base.current, mc = carga.current;
    if (!mb || !mc) return;
    const vazio = statusDe(p) === 'vazio';
    const h = p.sku ? 0.45 + 0.8 * Math.min(1, p.qtd / (p.sku.minimo * 2.4)) : 0;
    for (let k = 0; k < 2; k++) {
      const i = p.indice * 2 + k;
      const z = p.z + (k ? 0.66 : -0.66);
      _o.rotation.set(0, 0, 0);
      _o.position.set(p.x, p.y + 0.07, z);
      _o.scale.setScalar(vazio ? 0 : 1);
      _o.updateMatrix();
      mb.setMatrixAt(i, _o.matrix);
      _o.position.set(p.x, p.y + 0.14, z);
      _o.scale.set(vazio ? 0 : 1, vazio ? 0 : h, vazio ? 0 : 1);
      _o.updateMatrix();
      mc.setMatrixAt(i, _o.matrix);
      mc.setColorAt(i, cor(p));
    }
  };

  const tudo = () => {
    posicoes.forEach(atualizar);
    if (base.current) base.current.instanceMatrix.needsUpdate = true;
    if (carga.current) {
      carga.current.instanceMatrix.needsUpdate = true;
      if (carga.current.instanceColor) carga.current.instanceColor.needsUpdate = true;
      carga.current.computeBoundingSphere();
    }
  };

  useLayoutEffect(tudo, [filtro, selecionado, destaqueSet, cores]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!sim.binsSujos.size) return;
    sim.binsSujos.forEach((i) => atualizar(posicoes[i]));
    sim.binsSujos.clear();
    if (base.current) base.current.instanceMatrix.needsUpdate = true;
    if (carga.current) {
      carga.current.instanceMatrix.needsUpdate = true;
      if (carga.current.instanceColor) carga.current.instanceColor.needsUpdate = true;
    }
  });

  const mostrarDica = (e: ThreeEvent<PointerEvent>, p: Posicao) => {
    const el = dica.current;
    if (!el) return;
    el.style.display = 'block';
    el.style.transform = `translate(${e.nativeEvent.offsetX + 14}px, ${e.nativeEvent.offsetY + 14}px)`;
    el.textContent = `${p.codigo} · ${p.sku ? `${p.sku.nome} · ${p.qtd} ${p.sku.unidade}` : 'vazio'}`;
  };

  return (
    <>
      <instancedMesh ref={base} args={[geoBase, undefined, n]} castShadow receiveShadow>
        <meshStandardMaterial color="#8b6a43" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={carga}
        args={[geoCarga, undefined, n]}
        castShadow
        receiveShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId === undefined) return;
          const i = Math.floor(e.instanceId / 2);
          if (hover.current !== i) {
            const ant = hover.current;
            hover.current = i;
            if (ant !== null) atualizar(posicoes[ant]);
            atualizar(posicoes[i]);
            if (carga.current?.instanceColor) carga.current.instanceColor.needsUpdate = true;
            document.body.style.cursor = 'pointer';
          }
          mostrarDica(e, posicoes[i]);
        }}
        onPointerOut={() => {
          const ant = hover.current;
          hover.current = null;
          if (ant !== null) atualizar(posicoes[ant]);
          if (carga.current?.instanceColor) carga.current.instanceColor.needsUpdate = true;
          document.body.style.cursor = '';
          if (dica.current) dica.current.style.display = 'none';
        }}
        onClick={(e) => {
          if (e.delta > 4 || e.instanceId === undefined) return;
          e.stopPropagation();
          aoSelecionar(Math.floor(e.instanceId / 2));
        }}
      >
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
    </>
  );
}

// ---------- palete solto (conferência, separação, garfos) ----------
function PaleteSolto({ altura = 1, cor = '#c9a46c' }: { altura?: number; cor?: string }) {
  return (
    <>
      <Cx p={[0, 0.07, 0]} s={[1.15, 0.14, 1.0]} cor="#8b6a43" />
      <Cx p={[0, 0.14 + altura / 2, 0]} s={[1.05, altura, 0.95]} cor={cor} />
    </>
  );
}

function Pessoa({ x, z, ang = 0, cor }: { x: number; z: number; ang?: number; cor: string }) {
  const ref = useRef<Group>(null);
  const fase = useMemo(() => x * 1.7 + z, [x, z]);
  useFrame((st) => {
    if (ref.current) ref.current.rotation.y = ang + Math.sin(st.clock.elapsedTime * 0.9 + fase) * 0.35;
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.7, 4, 12]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.23, 0.35, 4, 12]} />
        <meshStandardMaterial color={cor} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#e2b48c" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

function Conferencia({ sim }: { sim: Simulacao }) {
  return (
    <>
      {sim.slots.map((_, i) => (
        <SlotConferencia key={i} sim={sim} i={i} />
      ))}
      <Cx p={[-8.75, 0.45, 22.9]} s={[7, 0.9, 0.8]} cor="#475569" />
      <Pessoa x={-8.75} z={22.1} ang={Math.PI} cor="#a78bfa" />
      <Pessoa x={-19} z={21} ang={Math.PI} cor="#38bdf8" />
    </>
  );
}

function SlotConferencia({ sim, i }: { sim: Simulacao; i: number }) {
  const g = useRef<Group>(null);
  const feixe = useRef<Mesh>(null);
  const selo = useRef<Mesh>(null);
  const s = sim.slots[i];
  useFrame((st) => {
    if (g.current) g.current.visible = !!s.carga;
    const conferindo = !!s.carga && !s.conferido;
    if (feixe.current) {
      feixe.current.visible = conferindo;
      feixe.current.position.z = Math.sin(st.clock.elapsedTime * 3) * 0.45;
    }
    if (selo.current) selo.current.visible = !!s.carga && s.conferido;
  });
  return (
    <group position={[s.x, 0, s.z]}>
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 0.95, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color="#a78bfa" toneMapped={false} />
      </mesh>
      {/* pórtico do leitor */}
      <Cx p={[-0.75, 1.1, 0]} s={[0.08, 2.2, 0.08]} cor="#64748b" />
      <Cx p={[0.75, 1.1, 0]} s={[0.08, 2.2, 0.08]} cor="#64748b" />
      <Cx p={[0, 2.2, 0]} s={[1.6, 0.1, 0.12]} cor="#64748b" />
      <mesh ref={feixe} position={[0, 1.15, 0]}>
        <boxGeometry args={[1.45, 2.0, 0.03]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </mesh>
      <group ref={g}>
        <PaleteSolto altura={1.0} />
        <mesh ref={selo} position={[0, 1.2, 0.48]}>
          <boxGeometry args={[0.4, 0.25, 0.02]} />
          <meshBasicMaterial color="#4ade80" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Separacao({ sim }: { sim: Simulacao }) {
  return (
    <>
      {sim.estacoes.map((_, i) => (
        <EstacaoSeparacao key={i} sim={sim} i={i} />
      ))}
      <Pessoa x={1.75} z={20.6} ang={Math.PI} cor="#fbbf24" />
    </>
  );
}

function EstacaoSeparacao({ sim, i }: { sim: Simulacao; i: number }) {
  const g = useRef<Group>(null);
  const caixa = useRef<Mesh>(null);
  const e = sim.estacoes[i];
  useFrame(() => {
    if (g.current) g.current.visible = !!e.carga;
    if (caixa.current) {
      const h = Math.max(0.25, 1 - e.geradas * 0.25);
      caixa.current.scale.y = h;
      caixa.current.position.y = 0.14 + h / 2;
    }
  });
  return (
    <group position={[e.x, 0, e.z]}>
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 0.95, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      <Cx p={[0, 0.45, 1.6]} s={[1.8, 0.9, 0.8]} cor="#475569" />
      <group ref={g}>
        <Cx p={[0, 0.07, 0]} s={[1.15, 0.14, 1.0]} cor="#8b6a43" />
        <mesh ref={caixa} castShadow>
          <boxGeometry args={[1.05, 1, 0.95]} />
          <meshStandardMaterial color="#c9a46c" />
        </mesh>
      </group>
    </group>
  );
}

function Esteira({ sim }: { sim: Simulacao }) {
  const caixas = useRef<InstancedMesh>(null);
  const anel = useRef<Mesh>(null);
  const cap = 64;
  const comp = COMPRIMENTO_ESTEIRA;
  const meio = ESTEIRA.x0 + comp / 2;
  const xEmb = ESTEIRA.x0 + S_EMBALAGEM;
  const papelao = useMemo(() => new Color('#c9a46c'), []);
  const filme = useMemo(() => new Color('#a5f3fc'), []);
  useFrame((st, d) => {
    const m = caixas.current;
    if (m) {
      _o.rotation.set(0, 0, 0);
      for (let i = 0; i < cap; i++) {
        const c = sim.caixas[i];
        if (c) {
          _o.position.set(ESTEIRA.x0 + c.s, 1.08, ESTEIRA.z);
          _o.scale.setScalar(1);
          m.setColorAt(i, c.embalada ? filme : papelao);
        } else _o.scale.setScalar(0);
        _o.updateMatrix();
        m.setMatrixAt(i, _o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const embalando = sim.caixas.some((c) => !c.embalada && Math.abs(c.s - S_EMBALAGEM) < 0.01);
    if (anel.current) {
      if (embalando) anel.current.rotation.y += d * 6;
      anel.current.position.y = 1.1 + (embalando ? Math.sin(st.clock.elapsedTime * 5) * 0.2 : 0);
    }
  });
  return (
    <>
      <Cx p={[meio, 0.75, ESTEIRA.z]} s={[comp + 0.6, 0.12, 0.8]} cor="#1f2937" />
      <Cx p={[meio, 0.86, ESTEIRA.z - 0.43]} s={[comp + 0.6, 0.1, 0.06]} cor="#94a3b8" />
      <Cx p={[meio, 0.86, ESTEIRA.z + 0.43]} s={[comp + 0.6, 0.1, 0.06]} cor="#94a3b8" />
      {Array.from({ length: Math.floor(comp / 2.5) + 1 }, (_, i) => (
        <Cx key={i} p={[ESTEIRA.x0 + i * 2.5, 0.35, ESTEIRA.z]} s={[0.1, 0.7, 0.7]} cor="#475569" sombra={false} />
      ))}
      <instancedMesh ref={caixas} args={[undefined, undefined, cap]} castShadow>
        <boxGeometry args={[0.55, 0.42, 0.5]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      {/* envolvedora da embalagem */}
      <Cx p={[xEmb - 0.9, 1.2, ESTEIRA.z]} s={[0.12, 2.4, 0.12]} cor="#64748b" />
      <Cx p={[xEmb + 0.9, 1.2, ESTEIRA.z]} s={[0.12, 2.4, 0.12]} cor="#64748b" />
      <Cx p={[xEmb, 2.4, ESTEIRA.z]} s={[1.92, 0.12, 0.3]} cor="#64748b" />
      <mesh ref={anel} position={[xEmb, 1.1, ESTEIRA.z]}>
        <torusGeometry args={[0.6, 0.05, 8, 32]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.6} />
      </mesh>
      <Pessoa x={xEmb} z={ESTEIRA.z - 1.6} ang={0} cor="#f472b6" />
      <Pessoa x={22} z={20.4} ang={Math.PI / 2} cor="#4ade80" />
    </>
  );
}

// ---------- caminhão e porta da doca ----------
function Caminhao({ c, faixa }: { c: TCaminhao; faixa: string }) {
  const g = useRef<Group>(null);
  const porta = useRef<Mesh>(null);
  const conteudo = useRef<InstancedMesh>(null);
  const capacidade = Math.max(c.capacidade, 9);
  useFrame(() => {
    if (g.current) {
      g.current.visible = c.estado !== 'fora';
      g.current.position.z = c.z;
    }
    if (porta.current) {
      const h = 4.2 * (1 - 0.92 * c.porta);
      porta.current.scale.y = h / 4.2;
      porta.current.position.y = 4.4 - h / 2;
    }
    const m = conteudo.current;
    if (m) {
      _o.rotation.set(0, 0, 0);
      for (let i = 0; i < capacidade; i++) {
        const tem = i < c.carga;
        const linha = Math.floor(i / 3), col = i % 3;
        if (c.tipo === 'recebimento') _o.position.set((i % 2 ? 0.6 : -0.6), 0.85, 1.2 + Math.floor(i / 2) * 1.4);
        else _o.position.set((col - 1) * 0.7, 0.95, 0.8 + linha * 0.7);
        _o.scale.setScalar(tem ? 1 : 0);
        _o.updateMatrix();
        m.setMatrixAt(i, _o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });
  const recebe = c.tipo === 'recebimento';
  return (
    <>
      {/* porta de enrolar da doca */}
      <Cx p={[c.x - 2.3, 2.3, Z_PAREDE]} s={[0.25, 4.6, 0.35]} cor="#334155" />
      <Cx p={[c.x + 2.3, 2.3, Z_PAREDE]} s={[0.25, 4.6, 0.35]} cor="#334155" />
      <Cx p={[c.x, 4.6, Z_PAREDE]} s={[4.85, 0.3, 0.35]} cor="#334155" />
      <mesh ref={porta} position={[c.x, 2.3, Z_PAREDE + 0.05]}>
        <boxGeometry args={[4.3, 4.2, 0.08]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.5} />
      </mesh>
      <Cx p={[c.x, 0.06, Z_PAREDE - 0.9]} s={[3, 0.04, 1.6]} cor="#facc15" sombra={false} />
      <group ref={g} position={[c.x, 0, c.z]}>
        {/* baú */}
        <Cx p={[0, 2.2, 6.2]} s={[2.6, 2.9, 12]} cor="#e5e7eb" />
        <Cx p={[0, 1.3, 6.2]} s={[2.62, 0.35, 12.02]} cor={faixa} />
        <Cx p={[0, 0.55, 6.2]} s={[2.4, 0.3, 11.6]} cor="#1f2937" />
        <instancedMesh ref={conteudo} args={[undefined, undefined, capacidade]}>
          {recebe ? <boxGeometry args={[1.0, 1.0, 1.1]} /> : <boxGeometry args={[0.55, 0.42, 0.5]} />}
          <meshStandardMaterial color={recebe ? '#c9a46c' : '#a5f3fc'} />
        </instancedMesh>
        {/* cabine */}
        <Cx p={[0, 1.7, 13.6]} s={[2.5, 2.5, 2.2]} cor={faixa} />
        <Cx p={[0, 2.3, 12.5]} s={[2.2, 0.9, 0.05]} cor="#0f172a" sombra={false} />
        {[1.6, 4.6, 10.2, 13.6].map((z) => (
          <group key={z}>
            <mesh position={[-1.25, 0.5, z]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.48, 0.48, 0.35, 18]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh position={[1.25, 0.5, z]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.48, 0.48, 0.35, 18]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

// ---------- empilhadeira ----------
function Empilhadeira({ e, cor }: { e: TEmp; cor: string }) {
  const g = useRef<Group>(null);
  const garfo = useRef<Group>(null);
  const palete = useRef<Group>(null);
  const luz = useRef<Mesh>(null);
  useFrame((st) => {
    if (g.current) {
      g.current.position.set(e.x, 0, e.z);
      g.current.rotation.y = e.ang;
    }
    if (garfo.current) garfo.current.position.y = e.garfo;
    if (palete.current) palete.current.visible = !!e.carga;
    if (luz.current) luz.current.visible = Math.sin(st.clock.elapsedTime * 8) > 0;
  });
  return (
    <group ref={g}>
      {/* chassi e contrapeso */}
      <Cx p={[0, 0.55, -0.15]} s={[1.15, 0.7, 1.7]} cor={cor} />
      <Cx p={[0, 0.65, -1.05]} s={[1.1, 0.9, 0.35]} cor="#1f2937" />
      {/* cabine (gaiola) */}
      {[[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.35], [0.5, 0.35]].map(([x, z]) => (
        <Cx key={`${x}${z}`} p={[x, 1.55, z]} s={[0.06, 1.3, 0.06]} cor="#1f2937" sombra={false} />
      ))}
      <Cx p={[0, 2.22, -0.18]} s={[1.12, 0.06, 1.2]} cor="#1f2937" />
      <Cx p={[0, 1.05, -0.4]} s={[0.5, 0.5, 0.5]} cor="#334155" sombra={false} />
      <mesh ref={luz} position={[0, 2.32, -0.5]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#f59e0b" toneMapped={false} />
      </mesh>
      {/* torre */}
      <Cx p={[-0.42, 1.6, 0.78]} s={[0.1, 3.2, 0.12]} cor="#334155" />
      <Cx p={[0.42, 1.6, 0.78]} s={[0.1, 3.2, 0.12]} cor="#334155" />
      {/* garfos + palete transportado */}
      <group ref={garfo}>
        <Cx p={[0, 0.25, 0.9]} s={[0.95, 0.5, 0.06]} cor="#475569" />
        <Cx p={[-0.3, 0.02, 1.45]} s={[0.12, 0.05, 1.1]} cor="#94a3b8" />
        <Cx p={[0.3, 0.02, 1.45]} s={[0.12, 0.05, 1.1]} cor="#94a3b8" />
        <group ref={palete} position={[0, 0.05, 1.5]}>
          <PaleteSolto altura={0.9} />
        </group>
      </group>
      {[[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.8], [0.6, -0.8]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.28, z]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.22, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
    </group>
  );
}

// ---------- câmera: controles + voo até setor/posição ----------
function vistaPara(setor: IdSetor | null, p: Posicao | null): { pos: Vector3; alvo: Vector3 } {
  if (p) {
    const alvo = new Vector3(p.x, p.y + 0.6, p.z);
    return { alvo, pos: new Vector3(xCorredor(p.corredor) - p.lado * 0.4, p.y + 3.2, p.z + 9) };
  }
  const s = SETORES.find((x) => x.id === setor);
  if (s) {
    const alvo = new Vector3((s.x0 + s.x1) / 2, 0, (s.z0 + s.z1) / 2);
    // de cima e por dentro do prédio: o caminhão (fora, na doca) não tapa o setor
    const span = Math.max(s.x1 - s.x0, (s.z1 - s.z0) * 1.6) * 1.1;
    return { alvo, pos: alvo.clone().add(new Vector3(span * 0.12, span * 1.15, span * 0.42)) };
  }
  return { alvo: new Vector3(0, 0, 7), pos: new Vector3(14, 46, 64) };
}

function Camera({ setor, selecionado, sim, semVoo }: { setor: IdSetor | null; selecionado: number | null; sim: Simulacao; semVoo: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const ctrl = useRef<OrbitControls | null>(null);
  const voo = useRef<{ pos: Vector3; alvo: Vector3 } | null>(null);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = 1.36;
    c.minDistance = 4;
    c.maxDistance = 130;
    c.screenSpacePanning = false;
    c.addEventListener('start', () => (voo.current = null));
    ctrl.current = c;
    const v = vistaPara(null, null);
    camera.position.copy(v.pos);
    c.target.copy(v.alvo);
    c.update();
    return () => c.dispose();
  }, [camera, gl]);

  useEffect(() => {
    const v = vistaPara(setor, selecionado === null ? null : sim.almox.posicoes[selecionado]);
    if (semVoo && ctrl.current) {
      // movimento reduzido: corta direto para a vista, sem animar a câmera
      camera.position.copy(v.pos);
      ctrl.current.target.copy(v.alvo);
      ctrl.current.update();
      voo.current = null;
    } else voo.current = v;
  }, [setor, selecionado, sim, semVoo, camera]);

  useFrame((_, d) => {
    const c = ctrl.current;
    if (!c) return;
    const v = voo.current;
    if (v) {
      camera.position.x = amortecer(camera.position.x, v.pos.x, 3.5, d);
      camera.position.y = amortecer(camera.position.y, v.pos.y, 3.5, d);
      camera.position.z = amortecer(camera.position.z, v.pos.z, 3.5, d);
      c.target.x = amortecer(c.target.x, v.alvo.x, 3.5, d);
      c.target.y = amortecer(c.target.y, v.alvo.y, 3.5, d);
      c.target.z = amortecer(c.target.z, v.alvo.z, 3.5, d);
      if (camera.position.distanceTo(v.pos) < 0.05 && c.target.distanceTo(v.alvo) < 0.05) voo.current = null;
    }
    c.update();
  });
  return null;
}

function Relogio({ sim }: { sim: Simulacao }) {
  useFrame((_, d) => sim.passo(d));
  return null;
}

// ---------- raiz ----------
export default function AlmoxarifadoCena(props: PropsAlmoxarifado & PropsCena) {
  const { sim, setor, selecionado, aoSetor, aoFalhar } = props;
  const cores = useTokens(MAPA, PADRAO);
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ fov: 40, near: 0.5, far: 400, position: [14, 46, 64] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.dica.current && (props.dica.current.style.display = 'none')}
    >
      <color attach="background" args={['#070a14']} />
      <fog attach="fog" args={['#070a14', 90, 190]} />
      <hemisphereLight args={['#c7d2fe', '#1e293b', 0.9]} />
      <directionalLight
        position={[24, 40, 30]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
      <AmbienteEstudio intensidade={0.3} />
      <Predio cores={cores} setor={setor} aoSetor={aoSetor} />
      <Estantes cores={cores} />
      <Paletes {...props} cores={cores} />
      <Conferencia sim={sim} />
      <Separacao sim={sim} />
      <Esteira sim={sim} />
      <Caminhao c={sim.receb} faixa="#0284c7" />
      <Caminhao c={sim.exped} faixa="#16a34a" />
      {sim.empilhadeiras.map((e) => (
        <Empilhadeira key={e.id} e={e} cor={e.papel === 'recebimento' ? '#38bdf8' : '#facc15'} />
      ))}
      <Camera setor={setor} selecionado={selecionado} sim={sim} semVoo={props.movimentoReduzido} />
      <Relogio sim={sim} />
      <PausaAutomatica />
      <GuardaContexto aoPerder={aoFalhar} />
    </Canvas>
  );
}
