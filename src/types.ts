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
  rotation?: number;
  table?: number;
  chair?: number;
  tariffId: string;
};

export type HallLayoutId =
  | "classic"
  | "auditorium-90"
  | "auditorium-314"
  | "theatre-maska"
  | "multi-tier-hall";

export type SalesPlan = Record<string, number>;

export type ExportedHallState = {
  tariffs: Tariff[];
  seats: Seat[];
  salesPlan: SalesPlan;
  occupancyPercent: number;
};

export type Venue = ExportedHallState & {
  id: string;
  name: string;
  layoutId: HallLayoutId;
  layoutRevision: number;
};

export type AppState = {
  version: 2;
  activeVenueId: string;
  venues: Venue[];
};

export type ExportedVenueState = {
  version: 2;
  venue: Venue;
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
