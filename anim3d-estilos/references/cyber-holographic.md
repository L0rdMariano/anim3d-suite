# Cyber Holographic

**Em uma frase:** interface futurista feita de luz translúcida, em camadas de profundidade.

**Para:** painéis de produto tecnológico, demonstração de dados, abertura de "sistema". **Não para:** conteúdo longo ou que precise de leitura contínua.

## Composição
- Painel principal + satélites menores **flutuando em camadas de profundidade (z)**, com leve parallax.
- Grade ou horizonte discreto no chão; vazio generoso ao redor.
- **Um** foco por vez (o painel ativo); os demais ficam mais apagados.

## Luz
- **Sem luz física.** Tudo é emissivo: `MeshBasicMaterial` com `toneMapped: false`, `blending: AdditiveBlending`, `depthWrite: false`.
- "Luz volumétrica" falsa: cones ou planos com gradiente de alfa decrescente; nunca raymarching para isso.
- Bloom só no nível premium; o estilo não pode depender dele.

## Material (shader próprio)
- **Fresnel** para a borda brilhante: `pow(1.0 - abs(dot(N, V)), 3.0)`.
- **Scanlines** sutis: `0.04–0.08 * sin(y * freq + t)`; frequência alta o bastante para parecer textura, não faixa.
- **Falha rara** (a cada 4–9 s, 80–150 ms): deslocar o UV horizontalmente em faixas. Rara é o que dá efeito; constante vira ruído.
- Opacidade 0,2–0,6; aditivo acumulado estoura em branco.

## Paleta (tokens)
Ciano/azul como base, fundo quase preto azulado, **um** acento quente raro que sinaliza (alerta, seleção). `--cor-holo`, `--cor-holo-forte`, `--cor-alerta`, `--cor-fundo`.

## Movimento
- Flutuação senoidal lenta (±0,05) com **fases diferentes** por painel.
- Entrada: escala + opacidade em ~400 ms (`EASE.entrada`).
- Anéis giram em velocidades **coprimas** (nunca sincronizam, parece vivo).
- Parallax com o mouse ≤ 8°.

## Texto
**Em HTML por cima** da cena (nome, números, rótulos). Texto em shader/canvas some com a escala e não é acessível.

## Sinais de certo × errado
- **Certo:** parece luz, não plástico; bordas brilham, centros são translúcidos; hierarquia clara entre painel ativo e fundo.
- **Errado:** tudo igual e brilhante; cores de arco-íris; branco estourado; texto ilegível.

## Armadilhas medidas
- Ordem de transparência errada (painéis atravessando): use `renderOrder` explícito.
- Muitos planos grandes aditivos → *overdraw* alto; reduza camadas no nível 2.
- Neon em tudo faz o estilo ficar idêntico a qualquer outro neon: reserve o acento.

## Custo e degraus
Baixo (sem texturas pesadas); o risco é *overdraw*.
Nível 1 → `dpr 1` · Nível 2 → menos camadas e sem falha · Nível 3 → estático. **Fallback:** SVG com gradiente e bordas. **Movimento reduzido:** sem flutuação nem falha.

## Onde já existe
HUD do Centro de Comando (`anim3d-mapas/exemplo/centroComando.css`) e rótulos da topologia 3D (`anim3d-topologia/exemplo/Topologia3DCena.tsx`).

## Receita mínima
`anim3d-fundamentos` + `anim3d-motion` (entrada e flutuação) + `anim3d-shaders` (fresnel/scanline; planejada).
