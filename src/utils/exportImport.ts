import type { ExportedHallState, Seat, Tariff } from "../types";
import { normalizeImportedState } from "./stateNormalization";

export const exportHallState = ({
  tariffs,
  seats,
  salesPlan,
  occupancyPercent,
}: ExportedHallState) => {
  const blob = new Blob(
    [JSON.stringify({ tariffs, seats, salesPlan, occupancyPercent }, null, 2)],
    {
      type: "application/json",
    },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hall-tariffs.json";
  link.click();
  URL.revokeObjectURL(url);
};

export const importHallStateFromFile = async (
  file: File,
  defaultSeats: Seat[],
  defaultTariffs: Tariff[],
): Promise<ExportedHallState> => {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  return normalizeImportedState(parsed, defaultSeats, defaultTariffs);
};
