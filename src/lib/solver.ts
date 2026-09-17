import { poisson, getDixonColesAdj } from "./poisson";

export interface SolverTargets {
  p1: number;
  pX: number;
  p2: number;
  pUnder: number;
  p22: number;
  pGg: number; // Novo sidro za Oba tima daju gol
}

export interface SolverSolution {
  lambdaHome: number;
  lambdaAway: number;
  rho: number;
  error: number;
}

const GRID_MAX = 6;

function errorFor(targets: SolverTargets, lh: number, la: number, rho: number): number {
  let c1 = 0;
  let cX = 0;
  let c2 = 0;
  let cUnder = 0;
  let cGg = 0;

  for (let h = 0; h <= GRID_MAX; h++) {
    const pHomeBase = poisson(lh, h);
    for (let a = 0; a <= GRID_MAX; a++) {
      const pAwayBase = poisson(la, a);
      const adj = getDixonColesAdj(h, a, lh, la, rho);
      const p = Math.max(0, pHomeBase * pAwayBase * adj);

      if (h > a) c1 += p;
      else if (h === a) cX += p;
      else c2 += p;

      if (h + a < 2.5) cUnder += p;
      if (h > 0 && a > 0) cGg += p;
    }
  }

  const p22Calc = Math.max(0, poisson(lh, 2) * poisson(la, 2) * getDixonColesAdj(2, 2, lh, la, rho));

  return (
    Math.pow(c1 - targets.p1, 2) +
    Math.pow(cX - targets.pX, 2) +
    Math.pow(c2 - targets.p2, 2) +
    Math.pow(cUnder - targets.pUnder, 2) +
    Math.pow(p22Calc - targets.p22, 2) * 6 + // Težina sidra 2-2
    Math.pow(cGg - targets.pGg, 2) * 4       // Težina sidra za GG
  );
}

export function solveLambdas(targets: SolverTargets): SolverSolution {
  let best: SolverSolution = { lambdaHome: 1.5, lambdaAway: 1.2, rho: 0.0, error: Infinity };

  // 1. Prolaz: Široka trodimenzionalna mreža (lh, la, rho)
  for (let lh = 0.3; lh <= 3.8; lh += 0.1) {
    for (let la = 0.3; la <= 3.8; la += 0.1) {
      // Rho se kreće u rasponu od -0.15 do 0.15 (standard za nogomet)
      for (let rho = -0.12; rho <= 0.12; rho += 0.04) {
        const err = errorFor(targets, lh, la, rho);
        if (err < best.error) {
          best = { lambdaHome: lh, lambdaAway: la, rho: rho, error: err };
        }
      }
    }
  }

  // 2. Prolaz: Fino mikro-ugađanje oko otkrivenog optimuma realnosti
  const fineLoHome = Math.max(0.1, best.lambdaHome - 0.15);
  const fineHiHome = Math.min(4.5, best.lambdaHome + 0.15);
  const fineLoAway = Math.max(0.1, best.lambdaAway - 0.15);
  const fineHiAway = Math.min(4.5, best.lambdaAway + 0.15);
  const fineLoRho = Math.max(-0.15, best.rho - 0.04);
  const fineHiRho = Math.min(0.15, best.rho + 0.04);

  for (let lh = fineLoHome; lh <= fineHiHome; lh += 0.01) {
    for (let la = fineLoAway; la <= fineHiAway; la += 0.01) {
      for (let rho = fineLoRho; rho <= fineHiRho; rho += 0.01) {
        const err = errorFor(targets, lh, la, rho);
        if (err < best.error) {
          best = { lambdaHome: lh, lambdaAway: la, rho: rho, error: err };
        }
      }
    }
  }

  return best;
}

