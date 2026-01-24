"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CardDisplay } from "@/components/CardPicker";
import HandReplayer from "@/components/HandReplayer";

interface Action {
  player: string;
  action: string;
  amount?: number;
}

interface Villain {
  name: string;
  cards: string[];
  position: string | null;
}

interface Hand {
  id: string;
  heroCards: string[];
  heroPosition: string;
  blinds: string;
  tableSize: number;
  playerCount: number;
  flop: string[];
  turn: string | null;
  river: string | null;
  villains: Villain[] | null;
  preflopAction: Action[] | null;
  flopAction: Action[] | null;
  turnAction: Action[] | null;
  riverAction: Action[] | null;
  result: string;
  profit: number;
  potSize: number | null;
  title: string | null;
  notes: string | null;
  playedAt: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ActionList({ actions, street }: { actions: Action[] | null; street: string }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-[var(--muted)] mb-2">{street}</h4>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => (
          <div
            key={i}
            className="flex items-center gap-1 bg-[var(--background)] rounded-lg px-2 py-1 text-sm"
          >
            <span className="capitalize">{action.player}</span>
            <span
              className={`font-bold ${
                action.action === "fold"
                  ? "text-[var(--danger)]"
                  : action.action === "raise" || action.action === "all-in"
                  ? "text-yellow-500"
                  : "text-[var(--primary)]"
              }`}
            >
              {action.action}
            </span>
            {action.amount && <span>${action.amount}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [hand, setHand] = useState<Hand | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReplayer, setShowReplayer] = useState(false);

  useEffect(() => {
    fetch(`/api/hands/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/hands");
        } else {
          setHand(data);
        }
        setLoading(false);
      });
  }, [id, router]);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/hands/${id}`, { method: "DELETE" });
    router.push("/hands");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  if (!hand) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/hands"
        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
      >
        ← Back to Hands
      </Link>

      {/* Header */}
      <div>
        {hand.title && <h1 className="text-2xl font-bold mb-1">{hand.title}</h1>}
        <div className="text-[var(--muted)]">
          {hand.blinds} {hand.tableSize}-max • {formatDate(hand.playedAt)}
        </div>
      </div>

      {/* Result card */}
      <div
        className={`card text-center ${
          hand.result === "won"
            ? "bg-[var(--primary)]/10 border-[var(--primary)]"
            : hand.result === "lost"
            ? "bg-[var(--danger)]/10 border-[var(--danger)]"
            : ""
        }`}
      >
        <div
          className={`text-3xl font-bold ${
            hand.result === "won" ? "profit" : hand.result === "lost" ? "loss" : ""
          }`}
        >
          {hand.profit >= 0 ? "+" : ""}${hand.profit}
        </div>
        <div className="text-[var(--muted)]">
          {hand.result.toUpperCase()}
          {hand.potSize && ` • Pot: $${hand.potSize}`}
        </div>
      </div>

      {/* Replay button */}
      <button
        onClick={() => setShowReplayer(true)}
        className="btn btn-primary w-full"
      >
        Replay Hand
      </button>

      {/* Hero Info */}
      <div className="card">
        <h3 className="font-bold mb-3">Hero</h3>
        <div className="flex items-center gap-4">
          <CardDisplay cards={hand.heroCards} size="md" />
          <div>
            <div className="font-medium">{hand.heroPosition}</div>
            <div className="text-sm text-[var(--muted)]">Position</div>
          </div>
        </div>
      </div>

      {/* Board */}
      {hand.flop.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">Board</h3>
          <div className="flex items-center gap-2">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Flop</div>
              <CardDisplay cards={hand.flop} size="md" />
            </div>
            {hand.turn && (
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Turn</div>
                <CardDisplay cards={[hand.turn]} size="md" />
              </div>
            )}
            {hand.river && (
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">River</div>
                <CardDisplay cards={[hand.river]} size="md" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Villains */}
      {hand.villains && hand.villains.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">
            {hand.villains.length === 1 ? "Villain" : "Villains"}
          </h3>
          <div className="space-y-3">
            {hand.villains.map((villain, i) => (
              <div key={i} className="flex items-center gap-4">
                <CardDisplay cards={villain.cards} size="md" />
                <div>
                  <div className="font-medium">
                    {villain.name}
                    {villain.position && ` (${villain.position})`}
                  </div>
                  {villain.position && (
                    <div className="text-sm text-[var(--muted)]">Position</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      {(hand.preflopAction || hand.flopAction || hand.turnAction || hand.riverAction) && (
        <div className="card">
          <h3 className="font-bold mb-3">Action</h3>
          <ActionList actions={hand.preflopAction} street="Preflop" />
          <ActionList actions={hand.flopAction} street="Flop" />
          <ActionList actions={hand.turnAction} street="Turn" />
          <ActionList actions={hand.riverAction} street="River" />
        </div>
      )}

      {/* Notes */}
      {hand.notes && (
        <div className="card">
          <h3 className="font-bold mb-2">Notes</h3>
          <p className="text-[var(--muted)] whitespace-pre-wrap">{hand.notes}</p>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => setShowDelete(true)}
        className="btn btn-secondary w-full text-[var(--danger)]"
      >
        Delete Hand
      </button>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Delete Hand?</h2>
            <p className="text-[var(--muted)] mb-4">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDelete(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-danger flex-1"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hand Replayer */}
      {showReplayer && (
        <HandReplayer hand={hand} onClose={() => setShowReplayer(false)} />
      )}
    </div>
  );
}
