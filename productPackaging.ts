import type { AppConfig, Logistics } from './types';

export type ProductPricingContext = {
  config: AppConfig;
  logistics: Logistics;
  uExwExtra: number;
  uInland: number;
  uPort: number;
  uFreight: number;
  uInsurance: number;
  uDest: number;
  uExtras: number;
};

function applyProfit(cost: number, flag: boolean, percent: number, config: AppConfig): number {
  if (!flag) return cost;
  if (config.profitType === 'markup') return cost * (1 + percent / 100);
  const marginFactor = 1 - percent / 100;
  return marginFactor > 0 ? cost / marginFactor : cost;
}

/** Same EXW-based unit sell logic as dashboard product engine (for alternate unit costs). */
export function computeUnitSellFromCost(
  unitCostOutput: number,
  effectiveProfitPercent: number,
  ctx: ProductPricingContext,
): { unitSellPrice: number; unitProfit: number } {
  if (unitCostOutput <= 0) return { unitSellPrice: 0, unitProfit: 0 };

  const { config, uExwExtra } = ctx;
  const productSell = applyProfit(unitCostOutput, config.profitFlags.exw, effectiveProfitPercent, config);
  const exwExtraSell = applyProfit(uExwExtra, config.profitFlags.exw, effectiveProfitPercent, config);

  if (config.pricingMethod === 'fixed_unit_markup') {
    const multipliers = config.termMultipliers || { exw: 0, fob: 0, cif: 0, ddp: 0 };
    const baseCost_EXW = unitCostOutput + uExwExtra;
    const exwSell = baseCost_EXW * (1 + ((multipliers.exw || 0) / 100));
    return { unitSellPrice: exwSell, unitProfit: exwSell - baseCost_EXW };
  }

  const unitSellPrice = productSell + exwExtraSell;
  const unitProfit = unitSellPrice - (unitCostOutput + uExwExtra);
  return { unitSellPrice, unitProfit };
}

export function packagingExtraUnitCostOutput(
  perUnit: number | undefined,
  currency: string,
  toBase: (amount: number, currency: string) => number,
  toOutput: (amountInIRR: number) => number,
): number {
  const n = Number(perUnit);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return toOutput(toBase(n, currency));
}
