export const CATEGORY_LABELS = {
  cheveux: "Soin des cheveux",
  visage: "Soin du visage",
  corps: "Soin du corps",
  mains: "Soin des mains",
  pieds: "Soin des pieds",
  buccal: "Hygiène buccale",
  divers: "Maison & divers",
};

export const CATEGORY_SUBCATEGORY_OPTIONS = {
  cheveux: [
    { id: "shampooing", label: "Shampooing" },
    { id: "apres-shampooing", label: "Après-shampooing" },
    { id: "masque-capillaire", label: "Masque capillaire" },
    { id: "huile-capillaire", label: "Huile capillaire" },
  ],
  visage: [
    { id: "nettoyant-visage", label: "Nettoyant visage" },
    { id: "creme-visage", label: "Crème visage" },
    { id: "demaquillant", label: "Démaquillant" },
    { id: "soin-levres", label: "Soin lèvres" },
  ],
  corps: [
    { id: "lait-corps", label: "Lait corporel" },
    { id: "creme-corps", label: "Crème corps" },
    { id: "beurre-corps", label: "Beurre corporel" },
    { id: "gel-douche", label: "Gel douche" },
    { id: "creme-lavante", label: "Crème lavante" },
    { id: "gommage-corps", label: "Gommage corps" },
    { id: "savon-liquide", label: "Savon liquide" },
    { id: "huile-corps", label: "Huile corps" },
    { id: "huile-douche", label: "Huile de douche" },
  ],
  mains: [
    { id: "creme-mains", label: "Crème mains" },
    { id: "masque-mains", label: "Masque mains" },
    { id: "coffret-mains", label: "Coffret mains" },
  ],
  pieds: [{ id: "soin-pieds", label: "Soin pieds" }],
  buccal: [
    { id: "brosse-dents", label: "Brosse à dents" },
    { id: "irrigateur", label: "Irrigateur buccal" },
    { id: "bain-bouche", label: "Bain de bouche" },
  ],
  divers: [
    { id: "lessive", label: "Lessive" },
    { id: "detachant", label: "Détachant" },
    { id: "lingettes-lessive", label: "Lingettes lessive" },
    { id: "huile-multi-usage", label: "Huile multi-usage" },
  ],
};

export const SUBCATEGORY_LABELS = Object.values(CATEGORY_SUBCATEGORY_OPTIONS)
  .flat()
  .reduce((accumulator, option) => {
    accumulator[option.id] = option.label;
    return accumulator;
  }, {});

const DEFAULT_SUBCATEGORY_BY_CATEGORY = Object.entries(CATEGORY_SUBCATEGORY_OPTIONS).reduce(
  (accumulator, [category, options]) => {
    accumulator[category] = options[0]?.id || "autres";
    return accumulator;
  },
  {},
);

const PRODUCT_SUBCATEGORY_BY_ID = {
  1: "lait-corps",
  2: "gel-douche",
  3: "beurre-corps",
  4: "lait-corps",
  5: "lait-corps",
  6: "lait-corps",
  7: "creme-visage",
  8: "creme-corps",
  9: "creme-corps",
  10: "creme-corps",
  11: "creme-corps",
  12: "creme-corps",
  13: "creme-corps",
  14: "lait-corps",
  15: "lait-corps",
  16: "lait-corps",
  17: "lait-corps",
  18: "creme-corps",
  19: "lait-corps",
  20: "lait-corps",
  21: "lait-corps",
  22: "lait-corps",
  23: "creme-corps",
  24: "nettoyant-visage",
  25: "nettoyant-visage",
  26: "lait-corps",
  27: "lait-corps",
  28: "lait-corps",
  29: "lait-corps",
  30: "lait-corps",
  31: "lait-corps",
  32: "lait-corps",
  33: "lait-corps",
  34: "lait-corps",
  35: "gel-douche",
  36: "gel-douche",
  37: "gel-douche",
  38: "gel-douche",
  39: "gel-douche",
  40: "gel-douche",
  41: "gel-douche",
  42: "gel-douche",
  43: "gel-douche",
  44: "gel-douche",
  45: "gel-douche",
  46: "gel-douche",
  47: "gel-douche",
  48: "savon-liquide",
  49: "gel-douche",
  50: "gel-douche",
  51: "gel-douche",
  52: "gel-douche",
  53: "gel-douche",
  54: "creme-lavante",
  55: "creme-lavante",
  56: "creme-lavante",
  57: "gommage-corps",
  58: "gommage-corps",
  59: "gommage-corps",
  60: "masque-mains",
  61: "coffret-mains",
  62: "creme-mains",
  63: "creme-mains",
  64: "creme-mains",
  65: "brosse-dents",
  66: "irrigateur",
  67: "bain-bouche",
  68: "huile-multi-usage",
  69: "bain-bouche",
  70: "bain-bouche",
  71: "soin-levres",
  72: "lessive",
  73: "detachant",
  74: "lingettes-lessive",
  75: "huile-corps",
  76: "huile-corps",
  77: "huile-douche",
  78: "huile-douche",
  79: "huile-corps",
  80: "demaquillant",
  81: "huile-corps",
  82: "huile-corps",
  83: "huile-corps",
  84: "huile-corps",
  85: "huile-corps",
  86: "huile-corps",
  87: "creme-corps",
  88: "huile-corps",
  89: "huile-corps",
  90: "gel-douche",
  91: "gel-douche",
  92: "soin-levres",
};

export function getDefaultSubcategory(category) {
  return DEFAULT_SUBCATEGORY_BY_CATEGORY[category] || "autres";
}

export function getSubcategoryOptions(category) {
  return CATEGORY_SUBCATEGORY_OPTIONS[category] || [];
}

export function isSubcategoryForCategory(category, subcategory) {
  return getSubcategoryOptions(category).some((option) => option.id === subcategory);
}

export function normalizeProduct(product) {
  if (!product) {
    return product;
  }

  const category = product.c || product.category || "";
  const mappedSubcategory = PRODUCT_SUBCATEGORY_BY_ID[Number(product.id)];
  const fallbackSubcategory = isSubcategoryForCategory(category, mappedSubcategory)
    ? mappedSubcategory
    : getDefaultSubcategory(category);
  const requestedSubcategory = product.sc || product.subcategory || fallbackSubcategory;

  return {
    ...product,
    c: category,
    sc: isSubcategoryForCategory(category, requestedSubcategory)
      ? requestedSubcategory
      : fallbackSubcategory,
  };
}

export function normalizeProducts(products = []) {
  return products.map((product) => normalizeProduct(product));
}

export function getVisibleSubcategories(products, category) {
  const options = CATEGORY_SUBCATEGORY_OPTIONS[category] || [];

  return options.filter((option) =>
    products.some((product) => product.c === category && product.sc === option.id),
  );
}
