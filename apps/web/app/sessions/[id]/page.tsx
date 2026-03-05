export default function SessionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Session {params.id}</h1>
      <p>Session details and reflection will appear here.</p>
    </main>
  );
}
