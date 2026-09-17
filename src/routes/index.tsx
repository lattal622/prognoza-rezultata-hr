import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Activity, Calculator, Target, Percent, Sigma, AlertCircle } from "lucide-react";

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
        content:
          "Profesionalni analitički alat: uklanjanje marže, xG motor i Poissonova matrica 10×10 za predviđanje točnog nogometnog rezultata.",
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
    exact22: "13.00",
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
    if (raw22 === "") {
      setError("Polje 'Kvota na točan rezultat 2-2' je obavezno za kalibraciju.");
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
        setResult(analysis);
      } catch (err) {
        setError("Došlo je do greške prilikom izračuna. Provjerite jesu li unesene kvote realne.");
      } {
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
              <Activity className="size-3.5" /> Poissonova analitika u stvarnom vremenu
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
            <Calculator className="size-5 text-primary" /> Unos tečajeva
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

          <div className="mt-6 max-w-xs space-y-2">
            <Label htmlFor="exact22" className="text-xs font-semibold text-primary">
              Kvota na točan rezultat 2-2 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exact22"
              inputMode="decimal"
              placeholder="npr. 13.00"
              value={values.exact22}
              onChange={(e) => set("exact22", e.target.value)}
              className="h-12 text-center text-lg font-semibold border-primary/40 focus:border-primary"
            />
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
            {loading ? "ANALIZIRAM..." : "IZRAČUNAJ"}
          </Button>
        </section>

        {loading && (
          <section className="bg-card flex flex-col items-center gap-4 rounded-2xl p-10 text-center border">
            <Sigma className="size-8 text-primary animate-spin" />
            <div>
              <p className="font-semibold text-foreground">Statistička analiza u tijeku…</p>
              <p className="text-xs text-muted-foreground">Uklanjam maržu · računam očekivane golove</p>
            </div>
          </section>
        )}

        {!loading && result && result.best && (
          <section className="bg-card p-6 rounded-2xl shadow-md border border-primary/20 text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
              <Target className="size-3.5" /> Predviđanje generirano
            </span>
            
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Predviđeni točan rezultat</h2>
              <div className="text-6xl font-black text-foreground my-2 tracking-tight">{result.best.score}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto p-4 bg-secondary/40 rounded-xl border">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Izračunata Kvota</p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  @{result.best.odds ? result.best.odds.toFixed(2) : (100 / result.best.prob).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Sigurnost</p>
                <p className="text-2xl font-bold text-primary mt-1">{pct(result.best.prob)}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 text-left max-w-md mx-auto space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Očekivana snaga napada (xG):</h3>
              <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/20 p-3 rounded-lg">
                <div>Domaćin: <span className="font-bold text-foreground">{result.lambda?.toFixed(2) || "0.00"} golova</span></div>
                <div>Gost: <span className="font-bold text-foreground">{result.lambdaAway?.toFixed(2) || "0.00"} golova</span></div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

