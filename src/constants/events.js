// Event type defaults for projections and P&L calculations
export const EVENT_TYPE_DEFAULTS = {
  festival: { label: "Festival", avgDays: 3, staffPerDay: 6, sellThrough: 0.65 },
  concert: { label: "Concert", avgDays: 1, staffPerDay: 4, sellThrough: 0.55 },
  market: { label: "Market", avgDays: 2, staffPerDay: 3, sellThrough: 0.50 },
  pop_up: { label: "Pop-Up", avgDays: 1, staffPerDay: 2, sellThrough: 0.45 },
  corporate: { label: "Corporate", avgDays: 1, staffPerDay: 3, sellThrough: 0.70 },
  tournament: { label: "Tournament", avgDays: 3, staffPerDay: 5, sellThrough: 0.60 },
  combine: { label: "Combine", avgDays: 1, staffPerDay: 4, sellThrough: 0.55 },
  camp: { label: "Camp", avgDays: 3, staffPerDay: 4, sellThrough: 0.50 },
  other: { label: "Other", avgDays: 1, staffPerDay: 3, sellThrough: 0.50 },
};

export const PRODUCT_CATEGORIES = [
  { value: "T-Shirts", label: "T-Shirts" },
  { value: "Hoodies", label: "Hoodies" },
  { value: "Hats", label: "Hats" },
  { value: "Accessories", label: "Accessories" },
  { value: "Stickers", label: "Stickers" },
  { value: "Other", label: "Other" },
];
