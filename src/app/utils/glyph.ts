export type GlyphSet = 'place' | 'category' | 'tab';

export function placeIconKey(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (normalized === 'add place' || normalized.startsWith('add ')) {
    return 'plus';
  }
  if (normalized.includes('revolut')) {
    return 'revolut';
  }
  if (normalized.includes('paypal')) {
    return 'paypal';
  }
  if (normalized.includes('satispay')) {
    return 'satispay';
  }
  if (normalized.includes('post')) {
    return 'post';
  }
  if (normalized.includes('ing')) {
    return 'ing';
  }
  if (normalized.includes('credit')) {
    return 'card';
  }
  if (normalized.includes('cash')) {
    return 'cash';
  }

  return 'wallet';
}

export function categoryIconKey(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (normalized === 'add category' || normalized.startsWith('add ')) {
    return 'plus';
  }
  if (normalized.includes('food')) {
    return 'food';
  }
  if (normalized.includes('baby')) {
    return 'baby';
  }
  if (normalized.includes('car maintenance') || normalized.includes('maintenance')) {
    return 'wrench';
  }
  if (normalized.includes('public transport') || normalized.includes('bus')) {
    return 'bus';
  }
  if (normalized.includes('fuel')) {
    return 'fuel';
  }
  if (normalized.includes('toll')) {
    return 'road';
  }
  if (normalized.includes('insurance')) {
    return 'shield';
  }
  if (normalized.includes('wifi') || normalized.includes('wi-fi') || normalized.includes('internet')) {
    return 'wifi';
  }
  if (normalized.includes('telephone') || normalized.includes('phone')) {
    return 'phone';
  }
  if (normalized === 'gas' || normalized.includes('gas')) {
    return 'flame';
  }
  if (normalized.includes('electric')) {
    return 'zap';
  }
  if (normalized.includes('utilit')) {
    return 'droplet';
  }
  if (normalized.includes('condominio') || normalized.includes('building')) {
    return 'building';
  }
  if (normalized.includes('mortgage') || normalized.includes('home') || normalized.includes('house')) {
    return 'home';
  }
  if (normalized.includes('unexpected')) {
    return 'alert';
  }
  if (normalized.includes('entertainment')) {
    return 'film';
  }
  if (normalized.includes('salary')) {
    return 'banknote';
  }
  if (normalized.includes('invest')) {
    return 'trend';
  }

  return 'tag';
}

export function tabIconKey(name: string): string {
  switch (name) {
    case 'Table':
      return 'table';
    case 'Visualization':
      return 'layout';
    case 'Charts':
      return 'chart';
    case 'Insert Data':
      return 'plus';
    case 'Categories':
    case 'Settings':
      return 'settings';
    default:
      return 'tag';
  }
}

export function glyphKey(set: GlyphSet, name: string): string {
  if (set === 'place') {
    return placeIconKey(name);
  }
  if (set === 'tab') {
    return tabIconKey(name);
  }
  return categoryIconKey(name);
}
