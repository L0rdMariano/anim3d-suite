# Animações da infraestrutura física

Todas dependem do `caminho` do cabo ou do modelo; nenhuma inventa geometria própria.

## Cable Routing (rack → eletrocalha → tomada)
- Entrada: `Cabo.caminho` (`rotearPelaEletrocalha`). Comprimento acumulado por trecho; `t∈[0,1]` vira distância `t·total`.
- Desenho: o cabo "cresce" (`TubeGeometry` com `drawRange`, ou máscara por distância) e uma luz pequena corre na ponta. Etiqueta HTML com `rack/porta → tomada` e metros.
- Câmera acompanha a ponta com atraso (mola em `anim3d-motion`), nunca colada.
- Movimento reduzido: cabo inteiro parado e etiqueta fixa.
- `TubeGeometry` amostra a curva por `getPointAt` (distância real), então o `drawRange` é proporcional aos **metros**; o `count` de índices é arredondado para baixo a um múltiplo de `segmentosRadiais × 6` (um segmento inteiro). Implementação: `exemplo/RackEmpresa3DCena.tsx` (`CaminhoAnimado`).
- Raio do tubo depende da vista: 14 mm funciona no rack e some a 42 m no prédio (usado 0,1 m).

## Exploded Infrastructure (proposta, não implementada)
- Cada nível (parede, mobiliário, rack, equipamento, cabo) recebe um deslocamento radial a partir do centro da sala; `t` interpola de 0 (montado) a 1 (explodido) com mola amortecida.
- Ordem (coreografia): paredes primeiro, depois racks, por fim equipamentos, com atraso de 60–90 ms entre grupos (`anim3d-motion`).
- Linhas finas ligam a peça à posição original para o usuário saber a que sala/rack ela pertence.
- **Não implementado ainda** (receita proposta, sem exemplo nem teste): trate como hipótese até virar código.

## Building Walkthrough (proposta, não implementada)
- Percurso = lista de pontos de câmera (porta, corredor, sala de servidores) com tempo por trecho; câmera em curva (Catmull-Rom), olhar sempre ao próximo alvo.
- Paredes entre a câmera e o alvo ficam translúcidas, não cortadas.
- Pausa em pontos de interesse com ficha HTML (rack, U, potência).
- Em celular fraco, trocar por saltos de câmera entre pontos (sem percurso contínuo).
