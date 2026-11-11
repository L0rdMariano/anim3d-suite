---
name: anim3d-estilos
description: "Biblioteca de estilos visuais para animações 3D e web: escolhe e fixa composição, luz, materiais, paleta, câmera e movimento ANTES do código (liquid chrome, holográfico, vidro, neon generativo, brutalismo, orgânico, sala de controle, isométrico). Use ao criar qualquer visual novo, quando o pedido disser 'bonito', 'premium', 'futurista', 'estilo X' ou 'como a referência', ou sempre que o resultado puder sair genérico; evita o neon ciano padrão em tudo."
---

# Estilos visuais

Uma cena pode ser tecnicamente correta e visualmente genérica. O estilo é o que decide **como parece** e deve ser escolhido **antes** de escrever cena: ele fixa composição, luz, material, paleta, câmera e movimento. Sem isso o agente cai no padrão do modelo: esferas e cubos girando, neon ciano sobre preto, luz plana.

## Workflow

1. **Intenção** do pedido: o que o visual precisa comunicar (confiança, tecnologia, calma, urgência, luxo, clareza técnica)? Quem vê (cliente final, operador, investidor) e em que tela (hero, painel, mobile)?
2. **Escolha 1 estilo principal** (e, se quiser, 1 de apoio) na tabela abaixo. **Proponha 2 opções ao usuário quando o pedido for aberto**; não assuma neon.
3. **Leia a ficha** em `references/` do estilo escolhido: ela diz composição, luz, material, câmera, movimento, **armadilhas** e custo.
4. **Fixe a paleta em tokens** (variáveis CSS lidas por `useTokens`, veja `anim3d-fundamentos`); nada de hex solto na cena.
5. **Confira o custo** da ficha contra o orçamento do `anim3d-roteador` e escolha os degraus de qualidade antes de codar.
6. **Construa** pelo caminho de skills indicado na ficha ("Receita mínima").
7. **Valide contra os "sinais de certo/errado"** da ficha em uma captura. Se parecer com o estilo errado, o problema quase sempre é luz ou material, não geometria.

## Escolha rápida

| Se o visual precisa de… | Estilo | Ficha | Custo | Já tem exemplo |
|---|---|---|---|---|
| Luxo, produto premium, hero com um objeto | Liquid Chrome | `references/liquid-chrome.md` | médio | não |
| Interface futurista, painéis flutuantes, "dados" | Cyber Holographic | `references/cyber-holographic.md` | baixo | parcial (HUD do Centro de Comando) |
| Transparência, refração, material premium | Crystal / Glass | `references/crystal-glass.md` | **alto** | não |
| Hipnótico, arte, fundo de landing, "vivo" | Generative Neon | `references/generative-neon.md` | médio–alto | não |
| Escala, silêncio, arquitetura, seriedade | Architectural Brutalism | `references/architectural-brutalism.md` | médio (sombras) | não |
| Vida, saúde, natureza, acolhimento | Organic Biomorphic | `references/organic-biomorphic.md` | médio | não |
| Monitoramento, SOC, operação, informação densa | Dark Control Room | `references/dark-control-room.md` | baixo | **sim** (Centro de Comando, topologia) |
| Diagrama explicativo, arquitetura, sistemas | Isometric Worlds | `references/isometric-worlds.md` | baixo | **sim** (Ecossistema, almoxarifado) |

Estilos planejados (ainda sem ficha): Blueprint Técnico, Low-poly Pastel, Paper Cut, Wireframe Vector, Soft Clay, Spatial Glass UI, Synthwave Grid, Monochrome Editorial, Ethereal Dust, Industrial PBR, Ink & Halftone, Cinematic Sci-Fi. A lista completa e a regra de não redundância estão em `ANIM3D_MASTER_PLAN.md`.

## Regras que valem para todos os estilos

- **Um acento por vez.** Hierarquia vem de contraste e de reservar a cor mais forte para o que importa (alerta, ação, seleção). Tudo brilhante = nada se destaca.
- **Luz primeiro, geometria depois.** Material bom sob luz ruim parece plástico; geometria simples sob luz boa parece cara. Em todo estilo defina: luz principal, luz de borda (rim), ambiente.
- **Texto fica em HTML**, nunca no shader nem no canvas (legibilidade, seleção, acessibilidade).
- **Movimento é parte do estilo**: velocidade, easing e sincronia mudam a "personalidade" (pesado e lento = luxo; rápido e elástico = brincalhão; assíncrono e irregular = orgânico). Detalhes em `anim3d-motion`.
- **Todo estilo tem versão barata**: o degrau de qualidade preserva a identidade (a paleta, a composição e o movimento), cortando só o efeito caro.
- **Movimento reduzido**: o estilo sobrevive parado. Teste uma captura sem animação.
- **Conteúdo genérico**: sem marcas, pessoas ou clientes reais.

## Como acrescentar um estilo novo

Copie a estrutura de qualquer ficha. Só entra se (1) tem **uma diferença visual explicável em uma frase** em relação a todos os existentes, (2) tem **números** (parâmetros de luz, material, câmera, movimento) e não só adjetivos, (3) lista **armadilhas medidas**, (4) declara **custo e degraus**, (5) aponta a receita em skills existentes. Estilo que é "o mesmo com outra cor" não entra.

## Armadilhas comuns

- Escolher o estilo pelo adjetivo ("futurista") e não pela intenção: o resultado vira neon ciano por padrão.
- Aplicar o estilo só na cor: sem luz, material e movimento do estilo, parece o genérico recolorido.
- Misturar mais de dois estilos numa cena.
- Esquecer o custo: Crystal/Glass e Generative Neon em máximo derrubam máquina fraca. Defina os degraus antes.

## Checklist

- [ ] Intenção e público escritos em uma linha
- [ ] Estilo escolhido (ou 2 opções propostas) e ficha lida
- [ ] Paleta em tokens; um acento
- [ ] Luz principal, rim e ambiente definidas
- [ ] Custo e degraus de qualidade decididos
- [ ] Captura conferida contra os sinais de certo/errado da ficha
- [ ] Versão sem movimento ainda comunica o estilo
