"use client";

import { useState, useMemo } from "react";
import { PokerCard } from "./CardPicker";

interface Action {
  player: string;
  action: string;
  amount?: number;
}

interface Villain {
  name: string;
  cards: string[];
  position: string | null;
}

interface Hand {
  heroCards: string[];
  heroPosition: string;
  tableSize: number;
  flop: string[];
  turn: string | null;
  river: string | null;
  villains: Villain[] | null;
  preflopAction: Action[] | null;
  flopAction: Action[] | null;
  turnAction: Action[] | null;
  riverAction: Action[] | null;
  result: string;
}

interface Step {
  type: "deal" | "action" | "flop" | "turn" | "river" | "showdown";
  street: "preflop" | "flop" | "turn" | "river" | "showdown";
  action?: Action;
  description: string;
}

interface Props {
  hand: Hand;
  onClose: () => void;
}

const POSITIONS_9MAX = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"];
const POSITIONS_6MAX = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];

// Position angles around the table (0 = bottom center for hero)
const POSITION_ANGLES_9: Record<string, number> = {
  "BTN": 0, "CO": 40, "HJ": 80, "MP+1": 120, "MP": 160,
  "UTG+1": 200, "UTG": 240, "BB": 280, "SB": 320,
};

const POSITION_ANGLES_6: Record<string, number> = {
  "BTN": 0, "CO": 60, "HJ": 120, "UTG": 180, "BB": 240, "SB": 300,
};

export default function HandReplayer({ hand, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  // Build all steps for the replay
  const steps = useMemo(() => {
    const allSteps: Step[] = [];

    // Step 0: Deal cards
    allSteps.push({
      type: "deal",
      street: "preflop",
      description: `Hero is dealt cards in ${hand.heroPosition}`,
    });

    // Preflop actions
    if (hand.preflopAction) {
      hand.preflopAction.forEach((action) => {
        allSteps.push({
          type: "action",
          street: "preflop",
          action,
          description: formatAction(action),
        });
      });
    }

    // Flop
    if (hand.flop.length > 0) {
      allSteps.push({
        type: "flop",
        street: "flop",
        description: "Flop is dealt",
      });

      if (hand.flopAction) {
        hand.flopAction.forEach((action) => {
          allSteps.push({
            type: "action",
            street: "flop",
            action,
            description: formatAction(action),
          });
        });
      }
    }

    // Turn
    if (hand.turn) {
      allSteps.push({
        type: "turn",
        street: "turn",
        description: "Turn is dealt",
      });

      if (hand.turnAction) {
        hand.turnAction.forEach((action) => {
          allSteps.push({
            type: "action",
            street: "turn",
            action,
            description: formatAction(action),
          });
        });
      }
    }

    // River
    if (hand.river) {
      allSteps.push({
        type: "river",
        street: "river",
        description: "River is dealt",
      });

      if (hand.riverAction) {
        hand.riverAction.forEach((action) => {
          allSteps.push({
            type: "action",
            street: "river",
            action,
            description: formatAction(action),
          });
        });
      }
    }

    // Showdown
    if (hand.villains && hand.villains.length > 0) {
      allSteps.push({
        type: "showdown",
        street: "showdown",
        description: `Showdown - Hero ${hand.result}!`,
      });
    }

    return allSteps;
  }, [hand]);

  const currentStepData = steps[currentStep];

  // Determine what to show based on current step
  const showFlop = currentStep >= steps.findIndex((s) => s.type === "flop");
  const showTurn = currentStep >= steps.findIndex((s) => s.type === "turn");
  const showRiver = currentStep >= steps.findIndex((s) => s.type === "river");
  const showVillains = currentStepData?.type === "showdown";

  const positions = hand.tableSize === 9 ? POSITIONS_9MAX : POSITIONS_6MAX;
  const positionAngles = hand.tableSize === 9 ? POSITION_ANGLES_9 : POSITION_ANGLES_6;

  // Rotate positions so hero is at bottom
  const heroIndex = positions.indexOf(hand.heroPosition);
  const rotatedPositions = [...positions.slice(heroIndex), ...positions.slice(0, heroIndex)];

  function getPositionStyle(index: number) {
    const angle = (index / positions.length) * 360 - 90; // Start from bottom
    const radians = (angle * Math.PI) / 180;
    const radiusX = 42; // % from center
    const radiusY = 38;
    const x = 50 + radiusX * Math.cos(radians);
    const y = 50 + radiusY * Math.sin(radians);
    return { left: `${x}%`, top: `${y}%` };
  }

  function getVillainAtPosition(pos: string): Villain | undefined {
    return hand.villains?.find((v) => v.position === pos);
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
        <div className="text-sm text-[var(--muted)]">
          Step {currentStep + 1} of {steps.length}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Table visualization */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md aspect-[4/3]">
          {/* Table felt */}
          <div className="absolute inset-[10%] rounded-[50%] bg-[#1a5f2a] border-[8px] border-[#8b4513] shadow-xl">
            {/* Table rail pattern */}
            <div className="absolute inset-0 rounded-[50%] border-2 border-[#0d3315] opacity-50" />
          </div>

          {/* Community cards */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
            {showFlop && hand.flop.length > 0 && (
              <>
                {hand.flop.map((card, i) => (
                  <PokerCard key={`flop-${i}`} card={card} size="md" />
                ))}
              </>
            )}
            {showTurn && hand.turn && <PokerCard card={hand.turn} size="md" />}
            {showRiver && hand.river && <PokerCard card={hand.river} size="md" />}
          </div>

          {/* Player positions */}
          {rotatedPositions.map((pos, i) => {
            const isHero = pos === hand.heroPosition;
            const villain = getVillainAtPosition(pos);
            const style = getPositionStyle(i);

            return (
              <div
                key={pos}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={style}
              >
                {/* Position label */}
                <div
                  className={`text-xs font-bold px-2 py-0.5 rounded mb-1 ${
                    isHero
                      ? "bg-[var(--primary)] text-white"
                      : villain
                      ? "bg-[var(--danger)] text-white"
                      : "bg-[var(--card)] text-[var(--muted)]"
                  }`}
                >
                  {isHero ? "HERO" : pos}
                </div>

                {/* Cards */}
                {isHero && (
                  <div className="flex gap-0.5">
                    {hand.heroCards.map((card, ci) => (
                      <PokerCard key={ci} card={card} size="sm" />
                    ))}
                  </div>
                )}
                {villain && showVillains && (
                  <div className="flex gap-0.5">
                    {villain.cards.map((card, ci) => (
                      <PokerCard key={ci} card={card} size="sm" />
                    ))}
                  </div>
                )}
                {villain && !showVillains && (
                  <div className="flex gap-0.5">
                    <div className="w-6 h-8 bg-blue-900 rounded border border-blue-700" />
                    <div className="w-6 h-8 bg-blue-900 rounded border border-blue-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current action description */}
      <div className="p-4 text-center">
        <div
          className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
            currentStepData?.street === "preflop"
              ? "bg-[var(--card)]"
              : currentStepData?.street === "flop"
              ? "bg-blue-900/50"
              : currentStepData?.street === "turn"
              ? "bg-purple-900/50"
              : currentStepData?.street === "river"
              ? "bg-red-900/50"
              : "bg-[var(--primary)]/30"
          }`}
        >
          <span className="text-[var(--muted)] uppercase text-xs mr-2">
            {currentStepData?.street}
          </span>
          {currentStepData?.description}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-[var(--card-border)]">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="btn btn-secondary flex-1"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="btn btn-primary flex-1"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: Action): string {
  const player = action.player;
  const act = action.action;
  const amount = action.amount ? ` $${action.amount}` : "";
  return `${player} ${act}s${amount}`;
}
