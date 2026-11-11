# Avisos de terceiros

A suíte anim3d é MIT (`LICENSE`). Este arquivo registra o que vem de terceiros, sob qual licença e como cada item é tratado. Licenças de pacotes foram lidas dos `package.json` instalados; itens marcados **a confirmar** são afirmações sobre terceiros que ainda não foram conferidas na fonte original. Este arquivo não é parecer jurídico.

## Dependências (npm)

| Pacote | Versão | Licença | Uso |
|---|---|---|---|
| `three` | 0.187.0 | MIT | cenas 3D |
| `@react-three/fiber` | 9.8.2 | MIT | cenas 3D em React |
| `react`, `react-dom` | 19.3.1 | MIT | interface |
| `topojson-client` | 3.1.0 | ISC | leitura dos polígonos do mapa |
| `world-atlas` | 2.0.2 | ISC | geometria dos países (dados do Natural Earth; **a confirmar** que o Natural Earth está em domínio público, como o projeto declara) |
| `world-countries` | 5.1.0 | **ODbL-1.0** | nomes, capitais, áreas, idiomas, moedas e fronteiras (veja abaixo) |
| `typescript` | 7.0.2 | Apache-2.0 | desenvolvimento |
| `vite`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@types/*` | ver `package.json` | MIT | build e testes (desenvolvimento) |

## Dados

### `world-countries` (ODbL 1.0), autor: Mohammed Le Doze (`mledoze/countries`)

- É usado **somente para gerar** `anim3d-mapas/exemplo/dados/paises.json` (`npm run dados` ou a guarda automática de `npm test`/`npm run demo`).
- Esse arquivo é uma **base derivada** e, por isso, **não é versionado neste repositório** (está no `.gitignore`) e **não é copiado pelo instalador** (`naoInstalar` em `anim3d-mapas/skill.meta.json`), para não ser redistribuído por engano numa pasta `.claude/skills` de projeto.
- **Quem publicar uma build ou demonstração que inclua `paises.json`** deve cumprir a ODbL 1.0: atribuição ("Contém informações de mledoze/countries, licença ODbL 1.0"), manter a licença da base derivada (compartilhamento pela mesma licença) e indicar as alterações. Texto da licença: https://opendatacommons.org/licenses/odbl/1.0/
- Sem `paises.json` a suíte continua funcionando: a guarda gera uma versão mínima sem rede (sem população).

### População de países, Banco Mundial (indicador `SP.POP.TOTL`)

- Entra em `paises.json` apenas quando você roda `npm run dados` com internet. Atribuição: "Fonte: Banco Mundial". Licença do conjunto de dados: **a confirmar** (costuma ser CC BY 4.0).

### IBGE (estados, malha, Censo 2022, Contas Regionais)

- `anim3d-mapas/exemplo/dados/ibge-brasil.json` **é versionado** (dados abertos do IBGE). Atribuição: "Fonte: IBGE" (Censo Demográfico, Contas Regionais, Malhas e Localidades). Termos de uso do portal: **a confirmar**.
- Atualização: `node anim3d-mapas/exemplo/dados/gerar-dados.mjs` (usa a internet).

## Conteúdo da própria suíte

- Texturas, modelos 3D e fontes: **nenhum de terceiros** (os modelos são geometrias geradas por código).
- A lista de hubs de data center (`datacenters.ts`) é uma curadoria própria por cidade, sem marcas.
- Conceitos inspirados em projetos externos (visualizadores de redes multicamada, topologia de rede) foram usados **só como ideia**; nenhum código foi copiado.

## Regra para novas entradas

Dependência, dado, modelo, textura ou fonte novos só entram com licença verificada e uma linha neste arquivo (e em `docs/DECISOES.md` quando for dependência).
