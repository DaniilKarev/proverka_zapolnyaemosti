import { useRef } from "react";

type ToolbarProps = {
  selectedSeatsCount: number;
  onClearSelection: () => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
  onImport: (file: File) => void;
  onResetCurrent: () => void;
  onResetAll: () => void;
};

export function Toolbar({
  selectedSeatsCount,
  onClearSelection,
  onExportCurrent,
  onExportAll,
  onImport,
  onResetCurrent,
  onResetAll,
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
        Экспортировать текущую площадку
      </button>
      <button className="secondary-button" type="button" onClick={onExportAll}>
        Экспортировать все площадки
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
        Сбросить текущую площадку
      </button>
      <button
        className="secondary-button secondary-button--danger"
        type="button"
        onClick={onResetAll}
      >
        Сбросить все площадки
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
