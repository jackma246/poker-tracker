"use client";

import { useState } from "react";

const SUITS = ["s", "h", "d", "c"] as const; // spades, hearts, diamonds, clubs
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "#000",
  h: "#ef4444",
  d: "#3b82f6",
  c: "#22c55e",
};

interface CardPickerProps {
  selectedCards: string[];
  onSelect: (cards: string[]) => void;
  maxCards?: number;
  disabledCards?: string[];
  label?: string;
}

export default function CardPicker({
  selectedCards,
  onSelect,
  maxCards = 2,
  disabledCards = [],
  label,
}: CardPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleCard(card: string) {
    if (disabledCards.includes(card)) return;

    if (selectedCards.includes(card)) {
      onSelect(selectedCards.filter((c) => c !== card));
    } else if (selectedCards.length < maxCards) {
      onSelect([...selectedCards, card]);
    }
  }

  function renderCard(card: string, size: "sm" | "lg" = "sm") {
    const rank = card[0];
    const suit = card[1];
    const isSelected = selectedCards.includes(card);
    const isDisabled = disabledCards.includes(card);

    const sizeClasses = size === "lg" ? "w-12 h-16 text-lg" : "w-9 h-12 text-sm";

    return (
      <button
        key={card}
        type="button"
        onClick={() => toggleCard(card)}
        disabled={isDisabled}
        className={`${sizeClasses} rounded-md border-2 font-bold flex flex-col items-center justify-center transition-all ${
          isSelected
            ? "border-[var(--primary)] bg-[var(--primary)]/20 scale-105"
            : isDisabled
            ? "border-[var(--card-border)] opacity-30 cursor-not-allowed"
            : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]"
        }`}
        style={{ color: isDisabled ? "var(--muted)" : SUIT_COLORS[suit] }}
      >
        <span>{rank}</span>
        <span className={size === "lg" ? "text-base" : "text-xs"}>{SUIT_SYMBOLS[suit]}</span>
      </button>
    );
  }

  return (
    <div>
      {label && <label className="block text-sm mb-2">{label}</label>}

      {/* Selected cards display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="card cursor-pointer hover:border-[var(--muted)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {selectedCards.length > 0 ? (
            selectedCards.map((card) => (
              <div
                key={card}
                className="w-10 h-14 rounded-md border-2 border-[var(--primary)] bg-white flex flex-col items-center justify-center font-bold"
                style={{ color: SUIT_COLORS[card[1]] }}
              >
                <span>{card[0]}</span>
                <span className="text-sm">{SUIT_SYMBOLS[card[1]]}</span>
              </div>
            ))
          ) : (
            <span className="text-[var(--muted)]">Tap to select {maxCards} card{maxCards > 1 ? "s" : ""}</span>
          )}
          {selectedCards.length > 0 && selectedCards.length < maxCards && (
            <span className="text-[var(--muted)] text-sm">
              +{maxCards - selectedCards.length} more
            </span>
          )}
        </div>
      </div>

      {/* Card picker modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-2">
          <div className="card w-full max-w-md max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Select Cards ({selectedCards.length}/{maxCards})</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl"
              >
                ×
              </button>
            </div>

            {/* Selected preview */}
            {selectedCards.length > 0 && (
              <div className="flex gap-2 mb-4 pb-4 border-b border-[var(--card-border)]">
                {selectedCards.map((card) => renderCard(card, "lg"))}
              </div>
            )}

            {/* Card grid by suit */}
            <div className="space-y-3">
              {SUITS.map((suit) => (
                <div key={suit} className="flex flex-wrap gap-1">
                  {RANKS.map((rank) => renderCard(`${rank}${suit}`))}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-primary w-full mt-4"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini card display for showing cards inline
export function CardDisplay({ cards, size = "sm" }: { cards: string[]; size?: "sm" | "md" }) {
  const sizeClasses = size === "md" ? "w-8 h-11 text-sm" : "w-6 h-8 text-xs";

  return (
    <div className="flex gap-1">
      {cards.map((card) => (
        <div
          key={card}
          className={`${sizeClasses} rounded border border-[var(--card-border)] bg-white flex flex-col items-center justify-center font-bold`}
          style={{ color: SUIT_COLORS[card[1]] }}
        >
          <span>{card[0]}</span>
          <span className="text-[0.6rem]">{SUIT_SYMBOLS[card[1]]}</span>
        </div>
      ))}
    </div>
  );
}
