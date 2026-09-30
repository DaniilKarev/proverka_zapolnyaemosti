import type { AppState } from "../types";
import { migrateStoredState } from "./stateNormalization";

const STORAGE_KEY = "theatre-hall-tariff-editor-v1";

export const loadAppState = (defaultState: AppState): AppState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const migratedState = migrateStoredState(JSON.parse(raw), defaultState);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
    return migratedState;
  } catch {
    return defaultState;
  }
};

export const saveAppState = (state: AppState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearStoredAppState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};
