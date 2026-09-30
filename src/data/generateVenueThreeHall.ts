import { NO_TARIFF_ID } from "./generateHall";
import type { Seat } from "../types";

type RowDefinition = {
  row: number;
  y: number;
  startX: number;
  count: number;
};

export const VENUE_THREE_HALL_VIEW_BOX = {
  width: 834,
  height: 1240,
} as const;

const SEAT_STEP = 32.12;

const rows: RowDefinition[] = [
  { row: 1, y: 1030, startX: 194.17, count: 13 },
  { row: 2, y: 985.99, startX: 179.11, count: 14 },
  { row: 3, y: 941.49, startX: 162.03, count: 15 },
  { row: 4, y: 899.5, startX: 151.14, count: 16 },
  { row: 5, y: 856.5, startX: 162.14, count: 16 },
  { row: 6, y: 814, startX: 175.11, count: 16 },
  { row: 7, y: 771, startX: 162.11, count: 16 },
  { row: 8, y: 727.99, startX: 176.11, count: 16 },
  { row: 9, y: 684.5, startX: 162.16, count: 16 },
  { row: 10, y: 642.5, startX: 175.14, count: 16 },
  { row: 11, y: 598.51, startX: 162.14, count: 16 },
  { row: 12, y: 556.02, startX: 175.17, count: 16 },
  { row: 13, y: 513.01, startX: 162.11, count: 16 },
  { row: 14, y: 470.02, startX: 176.13, count: 16 },
  { row: 15, y: 425.51, startX: 162.11, count: 16 },
  { row: 16, y: 383.5, startX: 175.14, count: 16 },
  { row: 17, y: 339.5, startX: 162.14, count: 16 },
  { row: 18, y: 296.99, startX: 175.11, count: 16 },
  { row: 19, y: 254.5, startX: 162.11, count: 16 },
  { row: 20, y: 210.5, startX: 175.14, count: 16 },
];

export const generateVenueThreeHallSeats = (): Seat[] =>
  rows.flatMap(({ row, y, startX, count }) =>
    Array.from({ length: count }, (_, index) => ({
      id: `auditorium-314-r${row}-s${index + 1}`,
      section: "Зал",
      row,
      seat: index + 1,
      x: startX + index * SEAT_STEP,
      y,
      tariffId: NO_TARIFF_ID,
    })),
  );
