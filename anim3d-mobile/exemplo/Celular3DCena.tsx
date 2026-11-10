// Exemplo anim3d-mobile · Celular 3D: corpo reflexivo (ambiente de estúdio), tela de app desenhada
// em canvas e atualizada a ~24 fps, cartões de notificação flutuando. Inclinação ≤ 8° só com mouse.
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasTexture, Color, ExtrudeGeometry, Group, PlaneGeometry, Shape, ShapeGeometry, SRGBColorSpace } from 'three';
import { amortecer, entradaPorToque, useTokens, type PropsCena } from '@anim3d/kit';
import { AmbienteEstudio, GuardaContexto, MonitorQualidade, PausaAutomatica } from '@anim3d/kit/cena';

const MAPA = { primaria: '--cor-primaria', destaque: '--cor-destaque', sucesso: '--cor-sucesso' };
const PADRAO = { primaria: '#818cf8', destaque: '#fb923c', sucesso: '#4ade80' };
type Cores = typeof PADRAO;
const INCLINACAO_MAX = (8 * Math.PI) / 180;
const W = 1.5, H = 3.06, RAIO = 0.24;
const TW = 1.38, TH = 2.94, TRAIO = 0.17;

function retangulo(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function geometriaTela() {
  const g = new ShapeGeometry(retangulo(TW, TH, TRAIO), 12);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + TW / 2) / TW, (pos.getY(i) + TH / 2) / TH);
  return g;
}

/** Token (qualquer formato que o three entenda) + alfa → '#rrggbbaa' para o canvas 2D. */
const _cor = new Color();
const comAlfa = (cor: string, alfa: number) =>
  `#${_cor.set(cor).getHexString()}${Math.round(alfa * 255).toString(16).padStart(2, '0')}`;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Tela do app: saldo, gráfico de linha, barras e transações. Tudo desenhado em 2D. */
function desenharTela(ctx: CanvasRenderingContext2D, t: number, c: Cores) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const fundo = ctx.createLinearGradient(0, 0, 0, h);
  fundo.addColorStop(0, '#11162a');
  fundo.addColorStop(1, '#070a14');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '600 26px system-ui';
  ctx.fillText('9:41', 48, 58);
  rr(ctx, w / 2 - 70, 26, 140, 40, 20);
  ctx.fillStyle = '#000';
  ctx.fill();

  ctx.fillStyle = '#9ca3af';
  ctx.font = '24px system-ui';
  ctx.fillText('Saldo disponível', 48, 140);
  ctx.fillStyle = '#f9fafb';
  ctx.font = '700 60px system-ui';
  const saldo = 48920 + Math.round(Math.sin(t * 0.8) * 120);
  ctx.fillText(`R$ ${saldo.toLocaleString('pt-BR')}`, 48, 212);
  rr(ctx, 48, 236, 150, 40, 20);
  ctx.fillStyle = comAlfa(c.sucesso, 0.2);
  ctx.fill();
  ctx.fillStyle = c.sucesso;
  ctx.font = '600 22px system-ui';
  ctx.fillText('▲ 12,4% mês', 64, 264);

  // cartão do gráfico de linha
  rr(ctx, 32, 310, w - 64, 300, 28);
  ctx.fillStyle = '#161c33';
  ctx.fill();
  const gx = 56, gy = 350, gw = w - 112, gh = 220;
  const pontos: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const v = 0.5 + Math.sin(u * 6 + t * 1.4) * 0.18 + Math.sin(u * 13 - t) * 0.08 + u * 0.15;
    pontos.push([gx + u * gw, gy + gh - v * gh]);
  }
  const area = ctx.createLinearGradient(0, gy, 0, gy + gh);
  area.addColorStop(0, comAlfa(c.primaria, 0.55));
  area.addColorStop(1, comAlfa(c.primaria, 0));
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  for (const [x, y] of pontos) ctx.lineTo(x, y);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.fillStyle = area;
  ctx.fill();
  ctx.beginPath();
  pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = c.primaria;
  ctx.lineWidth = 5;
  ctx.stroke();
  const [ux, uy] = pontos[pontos.length - 1];
  ctx.beginPath();
  ctx.arc(ux, uy, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // barras da semana
  ctx.fillStyle = '#9ca3af';
  ctx.font = '22px system-ui';
  ctx.fillText('Entradas da semana', 48, 666);
  const dias = 7;
  for (let i = 0; i < dias; i++) {
    const v = 0.35 + 0.55 * Math.abs(Math.sin(i * 1.3 + t * 0.9));
    const bw = 44, bx = 52 + i * ((w - 104 - bw) / (dias - 1)), bh = v * 140;
    rr(ctx, bx, 830 - bh, bw, bh, 10);
    ctx.fillStyle = i === dias - 1 ? c.destaque : comAlfa(c.primaria, 0.65);
    ctx.fill();
  }

  // transações
  const itens: [string, string, string][] = [
    ['Assinatura Pro', '+ R$ 249,00', c.sucesso],
    ['Fornecedor', '- R$ 1.180,00', '#f87171'],
    ['Repasse', '+ R$ 3.420,00', c.sucesso],
  ];
  itens.forEach(([nome, valor, cor], i) => {
    const y = 880 + i * 84;
    rr(ctx, 32, y, w - 64, 70, 18);
    ctx.fillStyle = '#141a2f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(76, y + 35, 18, 0, Math.PI * 2);
    ctx.fillStyle = comAlfa(cor, 0.33);
    ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '24px system-ui';
    ctx.fillText(nome, 110, y + 44);
    ctx.fillStyle = cor;
    ctx.font = '600 24px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(valor, w - 56, y + 44);
    ctx.textAlign = 'left';
  });
}

/** Cartão de notificação com alfa (cantos arredondados) para flutuar ao redor do celular. */
function texturaCartao(titulo: string, linha: string, cor: string, progresso?: number) {
  const c = document.createElement('canvas');
  c.width = 560;
  c.height = 180;
  const ctx = c.getContext('2d')!;
  rr(ctx, 4, 4, 552, 172, 36);
  ctx.fillStyle = 'rgba(22,28,51,0.94)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(90, 90, 44, 0, Math.PI * 2);
  ctx.fillStyle = comAlfa(cor, 0.27);
  ctx.fill();
  if (progresso !== undefined) {
    ctx.beginPath();
    ctx.arc(90, 90, 34, -Math.PI / 2, -Math.PI / 2 + progresso * Math.PI * 2);
    ctx.strokeStyle = cor;
    ctx.lineWidth = 10;
    ctx.stroke();
  } else {
    ctx.fillStyle = cor;
    ctx.font = '700 46px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('✓', 90, 106);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#f3f4f6';
  ctx.font = '600 36px system-ui';
  ctx.fillText(titulo, 162, 78);
  ctx.fillStyle = cor;
  ctx.font = '32px system-ui';
  ctx.fillText(linha, 162, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function Celular({ cores, nivel }: { cores: Cores; nivel: number }) {
  const grupo = useRef<Group>(null);
  const cartoes = useRef<Group>(null);
  const toque = useMemo(entradaPorToque, []);
  const animado = nivel < 3;

  const recursos = useMemo(() => {
    const corpo = new ExtrudeGeometry(retangulo(W, H, RAIO), {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 5,
      curveSegments: 16,
    });
    corpo.center();
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 1192;
    const tela = new CanvasTexture(canvas);
    tela.colorSpace = SRGBColorSpace;
    tela.anisotropy = 4;
    return { corpo, telaGeo: geometriaTela(), canvas, tela, planoCartao: new PlaneGeometry(1.4, 0.45) };
  }, []);

  const notificacoes = useMemo(
    () => [
      // posições dentro do enquadramento (meia largura visível ≈ 2,4 a z = 8,8, menos a meia largura do cartão 0,7)
      { tex: texturaCartao('Pagamento recebido', '+ R$ 1.250,00', cores.sucesso), pos: [-1.25, 1.0, 0.55] as const, fase: 0 },
      { tex: texturaCartao('Meta do mês', '87% concluída', cores.primaria, 0.87), pos: [1.3, 0.1, 0.7] as const, fase: 1.7 },
      { tex: texturaCartao('Novo cliente', 'Plano anual ativado', cores.destaque), pos: [-1.15, -1.05, 0.85] as const, fase: 3.1 },
    ],
    [cores],
  );
  useEffect(() => () => notificacoes.forEach((n) => n.tex.dispose()), [notificacoes]);
  useEffect(
    () => () => {
      recursos.corpo.dispose();
      recursos.telaGeo.dispose();
      recursos.tela.dispose();
      recursos.planoCartao.dispose();
    },
    [recursos],
  );

  const ultimoDesenho = useRef(-1);
  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime;
    if (t - ultimoDesenho.current > 1 / 24 || ultimoDesenho.current < 0) {
      ultimoDesenho.current = t;
      desenharTela(recursos.canvas.getContext('2d')!, animado ? t : 0, cores);
      recursos.tela.needsUpdate = true;
    }
    const g = grupo.current;
    if (g) {
      const base = animado ? Math.sin(t * 0.45) * 0.32 : -0.25;
      g.rotation.y = amortecer(g.rotation.y, base + (toque ? 0 : estado.pointer.x * INCLINACAO_MAX * 2), 3, delta);
      g.rotation.x = amortecer(g.rotation.x, toque ? 0 : -estado.pointer.y * INCLINACAO_MAX, 3, delta);
      g.position.y = animado ? Math.sin(t * 0.9) * 0.06 : 0;
    }
    cartoes.current?.children.forEach((filho, i) => {
      const n = notificacoes[i];
      filho.position.y = n.pos[1] + (animado ? Math.sin(t * 1.1 + n.fase) * 0.08 : 0);
      filho.rotation.y = amortecer(filho.rotation.y, toque ? 0 : estado.pointer.x * 0.15, 3, delta);
    });
  });

  return (
    <>
      <group ref={grupo} rotation={[0, -0.25, 0]}>
        <mesh geometry={recursos.corpo}>
          <meshPhysicalMaterial color="#1b2030" metalness={0.75} roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
        <mesh geometry={recursos.telaGeo} position={[0, 0, 0.096]}>
          <meshBasicMaterial map={recursos.tela} toneMapped={false} />
        </mesh>
        {[0.55, 0.15].map((y) => (
          <mesh key={y} position={[W / 2 + 0.03, y, 0]}>
            <boxGeometry args={[0.04, 0.26, 0.08]} />
            <meshPhysicalMaterial color="#2a3042" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <group ref={cartoes}>
        {notificacoes.map((n, i) => (
          <mesh key={i} geometry={recursos.planoCartao} position={[n.pos[0], n.pos[1], n.pos[2]]}>
            <meshBasicMaterial map={n.tex} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.95} scale={[1, 0.35, 1]}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>
    </>
  );
}

export default function Celular3DCena({ aoFalhar }: PropsCena) {
  const cores = useTokens(MAPA, PADRAO);
  const [nivel, setNivel] = useState(0);
  return (
    <Canvas
      frameloop="always"
      dpr={nivel >= 1 ? 1 : [1, 2]}
      camera={{ position: [0, 0.1, 8.8], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <directionalLight position={[-4, 1, -2]} intensity={1.2} color={cores.primaria} />
      <AmbienteEstudio intensidade={0.9} />
      <Celular cores={cores} nivel={nivel} />
      <PausaAutomatica />
      <MonitorQualidade aoMudar={(n) => (n >= 4 ? aoFalhar() : setNivel(n))} />
      <GuardaContexto aoPerder={aoFalhar} />
    </Canvas>
  );
}
