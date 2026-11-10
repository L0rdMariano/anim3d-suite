---
name: anim3d-saas
description: "Animações 3D para páginas de SaaS: hero de landing, ilustração de feature, onboarding, scroll storytelling e demonstração de produto. Use ao criar visuais 3D de marketing ou de explicação de produto web."
---

# 3D para SaaS (marketing e produto)

Pré-requisitos: `anim3d-roteador` (decisão e orçamento) e `anim3d-fundamentos` (cena).

## Padrões que funcionam

| Padrão | Técnica | Cuidado |
|---|---|---|
| **Hero com objeto-símbolo** | Um objeto low poly flutuando, parallax leve com o ponteiro | O título e o CTA vêm primeiro; 3D à direita ou ao fundo |
| **Feature em 3D** | Mini-cena por feature, ativada ao entrar na viewport | Uma ideia por cena; legenda em HTML |
| **Scroll storytelling** | Progresso do scroll (0–1) controla câmera/objetos | Nunca sequestre o scroll; ele continua nativo |
| **Fluxo de dados** | Pacotes percorrendo cabos entre blocos | Veja `anim3d-dashboard/exemplo/Ecossistema3D` |
| **Onboarding guiado** | Câmera foca o elemento do passo atual | Botão "pular" sempre visível |

## Regras

1. **LCP primeiro.** O hero renderiza texto e um poster (imagem WebP do primeiro frame) imediatamente; a cena carrega depois via `import()` quando perto da viewport. Nunca bloqueie o LCP com WebGL.
2. **Scroll nativo.** Mapeie `scrollY` → progresso (`ref`, sem re-render) e interpole com suavização. Não use `preventDefault` em wheel/touch. Zoom só com Ctrl/Cmd + rolagem.
3. **Interação opcional.** Tudo que a cena mostra também está em texto/HTML; o 3D é reforço.
4. **Um destaque por viewport.** Se duas coisas se movem, o olho não vai a nenhuma.
5. **Marca consistente.** Cores e formas vêm dos tokens da marca; sem preset genérico de "cubo cromado".
6. **Conversão acima de beleza.** Meça: se o hero 3D piora LCP/INP ou a conversão, remova.

## Exemplo pronto (verificado em navegador)

`exemplo/Globo3D.tsx` + `Globo3DCena.tsx`: globo de conexões, um componente sem texto embutido (o texto do hero é do projeto).

- Pontos com continentes procedurais (ruído, sem baixar mapa), terra densa e oceano esparso.
- Arcos entre cidades animados com `TubeGeometry.setDrawRange` (cabeça e cauda), pulsos nas cidades, atmosfera em shader fresnel.
- Parallax ≤ 8° só com mouse, qualidade adaptativa, `PausaAutomatica`, `GuardaContexto`, poster SVG.
- **Armadilha medida:** o tone mapping ACES padrão do R3F apaga materiais sem luz (pontos, linhas, brilho). Use `toneMapped={false}` neles.

Depende do kit (`../anim3d-fundamentos/kit/`). Nunca escreva texto de marketing inventado no exemplo; deixe o slot para o projeto.

Para scroll storytelling: `useProgressoScroll(() => invalidate())` na página e passe a ref de progresso à cena; interpole com `amortecer`.

## Roteiro de uma landing

1. Hero: objeto-símbolo + parallax (≤ 8° de inclinação).
2. 3 features: cena curta cada, ativada na viewport, `frameloop="demand"`.
3. Prova social e preço: **sem 3D**.
4. CTA final: no máximo uma micro-animação.

## Testes

- Lighthouse mobile: LCP e CLS iguais ou melhores que a versão sem 3D.
- Resize 1856 / 1440 / 768 / 390: cena inteira visível, texto nunca sobre o objeto.
- Sem WebGL, com movimento reduzido e com JS lento: poster e texto completos.
