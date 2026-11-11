# Dark Control Room

**Em uma frase:** monitor de sala de controle: escuro, denso, legível, com cor reservada ao que significa algo.

**Para:** monitoramento, segurança, operação, topologia, centros de comando. **Não para:** marketing leve.

## Composição
- **HUD em HTML nos cantos**: título e relógio (topo-esquerda), contadores (topo-direita), feed de eventos (embaixo-esquerda), legenda (embaixo-direita).
- Cena ao centro; **painel de detalhes à direita**, ligado ao ponto clicado por uma **linha de chamada** tracejada.
- Em tela estreita o painel vira gaveta embaixo e o resto some (container query).

## Luz e material
- Quase tudo `MeshBasicMaterial` com `toneMapped: false` (o tone mapping padrão apaga materiais sem luz).
- Fundo: gradiente radial `#0b2236 → #02060b` + grade fina (~44 px, 4% de opacidade) + **linhas de varredura a ~8%** + vinheta.
- Ciano `#22d3ee` como base; severidade em **amarelo `#ffd23f` → laranja `#ff8a3d` → vermelho `#ff3b5c`**; sucesso verde `#3ddc97`.

## Tipografia
Monoespaçada ~11 px, tracking 0,02em; **rótulos em maiúsculas com tracking 0,12em**; números com `tabular-nums`.

## Movimento
Só o que **carrega informação**: arcos/pacotes com cauda, pulsos de impacto, rastro. Nada decorativo contínuo. Cada animação responde "o que isso diz?".

## Sinais de certo × errado
- **Certo:** dá para ler o estado em 2 segundos; vermelho significa algo sempre; o painel responde ao clique.
- **Errado:** tudo ciano (perde hierarquia); texto no canvas; varredura tão forte que cansa; rótulos demais sobrepostos.

## Armadilhas medidas
- Reservar cor por **significado**; se todo elemento brilha, o alerta não se destaca.
- Rótulos de países/cidades: limite por zoom (os N maiores no zoom inicial).
- Scanlines pesadas prejudicam legibilidade: máximo ~8–10%.
- Ferramenta **nunca** cai para o poster por FPS baixo (ver `anim3d-performance-a11y`).

## Custo e degraus
Baixo. Nível 1 → `dpr 1` · Nível 2 → `dpr 0.75`, sem órbitas/grade/partículas de fundo · Nível 3 → igual. **Fallback:** a mesma interface em SVG 2D. **Movimento reduzido:** arcos estáticos, sem pulso.

## Onde está
`anim3d-mapas/exemplo/centroComando.css`, `anim3d-topologia/exemplo/topologia.css`.

## Receita mínima
`anim3d-mapas` ou `anim3d-topologia` + `anim3d-fundamentos` + `anim3d-performance-a11y`.
