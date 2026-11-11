# Inspirações de produto (ideias, não código)

Verificado por busca pública em 2026-11-11. O texto original do pedido citava cinco nomes; **três não foram encontrados** e não devem ser citados como referência.

## Confirmados

| Produto | O que tem de útil para esta suíte | Fonte | Licença |
|---|---|---|---|
| **Pathfinder** (tripunkt) | hierarquia local → prédio → andar → sala, armários/racks com componentes, cabos de instalação e de manobra em gestão separada, planta (DWG/SVG) como fundo | [documentação do produto](https://tripunkt.atlassian.net/wiki/spaces/PMEN/pages/31752195/Visualization) | produto **comercial** (não é código aberto) |
| **NetBox Visual Explorer** (NetBox Labs) | planta com racks em escala (2D/3D), elevação de rack, cadeias de energia, topologia de cabos e L2/L3 a partir do inventário; só o editor de planta grava no NetBox | [documentação](https://netboxlabs.com/docs/visual-explorer/) e [lançamento](https://netboxlabs.com/blog/see-your-infrastructure-introducing-netbox-visual-explorer/) | em prévia para clientes do NetBox Cloud; termos **a confirmar** |

## Alternativas abertas encontradas (licença ainda a confirmar)

| Projeto | Ideia | Fonte |
|---|---|---|
| rackpad (Kobii-git) | rastrear de sala a rack a porta de switch por documentação de cabos e patch panels; o patch panel liga porta frontal e traseira de mesmo nome (a mesma regra que `anim3d-rede-logica` usa) | [VISUALIZER.md](https://raw.githubusercontent.com/Kobii-git/rackpad/main/docs/VISUALIZER.md) |
| netbox-floorplan-plugin | plantas gráficas para o NetBox | [PyPI](https://pypi.org/project/netbox-floorplan-plugin) |
| netbox-map | planta, uso de rack, rastreio de cabo | [documentação](https://dendanskemine.github.io/netbox-map/) |

"Licença a confirmar" significa que o repositório do projeto ainda não foi lido para registrar a licença. Até lá, **nenhum código ou asset** deles é usado.

## Não localizados (não citar)

**Railyard**, **IMRACK 3D** e **DC Explorer** não apareceram em busca pública como produtos. Podem ser nomes imprecisos. Se você souber o fabricante ou o link, acrescente aqui com autor, URL e licença; até lá, o que foi atribuído a eles (porta como unidade de conexão, planta interativa com cabos animados, exploração 3D) está coberto pelas referências acima ou é ideia própria da suíte.

## O que se aproveita

Conceitos: porta como unidade de conexão, o inventário como fonte única, a vista física e a lógica do mesmo dado, e a regra de patch panel (mesma porta frontal e traseira). Tudo implementado com o motor próprio da suíte.
