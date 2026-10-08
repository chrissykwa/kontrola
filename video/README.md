# Video promocional de Kontrola

Proyecto [Remotion](https://www.remotion.dev): promo vertical (1080×1920, 30 fps, 17 s) con los colores, la tipografía (Geist) y el logo de la app.

```bash
npm install
npm run dev      # abre Remotion Studio para previsualizar y editar
npx remotion render KontrolaPromo out/kontrola-promo.mp4
```

## Escenas

| Escena | Archivo | Qué muestra |
|---|---|---|
| Pregunta | `src/scenes/Hook.tsx` | "¿En qué se fue tu plata este mes?" |
| Logo | `src/scenes/LogoReveal.tsx` | Logo, nombre y bajada |
| Registro rápido | `src/scenes/QuickEntry.tsx` | Se anota un gasto de $6.500 en un teléfono |
| Saldo | `src/scenes/Balance.tsx` | El saldo baja de $290.000 a $283.500 y avanza el presupuesto |
| Análisis | `src/scenes/Insights.tsx` | Gasto del mes por categoría |
| Cierre | `src/scenes/Cta.tsx` | Logo y llamada a la acción |

La secuencia completa está en `src/KontrolaPromo.tsx`. Cada escena también se registra sola en `src/Root.tsx` (carpeta *Escenas* en Studio). Los textos y montos se pueden editar desde Studio.

Los colores vienen de `src/styles/app.css` de la app (copiados en `src/theme.ts`).
