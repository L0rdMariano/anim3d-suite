// Exemplo anim3d-mobile · Celular 3D com tela de app animada (componente).
// Na web mobile funciona igual; no React Native troque o Canvas por '@react-three/fiber/native' (veja a skill).
import { Cena3DSegura } from '@anim3d/kit';

const carregar = () => import('./Celular3DCena');

function Poster() {
  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" aria-hidden="true">
      <rect x="62" y="20" width="76" height="160" rx="14" fill="#1b2030" stroke="#3b4470" strokeWidth="2" />
      <rect x="67" y="25" width="66" height="150" rx="10" fill="#0b0f1d" />
      <path d="M72 95 Q 90 70 100 85 T 128 70" fill="none" stroke="var(--cor-primaria, #818cf8)" strokeWidth="3" />
      <rect x="20" y="60" width="54" height="18" rx="9" fill="#161c33" stroke="var(--cor-sucesso, #4ade80)" />
      <rect x="126" y="110" width="58" height="18" rx="9" fill="#161c33" stroke="var(--cor-primaria, #818cf8)" />
      <ellipse cx="100" cy="210" rx="40" ry="6" fill="#000" opacity="0.25" />
    </svg>
  );
}

export function Celular3D({ rotulo }: { rotulo?: string }) {
  return <Cena3DSegura carregar={carregar} fallback={<Poster />} aspecto="1 / 1" rotulo={rotulo} />;
}
