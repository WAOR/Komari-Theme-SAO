import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TiltedCard } from "../TiltedCard";

describe("TiltedCard Component", () => {
  it("renders front face and back face with correct classes and structure", () => {
    const html = renderToStaticMarkup(
      <TiltedCard
        className="test-card"
        backContent={<div className="back-content">方格矩阵</div>}
      >
        <div className="front-content">趋势大盘</div>
      </TiltedCard>,
    );

    expect(html).toContain("tilted-card");
    expect(html).toContain("test-card");
    expect(html).toContain("tilted-card__body");
    expect(html).toContain("tilted-card__front");
    expect(html).toContain("tilted-card__back");
    expect(html).toContain("is-active-face");
    expect(html).toContain("is-hidden-face");
    expect(html).toContain("趋势大盘");
    expect(html).toContain("方格矩阵");
  });

  it("renders single face when backContent is omitted", () => {
    const html = renderToStaticMarkup(
      <TiltedCard>
        <div className="single-face">Only Front</div>
      </TiltedCard>,
    );

    expect(html).toContain("tilted-card__front");
    expect(html).not.toContain("tilted-card__back");
    expect(html).toContain("Only Front");
  });

  it("does not apply 3D animation perspective when idle to maintain crisp text", () => {
    const html = renderToStaticMarkup(
      <TiltedCard backContent={<div>Back</div>}>
        <div>Front</div>
      </TiltedCard>,
    );

    expect(html).not.toContain("is-animating");
    expect(html).not.toContain("perspective");
  });
});
