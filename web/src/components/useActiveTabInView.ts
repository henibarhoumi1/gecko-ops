import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** On narrow screens the tab row scrolls sideways; keep the open tab in sight. */
export function useActiveTabInView(ready = true) {
  const { pathname } = useLocation();
  useEffect(() => {
    document
      .querySelector(".portal-tabs .active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, ready]);
}
