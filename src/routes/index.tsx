import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Activity, Calculator, Target, Percent, Sigma } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Explanation } from "@/components/statx/explanation";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { analyze, pct, type AnalysisResult, type OddsInput } from "@/lib/poisson";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StatX ScoreMaster PRO — Predviđanje točnog rezultata" },
      {
        name: "description",
        content:
          "Profesionalni analitički alat: uklanjanje marže, xG motor i Poissonova matrica 10×10 za predviđanje točnog nogometnog rezultata.",
      },
      { property: "og:title", content: "StatX ScoreMaster PRO" },
      {
        property: "og:description",
        content:
          "Izračunaj najizgledniji točan rezultat iz kladioničarskih tečajeva uz potpuno matematičko objašnjenje.",
      },
    ],
  }),
  component: Index,
});

const FIELDS: { key: keyof OddsInput; label: string; hint: string }[] = [
  { key: "home", label: "Domaćin (1)", hint: "Tečaj na pobjedu domaćina" },
  { key: "draw", label: "Neriješeno (X)", hint: "Tečaj na remi" },
  { key: "away", label: "Gost (2)", hint: "Tečaj na pobjedu gosta" },
  { key: "over", label: "Više od 2.5", hint: "Tečaj na 3+ gola" },
  { key: "under", label: "Manje od 2.5", hint: "Tečaj na 0-2 gola" },
];

const heatColor = (p: number, max: number) => {
  const t = Math.min(1, p / max);
  return {
    backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(t * 82)}%, var(--card))`,
    color: t > 0.45 ? "var(--primary-foreground)" : "var(--muted-foreground)",
  };
};

function Index() {
  const [values, setValues] = useState<Record<string, string>>({
    home: "2.10",
    draw: "3.40",
    away: "3.60",
    over: "1.85",
    under: "1.95",
    exact22: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [usedOdds, setUsedOdds] = useState<OddsInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { canInstall, installed, install } = usePwaInstall();

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const onCalculate = () => {
    const rawHome = parseFloat(values.home.replace(",", "."));
    const rawDraw = parseFloat(values.draw.replace(",", "."));
    const rawAway = parseFloat(values.away.replace(",", "."));
    const rawOver = parseFloat(values.over.replace(",", "."));
    const rawUnder = parseFloat(values.under.replace(",", "."));
    
    if (!rawHome || !rawDraw || !rawAway || !rawOver || !rawUnder || rawHome <= 1.01 || rawDraw <= 1.01 || rawAway <= 1.01 || rawOver <= 1.01 || rawUnder <= 1.01) {
      setError("Unesite ispravne tečajeve — svaka vrijednost mora biti veća od 1.01.");
      return;
    }
    
    const rawExact22 = values.exact22.trim().replace(",", ".");
    const exact22Num = rawExact22 ? parseFloat(rawExact22) : undefined;

    if (exact22Num !== undefined && (isNaN(exact22Num) || exact22Num <= 1.01)) {
      setError("Tečaj za rezultat 2-2 mora biti veći od 1.01 ukoliko ga unosite.");
      return;
    }

    const odds: OddsInput = { home: rawHome, draw: rawDraw, away: rawAway, over: rawOver, under: rawUnder, exact22: exact22Num };
    setError(null);
    setLoading(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(analyze(odds));
      setUsedOdds(odds);
      setLoading(false);
    }, 1500);
  };

  const maxCell = result ? result.best.prob : 1;

  return (
    <main className="min-h-screen bg-background bg-hero">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
              <Activity className="size-3.5" aria-hidden /> Poissonova analitika u stvarnom vremenu
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              StatX <span className="text-gradient">ScoreMaster PRO</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Profesionalni alat za predviđanje točnog rezultata. Unesite tečajeve, a motor uklanja
              maržu, izvodi očekivane golove i računa matricu 10 × 10.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {result?.calibrated && (
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1 text-xs font-semibold text-primary animate-pulse shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Sustav kalibriran pomoću kvote 2-2
              </div>
            )}
            {canInstall && (
              <Button variant="outline" onClick={install} className="shrink-0">
                <Download className="size-4" aria-hidden /> Instaliraj aplikaciju
              </Button>
            )}
            {installed && (
              <span className="shrink-0 text-xs text-muted-foreground">Aplikacija je instalirana</span>
            )}
          </div>
        </header>

        <section className="surface-panel mt-10 rounded-2xl p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="size-5 text-primary" aria-hidden /> Unos tečajeva
          </h2>
          
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key} className="text-xs text-muted-foreground">
                  {f.label}
                </Label>
                <Input
                  id={f.key}
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  title={f.hint}
                  className="h-12 bg-secondary/50 text-center text-lg font-semibold tabular-nums"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border/40 pt-4 max-w-xs">
            <div className="space-y-2">
              <Label htmlFor="exact22" className="text-xs font-medium text-slate-300 flex justify-between items-center">
                <span>Kvota na točan rezultat 2-2</span>
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider bg-secondary/80 px-1.5 py-0.5 rounded">Paralelno pravilo</span>
              </Label>
              <Input
                id="exact22"
                inputMode="decimal"
                placeholder="npr. 14.50 (Neobavezno)"
                value={values.exact22}
                onChange={(e) => set("exact22", e.target.value)}
                className="h-12 bg-secondary/50 text-center text-md font-mono font-semibold border-primary/20 focus-visible:ring-primary/40"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <Button
            onClick={onCalculate}
            disabled={loading}
            className="mt-6 h-14 w-full text-base font-bold tracking-wide"
            style={{ backgroundImage: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            {loading ? "ANALIZIRAM..." : "IZRAČUNAJ"}
          </Button>
        </section>

        {loading && (
          <section className="surface-panel mt-6 flex flex-col items-center gap-5 rounded-2xl p-12">
            <div className="relative flex size-16 items-center justify-center">
              <span className="absolute inset-0 animate-ring rounded-full border-2 border-primary" />
              <span
                className="absolute inset-0 animate-ring rounded-full border-2 border-primary"
                style={{ animationDelay: "0.5s" }}
              />
              <Sigma className="size-7 text-primary" aria-hidden />
            </div>
            <div className="text-center">
              <p className="font-semibold">Statistička analiza u tijeku…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Uklanjam maržu · primjenjujem pravilo 2-2 · računam očekivane golove · gradim Poissonovu matricu
              </p>
            </div>
          </section>
        )}

        {result && usedOdds && !loading && (
          <div className="mt-6 space-y-6">
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="surface-panel animate-rise rounded-2xl p-7 lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    <Target className="size-4 text-primary" aria-hidden /> Najizgledniji točan rezultat
                  </h2>
                  <p className="mt-6 text-center text-7xl font-black tracking-tighter tabular-nums sm:text-8xl">
                    <span className="text-gradient">
                      {result.best.home} - {result.best.away}
                    </span>
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/60 text-center">
