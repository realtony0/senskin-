import "./globals.css";

export const metadata = {
  title: "SKIN'S — Global Routine for Everyone",
  description:
    "SKIN'S, boutique de soins et d'hygiene. Catalogue structure, commande simple et livraison partout au Senegal.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
