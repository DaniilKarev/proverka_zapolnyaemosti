import type { Seat, Tariff } from "../types";
import { buildRevenueRows, formatCurrency } from "../utils/finance";

type StatsPanelProps = {
  totalSeats: number;
  selectedSeatsCount: number;
  seats: Seat[];
  tariffs: Tariff[];
};

export function StatsPanel({
  totalSeats,
  selectedSeatsCount,
  seats,
  tariffs,
}: StatsPanelProps) {
  const rows = buildRevenueRows(seats, tariffs);
  const totalPotentialRevenue = rows.reduce(
    (sum, row) => sum + row.potentialRevenue,
    0,
  );
  const averageTicketPrice = totalSeats === 0 ? 0 : totalPotentialRevenue / totalSeats;
  const zeroPriceSeats = rows
    .filter((row) => row.price === 0)
    .reduce((sum, row) => sum + row.seatsCount, 0);
  const paidSeats = rows
    .filter((row) => row.price > 0)
    .reduce((sum, row) => sum + row.seatsCount, 0);
  const paidSeatsPercent = totalSeats === 0 ? 0 : (paidSeats / totalSeats) * 100;

  return (
    <section className="sidebar-card">
      <div className="sidebar-card__header">
        <div>
          <p className="sidebar-card__eyebrow">Статистика</p>
          <h2>Распределение и потенциальная выручка</h2>
        </div>
      </div>

      <div className="stats-overview stats-overview--grid-2">
        <div className="stats-badge">
          <span>Всего мест</span>
          <strong>{totalSeats}</strong>
        </div>
        <div className="stats-badge">
          <span>Выбрано</span>
          <strong>{selectedSeatsCount}</strong>
        </div>
        <div className="stats-badge">
          <span>Потенциальная выручка</span>
          <strong>{formatCurrency(totalPotentialRevenue)}</strong>
        </div>
        <div className="stats-badge">
          <span>Средняя цена билета</span>
          <strong>{formatCurrency(averageTicketPrice)}</strong>
        </div>
        <div className="stats-badge">
          <span>Мест с ценой 0 ₽</span>
          <strong>{zeroPriceSeats}</strong>
        </div>
        <div className="stats-badge">
          <span>Платных мест</span>
          <strong>{paidSeatsPercent.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="stats-table">
        {rows.map((row) => {
          const percent = totalSeats === 0 ? 0 : (row.seatsCount / totalSeats) * 100;

          return (
            <div key={row.id} className="stats-row stats-row--revenue">
              <span className="stats-color" style={{ backgroundColor: row.color }} />
              <div className="stats-row__main">
                <span className="stats-name">{row.name}</span>
                <span className="stats-subline">
                  {row.seatsCount} мест · {percent.toFixed(1)}% · {formatCurrency(row.price)}
                </span>
              </div>
              <span className="stats-revenue">{formatCurrency(row.potentialRevenue)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
