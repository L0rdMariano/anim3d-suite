# Architectural Brutalism

**Em uma frase:** massa, escala e silêncio; volumes de concreto sob uma luz dura e baixa.

**Para:** arquitetura, infraestrutura, identidade séria e austera, abertura editorial. **Não para:** interfaces leves e brincalhonas.

## Composição
- **Volumes grandes e repetição modular**; ritmo de cheios e vazios.
- Câmera **baixa e/ou diagonal**, olhando para cima (monumentalidade).
- Um elemento pequeno (figura, objeto) para dar **escala**.
- Cor quase ausente: o contraste vem de luz e sombra.

## Luz (protagonista)
- **Uma** luz direcional **baixa e dura**, com sombras longas.
- Ambiente **muito fraco** (hemisférica ≤ 0,2): ambiente alto achata os volumes.
- Sombras: `PCFSoftShadowMap`, mapa 2048; ajuste o **frustum da câmera de sombra à cena** (maior que o necessário serrilha).
- Ciclo do sol lento (20–40 s) como animação principal.

## Material
- `MeshStandardMaterial`, `roughness: 0.9–1`, `metalness: 0`.
- **Concreto**: ruído de baixa frequência + manchas, ou normal map pequeno repetido; cinza com variação sutil (`#8a8a86` a `#a3a29c`). Cinza uniforme parece plástico.

## Movimento
Câmera lenta (dolly ou órbita curta, 20–40 s) e a luz se movendo. Objetos **quase estáticos**: o estilo é peso.

## Sinais de certo × errado
- **Certo:** sombras longas definem os volumes; sensação de escala; poucos tons, muito contraste.
- **Errado:** tudo cinza chapado; sombras serrilhadas; ambiente claro demais; câmera alta e plana (vira maquete).

## Armadilhas medidas
- **Serrilhado/acne de sombra:** ajuste `bias`/`normalBias` e o frustum de sombra.
- Luz ambiente alta apaga o volume.
- Repetição visível da textura: varie a escala/rotação do UV entre faces.

## Custo e degraus
Médio; o custo principal são as sombras.
Nível 1 → mapa de sombra 1024 · **Nível 2 → sem sombras dinâmicas** (sombra "assada" ou gradiente de oclusão na base) · Nível 3 → quadro estático. **Fallback:** imagem do enquadramento principal. **Movimento reduzido:** luz parada no melhor ângulo.

## Receita mínima
`anim3d-fundamentos` (luz, câmera, enquadramento) + `anim3d-cinema` (câmera; planejada) + `anim3d-ambientes` (planejada).
