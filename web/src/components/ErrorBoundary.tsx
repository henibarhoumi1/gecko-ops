import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { t } from "@/lib/i18n";
import { reportError } from "@/lib/reportError";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** If a screen crashes, show a calm message in the reader's language instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("screen crashed", error, info.componentStack);
    reportError("crash", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>{t("Something went wrong on this page", "Un problème est survenu sur cette page")}</h1>
        <p className="muted">
          {t(
            "Nothing you saved is lost. Reload the page to carry on.",
            "Rien de ce que vous avez enregistré n'est perdu. Rechargez la page pour continuer.",
          )}
        </p>
        <Button onClick={() => window.location.reload()}>{t("Reload", "Recharger")}</Button>
      </div>
    );
  }
}
