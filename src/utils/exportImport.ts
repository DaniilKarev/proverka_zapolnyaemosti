import type { AppState, ExportedVenueState, Venue } from "../types";
import {
  isObject,
  normalizeFullAppState,
  normalizeVenue,
  withoutRemovedSection,
} from "./stateNormalization";

export type ImportedState =
  | { kind: "all-venues"; state: AppState }
  | { kind: "single-venue"; venue: Venue };

const downloadJson = (payload: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const sanitizeFilename = (name: string) => {
  const normalized = name
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "venue";
};

export const exportCurrentVenue = (venue: Venue) => {
  downloadJson(
    buildCurrentVenueExport(venue),
    `${sanitizeFilename(venue.name)}.json`,
  );
};

export const buildCurrentVenueExport = (venue: Venue): ExportedVenueState => ({
  version: 2,
  venue: withoutRemovedSection(venue),
});

export const exportAllVenues = (state: AppState) => {
  downloadJson(buildAllVenuesExport(state), "theatre-venues.json");
};

export const buildAllVenuesExport = (state: AppState): AppState => ({
  version: 2,
  activeVenueId: state.activeVenueId,
  venues: state.venues.map(withoutRemovedSection),
});

export const importStateFromFile = async (
  file: File,
  defaultState: AppState,
): Promise<ImportedState> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error("Файл не является корректным JSON.");
  }

  if (!isObject(parsed)) {
    throw new Error("В JSON отсутствуют данные площадки.");
  }

  if (Array.isArray(parsed.venues)) {
    return {
      kind: "all-venues",
      state: normalizeFullAppState(parsed, defaultState),
    };
  }

  const fallbackVenue = defaultState.venues[0];
  if (!fallbackVenue) {
    throw new Error("Не удалось подготовить стартовую схему для импорта.");
  }

  if (isObject(parsed.venue)) {
    return {
      kind: "single-venue",
      venue: normalizeVenue(
        parsed.venue,
        fallbackVenue,
        "imported-venue",
        "Импортированная площадка",
      ),
    };
  }

  return {
    kind: "single-venue",
    venue: normalizeVenue(
      parsed,
      fallbackVenue,
      "imported-venue",
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : "Импортированная площадка",
    ),
  };
};
