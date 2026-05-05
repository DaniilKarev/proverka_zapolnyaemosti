import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { HALL_VIEW_BOX } from "../data/generateHall";
import type { Seat as SeatType, Tariff, TooltipSeat } from "../types";
import { Seat } from "./Seat";

type SelectionRect = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
  baseSelection: string[];
};

type HallMapProps = {
  seats: SeatType[];
  selectedSeatIds: string[];
  tariffs: Tariff[];
  onSelectionChange: (seatIds: string[]) => void;
};

const getEventPoint = (
  svg: SVGSVGElement,
  event: ReactPointerEvent<SVGElement>,
) => {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
  return { x: transformed.x, y: transformed.y };
};

export function HallMap({
  seats,
  selectedSeatIds,
  tariffs,
  onSelectionChange,
}: HallMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [tooltip, setTooltip] = useState<TooltipSeat | null>(null);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const tariffMap = useMemo(
    () => new Map(tariffs.map((tariff) => [tariff.id, tariff])),
    [tariffs],
  );

  const handleSeatClick = (
    event: ReactPointerEvent<SVGCircleElement>,
    seat: SeatType,
  ) => {
    const isMultiToggle = event.metaKey || event.ctrlKey;
    if (isMultiToggle) {
      if (selectedSet.has(seat.id)) {
        onSelectionChange(selectedSeatIds.filter((id) => id !== seat.id));
      } else {
        onSelectionChange([...selectedSeatIds, seat.id]);
      }
      return;
    }

    onSelectionChange([seat.id]);
  };

  const updateSelectionFromRect = (rectState: SelectionRect) => {
    const minX = Math.min(rectState.startX, rectState.currentX);
    const maxX = Math.max(rectState.startX, rectState.currentX);
    const minY = Math.min(rectState.startY, rectState.currentY);
    const maxY = Math.max(rectState.startY, rectState.currentY);

    const inside = seats
      .filter((seat) => seat.x >= minX && seat.x <= maxX && seat.y >= minY && seat.y <= maxY)
      .map((seat) => seat.id);

    const nextSelection = rectState.additive
      ? Array.from(new Set([...rectState.baseSelection, ...inside]))
      : inside;

    onSelectionChange(nextSelection);
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest("[data-seat-node='true']")) {
      return;
    }

    const point = getEventPoint(svg, event);
    const nextRect: SelectionRect = {
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      additive: event.shiftKey,
      baseSelection: selectedSeatIds,
    };
    setSelectionRect(nextRect);
    if (!event.shiftKey) {
      onSelectionChange([]);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !selectionRect) {
      return;
    }

    const point = getEventPoint(svg, event);
    const nextRect = {
      ...selectionRect,
      currentX: point.x,
      currentY: point.y,
    };
    setSelectionRect(nextRect);
    updateSelectionFromRect(nextRect);
  };

  const finishSelection = () => {
    setSelectionRect(null);
  };

  const selectionBounds = selectionRect
    ? {
        x: Math.min(selectionRect.startX, selectionRect.currentX),
        y: Math.min(selectionRect.startY, selectionRect.currentY),
        width: Math.abs(selectionRect.currentX - selectionRect.startX),
        height: Math.abs(selectionRect.currentY - selectionRect.startY),
      }
    : null;

  return (
    <div className="hall-map-shell">
      <svg
        ref={svgRef}
        className="hall-svg"
        viewBox={`0 0 ${HALL_VIEW_BOX.width} ${HALL_VIEW_BOX.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSelection}
        onPointerLeave={finishSelection}
      >
        <rect width={HALL_VIEW_BOX.width} height={HALL_VIEW_BOX.height} fill="#ededed" rx={28} />

        <g className="hall-card-group">
          <rect x="420" y="38" width="980" height="214" rx="18" className="hall-card" />
          <rect x="1430" y="74" width="281" height="170" rx="16" className="hall-card" />
          <rect x="10" y="270" width="550" height="365" rx="18" className="hall-card" />
          <rect x="100" y="650" width="1907" height="959" rx="18" className="hall-card" />
        </g>

        <g className="hall-labels">
          <text x="901" y="95" className="section-title section-title--main">
            Бельэтаж
          </text>
          <text x="1570" y="136" className="section-title">
            Ложа
          </text>
          <text x="79" y="356" className="section-title">
            Бельэтаж правая сторона
          </text>
          <text x="1266" y="703" className="section-title">
            Партер
          </text>
        </g>

        <g className="row-labels">
          {[3, 2, 1].map((row, index) => (
            <text key={`beletage-${row}`} x="389" y={132 + index * 43.5} className="row-number">
              {row}
            </text>
          ))}

          {[2, 1].map((row, index) => (
            <text key={`lodge-${row}`} x="1729" y={172 + index * 43.5} className="row-number">
              {row}
            </text>
          ))}

          {[7, 6, 5, 4, 3, 2, 1].map((row, index) => {
            const y = index < 5 ? 301 + index * 43.5 : 562 + (index - 5) * 43.5;
            return (
              <text key={`side-${row}`} x="606" y={y} className="row-number">
                {row}
              </text>
            );
          })}

          {Array.from({ length: 20 }, (_, index) => {
            const row = 20 - index;
            const y = 734.5 + index * 43.4;
            return (
              <text key={`parter-${row}`} x="1292" y={y + 3} className="row-number">
                {row}
              </text>
            );
          })}
        </g>

        <g className="stage-group">
          <path
            d="M 854 1668 Q 1226 1648 1667 1668"
            className="stage-arc"
          />
          <text x="1226" y="1765" textAnchor="middle" className="stage-title">
            СЦЕНА
          </text>
        </g>

        <g>
          {seats.map((seat) => {
            const tariff = tariffMap.get(seat.tariffId);
            const color = tariff?.color ?? "#c6c6c6";

            return (
              <Seat
                key={seat.id}
                color={color}
                isSelected={selectedSet.has(seat.id)}
                seat={seat}
                onClick={handleSeatClick}
                onHover={(event, hoveredSeat) => {
                  setTooltip({
                    seat: hoveredSeat,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                onLeave={() => setTooltip(null)}
              />
            );
          })}
        </g>

        {selectionBounds && (
          <rect
            x={selectionBounds.x}
            y={selectionBounds.y}
            width={selectionBounds.width}
            height={selectionBounds.height}
            className="selection-rect"
          />
        )}
      </svg>

      {tooltip && (
        <div
          className="seat-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <strong>{tooltip.seat.section}</strong>
          <span>
            Ряд {tooltip.seat.row}, место {tooltip.seat.seat}
          </span>
          <span>
            Тариф: {tariffMap.get(tooltip.seat.tariffId)?.name ?? "Без тарифа"}
          </span>
        </div>
      )}
    </div>
  );
}
