import type { SalesPlan, Seat, Tariff } from "../types";
import { buildRevenueRows, formatCurrency, formatPercent } from "../utils/finance";

type RevenuePanelProps = {
  venueName: string;
  occupancyPercent: number;
  salesPlan: SalesPlan;
  seats: Seat[];
  tariffs: Tariff[];
  onOccupancyChange: (occupancyPercent: number) => void;
  onSalesPlanChange: (tariffId: string, soldSeats: number) => void;
};

export function RevenuePanel({
  venueName,
  occupancyPercent,
  salesPlan,
  seats,
  tariffs,
  onOccupancyChange,
  onSalesPlanChange,
}: RevenuePanelProps) {
  const rows = buildRevenueRows(seats, tariffs);
  const totalSeats = seats.length;
  const totalSoldSeats = rows.reduce(
    (sum, row) => sum + (salesPlan[row.id] ?? 0),
    0,
  );
  const totalRevenue = rows.reduce(
    (sum, row) => sum + (salesPlan[row.id] ?? 0) * row.price,
    0,
  );
  const averageCheck = totalSoldSeats === 0 ? 0 : totalRevenue / totalSoldSeats;

  return (
    <section className="revenue-panel">
      <div className="revenue-panel__header">
        <div>
          <p className="sidebar-card__eyebrow">Финансы · {venueName}</p>
          <h2>Расчёт выручки</h2>
        </div>
        <div className="revenue-panel__hero">
          <span>Потенциальная выручка зала</span>
          <strong>
            {formatCurrency(
              rows.reduce((sum, row) => sum + row.potentialRevenue, 0),
            )}
          </strong>
        </div>
      </div>

      <div className="occupancy-slider">
        <div className="occupancy-slider__header">
          <span>Заполняемость зала</span>
          <strong>{formatPercent(occupancyPercent)}</strong>
        </div>
        <input
          className="occupancy-slider__input"
          type="range"
          min={0}
          max={100}
          step={1}
          value={occupancyPercent}
          onChange={(event) => onOccupancyChange(Number(event.target.value))}
        />
        <p className="occupancy-slider__meta">
          Продано {totalSoldSeats} из {totalSeats} мест
        </p>
      </div>

      <div className="revenue-table-shell">
        <table className="revenue-table">
          <thead>
            <tr>
              <th>Тариф</th>
              <th>Мест в зале</th>
              <th>Цена</th>
              <th>Продано</th>
              <th>Выручка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const soldSeats = salesPlan[row.id] ?? 0;
              const revenue = soldSeats * row.price;

              return (
                <tr key={row.id}>
                  <td>
                    <span className="revenue-tariff">
                      <span
                        className="stats-color"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.name}
                    </span>
                  </td>
                  <td>{row.seatsCount}</td>
                  <td>{formatCurrency(row.price)}</td>
                  <td>
                    <input
                      className="revenue-input"
                      type="number"
                      min={0}
                      max={row.seatsCount}
                      value={soldSeats}
                      onChange={(event) =>
                        onSalesPlanChange(
                          row.id,
                          Number(event.target.value || 0),
                        )
                      }
                    />
                  </td>
                  <td>{formatCurrency(revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="revenue-summary">
        <div className="revenue-summary__card">
          <span>Продано мест</span>
          <strong>
            {totalSoldSeats} из {totalSeats}
          </strong>
        </div>
        <div className="revenue-summary__card">
          <span>Заполняемость</span>
          <strong>{formatPercent(occupancyPercent)}</strong>
        </div>
        <div className="revenue-summary__card">
          <span>Итоговая выручка</span>
          <strong>{formatCurrency(totalRevenue)}</strong>
        </div>
        <div className="revenue-summary__card">
          <span>Средний чек</span>
          <strong>{formatCurrency(averageCheck)}</strong>
        </div>
      </div>
    </section>
  );
}
