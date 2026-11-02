import type { Invoice } from "./model";

/**
 * Opens the browser's print dialog on the invoice alone; "Save as PDF" there gives the file.
 * The page title becomes the file name the browser suggests: "Gecko GK-2026-001".
 */
export function printInvoice(invoice: Invoice) {
  const before = document.title;
  document.title = `Gecko ${invoice.number ?? "draft"}`;
  document.body.classList.add("printing-invoice");
  const restore = () => {
    document.title = before;
    document.body.classList.remove("printing-invoice");
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
