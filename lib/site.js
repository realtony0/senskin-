export const SITE_NAME = "SKIN'S";
export const SITE_DESCRIPTION =
  "SKIN'S, boutique de soins et d'hygiène au Sénégal. Catalogue structuré, commande simple et livraison rapide.";
export const SITE_KEYWORDS = [
  "soins",
  "beauté",
  "hygiène",
  "cosmétiques",
  "boutique en ligne",
  "Sénégal",
  "Dakar",
  "WhatsApp",
  "soin du corps",
  "soin du visage",
];
export const SITE_DEFAULT_URL = "http://localhost:3000";
export const MMB_WHATSAPP_LINK = "https://wa.me/221774992742";

function normalizeSiteUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return SITE_DEFAULT_URL;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return SITE_DEFAULT_URL;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || SITE_DEFAULT_URL);
}
