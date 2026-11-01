import type { PointerEvent as ReactPointerEvent } from "react";
import { CardBody, ColumnHead } from "./BoardCards";
import { columnCards, type Card, type CardData } from "./model";

interface Props {
  cards: Card[];
  top: Card[];
  selected: Set<string>;
  editing: string | null;
  dropColumn: string | null;
  dragging: boolean;
  arrowFrom: string | null;
  onPointerDown: (e: ReactPointerEvent, card: Card) => void;
  onResizeDown: (e: ReactPointerEvent, card: Card) => void;
  onData: (id: string, data: Partial<CardData>) => void;
  onEdit: (id: string, editing: boolean) => void;
  onOpen: (card: Card) => void;
  onRemove: (id: string) => void;
}

/** Every card on the board: the loose ones placed where they were dropped, columns with their cards stacked. */
export function BoardCards(props: Props) {
  return (
    <>
      {props.top.map((card) => (
        <Shell key={card.id} card={card} {...props} placed />
      ))}
    </>
  );
}

function Shell({ card, placed, ...p }: Props & { card: Card; placed?: boolean }) {
  const isSelected = p.selected.has(card.id);
  const isEditing = p.editing === card.id;
  const common = {
    card,
    editing: isEditing,
    dragging: p.dragging,
    onData: (data: Partial<CardData>) => p.onData(card.id, data),
    onEdit: (on: boolean) => p.onEdit(card.id, on),
    onOpen: () => p.onOpen(card),
  };
  const children = card.kind === "column" ? columnCards(p.cards, card.id) : [];

  return (
    <div
      data-card={card.id}
      className={[
        "bcard",
        `bcard-${card.kind}`,
        isSelected && "selected",
        isEditing && "editing",
        p.dropColumn === card.id && "drop-here",
        p.arrowFrom === card.id && "arrow-from",
        card.fromClient && "from-client",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        placed ? { left: card.x, top: card.y, width: card.w, zIndex: card.z } : { width: "100%" }
      }
      onPointerDown={(e) => p.onPointerDown(e, card)}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest(".no-drag, input, textarea")) return;
        e.stopPropagation();
        if (card.kind === "board") p.onOpen(card);
        else p.onEdit(card.id, true);
      }}
    >
      {card.kind === "column" ? (
        <div className="bc-column">
          <ColumnHead {...common} count={children.length} />
          <div className="bc-column-list">
            {children.map((child) => (
              <Shell key={child.id} {...p} card={child} />
            ))}
            {children.length === 0 && (
              <p className="small muted bc-column-empty">Drag cards here.</p>
            )}
          </div>
        </div>
      ) : (
        <CardBody {...common} />
      )}
      {isSelected && (
        <>
          <button
            type="button"
            className="bcard-remove no-drag"
            aria-label="Delete card"
            onClick={() => p.onRemove(card.id)}
          >
            ×
          </button>
          {placed && (
            <span
              className="bcard-resize"
              aria-hidden="true"
              onPointerDown={(e) => p.onResizeDown(e, card)}
            />
          )}
        </>
      )}
    </div>
  );
}
