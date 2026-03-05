import { Sidebar } from "@/components/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="ml-[240px] min-h-screen transition-[margin] duration-200">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </>
  );
}
