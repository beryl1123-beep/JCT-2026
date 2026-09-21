# Scene 1 Portrait Particles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace only the right-side Scene 1 portrait with a performant Three.js shader particle interpretation while preserving the existing static image as a seamless fallback.

**Architecture:** A local pinned Three.js browser build renders one `THREE.Points` object inside the existing `#char-half` region. A build script samples the alpha channel of `home-character.PNG` into a compact packed data asset, avoiding runtime canvas pixel reads and keeping direct `file://` previews compatible; a custom shader handles entrance assembly and very subtle settled motion entirely on the GPU. The original image remains in the DOM and is revealed whenever motion is reduced, WebGL is unavailable, initialization fails, or the measured mobile frame rate is too low.

**Tech Stack:** Static HTML/CSS, classic JavaScript compatible with direct `file://` preview, Three.js `BufferGeometry`, `Points`, and `ShaderMaterial`, WebGL.

---

### Task 1: Add the local rendering dependency

**Files:**
- Create: `assets/vendor/three.min.js`

**Steps:**
1. Download and pin a stable Three.js module build locally so the page has no runtime CDN dependency.
2. Confirm the browser build exposes `WebGLRenderer`, `BufferGeometry`, `Points`, and `ShaderMaterial` through the local `THREE` global.

**Verification:**
- Parse the module with Node and confirm the expected exports are present.

### Task 2: Add the portrait particle layer

**Files:**
- Modify: `index.html`
- Create: `assets/js/hero-particles.js`
- Create: `assets/data/hero-particle-data.js`
- Create: `scripts/build_hero_particle_data.swift`

**Steps:**
1. Add a dedicated canvas inside `#char-half` while retaining the existing image fallback.
2. Generate a compact particle dataset from the portrait alpha channel and decode only the mobile or desktop point budget at runtime.
3. Build one `BufferGeometry` with target position, color, opacity, size, phase, and scattered start-position attributes.
4. Animate assembly and restrained ink drift with one `ShaderMaterial`.
5. Pause rendering outside Scene 1 and when the document is hidden.
6. Measure initial runtime performance and reduce the draw range or restore the static image when necessary.

**Verification:**
- Confirm the module parses, the canvas becomes ready, the particle count stays within its quality tier, and the original image remains available for fallback.

### Task 3: Match the existing responsive portrait composition

**Files:**
- Modify: `assets/css/style.css`

**Steps:**
1. Layer the particle canvas exactly over the existing portrait container.
2. Preserve the current desktop and mobile portrait placement and opacity.
3. Cross-fade only after the GPU scene has rendered its first valid frame.
4. Disable the particle layer for reduced-motion users.

**Verification:**
- Compare desktop and iPhone-size screenshots against the existing composition; confirm the background, title artwork, and left-side typography do not move.

### Task 4: Document and validate fallbacks

**Files:**
- Modify: `README.md`

**Steps:**
1. Document the local Three.js asset and the static fallback behavior.
2. Run JavaScript syntax checks.
3. Test desktop assembly, responsive resizing, off-screen pausing, reduced-motion fallback, and a forced WebGL-failure fallback.

**Verification:**
- No console errors; the particle portrait is smooth on the desktop test viewport and the static portrait remains visible in every fallback path.
