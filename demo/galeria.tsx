// Galeria de exemplos da suíte anim3d: shell de app, um exemplo por vez no palco.
// Cada exemplo é o componente REAL da pasta exemplo/ de uma skill (nada copiado). Link direto: galeria.html#id
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useMovimentoReduzido } from '@anim3d/kit';
import { Globo3D } from '../anim3d-saas/exemplo/Globo3D';
import { Ecossistema3D } from '../anim3d-dashboard/exemplo/Ecossistema3D';
import { ecossistemaExemplo } from '../anim3d-dashboard/exemplo/ecossistemaDados';
import { Colunas3D } from '../anim3d-dashboard/exemplo/Colunas3D';
import { Celular3D } from '../anim3d-mobile/exemplo/Celular3D';
import { MicroInteracoes } from '../anim3d-app-ui/exemplo/MicroInteracoes';
import imgAlmoxarifado from '../docs/img/almoxarifado-visao-geral.png';
import './galeria.css';

interface Exemplo {
  id: string;
  grupo: 'SaaS' | 'Dashboard' | 'Mobile' | 'App UI';
  icone: string;
  titulo: string;
  resumo: string;
  descricao: string;
  tecnicas: string[];
  destaques: string[];
  metricas: [string, string][];
  skill: string;
  arquivos: string[];
  uso: string;
  /** Proporção largura/altura do quadro (undefined = conteúdo livre). */
  prop?: number;
  legenda?: string;
  palco: () => ReactNode;
}

// ---------- exemplos ----------
const regioes = ['Norte', 'Sul', 'Leste', 'Oeste'];
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
const gerar = (s: number) =>
  regioes.flatMap((r, i) => meses.map((m, j) => ({ rotulo: `${r} · ${m}`, valor: Math.round(800 + 600 * Math.sin(i + j * 0.7 + s) ** 2) })));

function ColunasAoVivo() {
  const [semente, setSemente] = useState(0);
  const [aoVivo, setAoVivo] = useState(true);
  useEffect(() => {
    if (!aoVivo) return;
    const t = setInterval(() => setSemente((s) => s + 0.6), 2500);
    return () => clearInterval(t);
  }, [aoVivo]);
  return (
    <>
      <div className="gal-controles">
        <button className={`gal-btn ${aoVivo ? 'ativo' : ''}`} onClick={() => setAoVivo((v) => !v)}>
          {aoVivo ? '● Dados ao vivo' : '❚❚ Pausado'}
        </button>
        <button className="gal-btn" onClick={() => setSemente((s) => s + 0.6)}>
          Atualizar agora
        </button>
      </div>
      <Colunas3D titulo="Volume por região e mês" pontos={gerar(semente)} colunas={meses.length} />
    </>
  );
}

function Almoxarifado() {
  return (
    <div className="gal-destaque">
      <img src={imgAlmoxarifado} alt="Almoxarifado 3D: estantes, setores, empilhadeiras, caminhões e painel com gráficos" />
      <a className="gal-btn ativo" href="./index.html">
        Abrir o Almoxarifado 3D →
      </a>
    </div>
  );
}

const EXEMPLOS: Exemplo[] = [
  {
    id: 'almoxarifado',
    grupo: 'Dashboard',
    icone: '▣',
    titulo: 'Almoxarifado 3D de ponta a ponta',
    resumo: 'Gêmeo digital com operação ao vivo',
    descricao:
      'App completo por setores: o caminhão chega, a carga é descarregada, conferida, armazenada em 384 posições endereçadas, separada, embalada na esteira e expedida. Planta 2D ao vivo, gráficos por setor, inventário e movimentações.',
    tecnicas: ['simulação testável sem three', 'InstancedMesh', 'OrbitControls com limites', 'voo de câmera', 'useSyncExternalStore', 'planta SVG por rAF'],
    destaques: ['3 empilhadeiras com fila de tarefas reais', 'Busca leva a câmera até a posição', 'Movimento reduzido: mapa aparece pausado', 'Invariantes testados (nenhum palete some)'],
    metricas: [['384', 'posições endereçadas'], ['6', 'setores'], ['~12', 'draw calls instanciados'], ['6', 'testes da simulação']],
    skill: 'anim3d-dashboard',
    arquivos: ['anim3d-dashboard/exemplo/almoxarifado/'],
    uso: `import { AlmoxarifadoApp } from './almoxarifado/AlmoxarifadoApp';

// ocupa a tela inteira (100dvh)
<AlmoxarifadoApp />`,
    palco: () => <Almoxarifado />,
  },
  {
    id: 'ecossistema',
    grupo: 'Dashboard',
    icone: '◇',
    titulo: 'Ecossistema de dados isométrico',
    resumo: 'Arquitetura com pacotes nos cabos',
    descricao:
      'Aplicações → portões de API → bancos e DW ← ETL ← fontes. Pacotes de pedido, resposta e carga percorrem os cabos. Passe o mouse num sistema: ele sobe, os cabos acendem e o cartão mostra o fluxo.',
    tecnicas: ['câmera ortográfica', 'CurvePath + getPointAt', 'InstancedMesh (1 draw call)', 'cartão HTML preso ao 3D', 'sombras'],
    destaques: ['O desenho é um objeto de dados', 'Fallback em lista para leitor de tela'],
    metricas: [['13', 'sistemas'], ['18', 'rotas animadas'], ['1', 'draw call de pacotes'], ['8 s', 'ciclo']],
    skill: 'anim3d-dashboard',
    arquivos: ['anim3d-dashboard/exemplo/Ecossistema3D.tsx', 'anim3d-dashboard/exemplo/Ecossistema3DCena.tsx', 'anim3d-dashboard/exemplo/ecossistemaDados.ts'],
    uso: `import { Ecossistema3D } from './Ecossistema3D';
import { ecossistemaExemplo } from './ecossistemaDados';

<Ecossistema3D dados={ecossistemaExemplo} />`,
    prop: 4 / 3,
    legenda: 'Passe o mouse nos sistemas',
    palco: () => <Ecossistema3D dados={ecossistemaExemplo} />,
  },
  {
    id: 'colunas',
    grupo: 'Dashboard',
    icone: '▥',
    titulo: 'Colunas 3D em tempo real',
    resumo: '24 colunas, 1 malha, dados ao vivo',
    descricao:
      'Grade região × mês numa única malha instanciada. Os dados mudam a cada 2,5 s e as colunas interpolam sem re-render do React. A cor é uma escala sequencial pelo valor, e o hover mostra o número exato em HTML.',
    tecnicas: ['frameloop demand', 'InstancedMesh + setColorAt', 'amortecer()', 'enquadrarOrto', 'tabela acessível'],
    destaques: ['Só renderiza enquanto anima', 'Números exatos fora do 3D'],
    metricas: [['24', 'colunas'], ['1', 'draw call'], ['0', 'quadros parado'], ['2,5 s', 'atualização']],
    skill: 'anim3d-dashboard',
    arquivos: ['anim3d-dashboard/exemplo/Colunas3D.tsx', 'anim3d-dashboard/exemplo/Colunas3DCena.tsx'],
    uso: `import { Colunas3D } from './Colunas3D';

<Colunas3D titulo="Volume por região" pontos={pontos} colunas={6} />`,
    prop: 4 / 3,
    legenda: 'Passe o mouse nas colunas',
    palco: () => <ColunasAoVivo />,
  },
  {
    id: 'globo',
    grupo: 'SaaS',
    icone: '◍',
    titulo: 'Globo de conexões',
    resumo: 'Hero com arcos de dados entre cidades',
    descricao:
      'Globo de pontos com continentes procedurais (sem baixar mapa), arcos animados entre cidades, pulsos e atmosfera em shader. Inclina até 8° com o mouse e fica parado no toque. Componente sem texto: o hero é do seu produto.',
    tecnicas: ['Points + textura circular', 'TubeGeometry.setDrawRange', 'shader fresnel', 'toneMapped false', 'qualidade adaptativa'],
    destaques: ['Poster SVG no primeiro paint', 'three fora do bundle inicial'],
    metricas: [['~11 mil', 'pontos'], ['12', 'arcos'], ['0 KB', 'de mapa baixado'], ['≤ 8°', 'parallax']],
    skill: 'anim3d-saas',
    arquivos: ['anim3d-saas/exemplo/Globo3D.tsx', 'anim3d-saas/exemplo/Globo3DCena.tsx'],
    uso: `import { Globo3D } from './Globo3D';

<section className="hero">
  <div>{/* seu título e CTA */}</div>
  <Globo3D rotulo="Rede global de clientes" />
</section>`,
    prop: 1,
    legenda: 'Mova o mouse sobre o globo',
    palco: () => <Globo3D rotulo="Globo com arcos de conexão entre cidades" />,
  },
  {
    id: 'celular',
    grupo: 'Mobile',
    icone: '▯',
    titulo: 'Celular 3D com app animado',
    resumo: 'Vitrine de app com tela viva',
    descricao:
      'Corpo extrudado com material físico reflexivo, tela de app desenhada em canvas a 24 fps (saldo, gráfico, barras, transações) e notificações flutuando ao redor.',
    tecnicas: ['ExtrudeGeometry', 'CanvasTexture', 'MeshPhysicalMaterial', 'RoomEnvironment', 'cores com alfa via THREE.Color'],
    destaques: ['A tela é só canvas 2D: troque pelo seu app', 'Sem parallax no toque'],
    metricas: [['24 fps', 'tela'], ['3', 'notificações'], ['0', 'imagens baixadas'], ['1', 'canvas']],
    skill: 'anim3d-mobile',
    arquivos: ['anim3d-mobile/exemplo/Celular3D.tsx', 'anim3d-mobile/exemplo/Celular3DCena.tsx'],
    uso: `import { Celular3D } from './Celular3D';

<Celular3D rotulo="App financeiro" />`,
    prop: 1,
    legenda: 'Mova o mouse para inclinar',
    palco: () => <Celular3D rotulo="Celular com tela de app financeiro e notificações" />,
  },
  {
    id: 'ui',
    grupo: 'App UI',
    icone: '◩',
    titulo: 'Micro-interações em CSS 3D',
    resumo: 'Profundidade sem WebGL',
    descricao:
      'Cartão que inclina com brilho, cartão que vira, botão físico, loader de cubo que só aparece em esperas longas e pilha que abre em profundidade. Só transform e opacity, com movimento reduzido tratado.',
    tecnicas: ['perspective + preserve-3d', 'CSS vars por pointermove', 'backface-visibility', 'useEsperaVisivel'],
    destaques: ['0 KB de three', 'Acessível por teclado', 'Cada peça copiável sozinha'],
    metricas: [['5', 'peças'], ['0 KB', 'three'], ['400 ms', 'atraso do loader'], ['≤ 8°', 'inclinação']],
    skill: 'anim3d-app-ui',
    arquivos: ['anim3d-app-ui/exemplo/MicroInteracoes.tsx', 'anim3d-app-ui/exemplo/microInteracoes.css'],
    uso: `import { CartaoInclinavel, SalvarComCubo } from './MicroInteracoes';

<CartaoInclinavel />
<SalvarComCubo />`,
    palco: () => <MicroInteracoes />,
  },
];

const GRUPOS: Exemplo['grupo'][] = ['Dashboard', 'SaaS', 'Mobile', 'App UI'];

// ---------- rota pelo hash ----------
const lerHash = () => {
  const h = location.hash.slice(1);
  return EXEMPLOS.some((e) => e.id === h) ? h : EXEMPLOS[0].id;
};
const assinarHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

function Codigo({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="gal-codigo">
      <pre>
        <code>{texto}</code>
      </pre>
      <button
        onClick={() => {
          void navigator.clipboard?.writeText(texto).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          });
        }}
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function Galeria() {
  const id = useSyncExternalStore(assinarHash, lerHash, () => EXEMPLOS[0].id);
  const ex = EXEMPLOS.find((e) => e.id === id)!;
  const [menu, setMenu] = useState(false);
  const reduzido = useMovimentoReduzido();
  const respeitando = new URLSearchParams(location.search).has('respeitar');
  useEffect(() => {
    document.title = `${ex.titulo} · Galeria anim3d`;
  }, [ex]);

  return (
    <div className="gal" data-menu={menu}>
      <aside className="gal-lateral" aria-label="Exemplos">
        <div className="gal-marca">
          <span className="logo">3D</span>
          <div>
            <strong>anim3d</strong>
            <small>Galeria de exemplos</small>
          </div>
        </div>
        <nav>
          {GRUPOS.map((g) => (
            <div key={g} style={{ display: 'contents' }}>
              <p className="gal-grupo">{g}</p>
              {EXEMPLOS.filter((e) => e.grupo === g).map((e) => (
                <a
                  key={e.id}
                  href={`#${e.id}`}
                  className={`gal-item ${e.id === id ? 'ativo' : ''}`}
                  aria-current={e.id === id ? 'page' : undefined}
                  onClick={() => setMenu(false)}
                >
                  <span className="ic" aria-hidden="true">
                    {e.icone}
                  </span>
                  <span>
                    <b>
                      {e.titulo}
                      {e.id === 'almoxarifado' && <span className="novo">APP</span>}
                    </b>
                    <small>{e.resumo}</small>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="gal-rodape">
          <span>
            Rode localmente: <code>npm run demo</code>
          </span>
          <span>React 19 · R3F 9 · three 0.187</span>
        </div>
      </aside>
      <button className="gal-veu" aria-label="Fechar menu" onClick={() => setMenu(false)} />

      <div className="gal-principal">
        <header className="gal-cab">
          <button className="gal-btn gal-menu" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            ☰
          </button>
          <div className="tit">
            <small>
              {ex.grupo} · {ex.skill}
            </small>
            <h1>{ex.titulo}</h1>
          </div>
          <div className="gal-acoes">
            {reduzido && <span className="gal-btn" style={{ cursor: 'default' }}>Respeitando “reduzir movimento”: versões estáticas</span>}
            <button
              className="gal-btn"
              onClick={() => {
                const el = document.documentElement;
                el.dataset.theme = el.dataset.theme === 'escuro' ? 'claro' : 'escuro';
              }}
            >
              ◐ Tema
            </button>
            <a className="gal-btn" href={`${respeitando ? location.pathname : '?respeitar=1'}${location.hash}`} title="Testa o comportamento de quem usa “reduzir movimento”">
              {respeitando ? '✓ Respeitando o sistema (voltar às animações)' : 'Respeitar “reduzir movimento”'}
            </a>
          </div>
        </header>

        <div className="gal-area">
          {/* key: troca de exemplo desmonta a cena anterior (um canvas por vez) */}
          <section className="gal-palco" key={ex.id} aria-label={`Exemplo: ${ex.titulo}`}>
            <div className={ex.prop ? 'gal-quadro' : 'gal-quadro livre'} style={{ ['--prop' as string]: ex.prop ?? 1 }}>
              {ex.palco()}
            </div>
            {ex.legenda && <span className="gal-legenda">{ex.legenda}</span>}
          </section>
          <aside className="gal-ficha" aria-label="Sobre o exemplo">
            <p>{ex.descricao}</p>
            <div className="gal-metricas">
              {ex.metricas.map(([v, r]) => (
                <div key={r}>
                  <b>{v}</b>
                  <small>{r}</small>
                </div>
              ))}
            </div>
            <section className="gal-sec">
              <h2>Destaques</h2>
              <ul className="gal-lista">
                {ex.destaques.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
            <section className="gal-sec">
              <h2>Técnicas</h2>
              <div className="gal-tags">
                {ex.tecnicas.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </section>
            <section className="gal-sec">
              <h2>Como usar</h2>
              <Codigo texto={ex.uso} />
            </section>
            <section className="gal-sec">
              <h2>Arquivos · skill {ex.skill}</h2>
              <div className="gal-arquivos">
                {ex.arquivos.map((a) => (
                  <span key={a}>{a}</span>
                ))}
                <span>anim3d-fundamentos/kit/src (dependência)</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Galeria />);
