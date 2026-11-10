import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Texture, Vector3 } from 'three';
import { amortecer, bezier, EASE, limitar, progresso } from '../src/movimento';
import { criarMedidorQualidade } from '../src/qualidade';
import { calcularProgresso } from '../src/viewport';
import { decidirModo } from '../src/Cena3DSegura';
import { descartar, enquadrarOrto, enquadrarPerspectiva } from '../src/three-util';
import { leiaTokens } from '../src/tokens';
import { temWebGL } from '../src/ambiente';

describe('movimento', () => {
  it('limita e calcula progresso', () => {
    expect(limitar(2)).toBe(1);
    expect(progresso(150, 100, 100)).toBe(0.5);
    expect(progresso(0, 0, 0)).toBe(1);
  });
  it('bezier igual ao CSS nas pontas e monotônica', () => {
    const f = EASE.entrada;
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    let ant = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(f(t)).toBeGreaterThanOrEqual(ant);
      ant = f(t);
    }
    expect(bezier(0, 0, 1, 1)(0.3)).toBeCloseTo(0.3, 4); // linear
    expect(f(0.5)).toBeGreaterThan(0.5); // entrada desacelera: adiantada no meio
  });
  it('amortecer independe do FPS', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = amortecer(a, 1, 6, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = amortecer(b, 1, 6, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('qualidade adaptativa', () => {
  it('desce de nível com FPS baixo e nunca sobe', () => {
    const m = criarMedidorQualidade({ alvo: 45, janela: 1, aquecimento: 0, maxNivel: 2 });
    const niveis: number[] = [];
    for (let i = 0; i < 200; i++) {
      const n = m.quadro(1 / 20); // 20 FPS
      if (n !== null) niveis.push(n);
    }
    expect(niveis).toEqual([1, 2]);
    for (let i = 0; i < 300; i++) m.quadro(1 / 120);
    expect(m.nivel).toBe(2);
  });
  it('ignora deltas de aba oculta e respeita aquecimento', () => {
    const m = criarMedidorQualidade({ janela: 1, aquecimento: 1 });
    expect(m.quadro(5)).toBeNull();
    for (let i = 0; i < 50; i++) m.quadro(1 / 60);
    expect(m.nivel).toBe(0);
  });
});

describe('viewport', () => {
  it('progresso de rolagem 0..1', () => {
    expect(calcularProgresso(800, 400, 800)).toBe(0); // ainda abaixo
    expect(calcularProgresso(-400, 400, 800)).toBe(1); // já saiu por cima
    expect(calcularProgresso(200, 400, 800)).toBe(0.5);
  });
});

describe('cascata de modo', () => {
  const base = { webgl: true, reduzido: false, proximo: true, falhou: false };
  it.each([
    [{ ...base, webgl: false }, 'fallback'],
    [{ ...base, falhou: true }, 'fallback'],
    [{ ...base, reduzido: true }, 'reduzido'],
    [{ ...base, proximo: false }, 'fallback'],
    [base, 'cena'],
  ] as const)('%o → %s', (entrada, esperado) => {
    expect(decidirModo(entrada)).toBe(esperado);
  });
});

describe('three-util', () => {
  const caixa = new Box3(new Vector3(-2, 0, -1), new Vector3(2, 1, 1));
  it('enquadrarOrto cabe a caixa no canvas', () => {
    const cam = new OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
    cam.position.set(10, 10, 10);
    cam.lookAt(0, 0, 0);
    enquadrarOrto(cam, caixa, 800, 600, 1);
    cam.updateMatrixWorld();
    for (let i = 0; i < 8; i++) {
      const p = new Vector3(i & 1 ? 2 : -2, i & 2 ? 1 : 0, i & 4 ? 1 : -1).project(cam);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1 + 1e-6);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1 + 1e-6);
    }
    const dir = cam.getWorldDirection(new Vector3());
    expect(dir.distanceTo(new Vector3(-1, -1, -1).normalize())).toBeLessThan(1e-6); // direção isométrica preservada
    const centro = caixa.getCenter(new Vector3()).project(cam);
    expect(Math.hypot(centro.x, centro.y)).toBeLessThan(1e-6); // conteúdo centralizado
  });
  it('enquadrarPerspectiva cabe a caixa no fov', () => {
    const cam = new PerspectiveCamera(35, 16 / 9, 0.1, 100);
    cam.position.set(0, 2, 8);
    cam.lookAt(0, 0, 0);
    enquadrarPerspectiva(cam, caixa);
    cam.updateMatrixWorld();
    const p = new Vector3(2, 1, 1).project(cam);
    expect(Math.abs(p.x)).toBeLessThan(1);
    expect(Math.abs(p.y)).toBeLessThan(1);
  });
  it('descartar libera geometria, material e textura', () => {
    const tex = new Texture();
    const mat = new MeshStandardMaterial({ map: tex });
    const geo = new BoxGeometry();
    const eventos: string[] = [];
    geo.addEventListener('dispose', () => eventos.push('geo'));
    mat.addEventListener('dispose', () => eventos.push('mat'));
    tex.addEventListener('dispose', () => eventos.push('tex'));
    descartar(new Mesh(geo, mat));
    expect(eventos.sort()).toEqual(['geo', 'mat', 'tex']);
  });
});

describe('ambiente (jsdom)', () => {
  it('sem WebGL não lança e devolve false', () => {
    expect(temWebGL()).toBe(false);
  });
  it('tokens usam o padrão quando a variável não existe', () => {
    document.documentElement.style.setProperty('--cor-primaria', '#ff0044');
    const t = leiaTokens({ primaria: '--cor-primaria', fundo: '--cor-fundo' }, { fundo: '#101014' });
    expect(t).toEqual({ primaria: '#ff0044', fundo: '#101014' });
  });
});
