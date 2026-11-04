import { describe, it, expect } from "vitest";
import { coldRoomHours, coldRoomStatus, fifoBags } from "@/lib/cold-room";
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
  it("cold room is resting before 24h, ready at 24–48h inclusive and attention afterward", () => {
    const entered = "2026-11-01T00:00:00Z";
    const start = Date.parse(entered);
    expect(coldRoomHours(entered, start + 30 * 3_600_000)).toBe(30);
    expect(coldRoomStatus(entered, start + 24 * 3_600_000 - 1)).toBe("resting");
    expect(coldRoomStatus(entered, start + 24 * 3_600_000)).toBe("ready");
    expect(coldRoomStatus(entered, start + 48 * 3_600_000)).toBe("ready");
    expect(coldRoomStatus(entered, start + 48 * 3_600_000 + 1)).toBe("attention");
  });
  it("orders cold room bags oldest first without modifying the source", () => {
    const bags = [{ id: "new", entered_cold_room_at: "2026-11-03T00:00:00Z" }, { id: "old", entered_cold_room_at: "2026-11-01T00:00:00Z" }];
    expect(fifoBags(bags).map((bag) => bag.id)).toEqual(["old", "new"]);
    expect(bags[0].id).toBe("new");
  });
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

import { suggestBags, cleaningYieldPct, curedMassKg, bagWeightWithinTolerance } from "@/lib/formula";
describe("phase 1", () => {
  it("includes 3060 g of premix in 204 kg of meat before refrigeration", () => {
    expect(curedMassKg(204, premixForMeat(204, 15).totalG)).toBeCloseTo(207.06);
    expect(curedMassKg(152, premixForMeat(152, 15).totalG)).toBeCloseTo(154.28);
  });
  it("accepts inclusive ±1% and rejects weights outside that margin", () => {
    expect(bagWeightWithinTolerance(207.06 * 0.99, 207.06)).toBe(true);
    expect(bagWeightWithinTolerance(207.06 * 1.01, 207.06)).toBe(true);
    expect(bagWeightWithinTolerance(207.06 * 0.9899, 207.06)).toBe(false);
    expect(bagWeightWithinTolerance(207.06 * 1.0101, 207.06)).toBe(false);
    expect(bagWeightWithinTolerance(204, 207.06)).toBe(false);
    expect(bagWeightWithinTolerance(0, 0)).toBe(false);
  });
  it("accepts freely weighed bags rather than requiring standard sizes", () => {
    expect(bagWeightWithinTolerance(11.234 + 143.046, curedMassKg(152, 2280))).toBe(true);
  });
  it("suggests 20 kg bags plus remainder", () => {
    expect(suggestBags(57)).toEqual([20, 20, 17]);
    expect(suggestBags(45)).toEqual([20, 20, 5]);
    expect(suggestBags(23)).toEqual([20, 3]);
  });
  it("bags sum to clean meat", () => {
    expect(suggestBags(83.4).reduce((a, b) => a + b, 0)).toBeCloseTo(83.4);
  });
  it("cleaning yield", () => {
    expect(cleaningYieldPct(50, 5)).toBeCloseTo(90);
  });
});
