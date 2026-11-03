// Base formulas agreed with the plant. Percentages are over clean meat weight.
export const PREMIX = { sal: 85, cura: 9, azucar: 6 } as const; // % of premix
export const PREMIX_DOSE_RANGE = { min: 12, max: 15 } as const; // g per kg of meat
export const PHASE2 = { ajo: 0.6, guajillo: 1.5, pimenton: 0.4, especias: 0.6 } as const; // %
export const WATER_RANGE = { min: 10, max: 12 } as const; // % of meat, excludes guajillo hydration
export const BAG_SIZES_KG = [10, 15, 17, 20] as const;

export function premixForMeat(meatKg: number, doseGPerKg: number) {
  const total = meatKg * doseGPerKg;
  return {
    totalG: total,
    salG: (total * PREMIX.sal) / 100,
    curaG: (total * PREMIX.cura) / 100,
    azucarG: (total * PREMIX.azucar) / 100,
  };
}

export function phase2ForMeat(meatKg: number, waterPct: number) {
  const g = meatKg * 1000;
  return {
    ajoG: (g * PHASE2.ajo) / 100,
    guajilloG: (g * PHASE2.guajillo) / 100,
    pimentonG: (g * PHASE2.pimenton) / 100,
    especiasG: (g * PHASE2.especias) / 100,
    aguaMl: (g * waterPct) / 100,
  };
}

export type RestStatus = "resting" | "ready" | "attention";

/** Cold-room traffic light: <24h resting, 24–48h ready to grind, >48h attention. */
export function restStatus(hours: number): RestStatus {
  if (hours < 24) return "resting";
  if (hours <= 48) return "ready";
  return "attention";
}

export function yieldPct(finishedKg: number, meatKg: number): number {
  if (meatKg <= 0) return 0;
  return (finishedKg / meatKg) * 100;
}

/**
 * Suggest bag portions from standard sizes (20/17/15/10 kg).
 * Greedy with largest bags; the last bag carries the remainder (may be smaller than 10 kg).
 */
export function suggestBags(cleanKg: number): number[] {
  const bags: number[] = [];
  let left = Math.round(cleanKg * 1000) / 1000;
  const sizes = [...BAG_SIZES_KG].sort((a, b) => b - a);
  while (left > 0.0005) {
    const fit = sizes.find((s) => s <= left + 0.0005);
    if (!fit) { bags.push(Math.round(left * 1000) / 1000); break; }
    bags.push(fit);
    left = Math.round((left - fit) * 1000) / 1000;
  }
  return bags;
}

export function cleaningYieldPct(grossKg: number, wasteKg: number): number {
  if (grossKg <= 0) return 0;
  return ((grossKg - wasteKg) / grossKg) * 100;
}
