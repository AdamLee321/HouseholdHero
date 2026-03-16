export interface DictionaryItem {
  name: string;
  category: string;
}

// ~200 common grocery items mapped to default categories
export const SHOPPING_DICTIONARY: DictionaryItem[] = [
  // Fruit & Veg
  { name: 'Apples', category: 'Fruit & Veg' },
  { name: 'Bananas', category: 'Fruit & Veg' },
  { name: 'Oranges', category: 'Fruit & Veg' },
  { name: 'Grapes', category: 'Fruit & Veg' },
  { name: 'Strawberries', category: 'Fruit & Veg' },
  { name: 'Lemons', category: 'Fruit & Veg' },
  { name: 'Avocados', category: 'Fruit & Veg' },
  { name: 'Blueberries', category: 'Fruit & Veg' },
  { name: 'Raspberries', category: 'Fruit & Veg' },
  { name: 'Carrots', category: 'Fruit & Veg' },
  { name: 'Broccoli', category: 'Fruit & Veg' },
  { name: 'Spinach', category: 'Fruit & Veg' },
  { name: 'Lettuce', category: 'Fruit & Veg' },
  { name: 'Tomatoes', category: 'Fruit & Veg' },
  { name: 'Cucumber', category: 'Fruit & Veg' },
  { name: 'Onions', category: 'Fruit & Veg' },
  { name: 'Garlic', category: 'Fruit & Veg' },
  { name: 'Potatoes', category: 'Fruit & Veg' },
  { name: 'Sweet Potatoes', category: 'Fruit & Veg' },
  { name: 'Peppers', category: 'Fruit & Veg' },
  { name: 'Courgette', category: 'Fruit & Veg' },
  { name: 'Mushrooms', category: 'Fruit & Veg' },
  { name: 'Celery', category: 'Fruit & Veg' },
  { name: 'Peas', category: 'Fruit & Veg' },
  { name: 'Corn', category: 'Fruit & Veg' },
  { name: 'Cabbage', category: 'Fruit & Veg' },
  { name: 'Kale', category: 'Fruit & Veg' },
  { name: 'Ginger', category: 'Fruit & Veg' },
  { name: 'Limes', category: 'Fruit & Veg' },
  { name: 'Mango', category: 'Fruit & Veg' },
  // Meat & Fish
  { name: 'Chicken Breast', category: 'Meat & Fish' },
  { name: 'Chicken Thighs', category: 'Meat & Fish' },
  { name: 'Minced Beef', category: 'Meat & Fish' },
  { name: 'Beef Steak', category: 'Meat & Fish' },
  { name: 'Pork Chops', category: 'Meat & Fish' },
  { name: 'Bacon', category: 'Meat & Fish' },
  { name: 'Sausages', category: 'Meat & Fish' },
  { name: 'Ham', category: 'Meat & Fish' },
  { name: 'Salmon', category: 'Meat & Fish' },
  { name: 'Cod', category: 'Meat & Fish' },
  { name: 'Tuna Steak', category: 'Meat & Fish' },
  { name: 'Prawns', category: 'Meat & Fish' },
  { name: 'Lamb Chops', category: 'Meat & Fish' },
  { name: 'Turkey Mince', category: 'Meat & Fish' },
  // Dairy
  { name: 'Milk', category: 'Dairy' },
  { name: 'Semi-Skimmed Milk', category: 'Dairy' },
  { name: 'Oat Milk', category: 'Dairy' },
  { name: 'Almond Milk', category: 'Dairy' },
  { name: 'Butter', category: 'Dairy' },
  { name: 'Cheddar Cheese', category: 'Dairy' },
  { name: 'Mozzarella', category: 'Dairy' },
  { name: 'Parmesan', category: 'Dairy' },
  { name: 'Cream Cheese', category: 'Dairy' },
  { name: 'Greek Yoghurt', category: 'Dairy' },
  { name: 'Natural Yoghurt', category: 'Dairy' },
  { name: 'Eggs', category: 'Dairy' },
  { name: 'Double Cream', category: 'Dairy' },
  { name: 'Sour Cream', category: 'Dairy' },
  { name: 'Crème Fraîche', category: 'Dairy' },
  // Bakery
  { name: 'White Bread', category: 'Bakery' },
  { name: 'Wholemeal Bread', category: 'Bakery' },
  { name: 'Sourdough', category: 'Bakery' },
  { name: 'Rolls', category: 'Bakery' },
  { name: 'Bagels', category: 'Bakery' },
  { name: 'Pitta Bread', category: 'Bakery' },
  { name: 'Tortilla Wraps', category: 'Bakery' },
  { name: 'Croissants', category: 'Bakery' },
  { name: 'Crumpets', category: 'Bakery' },
  { name: 'English Muffins', category: 'Bakery' },
  // Pasta & Rice
  { name: 'Spaghetti', category: 'Pasta & Rice' },
  { name: 'Penne', category: 'Pasta & Rice' },
  { name: 'Fusilli', category: 'Pasta & Rice' },
  { name: 'Tagliatelle', category: 'Pasta & Rice' },
  { name: 'Lasagne Sheets', category: 'Pasta & Rice' },
  { name: 'White Rice', category: 'Pasta & Rice' },
  { name: 'Brown Rice', category: 'Pasta & Rice' },
  { name: 'Basmati Rice', category: 'Pasta & Rice' },
  { name: 'Noodles', category: 'Pasta & Rice' },
  { name: 'Couscous', category: 'Pasta & Rice' },
  { name: 'Quinoa', category: 'Pasta & Rice' },
  { name: 'Lentils', category: 'Pasta & Rice' },
  // Tins & Jars
  { name: 'Tinned Tomatoes', category: 'Tins & Jars' },
  { name: 'Baked Beans', category: 'Tins & Jars' },
  { name: 'Tinned Tuna', category: 'Tins & Jars' },
  { name: 'Chickpeas', category: 'Tins & Jars' },
  { name: 'Kidney Beans', category: 'Tins & Jars' },
  { name: 'Coconut Milk', category: 'Tins & Jars' },
  { name: 'Pasta Sauce', category: 'Tins & Jars' },
  { name: 'Pesto', category: 'Tins & Jars' },
  { name: 'Chopped Tomatoes', category: 'Tins & Jars' },
  { name: 'Tomato Purée', category: 'Tins & Jars' },
  { name: 'Sweetcorn Tin', category: 'Tins & Jars' },
  { name: 'Soup', category: 'Tins & Jars' },
  // Frozen
  { name: 'Frozen Peas', category: 'Frozen' },
  { name: 'Frozen Chips', category: 'Frozen' },
  { name: 'Frozen Pizza', category: 'Frozen' },
  { name: 'Ice Cream', category: 'Frozen' },
  { name: 'Frozen Fish Fillets', category: 'Frozen' },
  { name: 'Frozen Chicken', category: 'Frozen' },
  { name: 'Frozen Vegetables', category: 'Frozen' },
  { name: 'Frozen Berries', category: 'Frozen' },
  // Condiments
  { name: 'Olive Oil', category: 'Condiments' },
  { name: 'Vegetable Oil', category: 'Condiments' },
  { name: 'Ketchup', category: 'Condiments' },
  { name: 'Mayonnaise', category: 'Condiments' },
  { name: 'Mustard', category: 'Condiments' },
  { name: 'Soy Sauce', category: 'Condiments' },
  { name: 'Worcestershire Sauce', category: 'Condiments' },
  { name: 'Hot Sauce', category: 'Condiments' },
  { name: 'Vinegar', category: 'Condiments' },
  { name: 'Salt', category: 'Condiments' },
  { name: 'Black Pepper', category: 'Condiments' },
  { name: 'Paprika', category: 'Condiments' },
  { name: 'Cumin', category: 'Condiments' },
  { name: 'Oregano', category: 'Condiments' },
  { name: 'Curry Powder', category: 'Condiments' },
  { name: 'Chilli Flakes', category: 'Condiments' },
  { name: 'Stock Cubes', category: 'Condiments' },
  { name: 'Plain Flour', category: 'Condiments' },
  { name: 'Sugar', category: 'Condiments' },
  { name: 'Honey', category: 'Condiments' },
  // Snacks & Drinks
  { name: 'Orange Juice', category: 'Snacks & Drinks' },
  { name: 'Apple Juice', category: 'Snacks & Drinks' },
  { name: 'Coffee', category: 'Snacks & Drinks' },
  { name: 'Tea Bags', category: 'Snacks & Drinks' },
  { name: 'Sparkling Water', category: 'Snacks & Drinks' },
  { name: 'Still Water', category: 'Snacks & Drinks' },
  { name: 'Crisps', category: 'Snacks & Drinks' },
  { name: 'Chocolate', category: 'Snacks & Drinks' },
  { name: 'Biscuits', category: 'Snacks & Drinks' },
  { name: 'Cereal', category: 'Snacks & Drinks' },
  { name: 'Porridge Oats', category: 'Snacks & Drinks' },
  { name: 'Granola', category: 'Snacks & Drinks' },
  { name: 'Protein Bars', category: 'Snacks & Drinks' },
  { name: 'Nuts', category: 'Snacks & Drinks' },
  { name: 'Popcorn', category: 'Snacks & Drinks' },
  { name: 'Wine', category: 'Snacks & Drinks' },
  { name: 'Beer', category: 'Snacks & Drinks' },
  // Household
  { name: 'Washing Up Liquid', category: 'Household' },
  { name: 'Dishwasher Tablets', category: 'Household' },
  { name: 'Laundry Detergent', category: 'Household' },
  { name: 'Fabric Softener', category: 'Household' },
  { name: 'Toilet Roll', category: 'Household' },
  { name: 'Kitchen Roll', category: 'Household' },
  { name: 'Bin Bags', category: 'Household' },
  { name: 'Cling Film', category: 'Household' },
  { name: 'Foil', category: 'Household' },
  { name: 'Washing Powder', category: 'Household' },
  { name: 'Bleach', category: 'Household' },
  { name: 'All-Purpose Cleaner', category: 'Household' },
  { name: 'Sponges', category: 'Household' },
  { name: 'Zip Lock Bags', category: 'Household' },
  // Health & Beauty
  { name: 'Shampoo', category: 'Health & Beauty' },
  { name: 'Conditioner', category: 'Health & Beauty' },
  { name: 'Body Wash', category: 'Health & Beauty' },
  { name: 'Soap', category: 'Health & Beauty' },
  { name: 'Toothpaste', category: 'Health & Beauty' },
  { name: 'Toothbrush', category: 'Health & Beauty' },
  { name: 'Deodorant', category: 'Health & Beauty' },
  { name: 'Moisturiser', category: 'Health & Beauty' },
  { name: 'Sunscreen', category: 'Health & Beauty' },
  { name: 'Paracetamol', category: 'Health & Beauty' },
  { name: 'Ibuprofen', category: 'Health & Beauty' },
  { name: 'Plasters', category: 'Health & Beauty' },
  { name: 'Vitamins', category: 'Health & Beauty' },
  { name: 'Hand Sanitiser', category: 'Health & Beauty' },
  { name: 'Cotton Buds', category: 'Health & Beauty' },
  // Pets
  { name: 'Dog Food', category: 'Pets' },
  { name: 'Cat Food', category: 'Pets' },
  { name: 'Cat Litter', category: 'Pets' },
  { name: 'Dog Treats', category: 'Pets' },
  { name: 'Cat Treats', category: 'Pets' },
  { name: 'Pet Shampoo', category: 'Pets' },
  { name: 'Flea Treatment', category: 'Pets' },
  { name: 'Pet Toys', category: 'Pets' },
  // Garden
  { name: 'Compost', category: 'Garden' },
  { name: 'Plant Food', category: 'Garden' },
  { name: 'Seeds', category: 'Garden' },
  { name: 'Weed Killer', category: 'Garden' },
  { name: 'Pots', category: 'Garden' },
  { name: 'Mulch', category: 'Garden' },
];

export function lookupCategory(itemName: string): string {
  const lower = itemName.toLowerCase().trim();
  if (!lower) { return 'Other'; }
  // 1. Exact match
  const exact = SHOPPING_DICTIONARY.find(d => d.name.toLowerCase() === lower);
  if (exact) { return exact.category; }
  // 2. Word match — any word in the query matches any word in a dictionary entry
  //    e.g. "steak" matches "Beef Steak", "chicken" matches "Chicken Breast"
  const queryWords = lower.split(/\s+/);
  const wordMatch = SHOPPING_DICTIONARY.find(d => {
    const entryWords = d.name.toLowerCase().split(/\s+/);
    return queryWords.some(qw => entryWords.includes(qw));
  });
  return wordMatch?.category ?? 'Other';
}

export function getSuggestions(query: string, limit = 6): DictionaryItem[] {
  if (!query.trim()) { return []; }
  const lower = query.toLowerCase().trim();
  const seen = new Set<string>();

  // 1. Full name starts with query (highest priority)
  const prefixMatches = SHOPPING_DICTIONARY.filter(d => {
    const n = d.name.toLowerCase();
    if (n.startsWith(lower)) { seen.add(d.name); return true; }
    return false;
  });

  // 2. Any word in the name starts with query
  const wordMatches = SHOPPING_DICTIONARY.filter(d => {
    if (seen.has(d.name)) { return false; }
    const words = d.name.toLowerCase().split(/\s+/);
    if (words.some(w => w.startsWith(lower))) { seen.add(d.name); return true; }
    return false;
  });

  // 3. Name contains the query anywhere
  const containsMatches = SHOPPING_DICTIONARY.filter(d => {
    if (seen.has(d.name)) { return false; }
    return d.name.toLowerCase().includes(lower);
  });

  return [...prefixMatches, ...wordMatches, ...containsMatches].slice(0, limit);
}
