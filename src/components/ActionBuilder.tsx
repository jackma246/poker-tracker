"use client";

import { useState } from "react";

export interface Action {
  player: "hero" | "villain" | "other";
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in";
  amount?: number;
}

interface ActionBuilderProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
  street: string;
  potSize?: number;
}

const ACTION_TYPES = [
  { id: "fold", label: "Fold", color: "var(--danger)", needsAmount: false },
  { id: "check", label: "Check", color: "var(--muted)", needsAmount: false },
  { id: "call", label: "Call", color: "var(--primary)", needsAmount: true },
  { id: "bet", label: "Bet", color: "var(--primary)", needsAmount: true },
  { id: "raise", label: "Raise", color: "#f59e0b", needsAmount: true },
  { id: "all-in", label: "All-In", color: "#ef4444", needsAmount: true },
] as const;

const PLAYERS = [
  { id: "hero", label: "Hero" },
  { id: "villain", label: "Villain" },
  { id: "other", label: "Other" },
] as const;

export default function ActionBuilder({
  actions,
  onChange,
  street,
  potSize,
}: ActionBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAction, setNewAction] = useState<Partial<Action>>({ player: "hero" });

  function addAction() {
    if (!newAction.player || !newAction.action) return;

    const action: Action = {
      player: newAction.player as Action["player"],
      action: newAction.action as Action["action"],
      amount: newAction.amount,
    };

    onChange([...actions, action]);
    setNewAction({ player: "hero" });
    setIsAdding(false);
  }

  function removeAction(index: number) {
    onChange(actions.filter((_, i) => i !== index));
  }

  const selectedActionType = ACTION_TYPES.find((a) => a.id === newAction.action);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold">{street}</h4>
        {potSize && <span className="text-sm text-[var(--muted)]">Pot: ${potSize}</span>}
      </div>

      {/* Action list */}
      {actions.length > 0 && (
        <div className="space-y-2 mb-3">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[var(--background)] rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{action.player}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-black"
                  style={{
                    backgroundColor: ACTION_TYPES.find((a) => a.id === action.action)?.color,
                  }}
                >
                  {action.action.toUpperCase()}
                </span>
                {action.amount && <span className="text-sm">${action.amount}</span>}
              </div>
              <button
                type="button"
                onClick={() => removeAction(i)}
                className="text-[var(--muted)] hover:text-[var(--danger)] text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add action UI */}
      {isAdding ? (
        <div className="space-y-3 p-3 bg-[var(--background)] rounded-lg">
          {/* Player select */}
          <div className="flex gap-2">
            {PLAYERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setNewAction({ ...newAction, player: p.id })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newAction.player === p.id
                    ? "bg-[var(--primary)] text-black"
                    : "bg-[var(--card)] border border-[var(--card-border)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action select */}
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setNewAction({ ...newAction, action: a.id, amount: undefined })}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  newAction.action === a.id ? "scale-105 text-black" : "text-white"
                }`}
                style={{
                  backgroundColor: newAction.action === a.id ? a.color : "var(--card)",
                  borderWidth: 1,
                  borderColor: a.color,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Amount input */}
          {selectedActionType?.needsAmount && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
              <input
                type="number"
                value={newAction.amount || ""}
                onChange={(e) => setNewAction({ ...newAction, amount: parseFloat(e.target.value) || undefined })}
                placeholder="Amount"
                className="pl-7"
                inputMode="numeric"
              />
            </div>
          )}

          {/* Confirm/Cancel */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewAction({ player: "hero" });
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addAction}
              disabled={!newAction.action}
              className="btn btn-primary flex-1"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-2 border-2 border-dashed border-[var(--card-border)] rounded-lg text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          + Add Action
        </button>
      )}
    </div>
  );
}
