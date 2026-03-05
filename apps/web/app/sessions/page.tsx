import Link from 'next/link';

export default function SessionsPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>
      <ul className="space-y-2">
        <li>
          <Link href="/sessions/1" className="text-blue-500 hover:underline">
            Session 1
          </Link>
        </li>
      </ul>
    </main>
  );
}
