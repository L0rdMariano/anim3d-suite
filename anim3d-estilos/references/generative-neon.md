# Generative Neon

**Em uma frase:** campos, ondas e partículas luminosos gerados por matemática; hipnótico e vivo.

**Para:** fundo de landing, abertura, arte generativa, estados de "processando". **Não para:** dados que precisem de leitura exata (use em apoio, nunca como gráfico).

## Composição
- **Massa com foco**: uma região densa e o resto rarefeito; vazio é parte do desenho.
- Fundo preto ou quase preto; tipografia mínima em HTML.
- Evite simetria perfeita e distribuição uniforme (parece protetor de tela).

## Técnica (o que torna possível)
- `Points` com a **posição calculada no vertex shader** como função de tempo e semente por vértice: **nenhuma atualização de buffer na CPU por quadro**. É isso que permite centenas de milhares de pontos.
- **Curl noise** (rotacional de um campo de ruído) dá fluxo contínuo sem sumidouros; ondas = soma de senos com fase por distância.
- Cor por **velocidade ou idade** da partícula.
- `AdditiveBlending`, `depthWrite: false`, tamanho com atenuação e **mínimo de 1 px**.

## Orçamento (obrigatório declarar)
| Perfil | Pontos |
|---|---|
| Desktop com GPU dedicada | 100–200 mil |
| Notebook com GPU integrada | 40–80 mil |
| Celular | 10–20 mil |
Degraus: 200k → 60k → 15k.

## Cor
2 a 3 matizes **análogos** + variação de brilho. Evite arco-íris; evite neon saturado em tudo (um acento).

## Movimento
Uma única variável de tempo (`uTempo`) controla tudo; com **movimento reduzido**, congele em um instante bonito (nunca em `t = 0`, que costuma ser uma nuvem vazia). Reação ao cursor: repulsão suave por mola, não por teleporte.

## Sinais de certo × errado
- **Certo:** estruturas que emergem e se desfazem, profundidade pela densidade, brilho concentrado no foco.
- **Errado:** nuvem uniforme, pontos grandes borrados, tudo branco no centro, cores de festa.

## Armadilhas medidas
- **Fill-rate:** pontos grandes sobrepostos são o gargalo, não a contagem de pontos. Limite o tamanho.
- `gl_PointSize` tem teto no hardware: pontos grandes ficam cortados.
- **Precisão do ruído com `t` grande:** use `mod(t, período)` ou o padrão degrada com o tempo.
- Aditivo sobre fundo claro não funciona: o estilo exige fundo escuro.

## Custo e degraus
Médio a alto. Nível 1 → `dpr 1` · Nível 2 → 30% dos pontos e sem bloom · Nível 3 → 15 mil e tempo congelado. **Fallback:** gradiente CSS com ruído estático. Bloom é opcional (premium), nunca requisito.

## Receita mínima
`anim3d-particulas` e `anim3d-shaders` (planejadas) + `anim3d-fundamentos` + `anim3d-performance-a11y`.
