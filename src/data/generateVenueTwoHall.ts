import { NO_TARIFF_ID } from "./generateHall";
import type { Seat } from "../types";

type TablePosition = readonly [
  table: number,
  x: number,
  y: number,
  rotation?: number,
];

type RowDefinition = {
  row: number;
  tables: TablePosition[];
};

export type RestaurantTable = {
  id: string;
  row: number;
  table: number;
  x: number;
  y: number;
  rotation: number;
};

export const VENUE_TWO_HALL_VIEW_BOX = {
  width: 834,
  height: 1240,
} as const;

const rows: RowDefinition[] = [
  {
    row: 1,
    tables: [
      [6, 172.1, 1055.8],
      [5, 244.8, 1055.8],
      [4, 315.6, 1056.8],
      [3, 388.4, 1056.8],
      [2, 460.2, 1055.8],
      [1, 532.2, 1055.8],
    ],
  },
  {
    row: 2,
    tables: [
      [13, 142.4, 977.9],
      [12, 214.1, 978.9],
      [11, 285.9, 977.9],
      [10, 357.6, 977.8],
      [9, 429.4, 977.8],
      [8, 501.2, 977.9],
      [7, 568.3, 976.2, 45.6],
    ],
  },
  {
    row: 3,
    tables: [
      [20, 173.1, 900],
      [19, 244.9, 899.9],
      [18, 315.7, 900.9],
      [17, 389.3, 900.9],
      [16, 460.1, 900.9],
      [15, 531.9, 900],
      [14, 598, 898.5, 45.6],
    ],
  },
  {
    row: 4,
    tables: [
      [28, 132.1, 822],
      [27, 203.9, 823],
      [26, 275.6, 822],
      [25, 347.4, 822],
      [24, 419.1, 823],
      [23, 490.8, 822],
      [22, 563.2, 822.8],
      [21, 629, 820.5, 45.6],
    ],
  },
  {
    row: 5,
    tables: [
      [36, 162.8, 745],
      [35, 234.6, 745],
      [34, 306.3, 745.1],
      [33, 378.2, 745],
      [32, 450.6, 745],
      [31, 521.3, 745.1],
      [30, 593.2, 745],
      [29, 660.5, 742.9, 45.6],
    ],
  },
  {
    row: 6,
    tables: [
      [45, 132.1, 667.1],
      [44, 203.7, 667],
      [43, 275.6, 667.1],
      [42, 347.4, 667.1],
      [41, 419.2, 667.1],
      [40, 490.9, 667.1],
      [39, 563.3, 666.2],
      [38, 629, 664.5, 45.6],
      [37, 701, 664.5, 45.6],
    ],
  },
  {
    row: 7,
    tables: [
      [53, 173.2, 589.2],
      [52, 244.8, 589.2],
      [51, 316.6, 589.1],
      [50, 388.4, 589.1],
      [49, 460.3, 589.2],
      [48, 532.3, 589.2],
      [47, 597.6, 589.3, 45],
      [46, 669.5, 588.9, 45.6],
    ],
  },
  {
    row: 8,
    tables: [
      [60, 203.7, 511.3],
      [59, 275.6, 511.2],
      [58, 347.4, 511.2],
      [57, 418.1, 511.2],
      [56, 490.8, 511.3],
      [55, 598, 508.5, 45.6],
      [54, 670, 509.5, 45.6],
    ],
  },
  {
    row: 9,
    tables: [
      [67, 173.1, 433.4],
      [66, 244.7, 433.4],
      [65, 316.5, 433.4],
      [64, 388.5, 433.4],
      [63, 460.3, 433.4],
      [62, 531.9, 433.4],
      [61, 639, 430.5, 45.6],
    ],
  },
  {
    row: 10,
    tables: [
      [73, 203.8, 355.5],
      [72, 275.6, 355.5],
      [71, 347.4, 355.5],
      [70, 419.2, 355.5],
      [69, 490.8, 355.5],
      [68, 560.8, 355.5],
    ],
  },
  {
    row: 11,
    tables: [
      [79, 173.2, 276.6],
      [78, 244.8, 276.7],
      [77, 316.7, 277.6],
      [76, 388.4, 277.6],
      [75, 460.3, 276.6],
      [74, 530.3, 276.6],
    ],
  },
  {
    row: 12,
    tables: [
      [84, 203.7, 198.8],
      [83, 275.6, 198.7],
      [82, 347.4, 198.7],
      [81, 419.2, 198.7],
      [80, 490.8, 198.8],
    ],
  },
  {
    row: 13,
    tables: [
      [90, 172.7, 120.8],
      [89, 244.6, 120.7],
      [88, 316.4, 120.7],
      [87, 388.2, 120.7],
      [86, 459.8, 120.8],
      [85, 531.8, 120.8],
    ],
  },
];

export const VENUE_TWO_TABLES: RestaurantTable[] = rows.flatMap(
  ({ row, tables }) =>
    tables.map(([table, x, y, rotation = 0]) => ({
      id: `restaurant-table-${table}`,
      row,
      table,
      x,
      y,
      rotation,
    })),
);

const getChairPosition = (table: RestaurantTable, chair: number) => {
  const angle = (table.rotation * Math.PI) / 180;
  const offsetX = chair === 1 ? -13.5 : 13.5;
  const offsetY = -23;

  return {
    x: table.x + offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
    y: table.y + offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
  };
};

export const generateVenueTwoHallSeats = (): Seat[] =>
  VENUE_TWO_TABLES.flatMap((table) =>
    [1, 2].map((chair) => {
      const position = getChairPosition(table, chair);

      return {
        id: `restaurant-table-${table.table}-chair-${chair}`,
        section: "Зал",
        row: table.row,
        seat: (table.table - 1) * 2 + chair,
        table: table.table,
        chair,
        x: position.x,
        y: position.y,
        tariffId: NO_TARIFF_ID,
      };
    }),
  );
