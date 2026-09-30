import seatCoordinates from "./multiTierSeatCoordinates.json";
import { NO_TARIFF_ID } from "./generateHall";
import type { Seat } from "../types";

export const MULTI_TIER_HALL_VIEW_BOX = {
  width: 1280,
  height: 1269,
} as const;

type SeatCoordinate = Omit<Seat, "tariffId">;

export const generateMultiTierHallSeats = (): Seat[] =>
  (seatCoordinates as SeatCoordinate[]).map((seat) => ({
    ...seat,
    tariffId: NO_TARIFF_ID,
  }));
