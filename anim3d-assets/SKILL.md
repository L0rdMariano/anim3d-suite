---
name: anim3d-assets
description: "Pipeline de assets 3D para a suíte anim3d: modelagem low poly, exportação glTF/GLB, compressão (Draco/Meshopt/KTX2), texturas, animações embutidas, geração procedural e carregamento. Use ao criar, converter, otimizar ou carregar modelos 3D."
---

# Assets 3D

## Procedural primeiro, arquivo depois

Para formas simples (caixas, cilindros, cabos, plataformas), **construa em código** com primitivas (`BoxGeometry`, `CylinderGeometry`) e materiais compartilhados. Zero download, zero licença, cor por token, mudança trivial. Use `.glb` só quando a forma é orgânica ou de marca.

## Formato

- **GLB** (glTF binário) é o padrão. Evite OBJ/FBX/DAE na entrega.
- Uma unidade = 1 metro; origem na base do objeto; eixo Y para cima; escala aplicada (1,1,1) e transformações congeladas.
- Nomes de nós e materiais em minúsculas e sem espaços (`rotor`, `corpo`); o código localiza por nome.

## Modelagem

| Item | Meta |
|---|---|
| Estilo | Low poly, faces chapadas, sem *n-gons*, normais consistentes |
| Triângulos por objeto | UI ≤ 2k · dashboard ≤ 5k · hero ≤ 30k |
| Materiais | 1–3 por objeto, reaproveitados entre objetos |
| Cor | Vertex color ou 1 material por cor; evite texturas para cores chapadas |
| Texturas | Potência de 2, ≤ 1024 px (≤ 2048 só no hero), sem alfa desnecessário |

## Otimização (nesta ordem)

1. **Reduza** geometria (decimate/limited dissolve) e remova faces invisíveis.
2. **Mescle** materiais e malhas estáticas.
3. **Comprima**: `gltf-transform optimize in.glb out.glb` (Draco ou Meshopt para malha; KTX2/Basis para textura). Mesh compression exige o decoder correspondente no loader.
4. **Instancie** repetições (`InstancedMesh`) em vez de clonar.
5. Meça o resultado: o `.glb` final de UI/dashboard fica em poucas dezenas de KB; hero abaixo de ~1 MB.

## Carregamento

```tsx
const gltf = useLoader(GLTFLoader, url, (loader) => {
  loader.setDRACOLoader(draco);   // configure decoder se usar Draco
});
```

- `Suspense` com poster/esqueleto; falha de carga não pode quebrar a tela (error boundary + fallback).
- Cache e `Cache-Control: immutable` com hash no nome do arquivo.
- Pré-carregue só o que a próxima tela vai usar.
- Descarte no desmonte: `descartar(cena)` de `@anim3d/kit/cena` percorre a árvore e libera geometria, material e texturas (útil para glTF clonado, que o R3F não descarta sozinho).
- Envolva a cena com `Cena3DSegura` (kit): falha de carga ou de shader volta ao fallback sem quebrar a página.

## Animação embutida

- Clips curtos e em loop, nomeados (`entrar`, `idle`, `sair`). Use `AnimationMixer`; atualize só quando visível.
- Para movimento simples (rotação, flutuação), prefira código a clip: menos bytes e fácil de parametrizar.

## Licença e origem

- Registre origem e licença de cada asset (`ASSETS.md`: arquivo, autor, licença, link).
- CC0/CC-BY apenas, com atribuição quando exigida. Nada de modelo sem licença clara.
- Conteúdo público: sem logotipos, nomes ou dados internos nas texturas ou nos nomes dos nós.

## Checklist

- [ ] Procedural não resolvia?
- [ ] GLB com escala, origem e nomes padronizados
- [ ] Comprimido e medido
- [ ] Fallback e erro de carga tratados
- [ ] Licença registrada
