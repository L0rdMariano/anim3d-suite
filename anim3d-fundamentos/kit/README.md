# Kit anim3d

Utilitários testados (TypeScript, React 19 + R3F 9 + three 0.187; 21 testes Vitest/jsdom).

## Instalar num projeto

1. Copie `kit/src/` para o projeto, por exemplo `src/anim3d/kit/`.
2. Crie os aliases (ou use caminhos relativos):

```jsonc
// tsconfig.json → compilerOptions.paths
"@anim3d/kit":   ["./src/anim3d/kit/index.ts"],
"@anim3d/kit/*": ["./src/anim3d/kit/*"]
```
```ts
// vite.config.ts → resolve.alias
[{ find: /^@anim3d\/kit$/, replacement: '/src/anim3d/kit/index.ts' },
 { find: /^@anim3d\/kit\/(.*)$/, replacement: '/src/anim3d/kit/$1' }]
```

3. Dependências: `react`, `three`, `@react-three/fiber`. Testes: `vitest jsdom @testing-library/react` (copie `kit/testes/` e ajuste os imports).

## Duas entradas: não misture

| Import | Contém | Onde usar |
|---|---|---|
| `@anim3d/kit` | `Cena3DSegura`, hooks (`useProximo`, `useMovimentoReduzido`, `useTokens`, `useProgressoScroll`, `useAbaVisivel`), `movimento` (EASE, amortecer…), `temWebGL`, `criarMedidorQualidade` | Página que hospeda a cena (bundle inicial) |
| `@anim3d/kit/cena` | `enquadrarOrto`, `enquadrarPerspectiva`, `descartar`, `PausaAutomatica`, `MonitorQualidade`, `GuardaContexto` | **Só** dentro do módulo da cena carregado por `import()` |

Importar `@anim3d/kit/cena` na página puxa o three (~245 KB gz) para o bundle inicial. Isso foi medido: 1,15 MB → 223 KB ao separar.

## Padrão de uso

```tsx
// Pagina.tsx  (bundle inicial)
import { Cena3DSegura } from '@anim3d/kit';
const carregar = () => import('./MinhaCena');           // fora do componente
<Cena3DSegura carregar={carregar} props={dados} fallback={<Poster />} rotulo="…" aspecto="16 / 9" />

// MinhaCena.tsx  (chunk sob demanda)
import { useTokens, type PropsCena } from '@anim3d/kit';
import { GuardaContexto, PausaAutomatica } from '@anim3d/kit/cena';
export default function MinhaCena({ aoFalhar, ...dados }: Dados & PropsCena) {
  return <Canvas frameloop="demand">…<GuardaContexto aoPerder={aoFalhar} /></Canvas>;
}
```

`Cena3DSegura` aplica a cascata: sem WebGL/erro → `fallback`; movimento reduzido → `reduzido` (ou `fallback`); fora da tela → `fallback`; senão carrega a cena. Expõe `data-modo` para testes e para o `verificar-navegador.mjs`.

Exemplos completos e verificados no navegador: `anim3d-saas/exemplo/` (hero) e `anim3d-dashboard/exemplo/` (colunas com InstancedMesh).
