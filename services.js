/* ==========================================================================
   SARKER STUDIO — SERVICE CATALOG
   All services & fixed prices used for auto-fill + searchable select.
   Prices are in BDT (৳).
   ========================================================================== */

const SERVICE_CATALOG = [
  {
    category: "Website Development",
    icon: "🌐",
    items: [
      { name: "Landing Page", price: 2999 },
      { name: "Portfolio Website", price: 3999 },
      { name: "Business Website", price: 5999 },
      { name: "Hospital Website", price: 6000 },
      { name: "Diagnostic Website", price: 6000 },
      { name: "Restaurant Website", price: 6500 },
      { name: "School Website", price: 7000 },
      { name: "College Website", price: 8000 },
      { name: "News Portal", price: 10000 },
      { name: "E-Commerce Website", price: 15000 },
      { name: "Website Redesign", price: 3500 },
    ],
  },
  {
    category: "Graphic Design",
    icon: "🎨",
    items: [
      { name: "Logo Design", price: 800 },
      { name: "Premium Logo Design", price: 1500 },
      { name: "Business Card Design", price: 500 },
      { name: "Flyer Design", price: 700 },
      { name: "Poster Design", price: 800 },
      { name: "Banner Design", price: 700 },
      { name: "Social Media Post Design", price: 250 },
      { name: "Brand Identity", price: 3500 },
      { name: "UI/UX Design", price: 5000 },
    ],
  },
  {
    category: "Digital Marketing",
    icon: "📱",
    items: [
      { name: "Starter Marketing Package (1 Month)", price: 5000 },
      { name: "Business Marketing Package (3 Months)", price: 10000 },
      { name: "Premium Marketing Package (1 Year)", price: 15000 },
      { name: "Facebook Page Management", price: 3000 },
      { name: "Facebook Ads Management", price: 3000 },
      { name: "Google Ads Management", price: 3000 },
      { name: "Social Media Management", price: 5000 },
    ],
  },
  {
    category: "SEO",
    icon: "🔍",
    items: [
      { name: "Basic SEO", price: 3000 },
      { name: "Standard SEO", price: 6000 },
      { name: "Premium SEO", price: 10000 },
    ],
  },
  {
    category: "AI Services",
    icon: "🤖",
    items: [
      { name: "AI Chatbot", price: 5000 },
      { name: "AI Automation", price: 8000 },
      { name: "AI Content Creation", price: 3000 },
    ],
  },
  {
    category: "Domain & Hosting",
    icon: "🌍",
    items: [
      { name: "Domain Registration", price: 800 },
      { name: "Hosting Setup", price: 1000 },
      { name: "Website Migration", price: 1500 },
      { name: "Business Email Setup", price: 1000 },
    ],
  },
  {
    category: "Website Maintenance",
    icon: "🛠",
    items: [
      { name: "Basic Maintenance", price: 1000 },
      { name: "Standard Maintenance", price: 2000 },
      { name: "Premium Maintenance", price: 3500 },
    ],
  },
];

/* Flat list for fast searching: [{ name, price, category, icon }] */
const SERVICE_FLAT_LIST = SERVICE_CATALOG.flatMap((cat) =>
  cat.items.map((item) => ({
    name: item.name,
    price: item.price,
    category: cat.category,
    icon: cat.icon,
  }))
);

/**
 * Search services by name (case-insensitive, partial match).
 * @param {string} query
 * @returns {Array}
 */
function searchServices(query) {
  if (!query || !query.trim()) return SERVICE_FLAT_LIST.slice(0, 8);
  const q = query.trim().toLowerCase();
  return SERVICE_FLAT_LIST.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
}

/**
 * Find exact service by name.
 */
function findServiceByName(name) {
  return SERVICE_FLAT_LIST.find((s) => s.name === name);
}
