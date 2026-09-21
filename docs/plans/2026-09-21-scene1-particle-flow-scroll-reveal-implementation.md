# Scene 1 Particle Flow and Scroll Reveal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three localized falling-ink particle streams and crossfade the particle portrait into the original portrait as the user scrolls through Scene 1.

**Architecture:** Extend the existing single `THREE.Points` geometry with one lightweight per-particle flow-weight attribute. The vertex shader handles both the looping local drops and the scroll-driven global dissolve, while JavaScript updates one scroll uniform and one CSS custom property for the underlying portrait reveal.

**Tech Stack:** Static HTML/CSS, Three.js r159, GLSL vertex/fragment shaders, passive scroll listeners, ResizeObserver, IntersectionObserver.

---

### Task 1: Prepare the no-flash loading state

**Files:**
- Modify: `index.html`
- Modify: `assets/css/style.css`

**Step 1:** Mark the portrait container as particle-pending in HTML.

**Step 2:** Keep the original image hidden while pending or at the top of a particle-ready scene.

**Step 3:** Let fallback mode restore the original image immediately.

**Test:** Reload Scene 1 and confirm the bitmap never flashes before particle assembly.

### Task 2: Add the three localized ink streams

**Files:**
- Modify: `assets/js/hero-particles.js`

**Step 1:** Define three normalized flow zones matching the annotated garment tips.

**Step 2:** Generate one `aFlowStrength` attribute while building the existing particle geometry.

**Step 3:** In the vertex shader, cycle selected particles downward with slight lateral drift and fade them before they loop.

**Test:** At the top of Scene 1, confirm all three marked tips emit subtle falling particles without disturbing the face or main silhouette.

### Task 3: Connect scroll progress to dissolve and image reveal

**Files:**
- Modify: `assets/js/hero-particles.js`
- Modify: `assets/css/style.css`

**Step 1:** Add a `uDissolve` shader uniform.

**Step 2:** Map the first 82% of one viewport of downward scrolling to a smooth 0-1 dissolve value.

**Step 3:** Scatter and fade the particle portrait while updating `--hero-image-reveal` with the same eased progress.

**Step 4:** Pause rendering when Scene 1 is offscreen and preserve static fallback behavior.

**Test:** Scroll from the top into Scene 2 and confirm the particle portrait disappears as the original portrait appears.

### Task 4: Verify quality and performance paths

**Files:**
- Verify: `assets/js/hero-particles.js`
- Verify: `index.html`
- Verify: `assets/css/style.css`

**Step 1:** Run JavaScript syntax checks and `git diff --check`.

**Step 2:** Visually verify the animation at desktop size and a 400 x 834 mobile viewport.

**Step 3:** Verify `heroParticles=off` still displays the static portrait.

**Step 4:** Confirm reduced-motion and low-frame-rate paths avoid the animated effect.

