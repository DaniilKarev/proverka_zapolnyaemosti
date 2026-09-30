import { useRef } from "react";

type ToolbarProps = {
  selectedSeatsCount: number;
  onClearSelection: () => void;
  onExportCurrent: () => void;
  onImport: (file: File) => void;
  onResetCurrent: () => void;
};

export function Toolbar({
  selectedSeatsCount,
  onClearSelection,
  onExportCurrent,
  onImport,
  onResetCurrent,
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
      <button className="secondary-button" type="button" onClick={onExportCurrent}>
        Экспортировать площадку
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        Импорт JSON
      </button>
      <button
        className="secondary-button secondary-button--danger"
        type="button"
        onClick={onResetCurrent}
      >
        Сбросить площадку
      </button>
      <input
        ref={inputRef}
        hidden
        accept="application/json,.json"
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
