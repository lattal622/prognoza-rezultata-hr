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
  const [values, setValues] = useState<Record<keyof OddsInput, string>>({
    home: "2.10",
    draw: "3.40",
    away: "3.60",
    over: "1.85",
    under: "1.95",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [usedOdds, setUsedOdds] = useState<OddsInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { canInstall, installed, install } = usePwaInstall();

  const set = (k: keyof OddsInput, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const onCalculate = () => {
    const nums = FIELDS.map((f) => parseFloat(values[f.key].replace(",", ".")));
    if (nums.some((v) => !isFinite(v) || v <= 1.01)) {
      setError("Unesite ispravne tečajeve — svaka vrijednost mora biti veća od 1.01.");
      return;
    }
    const [h, d, a, o, u] = nums as [number, number, number, number, number];
    const odds: OddsInput = { home: h, draw: d, away: a, over: o, under: u };
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
                Uklanjam maržu · računam očekivane golove · gradim Poissonovu matricu
              </p>
            </div>
          </section>
        )}

        {result && usedOdds && !loading && (
          <div className="mt-6 space-y-6">
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="surface-panel animate-rise rounded-2xl p-7 lg:col-span-2">
                <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                  <Target className="size-4 text-primary" aria-hidden /> Najizgledniji točan rezultat
                </h2>
                <p className="mt-6 text-center text-7xl font-black tracking-tighter tabular-nums sm:text-8xl">
                  <span className="text-gradient">
                    {result.best.home} - {result.best.away}
                  </span>
                </p>
                <p className="mt-4 text-center text-xl font-semibold text-primary tabular-nums">
                  {pct(result.best.prob)}
                </p>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  vjerojatnost pogotka točnog rezultata
                </p>
              </div>

              <div className="surface-panel animate-rise rounded-2xl p-6 lg:col-span-3">
                <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                  Top 5 alternativnih rezultata
                </h2>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Rezultat</th>
                      <th className="pb-2 text-right font-medium">Vjerojatnost</th>
                      <th className="pb-2 text-right font-medium">Fer tečaj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.top.slice(1, 6).map((s, i) => (
                      <tr key={`${s.home}-${s.away}`} className="border-t border-border/70">
                        <td className="py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="py-2.5 font-semibold tabular-nums">
                          {s.home} - {s.away}
                        </td>
                        <td className="py-2.5 text-right text-primary tabular-nums">
                          {pct(s.prob)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                          {(1 / s.prob).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { l: "xG domaćina (λ)", v: result.lambdaHome.toFixed(2) },
                { l: "xG gosta (λ)", v: result.lambdaAway.toFixed(2) },
                { l: "Ukupno golova (μ)", v: result.mu.toFixed(2) },
                { l: "Kladioničarska margina", v: pct(result.margin1x2, 2) },
              ].map((s) => (
                <div key={s.l} className="surface-panel animate-rise rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="mt-2 text-2xl font-bold text-primary tabular-nums">{s.v}</p>
                </div>
              ))}
            </section>

            <section className="surface-panel animate-rise rounded-2xl p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
                <Percent className="size-4 text-primary" aria-hidden /> Analitička matrica rezultata
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Redovi = golovi domaćina, stupci = golovi gosta. Svjetlija polja znače veću
                vjerojatnost.
              </p>
              <div className="mt-5 overflow-x-auto">
                <div className="inline-grid grid-cols-[2.5rem_repeat(6,minmax(3rem,1fr))] gap-1">
                  <div />
                  {[0, 1, 2, 3, 4, 5].map((y) => (
                    <div key={y} className="pb-1 text-center text-xs text-muted-foreground">
                      {y}
                    </div>
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((x) => (
                    <FragmentRow key={x} x={x} matrix={result.matrix} maxCell={maxCell} />
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  { l: "Pobjeda 1", v: result.pHomeWin },
                  { l: "Neriješeno X", v: result.pDrawResult },
                  { l: "Pobjeda 2", v: result.pAwayWin },
                  { l: "Oba daju gol", v: result.pBtts },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">{s.l}</p>
                    <p className="mt-1 font-semibold tabular-nums">{pct(s.v, 1)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-panel animate-rise rounded-2xl p-5 sm:p-7">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Detaljno matematičko objašnjenje
              </h2>
              <p className="mt-2 mb-4 text-xs text-muted-foreground">
                Svaki korak izračuna, s pravim brojevima iz vaše analize.
              </p>
              <Explanation r={result} odds={usedOdds} />
            </section>
          </div>
        )}

        <footer className="mt-14 border-t border-border pt-6 text-xs text-muted-foreground">
          StatX ScoreMaster PRO — alat je isključivo informativne i analitičke naravi. Klađenje nosi
          rizik; igrajte odgovorno (18+).
        </footer>
      </div>
    </main>
  );
}

function FragmentRow({
  x,
  matrix,
  maxCell,
}: {
  x: number;
  matrix: number[][];
  maxCell: number;
}) {
  return (
    <>
      <div className="flex items-center justify-center text-xs text-muted-foreground">{x}</div>
      {[0, 1, 2, 3, 4, 5].map((y) => (
        <div
          key={y}
          className="rounded-md px-1 py-3 text-center text-xs font-semibold tabular-nums transition-transform hover:scale-105"
          style={heatColor(matrix[x][y], maxCell)}
          title={`${x} - ${y}: ${pct(matrix[x][y])}`}
        >
          {(matrix[x][y] * 100).toFixed(1)}
        </div>
      ))}
    </>
  );
}
