# Padrão de skill do anim3d-suite

O que toda skill precisa ter. É verificado por `npm run validar:skills` (também roda dentro de `npm run verificar`).

## Estrutura

```
anim3d-<area>/
├── SKILL.md            workflow do agente (frontmatter + passos + checklist)
├── references/         conhecimento detalhado, carregado só quando necessário
├── exemplo/            1 a 2 exemplos executáveis (prova e ensino, não vitrine)
├── motor/              (se houver) lógica pura reutilizável, com testes
├── assets/             (se houver) recursos próprios ou com licença registrada
├── scripts/            (se houver) verificações e ferramentas
└── skill.meta.json     versão, licenças, dependências, compatibilidade
```

Skills criadas **antes** deste padrão (lista `LEGADO` no validador) ainda não têm `skill.meta.json`: aparece como aviso. **Skill nova sem ele é erro.**

## SKILL.md

1. **Frontmatter** com `name` (igual ao nome da pasta) e `description`.
   - A `description` diz **o que faz** e **quando usar**, com as palavras que o usuário diria, e contém "Use ao/antes/sempre que ...". Termine incluindo "mesmo que o pedido não diga 'anim3d'" quando fizer sentido.
2. **Workflow** em passos numerados que o agente executa.
3. **Tabelas de decisão** (quando usar X ou Y), com o motivo.
4. **Armadilhas medidas**: sintoma, causa e correção. Só entra o que foi observado ou testado; o que o modelo já sabe sozinho não precisa de skill.
5. **Checklist de saída.**
6. **Próximos passos** (backlog aberto).

**Limite: 150 linhas.** O detalhe vai para `references/`. Skills antigas acima do limite recebem aviso.

## Critério para existir

Uma skill nova só entra se:
- responde a um tipo de pedido que as existentes não cobrem;
- tem ao menos um exemplo ou motor **executável** (teste ou captura);
- tem ao menos uma "armadilha medida" que o modelo não saberia sozinho;
- não é uma cópia da documentação oficial.

## `skill.meta.json`

```json
{
  "nome": "anim3d-exemplo",
  "versao": "0.1.0",
  "licencas": ["MIT"],
  "dependencias": [],
  "compatibilidade": { "claude-code": "verificado", "codex": "a confirmar" }
}
```

`compatibilidade` só marca **"verificado"** onde houve teste registrado; o resto fica **"a confirmar"**.

## Regras de conteúdo

- Texto e código em português.
- Cores por tokens (`useTokens`), nunca hex solto na cena.
- Conteúdo genérico: sem nomes de empresas, pessoas ou clientes.
- Referências externas com **autor, URL e licença**; ideias, não código copiado.
- Todo exemplo com fallback e movimento reduzido tratados.
- Em ferramenta, FPS baixo reduz custo, **nunca** derruba a cena para o poster.

## Como acrescentar uma skill

1. Escreva o `SKILL.md` e as `references/`.
2. Se houver lógica, coloque em `motor/` ou `exemplo/` com teste em Node.
3. Crie o `skill.meta.json`.
4. `npm run verificar` verde.
5. Acrescente a linha no roteador (`anim3d-roteador/SKILL.md`) e no README.
6. Copie para `~/.claude/skills/` (ou use o instalador, quando existir).
