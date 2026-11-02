import { describe, it, expect } from "vitest";
import { can, primaryRole } from "@/lib/roles";
import { premixForMeat, phase2ForMeat, restStatus, yieldPct, PREMIX } from "@/lib/formula";

describe("roles", () => {
  it("operator cannot edit formulas or see finances", () => {
    expect(can(["operator"], "formula:edit")).toBe(false);
    expect(can(["operator"], "finance:costs")).toBe(false);
    expect(can(["operator"], "batches:capture")).toBe(true);
  });
  it("supervisor sees costs and adjusts water but not margins", () => {
    expect(can(["supervisor"], "finance:costs")).toBe(true);
    expect(can(["supervisor"], "water:adjust")).toBe(true);
    expect(can(["supervisor"], "finance:margins")).toBe(false);
    expect(can(["supervisor"], "formula:edit")).toBe(false);
  });
  it("owner has full access", () => {
    expect(can(["owner"], "finance:margins")).toBe(true);
    expect(can(["owner"], "users:manage")).toBe(true);
    expect(primaryRole(["operator", "owner"])).toBe("owner");
  });
});

describe("formula", () => {
  it("premix is 85/9/6 and sums 100", () => {
    expect(PREMIX.sal + PREMIX.cura + PREMIX.azucar).toBe(100);
    const p = premixForMeat(20, 15);
    expect(p.totalG).toBe(300);
    expect(p.curaG).toBeCloseTo(27);
  });
  it("garlic is 120 g per 20 kg", () => {
    expect(phase2ForMeat(20, 10).ajoG).toBeCloseTo(120);
    expect(phase2ForMeat(20, 10).aguaMl).toBeCloseTo(2000);
  });
  it("cold room traffic light", () => {
    expect(restStatus(10)).toBe("resting");
    expect(restStatus(30)).toBe("ready");
    expect(restStatus(49)).toBe("attention");
  });
  it("yield = finished / meat * 100", () => {
    expect(yieldPct(22, 20)).toBeCloseTo(110);
  });
});
