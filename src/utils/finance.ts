import {
  NO_TARIFF_COLOR,
  NO_TARIFF_ID,
  NO_TARIFF_NAME,
  NO_TARIFF_PRICE,
} from "../data/generateHall";
import type { RevenueRow, SalesPlan, Seat, Tariff } from "../types";

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const sanitizePrice = (value: number) => Math.max(0, Math.round(value));

export const sanitizeOccupancyPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value * 10) / 10));

export const formatPercent = (value: number) => {
  const normalized = sanitizeOccupancyPercent(value);
  return Number.isInteger(normalized) ? `${normalized}%` : `${normalized.toFixed(1)}%`;
};

export const buildRevenueRows = (seats: Seat[], tariffs: Tariff[]): RevenueRow[] => {
  const counts = seats.reduce<Record<string, number>>((result, seat) => {
    result[seat.tariffId] = (result[seat.tariffId] ?? 0) + 1;
    return result;
  }, {});

  const editableRows = tariffs.map((tariff) => {
    const seatsCount = counts[tariff.id] ?? 0;
    return {
      id: tariff.id,
      name: tariff.name,
      color: tariff.color,
      price: sanitizePrice(tariff.price),
      seatsCount,
      potentialRevenue: seatsCount * sanitizePrice(tariff.price),
    };
  });

  return [
    ...editableRows,
    {
      id: NO_TARIFF_ID,
      name: NO_TARIFF_NAME,
      color: NO_TARIFF_COLOR,
      price: NO_TARIFF_PRICE,
      seatsCount: counts[NO_TARIFF_ID] ?? 0,
      potentialRevenue: 0,
    },
  ];
};

export const normalizeSalesPlan = (
  salesPlan: SalesPlan,
  seats: Seat[],
  tariffs: Tariff[],
): SalesPlan => {
  const rows = buildRevenueRows(seats, tariffs);

  return rows.reduce<SalesPlan>((result, row) => {
    const rawValue = salesPlan[row.id];
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    const normalizedValue = Math.max(
      0,
      Math.min(row.seatsCount, Math.floor(safeValue)),
    );
    result[row.id] = normalizedValue;
    return result;
  }, {});
};

export const calculateOccupancyPercent = (
  salesPlan: SalesPlan,
  totalSeats: number,
) => {
  if (totalSeats === 0) {
    return 0;
  }

  const totalSoldSeats = Object.values(salesPlan).reduce((sum, value) => sum + value, 0);
  return sanitizeOccupancyPercent((totalSoldSeats / totalSeats) * 100);
};

export const distributeSalesPlanByOccupancy = (
  occupancyPercent: number,
  seats: Seat[],
  tariffs: Tariff[],
): SalesPlan => {
  const rows = buildRevenueRows(seats, tariffs).filter((row) => row.seatsCount > 0);
  const totalSeats = seats.length;

  if (totalSeats === 0 || rows.length === 0) {
    return normalizeSalesPlan({}, seats, tariffs);
  }

  const targetSoldSeats = Math.min(
    totalSeats,
    Math.max(
      0,
      Math.round((sanitizeOccupancyPercent(occupancyPercent) / 100) * totalSeats),
    ),
  );

  const basePlan: SalesPlan = {};
  const remainders = rows.map((row) => {
    const exactShare = (row.seatsCount / totalSeats) * targetSoldSeats;
    const baseSoldSeats = Math.floor(exactShare);
    basePlan[row.id] = Math.min(row.seatsCount, baseSoldSeats);

    return {
      id: row.id,
      remainder: exactShare - baseSoldSeats,
      capacityLeft: row.seatsCount - basePlan[row.id],
      seatsCount: row.seatsCount,
    };
  });

  let seatsLeftToDistribute =
    targetSoldSeats - Object.values(basePlan).reduce((sum, value) => sum + value, 0);

  remainders
    .sort((left, right) => {
      if (right.remainder !== left.remainder) {
        return right.remainder - left.remainder;
      }

      return right.seatsCount - left.seatsCount;
    })
    .forEach((row) => {
      if (seatsLeftToDistribute <= 0 || row.capacityLeft <= 0) {
        return;
      }

      basePlan[row.id] += 1;
      seatsLeftToDistribute -= 1;
    });

  return normalizeSalesPlan(basePlan, seats, tariffs);
};
