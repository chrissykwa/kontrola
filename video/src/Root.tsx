import { Composition, Folder } from "remotion";
import { KontrolaPromo } from "./KontrolaPromo";
import { Balance } from "./scenes/Balance";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Insights } from "./scenes/Insights";
import { LogoReveal } from "./scenes/LogoReveal";
import { QuickEntry } from "./scenes/QuickEntry";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KontrolaPromo"
        component={KontrolaPromo}
        durationInFrames={510}
        fps={30}
        width={1080}
        height={1920}
      />
      <Folder name="Escenas">
        <Composition
          id="Pregunta"
          component={Hook}
          durationInFrames={75}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            line1: "¿En qué se",
            line2: "fue tu plata",
            highlight: "este mes?",
          }}
        />
        <Composition
          id="Logo"
          component={LogoReveal}
          durationInFrames={60}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            brand: "Kontrola",
            tagline: "Tu control de gastos personal",
          }}
        />
        <Composition
          id="RegistroRapido"
          component={QuickEntry}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Anota un gasto\nen segundos",
            amount: 6500,
            detail: "Almuerzo",
          }}
        />
        <Composition
          id="Saldo"
          component={Balance}
          durationInFrames={105}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Siempre sabes\ncuánto te queda",
            balanceBefore: 290000,
            expense: 6500,
            budgetUsed: 64,
          }}
        />
        <Composition
          id="Analisis"
          component={Insights}
          durationInFrames={105}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Mira en qué\nse va tu plata",
            subtitle:
              "Cuentas, tarjetas de crédito y presupuesto, todo en un lugar.",
          }}
        />
        <Composition
          id="Cierre"
          component={Cta}
          durationInFrames={105}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            headline: "Toma el control\nde tu plata",
            button: "Instálala en tu celular",
          }}
        />
      </Folder>
    </>
  );
};
