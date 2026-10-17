export const ITEMS = {
  table: { name: 'Dining table', category: 'Dining', cost: 50, color: '#b88152', solid: true },
  chair: { name: 'Dining chair', category: 'Dining', cost: 25, color: '#e2ae68', solid: true },
  counter: { name: 'Cabinet', category: 'Kitchen', cost: 50, color: '#b77e51', solid: true, storageKind: 'tableware', capacity: 10 },
  cuttingboard: { name: 'Cutting board', category: 'Kitchen', cost: 50, color: '#c99c65', solid: false, support: 'counter' },
  fryer: { name: 'Countertop fryer', category: 'Kitchen', cost: 100, color: '#a7adb0', solid: false, support: 'counter' },
  shelf: { name: 'Small shelf', category: 'Kitchen', cost: 100, color: '#ad8056', solid: true, storageKind: 'shelf', capacity: 12 },
  bigshelf: { name: 'Large shelf', category: 'Kitchen', cost: 400, color: '#ad8056', solid: true, storageKind: 'shelf', capacity: 24 },
  stove: { name: 'Range cooker', category: 'Kitchen', cost: 750, color: '#a4adb3', solid: true },
  prep: { name: 'Preparation station', category: 'Kitchen', cost: 320, color: '#b4bfc0', solid: true },
  fridge: { name: 'Refrigerator', category: 'Kitchen', cost: 150, color: '#dae4e1', solid: true, storageKind: 'fridge', capacity: 12 },
  sink: { name: 'Kitchen sink', category: 'Kitchen', cost: 220, color: '#c6d7d8', solid: true },
  bin: { name: 'Waste bin', category: 'Kitchen', cost: 70, color: '#546660', solid: true },
  toilet: { name: 'Toilet', category: 'Facilities', cost: 280, color: '#eef0e6', solid: true },
  plant: { name: 'Potted plant', category: 'Decoration', cost: 85, color: '#5e9662', solid: true },
  painting: { name: 'Framed painting', category: 'Decoration', cost: 110, color: '#d9a66b', solid: true },
  clock: { name: 'Wall clock', category: 'Decoration', cost: 65, color: '#e9e1ca', solid: true },
  flowerbox: { name: 'Flower box', category: 'Decoration', cost: 95, color: '#9d7759', solid: true },
  lamp: { name: 'Floor lamp', category: 'Decoration', cost: 120, color: '#e5c37d', solid: true },
  wall: { name: 'Wall', category: 'Building', cost: 12, color: '#e6ddc5', solid: true },
  door: { name: 'Doorway', category: 'Building', cost: 90, color: '#976e48', solid: false },
  window: { name: 'Window wall', category: 'Building', cost: 65, color: '#bfd9d6', solid: true },
};

export const INGREDIENTS = {
  potato: { name: 'Potato', storageKind: 'shelf', unitPrice: 1 },
  flour: { name: 'Flour', storageKind: 'shelf', unitPrice: 1 },
  tomato: { name: 'Tomato', storageKind: 'shelf', unitPrice: 2 },
  coffee: { name: 'Coffee', storageKind: 'shelf', unitPrice: 2 },
  avocado: { name: 'Avocado', storageKind: 'shelf', unitPrice: 2 },
  steak: { name: 'Steak', storageKind: 'fridge', unitPrice: 5 },
  chicken: { name: 'Chicken', storageKind: 'fridge', unitPrice: 5 },
  rice: { name: 'Rice', storageKind: 'shelf', unitPrice: 1 },
  mushroom: { name: 'Mushroom', storageKind: 'shelf', unitPrice: 2 },
};

export const TABLEWARE = Object.fromEntries([
  ['plate', 'Plate'], ['stemglass', 'Stemmed glass'], ['pan', 'Pan'],
  ['bowl', 'Bowl'], ['cup', 'Cup'], ['glass', 'Glass'],
].map(([id, name]) => [id, { name, unitPrice: 15 }]));

export const TASK_GROUPS = ['serving', 'cooking', 'dishwashing', 'cleaning'];

export const RECIPES = [
  { id: 'burger', name: 'House Burger', price: 18, ingredients: { flour: 1, steak: 1, tomato: 1 }, tableware: 'plate', primary: 'stove', equipment: ['stove', 'prep', 'fridge'], cookTime: 8, unlock: 0, color: '#d9a54d' },
  { id: 'salad', name: 'Garden Salad', price: 14, ingredients: { tomato: 1, avocado: 1 }, tableware: 'plate', primary: 'prep', equipment: ['prep', 'fridge'], cookTime: 5, unlock: 0, color: '#7da867' },
  { id: 'pasta', name: 'Tomato Pasta', price: 20, ingredients: { flour: 1, tomato: 1 }, tableware: 'bowl', primary: 'stove', equipment: ['stove', 'prep'], cookTime: 10, unlock: 0, color: '#e4935b' },
  { id: 'steak', name: 'Pepper Steak', price: 32, ingredients: { steak: 1 }, tableware: 'plate', primary: 'stove', equipment: ['stove', 'prep', 'fridge'], cookTime: 13, unlock: 10, color: '#ad6b54' },
  { id: 'risotto', name: 'Mushroom Risotto', price: 26, ingredients: { rice: 1, mushroom: 1 }, tableware: 'bowl', primary: 'stove', equipment: ['stove', 'prep', 'fridge'], cookTime: 12, unlock: 25, color: '#d3bd8c' },
  { id: 'chef-special', name: "Chef's Tasting Plate", price: 42, ingredients: { chicken: 1, avocado: 1 }, tableware: 'plate', primary: 'stove', equipment: ['stove', 'prep', 'fridge', 'sink'], cookTime: 16, unlock: 50, color: '#bf8565' },
  { id: 'fries', name: 'Fries', price: 15, ingredients: { potato: 1 }, tableware: 'plate', primary: 'fryer', equipment: ['fryer', 'cuttingboard'], cookTime: 8, unlock: 0, color: '#e3bb55' },
];

for (const recipe of RECIPES) recipe.cost = Object.entries(recipe.ingredients).reduce((sum, [id, quantity]) => sum + INGREDIENTS[id].unitPrice * quantity, 0);

export const SCENARIOS = [
  { id: 'sandbox', title: 'Your neighborhood restaurant', description: 'Build at your own pace and make a place people love.', goals: [] },
  { id: 'first-service', title: 'Opening Night', description: 'Welcome the neighborhood and complete your first successful service.', goals: [{ stat: 'served', target: 10, label: 'Serve 10 happy guests' }, { stat: 'rating', target: 3.5, label: 'Reach a 3.5 star rating' }] },
  { id: 'busy-bistro', title: 'The Busy Bistro', description: 'Grow a profitable restaurant without losing the personal touch.', goals: [{ stat: 'served', target: 35, label: 'Serve 35 guests' }, { stat: 'revenue', target: 800, label: 'Earn $800 in sales' }, { stat: 'cleanliness', target: 70, label: 'Keep cleanliness at 70%' }] },
  { id: 'fine-dining', title: 'A Taste of Excellence', description: 'Create a celebrated destination with an ambitious menu.', goals: [{ stat: 'served', target: 60, label: 'Serve 60 guests' }, { stat: 'rating', target: 4.2, label: 'Reach a 4.2 star rating' }, { stat: 'menuVariety', target: 5, label: 'Offer 5 available dishes' }] },
  { id: 'green-room', title: 'The Green Room', description: 'Give guests a bright, leafy retreat with room to linger.', goals: [{ stat: 'served', target: 20, label: 'Serve 20 guests' }, { stat: 'plants', target: 8, label: 'Place 8 plants or flower boxes' }, { stat: 'cleanliness', target: 90, label: 'Maintain 90% cleanliness' }] },
  { id: 'full-house', title: 'Full House', description: 'Build a bigger dining room and a team that can keep up.', goals: [{ stat: 'served', target: 45, label: 'Serve 45 guests' }, { stat: 'seats', target: 14, label: 'Provide 14 dining seats' }, { stat: 'staff', target: 5, label: 'Employ 5 staff members' }] },
  { id: 'neighborhood-favorite', title: 'Neighborhood Favorite', description: 'Turn a modest corner restaurant into a local institution.', goals: [{ stat: 'served', target: 80, label: 'Serve 80 guests' }, { stat: 'revenue', target: 2000, label: 'Earn $2,000 in sales' }, { stat: 'rating', target: 4.5, label: 'Reach a 4.5 star rating' }] },
];
