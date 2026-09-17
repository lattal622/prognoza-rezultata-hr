import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Activity, Calculator, Target, Percent, Sigma, AlertCircle, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { analyze, pct, type AnalysisResult, type OddsInput } from "@/lib/poisson";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StatX ScoreMaster PRO — Predviđanje točnog rezultata" },
      {
        name: "description",
        content: "Profesionalni analitički alat s Dixon-Coles prilagodbom i dvostrukim sidrenjem tržišta.",
      },
    ],
  }),
  component: Index,
});

const FIELDS: { key: keyof Omit<OddsInput, 'exact22' | 'gg'>; label: string; hint: string }[] = [
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
    exact22: "13.00",
    gg: "1.75",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
    const rawGg = String(values.gg ?? "").trim();
    
    if (raw22 === "" || rawGg === "") {
      setError("Polja 'Kvota 2-2' i 'Kvota Oba tima daju gol (GG)' su obavezna za maksimalnu točnost.");
      return;
    }

    const v22 = parseFloat(raw22.replace(",", "."));
    const vGg = parseFloat(rawGg.replace(",", "."));

    if (!isFinite(v22) || v22 <= 1.01 || !isFinite(vGg) || vGg <= 1.01) {
      setError("Sve kvote moraju biti veće od 1.01.");
      return;
    }

    const [h, d, a, o, u] = nums as [number, number, number, number, number];
    const odds: OddsInput = { home: h, draw: d, away: a, over: o, under: u, exact22: v22, gg: vGg };
    
    setError(null);
    setLoading(true);
    setResult(null);
    
    window.setTimeout(() => {
      try {
        const analysis = analyze(odds);
        setResult(analysis);
      } catch (err) {
        setError("Došlo je do greške prilikom izračuna. Provjerite jesu li unesene kvote realne.");
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-primary uppercase">
              <Activity className="size-3.5" /> Dixon-Coles & Poisson PRO motor aktivan
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
              StatX ScoreMaster PRO
            </h1>
          </div>
          {canInstall && (
            <Button variant="outline" onClick={install} className="shrink-0">
              <Download className="size-4" /> Instaliraj aplikaciju
            </Button>
          )}
        </header>

        <section className="bg-card p-5 sm:p-7 rounded-2xl border border-border shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-foreground">
            <Calculator className="size-5 text-primary" /> Unos osnovnih tečajeva
          </h2>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key} className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  id={f.key}
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="h-12 text-center text-lg font-semibold"
                />
              </div>
            ))}
          </div>

          <h2 className="flex items-center gap-2 text-md font-semibold mt-6 mb-3 text-primary">
            <Shield className="size-4" /> Profesionalna Kalibracijska Sidra (Obavezno)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="exact22" className="text-xs font-semibold text-muted-foreground">
                Kvota na točan rezultat 2-2 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exact22"
                inputMode="decimal"
                value={values.exact22}
                onChange={(e) => set("exact22", e.target.value)}
                className="h-12 text-center text-lg font-semibold border-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gg" className="text-xs font-semibold text-muted-foreground">
                Kvota na Oba tima daju gol (GG) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gg"
                inputMode="decimal"
                value={values.gg}
                onChange={(e) => set("gg", e.target.value)}
                className="h-12 text-center text-lg font-semibold border-primary/30"
              />
            </div>
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
            className="mt-6 h-12 w-full text-base font-bold tracking-wide bg-primary text-primary-foreground shadow"
          >
            {loading ? "PROCESIRAM..." : "IZRAČUNAJ SA STVARNIM DIXON-COLES MODELOM"}
          </Button>
        </section>

        {loading && (
          <section className="bg-card flex flex-col items-center gap-4 rounded-2xl p-10 text-center border">
            <Sigma className="size-8 text-primary animate-spin" />
            <div>
              <p className="font-semibold text-foreground">Optimizacija matrice u tijeku…</p>
              <p className="text-xs text-muted-foreground">Primjenjujem Dixon-Coles korekciju · Kalibriram dvostruka sidra (2-2 & GG)</p>
            </div>
          </section>
        )}

        {!loading && result && result.best && (
          <section className="bg-card p-6 rounded-2xl shadow-md border border-primary/20 text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
              <Target className="size-3.5" /> Predviđanje s maksimalnom realnošću
            </span>
            
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Najizgledniji točan rezultat</h2>
              <div className="text-6xl font-black text-foreground my-2 tracking-tight">{result.best.score}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto p-4 bg-secondary/40 rounded-xl border">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Realna Tržišna Kvota</p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  @{result.best.odds ? result.best.odds.toFixed(2) : "1.00"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Vjerojatnost</p>
                <p className="text-2xl font-bold text-primary mt-1">{pct(result.best.prob)}</p>
              </div>
            </div>

            {/* Vjerojatnosti za Dvoznake i GG */}
            <div className="border-t border-border pt-4 text-left max-w-md mx-auto space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sigurnosne procjene (Dvoznaci):</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-center font-medium">
                <div className="bg-secondary/40 p-2 rounded-lg">
                  <p className="text-muted-foreground text-[10px]">Šansa 1X</p>
                  <p className="text-sm font-bold text-foreground">{pct(result.pHomeWin + result.pDrawResult, 1)}</p>
                </div>
                <div className="bg-secondary/40 p-2 rounded-lg">
                  <p className="text-muted-foreground text-[10px]">Šansa X2</p>
                  <p className="text-sm font-bold text-foreground">{pct(result.pAwayWin + result.pDrawResult, 1)}</p>
                </div>
              </div>

              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pt-2">Očekivana snaga napada (xG):</h3>

