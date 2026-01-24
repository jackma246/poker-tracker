"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardPicker, { CardDisplay } from "@/components/CardPicker";
import PositionPicker from "@/components/PositionPicker";

interface Player {
  id: string;
  position: string;
  stack: number;
  cards: string[];
  isHero: boolean;
  hasFolded: boolean;
}

interface Action {
  player: string;
  position: string;
  action: string;
  amount?: number;
}

type Step =
  | "hero"
  | "players"
  | "preflop"
  | "flop-cards"
  | "flop-action"
  | "turn-card"
  | "turn-action"
  | "river-card"
  | "river-action"
  | "result";

const POSITIONS_9MAX = ["SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN"];
const POSITIONS_6MAX = ["SB", "BB", "UTG", "HJ", "CO", "BTN"];

export default function NewHandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current step
  const [step, setStep] = useState<Step>("hero");

  // Game setup
  const [tableSize, setTableSize] = useState<6 | 9>(9);
  const [blinds, setBlinds] = useState("1/2");
  const [customBlinds, setCustomBlinds] = useState("");

  // Hero info
  const [heroCards, setHeroCards] = useState<string[]>([]);
  const [heroPosition, setHeroPosition] = useState("");
  const [heroStack, setHeroStack] = useState("");

  // Players in the hand (including hero)
  const [players, setPlayers] = useState<Player[]>([]);

  // Board
  const [flop, setFlop] = useState<string[]>([]);
  const [turn, setTurn] = useState<string[]>([]);
  const [river, setRiver] = useState<string[]>([]);

  // Actions per street
  const [preflopAction, setPreflopAction] = useState<Action[]>([]);
  const [flopAction, setFlopAction] = useState<Action[]>([]);
  const [turnAction, setTurnAction] = useState<Action[]>([]);
  const [riverAction, setRiverAction] = useState<Action[]>([]);

  // Current action state
  const [actionAmount, setActionAmount] = useState("");

  // Result
  const [result, setResult] = useState("won");
  const [potSize, setPotSize] = useState("");
  const [profit, setProfit] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const positions = tableSize === 9 ? POSITIONS_9MAX : POSITIONS_6MAX;
  const effectiveBlinds = blinds === "custom" ? customBlinds : blinds;

  // All used cards
  const allUsedCards = [
    ...heroCards,
    ...flop,
    ...turn,
    ...river,
    ...players.flatMap((p) => p.cards),
  ];

  // Get active players (not folded)
  const activePlayers = players.filter((p) => !p.hasFolded);

  // Get preflop action order (UTG first, then around to BB)
  function getPreflopOrder(): Player[] {
    const order = [...positions];
    // Move SB and BB to end for preflop
    const sbIdx = order.indexOf("SB");
    const bbIdx = order.indexOf("BB");
    if (sbIdx !== -1) order.push(order.splice(sbIdx, 1)[0]);
    if (bbIdx !== -1) order.push(order.splice(order.indexOf("BB"), 1)[0]);

    return order
      .map((pos) => players.find((p) => p.position === pos))
      .filter((p): p is Player => p !== undefined && !p.hasFolded);
  }

  // Get postflop action order (SB first, or first active player after)
  function getPostflopOrder(): Player[] {
    return positions
      .map((pos) => players.find((p) => p.position === pos))
      .filter((p): p is Player => p !== undefined && !p.hasFolded);
  }

  // Initialize players when moving from hero to players step
  function initializePlayers() {
    if (heroPosition) {
      const hero: Player = {
        id: "hero",
        position: heroPosition,
        stack: parseFloat(heroStack) || 0,
        cards: heroCards,
        isHero: true,
        hasFolded: false,
      };
      setPlayers([hero]);
    }
  }

  // Add a villain
  function addVillain(position: string) {
    if (players.some((p) => p.position === position)) return;

    const villain: Player = {
      id: `v-${Date.now()}`,
      position,
      stack: 0,
      cards: [],
      isHero: false,
      hasFolded: false,
    };
    setPlayers([...players, villain]);
  }

  // Remove a villain
  function removeVillain(id: string) {
    setPlayers(players.filter((p) => p.id !== id));
  }

  // Update villain stack
  function updateVillainStack(id: string, stack: number) {
    setPlayers(players.map((p) => (p.id === id ? { ...p, stack } : p)));
  }

  // Record an action
  function recordAction(
    player: Player,
    action: string,
    currentActions: Action[],
    setActions: (a: Action[]) => void
  ) {
    const newAction: Action = {
      player: player.isHero ? "Hero" : player.position,
      position: player.position,
      action,
    };

    if (actionAmount && ["call", "bet", "raise", "all-in"].includes(action)) {
      newAction.amount = parseFloat(actionAmount);
    }

    setActions([...currentActions, newAction]);
    setActionAmount("");

    // Mark player as folded if they fold
    if (action === "fold") {
      setPlayers(players.map((p) => (p.id === player.id ? { ...p, hasFolded: true } : p)));
    }
  }

  // Fold to a specific player
  function foldTo(
    targetPlayer: Player,
    order: Player[],
    currentActions: Action[],
    setActions: (a: Action[]) => void
  ) {
    const targetIdx = order.findIndex((p) => p.id === targetPlayer.id);
    const actedPositions = new Set(currentActions.map((a) => a.position));

    const folds: Action[] = [];
    const foldedIds: string[] = [];

    for (let i = 0; i < targetIdx; i++) {
      const player = order[i];
      if (!actedPositions.has(player.position) && !player.hasFolded) {
        folds.push({
          player: player.isHero ? "Hero" : player.position,
          position: player.position,
          action: "fold",
        });
        foldedIds.push(player.id);
      }
    }

    setActions([...currentActions, ...folds]);
    setPlayers(
      players.map((p) => (foldedIds.includes(p.id) ? { ...p, hasFolded: true } : p))
    );
  }

  // Check if street is complete (all active players have acted)
  function isStreetComplete(actions: Action[]): boolean {
    const actedPositions = new Set(actions.map((a) => a.position));
    return activePlayers.every((p) => actedPositions.has(p.position) || p.hasFolded);
  }

  // Get players who haven't acted yet this street
  function getPlayersToAct(actions: Action[], order: Player[]): Player[] {
    const actedPositions = new Set(actions.map((a) => a.position));
    return order.filter((p) => !actedPositions.has(p.position) && !p.hasFolded);
  }

  // Navigate steps
  function nextStep() {
    switch (step) {
      case "hero":
        if (heroCards.length === 2 && heroPosition) {
          initializePlayers();
          setStep("players");
        }
        break;
      case "players":
        if (players.length >= 2) setStep("preflop");
        break;
      case "preflop":
        if (activePlayers.length <= 1 || isStreetComplete(preflopAction)) {
          if (activePlayers.length <= 1) {
            setStep("result");
          } else {
            setStep("flop-cards");
          }
        }
        break;
      case "flop-cards":
        if (flop.length === 3) setStep("flop-action");
        break;
      case "flop-action":
        if (activePlayers.length <= 1 || isStreetComplete(flopAction)) {
          if (activePlayers.length <= 1) {
            setStep("result");
          } else {
            setStep("turn-card");
          }
        }
        break;
      case "turn-card":
        if (turn.length === 1) setStep("turn-action");
        break;
      case "turn-action":
        if (activePlayers.length <= 1 || isStreetComplete(turnAction)) {
          if (activePlayers.length <= 1) {
            setStep("result");
          } else {
            setStep("river-card");
          }
        }
        break;
      case "river-card":
        if (river.length === 1) setStep("river-action");
        break;
      case "river-action":
        setStep("result");
        break;
    }
  }

  function prevStep() {
    switch (step) {
      case "players": setStep("hero"); break;
      case "preflop": setStep("players"); break;
      case "flop-cards": setStep("preflop"); break;
      case "flop-action": setStep("flop-cards"); break;
      case "turn-card": setStep("flop-action"); break;
      case "turn-action": setStep("turn-card"); break;
      case "river-card": setStep("turn-action"); break;
      case "river-action": setStep("river-card"); break;
      case "result":
        if (river.length > 0) setStep("river-action");
        else if (turn.length > 0) setStep("turn-action");
        else if (flop.length > 0) setStep("flop-action");
        else setStep("preflop");
        break;
    }
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const villains = players
      .filter((p) => !p.isHero && p.cards.length > 0)
      .map((p, i) => ({
        name: `V${i + 1}`,
        cards: p.cards,
        position: p.position,
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
          playerCount: players.length,
          flop: flop.length === 3 ? flop : [],
          turn: turn[0] || null,
          river: river[0] || null,
          villains: villains.length > 0 ? villains : null,
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

  // Render action buttons for a street
  function renderActionStreet(
    streetName: string,
    order: Player[],
    actions: Action[],
    setActions: (a: Action[]) => void
  ) {
    const playersToAct = getPlayersToAct(actions, order);
    const currentPlayer = playersToAct[0];

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{streetName} Action</h2>

        {/* Current board */}
        {flop.length > 0 && (
          <div className="flex items-center gap-2 justify-center p-3 bg-[var(--card)] rounded-lg">
            <CardDisplay cards={flop} size="md" />
            {turn.length > 0 && <CardDisplay cards={turn} size="md" />}
            {river.length > 0 && <CardDisplay cards={river} size="md" />}
          </div>
        )}

        {/* Actions so far */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 bg-[var(--background)] rounded-lg">
            {actions.map((action, i) => (
              <span key={i} className={`action-chip action-${action.action.replace("-", "")}`}>
                {action.player}: {action.action}
                {action.amount && ` $${action.amount}`}
              </span>
            ))}
          </div>
        )}

        {/* Current player to act */}
        {currentPlayer ? (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-[var(--muted)]">Action on: </span>
              <span className={`font-bold ${currentPlayer.isHero ? "text-[var(--primary)]" : ""}`}>
                {currentPlayer.isHero ? "HERO" : currentPlayer.position}
              </span>
              {currentPlayer.isHero && (
                <div className="flex justify-center mt-2">
                  <CardDisplay cards={heroCards} size="md" />
                </div>
              )}
            </div>

            {/* Amount input */}
            <input
              type="number"
              value={actionAmount}
              onChange={(e) => setActionAmount(e.target.value)}
              placeholder="$ Amount (optional)"
              inputMode="numeric"
            />

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              {["fold", "check", "call", "bet", "raise", "all-in"].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => recordAction(currentPlayer, action, actions, setActions)}
                  className={`py-3 rounded-lg font-medium capitalize action-chip action-${action.replace("-", "")}`}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Shortcuts */}
            <div className="flex flex-wrap gap-2">
              {playersToAct.slice(1).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => foldTo(p, order, actions, setActions)}
                  className="text-xs px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)]"
                >
                  Folds to {p.isHero ? "Hero" : p.position}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-[var(--muted)] py-4">
            All players have acted
          </div>
        )}

        {/* Undo */}
        {actions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const lastAction = actions[actions.length - 1];
              setActions(actions.slice(0, -1));
              if (lastAction.action === "fold") {
                setPlayers(
                  players.map((p) =>
                    p.position === lastAction.position ? { ...p, hasFolded: false } : p
                  )
                );
              }
            }}
            className="btn btn-secondary w-full"
          >
            Undo Last Action
          </button>
        )}
      </div>
    );
  }

  const COMMON_BLINDS = ["1/2", "1/3", "2/5", "5/10"];

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/hands" className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm">
          ← Cancel
        </Link>
        <div className="text-sm text-[var(--muted)]">
          {step.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
        </div>
      </div>

      {error && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Step: Hero Setup */}
      {step === "hero" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">Your Hand</h2>

          {/* Table size & Blinds */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <div className="section-header">Blinds</div>
              <select
                value={blinds}
                onChange={(e) => setBlinds(e.target.value)}
                className="w-full"
              >
                {COMMON_BLINDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
              {blinds === "custom" && (
                <input
                  type="text"
                  value={customBlinds}
                  onChange={(e) => setCustomBlinds(e.target.value)}
                  placeholder="e.g., 1/2/5"
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Hero cards */}
          <CardPicker
            label="Your Hole Cards"
            selectedCards={heroCards}
            onSelect={setHeroCards}
            maxCards={2}
          />

          {/* Position */}
          <div>
            <div className="section-header">Your Position</div>
            <PositionPicker
              selected={heroPosition}
              onSelect={setHeroPosition}
              tableSize={tableSize}
            />
          </div>

          {/* Stack */}
          <div>
            <div className="section-header">Your Stack (optional)</div>
            <input
              type="number"
              value={heroStack}
              onChange={(e) => setHeroStack(e.target.value)}
              placeholder="$ Stack size"
              inputMode="numeric"
            />
          </div>
        </div>
      )}

      {/* Step: Players Setup */}
      {step === "players" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">Who's in the hand?</h2>
          <p className="text-sm text-[var(--muted)]">
            Add other players who are in this hand (villains)
          </p>

          {/* Current players */}
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`card flex items-center justify-between ${
                  player.isHero ? "border-[var(--primary)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${player.isHero ? "text-[var(--primary)]" : ""}`}>
                    {player.position}
                  </span>
                  {player.isHero && (
                    <>
                      <span className="text-xs text-[var(--muted)]">HERO</span>
                      <CardDisplay cards={heroCards} size="sm" />
                    </>
                  )}
                </div>
                {!player.isHero && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={player.stack || ""}
                      onChange={(e) => updateVillainStack(player.id, parseFloat(e.target.value) || 0)}
                      placeholder="Stack"
                      className="w-24 text-sm py-1"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => removeVillain(player.id)}
                      className="text-[var(--danger)] text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add player buttons */}
          <div>
            <div className="section-header">Add Player</div>
            <div className="flex flex-wrap gap-2">
              {positions
                .filter((pos) => !players.some((p) => p.position === pos))
                .map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => addVillain(pos)}
                    className="px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--primary)]"
                  >
                    + {pos}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preflop Action */}
      {step === "preflop" && renderActionStreet("Preflop", getPreflopOrder(), preflopAction, setPreflopAction)}

      {/* Step: Flop Cards */}
      {step === "flop-cards" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">The Flop</h2>
          <CardPicker
            label="Select 3 Flop Cards"
            selectedCards={flop}
            onSelect={setFlop}
            maxCards={3}
            disabledCards={allUsedCards.filter((c) => !flop.includes(c))}
          />
        </div>
      )}

      {/* Step: Flop Action */}
      {step === "flop-action" && renderActionStreet("Flop", getPostflopOrder(), flopAction, setFlopAction)}

      {/* Step: Turn Card */}
      {step === "turn-card" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">The Turn</h2>
          <div className="flex justify-center gap-2 mb-4">
            <CardDisplay cards={flop} size="md" />
          </div>
          <CardPicker
            label="Select Turn Card"
            selectedCards={turn}
            onSelect={setTurn}
            maxCards={1}
            disabledCards={allUsedCards.filter((c) => !turn.includes(c))}
          />
        </div>
      )}

      {/* Step: Turn Action */}
      {step === "turn-action" && renderActionStreet("Turn", getPostflopOrder(), turnAction, setTurnAction)}

      {/* Step: River Card */}
      {step === "river-card" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">The River</h2>
          <div className="flex justify-center gap-2 mb-4">
            <CardDisplay cards={flop} size="md" />
            <CardDisplay cards={turn} size="md" />
          </div>
          <CardPicker
            label="Select River Card"
            selectedCards={river}
            onSelect={setRiver}
            maxCards={1}
            disabledCards={allUsedCards.filter((c) => !river.includes(c))}
          />
        </div>
      )}

      {/* Step: River Action */}
      {step === "river-action" && renderActionStreet("River", getPostflopOrder(), riverAction, setRiverAction)}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">Result</h2>

          {/* Final board */}
          {flop.length > 0 && (
            <div className="flex items-center gap-2 justify-center p-3 bg-[var(--card)] rounded-lg">
              <CardDisplay cards={flop} size="md" />
              {turn.length > 0 && <CardDisplay cards={turn} size="md" />}
              {river.length > 0 && <CardDisplay cards={river} size="md" />}
            </div>
          )}

          {/* Villain showdown cards */}
          {players.filter((p) => !p.isHero && !p.hasFolded).length > 0 && (
            <div className="card">
              <div className="section-header">Villain Cards (at showdown)</div>
              <div className="space-y-3">
                {players
                  .filter((p) => !p.isHero && !p.hasFolded)
                  .map((villain) => (
                    <div key={villain.id}>
                      <div className="text-sm text-[var(--muted)] mb-1">{villain.position}</div>
                      <CardPicker
                        selectedCards={villain.cards}
                        onSelect={(cards) =>
                          setPlayers(
                            players.map((p) => (p.id === villain.id ? { ...p, cards } : p))
                          )
                        }
                        maxCards={2}
                        disabledCards={allUsedCards.filter((c) => !villain.cards.includes(c))}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Result buttons */}
          <div className="flex gap-2">
            {[
              { id: "won", label: "Won", color: "var(--primary)" },
              { id: "lost", label: "Lost", color: "var(--danger)" },
              { id: "split", label: "Split", color: "var(--muted)" },
            ].map((r) => (
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

          {/* Pot & Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Pot Size</div>
              <input
                type="number"
                value={potSize}
                onChange={(e) => setPotSize(e.target.value)}
                placeholder="$ 0"
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Your Profit</div>
              <input
                type="number"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                placeholder="$ 0"
                inputMode="numeric"
              />
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
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--background)] border-t border-[var(--card-border)]">
        <div className="max-w-lg mx-auto flex gap-3">
          {step !== "hero" && (
            <button type="button" onClick={prevStep} className="btn btn-secondary flex-1">
              Back
            </button>
          )}
          {step === "result" ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? "Saving..." : "Save Hand"}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              disabled={
                (step === "hero" && (heroCards.length !== 2 || !heroPosition)) ||
                (step === "players" && players.length < 2) ||
                (step === "flop-cards" && flop.length !== 3) ||
                (step === "turn-card" && turn.length !== 1) ||
                (step === "river-card" && river.length !== 1)
              }
              className="btn btn-primary flex-1"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
