// Exemplo anim3d-saas · Globo de conexões (componente; o texto ao redor é do seu projeto).
// Uso: <Globo3D /> dentro de um contêiner com largura definida. Cores: --cor-primaria, --cor-destaque, --cor-globo.
import { Cena3DSegura } from '@anim3d/kit';

const carregar = () => import('./Globo3DCena'); // fora do componente: estável entre renders

/** Poster leve (SVG inline): sem WebGL, durante o carregamento e com movimento reduzido. */
function Poster() {
  const pontos = [];
  for (let i = 0; i < 260; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt(i / 260) * 92;
    const x = 100 + Math.cos(a) * r;
    const y = 100 + Math.sin(a) * r;
    if (Math.sin(x * 0.09) + Math.cos(y * 0.07) > 0.15) pontos.push(<circle key={i} cx={x} cy={y} r={2} />);
  }
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="globo-atm" r="0.5">
          <stop offset="0.86" stopColor="var(--cor-primaria, #818cf8)" stopOpacity="0" />
          <stop offset="0.93" stopColor="var(--cor-primaria, #818cf8)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--cor-primaria, #818cf8)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#globo-atm)" />
      <circle cx="100" cy="100" r="92" fill="var(--cor-globo, #0f1630)" />
      <g fill="var(--cor-primaria, #818cf8)">{pontos}</g>
      <path d="M52 120 Q 95 40 150 78" fill="none" stroke="var(--cor-destaque, #fb923c)" strokeWidth="1.5" />
    </svg>
  );
}

export function Globo3D({ rotulo }: { rotulo?: string }) {
  return <Cena3DSegura carregar={carregar} fallback={<Poster />} aspecto="1 / 1" rotulo={rotulo} />;
}
