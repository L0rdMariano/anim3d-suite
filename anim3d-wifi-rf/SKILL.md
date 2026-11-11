---
name: anim3d-wifi-rf
description: "Cobertura e propagação Wi-Fi em planta e em vários andares: sinal em dBm por perda de percurso, atenuação por parede (drywall, tijolo, concreto, metal) e por laje, mapa de calor com o melhor ponto de acesso por célula, 2,4 GHz contra 5 GHz. Use ao planejar posição de pontos de acesso, mostrar onda de sinal atravessando paredes e andares, ou animar Wi-Fi Propagation, mesmo que o pedido não diga 'anim3d'."
---

# Wi-Fi e propagação de sinal

O erro típico é desenhar um **círculo** em volta do ponto de acesso. Sinal real é recortado por paredes e lajes. O produto é o **mapa de calor calculado**, e a onda animada só o apresenta.

Motor testado: `motor/rf.ts`. Parede e andar vêm de `anim3d-infra-fisica`. Exemplo completo (planta dos 3 andares do prédio do rack, APs arrastáveis, 2,4 × 5 GHz, onda): `exemplo/CoberturaWifi.tsx` com os dados em `exemplo/wifiDados.ts` (galeria, grupo "Redes").

## Workflow

1. Entre com `AP[]` (posição, andar, potência em dBm), `Parede[]` (segmento, andar, material) e a área.
2. `sinalEm(ap, ponto, paredes, banda)` dá dBm num ponto; `mapaDeCobertura(...)` dá a grade com o **melhor AP** por célula; `percentualCoberto(grade, 'aceitavel')` dá o número do relatório.
3. Pinte com `nivelDe`: bom ≥ −67 dBm, aceitável ≥ −75, fraco ≥ −85, abaixo disso sem sinal. Cores por tokens (`useTokens`), com padrão além da cor (daltonismo).
4. Anime depois (ver abaixo), sempre sobre os valores calculados.

## Animação Wi-Fi Propagation

- Anéis expandem a partir do AP e **desbotam ao cruzar uma parede** (use a perda do material como fração de opacidade perdida, não um corte seco).
- Aplique o anel na grade: cada célula acende quando a frente de onda `t·velocidade` alcança a distância dela; a cor vem do `nivelDe` calculado. Assim a animação nunca contradiz o relatório.
- Entre andares, a laje reduz fortemente o sinal (15 dB em 2,4 GHz, 20 dB em 5 GHz): mostre uma coluna de cor mais fraca no andar de cima.
- Movimento reduzido: o mapa final, estático, com legenda.

## Armadilhas medidas

- **Esfera em vez de mapa.** Mesmo número de dBm numa direção livre e atrás de concreto difere em 12 dB (2,4 GHz). O teste `a parede de concreto divide a cobertura` falha se alguém voltar ao círculo.
- **5 GHz parece "melhor".** Na mesma distância e parede, 5 GHz fica pelo menos 6 dB abaixo de 2,4 GHz atrás de tijolo (teste). Em planta com muitas paredes, 5 GHz precisa de mais APs; diga isso, não esconda.
- **Parede fora do caminho.** Só conta a parede cuja linha AP→ponto realmente cruza o segmento; paredes paralelas ou ao lado não atenuam (teste).
- **Laje conta uma vez por andar.** Dois andares acima = 2 lajes. Distância 3D usa 3 m por andar; sem isso o andar de cima fica melhor que o do lado.
- **Mapa por AP em vez de melhor AP.** Somar APs superestima. Cada célula usa o maior sinal (como o cliente real).
- **Métrica que satura.** Com AP de 20 dBm numa planta de 28 × 16 m, 100% da área já era "aceitável" (−75 dBm) até com o AP trancado na sala de concreto: o exemplo não ensinava nada. A métrica de manchete é **sinal bom** (−67 dBm): 2,4 GHz dá 92%/77%/70% nos três andares e 5 GHz dá 83%/59%/56%.
- **Parede invisível sobre o mapa.** Linha fina da cor do material some sobre o verde do mapa; desenhe um contorno escuro por baixo e faça a espessura crescer com a perda do material.
- **Números fixos de material.** `PERDA_MATERIAL` são valores de planejamento. Medição no local manda; deixe a tabela editável na interface.

## Origem dos números (sem fonte primária registrada)

`PERDA_MATERIAL`, `PERDA_LAJE`, o expoente 3 e os limiares −67/−75/−85 dBm são valores de partida usuais de planejamento, **não** extraídos de uma norma ou datasheet citável aqui. Antes de usar em proposta, confirme com o fabricante do AP ou com um site survey; a tabela é editável por isso.

## Limites (diga ao usuário)

Modelo simplificado (log-distância + paredes). Não calcula reflexão, difração, interferência co-canal nem capacidade/usuários por AP. É para **pré-projeto**, não substitui site survey.

## Verificação

`npm run verificar`; conferir visualmente que mover uma parede muda o mapa na hora.

## Checklist

- [ ] Cobertura calculada, nunca desenhada
- [ ] Legenda em dBm com textos dos níveis
- [ ] Limites do modelo declarados
- [ ] Banda (2,4/5 GHz) escolhível; valores de material editáveis

## Próximos passos

- Canal e interferência entre APs; capacidade por AP.
- Editar o material de cada parede na interface (hoje a tabela é só leitura no exemplo).
- Importar medições reais para calibrar o expoente por ambiente.
