import { RecipeIngredient } from './recipeService';

export interface ImportedRecipeData {
  title: string;
  description: string;
  photoURL: string;
  servings: number;
  prepMins: number;
  cookMins: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  source: 'full' | 'partial';
}

// ── Duration ──────────────────────────────────────────────────────────────────

function parseDuration(iso: string): number {
  if (!iso) { return 0; }
  const match = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) { return 0; }
  const days = parseInt(match[1] ?? '0', 10);
  const hours = parseInt(match[2] ?? '0', 10);
  const mins = parseInt(match[3] ?? '0', 10);
  return days * 24 * 60 + hours * 60 + mins;
}

// ── Ingredient parsing ────────────────────────────────────────────────────────

const UNIT_PATTERN =
  'cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|g|grams?|kg|kilograms?|lbs?|pounds?|ml|l|litres?|liters?|cloves?|slices?|pieces?|cans?|pkgs?|packages?|bunches?|heads?|stalks?|sprigs?|pinch|handful|dash|fl\\.?\\s*oz';

const INGREDIENT_RE = new RegExp(
  `^([\\d½¼¾⅓⅔⅛⅜⅝⅞\\s\\-\\/\\.]+\\s*(?:${UNIT_PATTERN})\\.?)\\s+(.+)`,
  'i',
);

function parseIngredient(str: string): RecipeIngredient {
  const trimmed = str.trim();
  const unitMatch = trimmed.match(INGREDIENT_RE);
  if (unitMatch) {
    return { amount: unitMatch[1].trim(), name: unitMatch[2].trim() };
  }
  // Fallback: starts with a number then a space
  const numMatch = trimmed.match(/^([\d½¼¾⅓⅔\s\/\.]+)\s+(.+)/);
  if (numMatch && /[\d½¼¾⅓⅔]/.test(numMatch[1])) {
    return { amount: numMatch[1].trim(), name: numMatch[2].trim() };
  }
  return { amount: '', name: trimmed };
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function extractSteps(instructions: any[]): string[] {
  const steps: string[] = [];
  for (const item of instructions) {
    if (typeof item === 'string') {
      steps.push(item.trim());
    } else if (item['@type'] === 'HowToStep') {
      const text = (item.text || item.name || '').trim();
      if (text) { steps.push(text); }
    } else if (item['@type'] === 'HowToSection') {
      for (const s of item.itemListElement ?? []) {
        const text = typeof s === 'string' ? s : (s.text || s.name || '');
        if (text.trim()) { steps.push(text.trim()); }
      }
    }
  }
  return steps.filter(Boolean);
}

// ── Image ─────────────────────────────────────────────────────────────────────

function extractImage(image: any): string {
  if (!image) { return ''; }
  if (typeof image === 'string') { return image; }
  if (Array.isArray(image)) { return extractImage(image[0]); }
  if (image.url) { return image.url; }
  return '';
}

// ── Servings ──────────────────────────────────────────────────────────────────

function extractServings(yieldVal: any): number {
  if (!yieldVal) { return 0; }
  const str = Array.isArray(yieldVal) ? String(yieldVal[0]) : String(yieldVal);
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// ── Schema.org finder ─────────────────────────────────────────────────────────

function findRecipeSchema(data: any): any | null {
  if (!data) { return null; }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeSchema(item);
      if (found) { return found; }
    }
    return null;
  }
  const type = data['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return data;
  }
  if (data['@graph']) { return findRecipeSchema(data['@graph']); }
  return null;
}

// ── Open Graph fallback ───────────────────────────────────────────────────────

function extractOg(html: string, prop: string): string {
  const a = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${prop}"`, 'i'));
  return a?.[1] ?? b?.[1] ?? '';
}

// ── Tag matching ──────────────────────────────────────────────────────────────

const ALL_TAGS = [
  'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Drinks',
  'Snack', 'Vegetarian', 'Quick', 'Baking', 'Seafood',
];

function matchTags(schema: any): string[] {
  const haystack = [
    ...(Array.isArray(schema.keywords) ? schema.keywords : [schema.keywords ?? '']),
    ...(Array.isArray(schema.recipeCategory) ? schema.recipeCategory : [schema.recipeCategory ?? '']),
    ...(Array.isArray(schema.recipeCuisine) ? schema.recipeCuisine : [schema.recipeCuisine ?? '']),
  ].join(' ').toLowerCase();
  return ALL_TAGS.filter(tag => haystack.includes(tag.toLowerCase()));
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchAndParseRecipe(url: string): Promise<ImportedRecipeData> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HouseholdHero/1.0)' },
  });
  if (!res.ok) { throw new Error(`Could not load page (HTTP ${res.status})`); }
  const html = await res.text();

  // Try all JSON-LD blocks
  const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  let schema: any = null;
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]);
      schema = findRecipeSchema(parsed);
      if (schema) { break; }
    } catch {
      // malformed JSON-LD block, skip
    }
  }

  if (schema) {
    const ingredients = (schema.recipeIngredient ?? []).map((i: string) => parseIngredient(i));
    const steps = extractSteps(schema.recipeInstructions ?? []);
    return {
      title: schema.name ?? '',
      description: schema.description ?? '',
      photoURL: extractImage(schema.image),
      servings: extractServings(schema.recipeYield ?? schema.yield),
      prepMins: parseDuration(schema.prepTime ?? ''),
      cookMins: parseDuration(schema.cookTime ?? ''),
      ingredients: ingredients.length ? ingredients : [{ amount: '', name: '' }],
      steps: steps.length ? steps : [''],
      tags: matchTags(schema),
      source: 'full',
    };
  }

  // Fallback: Open Graph only
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return {
    title: extractOg(html, 'og:title') || titleTagMatch?.[1] || '',
    description: extractOg(html, 'og:description'),
    photoURL: extractOg(html, 'og:image'),
    servings: 0,
    prepMins: 0,
    cookMins: 0,
    ingredients: [{ amount: '', name: '' }],
    steps: [''],
    tags: [],
    source: 'partial',
  };
}
