import type { Seat, Tariff } from "../types";
import { formatCurrency } from "../utils/finance";

type TariffPanelProps = {
  activeTariffId: string;
  seats: Seat[];
  selectedSeatIds: string[];
  tariffs: Tariff[];
  onActiveTariffChange: (tariffId: string) => void;
  onAssignTariff: (tariffId: string) => void;
  onAddTariff: () => void;
  onRemoveTariff: (tariffId: string) => void;
  onUpdateTariff: (tariffId: string, patch: Partial<Tariff>) => void;
};

export function TariffPanel({
  activeTariffId,
  seats,
  selectedSeatIds,
  tariffs,
  onActiveTariffChange,
  onAssignTariff,
  onAddTariff,
  onRemoveTariff,
  onUpdateTariff,
}: TariffPanelProps) {
  const totalSeats = seats.length;

  return (
    <section className="sidebar-card">
      <div className="sidebar-card__header">
        <div>
          <p className="sidebar-card__eyebrow">Тарифы</p>
          <h2>Управление цветами, ценами и назначениями</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onAddTariff}>
          Добавить тариф
        </button>
      </div>

      <button
        className="primary-button"
        type="button"
        disabled={selectedSeatIds.length === 0}
        onClick={() => onAssignTariff(activeTariffId)}
      >
        Назначить выбранным
      </button>

      <div className="tariff-list">
        {tariffs.map((tariff) => {
          const count = seats.filter((seat) => seat.tariffId === tariff.id).length;
          const percentage = totalSeats === 0 ? 0 : (count / totalSeats) * 100;

          return (
            <div
              key={tariff.id}
              className={`tariff-item${activeTariffId === tariff.id ? " tariff-item--active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                onActiveTariffChange(tariff.id);
                if (selectedSeatIds.length > 0) {
                  onAssignTariff(tariff.id);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActiveTariffChange(tariff.id);
                  if (selectedSeatIds.length > 0) {
                    onAssignTariff(tariff.id);
                  }
                }
              }}
            >
              <span className="tariff-swatch" style={{ backgroundColor: tariff.color }} />
              <div className="tariff-item__body">
                <input
                  className="tariff-name-input"
                  type="text"
                  value={tariff.name}
                  onChange={(event) =>
                    onUpdateTariff(tariff.id, { name: event.target.value })
                  }
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="tariff-meta">
                  {count} мест · {percentage.toFixed(1)}% · {formatCurrency(tariff.price)}
                </span>
                <label className="tariff-price-field">
                  <span>Цена, ₽</span>
                  <input
                    className="tariff-price-input"
                    type="number"
                    min={0}
                    step={100}
                    value={tariff.price}
                    onChange={(event) =>
                      onUpdateTariff(tariff.id, {
                        price: Number(event.target.value || 0),
                      })
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </label>
              </div>
              <input
                className="tariff-color-input"
                type="color"
                value={tariff.color}
                aria-label={`Цвет для ${tariff.name}`}
                onChange={(event) =>
                  onUpdateTariff(tariff.id, { color: event.target.value })
                }
                onClick={(event) => event.stopPropagation()}
              />
              <button
                className="tariff-delete"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveTariff(tariff.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
