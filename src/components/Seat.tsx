import type { PointerEvent } from "react";
import type { HallLayoutId, Seat as SeatType } from "../types";

type SeatProps = {
  color: string;
  isSelected: boolean;
  layoutId: HallLayoutId;
  seat: SeatType;
  onClick: (event: PointerEvent<SVGGElement>, seat: SeatType) => void;
  onHover: (event: PointerEvent<SVGGElement>, seat: SeatType) => void;
  onLeave: () => void;
};

export function Seat({
  color,
  isSelected,
  layoutId,
  seat,
  onClick,
  onHover,
  onLeave,
}: SeatProps) {
  const eventProps = {
    onPointerDown: (event: PointerEvent<SVGGElement>) => {
      event.stopPropagation();
      onClick(event, seat);
    },
    onPointerMove: (event: PointerEvent<SVGGElement>) => onHover(event, seat),
    onPointerEnter: (event: PointerEvent<SVGGElement>) => onHover(event, seat),
    onPointerLeave: onLeave,
  };

  if (layoutId === "auditorium-90") {
    return (
      <g
        data-seat-node="true"
        className="seat-node seat-node--auditorium-90"
        role="button"
        aria-label={`Стол ${seat.table}, стул ${seat.chair}`}
        {...eventProps}
      >
        <circle
          className="restaurant-chair-hit-area"
          cx={seat.x}
          cy={seat.y}
          r={12}
        />
        <circle
          className="restaurant-chair"
          cx={seat.x}
          cy={seat.y}
          r={7}
          fill={color}
          stroke={isSelected ? "#4f7df0" : "transparent"}
          strokeWidth={isSelected ? 3 : 0}
        />
      </g>
    );
  }

  if (layoutId === "auditorium-314") {
    return (
      <g
        data-seat-node="true"
        className="seat-node seat-node--auditorium-314"
        role="button"
        aria-label={`Ряд ${seat.row}, место ${seat.seat}`}
        {...eventProps}
      >
        <circle
          className="compact-seat-hit-area"
          cx={seat.x}
          cy={seat.y}
          r={11}
        />
        <circle
          className="compact-seat"
          cx={seat.x}
          cy={seat.y}
          r={6.5}
          fill={color}
          stroke={isSelected ? "#244fc6" : "transparent"}
          strokeWidth={isSelected ? 3 : 0}
        />
      </g>
    );
  }

  if (layoutId === "theatre-maska") {
    const isBoxSeat = seat.section.includes("ложа");

    return (
      <g
        data-seat-node="true"
        className="seat-node seat-node--theatre-maska"
        role="button"
        aria-label={`${seat.section}, ряд ${seat.row}, место ${seat.seat}`}
        {...eventProps}
      >
        <circle
          className="maska-seat-hit-area"
          cx={seat.x}
          cy={seat.y}
          r={isBoxSeat ? 12 : 14}
        />
        <circle
          className="maska-seat"
          cx={seat.x}
          cy={seat.y}
          r={isBoxSeat ? 5 : 10.5}
          fill={color}
          stroke={isSelected ? "#244fc6" : "transparent"}
          strokeWidth={isSelected ? 3 : 0}
        />
      </g>
    );
  }

  if (layoutId === "multi-tier-hall") {
    return (
      <g
        data-seat-node="true"
        className="seat-node seat-node--multi-tier"
        role="button"
        aria-label={`${seat.section}, ряд ${seat.row}, место ${seat.seat}`}
        {...eventProps}
      >
        <circle
          className="multi-tier-seat-hit-area"
          cx={seat.x}
          cy={seat.y}
          r={11}
        />
        <circle
          className="multi-tier-seat"
          cx={seat.x}
          cy={seat.y}
          r={7.5}
          fill={color}
          stroke={isSelected ? "#111111" : "transparent"}
          strokeWidth={isSelected ? 3 : 0}
        />
      </g>
    );
  }

  return (
    <g
      data-seat-node="true"
      className="seat-node"
      role="button"
      aria-label={`Ряд ${seat.row}, место ${seat.seat}`}
      {...eventProps}
    >
      <circle
        cx={seat.x}
        cy={seat.y}
        r={13.5}
        fill={color}
        stroke={isSelected ? "#111111" : "transparent"}
        strokeWidth={isSelected ? 3.5 : 0}
      />
    </g>
  );
}
