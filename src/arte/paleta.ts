// Datos copiados mecánicamente de mocks/propuesta-b.html.
export const PAL: readonly string[] = ["#00000000","#1e1210","#3b231c","#5a3829","#84573d","#b97a42","#dba468","#f1ebdd","#bfb8a8","#dc9328","#170d0a","#fff4d8","#34190f","#a8786a","#8fd0f5","#d4176c","#a00f50","#f7ecf2","#ef4a95","#bcc7cd","#8b99a2","#66083a","#00000047"];

// Pijama apagado: los índices de ropa se leen como pelo.
export const PJ_OFF: Readonly<Record<number, number>> = {"15":3,"16":2,"17":3,"18":4,"21":1};

export const paletaSprite = (pijama: boolean): string[] => PAL.map((c, i) => (pijama ? c : (PAL[PJ_OFF[i] ?? i] ?? c)));

export const PLUSH_PAL: readonly string[] = ["#00000000","#4a3320","#d9b985","#f0dcb4","#a98657"];

// Efectos: índice 0 transparente.
export const FXP: readonly string[] = ["#00000000","#e23a78","#ffd1e3","#ffffff","#8fd0f5","#f1ebdd","#bfb8a8","#e8b82a"];

// Paletas de fondo (la grilla es la misma de día y de noche).
export const SCN: Record<'laguna' | 'dormitorio', { day: readonly string[]; night: readonly string[] }> = {
  "laguna": {
    "day": [
      "#0a3fb5",
      "#0f4fc4",
      "#1a63d6",
      "#3a82e2",
      "#2b2d36",
      "#3d4049",
      "#6b6e78",
      "#9a8650",
      "#6e6038",
      "#1d4a4a",
      "#2a6660",
      "#5b9a8e",
      "#b9a99b",
      "#d79b87",
      "#7e7167",
      "#b7c3a3",
      "#e08a2a",
      "#e8b82a",
      "#0a3fb5",
      "#e8f0ff",
      "#0f4fc4",
      "#0f4fc4"
    ],
    "night": [
      "#05071c",
      "#080c2b",
      "#0e1540",
      "#1a2255",
      "#10131f",
      "#191d2e",
      "#3a4263",
      "#2c2a30",
      "#1c1b22",
      "#0b1c28",
      "#102b38",
      "#2f5f78",
      "#5a5662",
      "#6d5a68",
      "#2e2c38",
      "#6c7a72",
      "#b0702a",
      "#b69a2c",
      "#f4efe0",
      "#2b3560",
      "#f0e9c8",
      "#f4efe0"
    ]
  },
  "dormitorio": {
    "day": [
      "#eadfb8",
      "#d9cd9c",
      "#7a4a2a",
      "#6aa56e",
      "#7fb4e8",
      "#c8873c",
      "#e0a95c",
      "#4a3322",
      "#3f8d96",
      "#f2f0e6",
      "#8d9fbe",
      "#5f7396",
      "#c0cde2",
      "#e9e1cf",
      "#cfc4ac",
      "#f7f3e8",
      "#8fc4f0",
      "#8fc4f0",
      "#ffffff"
    ],
    "night": [
      "#2f2c4a",
      "#25233c",
      "#4a2f22",
      "#3b5a52",
      "#2a3a5c",
      "#6e4a2a",
      "#8a6535",
      "#2a1f18",
      "#27565c",
      "#aeb0ba",
      "#4a5779",
      "#33405f",
      "#6d7da0",
      "#8b83a0",
      "#6e6888",
      "#a9a3c0",
      "#0b1030",
      "#f4efe0",
      "#f0e9c8"
    ]
  }
};
