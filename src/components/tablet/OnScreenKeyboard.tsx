import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnScreenKeyboardProps {
  mode: "alpha" | "numeric";
  onKey: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const ALPHA_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const NUM_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0"],
];

export function OnScreenKeyboard({ mode, onKey, onBackspace, onClear }: OnScreenKeyboardProps) {
  const isNumeric = mode === "numeric";
  const rows = isNumeric ? NUM_ROWS : ALPHA_ROWS;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 w-full",
        isNumeric && "max-w-md mx-auto",
      )}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-3 justify-center w-full">
          {row.map((k) => (
            <KeyButton key={k} onClick={() => onKey(k)} wide={isNumeric}>
              {k}
            </KeyButton>
          ))}
        </div>
      ))}
      <div className="flex gap-3 justify-center w-full mt-2">
        <KeyButton onClick={onClear} variant="muted">
          Clear
        </KeyButton>
        <KeyButton onClick={onBackspace} variant="muted" wide>
          <Delete className="h-6 w-6" />
        </KeyButton>
      </div>
    </div>
  );
}

function KeyButton({
  children,
  onClick,
  wide,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  wide?: boolean;
  variant?: "default" | "muted";
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "h-16 min-w-16 text-2xl font-semibold rounded-xl shadow-sm select-none",
        wide && "min-w-24 px-6",
        variant === "default" && "bg-card hover:bg-accent text-foreground border border-border",
        variant === "muted" && "bg-muted hover:bg-muted/80 text-muted-foreground",
      )}
    >
      {children}
    </Button>
  );
}
