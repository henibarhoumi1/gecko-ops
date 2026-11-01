import { describe, expect, it } from "vitest";
import { contentBounds } from "./logo";

function image(width: number, height: number, ink: [number, number][], white = true) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = white ? 255 : 0;
  }
  for (const [x, y] of ink) {
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 0;
    data[i + 3] = 255;
  }
  return data;
}

describe("contentBounds", () => {
  it("trims a white background down to the mark", () => {
    expect(
      contentBounds(
        image(10, 8, [
          [2, 3],
          [6, 5],
        ]),
        10,
        8,
      ),
    ).toEqual({ x: 2, y: 3, w: 5, h: 3 });
  });
  it("trims a transparent background too", () => {
    expect(contentBounds(image(10, 8, [[4, 1]], false), 10, 8)).toEqual({ x: 4, y: 1, w: 1, h: 1 });
  });
  it("returns null for a blank image", () => {
    expect(contentBounds(image(4, 4, []), 4, 4)).toBeNull();
  });
});
