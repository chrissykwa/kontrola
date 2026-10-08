import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { Balance } from "./scenes/Balance";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Insights } from "./scenes/Insights";
import { LogoReveal } from "./scenes/LogoReveal";
import { QuickEntry } from "./scenes/QuickEntry";

/**
 * Promo vertical de Kontrola (~17 s).
 * Escenas: 75 + 60 + 120 + 105 + 105 + 105 = 570 frames,
 * menos 5 transiciones de 12 frames = 510 frames.
 */
export const KontrolaPromo = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Pregunta" durationInFrames={75} premountFor={fps}>
        <Hook
          premountFor={fps}
          line1="¿En qué se"
          line2="fue tu plata"
          highlight="este mes?"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Logo" durationInFrames={60} premountFor={fps}>
        <LogoReveal
          premountFor={fps}
          brand="Kontrola"
          tagline="Tu control de gastos personal"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Registro rápido" durationInFrames={120} premountFor={fps}>
        <QuickEntry
          premountFor={fps}
          title={"Anota un gasto\nen segundos"}
          amount={6500}
          detail="Almuerzo"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Saldo" durationInFrames={105} premountFor={fps}>
        <Balance
          premountFor={fps}
          title={"Siempre sabes\ncuánto te queda"}
          balanceBefore={290000}
          expense={6500}
          budgetUsed={64}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Análisis" durationInFrames={105} premountFor={fps}>
        <Insights
          premountFor={fps}
          title={"Mira en qué\nse va tu plata"}
          subtitle="Cuentas, tarjetas de crédito y presupuesto, todo en un lugar."
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence name="Cierre" durationInFrames={105} premountFor={fps}>
        <Cta
          premountFor={fps}
          headline={"Toma el control\nde tu plata"}
          button="Instálala en tu celular"
        />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
