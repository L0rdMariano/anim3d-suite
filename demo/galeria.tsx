// Galeria de exemplos da suíte anim3d: shell de app, um exemplo por vez no palco.
// Cada exemplo é o componente REAL da pasta exemplo/ de uma skill (nada copiado). Link direto: galeria.html#id
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useMovimentoReduzido } from '@anim3d/kit';
import { Globo3D } from '../anim3d-saas/exemplo/Globo3D';
import { Ecossistema3D } from '../anim3d-dashboard/exemplo/Ecossistema3D';
import { ecossistemaExemplo } from '../anim3d-dashboard/exemplo/ecossistemaDados';
import { Colunas3D } from '../anim3d-dashboard/exemplo/Colunas3D';
import { CentroComando3D } from '../anim3d-mapas/exemplo/CentroComando3D';
import { Topologia } from '../anim3d-topologia/exemplo/Topologia';
import { RackEmpresa } from '../anim3d-infra-fisica/exemplo/RackEmpresa';
import { CoberturaWifi } from '../anim3d-wifi-rf/exemplo/CoberturaWifi';
import { ComparaMolas } from '../anim3d-motion/exemplo/ComparaMolas';
import { Celular3D } from '../anim3d-mobile/exemplo/Celular3D';
import { MicroInteracoes } from '../anim3d-app-ui/exemplo/MicroInteracoes';
import imgAlmoxarifado from '../docs/img/almoxarifado-visao-geral.png';
import './galeria.css';

interface Exemplo {
  id: string;
  grupo: 'Mapas' | 'Redes' | 'Motion' | 'SaaS' | 'Dashboard' | 'Mobile' | 'App UI';
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
      <a className="gal-btn ativo" href="./almoxarifado.html">
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
    id: 'comando',
    grupo: 'Mapas',
    icone: '◉',
    titulo: 'Centro de Comando (mapa e globo)',
    resumo: 'Mapa plano ou globo, países clicáveis',
    descricao:
      'Mapa-múndi de sala de controle em duas formas, com botão para alternar: plano (padrão: o mundo inteiro legível de uma vez) e globo (vitrine). Países reais, fronteiras e nomes em português. Clique em qualquer país: o mapa centraliza nele, destaca o território, acende os data centers do país (hubs por cidade) e o painel da direita mostra população, área, capital, idiomas, moeda, fronteiras (clicáveis) e a lista de data centers. No Brasil, um botão abre o mapa por estado com dados do IBGE. Arcos de ataque (por severidade) e fluxos de dados entre 16 cidades, ondas de impacto, feixes nos alvos e campanhas em rajada. Clicar numa cidade abre estado, taxa de bloqueio e gráfico dos últimos 60 s. Os eventos vêm de uma simulação testável, trocável por dados reais.',
    tecnicas: ['camada de data centers por país', 'plano e globo com os mesmos dados', 'arco direto no plano e geodésico no globo', 'mapa real (Natural Earth) em CanvasTexture', 'rótulos de países em HTML', 'simulação pura (sem three)', 'Line + vertex colors + setDrawRange', 'Points aditivo (cabeças)', 'pools de arcos e ondas', 'raycast com e.delta', 'projeção 3D→HTML por ref', 'container queries'],
    destaques: ['Plano: arraste para deslizar; globo: arraste para girar; + e − dão zoom', 'Esc e clique no vazio fecham o painel', 'Tudo que é texto fica em HTML, fora do canvas', 'Movimento reduzido: sem rotação, ritmo menor, arcos estáticos'],
    metricas: [['16', 'pontos clicáveis'], ['28', 'arcos simultâneos'], ['3×/s', 'atualização do HUD'], ['26', 'testes (simulação, mapa, IBGE, data centers)']],
    skill: 'anim3d-mapas',
    arquivos: ['anim3d-mapas/exemplo/CentroComando3D.tsx', 'anim3d-mapas/exemplo/CentroComando3DCena.tsx', 'anim3d-mapas/exemplo/CentroComandoHud.tsx', 'anim3d-mapas/exemplo/centroComandoSim.ts', 'anim3d-mapas/exemplo/mapaMundi.ts', 'anim3d-mapas/exemplo/mapaPaises.ts', 'anim3d-mapas/exemplo/datacenters.ts', 'anim3d-mapas/exemplo/paisesInfo.ts', 'anim3d-mapas/exemplo/MapaBrasil.tsx', 'anim3d-mapas/exemplo/ibgeBrasil.ts', 'anim3d-mapas/exemplo/dados/ (paises.json, ibge-brasil.json, gerar-dados.mjs)', 'anim3d-mapas/exemplo/centroComando.css'],
    uso: `import { CentroComando3D } from './CentroComando3D';

// padrão: mapa plano; o usuário alterna para o globo no botão do topo
<CentroComando3D rotulo="Ameaças em tempo real" />
<CentroComando3D projecaoInicial="globo" />

// dados reais: troque o avancar(sim, dt) da cena por
// os seus eventos { tipo, origem, destino, vetor, severidade, bloqueado }`,
    prop: 1.6,
    palco: () => <CentroComando3D />,
  },
  {
    id: 'brasil',
    grupo: 'Mapas',
    icone: '◈',
    titulo: 'Mapa do Brasil (IBGE)',
    resumo: 'Estados clicáveis com indicadores oficiais',
    descricao:
      'Mapa coroplético por estado com dados oficiais do IBGE: população e área (Censo 2022), densidade, PIB e PIB per capita (Contas Regionais) e número de municípios. Troque o indicador e o mapa recolore com transição; clique num estado para ver o painel com posição no ranking nacional. Os dados ficam num snapshot local (gerar-dados.mjs atualiza), então funciona offline.',
    tecnicas: ['SVG por estado (malha do IBGE)', 'escala log/linear sequencial', 'projeção com correção de latitude', 'foco e teclado por estado', 'lazy load dos dados'],
    destaques: ['Esc fecha o painel e depois volta ao mundo', 'Mesmo estilo do globo (abre pelo botão no Brasil)', 'Fonte e ano de cada indicador visíveis', 'Pronto para trocar por municípios'],
    metricas: [['27', 'estados'], ['5.571', 'municípios'], ['5', 'indicadores'], ['203 mi', 'habitantes (2022)']],
    skill: 'anim3d-mapas',
    arquivos: ['anim3d-mapas/exemplo/MapaBrasil.tsx', 'anim3d-mapas/exemplo/ibgeBrasil.ts', 'anim3d-mapas/exemplo/dados/ibge-brasil.json', 'anim3d-mapas/exemplo/dados/gerar-dados.mjs'],
    uso: `import { CentroComando3D } from './CentroComando3D';

// abre direto no mapa do Brasil
<CentroComando3D vistaInicial="brasil" />`,
    prop: 1.6,
    palco: () => <CentroComando3D vistaInicial="brasil" />,
  },
  {
    id: 'topologia',
    grupo: 'Redes',
    icone: '⌬',
    titulo: 'Topologia de rede 3D (estilo Packet Tracer)',
    resumo: 'Sala Cofre 3D, telemetria ao vivo e depuração',
    descricao:
      'Editor corporativo de topologia em 3D ambientado em Piso Elevado de Datacenter (Sala Cofre / NOC com placas técnicas modulares, calhas de fibra óptica sob o piso, iluminação clara de engenharia e escura de NOC, e Globo Geodésico de Backbone WAN) com vista 2D de reserva: dispositivos modelados em camadas de altura, cabos que acendem na cor do protocolo ou utilização ao vivo (Mbps), pacote com rastro e estouro no ponto de descarte. Adicione roteadores, switches, firewalls, servidores e computadores, arraste, ligue cabos, conecte telemetria ao vivo (simulada, SSE, WebSocket, polling) e use o modo depurar salto a salto.',
    tecnicas: ['piso elevado de datacenter 3D procedural', 'telemetria ao vivo (SSE/WS/polling)', 'camadas em altura', 'pacote com rastro por Points', 'tráfego proporcional a Mbps', 'câmera orbital própria e enquadramento automático', 'SVG 2D como fallback', 'Dijkstra por latência', 'rastreio salto a salto'],
    destaques: ['O resultado é um objeto de dados (passos com motivo)', 'Telemetria ao vivo validada com sparklines e ranking de enlaces', 'Qualquer edição invalida o rastreio anterior', 'Avisos: IP duplicado e dispositivo isolado'],
    metricas: [['6', 'tipos de dispositivo'], ['4', 'protocolos'], ['4', 'fontes de telemetria'], ['24', 'testes (motor e telemetria)']],
    skill: 'anim3d-topologia',
    arquivos: ['anim3d-topologia/exemplo/Topologia.tsx', 'anim3d-topologia/exemplo/Topologia3DCena.tsx', 'anim3d-topologia/exemplo/telemetria.ts', 'anim3d-topologia/exemplo/fontesDados.ts', 'anim3d-topologia/exemplo/topologiaSim.ts', 'anim3d-topologia/exemplo/topologia.css'],
    uso: `import { Topologia } from './Topologia';
import { tracar } from './topologiaSim';

<Topologia />

// só o motor (sem tela): rastreia um pacote
const r = tracar(topologia, 'pc1', 'srv1', 'http');
// r.status, r.rota, r.passos[].motivo`,
    prop: 1.5,
    palco: () => (
      <div style={{ aspectRatio: '3 / 2', width: '100%' }}>
        <Topologia />
      </div>
    ),
  },
  {
    id: 'rack-empresa',
    grupo: 'Redes',
    icone: '▤',
    titulo: 'Rack de empresa de médio porte',
    resumo: 'Rack 42 U, cabo até a tomada, queda e validação',
    descricao:
      'Rack de TI de uma empresa de ~120 pessoas em 3 andares, modelado com propriedades reais: 15 equipamentos em U, energia e UPS, 9 estações e 3 APs de amostra, patch panels, tomadas e cabos pela eletrocalha e pela prumada. Escolha uma estação e o cabo cresce do PC, passa pela tomada e pelo patch panel e chega à porta do switch, com o comprimento do canal contra o limite de 100 m. Desligue um switch e veja quais andares perdem a conexão; injete defeitos de projeto e a validação aponta cada um. A topologia lógica é derivada dos cabos, nunca desenhada à parte.',
    tecnicas: ['modelo físico com U, W e portas', 'cabo pela eletrocalha (Dijkstra com nó por andar)', 'canal atravessando passivos pela mesma porta', 'topologia lógica derivada dos cabos', 'impacto de falha por sala', 'validação com regras clicáveis', 'InstancedMesh para as portas', 'drawRange proporcional aos metros'],
    destaques: ['O 3D só desenha o modelo: posição, porta e cabo vêm dos motores', 'Rack consistente passa sem achados; o botão de defeitos prova a validação', 'Elevação SVG de 42 U como fallback sem WebGL', 'Amostra declarada: 9 estações dos ~120 pontos'],
    metricas: [['42', 'U no rack (21 usados)'], ['2830 W', 'de 4500 W (63%)'], ['9 + 3', 'estações + APs'], ['4', 'defeitos injetáveis']],
    skill: 'anim3d-infra-fisica',
    arquivos: ['anim3d-infra-fisica/exemplo/RackEmpresa.tsx', 'anim3d-infra-fisica/exemplo/RackEmpresa3DCena.tsx', 'anim3d-infra-fisica/exemplo/empresaDados.ts', 'anim3d-infra-fisica/exemplo/rackEmpresa.css', 'anim3d-infra-fisica/motor/infraFisica.ts', 'anim3d-rede-logica/motor/redeLogica.ts', 'anim3d-infra-validacao/motor/validacao.ts'],
    uso: `import { RackEmpresa } from './RackEmpresa';
import { empresaMedioPorte } from './empresaDados';
import { validarProjeto } from '../../anim3d-infra-validacao/motor/validacao';

<RackEmpresa />

// só os motores (sem tela)
const modelo = empresaMedioPorte();
validarProjeto(modelo); // [] = projeto consistente`,
    prop: 1.5,
    palco: () => (
      <div style={{ width: '100%' }}>
        <RackEmpresa />
      </div>
    ),
  },
  {
    id: 'wifi-cobertura',
    grupo: 'Redes',
    icone: '◎',
    titulo: 'Cobertura Wi-Fi do prédio',
    resumo: 'Mapa de calor com paredes, andares e APs arrastáveis',
    descricao:
      'Planta dos 3 andares do prédio do rack de empresa com paredes por material (drywall, vidro, tijolo, concreto) e os pontos de acesso do mesmo modelo. O mapa é calculado: perda de percurso log-distância, atenuação por parede cruzada e por laje, melhor AP em cada célula. Arraste um AP (ou use as setas), troque entre 2,4 GHz e 5 GHz e veja a sombra atrás do poço do elevador; a onda animada só revela o que já foi calculado. Os números (sinal bom, aceitável, sem sinal) saem do mesmo mapa que é pintado.',
    tecnicas: ['perda log-distância + parede + laje', 'melhor AP por célula', 'canvas 2D (planta)', 'arrastar com pointer capture', 'teclado por AP (setas)', 'onda de revelação', 'tokens CSS no canvas', 'APs vindos do modelo do rack'],
    destaques: ['O mapa nunca é um círculo: o concreto recorta a cobertura', '5 GHz cobre menos que 2,4 GHz e a tela mostra por quê', 'Valores de material declarados como "de partida, sem fonte"', 'Movimento reduzido: mapa completo, sem onda'],
    metricas: [['3', 'andares com planta'], ['2', 'bandas (2,4 e 5 GHz)'], ['5', 'materiais de parede'], ['14', 'testes (motor e planta)']],
    skill: 'anim3d-wifi-rf',
    arquivos: ['anim3d-wifi-rf/exemplo/CoberturaWifi.tsx', 'anim3d-wifi-rf/exemplo/wifiDados.ts', 'anim3d-wifi-rf/exemplo/cobertura.css', 'anim3d-wifi-rf/motor/rf.ts'],
    uso: `import { CoberturaWifi } from './CoberturaWifi';
import { apsDaEmpresa, cobertura } from './wifiDados';

<CoberturaWifi />

// só o motor (sem tela)
const { resumo } = cobertura(apsDaEmpresa(), '5', 0);
resumo.bom; // fração da área com ≥ −67 dBm`,
    prop: 1.5,
    palco: () => (
      <div style={{ width: '100%' }}>
        <CoberturaWifi />
      </div>
    ),
  },
  {
    id: 'molas',
    grupo: 'Motion',
    icone: '〰',
    titulo: 'Mola × curva fixa',
    resumo: 'Por que interrupção pede mola',
    descricao:
      'Cinco molas e uma curva fixa seguem o mesmo alvo. Clique em "Alternar alvo" várias vezes, no meio do movimento: as molas continuam a velocidade e mudam de direção com naturalidade; a curva fixa é reiniciada e "para e arranca". Os gráficos mostram a trajetória de cada preset, o regime (ζ) e o tempo real de assentamento, calculados pelo motor. A mola é analítica: o resultado não depende do FPS.',
    tecnicas: ['mola amortecida analítica', 'independente do FPS', 'continuidade de velocidade', 'regime por ζ', 'rAF com refs (sem estado por quadro)'],
    destaques: ['Sem WebGL e sem dependências', 'Movimento reduzido: vai direto ao alvo', 'Motor testado em Node (14 testes)', 'Presets com personalidade documentada'],
    metricas: [['5', 'presets de mola'], ['14', 'testes do motor'], ['exata', 'independe do FPS'], ['0', 'dependências novas']],
    skill: 'anim3d-motion',
    arquivos: ['anim3d-motion/exemplo/ComparaMolas.tsx', 'anim3d-motion/motor/mola.ts', 'anim3d-motion/motor/linha.ts'],
    uso: `import { MOLAS, passoMola } from './motor/mola';

// a cada quadro (delta em segundos), sem estado do React:
estado = passoMola(MOLAS.padrao, estado, alvo, Math.min(delta, 0.1));
// estado.x é a posição; troque o alvo a qualquer momento: a velocidade continua`,
    palco: () => <ComparaMolas />,
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

const GRUPOS: Exemplo['grupo'][] = ['Mapas', 'Redes', 'Motion', 'Dashboard', 'SaaS', 'Mobile', 'App UI'];
/** Exemplo exibido quando a URL não traz #id (página principal). */
const INICIAL = 'comando';

// ---------- rota pelo hash ----------
const lerHash = () => {
  const h = location.hash.slice(1);
  return EXEMPLOS.some((e) => e.id === h) ? h : INICIAL;
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
  const id = useSyncExternalStore(assinarHash, lerHash, () => INICIAL);
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
