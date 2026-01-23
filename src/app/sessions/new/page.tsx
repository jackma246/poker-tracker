"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMMON_BLINDS = ["1/2", "1/3", "2/5", "5/10"];
const COMMON_LOCATIONS = ["Home Game", "Casino"];

export default function NewSessionPage() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [blinds, setBlinds] = useState("");
  const [customBlinds, setCustomBlinds] = useState("");
  const [buyIn, setBuyIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveLocation = location === "custom" ? customLocation : location;
  const effectiveBlinds = blinds === "custom" ? customBlinds : blinds;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!effectiveLocation || !effectiveBlinds || !buyIn) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: effectiveLocation,
          blinds: effectiveBlinds,
          buyIn: parseFloat(buyIn),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create session");
        setLoading(false);
        return;
      }

      router.push("/sessions/active");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Start Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Location */}
        <div>
          <label className="block text-sm mb-2">Location</label>
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
              autoFocus
            />
          )}
        </div>

        {/* Blinds */}
        <div>
          <label className="block text-sm mb-2">Blinds</label>
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
              autoFocus
            />
          )}
        </div>

        {/* Buy-in */}
        <div>
          <label htmlFor="buyIn" className="block text-sm mb-2">
            Buy-in Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              $
            </span>
            <input
              id="buyIn"
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="pl-8"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? "Starting..." : "Start Session"}
        </button>
      </form>
    </div>
  );
}
