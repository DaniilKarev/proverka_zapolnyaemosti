import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { HALL_VIEW_BOX } from "../data/generateHall";
import {
  MASKA_BALCONY_ROWS,
  MASKA_HALL_VIEW_BOX,
  MASKA_PARTER_ROWS,
} from "../data/generateMaskaHall";
import { MULTI_TIER_HALL_VIEW_BOX } from "../data/generateMultiTierHall";
import { VENUE_THREE_HALL_VIEW_BOX } from "../data/generateVenueThreeHall";
import {
  VENUE_TWO_HALL_VIEW_BOX,
  VENUE_TWO_TABLES,
} from "../data/generateVenueTwoHall";
import type {
  HallLayoutId,
  Seat as SeatType,
  Tariff,
  TooltipSeat,
} from "../types";
import { Seat } from "./Seat";
import { MultiTierHallBackdrop } from "./MultiTierHallBackdrop";

type SelectionRect = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
  baseSelection: string[];
};

type HallMapProps = {
  layoutId: HallLayoutId;
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
  layoutId,
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
  const isVenueTwoHall = layoutId === "auditorium-90";
  const isVenueThreeHall = layoutId === "auditorium-314";
  const isMaskaHall = layoutId === "theatre-maska";
  const isMultiTierHall = layoutId === "multi-tier-hall";
  const isCompactHall = isVenueTwoHall || isVenueThreeHall;
  const viewBox = isMultiTierHall
    ? MULTI_TIER_HALL_VIEW_BOX
    : isMaskaHall
      ? MASKA_HALL_VIEW_BOX
    : isVenueTwoHall
      ? VENUE_TWO_HALL_VIEW_BOX
      : isVenueThreeHall
        ? VENUE_THREE_HALL_VIEW_BOX
        : HALL_VIEW_BOX;

  const handleSeatClick = (
    event: ReactPointerEvent<SVGGElement>,
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
    <div
      className={`hall-map-shell${isVenueThreeHall ? " hall-map-shell--viewport-fit" : ""}`}
    >
      <svg
        ref={svgRef}
        className={`hall-svg hall-svg--${layoutId}`}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSelection}
        onPointerLeave={finishSelection}
      >
        {isMultiTierHall ? (
          <MultiTierHallBackdrop />
        ) : isMaskaHall ? (
          <g className="maska-hall-background" aria-hidden="true">
            <rect
              width={MASKA_HALL_VIEW_BOX.width}
              height={MASKA_HALL_VIEW_BOX.height}
              className="maska-page-background"
            />
            <rect
              x="14"
              y="145"
              width="190"
              height="457"
              className="maska-side-field"
            />
            <rect
              x="1602"
              y="145"
              width="190"
              height="457"
              className="maska-side-field"
            />
            <rect
              x="212"
              y="25"
              width="1377"
              height="285"
              rx="16"
              className="maska-section-card"
            />
            <rect
              x="212"
              y="345"
              width="1377"
              height="489"
              rx="16"
              className="maska-section-card"
            />
            <rect
              x="59"
              y="206"
              width="117"
              height="211"
              rx="18"
              className="maska-section-card"
            />
            <rect
              x="1626"
              y="206"
              width="117"
              height="211"
              rx="18"
              className="maska-section-card"
            />

            <text
              x="903"
              y="75"
              textAnchor="middle"
              className="maska-section-title"
            >
              Балкон
            </text>
            <text
              x="903"
              y="394"
              textAnchor="middle"
              className="maska-section-title"
            >
              Партер
            </text>
            <text
              x="117.5"
              y="255"
              textAnchor="middle"
              className="maska-section-title"
            >
              Ложа
            </text>
            <text
              x="1684.5"
              y="255"
              textAnchor="middle"
              className="maska-section-title"
            >
              Ложа
            </text>

            <g className="maska-row-labels">
              {MASKA_BALCONY_ROWS.map(({ row, y, leftLabelX, rightLabelX }) => (
                <g key={`maska-balcony-label-${row}`}>
                  <text x={leftLabelX} y={y + 4} textAnchor="middle">
                    {row}
                  </text>
                  <text x={rightLabelX} y={y + 4} textAnchor="middle">
                    {row}
                  </text>
                </g>
              ))}
              {MASKA_PARTER_ROWS.map(({ row, y, leftLabelX, rightLabelX }) => (
                <g key={`maska-parter-label-${row}`}>
                  <text x={leftLabelX} y={y + 4} textAnchor="middle">
                    {row}
                  </text>
                  <text x={rightLabelX} y={y + 4} textAnchor="middle">
                    {row}
                  </text>
                </g>
              ))}
            </g>

            <path
              d="M 696 899 Q 902 872 1108 899"
              className="maska-stage-arc"
            />
            <text
              x="903"
              y="932"
              textAnchor="middle"
              className="maska-stage-title"
            >
              Сцена
            </text>
          </g>
        ) : isCompactHall ? (
          <>
            <defs>
              <linearGradient id="compact-hall-background" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4f4f4" />
                <stop offset="0.08" stopColor="#fafafa" />
                <stop offset="1" stopColor="#f7f7f7" />
              </linearGradient>
            </defs>
            <rect
              width={viewBox.width}
              height={viewBox.height}
              fill="url(#compact-hall-background)"
            />
            <rect x="80" y="59" width="679" height="1047" rx="15" fill="#ffffff" />
            {isVenueTwoHall && (
              <g className="restaurant-tables" aria-hidden="true">
                {VENUE_TWO_TABLES.map((table) => (
                  <g key={table.id} className="restaurant-table">
                    <circle cx={table.x} cy={table.y} r={15.5} />
                    <text x={table.x} y={table.y + 3.2} textAnchor="middle">
                      {table.table}
                    </text>
                  </g>
                ))}
              </g>
            )}
            <path
              d="M 216 1149 Q 353 1129 490 1149"
              className="compact-stage-arc"
            />
            <text
              x="353"
              y="1172"
              textAnchor="middle"
              className="compact-stage-title"
            >
              Сцена
            </text>
          </>
        ) : (
          <>
            <rect
              width={HALL_VIEW_BOX.width}
              height={HALL_VIEW_BOX.height}
              fill="#ededed"
              rx={28}
            />

            <g className="hall-card-group">
              <rect x="420" y="38" width="980" height="214" rx="18" className="hall-card" />
              <rect x="10" y="270" width="550" height="365" rx="18" className="hall-card" />
              <rect x="100" y="650" width="1907" height="959" rx="18" className="hall-card" />
            </g>

            <g className="hall-labels">
              <text x="901" y="95" className="section-title section-title--main">
                Бельэтаж
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
          </>
        )}

        <g>
          {seats.map((seat) => {
            const tariff = tariffMap.get(seat.tariffId);
            const color =
              tariff?.color ??
              (isVenueTwoHall
                ? "#000000"
                : isVenueThreeHall
                  ? "#858585"
                  : isMaskaHall
                    ? "#afb4b6"
                    : "#c6c6c6");

            return (
              <Seat
                key={seat.id}
                color={color}
                isSelected={selectedSet.has(seat.id)}
                layoutId={layoutId}
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
          {tooltip.seat.table && tooltip.seat.chair ? (
            <span>
              Стол {tooltip.seat.table}, стул {tooltip.seat.chair}
            </span>
          ) : (
            <span>
              Ряд {tooltip.seat.row}, место {tooltip.seat.seat}
            </span>
          )}
          <span>
            Тариф: {tariffMap.get(tooltip.seat.tariffId)?.name ?? "Без тарифа"}
          </span>
        </div>
      )}
    </div>
  );
}
