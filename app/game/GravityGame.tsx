'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────
const W = 800;
const H = 450;
const FLOOR_Y = 430;    // top of floor
const CEIL_Y = 20;      // bottom of ceiling
const PR = 15;          // player radius
const GRAV = 0.45;
const MAX_VY = 10;
const SPD = 3.5;
const LW = 2800;        // level width
const COIN_R = 9;
const CAM_LEAD = 250;   // player x position on screen

// ─── Types ──────────────────────────────────────────────────────────────────
type Rect = { x: number; y: number; w: number; h: number };
type Spike = Rect & { dir: 'up' | 'down' };
type MovDef = Rect & { axis: 'x' | 'y'; range: number; speed: number; phase: number };
type CoinDef = { cx: number; cy: number };

interface StageData {
  name: string;
  sx: number; sy: number;
  gx: number;
  plats: Rect[];
  spikes: Spike[];
  movDefs: MovDef[];
  coins: CoinDef[];
}

interface Player {
  x: number; y: number;
  vx: number; vy: number;
  gravDir: 1 | -1;
  angle: number;
}

interface MovObs extends MovDef {
  t: number;
  tDir: number;
  curX: number;
  curY: number;
}

interface GameState {
  player: Player;
  movObs: MovObs[];
  coins: boolean[];
  cameraX: number;
  frameCount: number;
  dead: boolean;
  cleared: boolean;
  deathTimer: number;
}

// ─── Stage Data ─────────────────────────────────────────────────────────────
const FY = FLOOR_Y;
const CY = CEIL_Y;

const STAGES: StageData[] = [
  // Stage 1: Tutorial
  {
    name: 'のどかな草原',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 400, y: 310, w: 180, h: 18 },
      { x: 700, y: 270, w: 160, h: 18 },
      { x: 1050, y: 320, w: 180, h: 18 },
      { x: 1400, y: 260, w: 160, h: 18 },
      { x: 1750, y: 310, w: 180, h: 18 },
      { x: 2100, y: 270, w: 180, h: 18 },
      { x: 2400, y: 300, w: 200, h: 18 },
    ],
    spikes: [
      { x: 560, y: FY - 18, w: 60, h: 18, dir: 'up' },
      { x: 920, y: FY - 18, w: 50, h: 18, dir: 'up' },
      { x: 1600, y: FY - 18, w: 50, h: 18, dir: 'up' },
      { x: 1970, y: FY - 18, w: 50, h: 18, dir: 'up' },
    ],
    movDefs: [],
    coins: [
      { cx: 490, cy: 289 },
      { cx: 780, cy: 249 },
      { cx: 1140, cy: 299 },
    ],
  },
  // Stage 2: Intro gravity flip
  {
    name: 'はじめての重力反転',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 300, y: 320, w: 150, h: 18 },
      { x: 560, y: CY, w: 200, h: 18 },
      { x: 900, y: 300, w: 150, h: 18 },
      { x: 1150, y: CY, w: 200, h: 18 },
      { x: 1480, y: 310, w: 200, h: 18 },
      { x: 1760, y: CY, w: 220, h: 18 },
      { x: 2100, y: 300, w: 200, h: 18 },
      { x: 2400, y: 280, w: 200, h: 18 },
    ],
    spikes: [
      { x: 480, y: FY - 18, w: 55, h: 18, dir: 'up' },
      { x: 820, y: FY - 18, w: 55, h: 18, dir: 'up' },
      { x: 1110, y: FY - 18, w: 35, h: 18, dir: 'up' },
      { x: 1400, y: FY - 18, w: 55, h: 18, dir: 'up' },
      { x: 1700, y: FY - 18, w: 35, h: 18, dir: 'up' },
      { x: 2030, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 760, y: CY, w: 50, h: 18, dir: 'down' },
      { x: 1370, y: CY, w: 50, h: 18, dir: 'down' },
    ],
    movDefs: [],
    coins: [
      { cx: 375, cy: 299 },
      { cx: 660, cy: CY + 22 },
      { cx: 975, cy: 279 },
      { cx: 1250, cy: CY + 22 },
      { cx: 2200, cy: 279 },
    ],
  },
  // Stage 3: First moving obstacles
  {
    name: '動く障害物',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 300, y: 320, w: 150, h: 18 },
      { x: 700, y: 280, w: 150, h: 18 },
      { x: 1100, y: 310, w: 150, h: 18 },
      { x: 1500, y: 260, w: 150, h: 18 },
      { x: 1900, y: 300, w: 150, h: 18 },
      { x: 2300, y: 270, w: 180, h: 18 },
    ],
    spikes: [
      { x: 500, y: FY - 18, w: 40, h: 18, dir: 'up' },
      { x: 920, y: FY - 18, w: 40, h: 18, dir: 'up' },
      { x: 1320, y: FY - 18, w: 40, h: 18, dir: 'up' },
      { x: 1720, y: FY - 18, w: 40, h: 18, dir: 'up' },
    ],
    movDefs: [
      { x: 470, y: 130, w: 36, h: 36, axis: 'y', range: 170, speed: 2, phase: 0 },
      { x: 870, y: 120, w: 36, h: 36, axis: 'y', range: 190, speed: 2.5, phase: 0.5 },
      { x: 1270, y: 140, w: 36, h: 36, axis: 'y', range: 160, speed: 2.2, phase: 0.3 },
      { x: 1670, y: 110, w: 36, h: 36, axis: 'y', range: 200, speed: 3, phase: 0.7 },
    ],
    coins: [
      { cx: 375, cy: 299 },
      { cx: 775, cy: 259 },
      { cx: 1175, cy: 289 },
      { cx: 1575, cy: 239 },
    ],
  },
  // Stage 4: Ceiling platforms + moving
  {
    name: '縦横無尽',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 250, y: 310, w: 130, h: 18 },
      { x: 490, y: CY, w: 130, h: 18 },
      { x: 740, y: 300, w: 130, h: 18 },
      { x: 990, y: CY, w: 130, h: 18 },
      { x: 1240, y: 305, w: 130, h: 18 },
      { x: 1490, y: CY, w: 130, h: 18 },
      { x: 1740, y: 290, w: 130, h: 18 },
      { x: 1990, y: CY, w: 130, h: 18 },
      { x: 2250, y: 295, w: 140, h: 18 },
      { x: 2460, y: 280, w: 180, h: 18 },
    ],
    spikes: [
      { x: 400, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 650, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 900, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1150, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1400, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1650, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1900, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 660, y: CY, w: 40, h: 18, dir: 'down' },
      { x: 1160, y: CY, w: 40, h: 18, dir: 'down' },
      { x: 1660, y: CY, w: 40, h: 18, dir: 'down' },
    ],
    movDefs: [
      { x: 360, y: 110, w: 34, h: 34, axis: 'x', range: 110, speed: 2.5, phase: 0 },
      { x: 820, y: 130, w: 34, h: 34, axis: 'y', range: 170, speed: 3, phase: 0 },
      { x: 1310, y: 115, w: 34, h: 34, axis: 'x', range: 100, speed: 3, phase: 0.4 },
      { x: 1810, y: 130, w: 34, h: 34, axis: 'y', range: 165, speed: 3.5, phase: 0.3 },
    ],
    coins: [
      { cx: 315, cy: 289 },
      { cx: 555, cy: CY + 22 },
      { cx: 805, cy: 279 },
      { cx: 1305, cy: 284 },
      { cx: 1805, cy: 269 },
    ],
  },
  // Stage 5: Rapid alternation
  {
    name: '重力の波',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 180, y: 290, w: 110, h: 18 },
      { x: 370, y: CY, w: 110, h: 18 },
      { x: 560, y: 285, w: 110, h: 18 },
      { x: 750, y: CY, w: 110, h: 18 },
      { x: 940, y: 295, w: 110, h: 18 },
      { x: 1130, y: CY, w: 110, h: 18 },
      { x: 1320, y: 280, w: 110, h: 18 },
      { x: 1510, y: CY, w: 110, h: 18 },
      { x: 1700, y: 290, w: 110, h: 18 },
      { x: 1890, y: CY, w: 110, h: 18 },
      { x: 2080, y: 285, w: 110, h: 18 },
      { x: 2280, y: 270, w: 130, h: 18 },
      { x: 2470, y: 280, w: 180, h: 18 },
    ],
    spikes: [
      { x: 315, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 505, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 505, y: CY, w: 30, h: 18, dir: 'down' },
      { x: 695, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 885, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 885, y: CY, w: 30, h: 18, dir: 'down' },
      { x: 1075, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 1265, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 1265, y: CY, w: 30, h: 18, dir: 'down' },
      { x: 1455, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 1645, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 1835, y: FY - 18, w: 30, h: 18, dir: 'up' },
      { x: 2025, y: FY - 18, w: 30, h: 18, dir: 'up' },
    ],
    movDefs: [
      { x: 420, y: 120, w: 30, h: 30, axis: 'y', range: 180, speed: 3.5, phase: 0 },
      { x: 800, y: 110, w: 30, h: 30, axis: 'y', range: 195, speed: 4, phase: 0.4 },
      { x: 1180, y: 125, w: 30, h: 30, axis: 'y', range: 175, speed: 3.8, phase: 0.7 },
      { x: 1560, y: 115, w: 30, h: 30, axis: 'y', range: 190, speed: 4.5, phase: 0.2 },
    ],
    coins: [
      { cx: 235, cy: 269 },
      { cx: 425, cy: CY + 22 },
      { cx: 810, cy: CY + 22 },
      { cx: 1190, cy: CY + 22 },
      { cx: 2140, cy: 264 },
    ],
  },
  // Stage 6: Spike maze
  {
    name: 'トゲ地獄',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 200, y: 300, w: 120, h: 18 },
      { x: 440, y: 260, w: 100, h: 18 },
      { x: 660, y: 240, w: 100, h: 18 },
      { x: 890, y: CY, w: 120, h: 18 },
      { x: 1120, y: 255, w: 100, h: 18 },
      { x: 1340, y: 280, w: 120, h: 18 },
      { x: 1570, y: CY, w: 120, h: 18 },
      { x: 1800, y: 265, w: 100, h: 18 },
      { x: 2020, y: 290, w: 120, h: 18 },
      { x: 2260, y: CY, w: 120, h: 18 },
      { x: 2480, y: 270, w: 160, h: 18 },
    ],
    spikes: [
      { x: 350, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 400, y: FY - 18, w: 40, h: 18, dir: 'up' },
      { x: 575, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 785, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1035, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1260, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1490, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1725, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 1940, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 2160, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 2395, y: FY - 18, w: 45, h: 18, dir: 'up' },
      { x: 980, y: CY, w: 50, h: 18, dir: 'down' },
      { x: 1640, y: CY, w: 50, h: 18, dir: 'down' },
      { x: 2330, y: CY, w: 50, h: 18, dir: 'down' },
      { x: 450, y: 242, w: 28, h: 15, dir: 'up' },
      { x: 680, y: 222, w: 28, h: 15, dir: 'up' },
    ],
    movDefs: [
      { x: 300, y: 140, w: 34, h: 34, axis: 'x', range: 100, speed: 3, phase: 0 },
      { x: 740, y: 105, w: 34, h: 34, axis: 'y', range: 185, speed: 3.5, phase: 0 },
      { x: 1190, y: 125, w: 34, h: 34, axis: 'x', range: 110, speed: 3.5, phase: 0.4 },
      { x: 1680, y: 110, w: 34, h: 34, axis: 'y', range: 195, speed: 4, phase: 0 },
      { x: 2090, y: 130, w: 34, h: 34, axis: 'x', range: 120, speed: 4, phase: 0.6 },
    ],
    coins: [
      { cx: 260, cy: 279 },
      { cx: 490, cy: 239 },
      { cx: 710, cy: 219 },
      { cx: 950, cy: CY + 22 },
      { cx: 1400, cy: 259 },
      { cx: 1860, cy: 244 },
    ],
  },
  // Stage 7: Fast obstacles
  {
    name: '高速障害物',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 200, y: 300, w: 110, h: 18 },
      { x: 415, y: CY, w: 110, h: 18 },
      { x: 630, y: 290, w: 110, h: 18 },
      { x: 845, y: CY, w: 110, h: 18 },
      { x: 1060, y: 295, w: 110, h: 18 },
      { x: 1275, y: CY, w: 110, h: 18 },
      { x: 1490, y: 285, w: 110, h: 18 },
      { x: 1705, y: CY, w: 110, h: 18 },
      { x: 1920, y: 295, w: 110, h: 18 },
      { x: 2135, y: CY, w: 110, h: 18 },
      { x: 2360, y: 280, w: 180, h: 18 },
    ],
    spikes: [
      { x: 340, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 555, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 770, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 985, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 1200, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 1415, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 1630, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 1845, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 2060, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 2275, y: FY - 18, w: 38, h: 18, dir: 'up' },
      { x: 360, y: CY, w: 38, h: 18, dir: 'down' },
      { x: 790, y: CY, w: 38, h: 18, dir: 'down' },
      { x: 1220, y: CY, w: 38, h: 18, dir: 'down' },
      { x: 1650, y: CY, w: 38, h: 18, dir: 'down' },
      { x: 2080, y: CY, w: 38, h: 18, dir: 'down' },
    ],
    movDefs: [
      { x: 375, y: 100, w: 30, h: 30, axis: 'y', range: 200, speed: 5, phase: 0 },
      { x: 590, y: 90, w: 30, h: 30, axis: 'y', range: 215, speed: 5.5, phase: 0.3 },
      { x: 805, y: 95, w: 30, h: 30, axis: 'y', range: 208, speed: 5.2, phase: 0.6 },
      { x: 1020, y: 85, w: 30, h: 30, axis: 'y', range: 218, speed: 6, phase: 0.1 },
      { x: 1235, y: 100, w: 30, h: 30, axis: 'y', range: 200, speed: 5.8, phase: 0.8 },
      { x: 1450, y: 90, w: 30, h: 30, axis: 'y', range: 210, speed: 6.2, phase: 0.4 },
      { x: 1665, y: 88, w: 30, h: 30, axis: 'y', range: 215, speed: 6.5, phase: 0.2 },
    ],
    coins: [
      { cx: 255, cy: 279 },
      { cx: 470, cy: CY + 22 },
      { cx: 685, cy: 269 },
      { cx: 1115, cy: 274 },
      { cx: 1545, cy: 264 },
      { cx: 1975, cy: 274 },
    ],
  },
  // Stage 8: Everything combined
  {
    name: '混沌のステージ',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 180, y: 285, w: 100, h: 18 },
      { x: 370, y: CY, w: 100, h: 18 },
      { x: 560, y: 278, w: 100, h: 18 },
      { x: 750, y: CY, w: 100, h: 18 },
      { x: 940, y: 282, w: 100, h: 18 },
      { x: 1130, y: CY, w: 100, h: 18 },
      { x: 1320, y: 272, w: 100, h: 18 },
      { x: 1510, y: CY, w: 100, h: 18 },
      { x: 1700, y: 280, w: 100, h: 18 },
      { x: 1890, y: CY, w: 100, h: 18 },
      { x: 2080, y: 268, w: 110, h: 18 },
      { x: 2360, y: 275, w: 180, h: 18 },
    ],
    spikes: [
      { x: 305, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 495, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 685, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 875, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 1065, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 1255, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 1445, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 1635, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 1825, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 2015, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 2205, y: FY - 18, w: 32, h: 18, dir: 'up' },
      { x: 305, y: CY, w: 32, h: 18, dir: 'down' },
      { x: 685, y: CY, w: 32, h: 18, dir: 'down' },
      { x: 1065, y: CY, w: 32, h: 18, dir: 'down' },
      { x: 1445, y: CY, w: 32, h: 18, dir: 'down' },
      { x: 1825, y: CY, w: 32, h: 18, dir: 'down' },
    ],
    movDefs: [
      { x: 235, y: 75, w: 28, h: 28, axis: 'y', range: 230, speed: 5, phase: 0 },
      { x: 425, y: 60, w: 28, h: 28, axis: 'y', range: 245, speed: 5.5, phase: 0.3 },
      { x: 615, y: 68, w: 28, h: 28, axis: 'y', range: 238, speed: 6, phase: 0.6 },
      { x: 805, y: 52, w: 28, h: 28, axis: 'y', range: 252, speed: 5.8, phase: 0.1 },
      { x: 995, y: 62, w: 28, h: 28, axis: 'y', range: 242, speed: 6.5, phase: 0.8 },
      { x: 1185, y: 55, w: 28, h: 28, axis: 'y', range: 248, speed: 6.2, phase: 0.4 },
      { x: 1375, y: 60, w: 28, h: 28, axis: 'y', range: 245, speed: 7, phase: 0.2 },
      { x: 1565, y: 65, w: 28, h: 28, axis: 'y', range: 240, speed: 6.8, phase: 0.5 },
      { x: 1755, y: 52, w: 28, h: 28, axis: 'y', range: 252, speed: 7.2, phase: 0.7 },
    ],
    coins: [
      { cx: 230, cy: 264 },
      { cx: 420, cy: CY + 22 },
      { cx: 610, cy: 257 },
      { cx: 990, cy: 261 },
      { cx: 1370, cy: 251 },
      { cx: 1750, cy: 259 },
      { cx: 2135, cy: 247 },
    ],
  },
  // Stage 9: Extreme
  {
    name: '極限への挑戦',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 160, y: 275, w: 85, h: 18 },
      { x: 335, y: CY, w: 85, h: 18 },
      { x: 510, y: 268, w: 85, h: 18 },
      { x: 685, y: CY, w: 85, h: 18 },
      { x: 860, y: 272, w: 85, h: 18 },
      { x: 1035, y: CY, w: 85, h: 18 },
      { x: 1210, y: 262, w: 85, h: 18 },
      { x: 1385, y: CY, w: 85, h: 18 },
      { x: 1560, y: 268, w: 85, h: 18 },
      { x: 1735, y: CY, w: 85, h: 18 },
      { x: 1910, y: 258, w: 85, h: 18 },
      { x: 2085, y: CY, w: 85, h: 18 },
      { x: 2260, y: 262, w: 85, h: 18 },
      { x: 2460, y: 265, w: 180, h: 18 },
    ],
    spikes: [
      { x: 275, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 450, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 625, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 800, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 975, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 1150, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 1325, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 1500, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 1675, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 1850, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 2025, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 2200, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 2375, y: FY - 18, w: 28, h: 18, dir: 'up' },
      { x: 450, y: CY, w: 28, h: 18, dir: 'down' },
      { x: 800, y: CY, w: 28, h: 18, dir: 'down' },
      { x: 1150, y: CY, w: 28, h: 18, dir: 'down' },
      { x: 1500, y: CY, w: 28, h: 18, dir: 'down' },
      { x: 1850, y: CY, w: 28, h: 18, dir: 'down' },
      { x: 2200, y: CY, w: 28, h: 18, dir: 'down' },
    ],
    movDefs: [
      { x: 198, y: 68, w: 26, h: 26, axis: 'y', range: 242, speed: 6, phase: 0 },
      { x: 373, y: 55, w: 26, h: 26, axis: 'y', range: 255, speed: 7, phase: 0.2 },
      { x: 548, y: 62, w: 26, h: 26, axis: 'y', range: 248, speed: 6.5, phase: 0.4 },
      { x: 723, y: 48, w: 26, h: 26, axis: 'y', range: 262, speed: 7.5, phase: 0.6 },
      { x: 898, y: 58, w: 26, h: 26, axis: 'y', range: 252, speed: 7, phase: 0.8 },
      { x: 1073, y: 52, w: 26, h: 26, axis: 'y', range: 258, speed: 8, phase: 0.1 },
      { x: 1248, y: 60, w: 26, h: 26, axis: 'y', range: 250, speed: 7.8, phase: 0.3 },
      { x: 1423, y: 48, w: 26, h: 26, axis: 'y', range: 262, speed: 8.5, phase: 0.5 },
      { x: 1598, y: 55, w: 26, h: 26, axis: 'y', range: 255, speed: 8, phase: 0.7 },
      { x: 1773, y: 50, w: 26, h: 26, axis: 'y', range: 260, speed: 9, phase: 0.9 },
    ],
    coins: [
      { cx: 202, cy: 254 },
      { cx: 377, cy: CY + 22 },
      { cx: 552, cy: 247 },
      { cx: 902, cy: 251 },
      { cx: 1252, cy: 241 },
      { cx: 1602, cy: 247 },
      { cx: 1952, cy: 237 },
      { cx: 2302, cy: 241 },
    ],
  },
  // Stage 10: Final
  {
    name: '最終決戦！',
    sx: 80, sy: FY - PR,
    gx: 2650,
    plats: [
      { x: 150, y: 265, w: 75, h: 18 },
      { x: 305, y: CY, w: 75, h: 18 },
      { x: 460, y: 258, w: 75, h: 18 },
      { x: 615, y: CY, w: 75, h: 18 },
      { x: 770, y: 262, w: 75, h: 18 },
      { x: 925, y: CY, w: 75, h: 18 },
      { x: 1080, y: 252, w: 75, h: 18 },
      { x: 1235, y: CY, w: 75, h: 18 },
      { x: 1390, y: 258, w: 75, h: 18 },
      { x: 1545, y: CY, w: 75, h: 18 },
      { x: 1700, y: 248, w: 75, h: 18 },
      { x: 1855, y: CY, w: 75, h: 18 },
      { x: 2010, y: 252, w: 75, h: 18 },
      { x: 2165, y: CY, w: 75, h: 18 },
      { x: 2320, y: 242, w: 75, h: 18 },
      { x: 2480, y: 255, w: 160, h: 18 },
    ],
    spikes: [
      { x: 255, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 410, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 565, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 720, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 875, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1030, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1185, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1340, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1495, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1650, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1805, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 1960, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 2115, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 2270, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 2425, y: FY - 18, w: 24, h: 18, dir: 'up' },
      { x: 255, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 410, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 720, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 1030, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 1340, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 1650, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 1960, y: CY, w: 24, h: 18, dir: 'down' },
      { x: 2270, y: CY, w: 24, h: 18, dir: 'down' },
    ],
    movDefs: [
      { x: 188, y: 58, w: 24, h: 24, axis: 'y', range: 252, speed: 7, phase: 0 },
      { x: 343, y: 45, w: 24, h: 24, axis: 'y', range: 265, speed: 8, phase: 0.15 },
      { x: 498, y: 52, w: 24, h: 24, axis: 'y', range: 258, speed: 7.5, phase: 0.3 },
      { x: 653, y: 42, w: 24, h: 24, axis: 'y', range: 268, speed: 9, phase: 0.45 },
      { x: 808, y: 48, w: 24, h: 24, axis: 'y', range: 262, speed: 8.5, phase: 0.6 },
      { x: 963, y: 45, w: 24, h: 24, axis: 'y', range: 265, speed: 9.5, phase: 0.75 },
      { x: 1118, y: 50, w: 24, h: 24, axis: 'y', range: 260, speed: 9, phase: 0.9 },
      { x: 1273, y: 42, w: 24, h: 24, axis: 'y', range: 268, speed: 10, phase: 0.05 },
      { x: 1428, y: 46, w: 24, h: 24, axis: 'y', range: 264, speed: 9.5, phase: 0.2 },
      { x: 1583, y: 48, w: 24, h: 24, axis: 'y', range: 262, speed: 10.5, phase: 0.35 },
      { x: 1738, y: 44, w: 24, h: 24, axis: 'y', range: 266, speed: 10, phase: 0.5 },
      { x: 1893, y: 50, w: 24, h: 24, axis: 'y', range: 260, speed: 11, phase: 0.65 },
      { x: 2048, y: 45, w: 24, h: 24, axis: 'y', range: 265, speed: 10.5, phase: 0.8 },
      { x: 2203, y: 42, w: 24, h: 24, axis: 'y', range: 268, speed: 11.5, phase: 0.95 },
    ],
    coins: [
      { cx: 187, cy: 244 },
      { cx: 342, cy: CY + 22 },
      { cx: 497, cy: 237 },
      { cx: 807, cy: 241 },
      { cx: 1117, cy: 231 },
      { cx: 1427, cy: 237 },
      { cx: 1737, cy: 227 },
      { cx: 2047, cy: 231 },
      { cx: 2357, cy: 221 },
    ],
  },
];

// ─── Physics Helpers ────────────────────────────────────────────────────────
function resolveCircleRect(
  px: number, py: number, r: number,
  rx: number, ry: number, rw: number, rh: number
): { nx: number; ny: number; overlap: number } | null {
  const nearX = Math.max(rx, Math.min(px, rx + rw));
  const nearY = Math.max(ry, Math.min(py, ry + rh));
  const dx = px - nearX;
  const dy = py - nearY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= r * r) return null;
  const dist = Math.sqrt(distSq) || 0.001;
  return { nx: dx / dist, ny: dy / dist, overlap: r - dist };
}

function initMovObs(defs: MovDef[]): MovObs[] {
  return defs.map(d => ({
    ...d,
    t: d.phase * d.range,
    tDir: d.speed,
    curX: d.x,
    curY: d.y,
  }));
}

// ─── Component ──────────────────────────────────────────────────────────────
type GameMode = 'title' | 'select' | 'playing' | 'dead' | 'clear' | 'allclear';

export default function GravityGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const stageIdxRef = useRef(0);

  const [gameMode, setGameMode] = useState<GameMode>('title');
  const [currentStage, setCurrentStage] = useState(0);
  const [unlocked, setUnlocked] = useState<boolean[]>(() => {
    if (typeof window === 'undefined') return Array(10).fill(false).map((_, i) => i === 0);
    try {
      const saved = localStorage.getItem('grav_unlocked');
      return saved ? JSON.parse(saved) : Array(10).fill(false).map((_, i) => i === 0);
    } catch { return Array(10).fill(false).map((_, i) => i === 0); }
  });
  const [clearInfo, setClearInfo] = useState({ coins: 0, total: 0 });

  // ── Init stage ─────────────────────────────────────────────────────────
  const initStage = useCallback((idx: number) => {
    const s = STAGES[idx];
    const movObs = initMovObs(s.movDefs);
    stateRef.current = {
      player: {
        x: s.sx, y: s.sy,
        vx: 0, vy: 0,
        gravDir: 1,
        angle: 0,
      },
      movObs,
      coins: s.coins.map(() => false),
      cameraX: 0,
      frameCount: 0,
      dead: false,
      cleared: false,
      deathTimer: 0,
    };
  }, []);

  const startStage = useCallback((idx: number) => {
    stageIdxRef.current = idx;
    setCurrentStage(idx);
    initStage(idx);
    setGameMode('playing');
  }, [initStage]);

  // ── Game loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'playing') {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const gs = stateRef.current;
      if (!gs) return;

      if (gs.dead) {
        gs.deathTimer++;
        drawFrame(ctx, gs, stageIdxRef.current);
        if (gs.deathTimer > 90) {
          setGameMode('dead');
        }
        return;
      }
      if (gs.cleared) {
        drawFrame(ctx, gs, stageIdxRef.current);
        return;
      }

      update(gs, keysRef.current, stageIdxRef.current);
      drawFrame(ctx, gs, stageIdxRef.current);

      if (gs.cleared) {
        const s = STAGES[stageIdxRef.current];
        const collected = gs.coins.filter(Boolean).length;
        setClearInfo({ coins: collected, total: s.coins.length });

        const newUnlocked = [...unlocked];
        if (stageIdxRef.current + 1 < 10) newUnlocked[stageIdxRef.current + 1] = true;
        setUnlocked(newUnlocked);
        try { localStorage.setItem('grav_unlocked', JSON.stringify(newUnlocked)); } catch { /* ignore */ }

        setTimeout(() => {
          setGameMode(stageIdxRef.current >= 9 ? 'allclear' : 'clear');
        }, 800);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  // Draw on canvas even when not in play mode (title art)
  useEffect(() => {
    if (gameMode !== 'playing') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawTitleBg(ctx);
    }
  }, [gameMode]);

  const handleRetry = () => {
    initStage(stageIdxRef.current);
    setGameMode('playing');
  };

  const handleNext = () => {
    const next = stageIdxRef.current + 1;
    if (next < 10) startStage(next);
    else setGameMode('select');
  };

  const stageColors = ['★☆☆','★☆☆','★☆☆','★★☆','★★☆','★★☆','★★★','★★★','★★★','★★★+'];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="relative" style={{ width: W, height: H }}>
        <canvas ref={canvasRef} width={W} height={H} className="block" />

        {/* Title Screen */}
        {gameMode === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
               style={{ background: 'rgba(0,0,0,0.45)' }}>
            <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg" style={{ textShadow: '3px 3px 0 #2563eb' }}>
              重力反転
            </h1>
            <h2 className="text-2xl font-bold text-yellow-300 mb-8 drop-shadow">プラットフォーマー</h2>
            <div className="text-white text-sm mb-6 text-center leading-relaxed bg-black/40 px-6 py-4 rounded-xl">
              <div>← → : 移動　　↑ / ↓ : 重力反転</div>
              <div className="mt-1 text-gray-300">障害物を避けてゴールを目指せ！</div>
            </div>
            <button
              onClick={() => setGameMode('select')}
              className="px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xl rounded-full shadow-lg transition-transform hover:scale-105"
            >
              スタート
            </button>
          </div>
        )}

        {/* Stage Select */}
        {gameMode === 'select' && (
          <div className="absolute inset-0 overflow-auto p-4" style={{ background: 'rgba(10,20,40,0.92)' }}>
            <h2 className="text-2xl font-black text-white text-center mb-4">ステージセレクト</h2>
            <div className="grid grid-cols-5 gap-3">
              {STAGES.map((s, i) => (
                <button
                  key={i}
                  disabled={!unlocked[i]}
                  onClick={() => unlocked[i] && startStage(i)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 font-bold transition-transform
                    ${unlocked[i]
                      ? 'bg-gradient-to-b from-green-400 to-green-600 text-white hover:scale-105 shadow-lg cursor-pointer'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                  style={{ height: 80 }}
                >
                  <div className="text-lg">{i + 1}</div>
                  <div className="text-xs mt-1 leading-tight text-center">{unlocked[i] ? s.name : '🔒'}</div>
                  <div className="text-xs mt-1" style={{ fontSize: 10 }}>{stageColors[i]}</div>
                </button>
              ))}
            </div>
            <div className="text-center mt-4">
              <button onClick={() => setGameMode('title')} className="text-gray-400 hover:text-white text-sm underline">
                タイトルへ
              </button>
            </div>
          </div>
        )}

        {/* Death overlay */}
        {gameMode === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(200,0,0,0.55)' }}>
            <div className="text-5xl font-black text-white mb-6 drop-shadow-lg">ミス！</div>
            <div className="flex gap-4">
              <button onClick={handleRetry}
                className="px-6 py-3 bg-white text-red-700 font-black rounded-full text-lg hover:bg-red-100 shadow-lg">
                リトライ
              </button>
              <button onClick={() => setGameMode('select')}
                className="px-6 py-3 bg-gray-800 text-white font-bold rounded-full text-lg hover:bg-gray-700 shadow-lg">
                ステージ選択
              </button>
            </div>
          </div>
        )}

        {/* Clear overlay */}
        {gameMode === 'clear' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,80,0,0.6)' }}>
            <div className="text-4xl font-black text-yellow-300 mb-2 drop-shadow-lg">ステージクリア！</div>
            <div className="text-xl text-white mb-1">
              コイン: {clearInfo.coins} / {clearInfo.total}
              {clearInfo.coins === clearInfo.total && clearInfo.total > 0 && (
                <span className="ml-2 text-yellow-300 font-black">PERFECT!</span>
              )}
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={handleNext}
                className="px-6 py-3 bg-yellow-400 text-black font-black rounded-full text-lg hover:bg-yellow-300 shadow-lg">
                次のステージ
              </button>
              <button onClick={() => setGameMode('select')}
                className="px-6 py-3 bg-gray-800 text-white font-bold rounded-full text-lg hover:bg-gray-700 shadow-lg">
                ステージ選択
              </button>
            </div>
          </div>
        )}

        {/* All Clear */}
        {gameMode === 'allclear' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(80,0,80,0.7)' }}>
            <div className="text-4xl font-black text-yellow-300 mb-4 drop-shadow-lg">全ステージクリア！</div>
            <div className="text-white text-lg mb-2">おめでとう！重力の達人！</div>
            <button onClick={() => setGameMode('select')}
              className="mt-6 px-8 py-3 bg-yellow-400 text-black font-black rounded-full text-xl hover:bg-yellow-300 shadow-lg">
              ステージ選択へ
            </button>
          </div>
        )}

        {/* HUD (in-game) */}
        {gameMode === 'playing' && (
          <div className="absolute top-0 left-0 right-0 pointer-events-none px-3 py-1 flex justify-between items-center"
               style={{ background: 'rgba(0,0,0,0.35)' }}>
            <span className="text-white text-sm font-bold">
              Stage {currentStage + 1}: {STAGES[currentStage].name}
            </span>
            <CoinHUD stateRef={stateRef} stageIdx={currentStage} />
          </div>
        )}

        {/* Touch controls */}
        {gameMode === 'playing' && (
          <TouchControls keysRef={keysRef} />
        )}
      </div>
    </div>
  );
}

// ─── Coin HUD (live update) ─────────────────────────────────────────────────
function CoinHUD({ stateRef, stageIdx }: { stateRef: React.MutableRefObject<GameState | null>; stageIdx: number }) {
  const [count, setCount] = useState(0);
  const total = STAGES[stageIdx].coins.length;
  useEffect(() => {
    const id = setInterval(() => {
      setCount(stateRef.current?.coins.filter(Boolean).length ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, [stateRef, stageIdx]);
  return (
    <span className="text-yellow-300 text-sm font-bold">🪙 {count} / {total}</span>
  );
}

// ─── Touch Controls ─────────────────────────────────────────────────────────
function TouchControls({ keysRef }: { keysRef: React.MutableRefObject<Set<string>> }) {
  const press = (key: string) => () => keysRef.current.add(key);
  const release = (key: string) => () => keysRef.current.delete(key);
  const btnCls = "select-none flex items-center justify-center rounded-xl font-black text-white text-2xl opacity-60 active:opacity-100 bg-white/20 border border-white/30";
  return (
    <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 pointer-events-auto">
      <div className="flex gap-2">
        <button className={btnCls} style={{ width: 56, height: 56 }}
          onPointerDown={press('ArrowLeft')} onPointerUp={release('ArrowLeft')} onPointerLeave={release('ArrowLeft')}>◀</button>
        <button className={btnCls} style={{ width: 56, height: 56 }}
          onPointerDown={press('ArrowRight')} onPointerUp={release('ArrowRight')} onPointerLeave={release('ArrowRight')}>▶</button>
      </div>
      <div className="flex gap-2">
        <button className={btnCls} style={{ width: 56, height: 56 }}
          onPointerDown={press('ArrowUp')} onPointerUp={release('ArrowUp')} onPointerLeave={release('ArrowUp')}>▲</button>
        <button className={btnCls} style={{ width: 56, height: 56 }}
          onPointerDown={press('ArrowDown')} onPointerUp={release('ArrowDown')} onPointerLeave={release('ArrowDown')}>▼</button>
      </div>
    </div>
  );
}

// ─── Update Logic ────────────────────────────────────────────────────────────
const gravFlipCooldown = new Map<GameState, number>();

function update(gs: GameState, keys: Set<string>, stageIdx: number) {
  const s = STAGES[stageIdx];
  const p = gs.player;
  gs.frameCount++;

  // Gravity flip (with cooldown to prevent double-flip)
  const lastFlip = gravFlipCooldown.get(gs) ?? 0;
  if ((keys.has('ArrowUp') || keys.has('ArrowDown')) && gs.frameCount - lastFlip > 12) {
    p.gravDir = p.gravDir === 1 ? -1 : 1;
    gravFlipCooldown.set(gs, gs.frameCount);
  }

  // Horizontal movement
  p.vx = 0;
  if (keys.has('ArrowLeft')) p.vx = -SPD;
  if (keys.has('ArrowRight')) p.vx = SPD;

  // Apply gravity
  p.vy += GRAV * p.gravDir;
  if (Math.abs(p.vy) > MAX_VY) p.vy = MAX_VY * Math.sign(p.vy);

  // Move
  p.x += p.vx;
  p.y += p.vy;

  // Clamp to level bounds
  if (p.x < PR) { p.x = PR; p.vx = 0; }
  if (p.x > LW - PR) { p.x = LW - PR; p.vx = 0; }

  // Floor / ceiling
  if (p.y + PR >= FLOOR_Y) {
    p.y = FLOOR_Y - PR;
    if (p.vy > 0) p.vy = 0;
  }
  if (p.y - PR <= CEIL_Y) {
    p.y = CEIL_Y + PR;
    if (p.vy < 0) p.vy = 0;
  }

  // Platform collisions
  for (const plat of s.plats) {
    const col = resolveCircleRect(p.x, p.y, PR, plat.x, plat.y, plat.w, plat.h);
    if (!col) continue;
    p.x += col.nx * col.overlap;
    p.y += col.ny * col.overlap;
    if (Math.abs(col.ny) > 0.5) {
      if (col.ny < 0 && p.vy > 0) p.vy = 0;
      if (col.ny > 0 && p.vy < 0) p.vy = 0;
    }
    if (Math.abs(col.nx) > 0.5) p.vx = 0;
  }

  // Rotation
  p.angle += p.vx * 0.04;

  // Update moving obstacles
  for (const obs of gs.movObs) {
    obs.t += obs.tDir;
    if (obs.t >= obs.range || obs.t <= 0) obs.tDir = -obs.tDir;
    obs.t = Math.max(0, Math.min(obs.range, obs.t));
    obs.curX = obs.axis === 'x' ? obs.x + obs.t : obs.x;
    obs.curY = obs.axis === 'y' ? obs.y + obs.t : obs.y;
  }

  // Death checks - spikes
  for (const spk of s.spikes) {
    if (overlapsCircleRect(p.x, p.y, PR - 3, spk.x, spk.y, spk.w, spk.h)) {
      gs.dead = true; return;
    }
  }

  // Death checks - moving obstacles
  for (const obs of gs.movObs) {
    if (overlapsCircleRect(p.x, p.y, PR - 2, obs.curX, obs.curY, obs.w, obs.h)) {
      gs.dead = true; return;
    }
  }

  // Coin collection
  for (let i = 0; i < s.coins.length; i++) {
    if (gs.coins[i]) continue;
    const c = s.coins[i];
    const dx = p.x - c.cx, dy = p.y - c.cy;
    if (dx * dx + dy * dy < (PR + COIN_R) * (PR + COIN_R)) {
      gs.coins[i] = true;
    }
  }

  // Goal check
  if (p.x + PR >= s.gx && p.x - PR <= s.gx + 30 && p.y > CEIL_Y && p.y < FLOOR_Y) {
    gs.cleared = true;
  }

  // Camera
  const targetCam = Math.max(0, Math.min(p.x - CAM_LEAD, LW - W));
  gs.cameraX += (targetCam - gs.cameraX) * 0.15;
}

function overlapsCircleRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────
function drawTitleBg(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.7, '#B8E4F9');
  grad.addColorStop(1, '#C8E6C9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawClouds(ctx, 0, 1);
  drawHills(ctx, 0);
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, FLOOR_Y, W, 8);
}

function drawFrame(ctx: CanvasRenderingContext2D, gs: GameState, stageIdx: number) {
  const s = STAGES[stageIdx];
  const cam = gs.cameraX;
  const p = gs.player;

  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.65, '#B0D4F1');
  grad.addColorStop(1, '#C8E6C9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Clouds (parallax 0.3)
  drawClouds(ctx, cam * 0.3, 1);

  // Hills (parallax 0.5)
  drawHills(ctx, cam * 0.5);

  // Floor
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(-cam, FLOOR_Y, LW, H - FLOOR_Y + 10);
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(-cam, FLOOR_Y, LW, 8);

  // Ceiling
  ctx.fillStyle = '#546E7A';
  ctx.fillRect(-cam, 0, LW, CEIL_Y);
  ctx.fillStyle = '#607D8B';
  ctx.fillRect(-cam, CEIL_Y - 6, LW, 6);

  // Platforms
  for (const plat of s.plats) {
    const sx = plat.x - cam;
    if (sx + plat.w < 0 || sx > W) continue;
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(sx, plat.y, plat.w, plat.h);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(sx, plat.y, plat.w, 6);
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(sx, plat.y + plat.h - 6, plat.w, 6);
  }

  // Spikes
  for (const spk of s.spikes) {
    const sx = spk.x - cam;
    if (sx + spk.w < 0 || sx > W) continue;
    drawSpikes(ctx, sx, spk.y, spk.w, spk.h, spk.dir);
  }

  // Moving obstacles
  for (const obs of gs.movObs) {
    const sx = obs.curX - cam;
    if (sx + obs.w < 0 || sx > W) continue;
    ctx.fillStyle = '#FF6B35';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    const r = 5;
    ctx.beginPath();
    ctx.roundRect(sx, obs.curY, obs.w, obs.h, r);
    ctx.fill();
    ctx.stroke();
    // Arrow
    ctx.fillStyle = 'white';
    ctx.font = `${obs.w * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obs.axis === 'y' ? '↕' : '↔', sx + obs.w / 2, obs.curY + obs.h / 2);
  }

  // Coins
  for (let i = 0; i < s.coins.length; i++) {
    if (gs.coins[i]) continue;
    const c = s.coins[i];
    const sx = c.cx - cam;
    if (sx < -20 || sx > W + 20) continue;
    const bob = Math.sin(gs.frameCount * 0.08 + i) * 3;
    drawCoin(ctx, sx, c.cy + bob, COIN_R);
  }

  // Goal flag
  const gsx = s.gx - cam;
  if (gsx > -60 && gsx < W + 60) {
    drawGoal(ctx, gsx);
  }

  // Player
  const psx = p.x - cam;
  if (!gs.dead) {
    drawPlayer(ctx, psx, p.y, p.angle, p.gravDir, gs.frameCount);
  } else {
    const t = gs.deathTimer / 90;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(psx, p.y - gs.deathTimer * 2);
    ctx.rotate(gs.deathTimer * 0.2);
    drawPlayer(ctx, 0, 0, p.angle, p.gravDir, gs.frameCount);
    ctx.restore();

    // Red flash overlay
    ctx.fillStyle = `rgba(255,0,0,${Math.min(0.4, t * 0.8)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Gravity indicator
  ctx.fillStyle = p.gravDir === 1 ? '#4CAF50' : '#2196F3';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(p.gravDir === 1 ? '▼ 重力: 下' : '▲ 重力: 上', 8, H - 22);
}

function drawClouds(ctx: CanvasRenderingContext2D, offset: number, alpha: number) {
  const clouds = [
    { x: 100, y: 60, rx: 55, ry: 22 },
    { x: 320, y: 45, rx: 40, ry: 18 },
    { x: 500, y: 70, rx: 60, ry: 25 },
    { x: 680, y: 50, rx: 45, ry: 20 },
    { x: 1100, y: 55, rx: 65, ry: 28 },
  ];
  ctx.save();
  ctx.globalAlpha = 0.85 * alpha;
  ctx.fillStyle = 'white';
  for (const c of clouds) {
    const x = ((c.x - offset) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.beginPath();
    ctx.ellipse(x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 25, c.y + 8, c.rx * 0.65, c.ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 20, c.y + 10, c.rx * 0.6, c.ry * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.save();
  ctx.fillStyle = '#66BB6A';
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  const hillW = 280;
  for (let i = -1; i < W / hillW + 2; i++) {
    const hx = i * hillW - (offset % hillW);
    ctx.bezierCurveTo(hx + hillW * 0.25, FLOOR_Y, hx + hillW * 0.25, FLOOR_Y - 60, hx + hillW * 0.5, FLOOR_Y - 60);
    ctx.bezierCurveTo(hx + hillW * 0.75, FLOOR_Y - 60, hx + hillW * 0.75, FLOOR_Y, hx + hillW, FLOOR_Y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: 'up' | 'down') {
  const n = Math.floor(w / 14);
  const sw = w / n;
  ctx.fillStyle = '#E53935';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const bx = x + i * sw;
    if (dir === 'up') {
      ctx.moveTo(bx, y + h);
      ctx.lineTo(bx + sw / 2, y);
      ctx.lineTo(bx + sw, y + h);
    } else {
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + sw / 2, y + h);
      ctx.lineTo(bx + sw, y);
    }
  }
  ctx.fill();
  ctx.strokeStyle = '#B71C1C';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  grad.addColorStop(0, '#FFF176');
  grad.addColorStop(0.6, '#FFD700');
  grad.addColorStop(1, '#F57F17');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#E65100';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, x: number) {
  // Pole
  ctx.strokeStyle = '#78909C';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, FLOOR_Y - 2);
  ctx.lineTo(x, FLOOR_Y - 85);
  ctx.stroke();
  // Flag
  const wave = Math.sin(Date.now() * 0.004) * 4;
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.moveTo(x, FLOOR_Y - 85);
  ctx.lineTo(x + 38, FLOOR_Y - 70 + wave);
  ctx.lineTo(x + 38, FLOOR_Y - 56 + wave);
  ctx.lineTo(x, FLOOR_Y - 55);
  ctx.fill();
  // Checkered pattern hint
  ctx.fillStyle = 'white';
  ctx.fillRect(x + 4, FLOOR_Y - 82, 8, 7);
  ctx.fillRect(x + 20, FLOOR_Y - 75 + wave, 8, 7);
  // Base
  ctx.fillStyle = '#795548';
  ctx.fillRect(x - 8, FLOOR_Y - 4, 16, 8);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, gravDir: 1 | -1, _frame: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(2, PR * 0.8, PR * 0.8, PR * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body gradient
  const bodyGrad = ctx.createRadialGradient(-PR * 0.3, -PR * 0.3, 1, 0, 0, PR);
  bodyGrad.addColorStop(0, '#FF8A80');
  bodyGrad.addColorStop(0.7, '#FF5252');
  bodyGrad.addColorStop(1, '#C62828');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, PR, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = 'rgba(255,100,100,0.5)';
  ctx.beginPath();
  ctx.ellipse(-PR * 0.55, PR * 0.2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(PR * 0.55, PR * 0.2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = gravDir === 1 ? -4 : 2;
  const eyeOffsets = [[-5, 0], [5, 0]];
  for (const [ex] of eyeOffsets) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ex, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath();
    ctx.arc(ex + 0.5, eyeY + 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ex + 1.2, eyeY - 0.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth (smile when moving right, straight otherwise, wink when flipped)
  ctx.strokeStyle = '#7B1FA2';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (gravDir === -1) {
    ctx.arc(0, eyeY + 7, 4, 0.2, Math.PI - 0.2); // upside-down happy
  } else {
    ctx.arc(0, eyeY + 9, 4, Math.PI + 0.2, -0.2); // smile
  }
  ctx.stroke();

  // Gravity arrow indicator
  ctx.fillStyle = gravDir === 1 ? '#69F0AE' : '#40C4FF';
  ctx.font = `${PR * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gravDir === 1 ? '▼' : '▲', 0, gravDir === 1 ? PR + 7 : -PR - 7);

  ctx.restore();
}
