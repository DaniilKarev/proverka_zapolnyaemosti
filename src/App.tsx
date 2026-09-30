import { useEffect, useMemo, useState } from "react";
import { HallMap } from "./components/HallMap";
import { RevenuePanel } from "./components/RevenuePanel";
import { StatsPanel } from "./components/StatsPanel";
import { TariffPanel } from "./components/TariffPanel";
import { Toolbar } from "./components/Toolbar";
import { DEFAULT_TARIFFS } from "./data/generateHall";
import {
  createDefaultAppState,
  createDefaultVenue,
} from "./data/venues";
import type { Tariff, Venue } from "./types";
import {
  buildRevenueRows,
  calculateOccupancyPercent,
  distributeSalesPlanByOccupancy,
  normalizeSalesPlan,
  sanitizeOccupancyPercent,
  sanitizePrice,
} from "./utils/finance";
import {
  exportCurrentVenue,
  importStateFromFile,
} from "./utils/exportImport";
import {
  loadAppState,
  saveAppState,
} from "./utils/storage";

const getDefaultState = () => createDefaultAppState();
const getInitialState = () => loadAppState(getDefaultState());

const normalizeVenueSales = (venue: Venue): Venue => {
  const salesPlan = normalizeSalesPlan(
    venue.salesPlan,
    venue.seats,
    venue.tariffs,
  );

  return {
    ...venue,
    salesPlan,
    occupancyPercent: calculateOccupancyPercent(salesPlan, venue.seats.length),
  };
};

function App() {
  const [state, setState] = useState(getInitialState);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeTariffId, setActiveTariffId] = useState<string>(() => {
    const initialVenue =
      state.venues.find((venue) => venue.id === state.activeVenueId) ??
      state.venues[0];
    return initialVenue?.tariffs[0]?.id ?? DEFAULT_TARIFFS[0].id;
  });

  const activeVenue =
    state.venues.find((venue) => venue.id === state.activeVenueId) ??
    state.venues[0];
  const seats = activeVenue?.seats ?? [];
  const tariffs = activeVenue?.tariffs ?? [];
  const salesPlan = activeVenue?.salesPlan ?? {};
  const occupancyPercent = activeVenue?.occupancyPercent ?? 0;

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const revenueRows = useMemo(
    () => buildRevenueRows(seats, tariffs),
    [seats, tariffs],
  );
  const selectedSeatsCount = selectedSeatIds.length;
  const totalSeats = seats.length;

  const updateActiveVenue = (updater: (venue: Venue) => Venue) => {
    setState((currentState) => ({
      ...currentState,
      venues: currentState.venues.map((venue) =>
        venue.id === currentState.activeVenueId ? updater(venue) : venue,
      ),
    }));
  };

  const assignTariffToSeats = (
    tariffId: string,
    seatIds = selectedSeatIds,
  ) => {
    if (seatIds.length === 0) {
      return;
    }

    const selectedIds = new Set(seatIds);
    updateActiveVenue((venue) =>
      normalizeVenueSales({
        ...venue,
        seats: venue.seats.map((seat) =>
          selectedIds.has(seat.id) ? { ...seat, tariffId } : seat,
        ),
      }),
    );
    setActiveTariffId(tariffId);
  };

  const clearSelection = () => {
    setSelectedSeatIds([]);
  };

  const updateTariff = (tariffId: string, patch: Partial<Tariff>) => {
    updateActiveVenue((venue) => ({
      ...venue,
      tariffs: venue.tariffs.map((tariff) =>
        tariff.id === tariffId
          ? {
              ...tariff,
              name: patch.name ?? tariff.name,
              color: patch.color ?? tariff.color,
              price:
                patch.price === undefined
                  ? tariff.price
                  : sanitizePrice(patch.price),
            }
          : tariff,
      ),
    }));
  };

  const addTariff = () => {
    const nextIndex = tariffs.length + 1;
    const colors = [
      "#E85D5D",
      "#F2A65A",
      "#4BB7C5",
      "#64B96A",
      "#4F7DF0",
      "#78C7FF",
      "#ED80AF",
      "#8E63D7",
      "#F0CA4D",
      "#4FB588",
    ];
    const newTariff: Tariff = {
      id: `tariff-${crypto.randomUUID()}`,
      name: `Тариф ${nextIndex}`,
      color: colors[(nextIndex - 1) % colors.length],
      price: 0,
    };

    updateActiveVenue((venue) => ({
      ...venue,
      tariffs: [...venue.tariffs, newTariff],
      salesPlan: { ...venue.salesPlan, [newTariff.id]: 0 },
    }));
    setActiveTariffId(newTariff.id);
  };

  const removeTariff = (tariffId: string) => {
    if (tariffs.length === 1) {
      window.alert("В схеме должен остаться хотя бы один тариф.");
      return;
    }

    if (seats.some((seat) => seat.tariffId === tariffId)) {
      window.alert("Этот тариф уже назначен местам. Сначала снимите его с мест.");
      return;
    }

    const nextTariffs = tariffs.filter((tariff) => tariff.id !== tariffId);
    updateActiveVenue((venue) => {
      const { [tariffId]: _removedPlan, ...nextSalesPlan } = venue.salesPlan;
      return normalizeVenueSales({
        ...venue,
        tariffs: venue.tariffs.filter((tariff) => tariff.id !== tariffId),
        salesPlan: nextSalesPlan,
      });
    });

    if (activeTariffId === tariffId && nextTariffs[0]) {
      setActiveTariffId(nextTariffs[0].id);
    }
  };

  const updateSalesPlan = (tariffId: string, soldSeats: number) => {
    const row = revenueRows.find((revenueRow) => revenueRow.id === tariffId);
    const maxSeats = row?.seatsCount ?? 0;
    const normalizedValue = Math.max(
      0,
      Math.min(maxSeats, Math.floor(soldSeats)),
    );

    updateActiveVenue((venue) => {
      const nextSalesPlan = {
        ...venue.salesPlan,
        [tariffId]: normalizedValue,
      };

      return {
        ...venue,
        salesPlan: nextSalesPlan,
        occupancyPercent: calculateOccupancyPercent(
          nextSalesPlan,
          venue.seats.length,
        ),
      };
    });
  };

  const updateOccupancyPercent = (nextPercent: number) => {
    updateActiveVenue((venue) => {
      const normalizedOccupancyPercent = sanitizeOccupancyPercent(nextPercent);
      const nextSalesPlan = distributeSalesPlanByOccupancy(
        normalizedOccupancyPercent,
        venue.seats,
        venue.tariffs,
      );

      return {
        ...venue,
        salesPlan: nextSalesPlan,
        occupancyPercent: normalizedOccupancyPercent,
      };
    });
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importStateFromFile(file, getDefaultState());
      const defaultVenue = getDefaultState().venues[0];
      const importedVenue =
        imported.kind === "all-venues"
          ? imported.state.venues.find((venue) => venue.id === defaultVenue.id) ??
            imported.state.venues.find(
              (venue) => venue.layoutId === defaultVenue.layoutId,
            ) ??
            imported.state.venues[0]
          : imported.venue;

      if (
        !importedVenue ||
        !window.confirm(
          `Импорт заменит настройки площадки “${defaultVenue.name}”. Продолжить?`,
        )
      ) {
        return;
      }

      const nextVenue: Venue = {
        ...importedVenue,
        id: defaultVenue.id,
        name: defaultVenue.name,
        layoutId: defaultVenue.layoutId,
        layoutRevision: defaultVenue.layoutRevision,
      };
      setState({
        version: 2,
        activeVenueId: nextVenue.id,
        venues: [nextVenue],
      });
      setSelectedSeatIds([]);
      setActiveTariffId(
        nextVenue.tariffs[0]?.id ?? DEFAULT_TARIFFS[0].id,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось импортировать JSON.";
      window.alert(message);
    }
  };

  const handleResetCurrent = () => {
    if (!activeVenue) {
      return;
    }

    if (
      !window.confirm(
        `Сбросить все настройки площадки “${activeVenue.name}”?`,
      )
    ) {
      return;
    }

    const resetVenue = createDefaultVenue(
      activeVenue.id,
      activeVenue.name,
      activeVenue.layoutId,
    );
    updateActiveVenue(() => resetVenue);
    setSelectedSeatIds([]);
    setActiveTariffId(resetVenue.tariffs[0]?.id ?? DEFAULT_TARIFFS[0].id);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Редактор тарифов</p>
          <h1>Интерактивная схема театрального зала</h1>
        </div>
        <Toolbar
          selectedSeatsCount={selectedSeatsCount}
          onClearSelection={clearSelection}
          onExportCurrent={() => activeVenue && exportCurrentVenue(activeVenue)}
          onImport={handleImport}
          onResetCurrent={handleResetCurrent}
        />
      </header>

      <main className="app-layout">
        <section className="map-column">
          <section
            className={`map-panel${activeVenue?.layoutId === "auditorium-314" ? " map-panel--viewport-fit" : ""}`}
          >
            <HallMap
              layoutId={activeVenue?.layoutId ?? "classic"}
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              tariffs={tariffs}
              onSelectionChange={setSelectedSeatIds}
            />
          </section>

          <RevenuePanel
            venueName={activeVenue?.name ?? "Площадка"}
            occupancyPercent={occupancyPercent}
            salesPlan={salesPlan}
            seats={seats}
            tariffs={tariffs}
            onOccupancyChange={updateOccupancyPercent}
            onSalesPlanChange={updateSalesPlan}
          />
        </section>

        <aside className="sidebar">
          <TariffPanel
            activeTariffId={activeTariffId}
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            tariffs={tariffs}
            onActiveTariffChange={setActiveTariffId}
            onAssignTariff={assignTariffToSeats}
            onAddTariff={addTariff}
            onRemoveTariff={removeTariff}
            onUpdateTariff={updateTariff}
          />
          <StatsPanel
            venueName={activeVenue?.name ?? "Площадка"}
            totalSeats={totalSeats}
            selectedSeatsCount={selectedSeatsCount}
            seats={seats}
            tariffs={tariffs}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
