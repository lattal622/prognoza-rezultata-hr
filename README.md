# Nogometne Prognoze

You are building a professional, high-end Football Analytics and Correct Score Predictor Web Application named "StatX ScoreMaster PRO". 

CRITICAL REQUIREMENTS:

1. LANGUAGE: The entire User Interface (UI), labels, tooltips, buttons, charts, and mathematical explanations must be strictly in Croatian (Hrvatski jezik).

2. PWA SUPPORT: Configure the application as a Progressive Web App (PWA) so that it can be installed on a PC or mobile device via Google Chrome (manifest.json, service worker, and an "Instaliraj aplikaciju" install button if supported).

3. DESIGN: High-end, premium dark mode dashboard design (using Slate/Zinc and Emerald accents). It must look like a professional betting syndicates software. Modern, responsive, and responsive on both desktop and mobile.

4. MANUAL CALCULATE BUTTON: The calculations must NOT happen automatically on input change. There must be a prominent "IZRAČUNAJ" (Calculate) button. The application should show a beautiful loading animation for 1.5 seconds simulating AI/statistical analysis before rendering the results.

5. NO SCORE LIMIT: The Poisson Distribution matrix must compute up to a 10x10 grid dynamically (scores from 0-0 up to 9-9 and beyond) so high-scoring matches like 4-1, 5-2, or 6-0 are fully supported and mathematically precise.

STRICT MATHEMATICAL RULES & LOGIC (The Core Engine):

The calculation engine must strictly follow these exact 4 steps when the user clicks "IZRAČUNAJ":

Step 1: Margin Removal (Implied Probabilities)

- Inputs: Home Win (1), Draw (X), Away Win (2), Over 2.5, Under 2.5. (All entered manually).

- Calculate 1X2 Margin: M1 = (1/Odds1) + (1/OddsX) + (1/Odds2) - 1.

- Calculate Over/Under Margin: M2 = (1/OverOdds) + (1/UnderOdds) - 1.

- Remove margins by normalizing the odds into true, fair probabilities (e.g., P_Home = (1/Odds1) / (1 + M1)).

Step 2: Goal Expectancy Estimation (xG Engine)

- Use the fair probabilities of Over/Under 2.5 and 1X2 to mathematically reverse-engineer the exact Expected Goals (λ - lambda) for the Home Team (λ_Home) and Away Team (λ_Away).

- Total Expected Goals (μ) must be derived from the true Over 2.5 probability using cumulative Poisson distribution where P(Total Goals <= 2) = P(0)+P(1)+P(2).

- Distribute μ into λ_Home and λ_Away based on the ratio of P_Home and P_Away.

Step 3: Expanded Poisson Distribution Matrix

- Run a multi-dimensional Poisson calculation loop for Home goals (x) and Away goals (y) from 0 to 9:

  P(x, y) = [ (e^-λ_Home * λ_Home^x) / x! ] * [ (e^-λ_Away * λ_Away^y) / y! ]

- Do not cap or truncate the results early to ensure extreme scorelines (like 4-1, 4-3, 5-0) are correctly captured if the odds imply high efficiency.

OUTPUTS & DATA VISUALIZATION TO DISPLAY (In Croatian):

- "Najizgledniji Točan Rezultat": Big bold display of the score with the absolute highest probability (e.g., "2 - 1" with its exact percentage).

- "Top 5 Alternativnih Rezultata": A clean table ranking the next 5 highest probability scores.

- "Analitička Matrica Rezultata": A visual heatmap grid (dynamic Tailwind grid) showing probabilities from 0-0 to 5-5 for visual trend analysis.

- "Statistički Indikatori": Displays Calculated Home xG, Away xG, and the Bookmaker's Margin percentage (Kladioničarska margina).

- "DETALJNO MATEMATIČKO OBJAŠNJENJE": A dedicated, beautifully formatted accordion section that breaks down EXACTLY how the application calculated that specific 2-1 or 4-1 result step-by-step in clear Croatian. It must explain the margin removal, the derived xG, and how Poisson distribution works so the user understands the absolute truth behind the numbers.

Please build this entire application flawlessly, and provide a detailed report in Croatian explaining exactly what you have done and how the features were implemented.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://prognoza-rezultata-hr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a148b4e8-7ab6-47f8-98e4-8bd5e32485ea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
