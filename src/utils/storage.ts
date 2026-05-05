import type { SalesPlan, Seat, Tariff } from "../types";
import {
  calculateOccupancyPercent,
  normalizeSalesPlan,
  sanitizeOccupancyPercent,
  sanitizePrice,
} from "./finance";

const STORAGE_KEY = "theatre-hall-tariff-editor-v1";

type StoredHallState = {
  seats: Seat[];
  tariffs: Tariff[];
  salesPlan: SalesPlan;
  occupancyPercent: number;
};

const isSeat = (value: unknown): value is Seat => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.section === "string" &&
    typeof candidate.row === "number" &&
    typeof candidate.seat === "number" &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.tariffId === "string"
  );
};

const isTariffCandidate = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSalesPlan = (value: unknown): value is SalesPlan => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (planValue) => typeof planValue === "number" && Number.isFinite(planValue),
  );
};

const mergeTariff = (
  candidate: Record<string, unknown>,
  defaultTariffs: Tariff[],
): Tariff | null => {
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.color !== "string"
  ) {
    return null;
  }

  const fallback = defaultTariffs.find((tariff) => tariff.id === candidate.id);
  const rawPrice =
    typeof candidate.price === "number" && Number.isFinite(candidate.price)
      ? candidate.price
      : fallback?.price ?? 0;

  return {
    id: candidate.id,
    name: candidate.name,
    color: candidate.color,
    price: sanitizePrice(rawPrice),
  };
};

export const loadHallState = (
  defaultSeats: Seat[],
  defaultTariffs: Tariff[],
): StoredHallState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const salesPlan = normalizeSalesPlan({}, defaultSeats, defaultTariffs);
      return {
        seats: defaultSeats,
        tariffs: defaultTariffs,
        salesPlan,
        occupancyPercent: 0,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredHallState>;
    const seats = Array.isArray(parsed.seats) ? parsed.seats.filter(isSeat) : [];
    const tariffs = Array.isArray(parsed.tariffs)
      ? parsed.tariffs
          .filter(isTariffCandidate)
          .map((tariff) => mergeTariff(tariff, defaultTariffs))
          .filter((tariff): tariff is Tariff => tariff !== null)
      : [];
    const salesPlan = isSalesPlan(parsed.salesPlan) ? parsed.salesPlan : {};

    if (seats.length === defaultSeats.length && tariffs.length > 0) {
      const normalizedSalesPlan = normalizeSalesPlan(salesPlan, seats, tariffs);
      return {
        seats,
        tariffs,
        salesPlan: normalizedSalesPlan,
        occupancyPercent:
          typeof parsed.occupancyPercent === "number" && Number.isFinite(parsed.occupancyPercent)
            ? sanitizeOccupancyPercent(parsed.occupancyPercent)
            : calculateOccupancyPercent(normalizedSalesPlan, seats.length),
      };
    }

    const fallbackSalesPlan = normalizeSalesPlan({}, defaultSeats, defaultTariffs);
    return {
      seats: defaultSeats,
      tariffs: defaultTariffs,
      salesPlan: fallbackSalesPlan,
      occupancyPercent: 0,
    };
  } catch {
    const salesPlan = normalizeSalesPlan({}, defaultSeats, defaultTariffs);
    return {
      seats: defaultSeats,
      tariffs: defaultTariffs,
      salesPlan,
      occupancyPercent: 0,
    };
  }
};

export const saveHallState = (
  seats: Seat[],
  tariffs: Tariff[],
  salesPlan: SalesPlan,
  occupancyPercent: number,
) => {
  const payload: StoredHallState = {
    seats,
    tariffs,
    salesPlan,
    occupancyPercent: sanitizeOccupancyPercent(occupancyPercent),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearStoredHallState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};
