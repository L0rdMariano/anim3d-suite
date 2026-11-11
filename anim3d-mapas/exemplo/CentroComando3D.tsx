// Exemplo anim3d-dashboard · Centro de Comando (mapa-múndi 3D de "sala de controle") + mapa do Brasil (IBGE).
// Uso: <CentroComando3D /> em um contêiner com largura definida (proporção 16/10).
// Clicar no Brasil abre "Abrir mapa do Brasil" no painel; o mapa do Brasil carrega sob demanda (dados do IBGE).
// Os eventos de rede vêm de uma SIMULAÇÃO (centroComandoSim.ts). Para dados reais, alimente a cena com seus eventos.
import { lazy, Suspense, useCallback, useState } from 'react';
import { Cena3DSegura, type MotivoFallback } from '@anim3d/kit';
import './centroComando.css';

const carregar = () => import('./CentroComando3DCena'); // fora do componente: estável entre renders
const MapaBrasil = lazy(() => import('./MapaBrasil'));

/** Poster leve (SVG): sem WebGL, durante o carregamento e em erro. Sem interação: o painel real é o 3D. */
function Poster({ motivo }: { motivo: MotivoFallback }) {
  const pontos = [];
  for (let i = 0; i < 380; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt(i / 380) * 92;
    const x = 100 + Math.cos(a) * r;
    const y = 100 + Math.sin(a) * r;
    if (Math.sin(x * 0.09) + Math.cos(y * 0.07) > 0.1) pontos.push(<circle key={i} cx={x} cy={y} r={1.5} />);
  }
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <g transform="translate(60 0)">
        <circle cx="100" cy="100" r="92" fill="#04101c" stroke="rgba(34,211,238,.35)" />
        <g fill="#1fb6d6" opacity=".85">{pontos}</g>
        <path d="M52 120 Q 95 30 150 78" fill="none" stroke="#ff3b5c" strokeWidth="1.5" />
        <path d="M70 70 Q 120 20 160 120" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
        <circle cx="150" cy="78" r="3.5" fill="#ff3b5c" />
      </g>
      <text x="14" y="22" fill="#22d3ee" fontFamily="monospace" fontSize="8" letterSpacing="1.5">CENTRO DE OPERAÇÕES DE REDE</text>
      {motivo !== 'aguardando' && (
        <text x="14" y="190" fill="#ffd23f" fontFamily="monospace" fontSize="6">
          {motivo === 'sem-webgl' ? 'WebGL indisponível neste navegador: mostrando prévia estática.' : 'O 3D foi interrompido (erro ou perda do contexto de vídeo): mostrando prévia estática.'}
        </text>
      )}
    </svg>
  );
}

export function CentroComando3D({
  rotulo = 'Mapa-múndi interativo com ataques e fluxos de dados simulados entre pontos de presença; clique num país para ver os dados',
  vistaInicial = 'mundo',
  projecaoInicial = 'plano',
}: {
  rotulo?: string;
  /** 'mundo' = mapa-múndi (plano ou globo) · 'brasil' = mapa por estado com dados do IBGE. */
  vistaInicial?: 'mundo' | 'brasil';
  projecaoInicial?: 'plano' | 'globo';
}) {
  const [vista, setVista] = useState(vistaInicial);
  const abrirBrasil = useCallback(() => setVista('brasil'), []);
  const voltar = useCallback(() => setVista('mundo'), []);

  if (vista === 'brasil')
    return (
      <div className="cc-quadro" style={{ aspectRatio: '16 / 10' }} role="group" aria-label="Mapa do Brasil por estado com dados do IBGE">
        <Suspense fallback={<p className="cc-carregando">Carregando dados do IBGE…</p>}>
          <MapaBrasil aoVoltar={voltar} />
        </Suspense>
      </div>
    );

  return (
    <Cena3DSegura
      className="cc-quadro"
      carregar={carregar}
      props={{ aoAbrirBrasil: abrirBrasil, projecaoInicial }}
      fallback={(motivo) => <Poster motivo={motivo} />}
      cenaComMovimentoReduzido // é uma ferramenta: carrega mesmo com "reduzir movimento" (a cena desliga o que é só movimento)
      rotulo={rotulo}
      aspecto="16 / 10"
    />
  );
}
