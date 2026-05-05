import type { PointerEvent } from "react";
import type { Seat as SeatType } from "../types";

type SeatProps = {
  color: string;
  isSelected: boolean;
  seat: SeatType;
  onClick: (event: PointerEvent<SVGCircleElement>, seat: SeatType) => void;
  onHover: (event: PointerEvent<SVGCircleElement>, seat: SeatType) => void;
  onLeave: () => void;
};

export function Seat({ color, isSelected, seat, onClick, onHover, onLeave }: SeatProps) {
  return (
    <circle
      data-seat-node="true"
      cx={seat.x}
      cy={seat.y}
      r={13.5}
      fill={color}
      className="seat-node"
      stroke={isSelected ? "#111111" : "transparent"}
      strokeWidth={isSelected ? 3.5 : 0}
      onPointerDown={(event) => {
        event.stopPropagation();
        onClick(event, seat);
      }}
      onPointerMove={(event) => onHover(event, seat)}
      onPointerEnter={(event) => onHover(event, seat)}
      onPointerLeave={onLeave}
    />
  );
}
