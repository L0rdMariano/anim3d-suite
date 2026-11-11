# Organic Biomorphic

**Em uma frase:** formas naturais, macias e vivas, que respiram e nunca se movem em sincronia perfeita.

**Para:** saúde, bem-estar, natureza, marcas acolhedoras, estados de "carregando" calmos. **Não para:** informação técnica densa.

## Composição
- **Uma forma central assimétrica** com satélites menores em escalas diferentes.
- Curvas, nenhum ângulo reto; vazio generoso.
- Paleta terrosa ou pastel; fundo suave (não preto).

## Luz
- Luz **macia e difusa** (hemisférica forte + uma direcional suave); sombras suaves ou ausentes.
- Borda levemente luminosa nas partes finas (simula translucidez).

## Material
- `MeshPhysicalMaterial` com `roughness: 0.4–0.6` e `sheen` ou `transmission` leve.
- **Subsurface falso:** fresnel colorido (tom mais quente/saturado que a base) + emissivo suave nas bordas finas.
- Cor com **gradiente** na superfície (por altura ou normal), não uma cor chapada.

## Forma
- Deslocamento por ruído de **baixa frequência** + componente de respiração.
- Metaballs de verdade (campo implícito/marching cubes) são caras; alternativas baratas: várias esferas com suavização de contorno em shader, ou ruído sobre uma malha só. *Raymarching* só em resolução reduzida (0,5×).

## Movimento (a identidade do estilo)
- **Respiração** com período de 4–6 s, ease in-out.
- **Defasagem (stagger)** entre as partes: nunca em fase.
- Ondulações pequenas e irregulares; nada linear; nada rápido.

## Sinais de certo × errado
- **Certo:** parece vivo, "pesa" e se acomoda; partes respondem com atraso diferente.
- **Errado:** parece mecânico (sincronia perfeita), "derretendo" (ruído de alta frequência), ou saturado demais.

## Armadilhas medidas
- Todas as partes com a mesma fase e período → mecânico.
- Ruído com frequência alta → aparência de tecido rasgado.
- Cor saturada e uniforme perde o orgânico: use gradiente e tons próximos.

## Custo e degraus
Moderado. Nível 1 → menos subdivisão e `dpr 1` · Nível 2 → sem deslocamento por ruído (respira só por escala) · Nível 3 → estático. **Fallback:** SVG com blobs e gradientes. **Movimento reduzido:** forma parada em pose relaxada.

## Receita mínima
`anim3d-fundamentos` + `anim3d-motion` (respiração com defasagem; stagger) + `anim3d-shaders` (ruído; planejada).
