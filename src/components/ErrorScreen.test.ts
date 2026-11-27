import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ErrorScreen, RetryButton } from "./ErrorScreen";

describe("ErrorScreen", () => {
  it("shows the default title and button, and the line about the connection", () => {
    const html = renderToStaticMarkup(createElement(ErrorScreen, { retry: () => {} }));
    expect(html).toContain("Something Went Wrong");
    expect(html).toContain("Try Again");
    expect(html).toContain("Check your connection and try again.");
  });

  it("takes its own title and button, in one h1", () => {
    const html = renderToStaticMarkup(createElement(ErrorScreen, { title: "We Couldn't Load This Car", button: "Try Loading the Car Again", retry: () => {} }));
    expect(html).toContain("We Couldn&#x27;t Load This Car");
    expect(html).toContain("Try Loading the Car Again");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("the button is given retry", () => {
    const retry = vi.fn();
    const main = ErrorScreen({ retry }) as { props: { children: { type: unknown; props: { retry?: () => void } }[] } };
    const button = main.props.children.find((c) => c.type === RetryButton)!;
    expect(button.props.retry).toBe(retry);
  });
});
