---
name: anim3d-infra-validacao
description: "Validação de consistência, documentação técnica e sincronia projeto × rede real em projetos de infraestrutura de TI: rack com U sobreposto, porta inexistente ou duplicada, cabo de cobre acima de 100 m, rack acima da capacidade elétrica, inventário, planta e diagrama a partir do mesmo modelo, e comparação projeto contra rede real. Use ao conferir se um projeto de rack/cabeamento/sala é possível, gerar inventário ou planta técnica, ou comparar o projeto com a rede real (gêmeo digital do projeto), mesmo que o pedido não diga 'anim3d'."
---

# Validação, documentação e gêmeo digital

Um projeto 3D bonito e impossível é pior que um feio e correto. Este skill roda **regras sobre o modelo** e devolve achados clicáveis; a documentação sai do mesmo dado.

Motor testado: `motor/validacao.ts`. Modelo em `anim3d-infra-fisica`.

## Workflow

1. `validarProjeto(modelo)` devolve `Achado[]` = `{ regra, severidade, objeto, mensagem }`. Mostre como lista que **seleciona o objeto** no 3D e acende o item.
2. Bloqueie a entrega com `erro`; `aviso` informa. Nunca esconda um achado atrás de "projeto inválido" genérico.
3. `inventario(modelo)` gera a tabela (rack, U, watts, portas usadas/total) para exportar em CSV.
4. **Planta técnica e diagrama de rede** saem do mesmo modelo: a planta é vista ortográfica de cima com cotas e legenda; o diagrama usa `gerarTopologiaLogica` (`anim3d-rede-logica`). Dados em um lugar só.
5. **Gêmeo digital**: `diferencaComRealidade(modelo, observado)` compara o projeto com o que a rede reporta (equipamentos e cabos `a:porta|b:porta`) e separa ausentes, desconhecidos e não documentados.

## Regras implementadas

| Regra | Severidade | Critério |
|---|---|---|
| `rack-sobreposicao` / `rack-fora` | erro | U ocupado por dois equipamentos; passa do topo |
| `energia-rack` | aviso > 80% · erro > 100% | soma de `potenciaW` instalada × capacidade |
| `porta-inexistente` / `porta-duplicada` | erro | porta fora de `1..portas`; dois cabos na mesma porta (patch panel e tomada aceitam 2) |
| `cabo-comprimento` | erro | cobre acima de 100 m (inclui folga); fibra isenta |
| `cabo-orfao` | erro | aponta para equipamento que não existe |
| `sem-rack` / `tomada-sem-cabo` | aviso | ativo de rack sem instalação; tomada sem cabo |

Para regra nova: uma função pura que recebe o modelo e devolve achados, com um teste que **falha** e um que passa.

## Armadilhas medidas

- **Patch panel marcado como porta duplicada.** A porta recebe cabo frontal e traseiro; contar 2 como erro reprova todo projeto correto. O limite é 2 só para passivos (teste cobre).
- **Potência de passivo.** Patch panel e tomada têm 0 W. Se herdarem o padrão de um ativo, o rack parece estourar o limite (aconteceu no teste).
- **Comprimento sem folga.** O limite de 100 m é do canal; sem os 1,5 m por ponta, cabos de 99 m passam e falham no campo. Teste: 99 m de caminho + folga é erro.
- **Observado em ordem diferente.** O mesmo cabo pode vir `a|b` ou `b|a`; compare por chave ordenada, senão tudo vira "não documentado".
- **Validar só na entrega.** Valide a cada edição (é barato, O(n)); o usuário precisa ver o erro no momento em que o cria.

## Limites (diga ao usuário)

Regras de projeto básicas, **não** substituem norma técnica, laudo ou responsável técnico. Dimensionamento elétrico detalhado (disjuntores, queda de tensão) não está modelado.

## Verificação

`npm run verificar`; confirmar que cada achado seleciona o objeto e que o inventário bate com o rack mostrado.

## Checklist

- [ ] Todo achado aponta um objeto e diz o motivo em texto
- [ ] Planta e diagrama vêm do mesmo modelo
- [ ] Limites normativos declarados
- [ ] Regra nova com teste que falha e teste que passa

## Próximos passos

- Regras de energia por circuito e por PDU; redundância A/B.
- Exportar planta (SVG) e relatório (PDF) a partir do modelo.
