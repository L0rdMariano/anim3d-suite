// Cores da cena vindas das variáveis CSS do design system, atualizadas ao trocar de tema.
import { useEffect, useState } from 'react';

/**
 * Lê variáveis CSS. `mapa` = { nomeNaCena: '--variavel-css' }.
 * `padrao` cobre SSR/testes e variáveis ausentes.
 */
export function leiaTokens<K extends string>(
  mapa: Record<K, string>,
  padrao: Partial<Record<K, string>> = {},
  el?: Element,
): Record<K, string> {
  const saida = {} as Record<K, string>;
  const alvo = el ?? (typeof document !== 'undefined' ? document.documentElement : undefined);
  const estilo = alvo && typeof getComputedStyle !== 'undefined' ? getComputedStyle(alvo) : undefined;
  for (const chave of Object.keys(mapa) as K[]) {
    const valor = estilo?.getPropertyValue(mapa[chave]).trim();
    saida[chave] = valor || padrao[chave] || '#888888';
  }
  return saida;
}

/**
 * Hook: relê os tokens quando muda `class`, `style` ou `data-theme` do <html>
 * ou a preferência de cor do sistema. Declare `mapa` e `padrao` FORA do componente.
 */
export function useTokens<K extends string>(
  mapa: Record<K, string>,
  padrao: Partial<Record<K, string>> = {},
): Record<K, string> {
  const [tokens, setTokens] = useState(() => leiaTokens(mapa, padrao));
  useEffect(() => {
    const reler = () => setTokens(leiaTokens(mapa, padrao));
    reler();
    const obs =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(reler)
        : undefined;
    obs?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    const midia = window.matchMedia?.('(prefers-color-scheme: dark)');
    midia?.addEventListener('change', reler);
    return () => {
      obs?.disconnect();
      midia?.removeEventListener('change', reler);
    };
  }, [mapa, padrao]);
  return tokens;
}
