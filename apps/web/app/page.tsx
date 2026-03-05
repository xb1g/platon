import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Agent Memory Platform</h1>
      <div className="flex gap-4">
        <Link href="/sessions" className="text-blue-500 hover:underline">
          View Sessions
        </Link>
        <Link href="/learnings" className="text-blue-500 hover:underline">
          View Learnings
        </Link>
      </div>
    </main>
  );
}
