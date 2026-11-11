# Como contribuir

Obrigado por querer melhorar a anim3d! Este guia cabe em 3 minutos.

## Preparar o ambiente

```bash
npm install
npm run verificar   # typecheck + testes: deve passar antes e depois da sua mudança
npm run demo        # http://localhost:5180/ (galeria de exemplos) e /almoxarifado.html
```

Requisito: Node.js 22+. A demo ignora o "reduzir movimento" do sistema por padrão; acrescente `?respeitar=1` à URL para testar o comportamento real de quem usa essa preferência.

## Tipos de contribuição

| Quero… | Onde mexer |
|---|---|
| Corrigir ou melhorar uma regra | `anim3d-*/SKILL.md`: explique o **porquê**, não só o "faça" |
| Novo utilitário reutilizável | `anim3d-fundamentos/kit/src/` + teste em `kit/testes/` |
| Novo exemplo | `anim3d-<área>/exemplo/` + cartão em `demo/galeria.tsx` + menção no `SKILL.md` da área |
| Corrigir bug visual | Componente do exemplo + captura antes/depois no PR |
| Novo caso de eval | `anim3d-roteador/evals/<caso>/` (formato do `claude plugin eval`) |

## Regras da casa

1. **Código e textos em português**, como o resto da suíte (nomes de variáveis inclusive).
2. **Cores só por tokens** (`useTokens` + variáveis CSS). Nada de hex solto na cena, salvo padrões de fallback.
3. **`three` nunca no bundle inicial.** A página importa `@anim3d/kit`; só a cena importa `@anim3d/kit/cena`.
4. **Toda cena tem fallback** e respeita movimento reduzido (decorativa: estática; ferramenta: carrega parada).
5. **Lógica testável fora da cena** quando houver regra de negócio (veja `almoxarifado/simulacao.ts`).
6. **Sem dependência nova** sem discutir numa issue antes (ex.: `@react-three/drei`).
7. **Conteúdo fictício e genérico:** nada de nome de empresa, pessoa, cliente ou dado real em textos, texturas ou capturas.
8. **Exemplos sem texto de marketing inventado:** o componente expõe o visual; o texto é do projeto que usa.

## Checklist do PR

- [ ] `npm run verificar` passa
- [ ] Abri no navegador (`npm run demo`) em desktop e em largura de celular
- [ ] Para mudança visual: rodei `node anim3d-performance-a11y/scripts/verificar-navegador.mjs <url> --larguras 1440,390` e anexei capturas
- [ ] Testei o movimento reduzido (`?respeitar=1` na demo)
- [ ] Atualizei o `SKILL.md` e/ou o README quando o comportamento mudou

## Dúvidas e ideias

Abra uma issue descrevendo o caso de uso. Capturas e a URL do exemplo ajudam muito.
