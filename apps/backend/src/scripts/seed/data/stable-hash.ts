/** FNV-1a: stabilní „náhodné“ pořadí a výběr v testovacích datech, bez generátoru náhody. */
export const stableHash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
