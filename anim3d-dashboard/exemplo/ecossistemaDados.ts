// O desenho é dado, não código: um ecossistema novo é outro objeto deste tipo.
export type Modelo = 'saas' | 'mobile' | 'painel' | 'portao' | 'guarita' | 'dw' | 'banco' | 'etl' | 'fonte';
export type TipoPacote = 'pedido' | 'resposta' | 'carga';

export interface No {
  id: string;
  nome: string;
  modelo: Modelo;
  /** Posição no chão (unidades do mundo). */
  x: number;
  z: number;
  /** Linhas do cartão; o rótulo antes de ':' ganha destaque. */
  fluxo: string[];
}

export interface Rota {
  de: string;
  ate: string;
  tipo: TipoPacote;
  /** Partida dentro do ciclo, em segundos (cada pacote leva `duracao`). */
  t: number;
}

export interface DadosEcossistema {
  titulo: string;
  nos: No[];
  rotas: Rota[];
  /** Ciclo total da animação (s). */
  ciclo: number;
  /** Tempo de cada trecho (s). */
  duracao: number;
}

export const ecossistemaExemplo: DadosEcossistema = {
  titulo: 'Ecossistema de dados: aplicações, API, dados e ETL',
  ciclo: 8,
  duracao: 1,
  nos: [
    { id: 'saas', nome: 'SaaS', modelo: 'saas', x: -3.4, z: -4.2, fluxo: ['Escrita: SaaS → portão → transacional', 'Leitura: transacional → portão → SaaS'] },
    { id: 'mobile', nome: 'Mobile', modelo: 'mobile', x: 0, z: -4.2, fluxo: ['Leitura: DW → portão → app', 'Offline: fila local sincroniza ao reconectar'] },
    { id: 'painel', nome: 'Dashboards', modelo: 'painel', x: 3.4, z: -4.2, fluxo: ['Leitura: DW → portão → painel', 'Atualização: a cada carga do ETL'] },
    { id: 'p-saas', nome: 'Portão API', modelo: 'portao', x: -3.4, z: -1.9, fluxo: ['Entrada única do SaaS', 'Valida e encaminha'] },
    { id: 'p-mobile', nome: 'Portão API', modelo: 'portao', x: 0, z: -1.9, fluxo: ['Entrada única do app', 'Limita volume por cliente'] },
    { id: 'p-painel', nome: 'Portão API', modelo: 'portao', x: 3.4, z: -1.9, fluxo: ['Entrada única dos painéis', 'Somente leitura'] },
    { id: 'guarita', nome: 'Guarita', modelo: 'guarita', x: 5.7, z: -1.9, fluxo: ['Segurança: monitora os portões', 'Alerta: comportamento fora do padrão'] },
    { id: 'transacional', nome: 'Transacional', modelo: 'banco', x: -3.4, z: 0.7, fluxo: ['Origem: operação do SaaS', 'Saída: ETL copia para o DW'] },
    { id: 'dw', nome: 'Data Warehouse', modelo: 'dw', x: 1.7, z: 0.7, fluxo: ['Entrada: só pelo ETL', 'Leitura: app e painéis, via portão'] },
    { id: 'etl', nome: 'ETL', modelo: 'etl', x: 1.7, z: 3.3, fluxo: ['Extrai: fontes e transacional', 'Carrega: DW, em lotes'] },
    { id: 'erp', nome: 'ERP', modelo: 'fonte', x: -1.6, z: 5.6, fluxo: ['Fonte: pedidos e faturamento'] },
    { id: 'apis', nome: 'APIs externas', modelo: 'fonte', x: 1.7, z: 5.6, fluxo: ['Fonte: plataformas parceiras'] },
    { id: 'arquivos', nome: 'Arquivos', modelo: 'fonte', x: 5, z: 5.6, fluxo: ['Fonte: planilhas e CSV'] },
  ],
  rotas: [
    { de: 'saas', ate: 'p-saas', tipo: 'pedido', t: 0 },
    { de: 'p-saas', ate: 'transacional', tipo: 'pedido', t: 1 },
    { de: 'transacional', ate: 'p-saas', tipo: 'resposta', t: 2.2 },
    { de: 'p-saas', ate: 'saas', tipo: 'resposta', t: 3.2 },
    { de: 'mobile', ate: 'p-mobile', tipo: 'pedido', t: 0.6 },
    { de: 'p-mobile', ate: 'dw', tipo: 'pedido', t: 1.6 },
    { de: 'dw', ate: 'p-mobile', tipo: 'resposta', t: 2.8 },
    { de: 'p-mobile', ate: 'mobile', tipo: 'resposta', t: 3.8 },
    { de: 'painel', ate: 'p-painel', tipo: 'pedido', t: 4 },
    { de: 'p-painel', ate: 'dw', tipo: 'pedido', t: 5 },
    { de: 'dw', ate: 'p-painel', tipo: 'resposta', t: 6.1 },
    { de: 'p-painel', ate: 'painel', tipo: 'resposta', t: 7 },
    { de: 'erp', ate: 'etl', tipo: 'carga', t: 0.3 },
    { de: 'apis', ate: 'etl', tipo: 'carga', t: 0.9 },
    { de: 'arquivos', ate: 'etl', tipo: 'carga', t: 1.5 },
    { de: 'transacional', ate: 'etl', tipo: 'carga', t: 4.4 },
    { de: 'etl', ate: 'dw', tipo: 'carga', t: 2.6 },
    { de: 'etl', ate: 'dw', tipo: 'carga', t: 5.6 },
  ],
};
