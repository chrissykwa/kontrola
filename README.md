# Kontrola

Tu control de gastos personal: anotas cada gasto en segundos, se descuenta de tu saldo y siempre sabes cuánto te queda para el resto del mes.

## Qué hace hoy (v0.1)

- **Registro rápido**: botón `+` → monto → categoría → listo. Si escribes un detalle que ya usaste ("chicle"), la app recuerda su categoría y su último monto.
- **Saldo disponible**: saldo inicial + ingresos − gastos, siempre a la vista.
- **Cuadrar con el banco**: ingresas el saldo real de tu cuenta y la diferencia queda registrada como ajuste (los gastos que se te olvidó anotar).
- **Presupuesto mensual**: un total fijo o la suma de presupuestos por categoría. Muestra cuánto te queda y **cuánto puedes gastar por día** hasta fin de mes, con aviso si vas más rápido de la cuenta.
- **Movimientos**: por mes, agrupados por día, con búsqueda y filtros. Tocas uno para editarlo o eliminarlo (con "Deshacer").
- **Análisis**: gasto por día, ranking por categoría, comparación con el mes anterior y los últimos 6 meses.
- **Categorías editables** (nombre, ícono, color), modo claro/oscuro, respaldo en `.json` y exportación a Excel (`.csv`).
- **Instalable en el celular** (PWA): funciona sin internet.

> Los datos se guardan **solo en tu navegador** (localStorage). Descarga un respaldo desde *Ajustes → Tus datos* de vez en cuando.

## Usarla

### En el celular (recomendado)

1. En GitHub: *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Al hacer merge a `main`, el workflow `.github/workflows/deploy.yml` la publica en `https://<tu-usuario>.github.io/kontrola/`.
3. Ábrela en el celular y elige **"Agregar a pantalla de inicio"**. Queda como una app más.

### En tu computador

```bash
npm install
npm run dev          # http://localhost:5173
```

### Como un solo archivo HTML

```bash
npm run build:single # genera dist-single/index.html, se abre con doble clic
```

## Desarrollo

```bash
npm test             # pruebas de la lógica (saldo, presupuesto, respaldos)
npm run typecheck
npm run build        # PWA en dist/
```

Stack: React + TypeScript + Vite, íconos Lucide, tipografía Inter. Sin backend.

```
src/
  lib/        lógica pura: tipos, dinero (CLP), fechas, cálculos, persistencia
  state/      estado global (store) y navegación
  components/ piezas de UI (formularios, panel inferior, gráficos)
  screens/    Inicio, Movimientos, Presupuesto, Análisis, Ajustes
```

La persistencia está detrás de la interfaz `DataStore` (`src/lib/storage.ts`): para pasar a un servidor basta con otra implementación, sin tocar las pantallas.

## Próximos pasos

- [ ] **Asistente con IA** dentro de la app: preguntas en lenguaje natural ("¿cuánto gasté en comida este mes?"), registrar gastos escribiendo ("almuerzo 6.500"), alertas y consejos de ahorro. Requiere un pequeño backend para guardar la API key de forma segura.
- [ ] **Sincronización entre dispositivos** (backend + login), para no depender del navegador.
- [ ] **Movimientos automáticos desde el banco**: vía una API de open banking chilena (ej. Fintoc) o leyendo los correos de aviso de compra del banco.
- [ ] Gastos recurrentes (arriendo, suscripciones) que se registren solos.
- [ ] Metas de ahorro.
