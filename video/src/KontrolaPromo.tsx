import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import { useVideoConfig } from "remotion";
import { Accounts } from "./scenes/Accounts";
import { Balance } from "./scenes/Balance";
import { CreditCardScene } from "./scenes/CreditCard";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Insights } from "./scenes/Insights";
import { LogoReveal } from "./scenes/LogoReveal";
import { QuickEntry } from "./scenes/QuickEntry";
import { colorSweep, whip, zoomThrough } from "./transitions";

/**
 * Promo vertical de Kontrola (~30 s).
 * Escenas: 90 + 80 + 165 + 140 + 140 + 165 + 120 + 120 = 1020 frames,
 * menos transiciones: 16 + 22 + 14 + 20 + 11 + 14 + 22 = 119 → 901 frames.
 */
export const KontrolaPromo = () => {
  const { fps, width, height } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Pregunta" durationInFrames={90} premountFor={fps}>
        <Hook premountFor={fps} question={"¿En qué se\nfue tu plata"} highlight="este mes?" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={zoomThrough()}
        timing={linearTiming({ durationInFrames: 16 })}
      />
      <TransitionSeries.Sequence name="Logo" durationInFrames={80} premountFor={fps}>
        <LogoReveal premountFor={fps} brand="Kontrola" tagline="Tu control de gastos personal" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={colorSweep("#0a5b6b", "#4cd898")}
        timing={linearTiming({ durationInFrames: 22 })}
      />
      <TransitionSeries.Sequence name="Registro rápido" durationInFrames={165} premountFor={fps}>
        <QuickEntry
          premountFor={fps}
          title={"Anota un gasto\nen segundos"}
          amount={6500}
          detail="Almuerzo"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={whip("left")}
        timing={linearTiming({ durationInFrames: 14 })}
      />
      <TransitionSeries.Sequence name="Saldo" durationInFrames={140} premountFor={fps}>
        <Balance
          premountFor={fps}
          title={"Siempre sabes\ncuánto te queda"}
          balanceBefore={290000}
          expense={6500}
          budgetUsed={64}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={iris({ width, height })}
        timing={linearTiming({ durationInFrames: 20 })}
      />
      <TransitionSeries.Sequence name="Cuentas" durationInFrames={140} premountFor={fps}>
        <Accounts premountFor={fps} title={"Todas tus cuentas\nen un lugar"} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={pushCut({ flashColor: "#ffffff", flashOpacity: 0.5 })}
        timing={linearTiming({ durationInFrames: 11 })}
      />
      <TransitionSeries.Sequence name="Tarjetas" durationInFrames={165} premountFor={fps}>
        <CreditCardScene
          premountFor={fps}
          title={"Tus tarjetas,\nbajo control"}
          dueLabel="A pagar el 10 nov"
          footnote="Cada compra cuenta en el mes en que la pagas, también en cuotas."
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={whip("up")}
        timing={linearTiming({ durationInFrames: 14 })}
      />
      <TransitionSeries.Sequence name="Análisis" durationInFrames={120} premountFor={fps}>
        <Insights
          premountFor={fps}
          title={"Mira en qué\nse va tu plata"}
          subtitle="Gasto por categoría, comparado con el mes anterior."
          badge="12% menos que septiembre"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={colorSweep("#4cd898", "#0d1f22")}
        timing={linearTiming({ durationInFrames: 22 })}
      />
      <TransitionSeries.Sequence name="Cierre" durationInFrames={120} premountFor={fps}>
        <Cta premountFor={fps} headline={"Toma el control\nde tu plata"} button="Instálala en tu celular" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
