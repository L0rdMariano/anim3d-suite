// Utilitários de three.js: enquadrar câmera pelo conteúdo e descartar recursos.
import {
  Box3,
  Mesh,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Sphere,
  Texture,
  Vector3,
} from 'three';

const _v = new Vector3();
const _dir = new Vector3();

/**
 * Câmera ortográfica (isométrica/diagrama): mantém a direção atual, mira o centro da `caixa`
 * e ajusta o `zoom` para caber em `largura` × `altura` px (frustum padrão do R3F: ±tamanho/2).
 */
export function enquadrarOrto(
  cam: OrthographicCamera,
  caixa: Box3,
  largura: number,
  altura: number,
  margem = 1.1,
): void {
  const centro = caixa.getCenter(new Vector3());
  cam.getWorldDirection(_dir);
  const dist = Math.max(cam.position.distanceTo(centro), caixa.getSize(_v).length() * 2, 1);
  cam.position.copy(centro).addScaledVector(_dir, -dist);
  cam.lookAt(centro);
  cam.updateMatrixWorld();
  const centroCam = centro.clone().applyMatrix4(cam.matrixWorldInverse);
  let mx = 0;
  let my = 0;
  for (let i = 0; i < 8; i++) {
    _v.set(
      i & 1 ? caixa.max.x : caixa.min.x,
      i & 2 ? caixa.max.y : caixa.min.y,
      i & 4 ? caixa.max.z : caixa.min.z,
    )
      .applyMatrix4(cam.matrixWorldInverse)
      .sub(centroCam);
    mx = Math.max(mx, Math.abs(_v.x));
    my = Math.max(my, Math.abs(_v.y));
  }
  if (mx === 0 || my === 0) return;
  cam.zoom = Math.min(largura / (2 * mx * margem), altura / (2 * my * margem));
  cam.near = 0.1;
  cam.far = dist * 4;
  cam.updateProjectionMatrix();
}

/** Câmera em perspectiva: afasta na direção atual até a esfera envolvente caber no fov. */
export function enquadrarPerspectiva(cam: PerspectiveCamera, caixa: Box3, margem = 1.15): number {
  const esfera = caixa.getBoundingSphere(new Sphere());
  const vfov = (cam.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
  const dist = (esfera.radius * margem) / Math.sin(Math.min(vfov, hfov) / 2);
  cam.getWorldDirection(_dir);
  cam.position.copy(esfera.center).addScaledVector(_dir, -dist);
  cam.lookAt(esfera.center);
  cam.near = Math.max(dist / 100, 0.01);
  cam.far = dist * 10;
  cam.updateProjectionMatrix();
  return dist;
}

/**
 * Libera geometrias, materiais e texturas de uma árvore criada fora do JSX
 * (glTF clonado, objetos imperativos). O que é declarado em JSX o R3F já descarta sozinho.
 */
export function descartar(raiz: Object3D): void {
  raiz.traverse((o) => {
    const m = o as Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const valor of Object.values(mat)) {
        if (valor && (valor as Texture).isTexture) (valor as Texture).dispose();
      }
      mat.dispose();
    }
  });
}
