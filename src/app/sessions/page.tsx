"use client";

import { useEffect, useState } from "react";
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
  isActive: boolean;
}

function formatCurrency(amount: number): string {
  const prefix = amount >= 0 ? "+$" : "-$";
  return prefix + Math.abs(amount).toFixed(0);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.round((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function calculateProfit(session: Session): number {
  const totalIn = session.buyIn + session.rebuys.reduce((a, b) => a + b, 0);
  return (session.cashOut || 0) - totalIn - session.tips;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
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

  const activeSessions = sessions.filter((s) => s.isActive);
  const completedSessions = sessions.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <div className="flex gap-2">
          <Link href="/sessions/import" className="btn btn-secondary">
            Add Past
          </Link>
          {activeSessions.length === 0 && (
            <Link href="/sessions/new" className="btn btn-primary">
              New Session
            </Link>
          )}
        </div>
      </div>

      {/* Active Session */}
      {activeSessions.map((session) => (
        <Link
          key={session.id}
          href="/sessions/active"
          className="block card bg-[var(--primary)]/10 border-[var(--primary)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--primary)] font-medium">
                Active Session
              </div>
              <div className="font-bold">{session.location}</div>
              <div className="text-sm text-[var(--muted)]">{session.blinds}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--muted)]">Total In</div>
              <div className="font-bold">
                ${session.buyIn + session.rebuys.reduce((a, b) => a + b, 0)}
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* Completed Sessions */}
      {completedSessions.length === 0 && activeSessions.length === 0 && (
        <div className="card text-center py-8">
          <div className="text-[var(--muted)] mb-4">No sessions yet</div>
          <Link href="/sessions/new" className="btn btn-primary">
            Start Your First Session
          </Link>
        </div>
      )}

      {completedSessions.map((session) => {
        const profit = calculateProfit(session);
        return (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="block card hover:border-[var(--muted)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{session.location}</div>
                <div className="text-sm text-[var(--muted)]">
                  {session.blinds} • {formatDate(session.startTime)} •{" "}
                  {formatDuration(session.startTime, session.endTime)}
                </div>
              </div>
              <div className={`text-xl font-bold ${profit >= 0 ? "profit" : "loss"}`}>
                {formatCurrency(profit)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
