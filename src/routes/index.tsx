import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Activity, Calculator, Target, Percent, Sigma, AlertCircle } from "lucide-react";

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

function Index() {
  const [values, setValues] = useState<Record<keyof OddsInput, string>>({
    home: "2.10",
    draw: "3.40",
    away: "3.60",
    over: "1.85",
    under: "1.95",
    exact22: "13.00", // Postavljena zadana vrijednost jer je polje sada obavezno
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [usedOdds, setUsedOdds] = useState<OddsInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { canInstall, installed, install } = usePwaInstall();

  const set = (k: keyof OddsInput, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const onCalculate = () => {
    const nums = FIELDS.map((f) => parseFloat(String(values[f.key]).replace(",", ".")));
    if (nums.some((v) => !isFinite(v) || v <= 1.01)) {
      setError("Unesite ispravne tečajeve — svaka vrijednost mora biti veća od 1.01.");
      return;
    }

    const raw22 = String(values.exact22 ?? "").trim();
    if (raw22 === "") {
      setError("Polje 'Kvota na točan rezultat 2-2' je obavezno za kalibraciju vrhunskog pravila.");
      return;
    }

    const v22 = parseFloat(raw22.replace(",", "."));
    if (!isFinite(v22) || v22 <= 1.01) {
      setError("Kvota na točan rezultat 2-2 mora biti veća od 1.01.");
      return;
    }

    const [h, d, a, o, u] = nums as [number, number, number, number, number];
    const odds: OddsInput = { home: h, draw: d, away: a, over: o, under: u, exact22: v22 };
    
    setError(null);
    setLoading(true);
    setResult(null);
    
    window.setTimeout(() => {
      try {
        const analysis = analyze(odds);
        if (!analysis || !analysis.best) {
          throw new Error("Model nije uspio generirati rezultat.");
        }
        setResult(analysis);
        setUsedOdds(odds);
      } catch (err) {
        setError("Došlo je do greške prilikom izračuna. Provjerite jesu li unesene kvote realne.");
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

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
              maržu, izvodi očekivane golove i računa točan ishod.
            </p>
          </div>
          {canInstall && (
            <Button variant="outline" onClick={install} className="shrink-0">
              <Download className="size-4" aria-hidden /> Instaliraj aplikaciju
            </Button>
          )}
          {installed && (
            <span className="shrink-0 text-xs text-muted-foreground">Aplikacija je instalirana</span>
          )}
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

          <div className="mt-5 grid grid-cols-1 gap-2 sm:max-w-sm">
            <Label htmlFor="exact22" className="text-xs font-semibold text-primary">
              Kvota na točan rezultat 2-2 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exact22"
              inputMode="decimal"
              placeholder="npr. 13.00"
              value={values.exact22}
              onChange={(e) => set("exact22", e.target.value)}
              title="Obavezna kvota za kalibraciju i povezivanje svih tržišta"
              className="h-12 bg-secondary/50 border-primary/40 text-center text-lg font-semibold tabular-nums focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Ovo polje je obavezno. Unos ove kvote fiksira matematičko sidro za točan izračun.
            </p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                Uklanjam maržu · kalibriram sidro 2-2 · računam točan rezultat
              </p>
            </div>
          </section>
        )}

        {/* NOVA I VELIKA KARTICA ZA PREDVIĐENI REZULTAT */}
        {!loading && result && result.best && (
          <section className="mt-8 bg-card p-6 rounded-2xl shadow-xl border border-primary/20 max-w-xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Target className="size-3.5" /> Analiza završena — Vrhunsko predviđanje
            </span>
            
            <h2 className="text-sm font-bold text-muted-foreground mt-4 uppercase tracking-widest">
              Predviđeni točan rezultat
            </h2>
            
            {/* Veliki upečatljivi rezultat (npr. 2-1 ili 2-2) */}
            <div className="text-6xl font-black text-foreground my-4 tracking-tight">
              {result.best.score}
            </div>

            {/* Izračunata kvota i postotak sigurnosti */}
            <div className="grid grid-cols-2 gap-4 my-6 p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-center gap-1">
                  <Calculator className="size-3" /> Izračunata Kvota
                </p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  @{result.best.odds ? result.best.odds.toFixed(2) : (100 / result.best.prob).toFixed(2)}
                </p>
              </div>
