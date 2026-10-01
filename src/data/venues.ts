import defaultVenueStateData from "./defaultVenueState.json";
import { generateMultiTierHallSeats } from "./generateMultiTierHall";
import { DEFAULT_TARIFFS } from "./generateHall";
import type { AppState, Venue } from "../types";
import { normalizeImportedState } from "../utils/stateNormalization";

export const VENUE_CONFIG = [
  { id: "venue-5", name: "Площадка 5", layoutId: "multi-tier-hall", layoutRevision: 2 },
] as const;

export const cloneVenue = (venue: Venue): Venue => ({
  ...venue,
  seats: venue.seats.map((seat) => ({ ...seat })),
  tariffs: venue.tariffs.map((tariff) => ({ ...tariff })),
  salesPlan: { ...venue.salesPlan },
});

export const createDefaultVenue = (
  id: string,
  name: string,
): Venue => {
  const config = VENUE_CONFIG[0];
  const hallState = normalizeImportedState(
    defaultVenueStateData.venue,
    generateMultiTierHallSeats(),
    DEFAULT_TARIFFS,
  );

  return {
    id,
    name,
    layoutId: config.layoutId,
    layoutRevision: config.layoutRevision,
    ...hallState,
  };
};

export const createDefaultAppState = (): AppState => ({
  version: 2,
  activeVenueId: VENUE_CONFIG[0].id,
  venues: VENUE_CONFIG.map(({ id, name }) => createDefaultVenue(id, name)),
});
