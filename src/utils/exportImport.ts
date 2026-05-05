import type { ExportedHallState, SalesPlan, Seat, Tariff } from "../types";
import {
  calculateOccupancyPercent,
  normalizeSalesPlan,
  sanitizeOccupancyPercent,
  sanitizePrice,
} from "./finance";

const validateTariffs = (tariffs: unknown): Tariff[] => {
  if (!Array.isArray(tariffs)) {
    throw new Error("В JSON нет массива tariffs.");
  }

  return tariffs.map((tariff, index) => {
    const candidate = tariff as Record<string, unknown>;
    if (
      typeof candidate?.id !== "string" ||
      typeof candidate?.name !== "string" ||
      typeof candidate?.color !== "string"
    ) {
      throw new Error(`Некорректный тариф на позиции ${index + 1}.`);
    }

    return {
      id: candidate.id,
      name: candidate.name,
      color: candidate.color,
      price:
        typeof candidate.price === "number" && Number.isFinite(candidate.price)
          ? sanitizePrice(candidate.price)
          : 0,
    };
  });
};

const validateSeats = (seats: unknown): Seat[] => {
  if (!Array.isArray(seats)) {
    throw new Error("В JSON нет массива seats.");
  }

  return seats.map((seat, index) => {
    const candidate = seat as Record<string, unknown>;
    if (
      typeof candidate?.id !== "string" ||
      typeof candidate?.section !== "string" ||
      typeof candidate?.row !== "number" ||
      typeof candidate?.seat !== "number" ||
      typeof candidate?.x !== "number" ||
      typeof candidate?.y !== "number" ||
      typeof candidate?.tariffId !== "string"
    ) {
      throw new Error(`Некорректное место на позиции ${index + 1}.`);
    }

    return {
      id: candidate.id,
      section: candidate.section,
      row: candidate.row,
      seat: candidate.seat,
      x: candidate.x,
      y: candidate.y,
      tariffId: candidate.tariffId,
    };
  });
};

const validateSalesPlan = (salesPlan: unknown): SalesPlan => {
  if (salesPlan === undefined) {
    return {};
  }

  if (typeof salesPlan !== "object" || salesPlan === null || Array.isArray(salesPlan)) {
    throw new Error("Поле salesPlan должно быть объектом.");
  }

  return Object.entries(salesPlan).reduce<SalesPlan>((result, [tariffId, soldSeats]) => {
    if (typeof soldSeats !== "number" || !Number.isFinite(soldSeats)) {
      throw new Error(`Некорректное значение salesPlan для ${tariffId}.`);
    }

    result[tariffId] = Math.max(0, Math.floor(soldSeats));
    return result;
  }, {});
};

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
): Promise<ExportedHallState> => {
  const text = await file.text();
  const parsed = JSON.parse(text) as {
    tariffs?: unknown;
    seats?: unknown;
    salesPlan?: unknown;
    occupancyPercent?: unknown;
  };

  const tariffs = validateTariffs(parsed.tariffs);
  const seats = validateSeats(parsed.seats);
  const salesPlan = normalizeSalesPlan(validateSalesPlan(parsed.salesPlan), seats, tariffs);

  return {
    tariffs,
    seats,
    salesPlan,
    occupancyPercent:
      typeof parsed.occupancyPercent === "number" &&
      Number.isFinite(parsed.occupancyPercent)
        ? sanitizeOccupancyPercent(parsed.occupancyPercent)
        : calculateOccupancyPercent(salesPlan, seats.length),
  };
};
