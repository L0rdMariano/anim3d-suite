# Crystal / Glass

**Em uma frase:** vidro e cristal premium, em que a graça está no que se vê **através** do objeto.

**Para:** produto de luxo, hero com lente/esfera, apresentação de material. **Não para:** celular fraco, telas com muitos objetos transparentes.

## Composição
- Objeto **simples e grande** (esfera, lente, torus, prisma): a complexidade vem da refração.
- **Coloque algo atrás** para a refração mostrar: formas coloridas, texto grande em HTML por trás do canvas, grade, gradiente forte. Fundo uniforme torna o vidro invisível.
- Piso com padrão ou brilho para as sombras de luz (caustics falsos).

## Luz
- Ambiente (HDRI/`RoomEnvironment` processado) + **uma luz direcional dura**.
- Contraste alto no fundo: vidro só aparece contra variação.

## Material
`MeshPhysicalMaterial` com:
- `transmission: 1`, `thickness: 0.5–1.5`, `ior: 1.45–1.6` (vidro comum ~1,5; cristal ~1,55+).
- `roughness: 0–0.1` (fosco = `0.15–0.4`), `clearcoat: 1`.
- `attenuationColor` + `attenuationDistance` para tingir pela espessura.
- Dispersão cromática (`dispersion`) só se a versão do `three` em uso suportar; confira antes.

## Movimento
Rotação lenta e flutuação pequena; a refração já anima sozinha. Interação com mouse por mola, sem mover rápido (refração em movimento rápido "treme").

## Caustics (falsos)
Textura animada ou shader aditivo sobre o piso, intensidade baixa. **Não são físicos**; desligam no nível 2.

## Sinais de certo × errado
- **Certo:** o fundo aparece deformado e levemente colorido dentro do objeto; bordas mais claras; sombra de luz no piso.
- **Errado:** objeto "vazio" ou cinza (fundo sem detalhe); plástico leitoso (`roughness` alto, sem ambiente); recortes duros nas bordas.

## Armadilhas medidas
- `transmission` só "enxerga" objetos **opacos**: vidro dentro de vidro não refrata o outro.
- `transmission` faz a cena renderizar em um buffer extra (custo próximo do dobro): use em **1 a 3** objetos.
- Fundo de cor uniforme: nada para refratar.
- Sem *antialias*, as bordas do vidro serrilham.

## Custo e degraus (alto)
Nível 1 → `dpr 1` e resolução menor do buffer de transmissão quando a versão permitir · **Nível 2 → troca `transmission` por material translúcido barato** (`opacity ~0.35`, ambiente, fresnel) e sem caustics · Nível 3 → imagem estática. **Fallback:** imagem do primeiro frame. **Movimento reduzido:** parado.

## Receita mínima
`anim3d-fundamentos` (ambiente, câmera) + `anim3d-motion` (mola) + `anim3d-performance-a11y` (degraus). Marque no cartão da demonstração que é de **alto custo**.
