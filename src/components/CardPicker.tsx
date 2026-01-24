"use client";

import { useState } from "react";

const SUITS = ["s", "h", "d", "c"] as const;
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_CLASSES: Record<string, string> = {
  s: "spade",
  h: "heart",
  d: "diamond",
  c: "club",
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

  return (
    <div>
      {label && <div className="section-header">{label}</div>}

      {/* Selected cards display / trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full p-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--muted)] transition-all flex items-center gap-2 min-h-[56px]"
      >
        {selectedCards.length > 0 ? (
          <div className="flex gap-1.5">
            {selectedCards.map((card) => (
              <PokerCard key={card} card={card} size="md" />
            ))}
          </div>
        ) : (
          <span className="text-[var(--muted)] text-sm">
            Tap to select {maxCards === 1 ? "card" : `${maxCards} cards`}
          </span>
        )}
      </button>

      {/* Card picker modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-end sm:items-center justify-center z-50 animate-in">
          <div className="bg-[var(--background)] w-full max-w-md max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--card-border)] p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold">{label || "Select Cards"}</div>
                <div className="text-xs text-[var(--muted)]">
                  {selectedCards.length}/{maxCards} selected
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {/* Selected preview */}
            {selectedCards.length > 0 && (
              <div className="p-4 border-b border-[var(--card-border)] flex gap-2 justify-center">
                {selectedCards.map((card) => (
                  <PokerCard key={card} card={card} size="lg" selected />
                ))}
              </div>
            )}

            {/* Card grid */}
            <div className="p-4 space-y-2">
              {SUITS.map((suit) => (
                <div key={suit} className="flex gap-1 justify-center">
                  {RANKS.map((rank) => {
                    const card = `${rank}${suit}`;
                    const isSelected = selectedCards.includes(card);
                    const isDisabled = disabledCards.includes(card);

                    return (
                      <button
                        key={card}
                        type="button"
                        onClick={() => toggleCard(card)}
                        disabled={isDisabled}
                        className={`poker-card w-[26px] h-[36px] text-[11px] ${SUIT_CLASSES[suit]} ${
                          isSelected ? "selected" : ""
                        } ${isDisabled ? "disabled" : "hover:scale-110"} transition-transform`}
                      >
                        <span className="leading-none">{rank}</span>
                        <span className="text-[9px] leading-none">{SUIT_SYMBOLS[suit]}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Done button */}
            <div className="sticky bottom-0 p-4 bg-[var(--background)] border-t border-[var(--card-border)]">
              <button onClick={() => setIsOpen(false)} className="btn btn-primary w-full">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable poker card display component
export function PokerCard({
  card,
  size = "sm",
  selected = false,
}: {
  card: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}) {
  const rank = card[0];
  const suit = card[1];

  const sizeClasses = {
    sm: "w-6 h-8 text-[10px]",
    md: "w-8 h-11 text-xs",
    lg: "w-11 h-[60px] text-base",
  };

  return (
    <div
      className={`poker-card ${sizeClasses[size]} ${SUIT_CLASSES[suit]} ${selected ? "selected" : ""}`}
    >
      <span className="leading-none">{rank}</span>
      <span className={size === "lg" ? "text-sm" : "text-[8px]"}>{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}

// Card display for lists (showing multiple cards inline)
export function CardDisplay({ cards, size = "sm" }: { cards: string[]; size?: "sm" | "md" }) {
  return (
    <div className="flex gap-1">
      {cards.map((card) => (
        <PokerCard key={card} card={card} size={size} />
      ))}
    </div>
  );
}
