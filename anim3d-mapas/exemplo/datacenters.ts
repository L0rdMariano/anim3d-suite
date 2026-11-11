// Hubs de data center por país: lista CURADA de cidades onde há grande concentração de infraestrutura.
// Não é exaustiva nem contagem oficial, e não cita empresas: troque por sua base real (CMDB, inventário de nuvem).
// Cada item liga ao país pelo código ISO alfa-3 (o mesmo de `paisesInfo`), então a camada funciona nas duas projeções.

export interface DataCenter {
  id: string;
  cidade: string;
  /** ISO 3166-1 alfa-3 do país */
  pais: string;
  lat: number;
  lon: number;
}

type Linha = [cidade: string, pais: string, lat: number, lon: number];

const HUBS: Linha[] = [
  // América do Norte
  ['Ashburn', 'USA', 39.04, -77.49], ['Dallas', 'USA', 32.78, -96.8], ['Chicago', 'USA', 41.88, -87.63],
  ['Vale do Silício', 'USA', 37.34, -121.89], ['Los Angeles', 'USA', 34.05, -118.24], ['Phoenix', 'USA', 33.45, -112.07],
  ['Atlanta', 'USA', 33.75, -84.39], ['Nova York', 'USA', 40.78, -74.07], ['Quincy', 'USA', 47.23, -119.85],
  ['Hillsboro', 'USA', 45.52, -122.99], ['Miami', 'USA', 25.76, -80.19],
  ['Toronto', 'CAN', 43.65, -79.38], ['Montreal', 'CAN', 45.5, -73.57], ['Querétaro', 'MEX', 20.59, -100.39],
  // América do Sul
  ['São Paulo', 'BRA', -23.55, -46.63], ['Campinas', 'BRA', -22.91, -47.06], ['Rio de Janeiro', 'BRA', -22.91, -43.17],
  ['Fortaleza', 'BRA', -3.73, -38.52], ['Porto Alegre', 'BRA', -30.03, -51.23], ['Brasília', 'BRA', -15.79, -47.88],
  ['Santiago', 'CHL', -33.45, -70.67], ['Buenos Aires', 'ARG', -34.6, -58.38], ['Bogotá', 'COL', 4.71, -74.07], ['Lima', 'PER', -12.05, -77.04],
  // Europa
  ['Londres', 'GBR', 51.51, -0.13], ['Frankfurt', 'DEU', 50.11, 8.68], ['Amsterdã', 'NLD', 52.37, 4.9], ['Paris', 'FRA', 48.86, 2.35],
  ['Marselha', 'FRA', 43.3, 5.37], ['Dublin', 'IRL', 53.35, -6.26], ['Madri', 'ESP', 40.42, -3.7], ['Sines', 'PRT', 37.96, -8.87],
  ['Lisboa', 'PRT', 38.72, -9.14], ['Milão', 'ITA', 45.46, 9.19], ['Zurique', 'CHE', 47.38, 8.54], ['Estocolmo', 'SWE', 59.33, 18.07],
  ['Oslo', 'NOR', 59.91, 10.75], ['Helsinque', 'FIN', 60.17, 24.94], ['Varsóvia', 'POL', 52.23, 21.01], ['Viena', 'AUT', 48.21, 16.37],
  ['Copenhague', 'DNK', 55.68, 12.57], ['Bruxelas', 'BEL', 50.85, 4.35], ['Praga', 'CZE', 50.08, 14.44], ['Bucareste', 'ROU', 44.43, 26.1],
  ['Sófia', 'BGR', 42.7, 23.32], ['Atenas', 'GRC', 37.98, 23.73], ['Kiev', 'UKR', 50.45, 30.52], ['Moscou', 'RUS', 55.76, 37.62], ['Istambul', 'TUR', 41.01, 28.98],
  // Oriente Médio e África
  ['Dubai', 'ARE', 25.2, 55.27], ['Riade', 'SAU', 24.71, 46.68], ['Tel Aviv', 'ISR', 32.09, 34.78], ['Doha', 'QAT', 25.29, 51.53],
  ['Joanesburgo', 'ZAF', -26.2, 28.05], ['Cidade do Cabo', 'ZAF', -33.92, 18.42], ['Lagos', 'NGA', 6.52, 3.38],
  ['Nairóbi', 'KEN', -1.29, 36.82], ['Cairo', 'EGY', 30.04, 31.24], ['Casablanca', 'MAR', 33.57, -7.59],
  // Ásia
  ['Singapura', 'SGP', 1.35, 103.82], ['Tóquio', 'JPN', 35.68, 139.69], ['Osaka', 'JPN', 34.69, 135.5], ['Seul', 'KOR', 37.57, 126.98],
  ['Hong Kong', 'CHN', 22.32, 114.17], ['Pequim', 'CHN', 39.9, 116.41], ['Xangai', 'CHN', 31.23, 121.47], ['Cantão', 'CHN', 23.13, 113.26],
  ['Mumbai', 'IND', 19.08, 72.88], ['Chennai', 'IND', 13.08, 80.27], ['Nova Délhi', 'IND', 28.61, 77.21], ['Bangalore', 'IND', 12.97, 77.59],
  ['Jacarta', 'IDN', -6.21, 106.85], ['Kuala Lumpur', 'MYS', 3.14, 101.69], ['Bangcoc', 'THA', 13.76, 100.5], ['Manila', 'PHL', 14.6, 120.98],
  ['Ho Chi Minh', 'VNM', 10.82, 106.63], ['Taipé', 'TWN', 25.03, 121.57], ['Carachi', 'PAK', 24.86, 67.0], ['Daca', 'BGD', 23.81, 90.41],
  // Oceania
  ['Sydney', 'AUS', -33.87, 151.21], ['Melbourne', 'AUS', -37.81, 144.96], ['Perth', 'AUS', -31.95, 115.86], ['Auckland', 'NZL', -36.85, 174.76],
];

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const DATACENTERS: DataCenter[] = HUBS.map(([cidade, pais, lat, lon]) => ({
  id: `${pais.toLowerCase()}-${semAcento(cidade).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  cidade,
  pais,
  lat,
  lon,
}));

/** Hubs do país (código ISO alfa-3), na ordem da lista. */
export const dataCentersDoPais = (alfa3: string): DataCenter[] => DATACENTERS.filter((d) => d.pais === alfa3);
