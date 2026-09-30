import { NO_TARIFF_ID } from "./generateHall";
import type { Seat } from "../types";

type SeatGroup = {
  startX: number;
  count: number;
};

export type MaskaRowDefinition = {
  row: number;
  y: number;
  groups: SeatGroup[];
  leftLabelX: number;
  rightLabelX: number;
};

export const MASKA_HALL_VIEW_BOX = {
  width: 1806,
  height: 982,
} as const;

const SEAT_STEP = 30.6;

export const MASKA_BALCONY_ROWS: MaskaRowDefinition[] = [
  {
    row: 5,
    y: 116,
    groups: [{ startX: 303.5, count: 40 }],
    leftLabelX: 278,
    rightLabelX: 1520,
  },
  {
    row: 4,
    y: 150,
    groups: [{ startX: 303, count: 40 }],
    leftLabelX: 278,
    rightLabelX: 1520,
  },
  {
    row: 3,
    y: 183,
    groups: [{ startX: 303, count: 40 }],
    leftLabelX: 278,
    rightLabelX: 1520,
  },
  {
    row: 2,
    y: 218,
    groups: [{ startX: 334, count: 38 }],
    leftLabelX: 306,
    rightLabelX: 1492,
  },
  {
    row: 1,
    y: 251,
    groups: [{ startX: 364, count: 36 }],
    leftLabelX: 337,
    rightLabelX: 1463,
  },
];

export const MASKA_PARTER_ROWS: MaskaRowDefinition[] = [
  {
    row: 12,
    y: 404,
    groups: [
      { startX: 334, count: 11 },
      { startX: 1160, count: 11 },
    ],
    leftLabelX: 306,
    rightLabelX: 1498,
  },
  ...[
    [11, 438],
    [10, 471],
    [9, 504],
    [8, 538],
    [7, 572],
  ].map(([row, y]) => ({
    row,
    y,
    groups: [{ startX: 334, count: 38 }],
    leftLabelX: 306,
    rightLabelX: 1498,
  })),
  {
    row: 6,
    y: 606,
    groups: [{ startX: 395, count: 34 }],
    leftLabelX: 367,
    rightLabelX: 1437,
  },
  ...[
    [5, 639],
    [4, 673],
    [3, 706],
    [2, 740],
    [1, 774],
  ].map(([row, y]) => ({
    row,
    y,
    groups: [{ startX: 425.5, count: 32 }],
    leftLabelX: 398,
    rightLabelX: 1406,
  })),
];

const generateRows = (
  section: string,
  idPrefix: string,
  rows: MaskaRowDefinition[],
): Seat[] =>
  rows.flatMap(({ row, y, groups }) => {
    let seatNumber = 0;

    return groups.flatMap(({ startX, count }) =>
      Array.from({ length: count }, (_, index) => {
        seatNumber += 1;
        return {
          id: `${idPrefix}-r${row}-s${seatNumber}`,
          section,
          row,
          seat: seatNumber,
          x: startX + index * SEAT_STEP,
          y,
          tariffId: NO_TARIFF_ID,
        };
      }),
    );
  });

const generateBoxSeats = (
  section: string,
  idPrefix: string,
  x: number,
): Seat[] =>
  [297, 328, 358].map((y, index) => ({
    id: `${idPrefix}-r1-s${index + 1}`,
    section,
    row: 1,
    seat: index + 1,
    x,
    y,
    tariffId: NO_TARIFF_ID,
  }));

export const generateMaskaHallSeats = (): Seat[] => [
  ...generateRows("Балкон", "maska-balcony", MASKA_BALCONY_ROWS),
  ...generateBoxSeats("Левая ложа", "maska-left-box", 117),
  ...generateBoxSeats("Правая ложа", "maska-right-box", 1683),
  ...generateRows("Партер", "maska-parter", MASKA_PARTER_ROWS),
];
