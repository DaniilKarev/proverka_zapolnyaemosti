import type { ExportedHallState, SalesPlan, Seat, Tariff } from "../types";
import {
  calculateOccupancyPercent,
  normalizeSalesPlan,
  sanitizePrice,
} from "./finance";

type PartialHallState = Partial<ExportedHallState>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSeatCandidate = (value: unknown): value is Record<string, unknown> => isObject(value);

const isTariffCandidate = (value: unknown): value is Record<string, unknown> => isObject(value);

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

const extractTariffs = (
  rawTariffs: unknown,
  defaultTariffs: Tariff[],
): Tariff[] => {
  if (!Array.isArray(rawTariffs)) {
    return defaultTariffs;
  }

  const tariffs = rawTariffs
    .filter(isTariffCandidate)
    .map((tariff) => mergeTariff(tariff, defaultTariffs))
    .filter((tariff): tariff is Tariff => tariff !== null);

  return tariffs.length > 0 ? tariffs : defaultTariffs;
};

const extractSeatAssignments = (
  rawSeats: unknown,
  defaultSeats: Seat[],
): Map<string, string> => {
  const allowedSeatIds = new Set(defaultSeats.map((seat) => seat.id));
  const seatAssignments = new Map<string, string>();

  if (!Array.isArray(rawSeats)) {
    return seatAssignments;
  }

  rawSeats.filter(isSeatCandidate).forEach((candidate) => {
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.section !== "string" ||
      typeof candidate.tariffId !== "string"
    ) {
      return;
    }

    if (!allowedSeatIds.has(candidate.id)) {
      return;
    }

    seatAssignments.set(candidate.id, candidate.tariffId);
  });

  return seatAssignments;
};

const extractSalesPlan = (rawSalesPlan: unknown): SalesPlan => {
  if (!isObject(rawSalesPlan) || Array.isArray(rawSalesPlan)) {
    return {};
  }

  return Object.entries(rawSalesPlan).reduce<SalesPlan>((result, [tariffId, soldSeats]) => {
    if (typeof soldSeats !== "number" || !Number.isFinite(soldSeats)) {
      return result;
    }

    result[tariffId] = Math.max(0, Math.floor(soldSeats));
    return result;
  }, {});
};

export const normalizeImportedState = (
  data: unknown,
  defaultSeats: Seat[],
  defaultTariffs: Tariff[],
): ExportedHallState => {
  const payload = isObject(data) ? (data as PartialHallState) : {};
  const tariffs = extractTariffs(payload.tariffs, defaultTariffs);
  const seatAssignments = extractSeatAssignments(payload.seats, defaultSeats);

  const seats = defaultSeats.map((seat) => ({
    ...seat,
    tariffId: seatAssignments.get(seat.id) ?? seat.tariffId,
  }));

  const salesPlan = normalizeSalesPlan(extractSalesPlan(payload.salesPlan), seats, tariffs);
  const derivedOccupancy = calculateOccupancyPercent(salesPlan, seats.length);

  return {
    tariffs,
    seats,
    salesPlan,
    occupancyPercent: derivedOccupancy,
  };
};
