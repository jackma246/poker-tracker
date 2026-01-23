"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ProfitOverTimeChart = dynamic(
  () => import("@/components/Charts").then((mod) => mod.ProfitOverTimeChart),
  { ssr: false }
);

const ProfitByLocationChart = dynamic(
  () => import("@/components/Charts").then((mod) => mod.ProfitByLocationChart),
  { ssr: false }
);

interface Stats {
  totalSessions: number;
  totalProfit: number;
  totalHours: number;
  winRate: number;
  bestSession: { id: string; date: string; location: string; profit: number } | null;
  worstSession: { id: string; date: string; location: string; profit: number } | null;
  winningSessionsCount: number;
  losingSessionsCount: number;
  profitByLocation: Record<string, number>;
  profitOverTime: Array<{ date: string; profit: number; cumulative: number }>;
}

interface ActiveSession {
  id: string;
  location: string;
  blinds: string;
  buyIn: number;
  rebuys: number[];
  startTime: string;
}

function formatCurrency(amount: number): string {
  const prefix = amount >= 0 ? "+$" : "-$";
  return prefix + Math.abs(amount).toFixed(0);
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/sessions/active").then((r) => r.json()),
    ]).then(([statsData, activeData]) => {
      setStats(statsData);
      setActiveSession(activeData);
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

  const locationData = stats?.profitByLocation
    ? Object.entries(stats.profitByLocation).map(([name, profit]) => ({
        name,
        profit,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Active Session Banner */}
      {activeSession && (
        <Link
          href={`/sessions/active`}
          className="block card bg-[var(--primary)]/10 border-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--primary)] font-medium">
                Active Session
              </div>
              <div className="font-bold">
                {activeSession.location} - {activeSession.blinds}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--muted)]">Total In</div>
              <div className="font-bold">
                ${activeSession.buyIn + activeSession.rebuys.reduce((a, b) => a + b, 0)}
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Start Session Button */}
      {!activeSession && (
        <Link href="/sessions/new" className="btn btn-primary w-full text-center block">
          Start New Session
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className={`stat-value ${stats?.totalProfit && stats.totalProfit >= 0 ? "profit" : "loss"}`}>
            {stats ? formatCurrency(stats.totalProfit) : "$0"}
          </div>
          <div className="stat-label">Total Profit</div>
        </div>

        <div className="stat-card">
          <div className={`stat-value ${stats?.winRate && stats.winRate >= 0 ? "profit" : "loss"}`}>
            {stats ? formatCurrency(stats.winRate) : "$0"}/hr
          </div>
          <div className="stat-label">Win Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats?.totalSessions || 0}</div>
          <div className="stat-label">Sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats ? formatHours(stats.totalHours) : "0h"}</div>
          <div className="stat-label">Hours Played</div>
        </div>
      </div>

      {/* Win/Loss Record */}
      {stats && stats.totalSessions > 0 && (
        <div className="card">
          <h3 className="font-bold mb-2">Record</h3>
          <div className="flex items-center gap-4">
            <span className="profit">{stats.winningSessionsCount}W</span>
            <span className="text-[var(--muted)]">-</span>
            <span className="loss">{stats.losingSessionsCount}L</span>
            <span className="text-[var(--muted)] text-sm">
              ({((stats.winningSessionsCount / stats.totalSessions) * 100).toFixed(0)}% win rate)
            </span>
          </div>
        </div>
      )}

      {/* Profit Over Time Chart */}
      {stats && stats.profitOverTime.length > 1 && (
        <ProfitOverTimeChart data={stats.profitOverTime} />
      )}

      {/* Profit by Location */}
      {locationData.length > 0 && (
        <ProfitByLocationChart data={locationData} />
      )}

      {/* Empty State */}
      {stats && stats.totalSessions === 0 && (
        <div className="card text-center py-8">
          <div className="text-[var(--muted)] mb-4">
            No completed sessions yet. Start tracking your game!
          </div>
        </div>
      )}
    </div>
  );
}
