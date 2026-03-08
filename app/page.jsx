"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { INITIAL_PRODUCTS } from "@/lib/catalog-data";
import { MMB_WHATSAPP_LINK } from "@/lib/site";
import {
  buildSubcategoryLabels,
  CATEGORY_LABELS,
  CATEGORY_SUBCATEGORY_OPTIONS,
  getDefaultSubcategory,
  getVisibleSubcategories,
  isSubcategoryForCategory,
  normalizeProduct,
  normalizeProducts,
} from "@/lib/catalog-taxonomy";

const STORAGE_KEY = "jb9store.next";
const ADMIN_ACCESS_KEY = "jb9store.admin.access";
const DEFAULT_CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);
const ADMIN_PANELS = [
  { id: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { id: "orders", label: "Commandes", icon: "orders" },
  { id: "products", label: "Produits", icon: "products" },
  { id: "categories", label: "Catégories", icon: "categories" },
  { id: "settings", label: "Paramètres", icon: "settings" },
];
const INITIAL_SETTINGS = {
  shopName: "SKIN'S",
  tagline: "Global Routine for Everyone",
  whatsappDisplay: "+221 78 465 48 26",
  shippingDakar: "1000",
  shippingOutside: "2000",
  instagramUrl: "https://instagram.com/",
  facebookUrl: "https://facebook.com/",
  tiktokUrl: "https://tiktok.com/",
};
const EMPTY_PRODUCT_FORM = {
  name: "",
  category: "corps",
  subcategory: getDefaultSubcategory("corps"),
  emoji: "",
  image: "",
  description: "",
  price: "",
  availability: "available",
};
const EMPTY_CHECKOUT = {
  name: "",
  tel: "",
  address: "",
};
const EMPTY_ERRORS = {
  name: false,
  tel: false,
  address: false,
  payment: false,
};
const EMPTY_CATEGORY_FORM = {
  name: "",
  subcategories: [{ id: "", label: "" }],
};
const HERO_HIGHLIGHTS = [
  {
    title: "Sélection exigeante",
    text: "Des soins choisis pour leur qualité, leur cohérence et leur place dans une vraie routine.",
  },
  {
    title: "Choix en confiance",
    text: "Des visuels plus clairs et des marques reconnues pour vous aider à choisir plus facilement.",
  },
  {
    title: "Routine simplifiée",
    text: "Un catalogue structuré pour trouver plus vite le bon soin selon la zone et le besoin.",
  },
  {
    title: "Service rassurant",
    text: "Livraison au Sénégal, contact WhatsApp direct et accompagnement rapide avant commande.",
  },
];

function cloneCategoryLabels(labels = CATEGORY_LABELS) {
  return { ...labels };
}

function cloneCategorySubcategoryOptions(options = CATEGORY_SUBCATEGORY_OPTIONS) {
  return Object.fromEntries(
    Object.entries(options).map(([categoryId, entries]) => [
      categoryId,
      Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [],
    ]),
  );
}

function normalizeStoredCategoryLabels(labels) {
  const nextLabels = cloneCategoryLabels();

  if (!labels || typeof labels !== "object") {
    return nextLabels;
  }

  Object.entries(labels).forEach(([categoryId, label]) => {
    const nextCategoryId = String(categoryId || "").trim();
    const nextLabel = String(label || "").trim();

    if (nextCategoryId && nextLabel) {
      nextLabels[nextCategoryId] = nextLabel;
    }
  });

  return nextLabels;
}

function normalizeStoredCategorySubcategoryOptions(options) {
  const nextOptions = cloneCategorySubcategoryOptions();

  if (!options || typeof options !== "object") {
    return nextOptions;
  }

  Object.entries(options).forEach(([categoryId, entries]) => {
    const nextCategoryId = String(categoryId || "").trim();

    if (!nextCategoryId || !Array.isArray(entries)) {
      return;
    }

    nextOptions[nextCategoryId] = entries
      .map((entry) => {
        const nextEntryId = String(entry?.id || "").trim();
        const nextEntryLabel = String(entry?.label || "").trim();

        if (!nextEntryId || !nextEntryLabel) {
          return null;
        }

        return {
          id: nextEntryId,
          label: nextEntryLabel,
        };
      })
      .filter(Boolean);
  });

  return nextOptions;
}

function humanizeTaxonomyId(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[-_]+/g, " ");

  if (!normalized) {
    return "Sans nom";
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function slugifyTaxonomyId(value, fallback = "categorie") {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function getOrderedCategoryEntries(categoryLabels) {
  const entries = Object.entries(categoryLabels);
  const defaultEntries = DEFAULT_CATEGORY_ORDER.filter((categoryId) => categoryLabels[categoryId]).map(
    (categoryId) => [categoryId, categoryLabels[categoryId]],
  );
  const customEntries = entries
    .filter(([categoryId]) => !DEFAULT_CATEGORY_ORDER.includes(categoryId))
    .sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel, "fr"));

  return [...defaultEntries, ...customEntries];
}

function mergeTaxonomyWithProducts(categoryLabels, categoryOptions, products) {
  const nextLabels = cloneCategoryLabels(categoryLabels);
  const nextOptions = cloneCategorySubcategoryOptions(categoryOptions);

  products.forEach((product) => {
    const categoryId = String(product?.c || product?.category || "").trim();

    if (!categoryId) {
      return;
    }

    if (!nextLabels[categoryId]) {
      nextLabels[categoryId] = humanizeTaxonomyId(categoryId);
    }

    if (!nextOptions[categoryId]) {
      nextOptions[categoryId] = [];
    }

    const subcategoryId = String(product?.sc || product?.subcategory || "").trim();

    if (!subcategoryId) {
      return;
    }

    if (!nextOptions[categoryId].some((option) => option.id === subcategoryId)) {
      nextOptions[categoryId] = [
        ...nextOptions[categoryId],
        { id: subcategoryId, label: humanizeTaxonomyId(subcategoryId) },
      ];
    }
  });

  return {
    labels: nextLabels,
    options: nextOptions,
  };
}

function createEmptyCategoryForm() {
  return {
    ...EMPTY_CATEGORY_FORM,
    subcategories: EMPTY_CATEGORY_FORM.subcategories.map((entry) => ({ ...entry })),
  };
}

function normalizePersistedSettings(settings) {
  if (!settings) {
    return settings;
  }

  return {
    ...settings,
    shopName:
      !settings.shopName || settings.shopName.trim() === "JB9STORE"
        ? INITIAL_SETTINGS.shopName
        : settings.shopName,
    tagline: settings.tagline?.trim() || INITIAL_SETTINGS.tagline,
  };
}

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("fr-FR");
}

function getWhatsappDigits(value) {
  return value.replace(/\D/g, "");
}

function getShippingFee(zone, settings) {
  return Number(zone === "dakar" ? settings.shippingDakar : settings.shippingOutside) || 0;
}

function getShippingLabel(zone, settings, mode = "long") {
  const fee = getShippingFee(zone, settings);

  if (mode === "compact") {
    return zone === "dakar"
      ? `Dakar (${formatPrice(fee)} FCFA)`
      : `Hors Dakar (${formatPrice(fee)} FCFA)`;
  }

  return zone === "dakar"
    ? `Dakar — ${formatPrice(fee)} FCFA`
    : `Hors Dakar — ${formatPrice(fee)} FCFA`;
}

function getPaymentLabel(method) {
  return {
    wave: "Wave",
    orange: "Orange Money",
    cash: "Paiement à la livraison",
  }[method];
}

function getProductFallbackLabel(name) {
  const tokens = String(name || "").match(/[0-9A-Za-zÀ-ÿ]+/g) || [];

  if (!tokens.length) {
    return "PR";
  }

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function Icon({ name, className }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className: cn("ui-icon", className),
  };

  switch (name) {
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.86.32 1.7.59 2.5a2 2 0 0 1-.45 2.11L9.09 10.5a16 16 0 0 0 4.41 4.41l1.17-1.17a2 2 0 0 1 2.11-.45c.8.27 1.64.47 2.5.59A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "catalog":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "cart":
      return (
        <svg {...props}>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.76L21 7H7" />
        </svg>
      );
    case "truck":
      return (
        <svg {...props}>
          <path d="M10 17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11" />
          <path d="M15 9h4l2 3v4h-6z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="17.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "map":
      return (
        <svg {...props}>
          <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "payment":
      return (
        <svg {...props}>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 10h19" />
          <path d="M7 15h3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
          <path d="m9.5 12 1.7 1.7 3.3-3.7" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...props}>
          <path d="M20 11.5A8.5 8.5 0 0 1 7 18.7L3 20l1.3-3.8A8.5 8.5 0 1 1 20 11.5z" />
          <path d="M9 8.8c.3-.7.7-.7 1-.7h.6c.2 0 .5.1.6.5l.9 2.1c.1.3 0 .5-.2.7l-.5.6c.4.8 1 1.5 1.7 2.1.7.6 1.4 1.1 2.2 1.4l.6-.8c.2-.2.4-.3.7-.2l2 .9c.3.1.5.4.5.6v.6c0 .3 0 .7-.6 1-.5.3-1.1.5-1.7.4-1-.2-2-.5-2.8-1.1A12 12 0 0 1 9 12.2c-.5-.8-.8-1.7-1-2.7-.1-.3.1-.8.4-.7z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...props}>
          <path d="M14 8h-1.5A1.5 1.5 0 0 0 11 9.5V12H9v3h2v6h3v-6h2.2l.3-3H14V9.8c0-.5.4-.8.8-.8H17V6h-2.3A4.7 4.7 0 0 0 10 10.7V12" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 4c1 .9 2.3 1.5 3.7 1.5H20" />
        </svg>
      );
    case "wave":
      return (
        <svg {...props}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M10 6.5h4" />
          <circle cx="12" cy="18" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );
    case "orange":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case "cash":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7 9h.01M17 15h.01" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...props}>
          <path d="M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z" />
        </svg>
      );
    case "orders":
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
      );
    case "products":
      return (
        <svg {...props}>
          <path d="M12 3 4 7l8 4 8-4-8-4z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case "categories":
      return (
        <svg {...props}>
          <path d="M3 7h7v10H3zM14 7h7v4h-7zM14 14h7v3h-7z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7z" />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...props}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    default:
      return null;
  }
}

function PaymentLogo({ name, className }) {
  if (name === "wave") {
    return (
      <img
        src="/brands/wave-logo.png"
        alt="Wave"
        className={cn("payment-logo", "wave", className)}
        loading="lazy"
      />
    );
  }

  if (name === "orange") {
    return (
      <img
        src="/brands/orange-money-logo.svg"
        alt="Orange Money"
        className={cn("payment-logo", "orange", className)}
        loading="lazy"
      />
    );
  }

  return null;
}

function isLocalAssetSource(source) {
  return String(source || "").startsWith("/");
}

function SmartImage({ src, alt, className, sizes, priority = false }) {
  const source = String(src || "").trim();

  if (!source) {
    return null;
  }

  if (isLocalAssetSource(source)) {
    return (
      <Image
        src={source}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        quality={82}
        unoptimized={source.endsWith(".svg")}
      />
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

function getStockState(stock) {
  if (stock === 0) {
    return { tone: "sout", label: "Rupture de stock" };
  }

  return null;
}

function getAdminStockState(stock) {
  if (stock === 0) {
    return { tone: "td-out", label: "Rupture" };
  }

  return { tone: "td-ok", label: "Disponible" };
}

function getAdminDate() {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload;
}

function resolveProductFormSubcategory(
  category,
  subcategory,
  categoryOptions = CATEGORY_SUBCATEGORY_OPTIONS,
) {
  return isSubcategoryForCategory(category, subcategory, categoryOptions)
    ? subcategory
    : getDefaultSubcategory(category, categoryOptions);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de traiter l'image sélectionnée."));
    image.src = source;
  });
}

async function optimizeImageFile(file) {
  const source = await readFileAsDataUrl(file);

  if (!file.type.startsWith("image/")) {
    return source;
  }

  const image = await loadImage(source);
  const maxSize = 1400;
  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

  return canvas.toDataURL(outputType, outputType === "image/png" ? undefined : 0.9);
}

export default function Home({ routeMode = "shop" } = {}) {
  const isAdminRoute = routeMode === "admin";
  const productsRef = useRef(null);
  const footerTapTimerRef = useRef(null);
  const footerTapCountRef = useRef(0);
  const adminRouteInitRef = useRef(false);
  const taxonomyRef = useRef({
    labels: cloneCategoryLabels(),
    options: cloneCategorySubcategoryOptions(),
  });
  const [hydrated, setHydrated] = useState(false);
  const [currentPage, setCurrentPage] = useState(isAdminRoute ? "admin" : "shop");
  const [activeTab, setActiveTab] = useState("tous");
  const [activeSubcategory, setActiveSubcategory] = useState("tous");
  const [products, setProducts] = useState(() => normalizeProducts(INITIAL_PRODUCTS));
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [categoryLabels, setCategoryLabels] = useState(() => cloneCategoryLabels());
  const [categorySubcategoryOptions, setCategorySubcategoryOptions] = useState(() =>
    cloneCategorySubcategoryOptions(),
  );
  const [quantityById, setQuantityById] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT);
  const [checkoutErrors, setCheckoutErrors] = useState(EMPTY_ERRORS);
  const [zone, setZone] = useState("dakar");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [adminPanel, setAdminPanel] = useState("dashboard");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [productsSource, setProductsSource] = useState("local");
  const [ordersSource, setOrdersSource] = useState("local");
  const [databaseStatusMessage, setDatabaseStatusMessage] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);

  useEffect(() => {
    taxonomyRef.current = {
      labels: categoryLabels,
      options: categorySubcategoryOptions,
    };
  }, [categoryLabels, categorySubcategoryOptions]);

  useEffect(() => {
    const savedAdminAccess = window.localStorage.getItem(ADMIN_ACCESS_KEY);

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setAdminUnlocked(savedAdminAccess === "granted");
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw);
      const nextCategoryLabels = normalizeStoredCategoryLabels(parsed.taxonomy?.labels);
      const nextCategorySubcategoryOptions = normalizeStoredCategorySubcategoryOptions(
        parsed.taxonomy?.options,
      );

      setCategoryLabels(nextCategoryLabels);
      setCategorySubcategoryOptions(nextCategorySubcategoryOptions);

      if (Array.isArray(parsed.products) && parsed.products.length) {
        const mergedTaxonomy = mergeTaxonomyWithProducts(
          nextCategoryLabels,
          nextCategorySubcategoryOptions,
          parsed.products,
        );

        setCategoryLabels(mergedTaxonomy.labels);
        setCategorySubcategoryOptions(mergedTaxonomy.options);
        setProducts(normalizeProducts(parsed.products, mergedTaxonomy.options));
      }

      if (Array.isArray(parsed.orders)) {
        setOrders(parsed.orders);
      }

      if (Array.isArray(parsed.cart)) {
        setCart(parsed.cart);
      }

      if (parsed.settings) {
        setSettings((current) => ({
          ...current,
          ...normalizePersistedSettings(parsed.settings),
        }));
      }

      setAdminUnlocked(savedAdminAccess === "granted");
    } catch {
      // Ignore invalid persisted state and fall back to defaults.
      setAdminUnlocked(savedAdminAccess === "granted");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(isAdminRoute ? "admin" : "shop");
  }, [isAdminRoute]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const payload = JSON.stringify({
      products,
      orders,
      cart,
      settings,
      taxonomy: {
        labels: categoryLabels,
        options: categorySubcategoryOptions,
      },
    });

    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [
    cart,
    categoryLabels,
    categorySubcategoryOptions,
    hydrated,
    orders,
    products,
    settings,
  ]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToastMessage("");
    }, 2800);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("vis");
          }
        });
      },
      { threshold: 0.07 },
    );

    document.querySelectorAll(".rv:not(.vis)").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [activeSubcategory, activeTab, currentPage, products.length]);

  useEffect(
    () => () => {
      if (footerTapTimerRef.current) {
        window.clearTimeout(footerTapTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function syncProducts() {
      try {
        const payload = await requestJson("/api/products");

        if (cancelled) {
          return;
        }

        if (Array.isArray(payload.products) && payload.products.length) {
          const mergedTaxonomy = mergeTaxonomyWithProducts(
            taxonomyRef.current.labels,
            taxonomyRef.current.options,
            payload.products,
          );

          setCategoryLabels(mergedTaxonomy.labels);
          setCategorySubcategoryOptions(mergedTaxonomy.options);
          setProducts(normalizeProducts(payload.products, mergedTaxonomy.options));
        }

        setProductsSource(payload.source || "local");
        setDatabaseStatusMessage("");
      } catch (error) {
        if (!cancelled) {
          setProductsSource("local");
          setDatabaseStatusMessage(
            error.message || "Impossible de charger le catalogue depuis la base.",
          );
        }
      }
    }

    void syncProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentPage !== "admin") {
      return;
    }

    let cancelled = false;

    async function syncOrders() {
      try {
        const payload = await requestJson("/api/orders");

        if (cancelled) {
          return;
        }

        if (Array.isArray(payload.orders)) {
          setOrders(payload.orders);
        }

        setOrdersSource(payload.source || "database");
        setDatabaseStatusMessage("");
      } catch (error) {
        if (!cancelled) {
          setOrdersSource("local");
          setDatabaseStatusMessage(
            error.message || "Impossible de synchroniser les commandes depuis la base.",
          );
        }
      }
    }

    void syncOrders();

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === "tous" || activeSubcategory === "tous") {
      return;
    }

    const visibleSubcategories = getVisibleSubcategories(
      products,
      activeTab,
      categorySubcategoryOptions,
    );
    const activeSubcategoryStillVisible = visibleSubcategories.some(
      (subcategory) => subcategory.id === activeSubcategory,
    );

    if (!activeSubcategoryStillVisible) {
      setActiveSubcategory("tous");
    }
  }, [activeSubcategory, activeTab, categorySubcategoryOptions, products]);

  const whatsappDigits = getWhatsappDigits(settings.whatsappDisplay);
  const whatsappBaseLink = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "#";
  const whatsappContactLink = `${whatsappBaseLink}?text=${encodeURIComponent(
    "Bonjour, je souhaite obtenir des informations sur vos produits.",
  )}`;
  const orderedCategoryEntries = getOrderedCategoryEntries(categoryLabels);
  const categoryCards = [
    { id: "tous", label: "Tout voir" },
    ...orderedCategoryEntries.map(([categoryId, label]) => ({ id: categoryId, label })),
  ];
  const productTabs = categoryCards;
  const subcategoryLabels = buildSubcategoryLabels(categorySubcategoryOptions);
  const visibleSubcategories =
    activeTab === "tous"
      ? []
      : getVisibleSubcategories(products, activeTab, categorySubcategoryOptions);
  const filteredProducts = products.filter((product) => {
    if (activeTab !== "tous" && product.c !== activeTab) {
      return false;
    }

    if (activeTab !== "tous" && activeSubcategory !== "tous" && product.sc !== activeSubcategory) {
      return false;
    }

    return true;
  });
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.p * item.qty, 0);
  const shippingFee = getShippingFee(zone, settings);
  const checkoutTotal = cartSubtotal + shippingFee;
  const pendingOrders = orders.filter((order) => order.status === "new").length;
  const revenue = orders
    .filter((order) => order.status !== "cancel")
    .reduce((sum, order) => sum + order.total, 0);
  const adminDate = getAdminDate();
  const categoryCounts = orderedCategoryEntries.reduce((accumulator, [categoryId]) => {
    accumulator[categoryId] = products.filter((product) => product.c === categoryId).length;
    return accumulator;
  }, {});
  const availableCategoryIds = new Set(
    Object.entries(categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([category]) => category),
  );
  const activeTabIsAvailable =
    activeTab === "tous" || (Boolean(categoryLabels[activeTab]) && availableCategoryIds.has(activeTab));
  const categorySubcategorySummaries = orderedCategoryEntries.map(([categoryId, label]) => {
    const activeSubcategories = getVisibleSubcategories(
      products,
      categoryId,
      categorySubcategoryOptions,
    ).map((subcategory) => ({
      ...subcategory,
      count: products.filter(
        (product) => product.c === categoryId && product.sc === subcategory.id,
      ).length,
    }));

    return {
      category: categoryId,
      label,
      count: categoryCounts[categoryId],
      activeSubcategories,
    };
  });
  const firstCategoryId = orderedCategoryEntries[0]?.[0] || EMPTY_PRODUCT_FORM.category;
  const productFormSubcategoryOptions = categorySubcategoryOptions[productForm.category] || [];

  useEffect(() => {
    if (!activeTabIsAvailable) {
      setActiveTab("tous");
      setActiveSubcategory("tous");
    }
  }, [activeTabIsAvailable]);

  useEffect(() => {
    if (!isAdminRoute || !hydrated || adminUnlocked || adminRouteInitRef.current) {
      return;
    }

    adminRouteInitRef.current = true;
    void requestAdminAccess({ redirectToShopOnCancel: true });
  }, [adminUnlocked, hydrated, isAdminRoute]);

  function showToast(message) {
    setToastMessage(message);
  }

  function navigateTo(path) {
    if (typeof window !== "undefined") {
      window.location.assign(path);
    }
  }

  function showPage(page) {
    if (page === "admin" && !isAdminRoute) {
      navigateTo("/admin");
      return;
    }

    if (page === "shop" && isAdminRoute) {
      navigateTo("/");
      return;
    }

    setCurrentPage(page);
    setCartOpen(false);
    setCheckoutOpen(false);
  }

  async function requestAdminAccess({ redirectToShopOnCancel = false } = {}) {
    if (adminUnlocked) {
      showPage("admin");
      return true;
    }

    const code = window.prompt("Entrez le code administrateur");

    if (code === null) {
      if (redirectToShopOnCancel) {
        navigateTo("/");
      }
      return false;
    }

    try {
      await requestJson("/api/admin/unlock", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setAdminUnlocked(true);
      window.localStorage.setItem(ADMIN_ACCESS_KEY, "granted");
      showToast("Accès administrateur activé");
      showPage("admin");
      return true;
    } catch (error) {
      showToast(error.message || "Code administrateur incorrect");
      return false;
    }
  }

  function scrollToProducts() {
    window.setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function handleTabChange(category) {
    if (category !== "tous" && !availableCategoryIds.has(category)) {
      return;
    }

    setCurrentPage("shop");
    setActiveTab(category);
    setActiveSubcategory("tous");
    scrollToProducts();
  }

  function handleQuantityChange(productId, delta) {
    setQuantityById((current) => ({
      ...current,
      [productId]: Math.max(1, (current[productId] || 1) + delta),
    }));
  }

  function addToCart(productId) {
    const product = products.find((item) => item.id === productId);

    if (!product || product.s === 0) {
      return;
    }

    const quantity = quantityById[productId] || 1;

    setCart((current) => {
      const existing = current.find((item) => item.id === productId);

      if (existing) {
        return current.map((item) =>
          item.id === productId ? { ...item, qty: item.qty + quantity } : item,
        );
      }

      return [...current, { ...product, qty: quantity }];
    });

    showToast(`${product.n} ajouté au panier`);
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function openCheckout() {
    if (!cart.length) {
      showToast("Votre panier est vide");
      return;
    }

    setCartOpen(false);
    setCheckoutOpen(true);
    setCheckoutStep(1);
    setCheckoutErrors(EMPTY_ERRORS);
    setConfirmOrder(null);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function resetCheckout() {
    setCheckoutOpen(false);
    setCheckoutStep(1);
    setCheckoutForm(EMPTY_CHECKOUT);
    setCheckoutErrors(EMPTY_ERRORS);
    setZone("dakar");
    setPaymentMethod("");
    setConfirmOrder(null);
  }

  function handleCheckoutField(field, value) {
    setCheckoutForm((current) => ({ ...current, [field]: value }));
    setCheckoutErrors((current) => ({ ...current, [field]: false }));
  }

  function validateStepOne() {
    const nextErrors = {
      ...EMPTY_ERRORS,
      name: !checkoutForm.name.trim(),
      tel: checkoutForm.tel.trim().length < 8,
    };

    setCheckoutErrors((current) => ({
      ...current,
      name: nextErrors.name,
      tel: nextErrors.tel,
    }));

    return !nextErrors.name && !nextErrors.tel;
  }

  function validateStepTwo() {
    const hasAddress = checkoutForm.address.trim().length > 0;

    setCheckoutErrors((current) => ({
      ...current,
      address: !hasAddress,
    }));

    return hasAddress;
  }

  function validateStepThree() {
    const hasPayment = Boolean(paymentMethod);

    setCheckoutErrors((current) => ({
      ...current,
      payment: !hasPayment,
    }));

    return hasPayment;
  }

  function sendToWhatsApp(order) {
    if (!whatsappDigits) {
      return;
    }

    let message =
      "Nouvelle commande - SKIN'S\n\n" +
      `Nom: ${order.nom}\n` +
      `Téléphone: ${order.tel}\n` +
      `Adresse: ${order.addr}\n` +
      `Zone: ${order.zone}\n` +
      `Paiement: ${order.pm}\n\n` +
      "Produits:\n";

    order.items.forEach((item) => {
      message += `- ${item.n} x${item.qty} - ${formatPrice(item.p * item.qty)} FCFA\n`;
    });

    message += `\nTotal: ${formatPrice(order.total)} FCFA\n\nMerci.`;
    window.open(`${whatsappBaseLink}?text=${encodeURIComponent(message)}`, "_blank");
  }

  async function confirmCheckoutOrder() {
    const order = {
      id: `CMD-${String(orders.length + 1).padStart(3, "0")}`,
      date: new Date().toLocaleDateString("fr-FR"),
      nom: checkoutForm.name.trim(),
      tel: checkoutForm.tel.trim(),
      addr: checkoutForm.address.trim(),
      zone: getShippingLabel(zone, settings),
      pm: getPaymentLabel(paymentMethod),
      items: cart.map((item) => ({ ...item })),
      livr: shippingFee,
      total: checkoutTotal,
      status: "new",
    };

    sendToWhatsApp(order);
    setCheckoutSubmitting(true);

    try {
      const payload = await requestJson("/api/orders", {
        method: "POST",
        body: JSON.stringify({ order }),
      });
      const savedOrder = payload.order || order;

      setOrders((current) => [savedOrder, ...current.filter((item) => item.id !== savedOrder.id)]);
      setOrdersSource(payload.source || "local");
      setDatabaseStatusMessage("");
      setConfirmOrder(savedOrder);
      setCart([]);
      setCheckoutStep(4);
      showToast("Commande envoyée");
    } catch {
      setOrders((current) => [order, ...current]);
      setOrdersSource("local");
      setConfirmOrder(order);
      setCart([]);
      setCheckoutStep(4);
      showToast("Commande enregistrée localement");
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  function goToStep(nextStep) {
    if (nextStep <= checkoutStep) {
      setCheckoutStep(nextStep);
      return;
    }

    if (checkoutStep === 1 && !validateStepOne()) {
      return;
    }

    if (checkoutStep === 2 && !validateStepTwo()) {
      return;
    }

    if (checkoutStep === 3) {
      if (!validateStepThree()) {
        return;
      }

      if (checkoutSubmitting) {
        return;
      }

      void confirmCheckoutOrder();
      return;
    }

    setCheckoutStep(nextStep);
  }

  function handleFooterTap() {
    footerTapCountRef.current += 1;

    if (footerTapTimerRef.current) {
      window.clearTimeout(footerTapTimerRef.current);
    }

    footerTapTimerRef.current = window.setTimeout(() => {
      footerTapCountRef.current = 0;
    }, 3000);

    if (footerTapCountRef.current >= 5) {
      footerTapCountRef.current = 0;
      void requestAdminAccess();
    }
  }

  async function handleOrderStatus(orderId, status) {
    try {
      const payload = await requestJson("/api/orders", {
        method: "PATCH",
        body: JSON.stringify({ id: orderId, status }),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? payload.order || { ...order, status } : order)),
      );
      setOrdersSource("database");
      setDatabaseStatusMessage("");
      showToast(status === "done" ? "Commande marquée comme livrée" : "Commande annulée");
    } catch (error) {
      setDatabaseStatusMessage(
        error.message || "Impossible de mettre à jour la commande dans la base.",
      );
      showToast(error.message || "Erreur de synchronisation");
    }
  }

  function openProductForm(productId = null) {
    if (productId === null) {
      setEditingProductId(null);
      setProductForm({
        ...EMPTY_PRODUCT_FORM,
        category: firstCategoryId,
        subcategory: getDefaultSubcategory(firstCategoryId, categorySubcategoryOptions),
      });
      setProductFormOpen(true);
      return;
    }

    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setEditingProductId(product.id);
    setProductForm({
      name: product.n,
      category: product.c,
      subcategory: resolveProductFormSubcategory(product.c, product.sc, categorySubcategoryOptions),
      emoji: product.e,
      image: product.i || "",
      description: product.d,
      price: String(product.p),
      availability: product.s === 0 ? "out" : "available",
    });
    setProductFormOpen(true);
  }

  function closeProductForm() {
    setProductFormOpen(false);
    setEditingProductId(null);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category: firstCategoryId,
      subcategory: getDefaultSubcategory(firstCategoryId, categorySubcategoryOptions),
    });
  }

  function openCategoryForm(categoryId = null) {
    if (categoryId === null) {
      setEditingCategoryId(null);
      setCategoryForm(createEmptyCategoryForm());
      setCategoryFormOpen(true);
      return;
    }

    if (!categoryLabels[categoryId]) {
      return;
    }

    setEditingCategoryId(categoryId);
    setCategoryForm({
      name: categoryLabels[categoryId],
      subcategories:
        categorySubcategoryOptions[categoryId]?.length
          ? categorySubcategoryOptions[categoryId].map((entry) => ({ ...entry }))
          : createEmptyCategoryForm().subcategories,
    });
    setCategoryFormOpen(true);
  }

  function closeCategoryForm() {
    setCategoryFormOpen(false);
    setEditingCategoryId(null);
    setCategoryForm(createEmptyCategoryForm());
  }

  function handleCategorySubcategoryChange(index, value) {
    setCategoryForm((current) => ({
      ...current,
      subcategories: current.subcategories.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, label: value } : entry,
      ),
    }));
  }

  function addCategorySubcategoryField() {
    setCategoryForm((current) => ({
      ...current,
      subcategories: [...current.subcategories, { id: "", label: "" }],
    }));
  }

  function removeCategorySubcategoryField(index) {
    setCategoryForm((current) => {
      if (current.subcategories.length === 1) {
        return createEmptyCategoryForm();
      }

      return {
        ...current,
        subcategories: current.subcategories.filter((_, entryIndex) => entryIndex !== index),
      };
    });
  }

  function saveCategory() {
    const name = categoryForm.name.trim();
    const nextRawSubcategories = categoryForm.subcategories
      .map((entry) => ({
        id: String(entry.id || "").trim(),
        label: String(entry.label || "").trim(),
      }))
      .filter((entry) => entry.label);

    if (!name || !nextRawSubcategories.length) {
      showToast("Ajoutez un nom et au moins une sous-catégorie");
      return;
    }

    const categoryId = (() => {
      if (editingCategoryId) {
        return editingCategoryId;
      }

      const baseId = slugifyTaxonomyId(name);
      let candidate = baseId;
      let index = 2;

      while (categoryLabels[candidate]) {
        candidate = `${baseId}-${index}`;
        index += 1;
      }

      return candidate;
    })();

    const usedSubcategoryIds = new Set();
    const nextSubcategories = nextRawSubcategories.map((entry, index) => {
      const baseId = entry.id || slugifyTaxonomyId(entry.label, `sous-categorie-${index + 1}`);
      let candidate = baseId;
      let suffix = 2;

      while (usedSubcategoryIds.has(candidate)) {
        candidate = `${baseId}-${suffix}`;
        suffix += 1;
      }

      usedSubcategoryIds.add(candidate);

      return {
        id: candidate,
        label: entry.label,
      };
    });

    const previousSubcategories = editingCategoryId
      ? categorySubcategoryOptions[editingCategoryId] || []
      : [];
    const removedSubcategoryIds = previousSubcategories
      .map((entry) => entry.id)
      .filter((subcategoryId) => !nextSubcategories.some((entry) => entry.id === subcategoryId));
    const blockedSubcategoryId = removedSubcategoryIds.find((subcategoryId) =>
      products.some((product) => product.c === editingCategoryId && product.sc === subcategoryId),
    );

    if (blockedSubcategoryId) {
      showToast("Déplace d'abord les produits liés à cette sous-catégorie");
      return;
    }

    setCategoryLabels((current) => ({
      ...current,
      [categoryId]: name,
    }));
    setCategorySubcategoryOptions((current) => ({
      ...current,
      [categoryId]: nextSubcategories,
    }));

    if (productForm.category === categoryId) {
      setProductForm((current) => ({
        ...current,
        subcategory: resolveProductFormSubcategory(
          categoryId,
          current.subcategory,
          {
            ...categorySubcategoryOptions,
            [categoryId]: nextSubcategories,
          },
        ),
      }));
    }

    closeCategoryForm();
    showToast(editingCategoryId ? "Catégorie mise à jour" : "Catégorie ajoutée");
  }

  function deleteCategory(categoryId) {
    if (products.some((product) => product.c === categoryId)) {
      showToast("Supprime ou déplace d'abord les produits de cette catégorie");
      return;
    }

    if (!window.confirm("Supprimer cette catégorie ?")) {
      return;
    }

    const fallbackCategoryId =
      orderedCategoryEntries.find(([entryId]) => entryId !== categoryId)?.[0] || firstCategoryId;

    setCategoryLabels((current) => {
      const nextLabels = { ...current };
      delete nextLabels[categoryId];
      return nextLabels;
    });
    setCategorySubcategoryOptions((current) => {
      const nextOptions = { ...current };
      delete nextOptions[categoryId];
      return nextOptions;
    });

    if (activeTab === categoryId) {
      setActiveTab("tous");
      setActiveSubcategory("tous");
    }

    if (productForm.category === categoryId) {
      setProductForm((current) => ({
        ...current,
        category: fallbackCategoryId,
        subcategory: getDefaultSubcategory(fallbackCategoryId, categorySubcategoryOptions),
      }));
    }

    if (editingCategoryId === categoryId) {
      closeCategoryForm();
    }

    showToast("Catégorie supprimée");
  }

  async function handleProductImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProductImageUploading(true);

    try {
      const optimizedImage = await optimizeImageFile(file);

      setProductForm((current) => ({ ...current, image: optimizedImage }));
      showToast("Image du produit ajoutée");
    } catch (error) {
      showToast(error.message || "Impossible d'ajouter cette image");
    } finally {
      setProductImageUploading(false);
      event.target.value = "";
    }
  }

  async function saveProduct() {
    const name = productForm.name.trim();
    const price = Number(productForm.price);
    const stock = productForm.availability === "out" ? 0 : 1;

    if (!name || Number.isNaN(price)) {
      showToast("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const product = normalizeProduct({
      id: editingProductId ?? Math.max(0, ...products.map((item) => item.id)) + 1,
      n: name,
      c: productForm.category,
      sc: productForm.subcategory,
      e: productForm.emoji.trim(),
      i: productForm.image.trim(),
      d: productForm.description.trim(),
      p: price,
      s: stock,
    }, categorySubcategoryOptions);

    try {
      const payload = await requestJson("/api/products", {
        method: editingProductId === null ? "POST" : "PUT",
        body: JSON.stringify({ product }),
      });
      const savedProduct = payload.product || product;

      setProducts((current) => {
        if (editingProductId === null) {
          return normalizeProducts([...current, savedProduct], categorySubcategoryOptions);
        }

        return normalizeProducts(
          current.map((item) => (item.id === editingProductId ? savedProduct : item)),
          categorySubcategoryOptions,
        );
      });

      setProductsSource("database");
      setDatabaseStatusMessage("");
      closeProductForm();
      showToast(editingProductId === null ? "Produit ajouté" : "Produit mis à jour");
    } catch (error) {
      setDatabaseStatusMessage(
        error.message || "Impossible d'enregistrer le produit dans la base.",
      );
      showToast(error.message || "Erreur de synchronisation");
    }
  }

  async function deleteProduct(productId) {
    if (!window.confirm("Supprimer ce produit ?")) {
      return;
    }

    try {
      await requestJson("/api/products", {
        method: "DELETE",
        body: JSON.stringify({ id: productId }),
      });

      setProducts((current) => current.filter((product) => product.id !== productId));
      setCart((current) => current.filter((item) => item.id !== productId));
      setProductsSource("database");
      setDatabaseStatusMessage("");
      showToast("Produit supprimé");
    } catch (error) {
      setDatabaseStatusMessage(
        error.message || "Impossible de supprimer le produit dans la base.",
      );
      showToast(error.message || "Erreur de synchronisation");
    }
  }

  function handleSettingsChange(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  function saveSettings() {
    setSettings((current) => ({
      ...current,
      shopName: current.shopName.trim() || INITIAL_SETTINGS.shopName,
      tagline: current.tagline.trim() || INITIAL_SETTINGS.tagline,
      whatsappDisplay: current.whatsappDisplay.trim() || INITIAL_SETTINGS.whatsappDisplay,
    }));
    showToast("Paramètres enregistrés");
  }

  return (
    <>
      <div id="shopPage" className={cn("page", !isAdminRoute && currentPage === "shop" && "active")}>
        <div className="ann">
          <div className="ann-t">
            <span>Des soins sélectionnés pour le visage, le corps et les cheveux</span>
            <span>Des textures agréables, des routines claires et des références reconnues</span>
            <span>Hydratation, éclat, réparation et entretien au quotidien</span>
            <span>Des produits choisis pour vous aider à trouver plus facilement le bon soin</span>
            <span>Des soins sélectionnés pour le visage, le corps et les cheveux</span>
            <span>Des textures agréables, des routines claires et des références reconnues</span>
            <span>Hydratation, éclat, réparation et entretien au quotidien</span>
            <span>Des produits choisis pour vous aider à trouver plus facilement le bon soin</span>
          </div>
        </div>

        <header>
          <div className="hdr">
            <nav className="hdr-l">
              <a
                href="#products"
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange("tous");
                }}
              >
                Catalogue
              </a>
              <a
                href="#products"
                className={cn(!availableCategoryIds.has("visage") && "is-disabled")}
                aria-disabled={!availableCategoryIds.has("visage")}
                tabIndex={availableCategoryIds.has("visage") ? undefined : -1}
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange("visage");
                }}
              >
                Visage
              </a>
              <a
                href="#products"
                className={cn(!availableCategoryIds.has("cheveux") && "is-disabled")}
                aria-disabled={!availableCategoryIds.has("cheveux")}
                tabIndex={availableCategoryIds.has("cheveux") ? undefined : -1}
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange("cheveux");
                }}
              >
                Cheveux
              </a>
              <a
                href="#products"
                className={cn(!availableCategoryIds.has("corps") && "is-disabled")}
                aria-disabled={!availableCategoryIds.has("corps")}
                tabIndex={availableCategoryIds.has("corps") ? undefined : -1}
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange("corps");
                }}
              >
                Corps
              </a>
              <a
                href="#products"
                className={cn(!availableCategoryIds.has("divers") && "is-disabled")}
                aria-disabled={!availableCategoryIds.has("divers")}
                tabIndex={availableCategoryIds.has("divers") ? undefined : -1}
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange("divers");
                }}
              >
                Divers
              </a>
            </nav>

            <div className="logo-wrap">
              <span className="logo-text">{settings.shopName}</span>
              <span className="logo-sub">{settings.tagline}</span>
            </div>

            <div className="hdr-r">
              <a
                href={whatsappContactLink}
                className="hico"
                aria-label="Contacter la boutique sur WhatsApp"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" />
                <span className="hico-label">Contact</span>
              </a>
              <a
                href="#products"
                className="hico"
                aria-label="Aller au catalogue"
                onClick={(event) => {
                  event.preventDefault();
                  handleTabChange(activeTab);
                }}
              >
                <Icon name="catalog" />
                <span className="hico-label">Catalogue</span>
              </a>
              <button
                type="button"
                className="hico"
                onClick={() => setCartOpen(true)}
                style={{ position: "relative" }}
                aria-label="Ouvrir le panier"
              >
                <Icon name="cart" />
                <span className="hico-label">Panier</span>
                <span className="hbadge">{cartCount}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="hero-in">
            <div>
              <div className="hero-tag">
                <span>{settings.tagline}</span>
              </div>
              <h1>
                Des soins
                <br />
                <em>sélectionnés</em>
                <br />
                pour le quotidien.
              </h1>
              <p className="hero-desc">
                Un catalogue structuré de soins et d&apos;hygiène, avec des produits
                authentiques, des prix clairs et une livraison partout au Sénégal.
              </p>
              <div className="hero-btns">
                <a
                  href="#products"
                  className="btn-main"
                  onClick={(event) => {
                    event.preventDefault();
                    handleTabChange(activeTab);
                  }}
                >
                  Découvrir la boutique
                </a>
                <a href={whatsappContactLink} className="btn-sec" target="_blank" rel="noreferrer">
                  Nous contacter
                </a>
              </div>
            </div>

            <div className="hero-r">
              <div className="stat-grid">
                {HERO_HIGHLIGHTS.map((highlight) => (
                  <div key={highlight.title} className="stat">
                    <div className="stat-kicker">{highlight.title}</div>
                    <div className="stat-copy">{highlight.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="ibar">
          <div className="ibar-in">
            <div className="ib">
              <div className="ib-ico">
                <Icon name="truck" />
              </div>
              <div className="ib-txt">
                <strong>Livraison à Dakar</strong>
                <span>Environ 30 à 45 min dès {formatPrice(settings.shippingDakar)} FCFA</span>
              </div>
            </div>
            <div className="ib">
              <div className="ib-ico">
                <Icon name="map" />
              </div>
              <div className="ib-txt">
                <strong>Livraison hors Dakar</strong>
                <span>{formatPrice(settings.shippingOutside)} FCFA, délai confirmé à la commande</span>
              </div>
            </div>
            <div className="ib">
              <div className="ib-ico">
                <Icon name="payment" />
              </div>
              <div className="ib-txt">
                <strong>Modes de paiement</strong>
                <span>Wave · Orange Money · Paiement à la livraison</span>
              </div>
            </div>
            <div className="ib">
              <div className="ib-ico">
                <Icon name="shield" />
              </div>
              <div className="ib-txt">
                <strong>Produits sélectionnés</strong>
                <span>Références vérifiées et catalogue structuré</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cats-section rv" id="products" ref={productsRef}>
          <div className="cats-lbl">Explorer par</div>
          <div className="cats-ttl">
            Nos <em>Catégories</em>
          </div>
          <div className="cats-grid">
            {categoryCards.map((category) => {
              const isAvailable =
                category.id === "tous" ? Boolean(products.length) : availableCategoryIds.has(category.id);

              return (
                <button
                  key={category.id}
                  type="button"
                  className={cn(
                    "cat-card",
                    activeTab === category.id && "on",
                    !isAvailable && "disabled",
                  )}
                  onClick={() => handleTabChange(category.id)}
                  disabled={!isAvailable}
                >
                  <div className="cc-n">{category.label}</div>
                  {!isAvailable ? <div className="cc-meta">Bientôt disponible</div> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sec">
          <div className="sec-hd rv">
            <div>
              <div className="sec-lbl">Notre sélection</div>
              <div className="sec-ttl">
                {activeTab === "tous" ? (
                  <>
                    Tous nos <em>Soins</em>
                  </>
                ) : (
                  <>
                    {categoryLabels[activeTab] || activeTab} <em>par sous-catégorie</em>
                  </>
                )}
              </div>
              {activeTab !== "tous" ? (
                <div className="sec-sub">
                  {activeSubcategory === "tous"
                    ? "Affiche toutes les sous-catégories de cette gamme."
                    : `Filtre actif : ${subcategoryLabels[activeSubcategory] || activeSubcategory}.`}
                </div>
              ) : null}
            </div>
          </div>

          <div className="tabs rv" id="tabs">
            {productTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "tab",
                  activeTab === tab.id && "on",
                  tab.id !== "tous" && !availableCategoryIds.has(tab.id) && "disabled",
                )}
                onClick={() => handleTabChange(tab.id)}
                disabled={tab.id !== "tous" && !availableCategoryIds.has(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "tous" && visibleSubcategories.length ? (
            <div className="subtabs rv">
              <button
                type="button"
                className={cn("subtab", activeSubcategory === "tous" && "on")}
                onClick={() => setActiveSubcategory("tous")}
              >
                Tout voir
              </button>
              {visibleSubcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  className={cn("subtab", activeSubcategory === subcategory.id && "on")}
                  onClick={() => setActiveSubcategory(subcategory.id)}
                >
                  {subcategory.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="pgrid">
            {filteredProducts.length ? (
              filteredProducts.map((product, index) => {
                const stockState = getStockState(product.s);
                const quantity = quantityById[product.id] || 1;
                const shouldPrioritizeImage = index < 4;

                return (
                  <div key={product.id} className="pcard rv">
                    <div className="pimg">
                      {product.i ? (
                        <SmartImage
                          src={product.i}
                          alt={product.n}
                          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                          priority={shouldPrioritizeImage}
                        />
                      ) : (
                        <span className="pimg-fallback">{getProductFallbackLabel(product.n)}</span>
                      )}
                    </div>
                    <div className="pbody">
                      <div className="pmeta">
                        <span className="pbadge">{categoryLabels[product.c] || product.c}</span>
                        <span className="pbadge alt">
                          {subcategoryLabels[product.sc] || product.sc}
                        </span>
                      </div>
                      <div className="pname">{product.n}</div>
                      <div className="pdesc">{product.d}</div>
                      <div className="psep" />
                      <div className="prow">
                        <div className="pprice">
                          {formatPrice(product.p)}
                          <sup>FCFA</sup>
                        </div>
                        {stockState ? (
                          <div className={cn("pstock", stockState.tone)}>
                            <span className="sd" />
                            {stockState.label}
                          </div>
                        ) : null}
                      </div>
                      <div className="qwrap">
                        <div className="qbox">
                          <button
                            type="button"
                            className="qb"
                            onClick={() => handleQuantityChange(product.id, -1)}
                          >
                            −
                          </button>
                          <div className="qn">{quantity}</div>
                          <button
                            type="button"
                            className="qb"
                            onClick={() => handleQuantityChange(product.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="abtn"
                          onClick={() => addToCart(product.id)}
                          disabled={product.s === 0}
                        >
                          {product.s === 0 ? "Indisponible" : "Ajouter au panier"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-catalog">Aucun produit disponible dans cette sous-catégorie.</div>
            )}
          </div>
        </div>

        <div className="soc-bar">
          <div className="soc-in">
            <span className="soc-lbl">Suivez-nous</span>
            <div className="soc-div" />
            <a href={whatsappBaseLink} target="_blank" rel="noreferrer" className="soc-a">
              <Icon name="whatsapp" />
              WhatsApp
            </a>
            <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="soc-a">
              <Icon name="instagram" />
              Instagram
            </a>
            <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="soc-a">
              <Icon name="facebook" />
              Facebook
            </a>
            <a href={settings.tiktokUrl} target="_blank" rel="noreferrer" className="soc-a">
              <Icon name="tiktok" />
              TikTok
            </a>
          </div>
        </div>

        <footer>
          <div className="fg">
            <div className="fb">
              <span className="footer-logo">{settings.shopName}</span>
              <p>Boutique de soins et d&apos;hygiène avec commande simple sur WhatsApp.</p>
              <div className="footer-meta">
                <span>{settings.whatsappDisplay}</span>
                <span>Livraison au Sénégal</span>
                <span>Wave · Orange Money · Livraison</span>
              </div>
            </div>
          </div>

          <div className="fbot" onClick={handleFooterTap}>
            <span>© 2026 {settings.shopName} — {settings.tagline.toUpperCase()}</span>
            <span>DAKAR · SÉNÉGAL</span>
            <span>
              Conçu par{" "}
              <a
                href={MMB_WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Mmb
              </a>
            </span>
          </div>
        </footer>

        <a
          className="wafab"
          href={whatsappContactLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Contacter sur WhatsApp"
        >
          <div className="wafab-ring" />
          <Icon name="whatsapp" />
        </a>
      </div>

      <div className={cn("ov", cartOpen && "on")} onClick={() => setCartOpen(false)} />
      <div className={cn("drw", cartOpen && "on")}>
        <div className="drw-hd">
          <h2>Mon panier</h2>
          <button type="button" className="drw-x" onClick={() => setCartOpen(false)}>
            ✕
          </button>
        </div>
        <div className="drw-body">
          {!cart.length ? (
            <div className="ec">
              <p>Votre panier est vide.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="ci">
                <div className="ci-img">
                  {item.i ? (
                    <SmartImage src={item.i} alt={item.n} sizes="62px" />
                  ) : (
                    <span className="ci-fallback">{getProductFallbackLabel(item.n)}</span>
                  )}
                </div>
                <div className="ci-inf">
                  <div className="ci-n">{item.n}</div>
                  <div className="ci-s">Qté : {item.qty}</div>
                  <div className="ci-p">{formatPrice(item.p * item.qty)} FCFA</div>
                </div>
                <button type="button" className="ci-rm" onClick={() => removeFromCart(item.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <div className="drw-ft">
          <div className="tot-row">
            <span className="tl">Total</span>
            <span className="tv">{formatPrice(cartSubtotal)} FCFA</span>
          </div>
          <button type="button" className="cta-checkout" onClick={openCheckout}>
            Passer la commande
          </button>
        </div>
      </div>

      <div className={cn("mover", checkoutOpen && "on")} onClick={closeCheckout} />
      <div className={cn("modal", checkoutOpen && "on")}>
        <div className="mo-hd">
          <h2>Finaliser ma commande</h2>
          <button type="button" className="mo-x" onClick={closeCheckout}>
            ✕
          </button>
        </div>

        <div className="mo-body">
          <div className="steps">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn("stp", checkoutStep === step && "on", checkoutStep > step && "done")}
              >
                <div className="stp-num">{step}</div>
                <div className="stp-l">
                  {["Coordonnées", "Livraison", "Paiement", "Confirmation"][step - 1]}
                </div>
              </div>
            ))}
          </div>

          <div className={cn("fstep", checkoutStep === 1 && "on")}>
            <label className="flbl">Nom complet *</label>
            <input
              className={cn("finput", checkoutErrors.name && "err")}
              type="text"
              placeholder="Votre nom et prénom"
              value={checkoutForm.name}
              onChange={(event) => handleCheckoutField("name", event.target.value)}
            />
            <div className={cn("ferr", checkoutErrors.name && "on")}>
              Veuillez entrer votre nom
            </div>

            <label className="flbl">Numéro de téléphone *</label>
            <input
              className={cn("finput", checkoutErrors.tel && "err")}
              type="tel"
              placeholder="+221 XX XXX XX XX"
              value={checkoutForm.tel}
              onChange={(event) => handleCheckoutField("tel", event.target.value)}
            />
            <div className={cn("ferr", checkoutErrors.tel && "on")}>Numéro invalide</div>

            <div className="mo-nav">
              <button type="button" className="btn-next" onClick={() => goToStep(2)}>
                Continuer
              </button>
            </div>
          </div>

          <div className={cn("fstep", checkoutStep === 2 && "on")}>
            <label className="flbl">Zone de livraison *</label>
            <div className="zone-grid">
              <button
                type="button"
                className={cn("zone-opt", zone === "dakar" && "on")}
                onClick={() => setZone("dakar")}
              >
                <div className="zone-check">{zone === "dakar" ? "✓" : ""}</div>
                <div className="zone-name">Dakar</div>
                <div className="zone-sub">Livraison en 30 à 45 min</div>
                <div className="zone-price">
                  {formatPrice(settings.shippingDakar)}
                  <sub> FCFA</sub>
                </div>
              </button>

              <button
                type="button"
                className={cn("zone-opt", zone === "hors" && "on")}
                onClick={() => setZone("hors")}
              >
                <div className="zone-check">{zone === "hors" ? "✓" : ""}</div>
                <div className="zone-name">Hors Dakar</div>
                <div className="zone-sub">Délai communiqué à la confirmation</div>
                <div className="zone-price">
                  {formatPrice(settings.shippingOutside)}
                  <sub> FCFA</sub>
                </div>
              </button>
            </div>

            <label className="flbl">Adresse de livraison *</label>
            <input
              className={cn("finput", checkoutErrors.address && "err")}
              type="text"
              placeholder="Quartier, rue, numéro de maison..."
              value={checkoutForm.address}
              onChange={(event) => handleCheckoutField("address", event.target.value)}
            />
            <div className={cn("ferr", checkoutErrors.address && "on")}>
              Veuillez entrer votre adresse
            </div>

            <div className="mo-nav">
              <button type="button" className="btn-prev" onClick={() => goToStep(1)}>
                Retour
              </button>
              <button type="button" className="btn-next" onClick={() => goToStep(3)}>
                Continuer
              </button>
            </div>
          </div>

          <div className={cn("fstep", checkoutStep === 3 && "on")}>
            <div className="recap">
              <div className="recap-ttl">Récapitulatif</div>
              {cart.map((item) => (
                <div key={item.id} className="recap-item">
                  <span>
                    {item.n} ×{item.qty}
                  </span>
                  <span className="ri-p">{formatPrice(item.p * item.qty)} FCFA</span>
                </div>
              ))}
              <div className="recap-item">
                <span>Livraison</span>
                <span className="ri-p">{formatPrice(shippingFee)} FCFA</span>
              </div>
              <div className="recap-total">
                <span>Total</span>
                <strong>{formatPrice(checkoutTotal)} FCFA</strong>
              </div>
            </div>

            <label className="flbl">Mode de paiement *</label>
            <div className="pm-grid">
              {[
                { id: "wave", name: "Wave", desc: "Paiement mobile", icon: "wave", kind: "logo" },
                {
                  id: "orange",
                  name: "Orange Money",
                  desc: "Paiement mobile",
                  icon: "orange",
                  kind: "logo",
                },
                {
                  id: "cash",
                  name: "Paiement à la livraison",
                  desc: "Règlement à la réception",
                  icon: "cash",
                  kind: "icon",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn("pm-opt", paymentMethod === option.id && "on")}
                  onClick={() => {
                    setPaymentMethod(option.id);
                    setCheckoutErrors((current) => ({ ...current, payment: false }));
                  }}
                >
                  <div className="pm-icon">
                    {option.kind === "logo" ? (
                      <PaymentLogo name={option.icon} className="pm-brand-logo" />
                    ) : (
                      <Icon name={option.icon} />
                    )}
                  </div>
                  <div className="pm-name">{option.name}</div>
                  <div className="pm-desc">{option.desc}</div>
                </button>
              ))}
            </div>
            <div className={cn("ferr", checkoutErrors.payment && "on")}>
              Veuillez choisir un mode de paiement
            </div>

            <div className="mo-nav">
              <button type="button" className="btn-prev" onClick={() => goToStep(2)}>
                Retour
              </button>
              <button type="button" className="btn-next" onClick={() => goToStep(4)}>
                {checkoutSubmitting ? "Envoi..." : "Confirmer la commande"}
              </button>
            </div>
          </div>

          <div className={cn("fstep", checkoutStep === 4 && "on")}>
            <div className="confirm-box">
              <h3>Commande reçue</h3>
              <p>
                Votre commande a bien été enregistrée. Nous vous contacterons pour confirmer la
                livraison.
              </p>
              {confirmOrder ? (
                <div className="confirm-detail">
                  <div className="cd-row">
                    <span>Nom</span>
                    <strong>{confirmOrder.nom}</strong>
                  </div>
                  <div className="cd-row">
                    <span>Téléphone</span>
                    <strong>{confirmOrder.tel}</strong>
                  </div>
                  <div className="cd-row">
                    <span>Adresse</span>
                    <strong>{confirmOrder.addr}</strong>
                  </div>
                  <div className="cd-row">
                    <span>Livraison</span>
                    <strong>{getShippingLabel(zone, settings, "compact")}</strong>
                  </div>
                  <div className="cd-row">
                    <span>Paiement</span>
                    <strong>{getPaymentLabel(paymentMethod)}</strong>
                  </div>
                  <div className="cd-row">
                    <span>Total</span>
                    <strong>{formatPrice(confirmOrder.total)} FCFA</strong>
                  </div>
                </div>
              ) : null}

              <button type="button" className="btn-main full-btn" onClick={resetCheckout}>
                Retour à la boutique
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="adminGatePage" className={cn("page", isAdminRoute && !adminUnlocked && "active")}>
        <div className="adm-gate-box">
          <h1>Espace administrateur</h1>
          <p>Entrez le code administrateur pour accéder au tableau de bord.</p>
          <div className="adm-gate-actions">
            <button
              type="button"
              className="btn-main"
              onClick={() => void requestAdminAccess({ redirectToShopOnCancel: true })}
            >
              Déverrouiller l&apos;admin
            </button>
            <button type="button" className="btn-sec" onClick={() => navigateTo("/")}>
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>

      <div id="adminPage" className={cn("page", currentPage === "admin" && adminUnlocked && "active")}>
        <div className="adm-wrap">
          <aside className="adm-side">
            <div className="adm-logo">
              <span>{settings.shopName}</span>
              <small>Administration</small>
            </div>
            <nav className="adm-nav">
              {ADMIN_PANELS.map((panel) => (
                <a
                  key={panel.id}
                  href={`#${panel.id}`}
                  className={cn(adminPanel === panel.id && "on")}
                  onClick={(event) => {
                    event.preventDefault();
                    setAdminPanel(panel.id);
                  }}
                >
                  <Icon name={panel.icon} />
                  {panel.label}
                </a>
              ))}
            </nav>
            <div className="adm-side-foot">
              <button type="button" onClick={() => showPage("shop")}>
                <Icon name="arrow-left" />
                Voir la boutique
              </button>
            </div>
          </aside>

          <main className="adm-main">
            <div className="adm-topbar">
              <div>
                <h1>{ADMIN_PANELS.find((panel) => panel.id === adminPanel)?.label}</h1>
                <span className="adate">{adminDate}</span>
              </div>
              <div className="adm-topbar-actions">
                <button type="button" className="adm-shop-link" onClick={() => showPage("shop")}>
                  <Icon name="arrow-left" />
                  Voir la boutique
                </button>
              </div>
            </div>

            <div className="adm-mobile-nav">
              {ADMIN_PANELS.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  className={cn("adm-mobile-tab", adminPanel === panel.id && "on")}
                  onClick={() => setAdminPanel(panel.id)}
                >
                  <Icon name={panel.icon} />
                  {panel.label}
                </button>
              ))}
            </div>

            <div className="adm-stats">
              <div className="astat">
                <div className="astat-n">{orders.length}</div>
                <div className="astat-l">Commandes totales</div>
              </div>
              <div className="astat g2">
                <div className="astat-n">{formatPrice(revenue)}</div>
                <div className="astat-l">Chiffre d&apos;affaires</div>
              </div>
              <div className="astat g3">
                <div className="astat-n">{products.length}</div>
                <div className="astat-l">Produits actifs</div>
              </div>
              <div className="astat g4">
                <div className="astat-n">{pendingOrders}</div>
                <div className="astat-l">En attente</div>
              </div>
            </div>

            <div className={cn("adm-panel", adminPanel === "dashboard" && "on")}>
              <div className="panel-hd">
                <h2>Commandes récentes</h2>
              </div>
              {databaseStatusMessage ? <div className="panel-note">{databaseStatusMessage}</div> : null}
              {!orders.length ? (
                <p className="empty-orders">Aucune commande.</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleOrderStatus}
                    withActions
                  />
                ))
              )}
            </div>

            <div className={cn("adm-panel", adminPanel === "orders" && "on")}>
              <div className="panel-hd">
                <h2>Toutes les commandes</h2>
              </div>
              {databaseStatusMessage ? <div className="panel-note">{databaseStatusMessage}</div> : null}
              {!orders.length ? (
                <p className="empty-orders">Aucune commande.</p>
              ) : (
                orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleOrderStatus}
                    withActions
                  />
                ))
              )}
            </div>

            <div className={cn("adm-panel", adminPanel === "products" && "on")}>
              <div className="panel-hd">
                <h2>Gestion des produits</h2>
                <button type="button" className="btn-add" onClick={() => openProductForm()}>
                  <Icon name="plus" />
                  Ajouter
                </button>
              </div>
              {databaseStatusMessage ? <div className="panel-note">{databaseStatusMessage}</div> : null}
              {productsSource === "database" ? (
                <div className="panel-note ok">Catalogue synchronisé avec la base Supabase.</div>
              ) : (
                <div className="panel-note">Catalogue chargé depuis le fichier local du projet.</div>
              )}
              <div className="table-scroll">
                <table className="atbl">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Catégorie</th>
                      <th>Sous-catégorie</th>
                      <th>Prix</th>
                      <th>Disponibilité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const stockState = getAdminStockState(product.s);

                      return (
                        <tr key={product.id}>
                          <td data-label="Produit">
                            <span className="td-name">
                              {product.i ? (
                                <span className="td-thumb-wrap">
                                  <SmartImage
                                    src={product.i}
                                    alt={product.n}
                                    className="td-thumb"
                                    sizes="42px"
                                  />
                                </span>
                              ) : (
                                <span className="td-fallback">{getProductFallbackLabel(product.n)}</span>
                              )}
                              <span className="td-text">{product.n}</span>
                            </span>
                          </td>
                          <td data-label="Catégorie">{categoryLabels[product.c] || product.c}</td>
                          <td data-label="Sous-catégorie">
                            {subcategoryLabels[product.sc] || product.sc}
                          </td>
                          <td data-label="Prix" className="td-price">
                            {formatPrice(product.p)} F
                          </td>
                          <td data-label="Disponibilité">
                            <span className={cn("td-badge", stockState.tone)}>{stockState.label}</span>
                          </td>
                          <td data-label="Actions">
                            <div className="tbl-actions">
                              <button
                                type="button"
                                className="tbl-btn"
                                onClick={() => openProductForm(product.id)}
                              >
                                <Icon name="edit" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="tbl-btn del"
                                onClick={() => deleteProduct(product.id)}
                              >
                                <Icon name="trash" />
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={cn("adm-panel", adminPanel === "categories" && "on")}>
              <div className="panel-hd">
                <h2>Catégories</h2>
                <button type="button" className="btn-add" onClick={() => openCategoryForm()}>
                  <Icon name="plus" />
                  Ajouter
                </button>
              </div>
              <div className="panel-note">
                Ajoute, renomme et structure tes catégories directement depuis l&apos;admin.
              </div>
              <div className="table-scroll">
                <table className="atbl">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Sous-catégories</th>
                      <th>Produits</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySubcategorySummaries.map((summary) => (
                      <tr key={summary.category}>
                        <td data-label="Catégorie">
                          <div className="td-stack">
                            <strong>{summary.label}</strong>
                            <span>
                              {summary.activeSubcategories.length} sous-catégorie
                              {summary.activeSubcategories.length > 1 ? "s" : ""} active
                              {summary.activeSubcategories.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>
                        <td data-label="Sous-catégories">
                          {summary.activeSubcategories.length ? (
                            <div className="td-tags">
                              {summary.activeSubcategories.map((subcategory) => (
                                <span key={subcategory.id} className="td-chip">
                                  {subcategory.label} ({subcategory.count})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="td-muted">Aucun produit</span>
                          )}
                        </td>
                        <td data-label="Produits">{summary.count}</td>
                        <td data-label="Actions">
                          <div className="tbl-actions">
                            <button
                              type="button"
                              className="tbl-btn"
                              onClick={() => openCategoryForm(summary.category)}
                            >
                              <Icon name="edit" />
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="tbl-btn del"
                              onClick={() => deleteCategory(summary.category)}
                            >
                              <Icon name="trash" />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={cn("adm-panel", adminPanel === "settings" && "on")}>
              <div className="panel-hd">
                <h2>Paramètres</h2>
              </div>
              <div className="panel-note">
                Connexion active:
                {" "}
                {productsSource === "database" && ordersSource === "database"
                  ? "base distante"
                  : ordersSource !== "local"
                    ? "mode mixte"
                    : "mode local"}
                .
              </div>
              <div className="settings-box">
                <label className="flbl">Nom boutique</label>
                <input
                  className="finput"
                  value={settings.shopName}
                  onChange={(event) => handleSettingsChange("shopName", event.target.value)}
                />

                <label className="flbl">Signature</label>
                <input
                  className="finput"
                  value={settings.tagline}
                  onChange={(event) => handleSettingsChange("tagline", event.target.value)}
                />

                <label className="flbl">Numéro WhatsApp</label>
                <input
                  className="finput"
                  value={settings.whatsappDisplay}
                  onChange={(event) => handleSettingsChange("whatsappDisplay", event.target.value)}
                />

                <label className="flbl">Livraison Dakar (FCFA)</label>
                <input
                  className="finput"
                  type="number"
                  value={settings.shippingDakar}
                  onChange={(event) => handleSettingsChange("shippingDakar", event.target.value)}
                />

                <label className="flbl">Livraison Hors Dakar (FCFA)</label>
                <input
                  className="finput"
                  type="number"
                  value={settings.shippingOutside}
                  onChange={(event) => handleSettingsChange("shippingOutside", event.target.value)}
                />

                <label className="flbl">Instagram</label>
                <input
                  className="finput"
                  value={settings.instagramUrl}
                  onChange={(event) => handleSettingsChange("instagramUrl", event.target.value)}
                />

                <label className="flbl">Facebook</label>
                <input
                  className="finput"
                  value={settings.facebookUrl}
                  onChange={(event) => handleSettingsChange("facebookUrl", event.target.value)}
                />

                <label className="flbl">TikTok</label>
                <input
                  className="finput"
                  value={settings.tiktokUrl}
                  onChange={(event) => handleSettingsChange("tiktokUrl", event.target.value)}
                />

                <button type="button" className="btn-main full-btn" onClick={saveSettings}>
                  Enregistrer
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className={cn("pform-ov", productFormOpen && "on")} onClick={closeProductForm} />
      <div className={cn("pform", productFormOpen && "on")}>
        <div className="pform-hd">
          <h3>{editingProductId === null ? "Ajouter un produit" : "Modifier un produit"}</h3>
          <button type="button" className="mo-x" onClick={closeProductForm}>
            ✕
          </button>
        </div>

        <div className="pform-body">
          <label className="flbl">Nom du produit *</label>
          <input
            className="finput"
            placeholder="ex: Huile de Ricin"
            value={productForm.name}
            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
          />

          <div className="frow">
            <div>
              <label className="flbl">Catégorie *</label>
              <select
                className="fselect"
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((current) => {
                    const nextCategory = event.target.value;

                    return {
                      ...current,
                      category: nextCategory,
                      subcategory: resolveProductFormSubcategory(
                        nextCategory,
                        current.subcategory,
                        categorySubcategoryOptions,
                      ),
                    };
                  })
                }
              >
                {orderedCategoryEntries.map(([categoryId, label]) => (
                  <option key={categoryId} value={categoryId}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flbl">Sous-catégorie *</label>
              <select
                className="fselect"
                value={productForm.subcategory}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, subcategory: event.target.value }))
                }
              >
                {productFormSubcategoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flbl">Description</label>
          <textarea
            className="ftextarea"
            placeholder="Décrivez le produit..."
            value={productForm.description}
            onChange={(event) =>
              setProductForm((current) => ({ ...current, description: event.target.value }))
            }
          />

          <label className="flbl">Image produit</label>
          <input
            className="finput"
            placeholder="/catalog/officiel/mon-produit.jpg"
            value={productForm.image.startsWith("data:image/") ? "" : productForm.image}
            onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))}
          />
          <label className="upload-field">
            <span className="upload-btn">
              {productImageUploading ? "Import en cours..." : "Choisir une photo depuis la galerie"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleProductImageUpload}
              disabled={productImageUploading}
            />
          </label>
          <div className="upload-help">
            L&apos;image sélectionnée est optimisée automatiquement avant l&apos;enregistrement.
          </div>
          {productForm.image ? (
            <div className="upload-preview">
              <img src={productForm.image} alt="Aperçu du produit" loading="lazy" />
              <button
                type="button"
                className="upload-clear"
                onClick={() => setProductForm((current) => ({ ...current, image: "" }))}
              >
                Retirer l&apos;image
              </button>
            </div>
          ) : null}

          <div className="frow">
            <div>
              <label className="flbl">Prix (FCFA) *</label>
              <input
                className="finput"
                type="number"
                placeholder="5000"
                style={{ marginBottom: 0 }}
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, price: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="flbl">Disponibilité *</label>
              <select
                className="fselect"
                style={{ marginBottom: 0 }}
                value={productForm.availability}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, availability: event.target.value }))
                }
              >
                <option value="available">Disponible</option>
                <option value="out">Rupture de stock</option>
              </select>
            </div>
          </div>

          <div className="mo-nav form-nav">
            <button type="button" className="btn-prev" onClick={closeProductForm}>
              Annuler
            </button>
            <button type="button" className="btn-next" onClick={saveProduct}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className={cn("pform-ov", categoryFormOpen && "on")} onClick={closeCategoryForm} />
      <div className={cn("pform", categoryFormOpen && "on")}>
        <div className="pform-hd">
          <h3>{editingCategoryId === null ? "Ajouter une catégorie" : "Modifier une catégorie"}</h3>
          <button type="button" className="mo-x" onClick={closeCategoryForm}>
            ✕
          </button>
        </div>

        <div className="pform-body">
          <label className="flbl">Nom de la catégorie *</label>
          <input
            className="finput"
            placeholder="ex: Hygiène intime"
            value={categoryForm.name}
            onChange={(event) =>
              setCategoryForm((current) => ({ ...current, name: event.target.value }))
            }
          />

          <label className="flbl">Sous-catégories *</label>
          <div className="category-form-help">
            Tu peux renommer les sous-catégories existantes et en ajouter de nouvelles.
          </div>
          <div className="category-subcategory-list">
            {categoryForm.subcategories.map((subcategory, index) => (
              <div key={`${subcategory.id || "new"}-${index}`} className="category-subcategory-row">
                <input
                  className="finput"
                  placeholder="ex: Gel intime"
                  value={subcategory.label}
                  onChange={(event) => handleCategorySubcategoryChange(index, event.target.value)}
                />
                <button
                  type="button"
                  className="tbl-btn del category-subcategory-remove"
                  onClick={() => removeCategorySubcategoryField(index)}
                >
                  <Icon name="trash" />
                  Retirer
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-add category-subcategory-add"
            onClick={addCategorySubcategoryField}
          >
            <Icon name="plus" />
            Ajouter une sous-catégorie
          </button>

          <div className="mo-nav form-nav">
            <button type="button" className="btn-prev" onClick={closeCategoryForm}>
              Annuler
            </button>
            <button type="button" className="btn-next" onClick={saveCategory}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className={cn("toast", toastMessage && "on")}>{toastMessage}</div>
    </>
  );
}

function OrderCard({ order, onUpdateStatus, withActions }) {
  return (
    <div className="order-card">
      <div className="oc-hd">
        <span className="oc-id">{order.id}</span>
        <span className="oc-date">{order.date}</span>
        <span className={cn("oc-status", `st-${order.status}`)}>
          {order.status === "new" ? "En attente" : order.status === "done" ? "Livré" : "Annulé"}
        </span>
      </div>
      <div className="oc-body">
        <div className="oc-field">
          <strong>Client</strong>
          <span>{order.nom}</span>
        </div>
        <div className="oc-field">
          <strong>Téléphone</strong>
          <span>{order.tel}</span>
        </div>
        <div className="oc-field">
          <strong>Paiement</strong>
          <span>{order.pm}</span>
        </div>
      </div>
      <div className="oc-items">
        {order.items.map((item) => (
          <div key={`${order.id}-${item.id}`} className="oc-item">
            • {item.n} ×{item.qty}
          </div>
        ))}
      </div>
      <div className="oc-total">
        <span>Total</span>
        <strong>{formatPrice(order.total)} FCFA</strong>
      </div>
      {withActions && order.status === "new" ? (
        <div className="oc-actions">
          <button type="button" className="oc-btn confirm" onClick={() => onUpdateStatus(order.id, "done")}>
            Marquer livrée
          </button>
          <button type="button" className="oc-btn cancel" onClick={() => onUpdateStatus(order.id, "cancel")}>
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  );
}
