"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardPicker from "@/components/CardPicker";
import PositionPicker from "@/components/PositionPicker";
import ActionBuilder, { Action } from "@/components/ActionBuilder";

const BLINDS_OPTIONS = ["1/2", "1/3", "2/5", "5/10"];
const RESULTS = [
  { id: "won", label: "Won", color: "var(--primary)" },
  { id: "lost", label: "Lost", color: "var(--danger)" },
  { id: "split", label: "Split", color: "var(--muted)" },
];

export default function NewHandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form state
  const [heroCards, setHeroCards] = useState<string[]>([]);
  const [heroPosition, setHeroPosition] = useState("");
  const [blinds, setBlinds] = useState("1/2");
  const [tableSize, setTableSize] = useState<6 | 9>(9);

  const [flop, setFlop] = useState<string[]>([]);
  const [turn, setTurn] = useState<string[]>([]);
  const [river, setRiver] = useState<string[]>([]);

  const [villainCards, setVillainCards] = useState<string[]>([]);
  const [villainPosition, setVillainPosition] = useState("");

  const [preflopAction, setPreflopAction] = useState<Action[]>([]);
  const [flopAction, setFlopAction] = useState<Action[]>([]);
  const [turnAction, setTurnAction] = useState<Action[]>([]);
  const [riverAction, setRiverAction] = useState<Action[]>([]);

  const [result, setResult] = useState("won");
  const [potSize, setPotSize] = useState("");
  const [profit, setProfit] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // All selected cards (to disable in other pickers)
  const allSelectedCards = [...heroCards, ...flop, ...turn, ...river, ...villainCards];

  async function handleSubmit() {
    setError(null);

    if (heroCards.length !== 2) {
      setError("Please select your hole cards");
      return;
    }

    if (!heroPosition) {
      setError("Please select your position");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/hands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroCards,
          heroPosition,
          blinds,
          tableSize,
          playerCount: tableSize,
          flop: flop.length === 3 ? flop : [],
          turn: turn[0] || null,
          river: river[0] || null,
          villainCards: villainCards.length === 2 ? villainCards : [],
          villainPosition: villainPosition || null,
          preflopAction: preflopAction.length > 0 ? preflopAction : null,
          flopAction: flopAction.length > 0 ? flopAction : null,
          turnAction: turnAction.length > 0 ? turnAction : null,
          riverAction: riverAction.length > 0 ? riverAction : null,
          result,
          potSize: parseFloat(potSize) || null,
          profit: parseFloat(profit) || 0,
          title: title || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save hand");
        setLoading(false);
        return;
      }

      router.push("/hands");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      <Link
        href="/hands"
        className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
      >
        ← Back to Hands
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-6">Record Hand</h1>

      {error && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              step >= s ? "bg-[var(--primary)]" : "bg-[var(--card-border)]"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Hero Info */}
      {step === 1 && (
        <div className="space-y-6">
          <CardPicker
            label="Your Hole Cards *"
            selectedCards={heroCards}
            onSelect={setHeroCards}
            maxCards={2}
          />

          <PositionPicker
            label="Your Position *"
            selected={heroPosition}
            onSelect={setHeroPosition}
            tableSize={tableSize}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Blinds</label>
              <div className="flex flex-wrap gap-2">
                {BLINDS_OPTIONS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBlinds(b)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      blinds === b
                        ? "bg-[var(--primary)] text-black"
                        : "bg-[var(--card)] border border-[var(--card-border)]"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Table Size</label>
              <div className="flex gap-2">
                {[6, 9].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTableSize(size as 6 | 9)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      tableSize === size
                        ? "bg-[var(--primary)] text-black"
                        : "bg-[var(--card)] border border-[var(--card-border)]"
                    }`}
                  >
                    {size}-max
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={heroCards.length !== 2 || !heroPosition}
            className="btn btn-primary w-full"
          >
            Next: Board
          </button>
        </div>
      )}

      {/* Step 2: Board & Villain */}
      {step === 2 && (
        <div className="space-y-6">
          <CardPicker
            label="Flop"
            selectedCards={flop}
            onSelect={setFlop}
            maxCards={3}
            disabledCards={allSelectedCards.filter((c) => !flop.includes(c))}
          />

          {flop.length === 3 && (
            <CardPicker
              label="Turn"
              selectedCards={turn}
              onSelect={setTurn}
              maxCards={1}
              disabledCards={allSelectedCards.filter((c) => !turn.includes(c))}
            />
          )}

          {turn.length === 1 && (
            <CardPicker
              label="River"
              selectedCards={river}
              onSelect={setRiver}
              maxCards={1}
              disabledCards={allSelectedCards.filter((c) => !river.includes(c))}
            />
          )}

          <div className="border-t border-[var(--card-border)] pt-6">
            <CardPicker
              label="Villain Cards (optional)"
              selectedCards={villainCards}
              onSelect={setVillainCards}
              maxCards={2}
              disabledCards={allSelectedCards.filter((c) => !villainCards.includes(c))}
            />

            {villainCards.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm mb-2">Villain Position</label>
                <div className="flex flex-wrap gap-2">
                  {(tableSize === 9 ? ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"] : ["BTN", "SB", "BB", "UTG", "HJ", "CO"]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setVillainPosition(pos)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        villainPosition === pos
                          ? "bg-[var(--primary)] text-black"
                          : "bg-[var(--card)] border border-[var(--card-border)]"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">
              Back
            </button>
            <button onClick={() => setStep(3)} className="btn btn-primary flex-1">
              Next: Action
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Action */}
      {step === 3 && (
        <div className="space-y-4">
          <ActionBuilder
            street="Preflop"
            actions={preflopAction}
            onChange={setPreflopAction}
          />

          {flop.length === 3 && (
            <ActionBuilder
              street="Flop"
              actions={flopAction}
              onChange={setFlopAction}
            />
          )}

          {turn.length === 1 && (
            <ActionBuilder
              street="Turn"
              actions={turnAction}
              onChange={setTurnAction}
            />
          )}

          {river.length === 1 && (
            <ActionBuilder
              street="River"
              actions={riverAction}
              onChange={setRiverAction}
            />
          )}

          <div className="flex gap-4 pt-4">
            <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">
              Back
            </button>
            <button onClick={() => setStep(4)} className="btn btn-primary flex-1">
              Next: Result
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Result</label>
            <div className="flex gap-2">
              {RESULTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setResult(r.id)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    result === r.id ? "scale-105" : ""
                  }`}
                  style={{
                    backgroundColor: result === r.id ? r.color : "var(--card)",
                    color: result === r.id ? (r.id === "won" ? "black" : "white") : "var(--foreground)",
                    borderWidth: 2,
                    borderColor: r.color,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">Pot Size</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                <input
                  type="number"
                  value={potSize}
                  onChange={(e) => setPotSize(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Your Profit/Loss</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                <input
                  type="number"
                  value={profit}
                  onChange={(e) => setProfit(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cooler vs set, Bluff gone wrong"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What did you learn?"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(3)} className="btn btn-secondary flex-1">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? "Saving..." : "Save Hand"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
