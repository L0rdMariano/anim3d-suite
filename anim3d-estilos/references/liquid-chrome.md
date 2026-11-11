# Liquid Chrome

**Em uma frase:** metal líquido cromado, pesado e contínuo; um objeto herói que reflete o ambiente.

**Para:** produto premium, luxo, hero de marca, abertura de apresentação. **Não para:** informação densa (distrai) nem telas fracas sem versão barata.

## Composição
- **Um** objeto herói, grande, centralizado ou no terço; muito espaço negativo.
- Fundo escuro neutro ou gradiente suave de 2 tons; nada competindo com os reflexos.
- Texto em HTML nas margens; nunca sobre a zona de maior reflexo.

## Luz (é 80% do estilo)
- **O reflexo vem do ambiente**, não de luzes: use `RoomEnvironment` ou um HDRI processado com `PMREMGenerator` (≥ 256 px por face). Sem ambiente decente o cromo vira cinza chapado.
- 2 luzes de **borda (rim)**: uma fria e uma quente, fortes, atrás/ao lado, para desenhar o contorno.
- Zero luz ambiente plana.
- `toneMappingExposure` entre 0,9 e 1,1; `ACESFilmic` para não estourar o branco.

## Material
- `MeshStandardMaterial` ou `MeshPhysicalMaterial`: `metalness: 1`, `roughness: 0.05–0.15`, `envMapIntensity: 1.2–1.8`.
- Cor base **cinza neutro claro** (`#d9dde3`): cor forte "pinta" o reflexo e perde o cromo.
- Opcional: `clearcoat: 1` para um segundo brilho.

## Forma e movimento
- Esfera de alta subdivisão (`IcosahedronGeometry` detalhe 32–64) com **deslocamento por ruído simplex 3D** no vertex shader (2 oitavas), animado no tempo.
- **Recalcule as normais no shader** (diferenças finitas ou derivadas do ruído). Sem isso o brilho "líquido" some e fica fosco.
- Amplitude 15–30% do raio; velocidade do ruído **0,15–0,35** (lento e pesado).
- Reação ao mouse por **mola amortecida** (nunca seguir 1:1): rigidez ~120, amortecimento ~22 (`anim3d-motion`).
- Morph entre formas: interpole posições entre malhas com a **mesma topologia**.

## Câmera
- Lente média (`fov` 30–40), câmera quase parada, deriva mínima. Perspectiva forte deforma o objeto.

## Paleta (tokens)
`--cor-fundo` (quase preto neutro), `--cor-rim-1` (fria), `--cor-rim-2` (quente), `--cor-texto`. **Um** acento nos reflexos; o resto neutro.

## Sinais de certo × errado
- **Certo:** o objeto "tem peso", reflexos com contornos nítidos e gradientes suaves, bordas luminosas definidas.
- **Errado:** parece plástico cinza, reflexo pixelado, brilho estourado em branco, ou "derretendo" (ruído de alta frequência).

## Armadilhas medidas
- Normais não recalculadas → fosco.
- Ambiente de baixa resolução → reflexo pixelado.
- Deslocamento > ~35% do raio → auto-interseção e dobras.
- Exposição alta + ACES → branco estourado.
- Muitas subdivisões em celular → trave; reduza o detalhe.

## Custo e degraus
~40–150 mil vértices, 1 draw call, shader com ruído.
Nível 1 → `dpr 1` e menos subdivisão · Nível 2 → sem deslocamento animado (respira por escala) · Nível 3 → estático. **Fallback:** imagem do primeiro frame. **Movimento reduzido:** forma congelada.

## Receita mínima
`anim3d-fundamentos` (cena, `AmbienteEstudio`) + `anim3d-motion` (mola) + `anim3d-shaders` (ruído; planejada).
