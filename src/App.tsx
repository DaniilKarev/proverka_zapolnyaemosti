import { useEffect, useMemo, useState } from "react";
import { HallMap } from "./components/HallMap";
import { RevenuePanel } from "./components/RevenuePanel";
import { StatsPanel } from "./components/StatsPanel";
import { TariffPanel } from "./components/TariffPanel";
import { Toolbar } from "./components/Toolbar";
import { DEFAULT_TARIFFS, generateHallSeats } from "./data/generateHall";
import defaultHallStateData from "./data/defaultHallState.json";
import type { ExportedHallState, Tariff } from "./types";
import {
  buildRevenueRows,
  calculateOccupancyPercent,
  distributeSalesPlanByOccupancy,
  normalizeSalesPlan,
  sanitizeOccupancyPercent,
  sanitizePrice,
} from "./utils/finance";
import { exportHallState, importHallStateFromFile } from "./utils/exportImport";
import { normalizeImportedState } from "./utils/stateNormalization";
import {
  clearStoredHallState,
  loadHallState,
  saveHallState,
} from "./utils/storage";

const createDefaultState = (): ExportedHallState =>
  normalizeImportedState(
    defaultHallStateData,
    generateHallSeats(),
    DEFAULT_TARIFFS,
  );

const getInitialState = () => loadHallState(createDefaultState());
const getDefaultState = () => createDefaultState();

function App() {
  const [state, setState] = useState(getInitialState);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeTariffId, setActiveTariffId] = useState<string>(
    state.tariffs[0]?.id ?? DEFAULT_TARIFFS[0].id,
  );

  const seats = state.seats;
  const tariffs = state.tariffs;
  const salesPlan = state.salesPlan;
  const occupancyPercent = state.occupancyPercent;

  useEffect(() => {
    setState(getInitialState());
  }, []);

  useEffect(() => {
    saveHallState(seats, tariffs, salesPlan, occupancyPercent);
  }, [occupancyPercent, salesPlan, seats, tariffs]);

  useEffect(() => {
    setState((currentState) => {
      const normalizedSalesPlan = normalizeSalesPlan(
        currentState.salesPlan,
        currentState.seats,
        currentState.tariffs,
      );

      return {
        ...currentState,
        salesPlan: normalizedSalesPlan,
        occupancyPercent: calculateOccupancyPercent(
          normalizedSalesPlan,
          currentState.seats.length,
        ),
      };
    });
  }, [seats, tariffs]);

  const revenueRows = useMemo(() => buildRevenueRows(seats, tariffs), [seats, tariffs]);
  const selectedSeatsCount = selectedSeatIds.length;
  const totalSeats = seats.length;

  const assignTariffToSeats = (tariffId: string, seatIds = selectedSeatIds) => {
    if (seatIds.length === 0) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      seats: currentState.seats.map((seat) =>
        seatIds.includes(seat.id) ? { ...seat, tariffId } : seat,
      ),
    }));
    setActiveTariffId(tariffId);
  };

  const clearSelection = () => {
    setSelectedSeatIds([]);
  };

  const updateTariff = (tariffId: string, patch: Partial<Tariff>) => {
    setState((currentState) => ({
      ...currentState,
      tariffs: currentState.tariffs.map((tariff) =>
        tariff.id === tariffId
          ? {
              ...tariff,
              ...patch,
              price:
                patch.price === undefined ? tariff.price : sanitizePrice(patch.price),
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

    setState((currentState) => ({
      ...currentState,
      tariffs: [...currentState.tariffs, newTariff],
      salesPlan: { ...currentState.salesPlan, [newTariff.id]: 0 },
    }));
    setActiveTariffId(newTariff.id);
  };

  const removeTariff = (tariffId: string) => {
    if (tariffs.length === 1) {
      window.alert("В схеме должен остаться хотя бы один тариф.");
      return;
    }

    const isUsed = seats.some((seat) => seat.tariffId === tariffId);
    if (isUsed) {
      window.alert("Этот тариф уже назначен местам. Сначала снимите его с мест.");
      return;
    }

    setState((currentState) => {
      const nextTariffs = currentState.tariffs.filter((tariff) => tariff.id !== tariffId);
      const { [tariffId]: _removedPlan, ...nextSalesPlan } = currentState.salesPlan;
      if (activeTariffId === tariffId && nextTariffs[0]) {
        setActiveTariffId(nextTariffs[0].id);
      }
      return {
        ...currentState,
        tariffs: nextTariffs,
        salesPlan: nextSalesPlan,
      };
    });
  };

  const updateSalesPlan = (tariffId: string, soldSeats: number) => {
    const row = revenueRows.find((revenueRow) => revenueRow.id === tariffId);
    const maxSeats = row?.seatsCount ?? 0;
    const normalizedValue = Math.max(0, Math.min(maxSeats, Math.floor(soldSeats)));

    setState((currentState) => {
      const nextSalesPlan = {
        ...currentState.salesPlan,
        [tariffId]: normalizedValue,
      };

      return {
        ...currentState,
        salesPlan: nextSalesPlan,
        occupancyPercent: calculateOccupancyPercent(nextSalesPlan, currentState.seats.length),
      };
    });
  };

  const updateOccupancyPercent = (nextPercent: number) => {
    setState((currentState) => {
      const normalizedOccupancyPercent = sanitizeOccupancyPercent(nextPercent);
      const nextSalesPlan = distributeSalesPlanByOccupancy(
        normalizedOccupancyPercent,
        currentState.seats,
        currentState.tariffs,
      );

      return {
        ...currentState,
        salesPlan: nextSalesPlan,
        occupancyPercent: normalizedOccupancyPercent,
      };
    });
  };

  const handleExport = () => {
    exportHallState({ tariffs, seats, salesPlan, occupancyPercent });
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importHallStateFromFile(
        file,
        getDefaultState().seats,
        getDefaultState().tariffs,
      );
      setState(imported);
      setSelectedSeatIds([]);
      setActiveTariffId(imported.tariffs[0]?.id ?? getDefaultState().tariffs[0].id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось импортировать JSON.";
      window.alert(message);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Сбросить все тарифы, цены, назначения и план продаж до стартового состояния?")) {
      return;
    }

    clearStoredHallState();
    const nextState = getDefaultState();
    setState(nextState);
    setSelectedSeatIds([]);
    setActiveTariffId(nextState.tariffs[0]?.id ?? DEFAULT_TARIFFS[0].id);
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
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
        />
      </header>

      <main className="app-layout">
        <section className="map-column">
          <section className="map-panel">
            <HallMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              tariffs={tariffs}
              onSelectionChange={setSelectedSeatIds}
            />
          </section>

          <RevenuePanel
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
