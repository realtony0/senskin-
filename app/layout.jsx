import "./globals.css";
import {
  getSiteUrl,
  MMB_WHATSAPP_LINK,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
} from "@/lib/site";

const siteUrl = getSiteUrl();
const metadataBase = new URL(siteUrl);
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: siteUrl,
  areaServed: "SN",
  availableLanguage: ["fr"],
  brand: {
    "@type": "Brand",
    name: SITE_NAME,
  },
  creator: {
    "@type": "Person",
    name: "Mmb",
    url: MMB_WHATSAPP_LINK,
  },
};

export const metadata = {
  metadataBase,
  title: {
    default: `${SITE_NAME} — Global Routine for Everyone`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  category: "beauty",
  classification: "Boutique e-commerce beauté et hygiène",
  authors: [
    {
      name: "Mmb",
      url: MMB_WHATSAPP_LINK,
    },
  ],
  creator: "Mmb",
  publisher: SITE_NAME,
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_SN",
    url: "/",
    title: `${SITE_NAME} — Global Routine for Everyone`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Global Routine for Everyone`,
    description: SITE_DESCRIPTION,
    images: ["/icon.svg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7b4f2e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
