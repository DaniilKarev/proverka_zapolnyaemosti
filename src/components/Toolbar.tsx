import { useRef } from "react";

type ToolbarProps = {
  selectedSeatsCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
};

export function Toolbar({
  selectedSeatsCount,
  onClearSelection,
  onExport,
  onImport,
  onReset,
}: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="toolbar">
      <button
        className="secondary-button"
        type="button"
        disabled={selectedSeatsCount === 0}
        onClick={onClearSelection}
      >
        Снять выделение
      </button>
      <button className="secondary-button" type="button" onClick={onExport}>
        Экспорт JSON
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        Импорт JSON
      </button>
      <button className="secondary-button secondary-button--danger" type="button" onClick={onReset}>
        Сбросить
      </button>
      <input
        ref={inputRef}
        hidden
        accept="application/json"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImport(file);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}
