export interface OddsInput {
  home: number;
  draw: number;
  away: number;
  over: number;
  under: number;
  /** Neobavezno: kvota na točan rezultat 2-2 */
  exact22?: number;
}

export interface ScoreProb {
  home: number;
  away: number;
  prob: number;
}

export interface AnalysisResult {
  margin1x2: number;
  marginOu: number;
  rawHome: number;
  rawDraw: number;
  rawAway: number;
  rawOver: number;
  rawUnder: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  pOver: number;
  pUnder: number;
  mu: number;
  lambdaHome: number;
  lambdaAway: number;
  matrix: number[][];
  top: ScoreProb[];
  best: ScoreProb;
  pHomeWin: number;
  pDrawResult: number;
  pAwayWin: number;
  pBtts: number;
  coverage: number;
  /** Kalibracija pomoću kvote 2-2 */
  calibrated: boolean;
  raw22Exact?: number;
  market22?: number;
  poisson22?: number;
  factor22?: number;
  calibrated22?: number;
}

const MAX_GOALS = 9;

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function poisson(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** P(ukupno golova <= 2) za Poissonovu razdiobu s očekivanjem mu */
function cumulativeUnder3(mu: number): number {
  return poisson(mu, 0) + poisson(mu, 1) + poisson(mu, 2);
}

/** Obrnuti inženjering: pronađi mu takav da je P(Over 2.5) = ciljana vjerojatnost */
export function solveMu(pOver: number): number {
  let lo = 0.05;
  let hi = 12;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const over = 1 - cumulativeUnder3(mid);
    if (over < pOver) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function analyze(input: OddsInput): AnalysisResult {
  const rawHome = 1 / input.home;
  const rawDraw = 1 / input.draw;
  const rawAway = 1 / input.away;
  const rawOver = 1 / input.over;
  const rawUnder = 1 / input.under;

  // Korak 1: uklanjanje marže
  const margin1x2 = rawHome + rawDraw + rawAway - 1;
  const marginOu = rawOver + rawUnder - 1;

  const pHome = rawHome / (1 + margin1x2);
  const pDraw = rawDraw / (1 + margin1x2);
  const pAway = rawAway / (1 + margin1x2);
  const pOver = rawOver / (1 + marginOu);
  const pUnder = rawUnder / (1 + marginOu);

  // Korak 2: procjena očekivanih golova
  const mu = solveMu(pOver);
  // Raspodjela ukupnog očekivanja prema snazi momčadi (remi se dijeli 50/50)
  const strengthHome = pHome + pDraw / 2;
  const strengthAway = pAway + pDraw / 2;
  const total = strengthHome + strengthAway;
  // Blaga kompresija da ekstremni favoriti ne dobiju nerealan udio
  const shareHome = Math.pow(strengthHome / total, 0.85);
  const shareAway = Math.pow(strengthAway / total, 0.85);
  const norm = shareHome + shareAway;

  const lambdaHome = (mu * shareHome) / norm;
  const lambdaAway = (mu * shareAway) / norm;

  // Korak 3: Izrada osnovne Poissonove matrice (0-9)
  let matrix: number[][] = [];
  for (let x = 0; x <= MAX_GOALS; x++) {
    const row: number[] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = poisson(lambdaHome, x) * poisson(lambdaAway, y);
      row.push(p);
    }
    matrix.push(row);
  }

  // PODACI ZA PARALELNU KALIBRACIJU POMOĆU KVOTE 2-2
  let calibrated = false;
  let raw22Exact = matrix[2][2];
  let market22 = 0;
  let factor22 = 1;
  let calibrated22 = matrix[2][2];

  if (input.exact22 && input.exact22 > 1) {
    // Čišćenje marže s kvote za 2-2 koristeći opću 1X2 marginu
    market22 = (1 / input.exact22) / (1 + margin1x2);

    if (raw22Exact > 0.0001) {
      factor22 = market22 / raw22Exact;
      calibrated = true;

      // Primjena Dixon-Coles faktora na remije i efikasne rezultate (ukupno golova >= 3)
      for (let x = 0; x <= MAX_GOALS; x++) {
        for (let y = 0; y <= MAX_GOALS; y++) {
          if (x === y || (x + y) >= 3) {
            // Težinski koeficijent (što je rezultat bliže strukturi 2-2, utjecaj je veći)
            const weight = (x + y) / 4;
            matrix[x][y] = matrix[x][y] * (1 + (factor22 - 1) * Math.min(weight, 1.2));
          }
        }
      }
      calibrated22 = matrix[2][2];
    }
  }

  // NORMALIZACIJA MATRICE (Zbroj svih 100 polja mora biti točno 1.00 / 100%)
  let currentTotalSum = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      currentTotalSum += matrix[x][y];
    }
  }
  
  if (currentTotalSum > 0) {
    for (let x = 0; x <= MAX_GOALS; x++) {
      for (let y = 0; y <= MAX_GOALS; y++) {
        matrix[x][y] = matrix[x][y] / currentTotalSum;
      }
    }
  }

  // Generiranje liste rezultata iz kalibrirane i normalizirane matrice
  const list: ScoreProb[] = [];
  let coverage = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = matrix[x][y];
      list.push({ home: x, away: y, prob: p });
      coverage += p;
    }
  }

  // Sortiranje rezultata po novoj vjerojatnosti za "Najizgledniji" i "Top 5" prijedloga
  list.sort((a, b) => b.prob - a.prob);

  let pHomeWin = 0;
  let pDrawResult = 0;
  let pAwayWin = 0;
  let pBtts = 0;
  for (const s of list) {
    if (s.home > s.away) pHomeWin += s.prob;
    else if (s.home === s.away) pDrawResult += s.prob;
    else pAwayWin += s.prob;
    if (s.home > 0 && s.away > 0) pBtts += s.prob;
  }

  return {
    margin1x2,
    marginOu,
    rawHome,
    rawDraw,
    rawAway,
    rawOver,
    rawUnder,
    pHome,
    pDraw,
    pAway,
    pOver,
    pUnder,
    mu,
    lambdaHome,
    lambdaAway,
    matrix,
    top: list.slice(0, 6),
    best: list[0] as ScoreProb,
    pHomeWin,
    pDrawResult,
    pAwayWin,
    pBtts,
    coverage,
    calibrated,
    raw22Exact,
    market22,
    poisson22: raw22Exact,
    factor22,
    calibrated22: matrix[2][2]
  };
}

export const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)} %`;
