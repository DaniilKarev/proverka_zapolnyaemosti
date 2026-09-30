import defaultHallStateData from "./defaultHallState.json";
import { generateMaskaHallSeats } from "./generateMaskaHall";
import { generateMultiTierHallSeats } from "./generateMultiTierHall";
import { DEFAULT_TARIFFS, generateHallSeats } from "./generateHall";
import { generateVenueThreeHallSeats } from "./generateVenueThreeHall";
import { generateVenueTwoHallSeats } from "./generateVenueTwoHall";
import type {
  AppState,
  ExportedHallState,
  HallLayoutId,
  Venue,
} from "../types";
import { normalizeSalesPlan } from "../utils/finance";
import { normalizeImportedState } from "../utils/stateNormalization";

export const VENUE_CONFIG = [
  { id: "venue-1", name: "Площадка 1", layoutId: "classic", layoutRevision: 1 },
  { id: "venue-2", name: "Площадка 2", layoutId: "auditorium-90", layoutRevision: 2 },
  { id: "venue-3", name: "Площадка 3", layoutId: "auditorium-314", layoutRevision: 1 },
  { id: "venue-4", name: "Театр Маска", layoutId: "theatre-maska", layoutRevision: 1 },
  { id: "venue-5", name: "Площадка 5", layoutId: "multi-tier-hall", layoutRevision: 2 },
] as const;

const createBaseHallState = (): ExportedHallState =>
  normalizeImportedState(defaultHallStateData, generateHallSeats(), DEFAULT_TARIFFS);

export const cloneVenue = (venue: Venue): Venue => ({
  ...venue,
  seats: venue.seats.map((seat) => ({ ...seat })),
  tariffs: venue.tariffs.map((tariff) => ({ ...tariff })),
  salesPlan: { ...venue.salesPlan },
});

export const createDefaultVenue = (
  id: string,
  name: string,
  requestedLayoutId?: HallLayoutId,
): Venue => {
  const base = createBaseHallState();
  const layoutId =
    requestedLayoutId ??
    VENUE_CONFIG.find((venue) => venue.id === id)?.layoutId ??
    "classic";
  const layoutRevision =
    VENUE_CONFIG.find((venue) => venue.layoutId === layoutId)?.layoutRevision ??
    1;
  const seats =
    layoutId === "auditorium-90"
      ? generateVenueTwoHallSeats()
      : layoutId === "auditorium-314"
        ? generateVenueThreeHallSeats()
        : layoutId === "theatre-maska"
          ? generateMaskaHallSeats()
          : layoutId === "multi-tier-hall"
            ? generateMultiTierHallSeats()
            : base.seats.map((seat) => ({ ...seat }));
  const salesPlan =
    layoutId !== "classic"
      ? normalizeSalesPlan({}, seats, base.tariffs)
      : { ...base.salesPlan };

  return {
    id,
    name,
    layoutId,
    layoutRevision,
    seats,
    tariffs: base.tariffs.map((tariff) => ({ ...tariff })),
    salesPlan,
    occupancyPercent: layoutId === "classic" ? base.occupancyPercent : 0,
  };
};

export const createDefaultAppState = (): AppState => ({
  version: 2,
  activeVenueId: VENUE_CONFIG[0].id,
  venues: VENUE_CONFIG.map(({ id, name, layoutId }) =>
    createDefaultVenue(id, name, layoutId),
  ),
});
