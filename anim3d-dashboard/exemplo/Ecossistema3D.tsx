// Exemplo anim3d-dashboard · Ecossistema de dados isométrico (componente).
// Uso: <Ecossistema3D dados={ecossistemaExemplo} />. Um ecossistema novo = outro objeto de dados.
import { Cena3DSegura } from '@anim3d/kit';
import type { DadosEcossistema } from './ecossistemaDados';

const carregar = () => import('./Ecossistema3DCena');

/** Fallback: o mesmo conteúdo em lista (sem WebGL, movimento reduzido, leitor de tela). */
function Lista({ dados }: { dados: DadosEcossistema }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 16, font: '13px/1.5 system-ui' }}>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {dados.nos.map((n) => (
          <li key={n.id}>
            <strong>{n.nome}</strong>: {n.fluxo.join(' · ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Ecossistema3D({ dados }: { dados: DadosEcossistema }) {
  return (
    <Cena3DSegura
      carregar={carregar}
      props={{ dados }}
      fallback={<Lista dados={dados} />}
      rotulo={`${dados.titulo}. Passe o mouse num sistema para ver o fluxo.`}
      aspecto="4 / 3"
    />
  );
}
