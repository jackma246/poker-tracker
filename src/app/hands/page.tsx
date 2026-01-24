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
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hand History</h1>
        <Link href="/hands/new" className="btn btn-primary">
          + New
        </Link>
      </div>

      {/* Stats summary */}
      {hands.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <div className="stat-value">{hands.length}</div>
            <div className="stat-label">Hands</div>
          </div>
          <div className="stat-card">
            <div className="stat-value profit">
              {hands.filter((h) => h.result === "won").length}
            </div>
            <div className="stat-label">Won</div>
          </div>
          <div className="stat-card">
            <div className="stat-value loss">
              {hands.filter((h) => h.result === "lost").length}
            </div>
            <div className="stat-label">Lost</div>
          </div>
        </div>
      )}

      {/* Hand list */}
      {hands.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-[var(--muted)] mb-4">No hands recorded yet</div>
          <Link href="/hands/new" className="btn btn-primary">
            Record Your First Hand
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {hands.map((hand) => (
            <Link
              key={hand.id}
              href={`/hands/${hand.id}`}
              className="block card card-hover transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Cards */}
                <div className="flex-shrink-0">
                  <CardDisplay cards={hand.heroCards} size="md" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{hand.heroPosition}</span>
                    <span className="text-xs text-[var(--muted)]">{hand.blinds}</span>
                    {hand.title && (
                      <span className="text-xs text-[var(--foreground)] truncate">
                        • {hand.title}
                      </span>
                    )}
                  </div>

                  {/* Board */}
                  {hand.flop.length > 0 && (
                    <div className="flex items-center gap-1">
                      <CardDisplay cards={hand.flop} size="sm" />
                      {hand.turn && <CardDisplay cards={[hand.turn]} size="sm" />}
                      {hand.river && <CardDisplay cards={[hand.river]} size="sm" />}
                    </div>
                  )}

                  <div className="text-xs text-[var(--muted)] mt-1">
                    {formatDate(hand.playedAt)}
                  </div>
                </div>

                {/* Result */}
                <div className="flex-shrink-0 text-right">
                  <div
                    className={`text-lg font-semibold ${
                      hand.profit > 0 ? "profit" : hand.profit < 0 ? "loss" : ""
                    }`}
                  >
                    {hand.profit >= 0 ? "+" : ""}${hand.profit}
                  </div>
                  <span className={`badge badge-${hand.result}`}>
                    {hand.result}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
