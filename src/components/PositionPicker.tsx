"use client";

interface PositionPickerProps {
  selected: string;
  onSelect: (position: string) => void;
  tableSize?: 6 | 9;
  label?: string;
}

const POSITIONS_9MAX = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"];
const POSITIONS_6MAX = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];

// Position angles around a table (starting from bottom = BTN)
const POSITION_ANGLES_9: Record<string, number> = {
  BTN: 270,
  SB: 310,
  BB: 350,
  UTG: 30,
  "UTG+1": 60,
  MP: 90,
  "MP+1": 120,
  HJ: 150,
  CO: 200,
};

const POSITION_ANGLES_6: Record<string, number> = {
  BTN: 270,
  SB: 320,
  BB: 20,
  UTG: 70,
  HJ: 130,
  CO: 200,
};

export default function PositionPicker({
  selected,
  onSelect,
  tableSize = 9,
  label,
}: PositionPickerProps) {
  const positions = tableSize === 9 ? POSITIONS_9MAX : POSITIONS_6MAX;
  const angles = tableSize === 9 ? POSITION_ANGLES_9 : POSITION_ANGLES_6;

  return (
    <div>
      {label && <label className="block text-sm mb-2">{label}</label>}

      {/* Visual table */}
      <div className="relative w-full aspect-[2/1] max-w-xs mx-auto">
        {/* Table oval */}
        <div className="absolute inset-4 rounded-full bg-[#1a472a] border-4 border-[#2d5a3d]" />
        <div className="absolute inset-6 rounded-full border-2 border-[#3d7a5d]/50" />

        {/* Dealer button indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-[#3d7a5d]/70">
          DEALER
        </div>

        {/* Position buttons */}
        {positions.map((pos) => {
          const angle = (angles[pos] * Math.PI) / 180;
          const radiusX = 45;
          const radiusY = 40;
          const x = 50 + radiusX * Math.cos(angle);
          const y = 50 + radiusY * Math.sin(angle);
          const isSelected = selected === pos;

          return (
            <button
              key={pos}
              type="button"
              onClick={() => onSelect(pos)}
              className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? "bg-[var(--primary)] text-black scale-110 shadow-lg"
                  : "bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--primary)]"
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
            >
              {pos}
            </button>
          );
        })}
      </div>

      {/* List fallback for accessibility */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {positions.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onSelect(pos)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              selected === pos
                ? "bg-[var(--primary)] text-black"
                : "bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted)]"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
}
