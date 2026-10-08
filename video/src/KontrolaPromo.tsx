import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { Accounts } from "./scenes/Accounts";
import { Balance } from "./scenes/Balance";
import { CreditCardScene } from "./scenes/CreditCard";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Insights } from "./scenes/Insights";
import { LogoReveal } from "./scenes/LogoReveal";
import { QuickEntry } from "./scenes/QuickEntry";

/**
 * Promo vertical de Kontrola (~31 s).
 * Escenas: 90 + 90 + 165 + 150 + 150 + 165 + 120 + 120 = 1050 frames,
 * menos 7 transiciones de 15 frames = 945 frames.
 */
export const KontrolaPromo = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Pregunta" durationInFrames={90} premountFor={fps}>
        <Hook
          premountFor={fps}
          line1="¿En qué se"
          line2="fue tu plata"
          highlight="este mes?"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Logo" durationInFrames={90} premountFor={fps}>
        <LogoReveal
          premountFor={fps}
          brand="Kontrola"
          tagline="Tu control de gastos personal"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 15 })}
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
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Saldo" durationInFrames={150} premountFor={fps}>
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
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Cuentas" durationInFrames={150} premountFor={fps}>
        <Accounts premountFor={fps} title={"Todas tus cuentas\nen un lugar"} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 15 })}
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
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Análisis" durationInFrames={120} premountFor={fps}>
        <Insights
          premountFor={fps}
          title={"Mira en qué\nse va tu plata"}
          subtitle="Gasto por categoría, comparado con el mes anterior."
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Cierre" durationInFrames={120} premountFor={fps}>
        <Cta
          premountFor={fps}
          headline={"Toma el control\nde tu plata"}
          button="Instálala en tu celular"
        />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
