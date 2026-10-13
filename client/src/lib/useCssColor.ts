import { useEffect, useState } from 'react';

/** Resolves `--token` RGB triplets to colour strings for SVG charts, updating when the theme changes. */
export function useCssColors<T extends string>(vars: readonly T[]): Record<T, string> {
  const read = () =>
    Object.fromEntries(
      vars.map((v) => [v, `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${v}`).trim()})`]),
    ) as Record<T, string>;
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return colors;
}
