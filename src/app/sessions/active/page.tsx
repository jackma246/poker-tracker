"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  location: string;
  blinds: string;
  buyIn: number;
  cashOut: number | null;
  tips: number;
  rebuys: number[];
  startTime: string;
  notes: string | null;
  isActive: boolean;
}

function formatDuration(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ActiveSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState("00:00:00");

  // Rebuy modal state
  const [showRebuy, setShowRebuy] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState("");
  const [rebuyLoading, setRebuyLoading] = useState(false);

  // End session modal state
  const [showEndSession, setShowEndSession] = useState(false);
  const [cashOut, setCashOut] = useState("");
  const [tips, setTips] = useState("");
  const [endLoading, setEndLoading] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch("/api/sessions/active");
    const data = await res.json();
    if (data && data.id) {
      setSession(data);
    } else {
      router.push("/sessions");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setDuration(formatDuration(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function handleRebuy() {
    if (!rebuyAmount || !session) return;
    setRebuyLoading(true);

    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addRebuy: parseFloat(rebuyAmount) }),
    });

    await fetchSession();
    setShowRebuy(false);
    setRebuyAmount("");
    setRebuyLoading(false);
  }

  async function handleEndSession() {
    if (!cashOut || !session) return;
    setEndLoading(true);

    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cashOut: parseFloat(cashOut),
        tips: parseFloat(tips) || 0,
      }),
    });

    router.push(`/sessions/${session.id}`);
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

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Session Info */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">{session.location}</h1>
        <div className="text-[var(--muted)]">{session.blinds}</div>
      </div>

      {/* Timer */}
      <div className="card text-center">
        <div className="text-4xl font-mono font-bold">{duration}</div>
        <div className="text-sm text-[var(--muted)]">Session Duration</div>
      </div>

      {/* Money Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="stat-value">${session.buyIn}</div>
          <div className="stat-label">Initial Buy-in</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${totalIn}</div>
          <div className="stat-label">Total In</div>
        </div>
      </div>

      {/* Rebuys List */}
      {session.rebuys.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-2">Rebuys</h3>
          <div className="space-y-1">
            {session.rebuys.map((rebuy, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Rebuy #{i + 1}</span>
                <span>${rebuy}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowRebuy(true)}
          className="btn btn-secondary"
        >
          Add Rebuy
        </button>
        <button
          onClick={() => setShowEndSession(true)}
          className="btn btn-danger"
        >
          End Session
        </button>
      </div>

      {/* Rebuy Modal */}
      {showRebuy && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add Rebuy</h2>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                $
              </span>
              <input
                type="number"
                value={rebuyAmount}
                onChange={(e) => setRebuyAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="pl-8"
                inputMode="numeric"
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRebuy(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRebuy}
                disabled={rebuyLoading || !rebuyAmount}
                className="btn btn-primary flex-1"
              >
                {rebuyLoading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndSession && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">End Session</h2>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm mb-2">Cash Out Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    $
                  </span>
                  <input
                    type="number"
                    value={cashOut}
                    onChange={(e) => setCashOut(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="pl-8"
                    inputMode="numeric"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Tips (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                    $
                  </span>
                  <input
                    type="number"
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="pl-8"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {cashOut && (
                <div className="card bg-[var(--background)]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--muted)]">Total In:</span>
                    <span>${totalIn}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--muted)]">Cash Out:</span>
                    <span>${cashOut}</span>
                  </div>
                  {tips && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Tips:</span>
                      <span>-${tips}</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--card-border)] mt-2 pt-2 flex justify-between font-bold">
                    <span>Profit/Loss:</span>
                    <span
                      className={
                        parseFloat(cashOut) - totalIn - (parseFloat(tips) || 0) >= 0
                          ? "profit"
                          : "loss"
                      }
                    >
                      {parseFloat(cashOut) - totalIn - (parseFloat(tips) || 0) >= 0
                        ? "+"
                        : ""}
                      ${(parseFloat(cashOut) - totalIn - (parseFloat(tips) || 0)).toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowEndSession(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={endLoading || !cashOut}
                className="btn btn-danger flex-1"
              >
                {endLoading ? "Ending..." : "End Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
