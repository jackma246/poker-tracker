"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardPicker, { CardDisplay } from "@/components/CardPicker";
import PositionPicker from "@/components/PositionPicker";

interface Action {
  player: string;
  action: string;
  amount?: number;
}

interface Villain {
  id: number;
  cards: string[];
  position: string;
}

const COMMON_BLINDS = ["1/2", "1/3", "2/5", "5/10", "1/2/5"];
const RESULTS = [
  { id: "won", label: "Won", color: "var(--primary)" },
  { id: "lost", label: "Lost", color: "var(--danger)" },
  { id: "split", label: "Split", color: "var(--muted)" },
];

const ACTION_BUTTONS = [
  { id: "fold", label: "Fold", color: "#da3633" },
  { id: "check", label: "Check", color: "#8b949e" },
  { id: "call", label: "Call", color: "#238636" },
  { id: "bet", label: "Bet", color: "#238636" },
  { id: "raise", label: "Raise", color: "#d29922" },
  { id: "all-in", label: "All-In", color: "#da3633" },
];

export default function NewHandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [heroCards, setHeroCards] = useState<string[]>([]);
  const [heroPosition, setHeroPosition] = useState("");
  const [blinds, setBlinds] = useState("1/2");
  const [customBlinds, setCustomBlinds] = useState("");
  const [tableSize, setTableSize] = useState<6 | 9>(9);

  const [flop, setFlop] = useState<string[]>([]);
  const [turn, setTurn] = useState<string[]>([]);
  const [river, setRiver] = useState<string[]>([]);

  // Multiple villains
  const [villains, setVillains] = useState<Villain[]>([]);
  const [nextVillainId, setNextVillainId] = useState(1);

  // Action tracking per street
  const [preflopAction, setPreflopAction] = useState<Action[]>([]);
  const [flopAction, setFlopAction] = useState<Action[]>([]);
  const [turnAction, setTurnAction] = useState<Action[]>([]);
  const [riverAction, setRiverAction] = useState<Action[]>([]);

  const [currentStreet, setCurrentStreet] = useState<"preflop" | "flop" | "turn" | "river">("preflop");
  const [actionAmount, setActionAmount] = useState("");

  const [result, setResult] = useState("won");
  const [potSize, setPotSize] = useState("");
  const [profit, setProfit] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const effectiveBlinds = blinds === "custom" ? customBlinds : blinds;

  // All selected cards (to disable in other pickers)
  const allVillainCards = villains.flatMap((v) => v.cards);
  const allSelectedCards = [...heroCards, ...flop, ...turn, ...river, ...allVillainCards];

  // Villain management
  function addVillain() {
    setVillains([...villains, { id: nextVillainId, cards: [], position: "" }]);
    setNextVillainId(nextVillainId + 1);
  }

  function removeVillain(id: number) {
    setVillains(villains.filter((v) => v.id !== id));
  }

  function updateVillainCards(id: number, cards: string[]) {
    setVillains(villains.map((v) => (v.id === id ? { ...v, cards } : v)));
  }

  function updateVillainPosition(id: number, position: string) {
    setVillains(villains.map((v) => (v.id === id ? { ...v, position } : v)));
  }

  // Get current street actions
  const getCurrentActions = () => {
    switch (currentStreet) {
      case "preflop": return preflopAction;
      case "flop": return flopAction;
      case "turn": return turnAction;
      case "river": return riverAction;
    }
  };

  const setCurrentActions = (actions: Action[]) => {
    switch (currentStreet) {
      case "preflop": setPreflopAction(actions); break;
      case "flop": setFlopAction(actions); break;
      case "turn": setTurnAction(actions); break;
      case "river": setRiverAction(actions); break;
    }
  };

  function addAction(player: string, action: string) {
    const newAction: Action = { player, action };
    if (actionAmount && ["call", "bet", "raise", "all-in"].includes(action)) {
      newAction.amount = parseFloat(actionAmount);
    }
    setCurrentActions([...getCurrentActions(), newAction]);
    setActionAmount("");
  }

  function foldToHero() {
    const positions = tableSize === 9
      ? ["UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN", "SB", "BB"]
      : ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

    const heroIdx = positions.indexOf(heroPosition);
    const folds: Action[] = [];

    for (let i = 0; i < heroIdx; i++) {
      folds.push({ player: positions[i], action: "fold" });
    }

    setCurrentActions([...getCurrentActions(), ...folds]);
  }

  function undoAction() {
    const actions = getCurrentActions();
    if (actions.length > 0) {
      setCurrentActions(actions.slice(0, -1));
    }
  }

  async function handleSubmit(isDraft: boolean = false) {
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

    // Format villains for API
    const formattedVillains = villains
      .filter((v) => v.cards.length > 0)
      .map((v, i) => ({
        name: `V${i + 1}`,
        cards: v.cards,
        position: v.position || null,
      }));

    try {
      const res = await fetch("/api/hands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroCards,
          heroPosition,
          blinds: effectiveBlinds,
          tableSize,
          playerCount: tableSize,
          flop: flop.length === 3 ? flop : [],
          turn: turn[0] || null,
          river: river[0] || null,
          villains: formattedVillains.length > 0 ? formattedVillains : null,
          preflopAction: preflopAction.length > 0 ? preflopAction : null,
          flopAction: flopAction.length > 0 ? flopAction : null,
          turnAction: turnAction.length > 0 ? turnAction : null,
          riverAction: riverAction.length > 0 ? riverAction : null,
          result: isDraft ? "lost" : result,
          potSize: parseFloat(potSize) || null,
          profit: parseFloat(profit) || 0,
          title: isDraft ? "Draft" : (title || null),
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

  const positions = tableSize === 9
    ? ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"]
    : ["BTN", "SB", "BB", "UTG", "HJ", "CO"];

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <Link href="/hands" className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm">
          ← Cancel
        </Link>
        <button
          onClick={() => handleSubmit(true)}
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
        >
          Save Draft
        </button>
      </div>

      <h1 className="text-xl font-semibold mb-6">Record Hand</h1>

      {error && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Hero Cards */}
        <CardPicker
          label="Your Hole Cards"
          selectedCards={heroCards}
          onSelect={setHeroCards}
          maxCards={2}
        />

        {/* Position & Table */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="section-header">Position</div>
            <PositionPicker
              selected={heroPosition}
              onSelect={setHeroPosition}
              tableSize={tableSize}
            />
          </div>
          <div>
            <div className="section-header">Table</div>
            <div className="flex gap-2">
              {[6, 9].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTableSize(size as 6 | 9)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tableSize === size
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--card)] border border-[var(--card-border)]"
                  }`}
                >
                  {size}-max
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Blinds */}
        <div>
          <div className="section-header">Blinds</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_BLINDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => { setBlinds(b); setCustomBlinds(""); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  blinds === b
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] border border-[var(--card-border)]"
                }`}
              >
                {b}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBlinds("custom")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                blinds === "custom"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--card-border)]"
              }`}
            >
              Custom
            </button>
          </div>
          {blinds === "custom" && (
            <input
              type="text"
              value={customBlinds}
              onChange={(e) => setCustomBlinds(e.target.value)}
              placeholder="e.g., 1/2/5 or 2/5 w/ $10 BTN"
              autoFocus
            />
          )}
        </div>

        {/* Board Cards */}
        <div className="card">
          <div className="section-header">Board</div>
          <div className="grid grid-cols-3 gap-3">
            <CardPicker
              label="Flop"
              selectedCards={flop}
              onSelect={setFlop}
              maxCards={3}
              disabledCards={allSelectedCards.filter((c) => !flop.includes(c))}
            />
            <CardPicker
              label="Turn"
              selectedCards={turn}
              onSelect={setTurn}
              maxCards={1}
              disabledCards={allSelectedCards.filter((c) => !turn.includes(c))}
            />
            <CardPicker
              label="River"
              selectedCards={river}
              onSelect={setRiver}
              maxCards={1}
              disabledCards={allSelectedCards.filter((c) => !river.includes(c))}
            />
          </div>
        </div>

        {/* Action Builder */}
        <div className="card">
          <div className="section-header">Action</div>

          {/* Street tabs */}
          <div className="tab-nav mb-3">
            {(["preflop", "flop", "turn", "river"] as const).map((street) => (
              <button
                key={street}
                type="button"
                onClick={() => setCurrentStreet(street)}
                className={`tab-btn capitalize ${currentStreet === street ? "active" : ""}`}
              >
                {street}
              </button>
            ))}
          </div>

          {/* Current actions display */}
          {getCurrentActions().length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 p-2 bg-[var(--background)] rounded-lg">
              {getCurrentActions().map((action, i) => (
                <span key={i} className={`action-chip action-${action.action.replace("-", "")}`}>
                  {action.player}: {action.action}
                  {action.amount && ` $${action.amount}`}
                </span>
              ))}
            </div>
          )}

          {/* Amount input */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
              <input
                type="number"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="Amount"
                className="pl-7"
                inputMode="numeric"
              />
            </div>
            <button
              type="button"
              onClick={undoAction}
              className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-sm"
            >
              Undo
            </button>
          </div>

          {/* Hero actions */}
          <div className="mb-3">
            <div className="text-xs text-[var(--muted)] mb-1">Hero</div>
            <div className="flex flex-wrap gap-1.5">
              {ACTION_BUTTONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => addAction("Hero", action.id)}
                  className={`action-chip action-${action.id.replace("-", "")} cursor-pointer hover:opacity-80`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Villain actions */}
          <div className="mb-3">
            <div className="text-xs text-[var(--muted)] mb-1">
              Villains {villains.length > 0 && `(${villains.length})`}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {villains.length === 0 ? (
                <span className="text-xs text-[var(--muted)]">Add villains below to track their actions</span>
              ) : (
                villains.map((v, i) => (
                  <div key={v.id} className="flex gap-1">
                    {ACTION_BUTTONS.slice(0, 4).map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => addAction(`V${i + 1}`, action.id)}
                        className={`action-chip action-${action.id.replace("-", "")} cursor-pointer hover:opacity-80 text-[10px] px-1.5`}
                      >
                        V{i + 1} {action.label}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={foldToHero}
              className="flex-1 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-xs"
            >
              Fold to Hero
            </button>
            <button
              type="button"
              onClick={() => addAction("Others", "fold")}
              className="flex-1 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-xs"
            >
              Others Fold
            </button>
          </div>
        </div>

        {/* Villains */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="section-header mb-0">Villains (optional)</div>
            <button
              type="button"
              onClick={addVillain}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              + Add Villain
            </button>
          </div>

          {villains.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Add villains to record their hole cards at showdown
            </p>
          ) : (
            <div className="space-y-4">
              {villains.map((villain, index) => (
                <div key={villain.id} className="p-3 bg-[var(--background)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Villain {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVillain(villain.id)}
                      className="text-xs text-[var(--danger)] hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <CardPicker
                      label="Cards"
                      selectedCards={villain.cards}
                      onSelect={(cards) => updateVillainCards(villain.id, cards)}
                      maxCards={2}
                      disabledCards={allSelectedCards.filter((c) => !villain.cards.includes(c))}
                    />

                    {villain.cards.length > 0 && (
                      <div>
                        <div className="text-xs text-[var(--muted)] mb-1">Position</div>
                        <div className="flex flex-wrap gap-1">
                          {positions.map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => updateVillainPosition(villain.id, pos)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                villain.position === pos
                                  ? "bg-[var(--primary)] text-white"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="card">
          <div className="section-header">Result</div>

          <div className="flex gap-2 mb-4">
            {RESULTS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setResult(r.id)}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all text-sm ${
                  result === r.id ? "scale-[1.02]" : ""
                }`}
                style={{
                  backgroundColor: result === r.id ? r.color : "var(--background)",
                  color: result === r.id ? "white" : "var(--foreground)",
                  borderWidth: 1,
                  borderColor: r.color,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Pot Size</div>
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
              <div className="text-xs text-[var(--muted)] mb-1">Your Profit</div>
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
        </div>

        {/* Notes */}
        <div>
          <div className="section-header">Title (optional)</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Set over set cooler"
          />
        </div>

        <div>
          <div className="section-header">Notes (optional)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? What would you do differently?"
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading || heroCards.length !== 2 || !heroPosition}
          className="btn btn-primary w-full"
        >
          {loading ? "Saving..." : "Save Hand"}
        </button>
      </div>
    </div>
  );
}
