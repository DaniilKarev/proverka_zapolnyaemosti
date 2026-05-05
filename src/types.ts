export type Tariff = {
  id: string;
  name: string;
  color: string;
  price: number;
};

export type Seat = {
  id: string;
  section: string;
  row: number;
  seat: number;
  x: number;
  y: number;
  tariffId: string;
};

export type SalesPlan = Record<string, number>;

export type ExportedHallState = {
  tariffs: Tariff[];
  seats: Seat[];
  salesPlan: SalesPlan;
  occupancyPercent: number;
};

export type TooltipSeat = {
  seat: Seat;
  x: number;
  y: number;
};

export type RevenueRow = {
  id: string;
  name: string;
  color: string;
  price: number;
  seatsCount: number;
  potentialRevenue: number;
};
