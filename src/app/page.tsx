import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4">Poker Tracker</h1>
        <p className="text-[var(--muted)] mb-8">
          Track your sessions, analyze your game, improve your winrate.
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/login" className="btn btn-primary text-center">
            Sign In
          </Link>
          <Link href="/register" className="btn btn-secondary text-center">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
