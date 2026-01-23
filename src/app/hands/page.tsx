"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CardDisplay } from "@/components/CardPicker";

interface Hand {
  id: string;
  heroCards: string[];
  heroPosition: string;
  blinds: string;
  flop: string[];
  turn: string | null;
  river: string | null;
  villainCards: string[];
  result: string;
  profit: number;
  potSize: number | null;
  title: string | null;
  playedAt: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function HandsPage() {
  const [hands, setHands] = useState<Hand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hands")
      .then((r) => r.json())
      .then((data) => {
        setHands(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hand History</h1>
        <Link href="/hands/new" className="btn btn-primary">
          Record Hand
        </Link>
      </div>

      {hands.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-[var(--muted)] mb-4">No hands recorded yet</div>
          <Link href="/hands/new" className="btn btn-primary">
            Record Your First Hand
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {hands.map((hand) => (
            <Link
              key={hand.id}
              href={`/hands/${hand.id}`}
              className="block card hover:border-[var(--muted)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title or cards */}
                  <div className="flex items-center gap-3 mb-2">
                    <CardDisplay cards={hand.heroCards} size="md" />
                    <span className="text-sm text-[var(--muted)]">{hand.heroPosition}</span>
                  </div>

                  {/* Board */}
                  {hand.flop.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <CardDisplay cards={hand.flop} />
                      {hand.turn && <CardDisplay cards={[hand.turn]} />}
                      {hand.river && <CardDisplay cards={[hand.river]} />}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="text-sm text-[var(--muted)]">
                    {hand.title && <span className="text-[var(--foreground)]">{hand.title} • </span>}
                    {hand.blinds} • {formatDate(hand.playedAt)}
                  </div>
                </div>

                {/* Result */}
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      hand.result === "won" ? "profit" : hand.result === "lost" ? "loss" : ""
                    }`}
                  >
                    {hand.profit >= 0 ? "+" : ""}${hand.profit}
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      hand.result === "won"
                        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                        : hand.result === "lost"
                        ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                        : "bg-[var(--muted)]/20 text-[var(--muted)]"
                    }`}
                  >
                    {hand.result.toUpperCase()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
