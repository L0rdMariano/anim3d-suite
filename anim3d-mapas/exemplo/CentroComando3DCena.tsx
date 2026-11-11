// Exemplo anim3d-mapas · Centro de Comando: mapa "sala de controle" com ataques e fluxos de dados.
// Duas projeções sobre os MESMOS dados, simulação, painel e HUD: mapa plano (padrão: o mundo inteiro legível) e globo.
// A simulação (centroComandoSim.ts) decide os eventos; esta cena só os desenha e deixa clicar em países e pontos.
// Estilo: arcos que crescem com cauda apagando, ondas de impacto, arrasto, voo até o alvo e linha de chamada ao painel.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';
import { amortecer, dispositivoFraco, type PropsCena } from '@anim3d/kit';
import { descartar, GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';
import { atmosferaMaterial, latLon, texturaCirculo } from '../../anim3d-saas/exemplo/Globo3DCena';
import { CentroComandoHud, type HudRefs, type Projecao } from './CentroComandoHud';
import { criarCanvasMapa, rotulosPaises } from './mapaMundi';
import { centroidePais, desenharDestaque, paisNoPonto, uvParaLatLon } from './mapaPaises';
import { DATACENTERS, type DataCenter } from './datacenters';
import { infoPais } from './paisesInfo';
import {
  avancar,
  criarSimulacao,
  deltaAngulo,
  estadoDoNo,
  focoParaAngulos,
  NOS,
  vetorLatLon,
  type Evento,
  type Simulacao,
} from './centroComandoSim';

const R = 1.6;
const SLOTS = 28; // arcos simultâneos
const ANEIS = 24; // ondas de impacto simultâneas
const PTS = 56; // vértices por arco
const INICIO = focoParaAngulos(vetorLatLon(6, -45)); // globo: abre sobre as Américas/Atlântico
const ZOOM_GLOBO = [6.4, 5, 3.9]; // distância da câmera por nível de zoom
const ZOOM_PLANO = [1, 0.55, 0.32]; // fração da distância que enquadra o mundo todo
const PW = 8; // mapa plano: largura (360°) e altura (180°) em unidades do mundo
const PH = 4;
const PAINEL_PX = 290; // largura reservada ao painel da direita em palco largo
const PAISES_VISIVEIS = [16, 36, 46]; // rótulos de país por nível de zoom (plano); ordenados do maior ao menor

const COR = {
  fluxo: new Color('#22d3ee'),
  media: new Color('#ffd23f'),
  alta: new Color('#ff8a3d'),
  critica: new Color('#ff3b5c'),
  escudo: new Color('#3ddc97'),
  nucleo: new Color('#9be7ff'),
  mitigado: new Color('#ffb020'),
};
const corDoEvento = (e: Evento) => (e.tipo === 'fluxo' ? COR.fluxo : COR[e.severidade]);
const noRaycast = () => undefined;
const Z = new Vector3(0, 0, 1);
const Y = new Vector3(0, 1, 0);
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Mapa plano (plate carrée): x = longitude, y = latitude. É a mesma textura que o globo usa. */
const xyPlano = (lat: number, lon: number, z = 0.03) => new Vector3((lon / 180) * (PW / 2), (lat / 90) * (PH / 2), z);

interface Slot {
  idx: number;
  geo: BufferGeometry;
  ativo: boolean;
  inicio: number;
  dur: number;
  chegou: boolean;
  ev: Evento | null;
}
interface Anel {
  mesh: Mesh;
  mat: MeshBasicMaterial;
  ativo: boolean;
  inicio: number;
  dur: number;
  escala: number;
}

/** Paralelos e meridianos finos: dá a leitura de "tela de radar" ao globo. */
function gradeGlobo(): BufferGeometry {
  const p: number[] = [];
  const seg = (a: Vector3, b: Vector3) => p.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = 0; lon < 360; lon += 6) seg(latLon(lat, lon, R * 1.001), latLon(lat, lon + 6, R * 1.001));
  for (let lon = 0; lon < 360; lon += 30)
    for (let lat = -80; lat < 80; lat += 5) seg(latLon(lat, lon, R * 1.001), latLon(lat + 5, lon, R * 1.001));
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  return g;
}

function gradePlano(): BufferGeometry {
  const p: number[] = [];
  for (let lat = -60; lat <= 60; lat += 30) p.push(-PW / 2, (lat / 90) * (PH / 2), 0.004, PW / 2, (lat / 90) * (PH / 2), 0.004);
  for (let lon = -150; lon <= 150; lon += 30) p.push((lon / 180) * (PW / 2), -PH / 2, 0.004, (lon / 180) * (PW / 2), PH / 2, 0.004);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  return g;
}

function criarObjetos() {
  const raiz = new Group();
  const matLinha = new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const slots: Slot[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(PTS * 3), 3));
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(PTS * 3), 3));
    geo.setDrawRange(0, 0);
    const linha = new Line(geo, matLinha);
    linha.frustumCulled = false; // posições mudam a cada evento: a esfera de contorno inicial não vale
    raiz.add(linha);
    slots.push({ idx: i, geo, ativo: false, inicio: 0, dur: 2, chegou: false, ev: null });
  }

  const cabGeo = new BufferGeometry();
  cabGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(SLOTS * 3), 3));
  cabGeo.setAttribute('color', new Float32BufferAttribute(new Float32Array(SLOTS * 3), 3));
  const circulo = texturaCirculo();
  const matCab = new PointsMaterial({ size: 0.085, vertexColors: true, map: circulo, alphaTest: 0.4, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const cabecas = new Points(cabGeo, matCab);
  cabecas.frustumCulled = false;
  raiz.add(cabecas);

  const aneisGeo = new RingGeometry(0.026, 0.036, 40);
  const aneis: Anel[] = [];
  for (let i = 0; i < ANEIS; i++) {
    const mat = new MeshBasicMaterial({ transparent: true, opacity: 0, blending: AdditiveBlending, side: DoubleSide, depthWrite: false, toneMapped: false });
    const mesh = new Mesh(aneisGeo, mat);
    mesh.visible = false;
    raiz.add(mesh);
    aneis.push({ mesh, mat, ativo: false, inicio: 0, dur: 1, escala: 4 });
  }

  const matGrade = new LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false });
  const grade = new LineSegments(gradeGlobo(), matGrade);
  const gradeP = new LineSegments(gradePlano(), matGrade);

  const matAnel = new MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const orbita1 = new Mesh(new TorusGeometry(R * 1.2, 0.0035, 6, 180), matAnel);
  const orbita2 = new Mesh(new TorusGeometry(R * 1.34, 0.0025, 6, 180), matAnel);
  orbita1.rotation.set(1.25, 0.2, 0);
  orbita2.rotation.set(1.9, -0.4, 0);
  const orbitas = new Group();
  orbitas.add(orbita1, orbita2);

  const posNos: Record<string, Vector3> = {};
  const posNosP: Record<string, Vector3> = {};
  const foco: Record<string, { pitch: number; yaw: number }> = {};
  for (const n of NOS) {
    posNos[n.id] = latLon(n.lat, n.lon, R * 1.004);
    posNosP[n.id] = xyPlano(n.lat, n.lon);
    foco[n.id] = focoParaAngulos(vetorLatLon(n.lat, n.lon));
  }
  const mapa = new CanvasTexture(dispositivoFraco() ? criarCanvasMapa(2048, 1024) : criarCanvasMapa());
  mapa.colorSpace = SRGBColorSpace;
  mapa.anisotropy = 8;
  const destaqueCanvas = document.createElement('canvas');
  destaqueCanvas.width = 2048;
  destaqueCanvas.height = 1024;
  const destaque = new CanvasTexture(destaqueCanvas);
  destaque.colorSpace = SRGBColorSpace;
  // camada de data centers: um Points por projeção (mesmos itens), quadrados que acendem no país selecionado
  const dcPontos = (pos: (d: DataCenter) => Vector3) => {
    const p = new Float32Array(DATACENTERS.length * 3);
    DATACENTERS.forEach((d, i) => p.set(pos(d).toArray(), i * 3));
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(DATACENTERS.length * 3), 3));
    return g;
  };
  const dcGeoGlobo = dcPontos((d) => latLon(d.lat, d.lon, R * 1.004));
  const dcGeoPlano = dcPontos((d) => xyPlano(d.lat, d.lon, 0.025));
  const matDc = new PointsMaterial({ size: 0.075, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false, toneMapped: false });
  const dcGlobo = new Points(dcGeoGlobo, matDc);
  const dcPlano = new Points(dcGeoPlano, matDc);
  dcGlobo.frustumCulled = false;
  dcPlano.frustumCulled = false;
  const dcPos = Object.fromEntries(DATACENTERS.map((d) => [d.id, latLon(d.lat, d.lon, R * 1.004)]));
  const dcPosP = Object.fromEntries(DATACENTERS.map((d) => [d.id, xyPlano(d.lat, d.lon, 0.025)]));
  const paises = rotulosPaises();
  return {
    dcGeoGlobo, dcGeoPlano, matDc, dcGlobo, dcPlano, dcPos, dcPosP,
    raiz, slots, aneis, cabGeo, circulo, matCab, matLinha, matGrade, matAnel,
    grade, gradeP, orbitas, posNos, posNosP, foco, mapa, destaque, destaqueCanvas,
    posPaises: paises.map((p) => latLon(p.lat, p.lon, R * 1.002)),
    posPaisesP: paises.map((p) => xyPlano(p.lat, p.lon, 0.01)),
    paisesNomes: paises.map((p) => p.nome),
    atmosfera: atmosferaMaterial(),
  };
}
type Objetos = ReturnType<typeof criarObjetos>;

function liberar(o: Objetos) {
  descartar(o.raiz);
  descartar(o.orbitas);
  descartar(o.grade);
  descartar(o.gradeP);
  o.cabGeo.dispose();
  o.matCab.dispose();
  o.matLinha.dispose();
  o.matGrade.dispose();
  o.matAnel.dispose();
  for (const a of o.aneis) a.mat.dispose();
  o.circulo.dispose();
  o.mapa.dispose();
  o.destaque.dispose();
  o.atmosfera.dispose();
  o.dcGeoGlobo.dispose();
  o.dcGeoPlano.dispose();
  o.matDc.dispose();
}

/** Pinta os data centers: os do país selecionado em branco brilhante, os demais em violeta discreto. */
function colorirDcs(o: Objetos, alfa3: string | null) {
  for (const g of [o.dcGeoGlobo, o.dcGeoPlano]) {
    const c = g.getAttribute('color') as Float32BufferAttribute;
    DATACENTERS.forEach((d, i) => {
      if (alfa3 && d.pais === alfa3) c.setXYZ(i, 1.4, 1.4, 1.4);
      else c.setXYZ(i, alfa3 ? 0.35 : 0.7, alfa3 ? 0.3 : 0.62, alfa3 ? 0.6 : 1.1);
    });
    c.needsUpdate = true;
  }
}

/** Ao trocar de projeção os arcos em voo não valem mais (as coordenadas mudam): zera os pools. */
function reiniciarPools(o: Objetos) {
  for (const s of o.slots) {
    s.ativo = false;
    s.geo.setDrawRange(0, 0);
  }
  for (const a of o.aneis) {
    a.ativo = false;
    a.mesh.visible = false;
  }
  const cor = o.cabGeo.getAttribute('color') as Float32BufferAttribute;
  for (let i = 0; i < SLOTS; i++) cor.setXYZ(i, 0, 0, 0);
  cor.needsUpdate = true;
}

// vetores temporários: nenhum objeto novo por quadro
const tA = new Vector3();
const tB = new Vector3();
const tC = new Vector3();
const tCor = new Color();

function lancarArco(o: Objetos, ev: Evento, t: number, reduzido: boolean, plano: boolean) {
  let slot = o.slots.find((s) => !s.ativo);
  if (!slot) slot = o.slots.reduce((a, b) => (a.inicio <= b.inicio ? a : b)); // recicla o mais antigo
  slot.ativo = true;
  slot.inicio = t;
  slot.chegou = false;
  slot.ev = ev;
  slot.dur = reduzido ? 3 : ev.tipo === 'ataque' ? 1.4 + (ev.id % 7) * 0.12 : 2.4 + (ev.id % 5) * 0.25;

  const pos = slot.geo.getAttribute('position') as Float32BufferAttribute;
  const cor = slot.geo.getAttribute('color') as Float32BufferAttribute;
  const base = corDoEvento(ev);
  const pa = plano ? o.posNosP[ev.origem] : o.posNos[ev.origem];
  const pb = tB.copy(plano ? o.posNosP[ev.destino] : o.posNos[ev.destino]);
  if (plano) {
    // plano: o arco vai DIRETO de um ponto ao outro, sempre visível de ponta a ponta. Não "dê a volta" pela borda
    // (caminho curto da esfera): o arco some num lado do mapa e reaparece no outro, e ninguém entende.
    const distancia = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    tC.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + distancia * (ev.tipo === 'ataque' ? 0.3 : 0.2) + 0.1, 0.03);
  } else {
    const altura = pa.distanceTo(pb) * (ev.tipo === 'ataque' ? 0.46 : 0.3);
    tC.copy(pa).add(pb).multiplyScalar(0.5).normalize().multiplyScalar(R + altura);
  }
  for (let i = 0; i < PTS; i++) {
    const u = i / (PTS - 1);
    const a = (1 - u) * (1 - u);
    const b = 2 * u * (1 - u);
    const c = u * u;
    pos.setXYZ(i, a * pa.x + b * tC.x + c * pb.x, a * pa.y + b * tC.y + c * pb.y, a * pa.z + b * tC.z + c * pb.z);
    const brilho = Math.pow(u, 1.5) * 1.15 + 0.05; // cauda apagada, ponta acesa
    cor.setXYZ(i, base.r * brilho, base.g * brilho, base.b * brilho);
  }
  pos.needsUpdate = true;
  cor.needsUpdate = true;
}

function lancarAnel(o: Objetos, ev: Evento, t: number, plano: boolean) {
  let a = o.aneis.find((r) => !r.ativo);
  if (!a) a = o.aneis.reduce((x, y) => (x.inicio <= y.inicio ? x : y));
  a.ativo = true;
  a.inicio = t;
  const impacto = ev.tipo === 'ataque';
  a.dur = impacto ? (ev.bloqueado ? 0.9 : 1.5) : 1.1;
  a.escala = impacto ? (ev.severidade === 'critica' && !ev.bloqueado ? 7 : 4.2) : 2.6;
  a.mat.color.copy(ev.tipo === 'fluxo' ? COR.fluxo : ev.bloqueado ? COR.escudo : COR[ev.severidade]);
  if (plano) {
    a.mesh.position.copy(o.posNosP[ev.destino]);
    a.mesh.quaternion.identity();
  } else {
    const p = o.posNos[ev.destino];
    a.mesh.position.copy(p).multiplyScalar(1.001);
    a.mesh.quaternion.setFromUnitVectors(Z, tA.copy(p).normalize());
  }
  a.mesh.visible = true;
}

/** Passos 3 e 4 do quadro: avança arcos, cabeças e ondas de impacto (igual nas duas projeções). */
function animarPools(o: Objetos, sim: Simulacao, reduzido: boolean, plano: boolean) {
  const pos = o.cabGeo.getAttribute('position') as Float32BufferAttribute;
  const corCab = o.cabGeo.getAttribute('color') as Float32BufferAttribute;
  for (let i = 0; i < SLOTS; i++) {
    const sl = o.slots[i];
    if (!sl.ativo || !sl.ev) {
      corCab.setXYZ(i, 0, 0, 0);
      continue;
    }
    const p = (sim.t - sl.inicio) / sl.dur;
    if (p >= 1.45) {
      sl.ativo = false;
      sl.geo.setDrawRange(0, 0);
      corCab.setXYZ(i, 0, 0, 0);
      continue;
    }
    const pv = reduzido ? 0.85 : p;
    const cabeca = Math.min(pv, 1);
    const cauda = Math.min(Math.max(pv - 0.45, 0), 1);
    const i0 = Math.floor(cauda * (PTS - 1));
    const i1 = Math.floor(cabeca * (PTS - 1)) + 1;
    sl.geo.setDrawRange(i0, Math.max(0, i1 - i0));
    if (!reduzido && p < 1.02) {
      const gp = sl.geo.getAttribute('position') as Float32BufferAttribute;
      pos.setXYZ(i, gp.getX(i1 - 1), gp.getY(i1 - 1), gp.getZ(i1 - 1));
      tCor.copy(corDoEvento(sl.ev)).multiplyScalar(1.7);
      corCab.setXYZ(i, tCor.r, tCor.g, tCor.b);
    } else corCab.setXYZ(i, 0, 0, 0);
    if (!sl.chegou && (reduzido ? p > 0.02 : p >= 1)) {
      sl.chegou = true;
      lancarAnel(o, sl.ev, sim.t, plano);
    }
  }
  pos.needsUpdate = true;
  corCab.needsUpdate = true;

  for (const a of o.aneis) {
    if (!a.ativo) continue;
    const f = (sim.t - a.inicio) / a.dur;
    if (f >= 1) {
      a.ativo = false;
      a.mesh.visible = false;
      continue;
    }
    a.mesh.scale.setScalar(reduzido ? a.escala * 0.5 : 1 + f * (a.escala - 1));
    a.mat.opacity = (1 - f) * (1 - f);
  }
}

interface PropsMapa {
  o: Objetos;
  sim: Simulacao;
  plano: boolean;
  selecionado: string | null;
  aoSelecionar: (id: string | null) => void;
  pais: string | null;
  aoPais: (id: string | null) => void;
  reduzido: boolean;
  /** 0 = qualidade total; sobe quando o FPS cai (corta custo, nunca para a animação). */
  nivel: number;
  hud: HudRefs;
  zoom: number;
  /** Mostra a camada de data centers. */
  dcAtivo: boolean;
}

function Mapa({ o, sim, plano, selecionado, aoSelecionar, pais, aoPais, reduzido, nivel, hud, zoom, dcAtivo }: PropsMapa) {
  const { gl, camera, size, get } = useThree();
  const deslocar = useRef<Group>(null);
  const grupo = useRef<Group>(null);
  const hoverRef = useRef<string | null>(null);
  const hoverPais = useRef<string | null>(null);
  const paisRef = useRef<string | null>(pais);
  paisRef.current = pais;
  const pintarDestaque = useCallback(() => {
    const c = o.destaqueCanvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    desenharDestaque(ctx, c.width, c.height, paisRef.current, hoverPais.current);
    o.destaque.needsUpdate = true;
  }, [o]);
  useEffect(pintarDestaque, [pais, pintarDestaque]);

  // alvo do país selecionado: voo (globo) ou centralização (plano) e âncora da linha de chamada
  const alvoPais = useMemo(() => {
    const c = pais ? centroidePais(pais) : null;
    if (!c) return null;
    return {
      foco: focoParaAngulos(vetorLatLon(c.lat, c.lon)),
      ancora: latLon(c.lat, c.lon, R * 1.003),
      ancoraP: xyPlano(c.lat, c.lon, 0.01),
    };
  }, [pais]);
  const algumSel = !!selecionado || !!alvoPais;
  const dcSel = useRef<DataCenter[]>([]);
  const est = useRef({ yaw: INICIO.yaw, pitch: INICIO.pitch, vy: 0, arrastando: false, ocioso: 0, seguir: true, rotuloId: '', quadro: 0, cx: 0, cy: 0 });

  // país selecionado: acende os data centers dele e liga os rótulos de cidade
  useEffect(() => {
    const alfa3 = pais ? (infoPais(pais)?.g ?? null) : null;
    colorirDcs(o, alfa3);
    const lista = alfa3 ? DATACENTERS.filter((d) => d.pais === alfa3) : [];
    dcSel.current = lista;
    const el = hud.dcs.current;
    if (el)
      for (let i = 0; i < el.children.length; i++) {
        const k = el.children[i] as HTMLElement;
        k.textContent = i < lista.length ? lista[i].cidade : '';
        if (i >= lista.length) k.style.opacity = '0';
      }
  }, [o, pais, hud.dcs]);

  // nova projeção: zera os pools e leva a câmera ao enquadramento certo
  useEffect(() => {
    reiniciarPools(o);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 0, plano ? 8 : ZOOM_GLOBO[0]);
  }, [o, plano, camera]);

  useEffect(() => {
    est.current.seguir = true;
    est.current.ocioso = 0;
  }, [selecionado, pais]);

  // arrastar: gira o globo ou desliza o mapa plano (cliques curtos passam para países e pontos via e.delta do R3F)
  useEffect(() => {
    const el = gl.domElement;
    let ultimo: { x: number; y: number } | null = null;
    const s = est.current;
    const baixo = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      s.arrastando = true;
      s.ocioso = 0;
      ultimo = { x: e.clientX, y: e.clientY };
    };
    const mover = (e: PointerEvent) => {
      if (!s.arrastando || !ultimo) return;
      const dx = e.clientX - ultimo.x;
      const dy = e.clientY - ultimo.y;
      ultimo = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) + Math.abs(dy) > 0) s.seguir = false;
      if (plano) {
        const { camera: cam, size: tam } = get();
        const porPixel = (2 * cam.position.z * Math.tan(((cam as PerspectiveCamera).fov * Math.PI) / 360)) / tam.height;
        s.cx -= dx * porPixel;
        s.cy += dy * porPixel;
      } else {
        s.yaw += dx * 0.0055;
        s.pitch = limitar(s.pitch + dy * 0.0055, -1.2, 1.2);
        s.vy = dx * 0.0055;
      }
    };
    const cima = () => {
      s.arrastando = false;
      ultimo = null;
    };
    el.addEventListener('pointerdown', baixo);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', cima);
    window.addEventListener('pointercancel', cima);
    return () => {
      el.removeEventListener('pointerdown', baixo);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', cima);
      window.removeEventListener('pointercancel', cima);
    };
  }, [gl, get, plano]);

  // projeção de um ponto do mapa para pixels do contêiner (null se estiver atrás do globo)
  const projetar = (ponto: Vector3): { x: number; y: number; f: number } | null => {
    const g = grupo.current;
    if (!g) return null;
    if (plano) {
      tA.copy(ponto).project(camera);
      return { x: (tA.x * 0.5 + 0.5) * size.width, y: (-tA.y * 0.5 + 0.5) * size.height, f: 1 };
    }
    g.localToWorld(tA.copy(ponto));
    g.getWorldPosition(tB);
    tC.copy(camera.position).sub(tB);
    const dist = tC.length();
    const frente = ((tA.x - tB.x) * tC.x + (tA.y - tB.y) * tC.y + (tA.z - tB.z) * tC.z) / (dist * R * 1.004);
    const horizonte = (R / dist) * 1.02;
    if (frente < horizonte) return null; // atrás do horizonte do globo
    tA.project(camera);
    return { x: (tA.x * 0.5 + 0.5) * size.width, y: (-tA.y * 0.5 + 0.5) * size.height, f: Math.min(1, (frente - horizonte) / 0.35) };
  };

  useFrame((_, delta) => {
    const g = grupo.current;
    const d = deslocar.current;
    if (!g || !d) return;
    const dt = Math.min(delta, 0.1);
    const s = est.current;
    const t0 = sim.t;
    const rapido = reduzido ? 30 : 3;
    const cam = camera as PerspectiveCamera;

    // 1) simulação → novos arcos
    for (const ev of avancar(sim, dt)) lancarArco(o, ev, t0, reduzido, plano);

    // 2) câmera e movimento
    s.ocioso += dt;
    const largo = size.width / size.height > 1.25;
    if (plano) {
      // enquadra o mundo todo na área livre (sem o painel); zoom e seleção aproximam e centralizam
      const tg = Math.tan((cam.fov * Math.PI) / 360);
      const aspecto = size.width / size.height;
      const livre = largo ? Math.max(0.5, 1 - PAINEL_PX / size.width) : 1;
      const d0 = Math.max((PW * 1.04) / (2 * tg * aspecto * livre), (PH * 1.12) / (2 * tg));
      const nz = algumSel ? Math.max(zoom, 1) : zoom;
      cam.position.z = amortecer(cam.position.z, d0 * ZOOM_PLANO[nz], rapido, dt);
      const vh = 2 * cam.position.z * tg;
      const vw = vh * aspecto;
      const larguraLivre = vw * livre;
      if (selecionado && s.seguir) {
        s.cx = o.posNosP[selecionado].x;
        s.cy = o.posNosP[selecionado].y;
      } else if (alvoPais && s.seguir) {
        s.cx = alvoPais.ancoraP.x;
        s.cy = alvoPais.ancoraP.y;
      }
      const limX = Math.max(0, PW / 2 - larguraLivre / 2);
      const limY = Math.max(0, PH / 2 - vh / 2);
      s.cx = limitar(s.cx, -limX, limX);
      s.cy = limitar(s.cy, -limY, limY);
      cam.position.x = amortecer(cam.position.x, s.cx + (vw - larguraLivre) / 2, rapido, dt);
      // celular em pé: o painel é uma gaveta embaixo, então o mapa sobe (centro em ~36% da altura)
      const subir = largo ? 0 : vh * 0.14;
      cam.position.y = amortecer(cam.position.y, s.cy - subir, rapido, dt);
      d.position.x = 0;
    } else {
      // arrasto > voo até o alvo selecionado > rotação lenta ociosa
      const alvo = selecionado ? o.foco[selecionado] : (alvoPais?.foco ?? null);
      if (!s.arrastando) {
        if (alvo && s.seguir) {
          s.yaw += deltaAngulo(s.yaw, alvo.yaw) * (1 - Math.exp(-(reduzido ? 30 : 3.4) * dt));
          s.pitch = amortecer(s.pitch, alvo.pitch, reduzido ? 30 : 3.4, dt);
          s.vy = 0;
        } else if (Math.abs(s.vy) > 1e-4) {
          s.yaw += s.vy;
          s.vy *= 0.93;
        } else if (!reduzido && !algumSel && s.ocioso > 3) {
          s.yaw += dt * 0.07;
          s.pitch = amortecer(s.pitch, INICIO.pitch, 1.2, dt);
        }
      }
      g.rotation.set(s.pitch, s.yaw, 0);
      // com o painel aberto (palco largo) o globo desliza para a esquerda
      d.position.x = amortecer(d.position.x, largo ? -0.95 : 0, rapido, dt);
      cam.position.z = amortecer(cam.position.z, algumSel ? Math.min(ZOOM_GLOBO[zoom], 5.6) : ZOOM_GLOBO[zoom], rapido, dt);
      cam.position.x = 0;
      cam.position.y = 0;
      o.orbitas.visible = nivel < 2;
      if (!reduzido && nivel < 2) {
        o.orbitas.children[0].rotation.z += dt * 0.12;
        o.orbitas.children[1].rotation.z -= dt * 0.08;
      }
    }
    o.dcPlano.visible = plano && dcAtivo;
    o.dcGlobo.visible = !plano && dcAtivo;
    o.grade.visible = !plano && nivel < 2;
    o.gradeP.visible = plano && nivel < 2;
    d.updateMatrixWorld(true);
    cam.updateMatrixWorld();

    // 3) arcos, cabeças e ondas de impacto
    animarPools(o, sim, reduzido, plano);

    // 4) sobreposições HTML presas ao mapa (sem re-render do React)
    s.quadro++;
    const lista = s.quadro % (nivel >= 2 ? 3 : nivel >= 1 ? 2 : 1) === 0 ? hud.paises.current?.children : undefined;
    if (lista) {
      const nPaises = o.paisesNomes.length;
      const visiveis = plano ? PAISES_VISIVEIS[zoom] : nPaises;
      const posP = plano ? o.posPaisesP : o.posPaises;
      const posN = plano ? o.posNosP : o.posNos;
      for (let i = 0; i < lista.length; i++) {
        const el = lista[i] as HTMLElement;
        if (i < nPaises && i >= visiveis) {
          el.style.opacity = '0';
          continue;
        }
        const pt = projetar(i < nPaises ? posP[i] : posN[NOS[i - nPaises].id]);
        if (!pt) {
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = String(plano ? (i < nPaises ? 0.78 : 1) : i < nPaises ? 0.15 + 0.6 * pt.f : 0.35 + 0.65 * pt.f);
        el.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) translate(-50%, ${i < nPaises ? '-50%' : '8px'})`;
      }
    }
    const kidsDc = s.quadro % (nivel >= 2 ? 3 : nivel >= 1 ? 2 : 1) === 0 ? hud.dcs.current?.children : undefined;
    if (kidsDc) {
      const sel = dcSel.current;
      for (let i = 0; i < kidsDc.length; i++) {
        const el = kidsDc[i] as HTMLElement;
        const pt = i < sel.length && dcAtivo ? projetar((plano ? o.dcPosP : o.dcPos)[sel[i].id]) : null;
        if (!pt) {
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = String(plano ? 1 : 0.35 + 0.65 * pt.f);
        el.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) translate(-50%, 7px)`;
      }
    }
    const posNos = plano ? o.posNosP : o.posNos;
    const rotulo = hud.rotulo.current;
    if (rotulo) {
      const id = hoverRef.current;
      const pt = id ? projetar(posNos[id]) : null;
      if (!id || !pt) rotulo.style.opacity = '0';
      else {
        if (s.rotuloId !== id) {
          rotulo.textContent = NOS.find((n) => n.id === id)?.nome ?? '';
          s.rotuloId = id;
        }
        rotulo.style.opacity = '1';
        rotulo.style.transform = `translate(${pt.x + 14}px, ${pt.y - 28}px)`;
      }
    }
    const caminho = hud.linha.current;
    const ponto = hud.ponto.current;
    if (caminho && ponto) {
      const ancora = selecionado ? posNos[selecionado] : alvoPais ? (plano ? alvoPais.ancoraP : alvoPais.ancora) : null;
      const pt = ancora ? projetar(ancora) : null;
      const painel = hud.painel.current;
      const raiz = hud.raiz.current;
      if (!pt || !painel || !raiz) {
        caminho.style.opacity = '0';
        ponto.style.opacity = '0';
      } else {
        const rr = raiz.getBoundingClientRect();
        const pr = painel.getBoundingClientRect();
        const embaixo = pr.width > rr.width * 0.6;
        const x2 = embaixo ? pr.left - rr.left + pr.width / 2 : pr.left - rr.left;
        const y2 = embaixo ? pr.top - rr.top : pr.top - rr.top + 30;
        const meio = embaixo ? `${pt.x} ${y2 - 18}` : `${x2 - 36} ${y2}`;
        caminho.setAttribute('d', `M${pt.x} ${pt.y} L${meio} L${x2} ${y2}`);
        caminho.style.opacity = '1';
        ponto.setAttribute('cx', String(pt.x));
        ponto.setAttribute('cy', String(pt.y));
        ponto.style.opacity = '1';
      }
    }
  });

  const aoHover = (id: string | null) => {
    hoverRef.current = id;
    if (id && hoverPais.current) {
      hoverPais.current = null;
      pintarDestaque();
    }
    gl.domElement.style.cursor = id ? 'pointer' : '';
  };

  // clique e hover por país: iguais nas duas projeções (o uv da malha vira latitude/longitude)
  const aoClicarCorpo = (e: { stopPropagation: () => void; delta: number; uv?: { x: number; y: number } }) => {
    e.stopPropagation();
    if (e.delta > 6 || !e.uv) return; // foi um arrasto, não um clique
    const { lat, lon } = uvParaLatLon(e.uv.x, e.uv.y);
    const id = paisNoPonto(lat, lon)?.id ?? null;
    aoPais(id && id !== pais ? id : null);
  };
  const aoMoverCorpo = (e: { stopPropagation: () => void; uv?: { x: number; y: number } }) => {
    e.stopPropagation();
    if (!e.uv) return;
    const { lat, lon } = uvParaLatLon(e.uv.x, e.uv.y);
    const id = paisNoPonto(lat, lon)?.id ?? null;
    if (id === hoverPais.current) return;
    hoverPais.current = id;
    pintarDestaque();
    gl.domElement.style.cursor = id ? 'pointer' : '';
  };
  const aoSairCorpo = () => {
    if (!hoverPais.current) return;
    hoverPais.current = null;
    pintarDestaque();
    gl.domElement.style.cursor = '';
  };

  return (
    <group ref={deslocar}>
      <group ref={grupo} rotation={plano ? [0, 0, 0] : [INICIO.pitch, INICIO.yaw, 0]}>
        {plano ? (
          <>
            <mesh onClick={aoClicarCorpo} onPointerMove={aoMoverCorpo} onPointerOut={aoSairCorpo}>
              <planeGeometry args={[PW, PH]} />
              <meshBasicMaterial map={o.mapa} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.002]} raycast={noRaycast}>
              <planeGeometry args={[PW, PH]} />
              <meshBasicMaterial map={o.destaque} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </mesh>
            <primitive object={o.gradeP} />
          </>
        ) : (
          <>
            {/* corpo: bloqueia cliques e hover nos pontos do outro lado do globo */}
            <mesh onClick={aoClicarCorpo} onPointerMove={aoMoverCorpo} onPointerOut={aoSairCorpo}>
              <sphereGeometry args={[R * 0.985, 48, 48]} />
              <meshBasicMaterial map={o.mapa} toneMapped={false} />
            </mesh>
            {/* destaque do país sob o mouse e do selecionado (textura transparente por cima do mapa) */}
            <mesh raycast={noRaycast}>
              <sphereGeometry args={[R * 0.9865, 48, 48]} />
              <meshBasicMaterial map={o.destaque} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </mesh>
            <primitive object={o.grade} />
          </>
        )}
        <primitive object={plano ? o.dcPlano : o.dcGlobo} />
        <primitive object={o.raiz} />
        {NOS.map((n) => (
          <Marcador
            key={n.id}
            id={n.id}
            pos={plano ? o.posNosP[n.id] : o.posNos[n.id]}
            plano={plano}
            sim={sim}
            selecionado={selecionado}
            hoverRef={hoverRef}
            aoHover={aoHover}
            aoSelecionar={aoSelecionar}
            reduzido={reduzido}
          />
        ))}
      </group>
      {!plano && (
        <>
          <primitive object={o.orbitas} />
          <mesh scale={1.1} material={o.atmosfera} raycast={noRaycast}>
            <sphereGeometry args={[R, 64, 64]} />
          </mesh>
        </>
      )}
    </group>
  );
}

interface PropsMarcador {
  id: string;
  pos: Vector3;
  plano: boolean;
  sim: Simulacao;
  selecionado: string | null;
  hoverRef: { current: string | null };
  aoHover: (id: string | null) => void;
  aoSelecionar: (id: string | null) => void;
  reduzido: boolean;
}

/** Ponto clicável: núcleo que muda de cor com o estado, anel de hover/seleção e feixe nos alvos sob ataque (globo). */
function Marcador({ id, pos, plano, sim, selecionado, hoverRef, aoHover, aoSelecionar, reduzido }: PropsMarcador) {
  const normal = useMemo(() => (plano ? Z.clone() : pos.clone().normalize()), [pos, plano]);
  const qFace = useMemo(() => new Quaternion().setFromUnitVectors(Z, normal), [normal]);
  const qFeixe = useMemo(() => new Quaternion().setFromUnitVectors(Y, normal), [normal]);
  const posFeixe = useMemo(() => normal.clone().multiplyScalar(R + 0.2), [normal]);
  const raiz = useRef<Group>(null);
  const nucleo = useRef<MeshBasicMaterial>(null);
  const nucleoMalha = useRef<Mesh>(null);
  const anel = useRef<Mesh>(null);
  const anelMat = useRef<MeshBasicMaterial>(null);
  const feixe = useRef<Mesh>(null);
  const feixeMat = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const estado = estadoDoNo(sim, id);
    const ativo = selecionado === id;
    const hover = hoverRef.current === id;
    const pulso = reduzido ? 1 : 0.75 + 0.25 * Math.sin(t * 7);
    // no plano o tamanho acompanha a distância da câmera: o ponto mantém o mesmo tamanho em pixels ao dar zoom
    if (raiz.current) raiz.current.scale.setScalar(plano ? camera.position.z / 6.4 : 1);
    const cor = estado === 'sob-ataque' ? COR.critica : estado === 'mitigado' ? COR.mitigado : COR.nucleo;
    nucleo.current?.color.copy(cor);
    nucleoMalha.current?.scale.setScalar((estado === 'sob-ataque' ? 1.5 * pulso : 1) * (ativo || hover ? 1.35 : 1));
    if (anel.current && anelMat.current) {
      anel.current.visible = ativo || hover || (plano && estado === 'sob-ataque');
      anel.current.scale.setScalar(ativo ? 1.15 + (reduzido ? 0 : 0.15 * Math.sin(t * 4)) : estado === 'sob-ataque' ? 0.95 + 0.25 * pulso : 0.95);
      if (!reduzido) anel.current.rotation.z = t * 0.9;
      anelMat.current.color.copy(ativo ? COR.fluxo : estado === 'sob-ataque' ? COR.critica : COR.nucleo);
    }
    if (feixe.current && feixeMat.current) {
      feixe.current.visible = !plano && (ativo || estado === 'sob-ataque');
      feixeMat.current.color.copy(estado === 'sob-ataque' ? COR.critica : COR.fluxo);
      feixeMat.current.opacity = reduzido ? 0.7 : 0.45 + 0.35 * pulso;
    }
  });

  return (
    <>
      <group ref={raiz} position={pos} quaternion={qFace}>
        <mesh ref={nucleoMalha}>
          <circleGeometry args={[0.02, 16]} />
          <meshBasicMaterial ref={nucleo} color="#9be7ff" toneMapped={false} />
        </mesh>
        <mesh ref={anel} visible={false}>
          <ringGeometry args={[0.04, 0.047, 4, 1]} />
          <meshBasicMaterial ref={anelMat} color="#22d3ee" side={DoubleSide} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* área de clique maior que o ponto: alvo fácil de acertar, inclusive no toque */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return; // foi um arrasto, não um clique
            aoSelecionar(selecionado === id ? null : id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            aoHover(id);
          }}
          onPointerOut={() => hoverRef.current === id && aoHover(null)}
        >
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={feixe} position={posFeixe} quaternion={qFeixe} visible={false} raycast={noRaycast}>
        <cylinderGeometry args={[0.004, 0.004, 0.4, 6, 1, true]} />
        <meshBasicMaterial ref={feixeMat} color="#22d3ee" transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function CentroComando3DCena({
  aoFalhar,
  movimentoReduzido,
  aoAbrirBrasil,
  projecaoInicial = 'plano',
}: PropsCena & { aoAbrirBrasil?: () => void; projecaoInicial?: Projecao }) {
  const [nivel, setNivel] = useState(0);
  const [projecao, setProjecao] = useState<Projecao>(projecaoInicial);
  // um item selecionado por vez: ponto da rede OU país
  const [selecionado, setNo] = useState<string | null>(null);
  const [pais, setPais] = useState<string | null>(null);
  const setSelecionado = useCallback((id: string | null) => {
    setNo(id);
    if (id) setPais(null);
  }, []);
  const selecionarPais = useCallback((id: string | null) => {
    setPais(id);
    if (id) setNo(null);
  }, []);
  const limpar = useCallback(() => {
    setNo(null);
    setPais(null);
  }, []);
  const [zoom, setZoom] = useState(0);
  const [dcAtivo, setDcAtivo] = useState(true);
  const [, setPulso] = useState(0);
  const [sim] = useState(() => criarSimulacao(7, movimentoReduzido ? 0.35 : 1));
  const o = useMemo(criarObjetos, []);
  // os recursos de GPU vivem enquanto a cena existe (trocar de projeção não os descarta)
  useEffect(() => () => liberar(o), [o]);
  // "reduzido" é só a preferência do usuário. FPS baixo reduz o custo visual (nivel), mas a animação continua.

  const hud: HudRefs = {
    raiz: useRef<HTMLDivElement>(null),
    painel: useRef<HTMLElement>(null),
    linha: useRef<SVGPathElement>(null),
    ponto: useRef<SVGCircleElement>(null),
    rotulo: useRef<HTMLDivElement>(null),
    paises: useRef<HTMLDivElement>(null),
    dcs: useRef<HTMLDivElement>(null),
  };

  // O HUD (números, feed, painel) atualiza ~3x/s; o 3D roda a 60 fps sem passar pelo React.
  useEffect(() => {
    const i = setInterval(() => setPulso((n) => n + 1), 350);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!selecionado && !pais) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && limpar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [selecionado, pais, limpar]);

  return (
    <div ref={hud.raiz} className="cc-raiz" data-projecao={projecao}>
      <Canvas
        frameloop="always"
        dpr={nivel >= 2 ? 0.75 : nivel >= 1 ? 1 : [1, 2]}
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        style={{ touchAction: 'pan-y' }}
        onPointerMissed={limpar}
      >
        <Mapa
          key={projecao}
          o={o}
          sim={sim}
          plano={projecao === 'plano'}
          selecionado={selecionado}
          aoSelecionar={setSelecionado}
          pais={pais}
          aoPais={selecionarPais}
          reduzido={movimentoReduzido}
          nivel={nivel}
          hud={hud}
          zoom={zoom}
          dcAtivo={dcAtivo}
        />
        <PausaAutomatica />
        {/* ferramenta: alvo de 24 fps e nunca cai para o poster por FPS (só por perda de contexto WebGL ou erro) */}
        <MonitorQualidade alvo={24} maxNivel={3} aoMudar={setNivel} />
        <GuardaContexto aoPerder={aoFalhar} />
      </Canvas>
      <CentroComandoHud
        sim={sim}
        selecionado={selecionado}
        aoSelecionar={setSelecionado}
        pais={pais}
        aoPais={selecionarPais}
        aoAbrirBrasil={aoAbrirBrasil}
        refs={hud}
        zoom={zoom}
        aoZoom={setZoom}
        paises={o.paisesNomes}
        projecao={projecao}
        aoProjecao={setProjecao}
        dcAtivo={dcAtivo}
        aoDcAtivo={setDcAtivo}
      />
    </div>
  );
}
