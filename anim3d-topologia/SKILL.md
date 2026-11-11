---
name: anim3d-topologia
description: "Editor e simulador de topologia de rede em 3D (com vista 2D) estilo Cisco Packet Tracer: dispositivos (roteador, switch, firewall, servidor, PC, internet), cabos, pacote animado percorrendo a rota e modo depurar salto a salto mostrando onde e por que o pacote foi entregue ou descartado. Use ao criar diagrama de rede interativo, simulador de pacotes, tela de troubleshooting, editor de topologia ou qualquer grafo de dispositivos com fluxo animado e falhas simuladas, mesmo que o pedido não diga 'anim3d'."
---

# Topologia de rede interativa

Duas coisas distintas: **desenhar a rede** (editor) e **entender o que acontece com um pacote nela** (simulação + depuração). O valor está na segunda: o usuário aprende quando vê **onde** e **por que** o pacote parou.

Exemplo completo, testado e visível na galeria (`npm run demo`, grupo "Redes"): `exemplo/` desta skill. Siga também `anim3d-roteador` e, na entrega, `anim3d-performance-a11y`.

## Escolha a tecnologia

| Caso | Use | Por quê |
|---|---|---|
| Editor e simulador com impacto visual (padrão) | **3D** (R3F, `exemplo/Topologia3DCena.tsx`) + **SVG 2D como fallback** | Camadas em altura, rastro do pacote e câmera dão leitura e "vida"; o 2D garante sem WebGL, teclado e celular fraco |
| Edição precisa, tela fraca ou acessibilidade máxima | **SVG 2D** (`exemplo/Topologia.tsx`, botão 2D) | Nítido, foco por dispositivo, texto selecionável |
| Diagrama explicativo de arquitetura, só leitura | isométrico 3D (`anim3d-dashboard`, `Ecossistema3D`) | Profundidade ajuda a explicar camadas |
| Centenas a milhares de nós | Canvas/WebGL instanciado | A malha por dispositivo pesa acima de ~300 nós |

Os dois modos usam **o mesmo motor e o mesmo estado**: o componente pai é dono dos dados (`topo`, `sel`, `resultado`, `anim`); a cena 3D só desenha e devolve eventos (clique, arrastar, fim de salto). O SVG é o `fallback` do `Cena3DSegura`: sem WebGL a mesma tela continua funcionando.

## Arquitetura (não quebre)

```
topologia (dados JSON) ──> motor puro (topologiaSim.ts) ──> Resultado { status, rota, passos[], motivo }
                                                         └─> interface só desenha e anima os passos
```

1. **O motor não conhece tela.** `tracar(topologia, origem, destino, protocolo)` devolve um objeto de dados; testes rodam em Node. A tela percorre `passos`.
2. **O resultado é a explicação.** Cada `Passo` tem `de`, `para`, `enlace`, `ms`, `acao` (`encaminhou`/`descartou`) e `motivo`. O modo depurar é só "mostrar o passo N"; a lista de passos em HTML é também o relato acessível.
3. **Rota = Dijkstra por latência** só sobre enlaces ativos e dispositivos ligados. Sem rota viva, **caminhe pela rota pretendida** (`melhorRota(..., somenteVivos=false)`) e pare no **primeiro defeito**, dizendo qual (enlace caído entre X e Y, X desligado). Nunca diga só "sem rota": o motivo é o produto.
4. **Firewall age sobre o pacote que ENTRA nele** (regra por protocolo). Motivos de descarte padrão: dispositivo desligado, enlace caído, regra de firewall, sem rota, origem = destino.
5. **Edição é função pura** (`ligar`, `remover` devolvem topologia nova). **Qualquer edição que muda a rede invalida o resultado anterior** (mover dispositivo não): senão a tela mostra um rastreio de uma rede que já não existe.
6. **Validação a parte** (`validar`): IP duplicado (erro), dispositivo isolado e host sem IP (aviso), enlace órfão. Mostre como lista clicável que seleciona o dispositivo.

## Receitas (leia o código em `exemplo/`)

- **Arrastar sem biblioteca**: `onPointerDown` guarda o deslocamento (`ponto do dispositivo − ponto do cursor`) e chama `setPointerCapture`; `onPointerMove` converte a posição com `svg.getScreenCTM().inverse()` (nunca `clientX` direto: o `viewBox` escala). Movimento < 4 px conta como **clique**, não arrasto.
- **Ligar cabos**: modo "Ligar cabos"; o primeiro clique marca o dispositivo (halo amarelo), o segundo cria o enlace. `ligar` ignora duplicado e laço.
- **Pacote animado**: um salto por vez; a posição vai por **`ref` + `requestAnimationFrame`** (`setAttribute('transform')`), sem re-render por quadro. O React só troca o índice do passo ao fim de cada salto. Duração ∝ latência do enlace (`clamp(280 + ms·22, 380, 950)`), com easing de partida e chegada.
- **Descarte visível**: o pacote chega ao dispositivo, pulsa em vermelho e aparece um **X** com halo; entregue = halo verde. Os enlaces já percorridos acendem na cor do protocolo.
- **Derrubar enlace**: clique no cabo (use uma `line` transparente larga como alvo de clique, `stroke-width: 16`), alternar "Enlace ativo"; o cabo cai tracejado em vermelho com "✕ caído".
- **Teclado**: cada dispositivo é `role="button"` com `tabIndex=0` e `aria-label` (tipo, nome, IP, desligado). Enter/Espaço seleciona, **setas movem** (Shift = passo maior), Delete remove. O `outline` de foco de elementos SVG escala com o `viewBox`: use realce de traço/halo, não `outline` grande.
- **Persistência**: topologia é JSON simples (`{ disps, enlaces }`); copiar e carregar JSON já cobre compartilhar e versionar.

## Vista 3D (receitas)

- **Camadas em altura**: o editor guarda `x, y` 2D; no mundo 3D isso vira o chão (`x`, `z`) e o **tipo** define a altura (internet 2,6 · firewall 1,2 · roteador 1,0 · switch 0,5 · hosts 0). Uma haste fina e um disco no chão ancoram cada dispositivo e deixam a altura legível; os cabos inclinam sozinhos. Arrastar move só (`x`, `z`): `e.ray.intersectPlane` com um plano horizontal na altura do dispositivo, convertido de volta ao espaço do editor.
- **Modelos procedurais** (cilindro + anel + antenas = roteador; caixa + portas = switch; tijolos = firewall; módulos empilhados com LEDs = servidor; monitor = PC; esferas translúcidas = internet). Sem `.glb`: carregam na hora, recolorem por estado e são fáceis de trocar. LEDs piscam; desligado vira translúcido e sem brilho.
- **Pacote**: esfera + halo aditivo + **rastro de 10 posições** num `Points` com `vertexColors` (preto = invisível no aditivo). O salto dura ∝ latência. O pai troca o índice do passo só no **fim do salto** (`aoFimSalto`), então a animação 3D conduz o mesmo estado do 2D e do painel de passos.
- **Descarte e entrega**: onda de anel que se expande (vermelha ou verde), tremor curto do dispositivo e pacote que pulsa no lugar. Efeitos vivem num `ref` (mapas `alerta`/`entrega` com o instante), nunca em estado do React.
- **Tráfego de fundo**: um único `Points` com ~150 partículas andando nos enlaces ativos (as de enlace caído somem). Corte em `nivel >= 2` e com movimento reduzido.
- **Cabo caído**: vermelho piscando. Cabo percorrido: mais grosso, na cor do protocolo, com brilho aditivo.
- **Câmera orbital própria** (sem `drei`): arrastar o fundo gira; **a roda só dá zoom com Ctrl/Cmd** (a roda sozinha rola a página); botões + − ⟲. Arrastar um dispositivo **não** gira a câmera: a cena marca `ocupado` no `pointerdown` do dispositivo e o orbital ignora o movimento. Deriva lenta só quando nada acontece.
- **Enquadramento automático**: distância `24·(1,5/aspecto)^0,9`, recalculada ao redimensionar enquanto o usuário não mexeu no zoom; ⟲ volta a ela. Distância fixa cortava dispositivos nas bordas em palco estreito.
- **Rótulos em HTML** projetados por `ref` no `useFrame` (nome e IP legíveis, selecionáveis), e uma **lista de botões** escondida (visível ao foco) como alternativa de teclado e leitor de tela: o 3D não tem foco por dispositivo.
- **Desempenho**: `MonitorQualidade alvo={24} maxNivel={3}` sem cair para o 2D por FPS (só perda de contexto ou erro); nível 1 → `dpr 1`, nível 2 → `dpr 0.75` e sem partículas de fundo.

## Armadilhas medidas

- **Escala do mundo 3D**: com 38 px por unidade os dispositivos ficaram amontoados e os rótulos se sobrepunham; 29 px resolveu. Teste com a topologia de exemplo, não com 3 nós.
- **Espaço de coordenadas pequeno demais ou grande demais**: com `viewBox` 1000×620 num palco de 480 px o texto virou 6 px. Escolha o `viewBox` perto do tamanho real de exibição (760×480) e fontes de 11–14 unidades.
- **Resultado velho na tela**: sempre zere o rastreio ao editar a rede (receita 5).
- **Animação sem fim de estado**: ao terminar, deixe o marcador (X ou halo verde) e a lista com o passo final; não apague tudo.
- Dois `Dijkstra` iguais com empate de latência: o resultado deve ser determinístico (teste a rota esperada).

## Verificação

1. `npm run verificar` (o motor tem testes de rota, firewall, enlace caído, desligado, rota alternativa, desconectado, edição e validação).
2. Chrome headless via DevTools: enviar pacote, ver `.tp-status`, trocar protocolo para SSH (firewall descarta), derrubar o enlace e usar o depurar. Para trocar `<select>` em React por script, use o setter nativo (`Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set`) e dispare `change`.
3. Capture em 1440 e 390 de largura.

## Checklist

- [ ] Motor sem React, com testes de cada motivo de descarte
- [ ] O motivo do descarte aparece em texto (lista de passos), não só na animação
- [ ] Modo depurar com Anterior/Próximo e clique em qualquer passo
- [ ] Edição invalida o rastreio; validação de IP duplicado e isolados
- [ ] Teclado completo e `aria-label` por dispositivo
- [ ] `prefers-reduced-motion`: sem pulso decorativo (o pacote ainda anda: é a informação)

## Próximos passos (ideias abertas)

Modelos `.glb` reais por tipo de dispositivo (veja `anim3d-assets`), cabos curvos com folga, pós-processamento (bloom) nos pacotes, layout automático em camadas (core/distribuição/acesso), e vista isométrica ortográfica como terceira opção. Sub-redes e máscaras (rota por IP em vez de por grafo), tabelas de rota por roteador exibidas no depurar, VLANs, perda e jitter por enlace, captura de pacotes (lista tipo Wireshark), TTL com laços, e importar de um formato real (CDP/LLDP, Terraform). Ao implementar um, acrescente aqui a receita e as armadilhas.
