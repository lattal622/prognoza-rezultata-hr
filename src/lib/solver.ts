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
  /** Kvadratna greška najboljeg rješenja (0 = savršeno poklapanje) */
  error: number;
}

const GRID_MAX = 6;

function pmf(lambda: number): number[] {
  const arr: number[] = [];
  for (let k = 0; k <= GRID_MAX; k++) arr.push(poisson(lambda, k));
  return arr;
}

function errorFor(targets: SolverTargets, ph: number[], pa: number[]): number {
  let c1 = 0;
  let cX = 0;
  let c2 = 0;
  let cUnder = 0;
  for (let h = 0; h <= GRID_MAX; h++) {
    const a1 = ph[h] as number;
    for (let a = 0; a <= GRID_MAX; a++) {
      const p = a1 * (pa[a] as number);
      if (h > a) c1 += p;
      else if (h === a) cX += p;
      else c2 += p;
      if (h + a < 2.5) cUnder += p;
    }
  }
  const p22 = (ph[2] as number) * (pa[2] as number);
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
 * Pretražuje prostor očekivanih golova (λ) i pronalazi kombinaciju koja
 * istovremeno najvjernije reproducira 1X2, Manje od 2.5 i kvotu za 2-2.
 * Dvofazno: gruba mreža pa fino profinjavanje oko najboljeg rješenja.
 */
export function solveLambdas(targets: SolverTargets): SolverSolution {
  const search = (from: number, to: number, step: number, seed: SolverSolution): SolverSolution => {
    let best = seed;
    const lo = Math.max(0.15, from);
    const hi = Math.min(5, to);
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
    for (let lh = lo; lh <= hi + 1e-9; lh += step) {
      const ph = get(lh);
      for (let la = lo; la <= hi + 1e-9; la += step) {
        const err = errorFor(targets, ph, get(la));
        if (err < best.error) best = { lambdaHome: lh, lambdaAway: la, error: err };
      }
    }
    return best;
  };

  let best: SolverSolution = { lambdaHome: 1, lambdaAway: 1, error: Infinity };
  best = search(0.2, 4.0, 0.04, best);
  best = search(best.lambdaHome - 0.06, best.lambdaHome + 0.06, 0.005, {
    ...best,
  });
  // Drugi prolaz fino podešava obje osi oko pronađenog optimuma
  const lo = Math.max(0.15, Math.min(best.lambdaHome, best.lambdaAway) - 0.06);
  const hi = Math.min(5, Math.max(best.lambdaHome, best.lambdaAway) + 0.06);
  best = search(lo, hi, 0.005, best);

  return best;
}
