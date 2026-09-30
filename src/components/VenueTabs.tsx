import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Venue } from "../types";

export type VenueTabsProps = {
  venues: Venue[];
  activeVenueId: string;
  onVenueChange: (venueId: string) => void;
};

export function VenueTabs({
  venues,
  activeVenueId,
  onVenueChange,
}: VenueTabsProps) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    venueId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onVenueChange(venueId);
      return;
    }

    const currentIndex = venues.findIndex((venue) => venue.id === venueId);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % venues.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + venues.length) % venues.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = venues.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextVenue = venues[nextIndex];
    if (nextVenue) {
      onVenueChange(nextVenue.id);
      tabRefs.current.get(nextVenue.id)?.focus();
    }
  };

  return (
    <nav className="venue-tabs-shell" aria-label="Театральные площадки">
      <div className="venue-tabs" role="tablist" aria-label="Выбор площадки">
        {venues.map((venue, index) => {
          const isActive = venue.id === activeVenueId;

          return (
            <button
              key={venue.id}
              ref={(element) => {
                if (element) {
                  tabRefs.current.set(venue.id, element);
                } else {
                  tabRefs.current.delete(venue.id);
                }
              }}
              id={`venue-tab-${index}`}
              className={`venue-tab${isActive ? " venue-tab--active" : ""}`}
              type="button"
              role="tab"
              aria-controls="active-venue-panel"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onVenueChange(venue.id)}
              onKeyDown={(event) => handleKeyDown(event, venue.id)}
            >
              {venue.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
