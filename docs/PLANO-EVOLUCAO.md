# Plano técnico de evolução do anim3d-suite

> **Anexo técnico do [`ANIM3D_MASTER_PLAN.md`](../ANIM3D_MASTER_PLAN.md)** (fases 1 a 3: motor de movimento, famílias e animações de prova). Em caso de conflito, vale o plano mestre.
>
> **Escopo reduzido pela direção "skills primeiro, poucos exemplos":** a lista de ~20 animações da seção 5 é um **catálogo de candidatas**. Implemente só as necessárias para provar uma skill (até 5 na Fase 2). O motor da seção 3 continua valendo, em versão mínima.

Documento para quem vai **implementar** (o Claude Code, ou uma pessoa). Parte de uma avaliação externa que propõe transformar a suíte numa biblioteca de experiências visuais 3D de alto impacto: motor de movimento, 8 famílias estéticas, ~20 animações, galeria comparativa. A avaliação está certa no essencial; este plano a traduz em entregas verificáveis **sem alterar a arquitetura atual** e sinaliza onde ela conflita com as regras da casa.

> Regra zero: **nada do que existe muda de comportamento.** Tudo é aditivo. `npm run verificar` verde antes e depois de cada fase; nenhum exemplo, skill ou export atual é removido ou renomeado.

---

## 1. Ponto de partida (o que já existe e deve ser reaproveitado)

| Já pronto | Onde | Reuso previsto |
|---|---|---|
| Easing, `amortecer`, `bezier`, `progresso`, `lerp` | `anim3d-fundamentos/kit/src/movimento.ts` | Base dos presets e da linha do tempo |
| Progresso por rolagem | `viewport.ts` (`calcularProgresso`, `useProgressoScroll`) | Scroll storytelling |
| Enquadramento de câmera | `three-util.ts` (`enquadrarPerspectiva`, `enquadrarOrto`) | Coreografia de câmera |
| Cascata de fallback e movimento reduzido | `Cena3DSegura`, `useMovimentoReduzido` | Contrato de toda animação nova |
| Degradação adaptativa por FPS | `qualidade.ts`, `MonitorQualidade` | Níveis de qualidade de cada efeito |
| Descarte de recursos, pausa fora da tela, perda de contexto | `descartar`, `PausaAutomatica`, `GuardaContexto` | Idem |
| Skills por área, roteador, evals | `anim3d-*/SKILL.md`, `anim3d-roteador/evals/` | Cada família ganha skill/seção e evals |

Cobertura atual das 8 famílias propostas:

| Família | Estado | O que existe |
|---|---|---|
| 06 Data Flow / Network | **parcial, forte** | `Ecossistema3D`, topologia 3D com pacotes, globo/mapa com arcos |
| 08 Digital Twin | **parcial** | Almoxarifado 3D, Centro de Comando |
| 01 Liquid / Organic | **ausente** | — |
| 02 Holographic / Sci-fi | **ausente** (há estilo neon no Centro de Comando) | — |
| 03 Particles / Generative | **ausente** (há partículas de tráfego, pequenas) | — |
| 04 Mechanical / Exploded | **ausente** | — |
| 05 Glass / Refraction | **ausente** | — |
| 07 Kinetic / Motion Design | **ausente** (há CSS 3D de microinterações) | — |

**Consequência:** 6 famílias são novas; 2 são expandidas. A galeria atual continua como está e ganha um agrupamento por família (fase 5).

---

## 2. Decisões de dependência (precisam do dono do projeto)

A regra da casa é **"sem dependência nova sem discutir"** (`CONTRIBUTING.md`, regra 6). A avaliação sugere GSAP, React Spring, Theatre.js e pós-processamento. Recomendação, com o motivo, para o dono decidir:

| Tecnologia proposta | Recomendação | Motivo |
|---|---|---|
| **Molas (React Spring)** | **Não adotar; implementar em casa** (`physics/mola.ts`, ~80 linhas, testada em Node) | Em cena 3D a mola roda dentro do `useFrame` sem re-render do React; React Spring força estado. Fica sem dependência e testável |
| **Linha do tempo (GSAP)** | **Implementar em casa** (`timelines/`) e **só** adotar GSAP se um caso real provar que falta algo | Cobrir faixas, keyframes, rótulos, seek e rolagem é pequeno. **Confirmar a licença vigente do GSAP antes de qualquer adoção** (há cláusulas de uso) |
| **Theatre.js** | **Só como ferramenta de autoria opcional**, exportando um JSON de keyframes que o runtime próprio lê. **Não** no bundle de produção | Peso e licença do estúdio (**confirmar**; o módulo do editor costuma ter licença mais restritiva) |
| **Pós-processamento (bloom, DoF)** | **Adotar `postprocessing` (pmndrs) como dependência opcional, carregada sob demanda, só no nível "premium"** | Bloom e profundidade de campo dão o acabamento que falta; sem isso o brilho continua falso com `AdditiveBlending`. Custo alto: exige nível de qualidade e fallback sem pós-processamento. **Confirmar licença e peso** |
| **GLSL próprio** | **Sim** (`shaders/`) | Já usamos `ShaderMaterial` (atmosfera do globo). Sem dependência |
| **`@react-three/drei`** | Continua **fora** (decisão anterior) | Câmera orbital e helpers próprios já resolvem |

> Se o dono preferir GSAP/React Spring/Theatre mesmo assim, registre a decisão em `docs/DECISOES.md` com versão, licença, peso gzip e **qual família usa**, e carregue por `import()` dentro do módulo da cena (nunca no bundle inicial; regra 3).

---

## 3. Novo módulo: `anim3d-motion/`

Aditivo, ao lado dos demais. Não substitui `movimento.ts`; **importa dele**.

```
anim3d-motion/
├── SKILL.md                 quando usar cada peça, receitas, armadilhas medidas
├── motor/                   TS puro (sem React/three): testável em Node
│   ├── physics/mola.ts          molas, inércia, elasticidade
│   ├── timelines/linha.ts       faixas, keyframes, rótulos, seek, reverso
│   ├── timelines/rolagem.ts     liga a linha do tempo ao progresso de rolagem
│   ├── camera/coreografia.ts    trajetos de câmera por keyframes
│   ├── transitions/morfar.ts    interpolação entre formas de mesmo número de vértices
│   └── presets/*.ts             movimentos reutilizáveis
├── r3f/                     ligações com React Three Fiber (importa three)
│   ├── useMola.ts, useLinhaDoTempo.ts, CameraCoreografada.tsx
│   ├── particulas/              sistema de partículas (Points/Instanced + GLSL)
│   └── shaders/                 trechos GLSL e fábricas de material
├── exemplo/                 as animações demonstrativas (seção 5)
└── testes/
```

Alias novo no `tsconfig.json`/`vitest.config.ts`/`vite.config.ts`: `@anim3d/motion` (puro) e `@anim3d/motion/cena` (three/R3F), **espelhando** o par `@anim3d/kit` / `@anim3d/kit/cena`. Assim `three` continua fora do bundle inicial.

### 3.1 APIs mínimas (contrato; os nomes seguem o português da suíte)

```ts
// physics/mola.ts
criarMola({ rigidez = 170, amortecimento = 26, massa = 1 }): Mola
passoMola(m: Mola, estado: { x: number; v: number }, alvo: number, dt: number): { x: number; v: number }
// integração semi-implícita com sub-passos (dt máx. 1/120): estável com dt grande; repouso detectado por limiar

// timelines/linha.ts
criarLinha(faixas: Faixa[], opcoes?: { duracao?: number; repetir?: boolean }): Linha
linha.em(t): Record<string, number>   // valor de cada faixa no instante t (função pura)
linha.rotulo('entrada'): number       // tempo de um rótulo
// Faixa = { chave, quadros: { t, valor, ease? }[] } com EASE e bezier do movimento.ts

// timelines/rolagem.ts
ligarARolagem(linha, calcularProgresso): (alturaElemento, topo, janela) => valoresDaLinha

// camera/coreografia.ts
criarTrajeto({ pontos: { t, posicao, alvo, fov? }[], suavizar: 'catmull' | 'linear' }): Trajeto
trajeto.em(t): { posicao, alvo, fov }   // Catmull-Rom; sem saltos entre segmentos

// transitions/morfar.ts
morfar(a: Float32Array, b: Float32Array, t: number, saida: Float32Array): void  // exige a.length === b.length
reamostrar(pontos: Float32Array, n: number): Float32Array                        // iguala contagens
```

**Critérios de aceite do motor** (testes em Node, antes de qualquer cena):
- Mola: converge ao alvo; **não explode** com `dt` de 0,5 s; resultado independe do FPS (mesmo estado final com 30, 60 e 144 passos/s dentro de tolerância); crítica (sem oscilar) quando `amortecimento ≥ 2·√(rigidez·massa)`.
- Linha do tempo: continuidade nos nós (`em(t±ε)` sem salto), `seek` determinístico, reverso espelha o direto.
- Trajeto de câmera: velocidade contínua (sem salto de derivada) entre segmentos; `em(0)` e `em(fim)` exatos.
- Morfar: `t=0` e `t=1` reproduzem `a` e `b` exatamente; `reamostrar` preserva o contorno.
- **Movimento reduzido:** todo preset tem variante `reduzido` (sem oscilação, sem trajetória longa; só fade/posição final).

---

## 4. Contrato de cada animação nova ("definição de pronto")

Cada exemplo em `anim3d-motion/exemplo/<familia>/<nome>/` entrega **todos** estes itens, senão não entra na galeria:

1. **Componente de página leve** + **cena carregada sob demanda** (`Cena3DSegura`), sem texto de marketing embutido.
2. **Fallback honesto** (poster SVG/imagem que comunica o conceito) e **movimento reduzido** tratado (estado final estático para decorativas; carrega parada para ferramentas).
3. **Níveis de qualidade declarados**: cada efeito caro lista seu custo e seus degraus (ex.: nível 1 → `dpr 1`; 2 → sem pós-processamento/menos partículas; 3 → sem refração). **Nunca cai para o poster por FPS** quando for ferramenta (lição medida em `anim3d-mapas`); decorativa pode.
4. **Orçamento** (triângulos, draw calls, partículas, textura, peso gzip da cena) dentro da tabela do roteador, registrado no cartão da galeria **com número medido**.
5. **Movimento contínuo e sem saltos**: teste automático amostrando posição/uniforme ao longo da linha do tempo e checando continuidade; transições com `amortecer`/mola, nunca `lerp` fixo por quadro.
6. **Interação** quando fizer sentido (mouse/toque/câmera) com `touch-action` correto e sem sequestrar a rolagem da página (zoom só com Ctrl/Cmd).
7. **Responsividade**: captura em 1440 e 390 de largura, sem rolagem horizontal.
8. **Acessibilidade**: `rotulo` ou `aria-hidden` coerente; alternativa em texto/lista quando houver informação.
9. **Cores por tokens** (`useTokens`), conteúdo fictício, sem nomes de empresas.
10. **Teste de Node** para toda a lógica que não é desenho (geração procedural, simulação, interpolação).
11. **Entrada na galeria** com descrição, técnicas, destaques, métricas medidas e arquivos.
12. **Seção no `SKILL.md`** da família/área com a receita e as **armadilhas medidas**.

**Portões de qualidade visual** (honestos, porque estética não se prova por teste unitário):
- **Capturas** de cada animação em 3 instantes (início, meio, fim) e em 2 larguras, revisadas por uma pessoa.
- **FPS em GPU real.** O ambiente de desenvolvimento do Claude Code costuma ter **WebGL por software**, que serve para layout e fluxo, **não para medir FPS**. Criar `anim3d-performance-a11y/scripts/medir-fps.mjs` (Chrome via DevTools Protocol, GPU habilitada) e **rodar na máquina do dono** antes de aprovar uma animação. Sem esse número, o cartão da galeria mostra "FPS não medido".
- **Revisão de referência:** cada família tem 3–5 referências visuais (links ou descrições) registradas em `docs/REFERENCIAS.md`; a animação é comparada com elas, não com a anterior.

---

## 5. As 8 famílias e as ~20 animações demonstrativas

Cada família usa **só** o que entrega resultado; nada de todas as técnicas em todas as cenas. Numeração = ordem de implementação dentro da família.

### 01 Liquid / Organic
1. **Blob cromado**: esfera com deslocamento por ruído simplex no vertex shader + matcap/ambiente; respira com mola, reage ao mouse. *Técnica:* GLSL próprio, `MeshStandardMaterial` com `onBeforeCompile` ou `ShaderMaterial`, ambiente `RoomEnvironment`.
2. **Morph entre formas**: esfera → toro → forma procedural genérica por `morfar` (mesma contagem de vértices via `reamostrar`), transição por mola com leve overshoot. *Técnica:* buffers de posição, normais recalculadas.

### 02 Holographic / Sci-fi
3. **Painel holográfico**: plano translúcido com scanlines, fresnel, ruído de falha ocasional e dados em HTML por cima. *Técnica:* GLSL (fresnel + scanline), `AdditiveBlending`.
4. **HUD volumétrico**: anéis concêntricos girando em velocidades diferentes, cones de luz falsos e marcadores que seguem alvos. *Técnica:* geometria simples + aditivo; bloom só no nível premium.

### 03 Particles / Generative
5. **Campo de curl noise** (100–200 mil partículas): fluxo contínuo que desvia do cursor. *Técnica:* `Points` com posição calculada no vertex shader (sem atualizar buffer na CPU). **Orçamento obrigatório:** níveis de 200k → 60k → 15k.
6. **Constelação que forma uma forma**: partículas migram de estado caótico para um alvo (texto/silhueta genérica gerada por canvas), por mola por partícula no shader e rolagem como gatilho.
7. **Espiral galáctica**: braços por função matemática, cor por velocidade, câmera em órbita lenta coreografada.

### 04 Mechanical / Exploded View
8. **Vista explodida** de um objeto procedural (conjunto de engrenagens + carcaça): peças se afastam ao longo de eixos por `linha do tempo` ligada à **rolagem**, com rótulos HTML por peça.
9. **Engrenagens encadeadas** com **razão de dentes correta** (a rotação de cada engrenagem vem da anterior): a cinemática é função pura testada em Node; a cena só desenha.

### 05 Glass / Refraction
10. **Lente/esfera de vidro** com `MeshPhysicalMaterial` (`transmission`, `thickness`, `ior`) sobre cena com cores atrás; reage ao mouse.
11. **Caustics falsos** sobre um piso (shader animado) sob um objeto de vidro. **Custo alto:** nível 2 desliga `transmission` e usa material translúcido barato.

### 06 Data Flow / Network
12. **Topologia 3D com telemetria ao vivo** (continuação direta do trabalho em curso): partículas por cabo ∝ Mbps, cor por utilização, perda visível, ponte local de dados reais (ver seção 7).
13. **Rede neural 3D** com propagação de ativação camada a camada (pulso ao longo das arestas, brilho decai). Lógica de propagação pura e testada.
14. **Rede multicamada** (conceito inspirado em visualizadores acadêmicos de redes multicamada): camadas como planos/discos empilhados, nós replicados entre camadas, arestas intra e inter-camada, layout por camada e arranjo entre camadas, busca com voo de câmera, destaque de vizinhança. *Só conceitos; não copiar código de projetos com licença copyleft.*

### 07 Kinetic / Motion Design
15. **Tipografia 3D cinética**: texto extrudado com *stagger* por letra, câmera coreografada, luz que varre. *Atenção:* a fonte precisa ter licença adequada ou ser gerada por contorno próprio; registrar a origem.
16. **Transição cinematográfica entre 3 cenas** controlada pela rolagem (câmera + *wipe* em shader), sem corte e sem salto ao inverter a rolagem.

### 08 Digital Twin / Environments
17. **Cidade low-poly com tráfego**: instancing, 3 níveis de detalhe, ciclo dia/noite simples.
18. **Linha de produção** reutilizando a simulação do almoxarifado como base (invariantes testados).
19. **Datacenter**: fileiras de racks, mapa de calor de temperatura no piso, alertas que ligam à topologia.
20. **Mapa 3D extrudado do Brasil**: altura por indicador (reuso de `ibgeBrasil.ts`), câmera que mergulha do globo até o estado (o "gesto assinatura" já listado como próximo passo em `anim3d-mapas`).

Ordem sugerida por **valor × risco**: 1, 3, 5, 12, 8, 16, 20 primeiro (cada uma de uma família diferente, para provar variedade cedo); o restante depois.

---

## 6. Galeria

Aditivo em `demo/galeria.tsx` (nenhum cartão atual muda):
- Novo agrupamento **por família** (as 8) e um filtro por técnica.
- **Comparação lado a lado** (modo "estilos") de duas animações com o mesmo seletor de qualidade.
- **Seletor global de qualidade** (alto/médio/baixo) que força `nivel` nas cenas, para ver os degraus sem esperar o FPS cair.
- Cartão com **métricas medidas** (triângulos, draw calls, peso gzip; FPS só se medido em GPU real).
- Respeitar `?respeitar=1` (movimento reduzido real) como hoje.

---

## 7. Como os trabalhos em andamento se encaixam

| Em andamento | Onde entra |
|---|---|
| **Telemetria ao vivo da topologia** (contrato `telemetria.ts`, fontes plugáveis `fontesDados.ts`, **já escritos e testados**) | Falta ligar à tela (partículas por cabo ∝ Mbps, cor por utilização, painel "Dados ao vivo") e a **ponte local em Node** (`ponte.mjs`, ICMP/HTTP/contadores da placa). Entra como animação nº 12 |
| **Skill de grafos/multicamada** (conceitos do visualizador de redes multicamada) | Animação nº 14 + nova skill `anim3d-grafos` (layout 3D em TS puro, arranjo de camadas, comunidades, busca com foco). **Licença do projeto de referência é copyleft: só ideias, nenhum trecho de código** |
| **Mapas** | Animação nº 20 (extrusão + mergulho) |

---

## 8. Fases, entregas e critérios

| Fase | Entrega | Aceite |
|---|---|---|
| **0** | `docs/DECISOES.md` (dependências decididas) e `docs/REFERENCIAS.md` (3–5 por família) | Dono aprovou a seção 2 |
| **1** | `anim3d-motion/motor` (mola, linha, rolagem, trajeto, morfar, presets) + alias + testes + `SKILL.md` | Testes da seção 3 verdes; `npm run verificar` verde; nenhum arquivo existente alterado além de `tsconfig`/`vitest`/`vite` (alias) |
| **2** | `r3f/` (`useMola`, `useLinhaDoTempo`, `CameraCoreografada`, partículas GLSL, fábrica de shaders) | Uma cena mínima por peça roda no navegador; sem erro de console; descarte de recursos verificado |
| **3** | **7 animações de prova**, uma por família diferente (1, 3, 5, 12, 8, 16, 20) | Cada uma cumpre os 12 itens da seção 4; capturas revisadas; FPS medido na GPU do dono |
| **4** | Restante das ~20 animações | Idem, em lotes de 3 |
| **5** | Galeria por família, comparação, seletor de qualidade, métricas | Galeria abre sem regressão dos cartões atuais |
| **6** | `medir-fps.mjs`, testes de fluidez e desempenho, evals novos no roteador (um por família), atualização do roteador e do README | `claude plugin eval` rodado; tabela de FPS por animação e nível |

**Riscos e mitigação**
- **Estética é subjetiva.** Mitigar com referências (fase 0) e revisão humana das capturas; não declarar "alto impacto" sem isso.
- **Sem GPU no ambiente do agente.** FPS só vale medido na máquina do dono; até lá o cartão diz "não medido".
- **Peso e custo de pós-processamento, refração e partículas.** Sempre atrás de nível de qualidade; carregamento sob demanda; fallback sem o efeito.
- **Licenças** (GSAP, Theatre.js, pós-processamento, fontes, referências copyleft). Confirmar antes de adotar; registrar em `DECISOES.md`.
- **Escopo.** Qualidade e variedade antes de quantidade: se a fase 3 mostrar que as 7 provas não ficaram boas, **parar e ajustar o motor** antes de produzir mais.

## 9. Perguntas em aberto para o dono

1. As recomendações da seção 2 (molas e linha do tempo próprias; Theatre só como ferramenta; pós-processamento opcional) estão aprovadas?
2. Qual é o **hardware-alvo** (GPU integrada de notebook, celular de entrada, desktop com GPU dedicada)? Define os orçamentos.
3. Há **fonte tipográfica** licenciada para a animação 15, ou geramos contorno próprio?
4. Posso usar **modelos `.glb`** reais (com licença livre) em algumas famílias, ou mantemos tudo procedural?
5. Prioridade entre **dados reais na topologia** (nº 12) e a **fase 1 do motor**: fazer a telemetria antes (já está ~60% pronta) ou depois do motor?
