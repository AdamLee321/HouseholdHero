import { DictionaryItem } from '../data/shoppingDictionary';

const BASE_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

// Maps Open Food Facts category tags to app categories (checked in order)
const TAG_MAP: Array<{ tags: string[]; category: string }> = [
  {
    tags: ['en:dairies', 'en:milks', 'en:cheeses', 'en:yogurts', 'en:butters', 'en:eggs', 'en:creams', 'en:dairy'],
    category: 'Dairy',
  },
  {
    tags: ['en:meats', 'en:fish', 'en:seafood', 'en:poultry', 'en:pork', 'en:beef', 'en:lamb', 'en:meat', 'en:fresh-meats', 'en:smoked-fish'],
    category: 'Meat & Fish',
  },
  {
    tags: ['en:fruits', 'en:vegetables', 'en:fresh-fruits', 'en:fresh-vegetables', 'en:plant-based-foods'],
    category: 'Fruit & Veg',
  },
  {
    tags: ['en:breads', 'en:bakery-products', 'en:pastries', 'en:rolls', 'en:buns', 'en:muffins', 'en:bagels'],
    category: 'Bakery',
  },
  {
    tags: ['en:pastas', 'en:rice', 'en:noodles', 'en:grains', 'en:legumes', 'en:lentils', 'en:couscous', 'en:quinoa'],
    category: 'Pasta & Rice',
  },
  {
    tags: ['en:canned-goods', 'en:preserved-foods', 'en:tinned-foods', 'en:canned-vegetables', 'en:canned-fruits', 'en:canned-fish'],
    category: 'Tins & Jars',
  },
  {
    tags: ['en:frozen-foods', 'en:frozen-vegetables', 'en:frozen-meals', 'en:frozen-desserts', 'en:frozen-fish'],
    category: 'Frozen',
  },
  {
    tags: ['en:condiments', 'en:sauces', 'en:spices', 'en:seasonings', 'en:oils', 'en:vinegars', 'en:herbs', 'en:salt', 'en:sugar', 'en:flours'],
    category: 'Condiments',
  },
  {
    tags: ['en:beverages', 'en:drinks', 'en:juices', 'en:coffees', 'en:teas', 'en:waters', 'en:sodas', 'en:alcoholic-beverages', 'en:snacks', 'en:biscuits', 'en:crackers', 'en:chocolate', 'en:cereals'],
    category: 'Snacks & Drinks',
  },
  {
    tags: ['en:household-products', 'en:cleaning-products', 'en:laundry', 'en:paper-products'],
    category: 'Household',
  },
  {
    tags: ['en:beauty-products', 'en:health-products', 'en:personal-care', 'en:medications', 'en:cosmetics'],
    category: 'Health & Beauty',
  },
  {
    tags: ['en:pet-foods', 'en:pet-care'],
    category: 'Pets',
  },
  {
    tags: ['en:garden-products'],
    category: 'Garden',
  },
];

function mapCategory(tags: string[]): string {
  for (const { tags: mapTags, category } of TAG_MAP) {
    if (tags.some(t => mapTags.some(m => t.includes(m.replace('en:', ''))))) {
      return category;
    }
  }
  return 'Other';
}

export async function searchFoodItems(
  query: string,
  signal?: AbortSignal,
): Promise<DictionaryItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'product_name,categories_tags',
  });

  const response = await fetch(`${BASE_URL}?${params}`, { signal });
  if (!response.ok) { throw new Error('Network error'); }

  const data = await response.json();
  const seen = new Set<string>();
  const results: DictionaryItem[] = [];

  for (const product of data.products ?? []) {
    const name = (product.product_name ?? '').trim();
    if (!name || name.length < 2) { continue; }
    // Skip names with special characters that look like barcodes/codes
    if (/[^\w\s\-'&éàüö,.()]/.test(name)) { continue; }
    const key = name.toLowerCase();
    if (seen.has(key)) { continue; }
    seen.add(key);
    const category = mapCategory(product.categories_tags ?? []);
    results.push({ name, category });
    if (results.length >= 6) { break; }
  }

  return results;
}
