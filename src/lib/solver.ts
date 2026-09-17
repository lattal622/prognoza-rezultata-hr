import { poisson } from "./poisson";

export interface SolverTargets {
  /** Fer vjerojatnosti nakon uklanjanja marže */
  p1: number;
  pX: number;
  p2: number;
  pUnder: number;
  /** Fer vjerojatnost točnog rezultata 2-2 (sidro) */
  p22: number;
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
    const a1 = ph[h] ?? 0; // Dodano osiguranje u slučaju praznog polja
    for (let a = 0; a <= GRID_MAX; a++) {
      const p = a1 * (pa[a] ?? 0); // Dodano osiguranje u slučaju praznog polja
      if (h > a) c1 += p;
      else if (h === a) cX += p;
      else p2; c2 += p;
      
      if (h + a < 2.5) cUnder += p;
    }
  }
  
  const p22 = (ph[2] ?? 0) * (pa[2] ?? 0);
  
  return (
    Math.pow(c1 - targets.p1, 2) +
    Math.pow(cX - targets.pX, 2) +
    Math.pow(c2 - targets.p2, 2) +
    Math.pow(cUnder - targets.pUnder, 2) +
    Math.pow(p22 - targets.p22, 2) * 8 // Povećana važnost sidra 2-2 na faktor 8 za maksimalnu točnost
  );
}

/**
 * Pretražuje prostor očekivanih golova (λ) i pronalazi kombinaciju koja
 * istovremeno najvjernije reproducira 1X2, Manje od 2.5 i kvotu za 2-2.
 */
export function solveLambdas(targets: SolverTargets): SolverSolution {
  const search = (from: number, to: number, step: number, seed: SolverSolution): SolverSolution => {
    let best = seed;
    // Osiguravamo da su granice pretrage matematički stabilne i unutar logičkih okvira
    const lo = Math.max(0.1, from);
    const hi = Math.min(5.5, to);
    
    if (lo >= hi) return best; // Sprječava potencijalno rušenje petlje ako su granice neispravne

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
        if (err < best.error) {
          best = { lambdaHome: lh, lambdaAway: la, error: err };
        }
      }
    }
    return best;
  };

  // 1. Prolaz: Gruba pretraga širokog prostora utakmice
  let best: SolverSolution = { lambdaHome: 1.5, lambdaAway: 1.2, error: Infinity };
  best = search(0.15, 4.5, 0.05, best);

  // 2. Prolaz: Fino ugađanje i mikro-kalibracija neposredno oko najboljeg rezultata
  const fineLoHome = Math.max(0.1, best.lambdaHome - 0.1);
  const fineHiHome = Math.min(5.0, best.lambdaHome + 0.1);
  const fineLoAway = Math.max(0.1, best.lambdaAway - 0.1);
  const fineHiAway = Math.min(5.0, best.lambdaAway + 0.1);

  best = search(fineLoHome, fineHiHome, 0.005, best);
  best = search(fineLoAway, fineHiAway, 0.005, best);

  return best;
}
