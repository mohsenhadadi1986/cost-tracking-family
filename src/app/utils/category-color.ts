const CATEGORY_PALETTE = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0d9488',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
  '#0284c7',
  '#c026d3',
  '#b45309',
  '#e11d48',
  '#0369a1',
  '#16a34a',
  '#9333ea',
];

export function colorForCategory(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }

  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

export function colorsForCategories(names: string[]): string[] {
  const used = new Set<string>();

  return names.map(name => {
    let color = colorForCategory(name);
    let offset = 0;

    while (used.has(color) && offset < CATEGORY_PALETTE.length) {
      offset += 1;
      color = CATEGORY_PALETTE[(CATEGORY_PALETTE.indexOf(color) + 1) % CATEGORY_PALETTE.length];
    }

    used.add(color);
    return color;
  });
}
