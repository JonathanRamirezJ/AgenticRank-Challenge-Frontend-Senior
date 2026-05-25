import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { FilterBar } from "../components/FilterBar";

describe("FilterBar", () => {
  it("renders the search input", () => {
    render(<FilterBar restaurants={[]} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("notifies parent when the query changes", async () => {
    const user = userEvent.setup();
    const queries: string[] = [];
    render(
      <FilterBar
        restaurants={[]}
        onChange={(f) => {
          queries.push(f.query);
        }}
      />,
    );
    await user.type(screen.getByPlaceholderText(/search/i), "pizza");
    expect(queries.at(-1)).toBe("pizza");
  });

  it("persists query across remounts via localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <FilterBar restaurants={[]} onChange={() => {}} />,
    );
    await user.type(screen.getByPlaceholderText(/search/i), "pizza");
    unmount();

    render(<FilterBar restaurants={[]} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toHaveValue("pizza");
  });

  it("falls back to defaults when persisted JSON is malformed", () => {
    localStorage.setItem("liveboard:filters:v1", "{not-json");
    render(<FilterBar restaurants={[]} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toHaveValue("");
  });

  it("ignores persisted entries with the wrong shape", () => {
    localStorage.setItem(
      "liveboard:filters:v1",
      JSON.stringify({ query: 42, statuses: "pending", restaurantName: [] }),
    );
    render(<FilterBar restaurants={[]} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toHaveValue("");
  });
});
