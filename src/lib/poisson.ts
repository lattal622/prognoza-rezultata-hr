import { solveLambdas, tau } from "./solver";

export interface FinalPrediction {
  score: string;
  home: number;
  away: number;
  prob: number;
  fairOdds: number;
  marketOdds: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  /** Najizgledniji ishod utakmice: 1, X ili 2 */
  outcome: "1" | "X" | "2";
  outcomeLabel: string;
  outcomeProb: number;
  confidence: number;
  /** Drugi najvjerojatniji rezultat */
  secondScore: string;
  secondProb: number;
  /** Kratko obrazloženje zašto je odabran baš taj rezultat */
  reason: string;
}

export interface OddsInput {
  home: number;
  draw: number;
  away: number;
  over: number;
  under: number;
  /** Neobavezno: kvota na točan rezultat 2-2 */
  exact22?: number | undefined;
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
  /** Vjerojatnosti izvedene iz konačne matrice */
  pOverModel: number;
  pUnderModel: number;
  p22Model: number;
  /** Najizgledniji rezultat unutar najizglednijeg ishoda (1/X/2) */
  topByOutcome: { "1": ScoreProb; X: ScoreProb; "2": ScoreProb };
  coverage: number;
  /** Dixon-Coles korekcija niskih rezultata */
  rho: number;
  /** Sukladnost modela s tržišnim vjerojatnostima (1 = savršeno) */
  marketFit: number;
  /** Upozorenja o neuobičajenim kvotama (kutija 7 i 9 iz metodologije) */
  warnings: string[];
  /** Kalibracija pomoću kvote 2-2 */
  calibrated: boolean;
  raw22Exact?: number | undefined;
  market22?: number | undefined;
  poisson22?: number | undefined;
  factor22?: number | undefined;
  calibrated22?: number | undefined;
  solverError?: number | undefined;
  final: FinalPrediction;
}


const MAX_GOALS = 9;

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function poisson(lambda: number, k: number): number {
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

  let lambdaHome = (mu * shareHome) / norm;
  let lambdaAway = (mu * shareAway) / norm;

  // Korak 2b: SOLVER — ako je unesena kvota 2-2, ona povezuje sva tržišta.
  // Tražimo par (λ_dom, λ_gost) koji istovremeno najbolje reproducira
  // 1X2, Manje od 2.5 i točan rezultat 2-2 (metoda najmanjih kvadrata).
  let calibrated = false;
  let raw22Exact: number | undefined;
  let market22: number | undefined;
  let poisson22: number | undefined;
  let factor22: number | undefined;
  let calibrated22: number | undefined;
  let solverError: number | undefined;

  const hasExact22 = !!input.exact22 && isFinite(input.exact22) && input.exact22 > 1.01;
  if (hasExact22) {
    raw22Exact = 1 / (input.exact22 as number);
    market22 = raw22Exact / (1 + margin1x2);
    poisson22 = poisson(lambdaHome, 2) * poisson(lambdaAway, 2);
  }

  // Solver se izvodi UVIJEK: traži par (λ_dom, λ_gost) koji istovremeno
  // najbolje reproducira 1X2 i Manje od 2.5. Ako je unesena kvota 2-2,
  // ona ulazi kao dodatno sidro s većom težinom.
  const sol = solveLambdas({
    p1: pHome,
    pX: pDraw,
    p2: pAway,
    pUnder,
    ...(hasExact22 ? { p22: market22 } : {}),
  });
  lambdaHome = sol.lambdaHome;
  lambdaAway = sol.lambdaAway;
  solverError = sol.error;
  const rho = sol.rho;


  if (hasExact22 && market22 !== undefined && poisson22 !== undefined) {
    calibrated22 = poisson(lambdaHome, 2) * poisson(lambdaAway, 2);
    factor22 = poisson22 > 0 ? market22 / poisson22 : undefined;
    calibrated = true;
  }

  // Korak 3: Poissonova matrica 10x10 s Dixon-Coles korekcijom niskih rezultata
  const matrix: number[][] = [];
  const list: ScoreProb[] = [];
  let coverage = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    const row: number[] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = poisson(lambdaHome, x) * poisson(lambdaAway, y) * tau(x, y, lambdaHome, lambdaAway, rho);
      row.push(p);
      coverage += p;
    }
    matrix.push(row);
  }
  // Normalizacija na točno 100 %
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const row = matrix[x] as number[];
      row[y] = (row[y] as number) / coverage;
      list.push({ home: x, away: y, prob: row[y] as number });
    }
  }

  list.sort((a, b) => b.prob - a.prob);

  let pHomeWin = 0;
  let pDrawResult = 0;
  let pAwayWin = 0;
  let pBtts = 0;
  let pOverModel = 0;
  let pUnderModel = 0;
  let bestHomeWin: ScoreProb | undefined;
  let bestDraw: ScoreProb | undefined;
  let bestAwayWin: ScoreProb | undefined;
  for (const s of list) {
    if (s.home > s.away) {
      pHomeWin += s.prob;
      if (!bestHomeWin) bestHomeWin = s;
    } else if (s.home === s.away) {
      pDrawResult += s.prob;
      if (!bestDraw) bestDraw = s;
    } else {
      pAwayWin += s.prob;
      if (!bestAwayWin) bestAwayWin = s;
    }
    if (s.home > 0 && s.away > 0) pBtts += s.prob;
    if (s.home + s.away > 2.5) pOverModel += s.prob;
    else pUnderModel += s.prob;
  }

  const p22Model = (matrix[2]?.[2] as number) ?? 0;

  const topByOutcome = {
    "1": bestHomeWin as ScoreProb,
    X: bestDraw as ScoreProb,
    "2": bestAwayWin as ScoreProb,
  };

  // Konačni prijedlog: najizgledniji rezultat UNUTAR najizglednijeg ishoda (1/X/2).
  // Time se izbjegava da model uvijek vrati remi kada tržište jasno favorizira jednu stranu.
  const outcomes: { key: "1" | "X" | "2"; label: string; p: number; score: ScoreProb }[] = [
    { key: "1", label: "Pobjeda domaćina", p: pHomeWin, score: topByOutcome["1"] },
    { key: "X", label: "Neriješeno", p: pDrawResult, score: topByOutcome.X },
    { key: "2", label: "Pobjeda gosta", p: pAwayWin, score: topByOutcome["2"] },
  ];
  outcomes.sort((a, b) => b.p - a.p);
  const win = outcomes[0] as (typeof outcomes)[number];
  const fs = win.score;

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
    pOverModel,
    pUnderModel,
    p22Model,
    topByOutcome,
    coverage,
    calibrated,
    raw22Exact,
    market22,
    poisson22,
    factor22,
    calibrated22,
    solverError,
    final: {
      score: `${fs.home}-${fs.away}`,
      home: fs.home,
      away: fs.away,
      prob: fs.prob,
      fairOdds: 1 / fs.prob,
      marketOdds: 1 / (fs.prob * (1 + margin1x2)),
      expectedHomeGoals: lambdaHome,
      expectedAwayGoals: lambdaAway,
      outcome: win.key,
      outcomeLabel: win.label,
      outcomeProb: win.p,
      confidence: fs.prob,
    },
  };
}

export const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)} %`;
