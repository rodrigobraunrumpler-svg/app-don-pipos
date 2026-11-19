import { renderWithProviders } from "../../test/render";
export function UsesTestHelpers() {
  return <p>{String(renderWithProviders(1))}</p>;
}
