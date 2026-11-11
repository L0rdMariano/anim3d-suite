---
name: anim3d-rede-logica
description: "Topologia lógica e simulação de falhas derivadas da infraestrutura física: patch panel e tomada atravessados pela mesma porta, topologia gerada sozinha a partir dos cabos, impacto de desligar um switch (quais salas e dispositivos perdem conexão), descoberta de equipamentos em ondas, fluxo de pacotes e de sinal. Use ao ligar o modelo físico de rack e cabeamento à rede lógica, simular queda de switch ou enlace, ou animar Network Discovery, Live Packet Flow e Signal Flow, mesmo que o pedido não diga 'anim3d'."
---

# Rede lógica e simulação de falhas

A rede lógica **não é desenhada: é derivada** dos cabos físicos. Desenhar duas vezes (planta e diagrama) produz os dois fora de sincronia. Este skill liga `anim3d-infra-fisica` ao motor de pacotes de `anim3d-topologia`.

Motor testado: `motor/redeLogica.ts`. O pacote salto a salto continua em `anim3d-topologia/exemplo/topologiaSim.ts` (`tracar`, `melhorRota`).

## Workflow

1. Parta de um `ModeloFisico` (ver `anim3d-infra-fisica`).
2. `gerarTopologiaLogica(modelo, ips)` devolve `Topologia` no formato do motor de pacotes. Patch panel e tomada somem; o enlace nasce entre os **ativos** das pontas, com latência pela soma dos trechos (≈5 ns/m em cobre).
3. Rode `tracar(topologia, origem, destino, protocolo)` para o pacote e o modo depurar.
4. Falha: `impactoDeFalha(topologia, idFalho, ancora, salaDe)` devolve `semConexao`, `salasAfetadas` e `salasTotalmenteIsoladas`. A interface pinta salas e hosts, nunca só diz "falhou".
5. Descoberta: `ordemDeDescoberta(topologia, semente)` entrega ondas (`onda 0, 1, 2…`) e o enlace usado: anime uma onda por vez.
6. Valide o resultado com `anim3d-infra-validacao` e entregue com `anim3d-performance-a11y`.

## As animações

| Animação | Entrada do motor | Como mostrar |
|---|---|---|
| **Live Packet Flow** | `Resultado.passos` | partículas por salto, duração ∝ latência (receita em `anim3d-topologia`) |
| **Network Discovery** | `ordemDeDescoberta` | cada onda acende os enlaces `via` e revela os dispositivos da onda; 350–500 ms entre ondas |
| **Failure Simulation** | `impactoDeFalha` | desliga o dispositivo (translúcido), apaga os enlaces dele e escurece em vermelho as salas isoladas; lista textual dos afetados |
| **Signal Flow** | `passos` + trechos físicos | segue o sinal do PC pela tomada, calha e patch panel até o switch e o servidor, mostrando cada segmento físico |

Movimento reduzido: estados finais estáticos (rota acesa, salas afetadas pintadas) e a lista de afetados em texto.

## Armadilhas medidas

- **Passivo virando nó.** Se o patch panel aparecer como dispositivo, todo caminho ganha um salto falso e `tracar` mostra "pc → patch panel → switch". O teste de `gerarTopologiaLogica` garante que o PC liga direto no switch.
- **Porta errada no patch panel.** Cabo na porta 7 da frente e porta 8 do fundo não fecha o enlace. O motor **não inventa** a ligação: o PC fica isolado, que é o que acontece de verdade e o que o usuário precisa descobrir (teste cobre).
- **Sala só "parcialmente" afetada.** Uma sala com um PC ligado a outro switch continua com rede. Reporte `salasAfetadas` e `salasTotalmenteIsoladas` separadas; pintar a sala inteira por um PC sem conexão exagera o impacto.
- **Âncora desligada.** Se a âncora (servidor/internet) é o dispositivo que falhou, todos ficam sem conexão. O motor trata como falha total em vez de lançar erro.
- **Latência física é só ordenação.** O `ms` do enlace vem de 5 ns/m (valor físico), não de medição; serve para escolher a rota, não para prometer tempo de resposta.

## Limites (diga ao usuário)

Isto é um motor próprio de **conectividade lógica**. Não executa o sistema operacional de roteadores e switches, não calcula tabela de VLAN nem protocolo de roteamento. Integração com emuladores de rede é etapa posterior.

## Verificação

1. `npm run verificar` (testes de patch panel, porta errada, isolamento por sala e ondas).
2. Teste visual: derrubar o switch da sala de servidores e conferir o texto dos afetados no painel.

## Checklist

- [ ] Topologia lógica gerada do modelo físico, sem desenho manual paralelo
- [ ] Falha mostra quem perde conexão **e por quê** em texto
- [ ] Passivos não aparecem como dispositivo
- [ ] Limites do simulador declarados na interface

## Próximos passos

- VLAN e segmentos (hoje não modelados).
- Importar topologia real (descoberta por inventário) e comparar com `diferencaComRealidade`.
