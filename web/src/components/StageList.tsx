import { Fragment, type ReactNode } from "react";

export interface StageGroup<T> {
  key: string;
  title: string;
  items: T[];
}

/**
 * One layout for every list that moves through stages (ideas, scripts, cuts), the same for the team
 * and the client: what this page is for and the add button, the form when adding, then each stage
 * with its count. Only the words, the actions and who can add differ between the two sides.
 */
export function StageList<T>({
  lede,
  action,
  form,
  empty,
  groups,
  layout = "cards",
  itemKey,
  renderItem,
}: {
  lede: ReactNode;
  /** The add button, when the reader can add. */
  action?: ReactNode;
  /** The add form, while it's open. */
  form?: ReactNode;
  empty: ReactNode;
  groups: StageGroup<T>[];
  /** Cards side by side (ideas, scripts) or rows in a list (cuts: each item renders its own <li>). */
  layout?: "cards" | "rows";
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">{lede}</p>
        {!form && action}
      </div>
      {form}
      {groups.length === 0 && !form && <p className="muted empty-state">{empty}</p>}
      {groups.map((group) => (
        <div key={group.key} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          {layout === "rows" ? (
            <ul className="cut-list">
              {group.items.map((item) => (
                <Fragment key={itemKey(item)}>{renderItem(item)}</Fragment>
              ))}
            </ul>
          ) : (
            <div className="concepts">
              {group.items.map((item) => (
                <Fragment key={itemKey(item)}>{renderItem(item)}</Fragment>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
