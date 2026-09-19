import { poisson } from "./poisson";

export interface SolverTargets {
  /** Fer vjerojatnosti nakon uklanjanja marže */
  p1: number;
  pX: number;
  p2: number;
  pUnder: number;
  /** Fer vjerojatnost točnog rezultata 2-2 (sidro, neobavezno) */
  p22?: number | undefined;
}

export interface SolverSolution {
  lambdaHome: number;
  lambdaAway: number;
  /** Dixon-Coles korekcija za rezultate s malo golova */
  rho: number;
  /** Kvadratna greška najboljeg rješenja (0 = savršeno poklapanje) */
  error: number;
}

const GRID_MAX = 9;

function pmf(lambda: number): number[] {
  const arr: number[] = [];
  for (let k = 0; k <= GRID_MAX; k++) arr.push(poisson(lambda, k));
  return arr;
}

/**
 * Dixon-Coles faktor: čista Poissonova neovisnost podcjenjuje 0-0 i 1-1,
 * a precjenjuje 1-0 / 0-1. Ovaj faktor ispravlja ta četiri polja.
 */
export function tau(x: number, y: number, lh: number, la: number, rho: number): number {
  if (x === 0 && y === 0) return Math.max(0.01, 1 - lh * la * rho);
  if (x === 0 && y === 1) return Math.max(0.01, 1 + lh * rho);
  if (x === 1 && y === 0) return Math.max(0.01, 1 + la * rho);
  if (x === 1 && y === 1) return Math.max(0.01, 1 - rho);
  return 1;
}

function errorFor(
  targets: SolverTargets,
  lh: number,
  la: number,
  ph: number[],
  pa: number[],
  rho: number,
): number {
  let c1 = 0;
  let cX = 0;
  let c2 = 0;
  let cUnder = 0;
  let total = 0;
  let p22 = 0;
  for (let h = 0; h <= GRID_MAX; h++) {
    const a1 = ph[h] as number;
    for (let a = 0; a <= GRID_MAX; a++) {
      const p = a1 * (pa[a] as number) * tau(h, a, lh, la, rho);
      total += p;
      if (h > a) c1 += p;
      else if (h === a) cX += p;
      else c2 += p;
      if (h + a < 2.5) cUnder += p;
      if (h === 2 && a === 2) p22 = p;
    }
  }
  if (total <= 0) return Infinity;
  c1 /= total;
  cX /= total;
  c2 /= total;
  cUnder /= total;
  p22 /= total;

  const anchor =
    targets.p22 !== undefined && isFinite(targets.p22)
      ? Math.pow(p22 - targets.p22, 2) * 5
      : 0;
  return (
    Math.pow(c1 - targets.p1, 2) +
    Math.pow(cX - targets.pX, 2) +
    Math.pow(c2 - targets.p2, 2) +
    Math.pow(cUnder - targets.pUnder, 2) +
    anchor
  );
}

/**
 * Pretražuje prostor očekivanih golova (λ) i Dixon-Coles parametra ρ te
 * pronalazi kombinaciju koja istovremeno najvjernije reproducira 1X2,
 * Manje od 2.5 i (ako je dostupna) kvotu za 2-2.
 * Dvofazno: gruba mreža pa fino profinjavanje oko najboljeg rješenja.
 */
export function solveLambdas(targets: SolverTargets): SolverSolution {
  const cache = new Map<number, number[]>();
  const get = (l: number) => {
    const key = Math.round(l * 10000);
    let v = cache.get(key);
    if (!v) {
      v = pmf(l);
      cache.set(key, v);
    }
    return v;
  };

  const search = (
    from: number,
    to: number,
    step: number,
    rhos: number[],
    seed: SolverSolution,
  ): SolverSolution => {
    let best = seed;
    const lo = Math.max(0.15, from);
    const hi = Math.min(5, to);
    for (let lh = lo; lh <= hi + 1e-9; lh += step) {
      const ph = get(lh);
      for (let la = lo; la <= hi + 1e-9; la += step) {
        const pa = get(la);
        for (const rho of rhos) {
          const err = errorFor(targets, lh, la, ph, pa, rho);
          if (err < best.error) best = { lambdaHome: lh, lambdaAway: la, rho, error: err };
        }
      }
    }
    return best;
  };

  let best: SolverSolution = { lambdaHome: 1, lambdaAway: 1, rho: 0, error: Infinity };
  best = search(0.2, 4.0, 0.05, [-0.1, -0.03, 0.04, 0.1], best);

  const fineRhos: number[] = [];
  for (let r = best.rho - 0.06; r <= best.rho + 0.06 + 1e-9; r += 0.015) fineRhos.push(r);

  const lo = Math.max(0.15, Math.min(best.lambdaHome, best.lambdaAway) - 0.07);
  const hi = Math.min(5, Math.max(best.lambdaHome, best.lambdaAway) + 0.07);
  best = search(lo, hi, 0.01, fineRhos, best);

  return best;
}
