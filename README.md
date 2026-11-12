# TargetHit — Terminal de Trading (Next.js)

Versión **Next.js (App Router)** del clone de [targethit.com/trade](https://targethit.com/trade).
Reproduce el terminal completo: gráficos, herramientas de dibujo, indicadores, watchlist, alertas,
workspaces y trading demo simulado.

> Proyecto de **solo front-end**. Los precios y velas se generan localmente; no hay backend ni
> conexión a exchanges.

## Requisitos

- Node.js 18.17 o superior (probado con Node 24)
- Yarn 4 (vía Corepack): `corepack enable`

## Instalación

```bash
yarn install
```

## Cómo ejecutar

### Opción 1 — Lanzador (Windows)

Doble clic en **`Abrir_TargetHit_Next.bat`**: instala dependencias si faltan y levanta el servidor.

### Opción 2 — Manual

```bash
yarn dev
```

Abrir **http://localhost:3000/trade** (la raíz `/` redirige a `/trade`).

### Producción

```bash
yarn build
yarn start
```

Abrir **http://localhost:3000/trade**

> Detén el servidor `dev` antes de `yarn build` para no corromper la carpeta `.next`.

## Características

- **Diseño fiel al original**: tokens exactos claro/oscuro, tipografías Inter y JetBrains Mono,
  cabecera, barra de promoción, toolbar de dos filas y watchlist de 292 px.
- **Gráfico en canvas**: velas, barras, área y línea; tick en vivo simulado; crosshair; ejes de precio y
  tiempo; escalas lineal, logarítmica, porcentaje e indexada (invertible); línea de último precio;
  exportación a PNG. **Arrastra para desplazar (pan), usa la rueda para zoom temporal y arrastra la
  escala de precios (eje derecho) para escalar verticalmente; doble clic en la escala la restablece.**
- **Todas las herramientas de dibujo**: tendencia, rayo, línea extendida, horizontal/rayo, rectángulo,
  elipse, texto, pincel, trazo, flecha, bandera, barras, Fibonacci y extensión, ángulo y perfil de
  volumen. Selección, arrastre, borrado, bloquear/ocultar/eliminar todo, deshacer/rehacer, imán y barra
  de favoritos arrastrable.
- **16 indicadores**: Liquidations Heatmap, CVD, EMA 20/50, SMA 200, VWAP, Bollinger, Parabolic SAR,
  Volumen, RSI, MACD, Estocástico, ATR, CCI, Momentum y Awesome Oscillator.
- **Watchlist**: 30 mercados, favoritos, venues (HyperLiquid/Binance) y Trade bloqueado.
- **Extras**: comparar instrumentos, workspaces guardados, alertas con disparo en vivo, bar replay,
  layouts de 1 o 2 gráficos, ajustes, modo enfoque y tema persistente.

## Estructura

```
src/
  app/
    layout.tsx            # layout raíz, tema sin FOUC y metadatos
    page.tsx              # redirige a /trade
    trade/page.tsx        # monta el terminal
    icon.svg              # favicon
  App.tsx                 # orquestación y estado global ("use client")
  components/             # Header, Toolbar, Chart, DrawingToolbar, FavoriteToolbar, Watchlist
  data/markets.ts         # lista de mercados
  lib/                    # chartData, drawings, indicators, format, types
  styles.css              # tokens de tema y estilos
public/
  fonts/                  # Inter y JetBrains Mono
  coins/                  # iconos de mercados
```

## Scripts

| Comando         | Descripción                          |
| --------------- | ------------------------------------ |
| `yarn dev`      | Servidor de desarrollo (puerto 3000) |
| `yarn build`    | Compila el build de producción       |
| `yarn start`    | Sirve el build (puerto 3000)         |
| `yarn lint`     | Linter de Next.js                    |