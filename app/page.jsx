import { MMB_WHATSAPP_LINK } from "@/lib/site";

export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fdfbf7 0%, #efe8da 100%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "48px 36px",
          boxShadow: "0 4px 24px rgba(123,79,46,0.1)",
          border: "1px solid #e5ddd0",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛠️</div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "32px",
            color: "#7b4f2e",
            marginBottom: "12px",
            fontWeight: 600,
          }}
        >
          SKIN&apos;S
        </h1>
        <h2
          style={{
            fontSize: "20px",
            color: "#2e2318",
            marginBottom: "16px",
            fontWeight: 500,
          }}
        >
          Site en maintenance
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "#5c4a38",
            lineHeight: 1.7,
            marginBottom: "32px",
          }}
        >
          Nous effectuons actuellement une mise à jour pour vous offrir une
          meilleure expérience. Le site sera de retour très bientôt.
        </p>
        <a
          href={MMB_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#25d366",
            color: "#ffffff",
            padding: "12px 28px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Contactez-nous sur WhatsApp
        </a>
        <p
          style={{
            marginTop: "24px",
            fontSize: "13px",
            color: "#9a8878",
          }}
        >
          Merci de votre patience
        </p>
      </div>
    </div>
  );
}
