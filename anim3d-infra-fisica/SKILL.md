---
name: anim3d-infra-fisica
description: "Infraestrutura física de TI em 3D com propriedades reais: prédio, salas, paredes e andares, racks em U, servidores, switches, patch panels, tomadas, eletrocalhas, cabos com porta e comprimento real, energia por rack. Use ao modelar sala de servidores, planta com rack e cabeamento estruturado, animar o caminho de um cabo, vista explodida ou passeio pelo prédio, mesmo que o pedido não diga 'anim3d' nem 'BIM'."
---

# Infraestrutura física (prédio, rack, cabo)

O produto aqui é um **modelo com regras**, não objetos bonitos. Todo item 3D nasce de um dado com propriedade real (altura em U, watts, número de portas, rota do cabo); o 3D só desenha esse dado. Um rack que "parece certo" mas aceita dois servidores no mesmo U é um defeito.

Motor testado: `motor/infraFisica.ts` (`npm test`). Exemplo completo (rack de 42 U de uma empresa de ~120 pessoas, 3 andares, galeria grupo "Redes"): `exemplo/RackEmpresa.tsx` com dados em `exemplo/empresaDados.ts`. Pareceres de outras áreas: lógica de rede em `anim3d-rede-logica`, sinal em `anim3d-wifi-rf`, regras e documentação em `anim3d-infra-validacao`. Base de cena e entrega: `anim3d-fundamentos`, `anim3d-performance-a11y`.

## Workflow

1. **Modele os dados antes do 3D.** `ModeloFisico = { racks, equipamentos, instalacoes, cabos }`. Equipamento tem `alturaU`, `potenciaW`, `portas`; instalação diz rack e `uInicial`; cabo liga `{equipamentoId, porta}` a `{equipamentoId, porta}` e guarda o `caminho` (pontos 3D).
2. **Posicione por regra.** `ocupacaoRack` mostra U livre, sobreposição e excesso; `acharVaga` escolhe o primeiro encaixe. Nunca coloque pela posição visual.
3. **Roteie cabos pela infraestrutura**: `rotearPelaEletrocalha(grafo, origem, destino)` segue a calha (sobe, atravessa, desce). Linha reta entre pontas é um erro de projeto, não um atalho.
4. **Meça o cabo real**: `comprimentoCabo` soma os trechos e **1,5 m de folga em cada ponta**. Cobre acima de 100 m é erro (regra em `anim3d-infra-validacao`).
5. **Só então desenhe.** Procedural (caixas, LEDs por porta) bate qualquer GLB para rack: troca de cor por estado, carrega na hora. Siga `anim3d-estilos` (sala de controle ou isométrico) e `anim3d-topologia/exemplo/Topologia3DCena.tsx` como base de câmera, rótulos HTML e teclado.
6. **Valide e entregue**: `anim3d-infra-validacao`, depois `anim3d-performance-a11y`.

## Decisões

| Pergunta | Escolha | Por quê |
|---|---|---|
| Rack, servidor, switch | caixas procedurais + LEDs | recolorem por estado e carregam na hora, sem GLB |
| Muitos equipamentos iguais | `InstancedMesh` por tipo | 1 draw call por tipo em vez de 1 por equipamento |
| Cabo | polilinha com cantos arredondados curtos sobre o `caminho` | uma spline que atravessa os pontos da calha pode cortar a parede nas curvas; mantenha o traçado do motor |
| Prédio grande | corte por andar (`clip` ou ocultar andares) | ver o interior é o objetivo; parede opaca esconde tudo |
| Planta técnica | vista ortográfica de cima a partir do mesmo modelo | uma fonte de dados, duas vistas (ver `anim3d-infra-validacao`) |

## Animações desta área

Receitas em [`references/animacoes.md`](references/animacoes.md): **Cable Routing** (cabo percorrendo rack → calha → tomada), **Exploded Infrastructure** (desmontar parede, rack e equipamento) e **Building Walkthrough** (câmera pelo prédio). Todas conduzidas por tempo normalizado `t∈[0,1]` sobre o `caminho` do cabo, com movimento reduzido mostrando o cabo completo parado.

## Armadilhas medidas

- **Contar U de cima para baixo.** A numeração mais comum conta de baixo para cima (alguns fabricantes numeram de cima); aqui `uInicial` é do U mais baixo. Misturar inverte o rack no 3D. O teste `altura do centro` fixa a convenção (44,45 mm por U).
- **Equipamento de 2 U ocupando só 1.** Sobreposição só aparece se **cada** U do intervalo for marcado: é o que `ocupacaoRack` faz, e o teste cobre o U2 conflitando entre 2 U e 2 U.
- **Vaga fragmentada.** 1 U livre em dois pontos não comporta 2 U. `acharVaga(o, 2)` precisa de U **consecutivos** (teste cobre).
- **Cabo reto subestima o comprimento.** A rota pela calha (sobe 2 m, atravessa 10, desce 2) passa muito da distância euclidiana; usar a reta reprova cabos que deveriam passar e aprova os que não passam.
- **Patch panel não é switch.** Ele é passivo: o sinal entra e sai pela **mesma** porta. Modele como `PASSIVOS` para a topologia lógica atravessá-lo.
- **Calha do andar errado.** O nó "mais próximo" da calha pegou o térreo para a tomada do 2º andar (1,0 m contra 2,2 m) e o cabo do andar de cima saiu mais curto que o de baixo. Com andares, passe `{ origem: 'f1' }` a `rotearPelaEletrocalha` (teste e exemplo cobrem).
- **Limite de 100 m por cabo em vez de por canal.** Patch (1 m) + horizontal + tomada somam mais que cada cabo; `rastrearCaminhoFisico().canalM` soma tudo e a regra `canal-comprimento` reprova mesmo com cada cabo abaixo do limite.
- **`RackEmpresa.tsx` e `rackEmpresa.ts` na mesma pasta.** No Windows e no macOS o `import './RackEmpresa'` resolveu o `.ts` e a tela ficou em branco ("não exporta RackEmpresa"). Nomes de arquivos não podem diferir só por maiúscula; dados ficaram em `empresaDados.ts`.
- **Metal sem mapa de ambiente.** `metalness` alto deixou o rack quase preto; use `metalness ≈ 0,1` com luz direcional ou carregue um ambiente (`AmbienteEstudio`).
- **Ponta de calha solta.** Calha desconectada devolve `null`; a interface deve dizer "sem caminho entre A e B", não desenhar linha reta.

## Verificação

1. `npm run verificar`.
2. MVP de referência em [`references/mvp.md`](references/mvp.md): três salas, corredor, sala de servidores, dois racks, cabos 3D, uma interrupção simulada.
3. Capturas em 1440 e 390 de largura; teclado alcança cada equipamento.

## Checklist

- [ ] Cada objeto 3D sai de um dado com propriedade real (U, watts, portas)
- [ ] Posicionamento e cabo passam pelo motor, não por coordenada solta
- [ ] Comprimento do cabo inclui a folga das pontas
- [ ] Fallback 2D/lista e movimento reduzido tratados
- [ ] Referências de produto externas com autor, URL e licença (ver `references/inspiracoes.md`)

## Próximos passos

- Rack com energia redundante (A/B) e PDU por tomada.
- Importar/exportar JSON do modelo e do `caminho` do cabo.
- Exploded Infrastructure e Building Walkthrough (só descritos em `references/animacoes.md`).
- Ligar a descoberta de rede e a validação ao cabo animado (hoje só o Cable Routing e a queda são animados).
