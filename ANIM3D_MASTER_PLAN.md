# ANIM3D MASTER PLAN

Plano mestre do **anim3d-suite**: um ecossistema de Agent Skills que ensina agentes de IA a projetar, desenvolver, animar, testar e entregar experiências visuais profissionais.

**Para quem é este documento:** o dono do projeto (decisões) e o agente que vai implementar (execução, por fases). Ele vem **antes** de qualquer mudança no código. O detalhe técnico do motor de movimento está em [`docs/PLANO-EVOLUCAO.md`](docs/PLANO-EVOLUCAO.md), que passa a ser o **anexo técnico** das fases 1–3.

**Como ler "verificado" e "a confirmar":** o que está marcado como *medido* foi levantado no repositório em 2026-11-11. O que está marcado como *a confirmar* é afirmação sobre terceiros (licenças, formatos de outros agentes, projetos de referência) que **não foi verificada** e precisa ser conferida na fonte antes de virar decisão.

---

## Direção atualizada (decisão do dono, 2026-11-11): skills primeiro, poucos exemplos

O produto do anim3d-suite é o **conhecimento e o workflow** que o agente usa para criar animações: skills, `references/`, biblioteca de estilos, regras de decisão e validação. **Exemplos servem para provar e ensinar, não para fazer vitrine.**

- **Exemplos:** no máximo **1 a 2 por skill**, cerca de **12 a 16 no total até a Fase 3**, escolhidos pelo que ensinam (uma técnica, uma armadilha, um contrato), não pelo impacto visual.
- **Showcase:** a galeria atual **basta**. Ficam **canceladas** as metas de 60 demonstrações e 100 exemplos. As metas de **50+ skills** e **40+ estilos** continuam como horizonte, **condicionadas à qualidade**.
- **Lista de ~20 animações** em `docs/PLANO-EVOLUCAO.md`: passa a ser **catálogo de candidatas**. Só se implementa a que for necessária para provar uma skill nova.
- **Prioridade de trabalho:** (1) padrão de skill e validador, (2) skills de conhecimento (estilos, motion, shaders, câmera, QA), (3) motor mínimo testado que as skills referenciam, (4) um exemplo enxuto por skill.

---

## 0. Regras para quem executar este plano

1. **Nada que funciona muda de comportamento.** Tudo é aditivo. Nenhum exemplo, skill, export ou rota atual é removido ou renomeado sem autorização explícita do dono.
2. `npm run verificar` verde **antes e depois** de cada passo. Se ficar vermelho, para e corrige antes de seguir.
3. **Nenhum agente altera projetos existentes do dono fora do repositório** da suíte.
4. **Qualidade antes de quantidade.** Se uma fase não atinge seus critérios de saída, a fase seguinte não começa.
5. **Dependência nova só com registro** em `docs/DECISOES.md` (versão, licença, peso, quem usa, alternativa descartada).
6. **Código, modelos, texturas e fontes de terceiros só entram com licença verificada** e atribuição em `THIRD_PARTY_NOTICES.md`.
7. **Um passo por vez, com prova** (teste, captura ou medição). "Funciona" sem evidência não conta.

---

## 1. Auditoria do repositório atual (medida)

### 1.1 O que existe

| Item | Situação |
|---|---|
| Skills da suíte | **16** (`anim3d-roteador`, `-fundamentos`, `-saas`, `-dashboard`, `-mobile`, `-app-ui`, `-performance-a11y`, `-assets`, `-mapas`, `-topologia`, `-estilos`, `-motion`, `-infra-fisica`, `-rede-logica`, `-wifi-rf`, `-infra-validacao`) + `cena-3d-isometrica`, que vive **só** em `~/.claude/skills` (fora da pasta fonte) |
| Tamanho dos `SKILL.md` | 53 a 111 linhas (média ~80) |
| Exemplos | mapas 19 arquivos · dashboard 13 · topologia 8 · saas 2 · mobile 2 · app-ui 2 |
| Código de exemplo + kit (sem testes) | ~8,6 mil linhas |
| Testes | **65** em 10 arquivos, todos de **lógica pura** (simulações, dados, geometria, kit) |
| Evals do roteador | **5** casos (todos de roteamento/decisão, nenhum de qualidade visual) |
| Scripts | **1** (`verificar-navegador.mjs`: capturas, rolagem horizontal, erros de console) |
| Dependências de runtime | 4 (`three`, `@react-three/fiber`, `react`, `react-dom`) |
| Licença da suíte | MIT |
| Galeria | página principal da demo, grupos Mapas, Redes, Dashboard, SaaS, Mobile, App UI |

### 1.2 Pontos fortes (preservar)

- Arquitetura consistente: **lógica pura testável fora da cena**, cena só desenha, HUD em HTML.
- Kit com **fallback honesto**, movimento reduzido, pausa fora da tela, perda de contexto e degradação por FPS.
- Roteador com decisão 2D × 3D e orçamento por contexto.
- Dependências mínimas e `three` fora do bundle inicial.
- Aprendizado registrado como "armadilha medida" dentro das skills (ex.: FPS não pode derrubar ferramenta para o poster).

### 1.3 Lacunas (o que o plano precisa resolver)

| # | Lacuna | Gravidade |
|---|---|---|
| L1 | **Trabalho novo sem versionamento.** *(Correção da auditoria: o repositório git **existe**, com 4 commits em `main` e remoto `origin` no GitHub; a primeira versão deste plano afirmou o contrário por olhar a pasta pai.)* O que faltava era commitar a evolução: mapas, topologia, estilos, motion e planos estavam sem commit | Média (**resolvida em 2026-11-11** com commits locais; falta decidir o *push*) |
| L2 | **(Tratada em 2026-11-11: `paises.json` deixou de ser versionado e há `THIRD_PARTY_NOTICES.md`; ver D2)** **Licença de dados:** `world-countries` é **ODbL-1.0** (atribuição + compartilhamento pela mesma licença para bases derivadas). O snapshot `paises.json` é derivado dele, mas a suíte é MIT. `world-atlas`/`topojson-client` são ISC. Dados do IBGE e do Banco Mundial exigem atribuição (*a confirmar* os termos exatos) | **Alta** |
| L3 | **Badge e README desatualizados:** diz 29 testes, são 65 | Média |
| L4 | **Nenhum CI.** Nada roda sozinho a cada mudança | Alta |
| L5 | **Sem regressão visual** nem checagens de movimento (saltos, loop, flicker, vazamento) | Alta |
| L6 | **FPS nunca foi medido em GPU real.** O ambiente de desenvolvimento usa WebGL por software | Alta |
| L7 | **Fonte e cópia instalada podem divergir** (instalação manual por `cp`); `cena-3d-isometrica` está fora da fonte | Média (**instalador entregue em 2026-11-11**: `npm run instalar`; resta trazer `cena-3d-isometrica` para a fonte) |
| L8 | **Estrutura de skill não padronizada:** não há `references/`, `assets/`; `scripts/` só em uma skill | Média |
| L9 | **Áreas finas:** `saas`, `mobile`, `app-ui` têm 2 arquivos de exemplo cada | Média |
| L10 | **Nenhuma skill** de shaders, física, câmera cinematográfica, motion design (timing/coreografia), ou biblioteca de estilos | Alta |
| L11 | **Só testada com um agente** (Claude Code). Nenhuma verificação com outros | Média |
| L12 | **Sem catálogo de estilos visuais** nem rubrica de qualidade estética | Alta |
| L13 | **Evals só medem roteamento**, não a qualidade do que o agente entrega | Média |

### 1.3.1 Primeiras ações (antes da Fase 1)

1. ~~`git init`~~ **Já existia.** Feito: tag local `baseline-pre-evolucao` no último commit anterior à evolução e commits locais do trabalho novo. **Pendente de autorização do dono: `git push`** (o remoto é público no GitHub; ver D2 antes de publicar dados derivados).
2. Criar `THIRD_PARTY_NOTICES.md` e decidir o tratamento do ODbL (ver L2): opções — (a) manter o snapshot e licenciar `exemplo/dados/` como ODbL com atribuição, (b) gerar o snapshot em tempo de uso (script local, nada versionado), (c) trocar a fonte por dados de licença permissiva. **Decisão do dono.**
3. Corrigir README (contagem de testes, estrutura, áreas novas).

---

## 2. Arquitetura definitiva: três camadas

| Camada | Papel | Onde vive |
|---|---|---|
| **1. SKILLS: conhecimento** | O agente aprende o que fazer, quando e por quê (workflow, critérios, armadilhas, estilos) | `anim3d-*/SKILL.md` + `references/` |
| **2. ENGINE: execução** | Código reutilizável e testado: kit, motor de movimento, shaders, partículas, presets, simulações | `anim3d-fundamentos/kit`, `anim3d-motion/motor`, módulos `exemplo/` |
| **3. SHOWCASE: prova** | Galeria de experiências reais, benchmarks, fichas de avaliação, capturas | `demo/` + `docs/benchmarks/` |

**Skill ensina, Engine executa, Showcase comprova.** Uma Skill nunca contém código copiado de exemplos (aponta para eles); um exemplo nunca existe sem Skill que o explique; um item do Showcase nunca existe sem ficha de avaliação.

**Compatibilidade:** a nomenclatura `anim3d-*` e as pastas atuais ficam. As novas skills seguem o mesmo prefixo. A hierarquia por especialidade da proposta (motion-design, threejs-3d, webgl-shaders, physics, cinematic-camera, data-visualization, ui-motion, motion-qa) entra como **mapa de áreas** (seção 3), não como renomeação de pastas.

---

## 3. Taxonomia: 12 áreas e suas skills

Legenda: ✅ existe · 🟡 existe parcial · ⬜ nova. A coluna "Fase" diz quando entra; áreas especializadas (WebXR, personagens) só entram com **caso de uso real e dono definido**, para não virar skill genérica que repete documentação.

| Área | Skills existentes | Skills novas (nome sugerido) | Fase |
|---|---|---|---|
| **01 3D Motion Design** | `anim3d-saas` 🟡 | `anim3d-motion` (motor, presets, coreografia) ⬜ · `anim3d-morfologia` (morph, deformação, tipografia 3D) ⬜ | 2 |
| **02 Generative Art & Shaders** | — | `anim3d-shaders` (GLSL, ruído, vertex displacement, ray marching) ⬜ · `anim3d-particulas` (campos, GPU, curl noise) ⬜ | 2 |
| **03 Web Animation & Interaction** | `anim3d-app-ui` 🟡 | `anim3d-scroll` (storytelling, transições de página, parallax 3D) ⬜ | 2–3 |
| **04 Data Viz & Intelligence** | `anim3d-dashboard` ✅ · `anim3d-mapas` ✅ · `anim3d-topologia` ✅ | `anim3d-grafos` (grafos, redes neurais, **multicamada**) ⬜ | 3 |
| **05 Technical & Industrial** | `anim3d-dashboard` (almoxarifado) 🟡 | `anim3d-industrial` (mecânica, explodida, processos, infraestrutura) ⬜ | 3 |
| **06 Simulation & VFX** | — | `anim3d-fisica` (molas, corpos rígidos, colisão) ⬜ · `anim3d-efeitos` (fumaça, fogo, tecido) ⬜ | 2–3 |
| **07 Character & Rigging** | — | `anim3d-personagem` ⬜ | 3+ (só com caso real) |
| **08 Environments** | `anim3d-dashboard` 🟡 | `anim3d-ambientes` (terreno, cidade, flythrough) ⬜ | 3 |
| **09 UI Motion Systems** | `anim3d-app-ui` 🟡 | ampliar `app-ui` (estados, SVG motion, Rive/Lottie, glass/neumorfismo) | 3 |
| **10 Cinematic & Editorial** | — | `anim3d-cinema` (câmera, tipografia cinética, infográficos) ⬜ | 2–3 |
| **11 Immersive & Spatial** | `anim3d-mobile` 🟡 | `anim3d-xr` ⬜ | 3+ (só com caso real) |
| **12 Audio Reactive** | — | `anim3d-audio` ⬜ | 3 |
| **Transversais** | `anim3d-roteador` ✅ · `anim3d-fundamentos` ✅ · `anim3d-performance-a11y` ✅ · `anim3d-assets` ✅ | `anim3d-qa` (inspeção visual, regressão, benchmark) ⬜ · `anim3d-estilos` (biblioteca de estilos) ⬜ | **1** |

**Contagem honesta:** hoje 16 skills (auditoria de 2026-11-11); o plano leva a ~25 skills **até a Fase 3**. A meta da proposta (50+) é horizonte de longo prazo, **condicionada à qualidade**: não se cria skill para bater número.

**Critério para existir uma skill nova:** (1) responde a um tipo de pedido que as existentes não cobrem; (2) tem ao menos um exemplo executável; (3) tem ao menos uma "armadilha medida" que o modelo não saberia sozinho; (4) passa na ficha de avaliação (seção 7). Skill que só repete documentação oficial **não entra**.

---

## 4. Padrão obrigatório de criação de skills

Estrutura (nomes de pastas pelo padrão aberto de Agent Skills; *a confirmar na especificação vigente* antes de fixar). `exemplo/` e `testes/` ficam como estão, por compatibilidade.

```
anim3d-<area>/
├── SKILL.md            workflow do agente (frontmatter + passos + checklist)
├── references/         princípios, técnicas, decisões, links com licença
├── exemplo/            exemplos completos e executáveis (nome atual mantido)
├── assets/             recursos próprios ou com licença registrada
├── scripts/            verificações e ferramentas
├── testes/             testes técnicos (lógica pura) e visuais quando couber
└── skill.meta.json     versão, compatibilidade, licenças, dependências
```

**`SKILL.md` — modelo**

1. Frontmatter: `name` e `description` (a descrição diz **quando usar**, com palavras que o usuário usaria; terminar com "mesmo que o pedido não diga 'anim3d'").
2. **Quando usar / quando não usar** (e para onde ir quando não).
3. **Workflow** em passos numerados que o agente executa: entender → decidir → construir → verificar → entregar.
4. **Contrato de entrega:** o que a resposta final precisa conter (4 linhas do roteador + evidências).
5. **Armadilhas medidas** (cada uma com o sintoma, a causa e a correção).
6. **Checklist de saída.**
7. **Próximos passos** (backlog aberto da skill).

**Limites de tamanho:** `SKILL.md` ≤ 150 linhas; o resto vai para `references/` (carregado só quando necessário). Skill que cresce demais divide.

**Validador (`scripts/validar-skills.mjs`, Fase 1):** falha se faltar frontmatter, se `description` não disser quando usar, se passar do limite de linhas, se houver link quebrado para `references/`/`exemplo/`, se citar nome de empresa (regra da casa), se o `skill.meta.json` não tiver versão e licenças.

---

## 5. Biblioteca de estilos visuais

Uma skill pode ser tecnicamente excelente e entregar algo medíocre. O estilo é o que impede isso: ele fixa composição, luz, material, cor, câmera e movimento **antes** do código.

**Ficha de estilo** (`anim3d-estilos/references/<id>.md`): intenção · composição · iluminação · materiais · paleta (**tokens**, nunca hex solto) · câmera · movimento e transições · armadilhas · receita mínima (qual skill/exemplo usar) · referências com licença · custo e degraus de qualidade.

**Catálogo inicial: 20 estilos distintos** (sem redundância; cada um precisa de uma diferença visual explicável em uma frase).

| # | Estilo | Essência | Estado |
|---|---|---|---|
| 1 | Liquid Chrome | metal líquido, reflexo, morph | novo |
| 2 | Cyber Holographic | luz aditiva, scanlines, profundidade | novo |
| 3 | Crystal / Glass | refração, transmissão, caustics | novo |
| 4 | Architectural Brutalism | massa, contraste, escala | novo |
| 5 | Organic Biomorphic | formas naturais e fluidas | novo |
| 6 | Generative Neon | campos, ondas, partículas | novo |
| 7 | Isometric Worlds | miniaturas e diagramas ortográficos | **parcial** (Ecossistema, almoxarifado) |
| 8 | Cinematic Sci-Fi | ambiente, atmosfera, câmera | novo |
| 9 | Dark Control Room | monitor escuro, ciano, HUD | **existe** (Centro de Comando, topologia) |
| 10 | Blueprint Técnico | linhas de projeto, cotas | novo |
| 11 | Low-poly Pastel | facetas, cor suave | novo |
| 12 | Paper Cut / Layered Depth | camadas de papel, sombra | novo |
| 13 | Wireframe Vector | CAD retrô, arestas | novo |
| 14 | Soft Clay | argila, bordas macias, luz difusa | novo |
| 15 | Spatial Glass UI | painéis de vidro flutuantes | novo |
| 16 | Synthwave Grid | grade, horizonte, gradiente | novo |
| 17 | Monochrome Editorial | preto e branco, tipografia | novo |
| 18 | Ethereal Dust | poeira de luz, profundidade de campo | novo |
| 19 | Industrial PBR Realism | materiais físicos, desgaste | novo |
| 20 | Ink & Halftone | não fotorrealista, meio-tom | novo |

**Meta de evolução:** 20 estilos documentados e demonstrados até a Fase 3; 40 só se cada novo passar na regra de não redundância. O roteador passa a perguntar/inferir o estilo e fixá-lo na saída do passo de decisão.

---

## 6. Motor de demonstração e validação

### 6.1 Workflow de entrega (obrigatório para todo exemplo novo)

1. Desenvolver. 2. Executar. 3. Capturar frames (início, meio, fim) em 1440 e 390 de largura. 4. Verificar console. 5. Rodar as checagens da 6.2. 6. Medir desempenho (6.3). 7. Corrigir. 8. **Revisão por quem não escreveu o código** (outra passada de agente com a rubrica, e/ou pessoa). 9. Preencher a ficha (seção 7). 10. Entrar na galeria.

> **Quem escreve o código não aprova a própria estética.** A pontuação de qualidade visual vem de revisão separada com rubrica e as capturas; só a pessoa dona do projeto marca "Aprovada".

### 6.2 Checagens automáticas de animação (`anim3d-qa`)

Pré-requisito técnico: um **contrato de inspeção** (novo, a implementar na Fase 1). Em modo `?qa=1`, toda cena expõe `window.__anim3d` com: `avancar(dt)` (tempo determinístico), `amostrar()` (posições/uniformes de itens marcados), `pausar()`, `retomar()`, `desmontar()` e contadores (`renderer.info`). Sem esse contrato, saltos e loops não são mensuráveis de forma repetível.

| Checagem | Como | Reprovação |
|---|---|---|
| Erros de console e exceções | DevTools Protocol (já existe) | qualquer erro |
| Rolagem horizontal e transbordo | já existe | qualquer ocorrência |
| Elementos fora da tela | caixas do DOM (HUD, rótulos) e projeção dos itens marcados nos quadros-chave | item importante fora do enquadramento |
| Movimento brusco / salto | amostrar a trajetória em passo fixo; descontinuidade de velocidade/posição acima do limite da animação | salto > limite |
| Loop que não fecha | comparar estado em `t=0` e `t=T` | diferença > ε |
| Flicker e z-fighting | câmera parada, N quadros, variância temporal em regiões que deveriam ser estáticas | variância alta e periódica |
| Vazamento de memória | montar/desmontar N vezes; `renderer.info.memory` (geometrias/texturas) e programas estáveis | crescimento monotônico |
| Pausa, retomada e desmontagem | contador de quadros para fora da tela; retomar sem salto; desmontar libera tudo | quadros continuam ou há salto |
| `prefers-reduced-motion` | emulação de mídia; `data-modo` e atividade de animação | anima onde não devia |
| Sem WebGL | forçar falha de contexto; `data-modo=fallback`, `data-motivo=sem-webgl` | quebra ou tela vazia |
| Regressão visual | comparar capturas em instante determinístico com a base aprovada | diferença acima da tolerância |

**Limite honesto:** estética, "naturalidade" e composição **não se provam por teste automático**. As checagens pegam defeitos objetivos; a qualidade percebida vem da rubrica e da revisão (seção 7).

### 6.3 Desempenho

- **Contagens objetivas** (triângulos, draw calls, texturas, programas, peso gzip da cena, tempo de carga) são automáticas e rodam em qualquer ambiente.
- **FPS e tempo de quadro só valem em GPU real.** Criar `anim3d-qa/scripts/medir-fps.mjs` (Chrome com GPU, DevTools Protocol) e rodar **na máquina do dono ou em runner com GPU**. Sem isso o cartão diz "FPS não medido" (nunca um número inventado).
- Perfis de hardware **a definir pelo dono**: A (desktop com GPU dedicada), B (notebook com GPU integrada), C (celular de entrada). Cada animação declara o perfil em que cumpre a meta e quais degraus de qualidade usa nos demais.

---

## 7. Benchmarks e critérios de aprovação

### 7.1 Ficha de avaliação (`ficha.yaml`, uma por animação)

Cinco critérios, cada um de 0 a 100, **com evidência anexada**:

| Critério | O que avalia | Como se mede |
|---|---|---|
| Qualidade visual | estética, materiais, composição, fidelidade ao estilo | **rubrica humana/revisão independente** sobre capturas (não automática) |
| Qualidade de movimento | suavidade, timing, naturalidade, ausência de saltos | checagens da 6.2 + revisão de vídeo curto |
| Qualidade técnica | arquitetura, testes, descarte, fallback, acessibilidade | validador, cobertura de lógica pura, checklist |
| Desempenho | FPS (GPU real), memória, carga, peso | 6.3 |
| Compatibilidade | navegadores, larguras, movimento reduzido, sem WebGL, agentes | matriz de testes |

**Formato:** `nota`, `evidencias` (links para capturas/relatórios), `medido: true|false` por item, `data`, `commit`, `hardware`, `revisor`. **Item não medido aparece como "não medido"**, nunca como número. Os valores de exemplo da proposta original eram ilustrativos; este repositório **só publica números medidos**.

### 7.2 Regra de aprovação (proposta, ajustável)

- **Aprovada:** todos os critérios ≥ 70, média ≥ 85, nenhuma checagem automática reprovada, e **aprovação explícita do dono** para qualidade visual.
- **Aprovada com ressalvas:** média ≥ 75 e ressalva registrada na ficha (ex.: "FPS não medido").
- **Reprovada:** qualquer checagem automática falhando, ou qualquer critério < 70.

### 7.3 Evals de skill (agente)

Além dos 5 evals atuais, três tipos novos:
1. **Roteamento:** ~30 pedidos com o conjunto esperado de skills; métrica de acerto do conjunto e da ordem.
2. **Entrega:** o agente recebe um pedido e o resultado passa pelas checagens da 6.2 e pela rubrica.
3. **Regressão da skill:** mudança em `SKILL.md` roda os mesmos pedidos e compara.

---

## 8. Plano de implementação por etapas

Cada fase tem **critério de saída**; sem ele a próxima não começa. Estimativas são relativas (P/M/G), não prazos.

| Fase | Entregas | Critério de saída | Porte |
|---|---|---|---|
| **0 · Preparação** | ~~`git init`~~ commits do trabalho novo + tag de baseline (feito); `THIRD_PARTY_NOTICES.md`; decisão ODbL (**antes de qualquer push**); README corrigido; `docs/DECISOES.md` | Trabalho versionado; licenças tratadas; README fiel | P |
| **1 · Fundação** | Padrão de skill + `validar-skills.mjs`; `AGENTS.md` na raiz; `anim3d-qa` v1 (contrato `__anim3d` + 6 checagens); instalador; CI (typecheck, testes, build, validador); `anim3d-estilos` (modelo + 5 estilos que já têm exemplo ou são triviais de provar); esqueleto de `references/` | CI verde; todas as skills atuais passam no validador **sem mudar de comportamento**; `anim3d-qa` roda em ≥ 3 exemplos existentes | G |
| **2 · Core Animation** | `anim3d-motion` (motor mínimo: molas, linha do tempo, depois rolagem, trajeto de câmera, morph) conforme `docs/PLANO-EVOLUCAO.md`; `anim3d-shaders`; `anim3d-particulas`; `anim3d-fisica`; `anim3d-cinema` (câmera); 12 estilos; **até 5 exemplos de prova** (um por skill nova, escolhidos pelo que ensinam) | Cada prova cumpre o contrato (6.1) e tem ficha; FPS medido na GPU do dono; revisão independente feita | G |
| **3 · Expansão** | `anim3d-grafos` (incl. multicamada), `anim3d-industrial`, `anim3d-ambientes`, `anim3d-audio`, ampliação de `app-ui`/`scroll`; telemetria ao vivo da topologia (ponte local); 20 estilos; exemplos enxutos (≤ 1 por skill nova); WebXR/personagens **apenas** se houver caso e dono | Meta da fase 2 repetida para cada nova skill; evals de roteamento ≥ 30 pedidos | G |
| **4 · Qualidade profissional** | Benchmark e fichas publicadas na galeria; regressão visual; GPU em CI (se houver runner); auditoria de segurança; documentação avançada | Todas as animações da galeria têm ficha; auditoria sem pendência crítica | M |
| **5 · Ecossistema** | Catálogo e instalação seletiva; templates; guia de contribuição ampliado; versionamento e releases | Primeira release `1.0.0` com changelog e matriz de compatibilidade datada | M |

**Ordem de risco:** fase 0 e 1 são "chatas e decisivas". Pular para as animações antes delas é o caminho mais provável para uma coleção bonita e impossível de manter.

---

## 9. Compatibilidade com agentes

**Princípio:** uma **fonte única** (`SKILL.md` + `references/` em Markdown neutro, sem instruções específicas de fornecedor) e **adaptadores gerados** quando um agente exigir formato diferente. Nada de manter cópias à mão.

| Agente | Situação | Ação |
|---|---|---|
| **Claude Code** | **Verificado** neste ambiente: skills em `~/.claude/skills/<nome>/SKILL.md` com frontmatter `name`/`description` | Prioridade; instalador copia/atualiza e valida |
| **Codex** | *A confirmar* (formato de instruções/skills e local de instalação) | Pesquisar na documentação oficial; gerar adaptador se preciso |
| **Gemini CLI** | *A confirmar*. O ambiente do dono já usa `AGENTS.md` como fonte compartilhada com o Gemini | Manter `AGENTS.md` na raiz; verificar leitura de skills |
| **Cursor** | *A confirmar* (regras/ instruções do projeto) | Adaptador gerado das mesmas fontes |
| **GitHub Copilot** | *A confirmar* (instruções do repositório) | Idem |

**Protocolo de teste por agente:** os mesmos pedidos de eval; registrar versão do agente, data, resultado e falhas numa **matriz de compatibilidade datada** (`docs/COMPATIBILIDADE.md`). Compatibilidade só é afirmada com teste registrado.

**Instalação:** `scripts/instalar.mjs` — instala **uma skill** ou **uma coleção**, tem `--dry-run`, **nunca sobrescreve sem `--force`**, não executa código remoto e não faz chamadas de rede. Resolve a lacuna L7 (fonte × instalada).

**Roteador v2 (camada de intenção).** O `anim3d-roteador` passa a classificar o pedido em intenções — animação 3D · scroll · topologia/rede · simulação física · dashboard animado · reprodução de estilo de referência · mapa/globo · shader/efeito — e a **combinar** skills compatíveis. Saída padronizada (estende as 4 linhas atuais): `Contexto · Família/Skills · Estilo · Orçamento · Fallback · Verificação (QA)`. Cobertura medida pelos evals de roteamento (7.3).

---

## 10. Comunidade, documentação e releases

- **Versionamento semântico** por skill (`skill.meta.json`) e para a coleção; `CHANGELOG.md` por release; tags no git. Mudança que quebra contrato de uma skill = versão maior.
- **Documentação:** README fiel e atualizado por CI (contagens vêm de script, não de texto à mão); `docs/` com arquitetura, decisões, compatibilidade, referências, benchmarks.
- **Referências externas** (`references/` e `docs/REFERENCIAS.md`): cada uma com **autor, URL, licença e o que foi aproveitado (ideia, não código)**. Projetos citados na proposta (coleções de skills de motion, habilidades de GSAP, listas de skills de motion design, ecossistema React Three Fiber, geradores de vídeo programático) são **candidatos a estudo; não foram verificados aqui** (existência, estrutura, licença). Estudar decisões e organização; **não incorporar código** sem verificar licença. Projetos com licença copyleft forte: **só conceitos**.
- **Contribuição:** `CONTRIBUTING.md` ampliado com o contrato de skill, o contrato de animação, a ficha de avaliação e modelos de issue/PR. PR de skill sem ficha e sem validador verde não é revisado.
- **Licenças:** matriz em `THIRD_PARTY_NOTICES.md` (dados, fontes, modelos, bibliotecas) e checagem de CI que falha se uma dependência nova não estiver registrada.
- **Segurança (auditoria na Fase 4, higiene desde a 1):** dependências fixadas; `npm audit` no CI; sem scripts de pós-instalação; instalador sem rede; telemetria e qualquer dado externo **validados antes do uso** (já é regra em `telemetria.ts`); URLs digitadas só com protocolos permitidos; nenhum texto externo renderizado como HTML.
- **Showcase** (`demo/`): por família e por estilo, tela cheia, controle de velocidade e câmera, seletor de qualidade, código-fonte e skill responsável em cada cartão, **ficha de avaliação visível**, comparação lado a lado, `?respeitar=1`.

---

## 11. Regras inegociáveis (consolidadas)

As da proposta + as já vigentes em `CONTRIBUTING.md`. Para cada uma, **como é aplicada** (regra sem verificação vira intenção):

| Regra | Aplicação |
|---|---|
| Não aceitar skill genérica que repete documentação | critério de existência (seção 3) + revisão |
| Não aceitar demonstração que seja só imagem | contrato de animação (6.1) + CI exige exemplo executável |
| Não aceitar movimento artificial ou transição brusca | checagens 6.2 + revisão independente |
| Não aceitar código sem execução e validação | CI + ficha com evidências |
| Qualidade antes de quantidade | critérios de saída por fase |
| Não comprometer a arquitetura existente | regra 0.1–0.2; mudanças aditivas |
| Não adicionar dependência sem justificativa | `docs/DECISOES.md` + checagem de CI |
| Não permitir que o agente altere projetos existentes sem autorização | regra 0.3 |
| Não incluir código/asset de terceiros sem licença verificada | `THIRD_PARTY_NOTICES.md` + CI |
| Documentação e exemplos sincronizados com a versão | README gerado, validador de links, changelog |
| *Vigentes:* texto e código em português; cores por tokens; `three` fora do bundle inicial; fallback e movimento reduzido em toda cena; lógica testável fora da cena; conteúdo fictício e genérico (sem nomes de empresas) | validador de skills + testes + revisão |
| *Aprendida na prática:* em ferramenta, **FPS baixo reduz custo, nunca derruba para o poster**; dado simulado sempre rotulado; arco/rota nunca "some e reaparece" | já registrado em `anim3d-mapas`, `-topologia`, `-performance-a11y`; entra no validador |

---

## 12. Decisões que dependem do dono (bloqueiam fases)

| # | Decisão | Bloqueia | Recomendação |
|---|---|---|---|
| D1 | Autorizar `git push` do trabalho novo | Publicação | **Autorizado (2026-11-11) com a ressalva de segurança:** branch nova `evolucao-skills`, sem `force`, para revisão antes de mesclar em `main` |
| D2 | Tratamento do ODbL do `world-countries` (L2) | Publicação | **Decidido e aplicado (2026-11-11), por segurança:** opção (b), snapshot gerado localmente e fora do git, com guarda automática e atribuições em `THIRD_PARTY_NOTICES.md` |
| D3 | Dependências do motor (molas, linha do tempo, pós-processamento) | Fase 2 | Molas e linha do tempo próprias; pós-processamento opcional; GSAP/Theatre só com justificativa e licença confirmada (ver `PLANO-EVOLUCAO.md`) |
| D4 | Perfis de hardware-alvo (A/B/C) | Orçamentos e fichas | Definir A e B no mínimo |
| D5 | Quem aprova a qualidade visual | Aprovação | O dono; revisão independente por agente é auxiliar |
| D6 | Nomes de pastas do padrão (`references/`, `assets/`) após confirmar a especificação aberta | Fase 1 | Adotar os padrões da especificação |
| D7 | Fonte tipográfica e modelos `.glb` com licença livre | Famílias 07/08 | Gerar contorno próprio ou escolher licença permissiva e registrar |
| D8 | Telemetria ao vivo da topologia (contrato e fontes **já escritos e testados**; falta ligar à tela e a ponte local): fazer antes ou depois da Fase 1? | Ordem | Terminar antes: está ~60% pronta e vira a primeira animação de prova da família Data Flow |

---

## 13. Estado do trabalho em andamento

### Progresso desde a auditoria (Fase 1 parcial, só arquivos novos, nada existente alterado)

| Entrega | Estado |
|---|---|
| `docs/PADRAO-DE-SKILL.md` + `scripts/validar-skills.mjs` (roda dentro de `npm run verificar`) | **Feito.** 12 skills validadas; as 10 antigas só com aviso de `skill.meta.json` |
| `anim3d-estilos` (SKILL + 8 fichas de estilo, 2 deles com exemplo já existente) | **Feito** (as 12 fichas restantes continuam planejadas) |
| `anim3d-motion` (SKILL + referências + motor `mola.ts`/`linha.ts` com 14 testes + exemplo `ComparaMolas`) | **Feito** (rolagem, trajeto de câmera e morph ainda planejados) |
| Roteador conhece as duas skills novas | **Feito** |
| README: estrutura e linha de testes corrigidas | **Feito** (o selo de testes ainda precisa de script que o gere) |
| Commits locais + tag `baseline-pre-evolucao` | **Feito** (2026-11-11) |
| Fase 0 restante (ODbL, `DECISOES.md`, `THIRD_PARTY_NOTICES.md`) | **Pendente: aguarda decisão do dono (D1 push, D2 ODbL)** |
| `anim3d-qa`, instalador, CI, `AGENTS.md` | Pendente (Fase 1) |

| Item | Estado |
|---|---|
| `anim3d-mapas` (mapa plano e globo, países, data centers, Brasil/IBGE) | Entregue e testado |
| `anim3d-topologia` (editor 2D/3D, pacote, depurar) | Entregue e testado |
| `anim3d-infra-fisica`, `-rede-logica`, `-wifi-rf`, `-infra-validacao` (família "Network Infrastructure Designer": 13 especialidades propostas consolidadas em 4 skills; motores testados + exemplo 3D `RackEmpresa` na galeria) | Entregue em 2026-11-11 (v0.1.0); exemplo de Wi-Fi `CoberturaWifi` entregue; faltam Exploded e Walkthrough |
| Telemetria ao vivo (`telemetria.ts`, `fontesDados.ts`, 24 testes na topologia) | **Camada de dados pronta**; faltam a ponte local, a animação de fluxo por Mbps na tela e o painel "Dados ao vivo" |
| `anim3d-grafos` (conceitos de visualizadores de redes multicamada) | Planejada na Fase 3; **referência com licença copyleft: só conceitos** |
| `docs/PLANO-EVOLUCAO.md` | Anexo técnico (motor, famílias, animações) |

**Instrução ao agente executor:** **nunca** executar `git push` nem publicar nada sem autorização explícita do dono (D1) e sem D2 resolvida; commits locais são livres e devem ser pequenos e descritivos. Concluir o restante da Fase 0 e pedir aprovação antes da Fase 1.
