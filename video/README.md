# Video promocional de Kontrola

Proyecto [Remotion](https://www.remotion.dev): promo vertical (1080×1920, 30 fps, ~30 s) con los colores, la tipografía (Geist) y el logo de la app.

```bash
npm install
npm run dev      # abre Remotion Studio para previsualizar y editar
npx remotion render KontrolaPromo out/kontrola-promo.mp4            # con música
npx remotion render KontrolaPromoSinMusica out/kontrola-promo.mp4    # solo efectos
```

## Escenas

| Escena | Archivo | Qué muestra |
|---|---|---|
| Pregunta | `src/scenes/Hook.tsx` | "¿En qué se fue tu plata este mes?" |
| Logo | `src/scenes/LogoReveal.tsx` | Logo, nombre y bajada |
| Registro rápido | `src/scenes/QuickEntry.tsx` | Se anota un gasto de $6.500 en un teléfono |
| Saldo | `src/scenes/Balance.tsx` | El saldo baja de $290.000 a $283.500 y avanza el presupuesto |
| Cuentas | `src/scenes/Accounts.tsx` | Varias cuentas y una tarjeta, cada una con su saldo |
| Tarjetas | `src/scenes/CreditCard.tsx` | Corte, vencimiento y compras del ciclo (con cuotas) |
| Análisis | `src/scenes/Insights.tsx` | Gasto del mes por categoría |
| Cierre | `src/scenes/Cta.tsx` | Logo y llamada a la acción |

La secuencia completa está en `src/KontrolaPromo.tsx`, con una transición distinta entre cada escena: zoom con desenfoque, barrido de color, paneo rápido, iris y corte con destello (las propias están en `src/transitions.tsx`). Las piezas compartidas están en `src/components/`: fondo animado (`Backdrop`), títulos palabra por palabra (`KineticTitle`) y efectos de toque, partículas y brillo (`Effects`). Cada escena también se registra sola en `src/Root.tsx` (carpeta *Escenas* en Studio). Los textos y montos se pueden editar desde Studio.

Los colores vienen de `src/styles/app.css` de la app (copiados en `src/theme.ts`).

## Audio

- **Efectos en los cortes:** whooshes sincronizados con el centro de cada transición, en `src/KontrolaPromo.tsx`.
- **Efectos dentro de las escenas:** teclas, toques, confirmación y monedas, atados a las animaciones de cada escena (componente `Sfx` en `src/components/Sfx.tsx`).
- **Música:** `public/audio/kontrola-beat.mp3`, sintetizada para este video (120 BPM; el bombo entra con el logo). La composición `KontrolaPromoSinMusica` es la misma pero sin música.

Origen y licencias de cada sonido: `public/audio/CREDITOS.md`. Para publicar en redes conviene normalizar el volumen a −14 LUFS, por ejemplo:

```bash
ffmpeg -i out/kontrola-promo.mp4 -c:v copy -af "loudnorm=I=-14:TP=-2:LRA=11,alimiter=limit=0.7:level=false" -c:a aac -b:a 192k out/kontrola-promo-redes.mp4
```
