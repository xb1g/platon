import "./globals.css";

export const metadata = {
  title: "Platon — Agent Memory Platform",
  description: "Make Your AI Learn From Mistakes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7679/ingest/fbe5c566-2dc0-4951-95c4-5ea3a8ba181a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc9466",
      },
      body: JSON.stringify({
        sessionId: "dc9466",
        runId: "run2",
        hypothesisId: "H3",
        location: "apps/web/app/layout.tsx:RootLayout",
        message: "RootLayout rendered",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
