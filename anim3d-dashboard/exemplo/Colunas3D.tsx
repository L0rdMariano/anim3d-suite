// Colunas 3D sobre uma grade (ex.: volume por região × mês) com fallback 2D e tabela acessível.
// O 3D mostra a forma; os números exatos ficam sempre em HTML.
import { Cena3DSegura } from '@anim3d/kit';
import type { PropsColunas } from './Colunas3DCena';

const carregar = () => import('./Colunas3DCena');
const fmt = new Intl.NumberFormat('pt-BR');

/** Fallback 2D: barras horizontais que cabem na mesma caixa da cena (sem quebrar linha). */
function Barras2D({ pontos }: PropsColunas) {
  const max = Math.max(...pontos.map((p) => p.valor), 1);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, max-content) 1fr',
        alignContent: 'space-evenly',
        columnGap: 8,
        fontSize: 12,
        overflow: 'hidden',
      }}
    >
      {pontos.map((p) => (
        <div key={p.rotulo} style={{ display: 'contents' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.rotulo}</span>
          <span style={{ alignSelf: 'center', height: 8, borderRadius: 2, width: `${(p.valor / max) * 100}%`, background: 'var(--cor-primaria, #4f46e5)' }} />
        </div>
      ))}
    </div>
  );
}

export function Colunas3D({ titulo, ...dados }: PropsColunas & { titulo: string }) {
  return (
    <figure className="colunas-3d">
      <figcaption>{titulo}</figcaption>
      <Cena3DSegura
        carregar={carregar}
        props={dados}
        fallback={<Barras2D {...dados} />}
        rotulo={`${titulo}: gráfico de colunas em 3D; valores na tabela a seguir`}
        aspecto="4 / 3"
      />
      {/* A tabela fica DENTRO de um div.sr-only: tabela ignora height:1px e esticaria a página. */}
      <div className="sr-only">
        <table>
          <caption>{titulo}</caption>
          <tbody>
            {dados.pontos.map((p) => (
              <tr key={p.rotulo}>
                <th scope="row">{p.rotulo}</th>
                <td>{fmt.format(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
