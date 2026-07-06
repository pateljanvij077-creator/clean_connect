# Design Specification: Premium UI, Glassmorphism & Framer Motion Animations

This document outlines the design and implementation plan to elevate the UI/UX of **CleanConnect**, making it highly interactive, visually beautiful, and animated.

## 1. Objectives & Goals
*   **Premium Visuals**: Integrate true Glassmorphism with deep blur and translucent borders.
*   **Seamless Animations**: Add page transitions, staggered entrance grids, and micro-interactions on button hovers.
*   **True Dark Mode**: Restore dark mode with a modern dark slate palette and subtle indigo/cyan glows instead of light-mode mirroring.
*   **Micro-Interactions**: Provide physics-based feel on hover and clicks (spring-loaded scale, hover glow, and icon shifts).

---

## 2. Proposed Design Changes

### 2.1. Global Styling (`src/styles/globals.css`)
*   **Dark Mode Restructuring**: Define `--bg-primary` as deep obsidian slate (`#070a13`), `--bg-secondary` as deep translucent navy (`rgba(17, 24, 39, 0.7)`), and borders as subtle glowing Indigo (`rgba(99, 102, 241, 0.15)`).
*   **New Utility Classes**:
    *   `.float-blob`: Animated SVG/CSS elements in the background shifting on a keyframe loop.
    *   `.glass-glow`: Translucent card style with dynamic border highlights on hover.
    *   `.stagger-item`: Fade-in entry animation with variable delays.

### 2.2. Splash Screen (`src/pages/splash/SplashScreen.jsx`)
*   Replace standard loading layout with a Framer Motion container.
*   **Animations**:
    *   Scale-in and continuous floating motion for the logo.
    *   Text letter-by-letter fade-in cascade.
    *   Shifting radial gradient background using CSS variables on a transition loop.

### 2.3. Authentication Page & Role Selection (`src/pages/auth/...`)
*   **AuthPage.jsx**:
    *   Incorporate two slow-moving floating backdrop blobs behind the auth card.
    *   Animate card entry using `motion.div` with spring ease.
    *   Add soft border highlights on input focus.
*   **RoleSelection.jsx**:
    *   Make selection cards larger and more interactive.
    *   Apply `whileHover={{ scale: 1.03, y: -4 }}` for spring elevation.
    *   Stagger the rendering of the cards.

### 2.4. HomeOwner Dashboard & Worker Cards (`src/pages/homeowner/...`)
*   **WorkerCard.jsx**:
    *   Add staggered entry animation for cards in the list.
    *   Animate favorite heart button with a pop scale trigger (`whileTap={{ scale: 0.8 }}`).
    *   Smooth expansion/hover overlay on worker profile pictures.
*   **Dashboard Filters**:
    *   Replace binary show/hide for filters with an animated height transition utilizing Framer Motion's `AnimatePresence`.

### 2.5. Worker Dashboard (`src/pages/worker/Dashboard.jsx`)
*   Animate stats counters and cards using Framer Motion.
*   Make the Recharts bar chart animate smoothly.
*   Add hover transitions to the availability selector.

---

## 3. Verification Plan
*   Run the development server (`npm run dev`) and test:
    *   Splash screen logo and text cascade.
    *   Transitions between Splash, Auth, and Dashboard.
    *   Dark mode aesthetics and contrast ratios.
    *   Filter expansion transition and worker feed stagger loading.
