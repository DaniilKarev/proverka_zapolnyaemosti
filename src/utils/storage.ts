import type { ExportedHallState, SalesPlan, Seat, Tariff } from "../types";
import { sanitizeOccupancyPercent } from "./finance";
import { normalizeImportedState } from "./stateNormalization";

const STORAGE_KEY = "theatre-hall-tariff-editor-v1";

export const loadHallState = (
  defaultState: ExportedHallState,
): ExportedHallState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    return normalizeImportedState(
      JSON.parse(raw),
      defaultState.seats,
      defaultState.tariffs,
    );
  } catch {
    return defaultState;
  }
};

export const saveHallState = (
  seats: Seat[],
  tariffs: Tariff[],
  salesPlan: SalesPlan,
  occupancyPercent: number,
) => {
  const payload: ExportedHallState = {
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
