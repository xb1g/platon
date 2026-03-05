export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session {id}</h1>
      <p>Session details and reflection will appear here.</p>
    </main>
  );
}
