import { NO_TARIFF_ID } from "../data/generateHall";
import type {
  AppState,
  ExportedHallState,
  HallLayoutId,
  SalesPlan,
  Seat,
  Tariff,
  Venue,
} from "../types";
import {
  calculateOccupancyPercent,
  normalizeSalesPlan,
  sanitizeOccupancyPercent,
  sanitizePrice,
} from "./finance";

const FALLBACK_TARIFF_COLOR = "#c6c6c6";

const isHallLayoutId = (value: unknown): value is HallLayoutId =>
  value === "classic" ||
  value === "auditorium-90" ||
  value === "auditorium-314" ||
  value === "theatre-maska" ||
  value === "multi-tier-hall";

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRemovedSection = (section: string) =>
  section.trim().toLocaleLowerCase("ru-RU") === "ложа";

export const createUniqueId = (preferredId: string, usedIds: Set<string>) => {
  const baseId = preferredId.trim() || "item";
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
};

const cloneTariffs = (tariffs: Tariff[]) => tariffs.map((tariff) => ({ ...tariff }));
const cloneSeats = (seats: Seat[]) =>
  seats.filter((seat) => !isRemovedSection(seat.section)).map((seat) => ({ ...seat }));

type TariffExtraction = {
  tariffs: Tariff[];
  tariffIdMap: Map<string, string>;
};

const extractTariffs = (
  rawTariffs: unknown,
  defaultTariffs: Tariff[],
): TariffExtraction => {
  if (!Array.isArray(rawTariffs)) {
    const tariffs = cloneTariffs(defaultTariffs);
    return {
      tariffs,
      tariffIdMap: new Map(tariffs.map((tariff) => [tariff.id, tariff.id])),
    };
  }

  const usedIds = new Set<string>();
  const tariffIdMap = new Map<string, string>();
  const tariffs = rawTariffs.reduce<Tariff[]>((result, value, index) => {
    if (!isObject(value)) {
      return result;
    }

    const rawId =
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `tariff-${index + 1}`;
    const fallback = defaultTariffs.find((tariff) => tariff.id === rawId);
    const id = createUniqueId(rawId, usedIds);
    const name =
      typeof value.name === "string" && value.name.trim()
        ? value.name
        : fallback?.name ?? `Тариф ${index + 1}`;
    const color =
      typeof value.color === "string" && value.color.trim()
        ? value.color
        : fallback?.color ?? FALLBACK_TARIFF_COLOR;
    const price =
      typeof value.price === "number" && Number.isFinite(value.price)
        ? sanitizePrice(value.price)
        : 0;

    if (!tariffIdMap.has(rawId)) {
      tariffIdMap.set(rawId, id);
    }
    result.push({ id, name, color, price });
    return result;
  }, []);

  if (tariffs.length === 0) {
    const fallbackTariffs = cloneTariffs(defaultTariffs);
    return {
      tariffs: fallbackTariffs,
      tariffIdMap: new Map(
        fallbackTariffs.map((tariff) => [tariff.id, tariff.id]),
      ),
    };
  }

  return { tariffs, tariffIdMap };
};

const normalizeTariffId = (
  rawTariffId: unknown,
  tariffIdMap: Map<string, string>,
  allowedTariffIds: Set<string>,
) => {
  if (typeof rawTariffId !== "string") {
    return NO_TARIFF_ID;
  }

  if (rawTariffId === NO_TARIFF_ID) {
    return NO_TARIFF_ID;
  }

  const mappedId = tariffIdMap.get(rawTariffId) ?? rawTariffId;
  return allowedTariffIds.has(mappedId) ? mappedId : NO_TARIFF_ID;
};

const hasCompleteSeatGeometry = (value: Record<string, unknown>) =>
  typeof value.id === "string" &&
  Boolean(value.id.trim()) &&
  typeof value.section === "string" &&
  Number.isFinite(value.row) &&
  Number.isFinite(value.seat) &&
  Number.isFinite(value.x) &&
  Number.isFinite(value.y);

const extractSeats = (
  rawSeats: unknown,
  defaultSeats: Seat[],
  tariffIdMap: Map<string, string>,
  tariffs: Tariff[],
): Seat[] => {
  const allowedTariffIds = new Set(tariffs.map((tariff) => tariff.id));
  const candidates = Array.isArray(rawSeats) ? rawSeats.filter(isObject) : [];
  const completeCandidates = candidates.filter(hasCompleteSeatGeometry);
  const fallbackSeats = cloneSeats(defaultSeats);
  const fallbackSeatIds = new Set(fallbackSeats.map((seat) => seat.id));
  const completeActiveCandidates = completeCandidates.filter(
    (candidate) => !isRemovedSection(candidate.section as string),
  );
  const containsDifferentGeometry = completeActiveCandidates.some(
    (candidate) => !fallbackSeatIds.has(candidate.id as string),
  );
  const containsFullFallbackGeometry =
    fallbackSeats.length > 0 &&
    completeActiveCandidates.length >= fallbackSeats.length;

  if (
    completeActiveCandidates.length > 0 &&
    (containsDifferentGeometry || containsFullFallbackGeometry)
  ) {
    const usedSeatIds = new Set<string>();

    return completeActiveCandidates.reduce<Seat[]>((result, candidate) => {
      const section = candidate.section as string;
      result.push({
        id: createUniqueId((candidate.id as string).trim(), usedSeatIds),
        section,
        row: Math.floor(candidate.row as number),
        seat: Math.floor(candidate.seat as number),
        x: candidate.x as number,
        y: candidate.y as number,
        rotation:
          typeof candidate.rotation === "number" &&
          Number.isFinite(candidate.rotation)
            ? candidate.rotation
            : undefined,
        table:
          typeof candidate.table === "number" && Number.isFinite(candidate.table)
            ? Math.floor(candidate.table)
            : undefined,
        chair:
          typeof candidate.chair === "number" && Number.isFinite(candidate.chair)
            ? Math.floor(candidate.chair)
            : undefined,
        tariffId: normalizeTariffId(
          candidate.tariffId,
          tariffIdMap,
          allowedTariffIds,
        ),
      });
      return result;
    }, []);
  }

  const assignments = new Map<string, string>();
  candidates.forEach((candidate) => {
    if (typeof candidate.id !== "string") {
      return;
    }

    assignments.set(
      candidate.id,
      normalizeTariffId(candidate.tariffId, tariffIdMap, allowedTariffIds),
    );
  });

  return fallbackSeats.map((seat) => ({
    ...seat,
    tariffId:
      assignments.get(seat.id) ??
      normalizeTariffId(seat.tariffId, tariffIdMap, allowedTariffIds),
  }));
};

const extractSalesPlan = (
  rawSalesPlan: unknown,
  tariffIdMap: Map<string, string>,
): SalesPlan => {
  if (!isObject(rawSalesPlan)) {
    return {};
  }

  return Object.entries(rawSalesPlan).reduce<SalesPlan>(
    (result, [rawTariffId, soldSeats]) => {
      if (typeof soldSeats !== "number" || !Number.isFinite(soldSeats)) {
        return result;
      }

      const tariffId =
        rawTariffId === NO_TARIFF_ID
          ? NO_TARIFF_ID
          : tariffIdMap.get(rawTariffId) ?? rawTariffId;
      result[tariffId] = Math.max(0, Math.floor(soldSeats));
      return result;
    },
    {},
  );
};

export const normalizeImportedState = (
  data: unknown,
  defaultSeats: Seat[],
  defaultTariffs: Tariff[],
): ExportedHallState => {
  const payload = isObject(data) ? data : {};
  const { tariffs, tariffIdMap } = extractTariffs(
    payload.tariffs,
    defaultTariffs,
  );
  const seats = extractSeats(payload.seats, defaultSeats, tariffIdMap, tariffs);
  const salesPlan = normalizeSalesPlan(
    extractSalesPlan(payload.salesPlan, tariffIdMap),
    seats,
    tariffs,
  );
  const derivedOccupancy = calculateOccupancyPercent(salesPlan, seats.length);
  const occupancyPercent =
    typeof payload.occupancyPercent === "number" &&
    Number.isFinite(payload.occupancyPercent)
      ? sanitizeOccupancyPercent(payload.occupancyPercent)
      : derivedOccupancy;

  return { tariffs, seats, salesPlan, occupancyPercent };
};

export const normalizeVenue = (
  data: unknown,
  fallbackVenue: Venue,
  fallbackId = fallbackVenue.id,
  fallbackName = fallbackVenue.name,
): Venue => {
  const payload = isObject(data) ? data : {};
  const storedLayoutId = isHallLayoutId(payload.layoutId)
    ? payload.layoutId
    : null;
  const isConfiguredVenue =
    typeof payload.id === "string" && payload.id.trim() === fallbackVenue.id;
  const shouldInstallConfiguredLayout =
    isConfiguredVenue &&
    fallbackVenue.layoutId !== "classic" &&
    storedLayoutId !== fallbackVenue.layoutId;
  const layoutId = shouldInstallConfiguredLayout
    ? fallbackVenue.layoutId
    : storedLayoutId ?? fallbackVenue.layoutId;
  const storedLayoutRevision =
    typeof payload.layoutRevision === "number" &&
    Number.isFinite(payload.layoutRevision)
      ? Math.max(1, Math.floor(payload.layoutRevision))
      : null;
  const shouldInstallLayoutRevision =
    layoutId !== "classic" &&
    fallbackVenue.layoutId === layoutId &&
    (storedLayoutRevision === null ||
      storedLayoutRevision < fallbackVenue.layoutRevision);
  const shouldInstallDefaultLayout =
    shouldInstallConfiguredLayout || shouldInstallLayoutRevision;
  const layoutRevision = shouldInstallDefaultLayout
    ? fallbackVenue.layoutRevision
    : storedLayoutRevision ??
      (fallbackVenue.layoutId === layoutId ? fallbackVenue.layoutRevision : 1);
  const hallPayload = shouldInstallDefaultLayout
    ? {
        ...payload,
        seats: fallbackVenue.seats,
        salesPlan: {},
        occupancyPercent: 0,
      }
    : payload;
  const hallState = normalizeImportedState(
    hallPayload,
    fallbackVenue.seats,
    fallbackVenue.tariffs,
  );

  return {
    id:
      typeof payload.id === "string" && payload.id.trim()
        ? payload.id.trim()
        : fallbackId,
    name:
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : fallbackName,
    layoutId,
    layoutRevision,
    ...hallState,
  };
};

const cloneVenue = (venue: Venue): Venue => ({
  ...venue,
  seats: cloneSeats(venue.seats),
  tariffs: cloneTariffs(venue.tariffs),
  salesPlan: { ...venue.salesPlan },
});

const cloneAppState = (state: AppState): AppState => ({
  version: 2,
  activeVenueId: state.activeVenueId,
  venues: state.venues.map(cloneVenue),
});

const normalizeVersionTwoState = (
  payload: Record<string, unknown>,
  defaultState: AppState,
  appendMissingConfiguredVenues = false,
): AppState => {
  if (!Array.isArray(payload.venues) || payload.venues.length === 0) {
    return cloneAppState(defaultState);
  }

  const usedVenueIds = new Set<string>();
  const venues = payload.venues.reduce<Venue[]>((result, rawVenue, index) => {
    if (!isObject(rawVenue)) {
      return result;
    }

    const requestedVenueId =
      typeof rawVenue.id === "string" ? rawVenue.id.trim() : "";
    const fallbackVenue =
      defaultState.venues.find((venue) => venue.id === requestedVenueId) ??
      defaultState.venues[index] ??
      defaultState.venues[0];
    if (!fallbackVenue) {
      return result;
    }

    const normalized = normalizeVenue(
      rawVenue,
      fallbackVenue,
      `venue-${index + 1}`,
      `Площадка ${index + 1}`,
    );
    normalized.id = createUniqueId(normalized.id, usedVenueIds);
    result.push(normalized);
    return result;
  }, []);

  if (appendMissingConfiguredVenues) {
    defaultState.venues.forEach((defaultVenue) => {
      if (!usedVenueIds.has(defaultVenue.id)) {
        usedVenueIds.add(defaultVenue.id);
        venues.push(cloneVenue(defaultVenue));
      }
    });
  }

  if (venues.length === 0) {
    return cloneAppState(defaultState);
  }

  const requestedActiveId =
    typeof payload.activeVenueId === "string" ? payload.activeVenueId : "";
  const activeVenueId = venues.some((venue) => venue.id === requestedActiveId)
    ? requestedActiveId
    : venues[0].id;

  return { version: 2, activeVenueId, venues };
};

export const migrateStoredState = (
  data: unknown,
  defaultState: AppState,
): AppState => {
  const payload = isObject(data) ? data : {};

  if (Array.isArray(payload.venues)) {
    return normalizeVersionTwoState(payload, defaultState, true);
  }

  const firstDefaultVenue = defaultState.venues[0];
  if (!firstDefaultVenue) {
    return cloneAppState(defaultState);
  }

  const migratedFirstVenue = normalizeVenue(
    payload,
    firstDefaultVenue,
    "venue-1",
    "Площадка 1",
  );
  migratedFirstVenue.id = "venue-1";
  migratedFirstVenue.name = "Площадка 1";

  return {
    version: 2,
    activeVenueId: migratedFirstVenue.id,
    venues: [
      migratedFirstVenue,
      ...defaultState.venues.slice(1).map(cloneVenue),
    ],
  };
};

export const normalizeFullAppState = (
  data: unknown,
  defaultState: AppState,
) => {
  const payload = isObject(data) ? data : {};
  return Array.isArray(payload.venues)
    ? normalizeVersionTwoState(payload, defaultState)
    : migrateStoredState(data, defaultState);
};

export const withoutRemovedSection = (venue: Venue): Venue => ({
  ...cloneVenue(venue),
  seats: cloneSeats(venue.seats),
});
