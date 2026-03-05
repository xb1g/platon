import "./globals.css";

export const metadata = {
  title: "Platon — Agent Memory Platform",
  description: "AI Agents for Memory Optimization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
