// Once you've synced DevLink components, import them from "@/webflow/*"
// import { ComponentName } from "@/webflow/ComponentName";

export default function Home() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="container">
        <div
          style={{
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              background: "linear-gradient(83.21deg, #3245ff 0%, #bc52ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Welcome to Webflow Cloud
          </h1>
          <p style={{ marginBottom: "1.5rem" }}>
            Your Next.js project is ready. Start building and sync your Webflow
            components and design system.
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <a
              href="https://developers.webflow.com/webflow-cloud/getting-started"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: "4px",
                background: "#146ef5",
                color: "#ffffff",
                textDecoration: "none",
                boxShadow:
                  "0px 0.5px 1px rgba(0, 0, 0, 0.25), inset 0px 29px 23px -16px rgba(255, 255, 255, 0.04), inset 0px 0.5px 0.5px rgba(255, 255, 255, 0.2)",
              }}
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
