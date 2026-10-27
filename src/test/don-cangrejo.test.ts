import { describe, it, expect } from "vitest";
// @ts-expect-error legacy js module
import { DEFAULTS, calculateActiveBatch, calculatePremixBulk, isPremixValid } from "@/legacy/don-cangrejo.js";

describe("Don Cangrejo formulas", () => {
  it("20 kg receta actual", () => {
    const b = calculateActiveBatch(20, "cagada", DEFAULTS.premix, DEFAULTS.precios);
    expect(b.phase1.totalPremixG).toBe(340);
    expect(b.phase1.salG).toBe(289);
    expect(b.phase1.salCuraG).toBe(13.6);
    expect(b.phase1.azucarG).toBe(37.4);
    expect(b.phase2.guajilloG).toBe(300);
    expect(b.phase2.ajoG).toBe(120);
    expect(b.phase2.aguaMl).toBe(1000);
  });
  it("60 kg receta actual", () => {
    const b = calculateActiveBatch(60, "cagada", DEFAULTS.premix, DEFAULTS.precios);
    expect(b.phase1.totalPremixG).toBe(1020);
    expect(b.phase2.guajilloG).toBe(900);
  });
  it("premix must sum 100", () => {
    expect(isPremixValid(85, 4, 11)).toBe(true);
    expect(isPremixValid(85, 4, 10)).toBe(false);
    expect(calculatePremixBulk).toBeTypeOf("function");
  });
});
