"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMMON_BLINDS = ["1/2", "1/3", "2/5", "5/10"];
const COMMON_LOCATIONS = ["Home Game", "Casino"];

export default function ImportSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [blinds, setBlinds] = useState("");
  const [customBlinds, setCustomBlinds] = useState("");
  const [buyIn, setBuyIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [tips, setTips] = useState("");
  const [rebuysText, setRebuysText] = useState("");
  const [notes, setNotes] = useState("");

  const effectiveLocation = location === "custom" ? customLocation : location;
  const effectiveBlinds = blinds === "custom" ? customBlinds : blinds;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !startTime || !endTime || !effectiveLocation || !effectiveBlinds || !buyIn || !cashOut) {
      setError("Please fill in all required fields");
      return;
    }

    // Parse rebuys from comma-separated string
    const rebuys = rebuysText
      .split(",")
      .map((r) => parseFloat(r.trim()))
      .filter((r) => !isNaN(r) && r > 0);

    // Construct start and end timestamps
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // Handle sessions that go past midnight
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sessions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: effectiveLocation,
          blinds: effectiveBlinds,
          buyIn: parseFloat(buyIn),
          cashOut: parseFloat(cashOut),
          tips: parseFloat(tips) || 0,
          rebuys,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to import session");
        setLoading(false);
        return;
      }

      router.push("/sessions");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  // Calculate profit preview
  const totalIn = (parseFloat(buyIn) || 0) +
    rebuysText.split(",").map(r => parseFloat(r.trim()) || 0).reduce((a, b) => a + b, 0);
  const profit = (parseFloat(cashOut) || 0) - totalIn - (parseFloat(tips) || 0);

  return (
    <div className="max-w-md mx-auto">
      <Link
        href="/sessions"
        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
      >
        ← Back to Sessions
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-6">Add Past Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Date & Time */}
        <div>
          <label className="block text-sm mb-2">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Start Time *</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-2">End Time *</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm mb-2">Location *</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  location === loc
                    ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                    : "border-[var(--card-border)] hover:border-[var(--muted)]"
                }`}
              >
                {loc}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLocation("custom")}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                location === "custom"
                  ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                  : "border-[var(--card-border)] hover:border-[var(--muted)]"
              }`}
            >
              Other
            </button>
          </div>
          {location === "custom" && (
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Enter location"
            />
          )}
        </div>

        {/* Blinds */}
        <div>
          <label className="block text-sm mb-2">Blinds *</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_BLINDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBlinds(b)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  blinds === b
                    ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                    : "border-[var(--card-border)] hover:border-[var(--muted)]"
                }`}
              >
                {b}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBlinds("custom")}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                blinds === "custom"
                  ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                  : "border-[var(--card-border)] hover:border-[var(--muted)]"
              }`}
            >
              Other
            </button>
          </div>
          {blinds === "custom" && (
            <input
              type="text"
              value={customBlinds}
              onChange={(e) => setCustomBlinds(e.target.value)}
              placeholder="e.g., 2/3/5"
            />
          )}
        </div>

        {/* Money Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Buy-in *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value)}
                placeholder="0"
                min="0"
                className="pl-8"
                inputMode="numeric"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">Cash Out *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
              <input
                type="number"
                value={cashOut}
                onChange={(e) => setCashOut(e.target.value)}
                placeholder="0"
                min="0"
                className="pl-8"
                inputMode="numeric"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Tips</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
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
          <div>
            <label className="block text-sm mb-2">Rebuys</label>
            <input
              type="text"
              value={rebuysText}
              onChange={(e) => setRebuysText(e.target.value)}
              placeholder="100, 200"
            />
            <div className="text-xs text-[var(--muted)] mt-1">Comma-separated</div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this session..."
            rows={3}
          />
        </div>

        {/* Profit Preview */}
        {buyIn && cashOut && (
          <div className="card bg-[var(--background)]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)]">Profit/Loss:</span>
              <span className={`text-xl font-bold ${profit >= 0 ? "profit" : "loss"}`}>
                {profit >= 0 ? "+" : ""}${profit.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? "Saving..." : "Save Session"}
        </button>
      </form>
    </div>
  );
}
