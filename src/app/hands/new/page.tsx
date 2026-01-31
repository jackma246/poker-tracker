"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CardPicker, { CardDisplay } from "@/components/CardPicker";
import PositionPicker from "@/components/PositionPicker";

interface Action {
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

const POSITIONS_9MAX = ["UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN", "SB", "BB"];
const POSITIONS_6MAX = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

// Postflop order: SB first
const POSTFLOP_9MAX = ["SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN"];
const POSTFLOP_6MAX = ["SB", "BB", "UTG", "HJ", "CO", "BTN"];

export default function NewHandPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("hero");
  const [tableSize, setTableSize] = useState<6 | 9>(9);
  const [blinds, setBlinds] = useState("1/2");
  const [customBlinds, setCustomBlinds] = useState("");

  // Hero info
  const [heroCards, setHeroCards] = useState<string[]>([]);
  const [heroPosition, setHeroPosition] = useState("");
  const [heroStack, setHeroStack] = useState("");

  // Villains (positions we want to track cards for at showdown)
  const [villainPositions, setVillainPositions] = useState<Set<string>>(new Set());
  const [villainStacks, setVillainStacks] = useState<Record<string, number>>({});
  const [villainCards, setVillainCards] = useState<Record<string, string[]>>({});

  // Folded positions
  const [foldedPositions, setFoldedPositions] = useState<Set<string>>(new Set());

  // Board
  const [flop, setFlop] = useState<string[]>([]);
  const [turn, setTurn] = useState<string[]>([]);
  const [river, setRiver] = useState<string[]>([]);

  // Actions per street
  const [preflopAction, setPreflopAction] = useState<Action[]>([]);
  const [flopAction, setFlopAction] = useState<Action[]>([]);
  const [turnAction, setTurnAction] = useState<Action[]>([]);
  const [riverAction, setRiverAction] = useState<Action[]>([]);

  const [actionAmount, setActionAmount] = useState("");

  // Result
  const [result, setResult] = useState("won");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const preflopOrder = tableSize === 9 ? POSITIONS_9MAX : POSITIONS_6MAX;
  const postflopOrder = tableSize === 9 ? POSTFLOP_9MAX : POSTFLOP_6MAX;
  const effectiveBlinds = blinds === "custom" ? customBlinds : blinds;

  // All positions at the table (for preflop, everyone acts until they fold)
  const allTablePositions = useMemo(() => {
    const positions = tableSize === 9 ? POSITIONS_9MAX : POSITIONS_6MAX;
    return new Set(positions);
  }, [tableSize]);

  // All positions in the hand (hero + villains - for postflop and tracking)
  const allPlayersInHand = useMemo(() => {
    const set = new Set(villainPositions);
    if (heroPosition) set.add(heroPosition);
    return set;
  }, [villainPositions, heroPosition]);


  // Active positions (in table and not folded)
  // After preflop, this includes all non-folded positions (not just villains)
  const activePositions = useMemo(() => {
    return new Set([...allTablePositions].filter((pos) => !foldedPositions.has(pos)));
  }, [allTablePositions, foldedPositions]);

  // All used cards
  const allUsedCards = useMemo(() => {
    const cards = [...heroCards, ...flop, ...turn, ...river];
    Object.values(villainCards).forEach((vc) => cards.push(...vc));
    return cards;
  }, [heroCards, flop, turn, river, villainCards]);

  // Get who needs to act next in a betting round
  function getNextToAct(actions: Action[], order: string[], playersInHand: Set<string>): string | null {
    // Find positions in hand that haven't folded
    const activeInOrder = order.filter(
      (pos) => playersInHand.has(pos) && !foldedPositions.has(pos)
    );

    if (activeInOrder.length <= 1) return null;

    // Find the last aggressive action (bet/raise)
    let lastRaiseIdx = -1;
    for (let i = actions.length - 1; i >= 0; i--) {
      if (["bet", "raise", "all-in"].includes(actions[i].action)) {
        lastRaiseIdx = i;
        break;
      }
    }

    // Get positions that have acted since the last raise
    const actedSinceRaise = new Set<string>();
    const startIdx = lastRaiseIdx >= 0 ? lastRaiseIdx : 0;
    for (let i = startIdx; i < actions.length; i++) {
      actedSinceRaise.add(actions[i].position);
    }

    // If no raise yet, everyone needs to act once
    if (lastRaiseIdx === -1) {
      for (const pos of activeInOrder) {
        const hasActed = actions.some((a) => a.position === pos);
        if (!hasActed) return pos;
      }
      return null; // Everyone acted, no raises
    }

    // After a raise, everyone after the raiser needs to act
    const raiserPos = actions[lastRaiseIdx].position;
    const raiserOrderIdx = activeInOrder.indexOf(raiserPos);

    // Go around the table from after the raiser
    for (let i = 1; i < activeInOrder.length; i++) {
      const idx = (raiserOrderIdx + i) % activeInOrder.length;
      const pos = activeInOrder[idx];
      if (!actedSinceRaise.has(pos)) {
        return pos;
      }
    }

    return null; // Everyone has acted on the raise
  }

  // Check if betting round is complete
  function isBettingComplete(actions: Action[], order: string[], playersInHand: Set<string>): boolean {
    return getNextToAct(actions, order, playersInHand) === null;
  }

  // Calculate pot size from actions
  function sumActionAmounts(actions: Action[]): number {
    let total = 0;
    for (const action of actions) {
      if (action.amount && ["call", "bet", "raise", "all-in"].includes(action.action)) {
        total += action.amount;
      }
    }
    return total;
  }

  // Parse blinds
  const blindsAmount = useMemo(() => {
    const blindParts = effectiveBlinds.split("/").map((b) => parseFloat(b.trim()) || 0);
    const sb = blindParts[0] || 0;
    const bb = blindParts[1] || blindParts[0] || 0;
    return sb + bb;
  }, [effectiveBlinds]);

  // Get pot at each street
  const preflopPot = useMemo(() => blindsAmount + sumActionAmounts(preflopAction), [blindsAmount, preflopAction]);
  const flopPot = useMemo(() => preflopPot + sumActionAmounts(flopAction), [preflopPot, flopAction]);
  const turnPot = useMemo(() => flopPot + sumActionAmounts(turnAction), [flopPot, turnAction]);
  const riverPot = useMemo(() => turnPot + sumActionAmounts(riverAction), [turnPot, riverAction]);

  // Calculate hero's total contribution to the pot
  const heroContribution = useMemo(() => {
    let total = 0;

    // Add blind if hero is SB or BB
    const blindParts = effectiveBlinds.split("/").map((b) => parseFloat(b.trim()) || 0);
    const sb = blindParts[0] || 0;
    const bb = blindParts[1] || blindParts[0] || 0;
    if (heroPosition === "SB") total += sb;
    if (heroPosition === "BB") total += bb;

    // Sum all hero's action amounts
    const allActions = [...preflopAction, ...flopAction, ...turnAction, ...riverAction];
    for (const action of allActions) {
      if (action.position === heroPosition && action.amount) {
        total += action.amount;
      }
    }

    return total;
  }, [heroPosition, effectiveBlinds, preflopAction, flopAction, turnAction, riverAction]);

  // Calculate final pot
  const finalPot = useMemo(() => {
    if (river.length > 0) return riverPot;
    if (turn.length > 0) return turnPot;
    if (flop.length > 0) return flopPot;
    return preflopPot;
  }, [river, turn, flop, riverPot, turnPot, flopPot, preflopPot]);

  // Calculate profit based on result
  const calculatedProfit = useMemo(() => {
    if (result === "won") {
      return finalPot - heroContribution;
    } else if (result === "lost") {
      return -heroContribution;
    } else if (result === "split") {
      return Math.round(finalPot / 2) - heroContribution;
    }
    return 0;
  }, [result, finalPot, heroContribution]);

  // Get the current bet to call (the last bet/raise amount)
  function getCurrentBetToCall(actions: Action[], isPreflop: boolean): number {
    // For preflop, start with BB as the initial bet
    const blindParts = effectiveBlinds.split("/").map((b) => parseFloat(b.trim()) || 0);
    const bb = blindParts[1] || blindParts[0] || 0;
    let currentBet = isPreflop ? bb : 0;

    // Find the last bet/raise/all-in - that's the current bet level
    for (const a of actions) {
      if (a.amount && ["bet", "raise", "all-in"].includes(a.action)) {
        currentBet = a.amount;
      }
    }

    return currentBet;
  }

  // Get remaining stack for a position (original stack minus amount already bet)
  function getRemainingStack(position: string, currentStreetActions: Action[]): number {
    // Get original stack
    let originalStack = 0;
    if (position === heroPosition) {
      originalStack = parseFloat(heroStack) || 0;
    } else {
      originalStack = villainStacks[position] || 0;
    }

    if (originalStack === 0) return 0;

    // Subtract all amounts this player has already put in
    let totalBet = 0;

    // Add blind if applicable
    const blindParts = effectiveBlinds.split("/").map((b) => parseFloat(b.trim()) || 0);
    const sb = blindParts[0] || 0;
    const bb = blindParts[1] || blindParts[0] || 0;
    if (position === "SB") totalBet += sb;
    if (position === "BB") totalBet += bb;

    // Sum all previous action amounts for this player
    const allPreviousActions = [...preflopAction, ...flopAction, ...turnAction, ...riverAction];
    for (const action of allPreviousActions) {
      if (action.position === position && action.amount) {
        totalBet += action.amount;
      }
    }

    // Also include current street actions (in case we're mid-street)
    for (const action of currentStreetActions) {
      if (action.position === position && action.amount) {
        // Already counted in allPreviousActions if it's the same reference
      }
    }

    return Math.max(0, originalStack - totalBet);
  }

  // Record an action
  function recordAction(
    position: string,
    action: string,
    currentActions: Action[],
    setActions: (a: Action[]) => void,
    isPreflop: boolean = false
  ) {
    const newAction: Action = { position, action };

    if (actionAmount && ["call", "bet", "raise", "all-in"].includes(action)) {
      newAction.amount = parseFloat(actionAmount);
    } else if (action === "call") {
      // Auto-fill call amount based on current bet
      const currentBet = getCurrentBetToCall(currentActions, isPreflop);
      if (currentBet > 0) {
        newAction.amount = currentBet;
      }
    } else if (action === "all-in") {
      // Auto-fill all-in amount based on player's remaining stack
      const remainingStack = getRemainingStack(position, currentActions);
      if (remainingStack > 0) {
        newAction.amount = remainingStack;
      }
    }

    setActions([...currentActions, newAction]);
    setActionAmount("");

    if (action === "fold") {
      setFoldedPositions(new Set([...foldedPositions, position]));
    }
  }

  // Fold everyone up to a position
  function foldToPosition(
    targetPos: string,
    order: string[],
    currentActions: Action[],
    setActions: (a: Action[]) => void,
    playersInHand: Set<string>
  ) {
    const activeInOrder = order.filter(
      (pos) => playersInHand.has(pos) && !foldedPositions.has(pos)
    );

    const folds: Action[] = [];
    const newFolded = new Set(foldedPositions);

    for (const pos of activeInOrder) {
      if (pos === targetPos) break;

      const hasActed = currentActions.some((a) => a.position === pos);
      if (!hasActed) {
        folds.push({ position: pos, action: "fold" });
        newFolded.add(pos);
      }
    }

    if (folds.length > 0) {
      setActions([...currentActions, ...folds]);
      setFoldedPositions(newFolded);
    }
  }

  // Navigation
  function nextStep() {
    switch (step) {
      case "hero":
        if (heroCards.length === 2 && heroPosition) {
          setStep("players");
        }
        break;
      case "players":
        if (villainPositions.size >= 1) setStep("preflop");
        break;
      case "preflop":
        if (activePositions.size <= 1) {
          setStep("result");
        } else if (isBettingComplete(preflopAction, preflopOrder, allTablePositions)) {
          setStep("flop-cards");
        }
        break;
      case "flop-cards":
        if (flop.length === 3) setStep("flop-action");
        break;
      case "flop-action":
        if (activePositions.size <= 1) {
          setStep("result");
        } else if (isBettingComplete(flopAction, postflopOrder, allTablePositions)) {
          setStep("turn-card");
        }
        break;
      case "turn-card":
        if (turn.length === 1) setStep("turn-action");
        break;
      case "turn-action":
        if (activePositions.size <= 1) {
          setStep("result");
        } else if (isBettingComplete(turnAction, postflopOrder, allPlayersInHand)) {
          setStep("river-card");
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

    const villains = [...villainPositions]
      .filter((pos) => villainCards[pos]?.length > 0)
      .map((pos, i) => ({
        name: `V${i + 1}`,
        cards: villainCards[pos],
        position: pos,
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
          playerCount: allPlayersInHand.size,
          flop: flop.length === 3 ? flop : [],
          turn: turn[0] || null,
          river: river[0] || null,
          villains: villains.length > 0 ? villains : null,
          preflopAction: preflopAction.length > 0 ? preflopAction : null,
          flopAction: flopAction.length > 0 ? flopAction : null,
          turnAction: turnAction.length > 0 ? turnAction : null,
          riverAction: riverAction.length > 0 ? riverAction : null,
          result,
          potSize: finalPot,
          profit: calculatedProfit,
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

  function getPositionLabel(pos: string): string {
    if (pos === heroPosition) return `${pos} (Hero)`;
    return pos;
  }

  // Render action UI for a street
  function renderActionStreet(
    streetName: string,
    order: string[],
    actions: Action[],
    setActions: (a: Action[]) => void,
    playersInHand: Set<string>,
    currentPot: number,
    isPreflop: boolean = false
  ) {
    const nextToAct = getNextToAct(actions, order, playersInHand);
    const currentBetToCall = getCurrentBetToCall(actions, isPreflop);
    const nextToActStack = nextToAct ? getRemainingStack(nextToAct, actions) : 0;
    const activeInOrder = order.filter(
      (pos) => playersInHand.has(pos) && !foldedPositions.has(pos)
    );

    // Get positions that still need to act
    const needsToAct = activeInOrder.filter((pos) => {
      if (pos === nextToAct) return true;
      // Check if they need to act after current player
      const currentIdx = activeInOrder.indexOf(nextToAct || "");
      const posIdx = activeInOrder.indexOf(pos);
      if (currentIdx === -1) return false;
      return posIdx > currentIdx;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{streetName} Action</h2>
          <div className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--primary)] text-white">
            Pot: ${currentPot.toFixed(0)}
          </div>
        </div>

        {/* Current board */}
        {flop.length > 0 && (
          <div className="flex items-center gap-2 justify-center p-3 bg-[var(--card)] rounded-lg">
            <CardDisplay cards={flop} size="md" />
            {turn.length > 0 && <CardDisplay cards={turn} size="md" />}
            {river.length > 0 && <CardDisplay cards={river} size="md" />}
          </div>
        )}

        {/* Players still in */}
        <div className="flex flex-wrap gap-2 justify-center">
          {activeInOrder.map((pos) => (
            <span
              key={pos}
              className={`text-xs px-2 py-1 rounded ${
                pos === heroPosition
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--card-border)]"
              }`}
            >
              {pos === heroPosition ? "HERO" : pos}
            </span>
          ))}
        </div>

        {/* Actions so far */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 bg-[var(--background)] rounded-lg">
            {actions.map((action, i) => (
              <span
                key={i}
                className={`action-chip action-${action.action.replace("-", "")}`}
              >
                {action.position === heroPosition ? "Hero" : action.position}: {action.action}
                {action.amount && ` $${action.amount}`}
              </span>
            ))}
          </div>
        )}

        {/* Current player to act */}
        {nextToAct ? (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-[var(--muted)]">Action on: </span>
              <span
                className={`font-bold text-lg ${
                  nextToAct === heroPosition ? "text-[var(--primary)]" : ""
                }`}
              >
                {nextToAct === heroPosition ? "HERO" : nextToAct}
              </span>
              {nextToAct === heroPosition && (
                <div className="flex justify-center mt-2">
                  <CardDisplay cards={heroCards} size="md" />
                </div>
              )}
            </div>

            {/* Amount input */}
            <div className="space-y-1">
              <input
                type="number"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder={currentBetToCall > 0 ? `$ Amount (call = $${currentBetToCall})` : "$ Amount (optional)"}
                inputMode="numeric"
              />
              {currentBetToCall > 0 && (
                <div className="text-xs text-[var(--muted)] text-center">
                  Current bet: ${currentBetToCall}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              {["fold", "check", "call", "bet", "raise", "all-in"].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => recordAction(nextToAct, action, actions, setActions, isPreflop)}
                  className={`py-3 rounded-lg font-medium capitalize action-chip action-${action.replace(
                    "-",
                    ""
                  )}`}
                >
                  {action === "call" && currentBetToCall > 0
                    ? `call $${currentBetToCall}`
                    : action === "all-in" && nextToActStack > 0
                    ? `all-in $${nextToActStack}`
                    : action}
                </button>
              ))}
            </div>

            {/* Fold-to shortcuts */}
            {needsToAct.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {needsToAct.slice(1).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => foldToPosition(pos, order, actions, setActions, playersInHand)}
                    className="text-xs px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)]"
                  >
                    Folds to {pos === heroPosition ? "Hero" : pos}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-[var(--primary)] font-medium">Betting complete</div>
            <div className="text-sm text-[var(--muted)]">Press Next to continue</div>
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
                const newFolded = new Set(foldedPositions);
                newFolded.delete(lastAction.position);
                setFoldedPositions(newFolded);
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
  const allPositions = tableSize === 9 ? POSTFLOP_9MAX : POSTFLOP_6MAX;

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/hands"
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
        >
          Cancel
        </Link>
        <div className="text-sm text-[var(--muted)]">
          {step.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="section-header">Table</div>
              <div className="flex gap-2">
                {[6, 9].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTableSize(size as 6 | 9)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
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
                  <option key={b} value={b}>
                    {b}
                  </option>
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

          <CardPicker
            label="Your Hole Cards"
            selectedCards={heroCards}
            onSelect={setHeroCards}
            maxCards={2}
          />

          <div>
            <div className="section-header">Your Position</div>
            <PositionPicker
              selected={heroPosition}
              onSelect={setHeroPosition}
              tableSize={tableSize}
            />
          </div>

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
          <h2 className="text-lg font-semibold">Who else is in the hand?</h2>
          <p className="text-sm text-[var(--muted)]">
            Select all positions that are involved in this hand
          </p>

          {/* Position grid */}
          <div className="grid grid-cols-3 gap-2">
            {allPositions
              .filter((pos) => pos !== heroPosition)
              .map((pos) => {
                const isSelected = villainPositions.has(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      const newSet = new Set(villainPositions);
                      if (isSelected) {
                        newSet.delete(pos);
                      } else {
                        newSet.add(pos);
                      }
                      setVillainPositions(newSet);
                    }}
                    className={`py-3 rounded-lg font-medium text-sm ${
                      isSelected
                        ? "bg-[var(--danger)] text-white"
                        : "bg-[var(--card)] border border-[var(--card-border)]"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
          </div>

          {/* Hero indicator */}
          <div className="card border-[var(--primary)]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[var(--primary)]">{heroPosition}</span>
              <span className="text-xs text-[var(--muted)]">HERO</span>
              <CardDisplay cards={heroCards} size="sm" />
            </div>
          </div>

          {/* Selected villains with stack inputs */}
          {villainPositions.size > 0 && (
            <div className="space-y-2">
              <div className="section-header">Villain Stacks (optional)</div>
              {[...villainPositions].map((pos) => (
                <div key={pos} className="flex items-center gap-3">
                  <span className="font-medium w-16">{pos}</span>
                  <input
                    type="number"
                    value={villainStacks[pos] || ""}
                    onChange={(e) =>
                      setVillainStacks({
                        ...villainStacks,
                        [pos]: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="$ Stack"
                    className="flex-1"
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Preflop Action */}
      {step === "preflop" &&
        renderActionStreet("Preflop", preflopOrder, preflopAction, setPreflopAction, allTablePositions, preflopPot, true)}

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
      {step === "flop-action" &&
        renderActionStreet("Flop", postflopOrder, flopAction, setFlopAction, allTablePositions, flopPot)}

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
      {step === "turn-action" &&
        renderActionStreet("Turn", postflopOrder, turnAction, setTurnAction, allTablePositions, turnPot)}

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
      {step === "river-action" &&
        renderActionStreet("River", postflopOrder, riverAction, setRiverAction, allTablePositions, riverPot)}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Result</h2>
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--primary)] text-white">
              Final Pot: ${(river.length > 0 ? riverPot : turn.length > 0 ? turnPot : flop.length > 0 ? flopPot : preflopPot).toFixed(0)}
            </div>
          </div>

          {/* Final board */}
          {flop.length > 0 && (
            <div className="flex items-center gap-2 justify-center p-3 bg-[var(--card)] rounded-lg">
              <CardDisplay cards={flop} size="md" />
              {turn.length > 0 && <CardDisplay cards={turn} size="md" />}
              {river.length > 0 && <CardDisplay cards={river} size="md" />}
            </div>
          )}

          {/* Villain showdown cards */}
          {[...villainPositions].filter((pos) => !foldedPositions.has(pos)).length > 0 && (
            <div className="card">
              <div className="section-header">Villain Cards (at showdown)</div>
              <div className="space-y-3">
                {[...villainPositions]
                  .filter((pos) => !foldedPositions.has(pos))
                  .map((pos) => (
                    <div key={pos}>
                      <div className="text-sm text-[var(--muted)] mb-1">{pos}</div>
                      <CardPicker
                        selectedCards={villainCards[pos] || []}
                        onSelect={(cards) =>
                          setVillainCards({ ...villainCards, [pos]: cards })
                        }
                        maxCards={2}
                        disabledCards={allUsedCards.filter(
                          (c) => !(villainCards[pos] || []).includes(c)
                        )}
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
                className={`flex-1 py-3 rounded-lg font-semibold text-sm ${
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

          {/* Pot & Profit - Auto-calculated */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Pot Size</div>
              <div className="p-3 bg-[var(--card)] rounded-lg text-center font-semibold">
                ${finalPot.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Your Profit</div>
              <div className={`p-3 rounded-lg text-center font-semibold ${
                calculatedProfit > 0
                  ? "bg-[var(--primary-bg)] text-[var(--primary)]"
                  : calculatedProfit < 0
                  ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                  : "bg-[var(--card)]"
              }`}>
                {calculatedProfit >= 0 ? "+" : ""}${calculatedProfit.toFixed(0)}
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--muted)] text-center">
            You put in ${heroContribution.toFixed(0)} → {result === "won" ? "Won" : result === "lost" ? "Lost" : "Split"} ${finalPot.toFixed(0)} pot
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
                (step === "players" && villainPositions.size < 1) ||
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
