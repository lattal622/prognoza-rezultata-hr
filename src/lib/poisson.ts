import { solveLambdas } from "./solver";

export interface FinalPrediction {
  score: string;
  home: number;
  away: number;
  prob: number;
  fairOdds: number;
  marketOdds: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}

export interface OddsInput {
  home: number;
  draw: number;
  away: number;
  over: number;
  under: number;
  exact22: number;
  gg?: number;
}

export interface ScoreProb {
  home: number;
  away: number;
  prob: number;
  score?: string;
  odds?: number;
}

export interface AnalysisResult {
  margin1x2: number;
  marginOu: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  pOver: number;
  pUnder: number;
  mu: number;
  lambda: number;
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
  final: FinalPrediction;
}

const MAX_GOALS = 8;

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function poisson(lambda: number, k: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

export function getDixonColesAdj(h: number, a: number, lH: number, lA: number, rho: number): number {
  if (rho === 0) return 1;
  if (h === 0 && a === 0) return 1 - lH * lA * rho;
  if (h === 1 && a === 0) return 1 + lA * rho;
  if (h === 0 && a === 1) return 1 + lH * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

function cumulativeUnder3(mu: number): number {
  return poisson(mu, 0) + poisson(mu, 1) + poisson(mu, 2);
}

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

  const margin1x2 = rawHome + rawDraw + rawAway - 1;
  const marginOu = rawOver + rawUnder - 1;

  const pHome = rawHome / (1 + margin1x2);
  const pDraw = rawDraw / (1 + margin1x2);
  const pAway = rawAway / (1 + margin1x2);
  const pOver = rawOver / (1 + marginOu);
  const pUnder = rawUnder / (1 + marginOu);

  const p22Target = (1 / input.exact22) / (1 + margin1x2);
  const pGgTarget = input.gg ? ((1 / input.gg) / (1 + marginOu)) : 0.55;

  const muInit = solveMu(pOver);
  const strengthHome = pHome + pDraw / 2;
  const strengthAway = pAway + pDraw / 2;
  const total = strengthHome + strengthAway;
  
  const lambdaHomeInit = (muInit * (strengthHome / total));
  const lambdaAwayInit = (muInit * (strengthAway / total));

  const sol = solveLambdas({
    p1: pHome,
    pX: pDraw,
    p2: pAway,
    pUnder: pUnder,
    p22: p22Target,
    pGg: pGgTarget
  });

  const lambdaHome = sol.lambdaHome;
  const lambdaAway = sol.lambdaAway;
  const rho = sol.rho;

  const matrix: number[][] = [];
  const list: ScoreProb[] = [];
  let coverage = 0;
  const avgMargin = 1 + margin1x2;

  for (let x = 0; x <= MAX_GOALS; x++) {
    const row: number[] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const pBase = poisson(lambdaHome, x) * poisson(lambdaAway, y);
      const adj = getDixonColesAdj(x, y, lambdaHome, lambdaAway, rho);
      const p = Math.max(0, pBase * adj);
      
      row.push(p);
      list.push({ 
        home: x, 
        away: y, 
        prob: p,
        score: x + "-" + y,
        odds: parseFloat((1 / (p * (1 / avgMargin))).toFixed(2))
      });
      coverage += p;
    }
    matrix.push(row);
  }

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

  const bestResult = list[0] as ScoreProb;

  return {
    margin1x2,
    marginOu,
    pHome,
    pDraw,
    pAway,
    pOver,
    pUnder,
    mu: lambdaHome + lambdaAway,
    lambda: lambdaHome,
    lambdaHome,
    lambdaAway,
    matrix,
    top: list.slice(0, 6),
    best: bestResult,
    pHomeWin,
    pDrawResult,
    pAwayWin,
    pBtts,
    coverage,
    final: {
      score: bestResult.score || (bestResult.home + "-" + bestResult.away),
      home: bestResult.home,
      away: bestResult.away,
      prob: bestResult.prob,
      fairOdds: 1 / bestResult.prob,
      marketOdds: bestResult.odds || (1 / (bestResult.prob * avgMargin)),
      expectedHomeGoals: lambdaHome,
      expectedAwayGoals: lambdaAway,
    },
  };
}

export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)} %`;


