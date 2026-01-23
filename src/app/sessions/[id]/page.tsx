"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Session {
  id: string;
  location: string;
  blinds: string;
  buyIn: number;
  cashOut: number | null;
  tips: number;
  rebuys: number[];
  startTime: string;
  endTime: string | null;
  notes: string | null;
  isActive: boolean;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.round((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/sessions");
        } else {
          setSession(data);
        }
        setLoading(false);
      });
  }, [id, router]);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/sessions");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalIn = session.buyIn + session.rebuys.reduce((a, b) => a + b, 0);
  const profit = (session.cashOut || 0) - totalIn - session.tips;
  const durationMs = session.endTime
    ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
    : 0;
  const hours = durationMs / (1000 * 60 * 60);
  const hourlyRate = hours > 0 ? profit / hours : 0;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        href="/sessions"
        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
      >
        ← Back to Sessions
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{session.location}</h1>
        <div className="text-[var(--muted)]">
          {session.blinds} • {formatDate(session.startTime)}
        </div>
      </div>

      {/* Profit Card */}
      <div className="card text-center">
        <div className={`text-4xl font-bold ${profit >= 0 ? "profit" : "loss"}`}>
          {profit >= 0 ? "+" : ""}${profit.toFixed(0)}
        </div>
        <div className="text-[var(--muted)]">
          {hourlyRate >= 0 ? "+" : ""}${hourlyRate.toFixed(2)}/hr
        </div>
      </div>

      {/* Details */}
      <div className="card space-y-3">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Duration</span>
          <span>{formatDuration(session.startTime, session.endTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Time</span>
          <span>
            {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : "Now"}
          </span>
        </div>
        <div className="border-t border-[var(--card-border)] my-2"></div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Buy-in</span>
          <span>${session.buyIn}</span>
        </div>
        {session.rebuys.length > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">
              Rebuys ({session.rebuys.length})
            </span>
            <span>${session.rebuys.reduce((a, b) => a + b, 0)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span className="text-[var(--muted)]">Total In</span>
          <span>${totalIn}</span>
        </div>
        <div className="border-t border-[var(--card-border)] my-2"></div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Cash Out</span>
          <span>${session.cashOut || 0}</span>
        </div>
        {session.tips > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Tips</span>
            <span>-${session.tips}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="card">
          <h3 className="font-bold mb-2">Notes</h3>
          <p className="text-[var(--muted)]">{session.notes}</p>
        </div>
      )}

      {/* Delete Button */}
      <button
        onClick={() => setShowDelete(true)}
        className="btn btn-secondary w-full text-[var(--danger)]"
      >
        Delete Session
      </button>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">Delete Session?</h2>
            <p className="text-[var(--muted)] mb-4">
              This action cannot be undone.
            </p>
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
    </div>
  );
}
