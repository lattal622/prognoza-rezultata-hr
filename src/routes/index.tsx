import { createFileRoute } from "@tanstack/react-router";
import IndexComponent from "../pages/Index";

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
  component: IndexComponent,
});



