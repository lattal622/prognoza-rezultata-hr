import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AnalysisResult, OddsInput } from "@/lib/poisson";
import { pct, poisson } from "@/lib/poisson";

const n = (v: number, d = 4) => v.toFixed(d);

export function Explanation({ r, odds }: { r: AnalysisResult; odds: OddsInput }) {
  const b = r.best;
  const pH = poisson(r.lambdaHome, b.home);
  const pA = poisson(r.lambdaAway, b.away);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="k1" className="border-border">
        <AccordionTrigger className="text-left text-base font-semibold">
          Korak 1 — Uklanjanje kladioničarske marže
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Tečajevi kladionice uvijek sadrže ugrađenu zaradu (maržu). Prvo ih pretvaramo u
            implicirane vjerojatnosti tako da izračunamo 1 / tečaj:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`1 / ${odds.home} = ${n(r.rawHome)}   (Domaćin)
1 / ${odds.draw} = ${n(r.rawDraw)}   (Neriješeno)
1 / ${odds.away} = ${n(r.rawAway)}   (Gost)

M1 = ${n(r.rawHome)} + ${n(r.rawDraw)} + ${n(r.rawAway)} - 1 = ${n(r.margin1x2)}  →  ${pct(r.margin1x2)}

1 / ${odds.over} = ${n(r.rawOver)}   (Over 2.5)
1 / ${odds.under} = ${n(r.rawUnder)}   (Under 2.5)
M2 = ${n(r.rawOver)} + ${n(r.rawUnder)} - 1 = ${n(r.marginOu)}  →  ${pct(r.marginOu)}`}
          </pre>
          <p>
            Maržu uklanjamo normalizacijom: P_stvarno = (1 / tečaj) / (1 + M). Time dobivamo
            poštene (fer) vjerojatnosti čiji je zbroj točno 100 %.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`P(1) = ${n(r.rawHome)} / (1 + ${n(r.margin1x2)}) = ${pct(r.pHome)}
P(X) = ${n(r.rawDraw)} / (1 + ${n(r.margin1x2)}) = ${pct(r.pDraw)}
P(2) = ${n(r.rawAway)} / (1 + ${n(r.margin1x2)}) = ${pct(r.pAway)}
P(Over 2.5)  = ${pct(r.pOver)}
P(Under 2.5) = ${pct(r.pUnder)}`}
          </pre>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="k2" className="border-border">
        <AccordionTrigger className="text-left text-base font-semibold">
          Korak 2 — Izračun očekivanih golova (xG motor)
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Fer vjerojatnost za Over 2.5 gola izravno nosi informaciju o ukupnom očekivanom broju
            golova (μ). Koristimo kumulativnu Poissonovu razdiobu:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`P(ukupno ≤ 2) = P(0) + P(1) + P(2) = e^-μ · (1 + μ + μ²/2)
Tražimo μ takav da vrijedi:  1 - P(ukupno ≤ 2) = ${pct(r.pOver)}

Numeričko rješenje (metoda bisekcije, 200 iteracija):  μ = ${n(r.mu, 3)} golova`}
          </pre>
          <p>
            Ukupno očekivanje μ zatim dijelimo između momčadi prema njihovoj relativnoj snazi iz
            fer 1X2 vjerojatnosti (vjerojatnost remija dijeli se na pola):
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`Snaga domaćina = P(1) + P(X)/2 = ${n(r.pHome + r.pDraw / 2)}
Snaga gosta    = P(2) + P(X)/2 = ${n(r.pAway + r.pDraw / 2)}

λ_Domaćin = ${n(r.lambdaHome, 3)}
λ_Gost    = ${n(r.lambdaAway, 3)}
Zbroj      = ${n(r.lambdaHome + r.lambdaAway, 3)} = μ`}
          </pre>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="k3" className="border-border">
        <AccordionTrigger className="text-left text-base font-semibold">
          Korak 3 — Poissonova matrica 10 × 10
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Poissonova razdioba opisuje vjerojatnost da se rijedak događaj (gol) dogodi točno k puta
            uz poznato prosječno očekivanje λ. Formula je:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`P(k) = (e^-λ · λ^k) / k!`}
          </pre>
          <p>
            Budući da su golovi domaćina i gosta modelirani kao neovisni događaji, vjerojatnost
            točnog rezultata je umnožak dviju razdioba. Petlja se izvodi za sve kombinacije od 0 do
            9 golova po momčadi (100 rezultata), bez ikakvog rezanja, pa su i visoki rezultati poput
            4-1, 5-2 ili 6-0 potpuno obuhvaćeni. Ukupna pokrivenost matrice iznosi{" "}
            <span className="text-primary">{pct(r.coverage, 3)}</span> ukupne vjerojatnosti.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="k4" className="border-border">
        <AccordionTrigger className="text-left text-base font-semibold">
          Korak 4 — Zašto je baš {b.home} - {b.away} najizgledniji rezultat
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`P(domaćin = ${b.home}) = (e^-${n(r.lambdaHome, 3)} · ${n(r.lambdaHome, 3)}^${b.home}) / ${b.home}! = ${n(pH)}
P(gost    = ${b.away}) = (e^-${n(r.lambdaAway, 3)} · ${n(r.lambdaAway, 3)}^${b.away}) / ${b.away}! = ${n(pA)}

P(${b.home} - ${b.away}) = ${n(pH)} × ${n(pA)} = ${n(b.prob)}  →  ${pct(b.prob)}`}
          </pre>
          <p>
            Nakon izračuna svih 100 kombinacija, rezultat{" "}
            <span className="font-semibold text-primary">
              {b.home} - {b.away}
            </span>{" "}
            ima najveću vjerojatnost od svih. To ne znači da je siguran — znači da je, uz zadane
            tečajeve, matematički najvjerojatniji ishod. Model iz iste matrice izvodi i konačne
            ishode: 1 = {pct(r.pHomeWin)}, X = {pct(r.pDrawResult)}, 2 = {pct(r.pAwayWin)}, a oba
            daju gol = {pct(r.pBtts)}.
          </p>
          <p className="text-xs">
            Napomena: model pretpostavlja neovisnost golova i točnost tečajeva. Stvarne utakmice
            nose i faktore (crveni kartoni, ozljede, motivacija) koje statistika ne vidi.
          </p>
        </AccordionContent>
      </AccordionItem>

      {r.calibrated && (
        <AccordionItem value="k5" className="border-border">
          <AccordionTrigger className="text-left text-base font-semibold">
            Korak 5 — Kalibracija pomoću kvote na točan rezultat 2-2
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Unijeli ste kvotu {odds.exact22} na točan rezultat 2-2. Iz nje računamo fer tržišnu
              vjerojatnost (uz maržu iz 1X2 tržišta) i uspoređujemo je s čistom Poissonovom
              vrijednošću:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-secondary/60 p-3 font-mono text-xs text-foreground">
{`1 / ${odds.exact22} = ${n(r.raw22Exact ?? 0)}
P_tržišno(2-2) = ${n(r.raw22Exact ?? 0)} / (1 + ${n(r.margin1x2)}) = ${pct(r.market22 ?? 0)}
P_Poisson(2-2) = ${pct(r.poisson22 ?? 0)}

Faktor prilagodbe F = ${pct(r.market22 ?? 0)} / ${pct(r.poisson22 ?? 0)} = ${n(r.factor22 ?? 1, 3)}
Nakon kalibracije i normalizacije:  P(2-2) = ${pct(r.calibrated22 ?? 0)}`}
            </pre>
            <p>
              Faktor F primjenjuje se proporcionalno na cijelu matricu — najjače na rezultate blizu
              2-2, uz dodatni naglasak na remije (1-1, 2-2, 3-3) i rezultate s više golova. Zatim se
              svih 100 polja normalizira tako da zbroj iznosi točno 100 %. Zbog toga su
              najizgledniji rezultat i top 5 alternativa izvedeni iz ove kalibrirane matrice, što
              predikciju približava stvarnom tržištu.
            </p>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
