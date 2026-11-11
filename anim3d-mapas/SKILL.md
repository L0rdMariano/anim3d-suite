---
name: anim3d-mapas
description: "Mapas e globos interativos: globo 3D com países reais e nomes, arcos de fluxo de dados/ataques estilo sala de controle, clique em país com ficha de informações, mapa coroplético por estado/município (IBGE), dados geográficos (world-atlas, GeoJSON, malhas do IBGE) e painéis HTML presos ao mapa. Use ao criar ou corrigir qualquer mapa, globo, mapa-múndi, mapa do Brasil, centro de comando/SOC, rastreio geográfico ou 'mapa clicável com informações', mesmo que o pedido não diga 'anim3d'."
---

# Mapas e globos

Mapa serve a **localizar e comparar**. A sensação de "sala de controle" vem de movimento com propósito (fluxos, impactos, voo da câmera) sobre geografia **real e legível**, nunca de pontos aleatórios.

Siga antes `anim3d-roteador` (decisão 2D × 3D) e, na entrega, `anim3d-performance-a11y`. Base da cena: `anim3d-fundamentos`. Exemplo completo e testado: `exemplo/` desta skill (abra a galeria: `npm run demo` → `galeria.html#comando` e `#brasil`).

## Escolha a forma

| Pedido | Forma | Por quê |
|---|---|---|
| Fluxos/eventos entre lugares do mundo, "centro de comando", monitoramento | **Mapa plano** (padrão do `exemplo/CentroComando3D`) | Mundo inteiro legível de uma vez, clique fácil, barato, funciona em celular |
| Vitrine, hero, apresentação | **Globo 3D** (mesmo componente, botão Globo) | Impacto visual; metade fica escondida, então não serve para monitorar |
| Comparar um indicador entre regiões/estados | **SVG coroplético** (`exemplo/MapaBrasil`) | Nítido, acessível, sem WebGL; é o fallback natural |
| Muitos itens pontuais (milhares) | Canvas/WebGL instanciado | SVG não aguenta |
| Rota/rastreio de frota | Mapa plano + camada de linhas | O globo só vale com cobertura mundial |

3D no mapa só se justifica por **fluxo e profundidade** (arcos, voo da câmera, extrusão de valor). Para comparar números, o SVG vence.

## Arquitetura (não quebre)

```
dados (JSON snapshot) ─┐
simulação/eventos (TS puro, testável) ─┼─> cena 3D (só desenha) ─┐
                                       └─> HUD em HTML (texto, números, painéis)
```

1. **Dados geográficos viram snapshot local** gerado por script (`exemplo/dados/gerar-dados.mjs`): o exemplo roda offline e o dado tem fonte e data visíveis na tela. **`paises.json` não é distribuído** (é derivado de uma base ODbL 1.0 e o instalador o omite): gere-o com `node exemplo/dados/gerar-dados.mjs --so-paises --offline` (ou sem `--offline`, com internet, para ter população) e, se publicar uma build que o inclua, cumpra a atribuição e o compartilhamento pela mesma licença descritos em `THIRD_PARTY_NOTICES.md` do repositório da suíte. Não dependa de API no clique do usuário.
2. **Eventos vêm de uma função pura** (`centroComandoSim.ts`: `avancar(sim, dt)` devolve eventos; semente determinística). Trocar por dados reais = trocar quem chama. Teste em Node.
3. **Texto e números ficam em HTML**, nunca no canvas: legível, selecionável, acessível. A cena só desenha.
4. **O 3D roda a 60 fps sem passar pelo React.** O HUD atualiza ~3×/s por `setInterval`. Nomes de países/cidades e a linha de chamada são posicionados por `ref` + `style.transform` dentro do `useFrame`.
5. **Dados simulados são marcados** ("SIMULAÇÃO") e fictícios. Nunca apresente ataque simulado como real.

## Receitas prontas (leia o código em `exemplo/`)

- **Plano e globo com os mesmos dados**: um só componente `Mapa` com `plano: boolean`; a textura do mapa é a mesma (equirretangular = plate carrée, `x = lon/180·W/2`, `y = lat/90·H/2`). Muda a malha (`planeGeometry` × `sphereGeometry`), a câmera e a projeção dos rótulos. Simulação, painel, destaque de país e pools de arcos são compartilhados. Ao trocar, `key={projecao}` remonta só a malha, os recursos de GPU ficam no pai (`useEffect(() => () => liberar(o), [o])`) e os pools são **zerados** (as coordenadas dos arcos mudam).
- **Câmera do plano**: perspectiva olhando reto (sem distorção visível). Distância que enquadra o mundo todo na área livre (descontando o painel da direita): `d0 = max(W·1.04/(2·tan(fov/2)·aspecto·livre), H·1.12/(2·tan(fov/2)))`; zoom = fração de `d0`; pan = `cx, cy` com limite `max(0, W/2 − larguraVisível/2)`; a câmera é deslocada para o mapa ficar no centro da área livre, não da tela.
- **Arcos no plano vão DIRETO de ponta a ponta (sem dar a volta pela borda)**: o caminho curto da esfera, desenhado no plano, faz o arco sair por um lado do mapa e reaparecer no outro (EUA → Austrália "some e aparece"). Num mapa plano o arco tem de ser contínuo e visível inteiro: ponto A e ponto B nas suas posições reais, curva por cima (`controle = meio + (0, distância·0.3 + 0.1)`). Não use a rota geodésica no plano.
- **Camada de pontos por país (data centers)**: dados em TS puro ligando cada item ao país pelo **ISO alfa-3** (`datacenters.ts`), nunca por ponto-em-polígono (cidade-estado como Singapura não aparece nos polígonos 1:110m). Um `Points` por projeção (mesmos itens, posições diferentes) com `vertexColors`; ao selecionar o país, **recolora** (selecionados em branco, demais discretos) em vez de recriar geometria, e liga um pool pequeno de rótulos HTML (16) com o nome das cidades. Botão de camada na coluna do zoom. A lista é de **hubs por cidade, sem nome de empresa e declarada não exaustiva** (regra da suíte: conteúdo genérico); para dados reais, troque pela base do projeto.
- **Tamanho dos pontos no plano**: escale o marcador por `camera.position.z / 6.4` para manter o mesmo tamanho em pixels ao dar zoom. Rótulos de país: mostre só os N maiores no zoom inicial (`[16, 36, 46]` por nível), senão sobrepõem as cidades.

- **Globo com mapa real**: textura equirretangular desenhada de polígonos (`mapaMundi.ts: desenharMapa`) numa esfera `MeshBasicMaterial`. Mesma convenção em tudo: `u = (lon+180)/360`, `v = (lat+90)/180`; a fórmula `latLon` do globo coincide com o UV da `SphereGeometry`, então `e.uv` do clique vira lat/lon (`uvParaLatLon`).
- **País sob o clique**: `paisNoPonto(lat, lon)` (ponto-em-polígono com caixa de contorno e buracos). Destaque do hover/seleção numa **segunda textura transparente** (`desenharDestaque`) numa esfera um pouco maior, sem refazer o mapa.
- **Voo até o alvo**: `focoParaAngulos` dá `{pitch, yaw}` que trazem o ponto para a frente mantendo o norte em cima; interpole o yaw com `deltaAngulo` (caminho curto). Com painel lateral, **desloque o globo** (`position.x` negativo em palco largo) para o painel não cobrir o mapa.
- **Arcos de fluxo/ataque**: **pool** fixo de `Line` com `vertexColors` + `setDrawRange` (cabeça cresce, cauda apaga), cabeças num único `Points` aditivo, ondas de impacto num pool de anéis. Nada de criar geometria por evento. `frustumCulled = false` em tudo cujo buffer muda.
- **Ponto clicável**: esfera de acerto invisível maior que o ponto visível, `onClick` com `if (e.delta > 6) return` (distingue clique de arrasto). O corpo do globo chama `stopPropagation` para bloquear o que está do outro lado. `onPointerMissed` do `Canvas` fecha o painel.
- **Arrastar para girar com inércia**: ouça `pointerdown` no canvas e `pointermove/up` na `window`; `touch-action: pan-y` deixa a página rolar no celular.
- **Painel preso ao 3D**: projete o ponto (`Vector3.project`), descarte o que está atrás do horizonte (`dot(normal, direçãoCâmera) < R/dist`) e desenhe a linha de chamada em SVG por cima.
- **Coroplético SVG**: `ibgeBrasil.ts` tem projeção com correção de latitude, `caminho()` por estado, escala log/linear (`normalizar`, `corEscala`) e ranking. Cada estado é `role="button"` com `aria-label` do valor, foco por teclado e Esc.

## Dados: onde buscar e o que quebra

| Preciso de | Fonte | Detalhe medido |
|---|---|---|
| Polígonos de países | `world-atlas` (`countries-110m.json`) + `topojson-client` | `id` = código ISO numérico **como string**; `110m` é leve, use `50m` só se der zoom de perto |
| Nome em português, capital, área, idiomas, moeda, fronteiras | `world-countries` (`ccn3`, `translations.por.common`) | Junte por `ccn3` = `id` do world-atlas; fronteiras vêm em alfa-3 |
| População de países | Banco Mundial `SP.POP.TOTL?mrnev=1` | `world-countries` não traz população |
| Estados e malha do Brasil | IBGE `v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo+json&qualidade=minima` | `codarea` = id da UF |
| População e área por UF | IBGE agregado **4714**, variáveis **93** (população) e **6318** (área) | A variável **614 é densidade**, não área; a 616 devolve erro 500 |
| PIB por UF | IBGE agregado **5938**, variável **37** | Em **mil reais** |
| Nº de municípios | `v1/localidades/municipios` agrupado por UF | Total 5.571 (5.570 + DF) |

Armadilhas dos polígonos:
- **Linha de data (Rússia, Fiji, Antártida):** os anéis vêm cortados em ±180° com saltos horizontais. Ao desenhar, **quebre o caminho** quando `|Δlon| > 180` (`trazerAnel`), senão aparece uma linha atravessando o mapa. Para centro e ponto-em-polígono, **desembrulhe** o anel (`desembrulhar`) e teste também `lon + 360`. Sempre teste Chukotka `(66, -175)`.
- Centro de país = centro do **maior território** (ilhas e exclaves não puxam o rótulo).
- Alguns territórios não têm `id` (Kosovo, Somalilândia): trate como "sem ficha", não quebre.
- Nomes de países no globo: **HTML** projetado, ~45 maiores, opacidade pela frente da esfera.

## Desempenho: nunca "começa e para"

Em ferramenta (mapa, centro de comando), **FPS baixo não pode derrubar a cena para o poster estático**: o usuário vê a animação começar e morrer. Foi o bug real que mais incomodou. Regras:

- `<MonitorQualidade alvo={24} maxNivel={3} aoMudar={setNivel} />`, **sem** `aoFalhar()` por FPS. Só `GuardaContexto` (perda de contexto WebGL) e erro de render levam ao fallback, e o fallback diz o motivo.
- Cada nível **corta custo, não animação**: 1 → `dpr 1` e rótulos a cada 2 quadros; 2 → `dpr 0.75`, sem órbitas/grade, rótulos a cada 3; 3 → igual ao 2. `movimentoReduzido` é só a preferência do usuário, nunca derivado do FPS.
- `dispositivoFraco()` → textura do mapa 2048×1024 em vez de 3072×1536; esferas de 48 segmentos bastam.
- Cena que atualiza buffers por quadro usa `frameloop="always"` + `PausaAutomatica` (para fora da tela).

## SVG: duas armadilhas que estragaram a tela

1. **Altura em % dentro de grid sem altura definida** estoura o SVG (o mapa ficava gigante). Use contêiner absoluto/flex com altura definida e `svg { width:100%; height:100%; max-*:100% }`.
2. **`outline` de foco em elemento SVG escala com o `viewBox`** (anel gigante). Troque por realce de traço: `.uf:focus { outline: none } .uf:focus-visible { stroke:#fff; stroke-width:.3 }`.
3. `all: unset` num botão zera também o `display:grid` de regras anteriores de mesma especificidade: escope as regras (`.cc-br .lista button`).

## Verificação (não diga "funciona" sem ver)

A galeria (`npm run demo`, página principal) abre no Centro de Comando; links diretos `#comando` e `#brasil`.

1. `npm run verificar` (a simulação, o mapa, os países e o IBGE têm testes em Node).
2. Chrome headless via DevTools. **Software WebGL (VM/Windows Server/headless) é lento**: serve para ver layout, clique e fluxo, não para medir FPS. Para testar clique em cena que gira, dispare os eventos **dentro da página, de forma atômica** (`pointermove/down/up/click` no canvas na posição do rótulo lida no mesmo instante), senão a rotação desloca o alvo entre a leitura e o clique.
3. Leia `data-modo` (`cena|reduzido|fallback`) e `data-motivo` do contêiner: mostram se a cena caiu e por quê.
4. Capture em 1440 e 390 de largura; no estreito o painel vira gaveta embaixo (container query).

## Checklist

- [ ] Geografia real (não ruído procedural) e nomes em português
- [ ] Todo ponto/país clicável tem painel com **fonte e ano** dos dados
- [ ] Arcos no plano vão direto de ponta a ponta (nunca somem na borda e reaparecem do outro lado)
- [ ] Teclado: Tab chega nos itens, Enter/Espaço seleciona, Esc fecha
- [ ] Texto e números em HTML; fallback SVG/2D completo
- [ ] Dado simulado marcado como simulação
- [ ] FPS baixo reduz custo, nunca para a animação
- [ ] Testes de Node para dados, projeção, ponto-em-polígono e simulação
- [ ] Verificado no navegador, em largura de desktop e de celular

## Próximos passos (ideias abertas)

Mergulho contínuo da câmera do globo até o Brasil (sem corte), estados extrudados em 3D por indicador, descida até os municípios com busca, dados reais em uma camada, tela cheia e bloom. Ao implementar um deles, acrescente aqui a receita e as armadilhas medidas.
