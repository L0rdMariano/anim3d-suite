# Isometric Worlds

**Em uma frase:** miniaturas e diagramas em projeção isométrica, calmos, modulares e fáceis de ler.

**Para:** arquitetura de sistemas, fluxos, almoxarifado, "ilhas" de serviços, explicações de produto. **Não para:** impacto cinematográfico.

## Composição
- **Câmera ortográfica** em ângulo isométrico (rotação de 45° no eixo vertical, elevação de ~35,264°).
- **Grade modular**: objetos como blocos alinhados; cor por **categoria**, não por decoração.
- Agrupe em "ilhas" com respiro entre elas; a leitura é por regiões.

## Luz
- **Uma direcional** (de cima, ligeiramente de lado) + hemisférica fraca.
- Sombras de contato suaves; contorno opcional por *backface* escalado.
- Cores vindas de **tokens** do produto.

## Movimento
- **Pacotes nos cabos** em instanciamento (um *draw call*); hover **levanta o bloco** por mola e acende os cabos ligados.
- Entrada escalonada (≤ 40 ms entre itens), uma vez por sessão.
- Atualização de dados interpola em ~300 ms; não refaz a cena.

## Sinais de certo × errado
- **Certo:** lê-se a estrutura de relance; o hover revela relações; a cena parece um objeto pequeno e organizado.
- **Errado:** perspectiva (distorce a comparação), rótulos sobrepostos, cores decorativas sem significado.

## Armadilhas medidas
- **Perspectiva estraga a leitura**: mantenha ortográfica e **sem rotação livre**.
- **Rótulos:** em HTML, presos ao 3D por projeção; nunca no canvas.
- Posições fracionárias criam serrilhado: alinhe à grade.
- Fallback é obrigatório: lista ou SVG com os mesmos dados.

## Custo e degraus
Baixo. Nível 1 → `dpr 1` · Nível 2 → sem sombras · Nível 3 → quadro estático. **Fallback:** lista/SVG. **Movimento reduzido:** pacotes parados.

## Onde está
`anim3d-dashboard/exemplo/Ecossistema3D` (dados em `ecossistemaDados.ts`) e `anim3d-dashboard/exemplo/almoxarifado/`.

## Receita mínima
`anim3d-dashboard` + `anim3d-fundamentos`.
