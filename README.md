# Kontrola

Tu control de gastos personal: anotas cada gasto en segundos, se descuenta de tu saldo y siempre sabes cuánto te queda para el resto del mes.

## Qué hace hoy

- **Registro rápido**: botón `+` → monto → categoría → listo. Si escribes un detalle que ya usaste ("chicle"), la app recuerda su categoría y su último monto.
- **Saldo disponible**: saldo inicial + ingresos − gastos, siempre a la vista.
- **Varias cuentas**: saldo y movimientos por cuenta. Las compras con tarjeta generan deuda sin reducir el efectivo; el pago se registra como traspaso desde una cuenta y no duplica el gasto.
- **Tarjetas de crédito**: día de corte y día de vencimiento configurables. Las compras se agrupan en ciclos y se muestra lo pendiente por pagar en cada fecha. En el presupuesto y en Análisis, cada compra con tarjeta cuenta en el mes en que vence su pago (en cuotas, cada cuota en su mes).
- **Fuentes de ingreso**: monto previsto, cuenta destino, fecha esperada y repetición mensual opcional. Son previsiones; el saldo solo cambia al registrar el ingreso.
- **Importación bancaria**: CSV, PDF con texto e imágenes con OCR local. Cada fila se revisa antes de incorporarse, con detección de posibles duplicados y campos incompletos. En tarjetas se puede comparar el total facturado para un vencimiento con lo ya registrado y lo pendiente de importar. Los extractos varían según el banco y pueden necesitar correcciones manuales.
- **Foto de recibo al registrar un gasto**: en móvil puedes abrir la cámara o elegir una imagen. El OCR propone importe, comercio, fecha y categoría; revisas y confirmas los datos antes de guardar. La foto no se conserva en el movimiento.
- **Vista de escritorio**: navegación lateral, panel ancho y resumen distribuido en columnas; el diseño móvil conserva la navegación inferior.
- **Estimaciones**: reutiliza categorías de comercios conocidos y muestra posibles gastos recurrentes detectados en al menos dos meses de historial. Es una heurística local, no una garantía de gasto futuro.
- **Cuadrar con el banco**: ingresas el saldo real de tu cuenta y la diferencia queda registrada como ajuste (los gastos que se te olvidó anotar).
- **Presupuesto mensual**: un total fijo o la suma de presupuestos por categoría, con aviso si te pasas.
- **Movimientos**: por mes, agrupados por día, con búsqueda y filtros. Tocas uno para editarlo o eliminarlo (con "Deshacer").
- **Análisis**: gasto por día, ranking por categoría, comparación con el mes anterior y los últimos 6 meses.
- **Categorías editables** (nombre, ícono, color; "Otros" siempre al final), modo claro/oscuro, respaldo en `.json` y exportación a Excel (`.csv`).
- **Cuenta con tu correo** (Supabase): tus datos en todos tus dispositivos.
- **Instalable en el celular** (PWA): funciona sin internet y sube los cambios al volver la conexión.

Las imágenes se procesan en el dispositivo. El lector (Tesseract) y sus idiomas se sirven desde la propia app (`/ocr`, ver `vite.config.ts`), sin CDN externo, y se descargan solo la primera vez que se usa. No se suben imágenes ni PDFs a Supabase. Solo se guardan los movimientos que el usuario confirma. El OCR no lee PDFs escaneados automáticamente: para esos archivos, usa una imagen o un CSV.

### ¿Dónde quedan tus datos?

| Dónde abres la app | Dónde se guardan |
|---|---|
| Sitio publicado con Supabase (Vercel), con sesión iniciada | En tu cuenta de Supabase: los ves en cualquier dispositivo. Nadie más puede leerlos (RLS). |
| Sitio publicado, eligiendo "Seguir sin cuenta" | Solo en ese navegador. |
| Página publicada en claude.ai | En el espacio privado de tu cuenta de Claude (`src/lib/cloud.ts`). |

*Ajustes → Tus datos* muestra cuál aplica. Para pasar datos de una versión a otra: *Descargar respaldo* en una y *Restaurar respaldo* en la otra.

## Publicarla en Vercel con Supabase

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región **South America (São Paulo)**, la más cercana a Chile).
2. **SQL Editor → New query**: pega [`supabase/schema.sql`](supabase/schema.sql) y toca **Run**. Crea las tablas `settings`, `categories` y `transactions`, las reglas RLS (cada usuario ve solo lo suyo) y el `updated_at` automático.
3. **Project Settings → API Keys**: anota la **Project URL** y la clave **publishable** (o `anon`). Es pública por diseño; nunca uses la `secret` / `service_role`.

> La conexión **no está en el código**: cada copia del proyecto (por ejemplo un fork) usa su propio Supabase, configurado como variables en su Vercel.

**Entrar:** con **correo y contraseña**, todo dentro de la app. Funciona también instalada en la pantalla de inicio del iPhone, y la sesión queda guardada. Alternativas en la misma pantalla:

- **Olvidé mi contraseña**: llega un correo; al abrirlo (en cualquier navegador) eliges una contraseña nueva.
- **Entrar con un enlace por correo**: útil en el navegador. En la app instalada del iPhone el enlace se abre en Safari, por eso ahí conviene la contraseña.

Ajustes recomendados en **Authentication → Sign In / Providers → Email**:

- **Confirm email**: si está activo, al crear la cuenta llega un correo para confirmarla una sola vez. Si lo desactivas, la cuenta queda lista al instante.
- Cuando ya hayas creado tu cuenta, puedes desactivar **Allow new users to sign up** (en *Sign In / Providers*) para que nadie más pueda crear cuentas en tu proyecto.

**Opcional, código de 6 dígitos por correo:** Supabase solo deja editar las plantillas con un SMTP propio. Por ejemplo, con Gmail:

1. En tu cuenta de Google activa la verificación en dos pasos y crea una **contraseña de aplicación** (Seguridad → Contraseñas de aplicaciones).
2. En Supabase, **Authentication → Emails → Set up SMTP**: host `smtp.gmail.com`, puerto `465`, usuario y remitente tu Gmail, contraseña la de aplicación, nombre del remitente `Kontrola`.
3. En **Templates**, edita **Magic Link** y **Confirm signup** con este cuerpo:

```html
<h2>Tu código para entrar a Kontrola</h2>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>O toca este enlace: <a href="{{ .ConfirmationURL }}">Entrar</a></p>
```

### 2. Publicar el sitio (Vercel)

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** → importa `kontrola`.
2. En **Environment Variables** agrega (para *Production* y *Preview*):
   - `VITE_SUPABASE_URL` → la Project URL
   - `VITE_SUPABASE_ANON_KEY` → la clave publishable
3. **Deploy**: Vercel detecta Vite (`npm run build`, carpeta `dist`). Cada cambio en `main` se publica automáticamente.

Sin esas variables la app igual funciona, pero guardando solo en el navegador.

### 3. Conectar ambos

En Supabase, **Authentication → URL Configuration**: pon la dirección de Vercel (ej. `https://kontrola.vercel.app`) en **Site URL** y también en **Redirect URLs**. Así el enlace del correo vuelve a tu sitio.

> Netlify funciona igual: comando `npm run build` y carpeta `dist`.

### Bueno saber

- El correo que trae Supabase de fábrica permite pocos envíos por hora. Para uso personal sobra; si algún día se queda corto, se configura un SMTP propio en *Authentication → Emails*.
- En el plan gratis, Supabase pausa los proyectos que pasan una semana sin uso. Si la usas a diario no pasa; si se pausa, se reactiva con un clic desde el panel.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # opcional: tu proyecto de Supabase
npm run dev                  # http://localhost:5173
npm test                     # pruebas de la lógica y de la sincronización
npm run typecheck
npm run build                # PWA en dist/
npm run build:single         # un solo index.html (versión para claude.ai)
```

Sin las variables de Supabase la app funciona igual, guardando solo en el navegador.

Stack: React + TypeScript + Vite, Supabase (cuenta y base de datos), íconos Lucide, tipografía Geist, colores del logo.

```
src/
  lib/        lógica pura: tipos, dinero (CLP), fechas, cálculos, persistencia
              cloud.ts (claude.ai) · supabase.ts + supabaseCloud.ts (Supabase)
  state/      estado global (store), cuenta y navegación
  components/ piezas de UI (formularios, panel inferior, gráficos)
  screens/    Entrar, Inicio, Movimientos, Presupuesto, Análisis, Ajustes
supabase/
  schema.sql  tablas y reglas de seguridad
```

## Próximos pasos

- [ ] **Asistente con IA** dentro de la app: preguntas en lenguaje natural ("¿cuánto gasté en comida este mes?"), registrar gastos escribiendo ("almuerzo 6.500"), alertas y consejos de ahorro. Con Supabase ya existe dónde guardar la API key de forma segura (Edge Functions).
- [x] Sincronización entre dispositivos (claude.ai y Supabase).
- [ ] **Movimientos automáticos desde el banco**: vía una API de open banking chilena (ej. Fintoc) o leyendo los correos de aviso de compra del banco.
- [ ] Gastos recurrentes (arriendo, suscripciones) que se registren solos.
- [ ] Metas de ahorro.
