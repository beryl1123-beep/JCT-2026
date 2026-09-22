(() => {
  "use strict";

  const container = document.getElementById("char-half");
  const canvas = document.getElementById("hero-particles");
  const portrait = document.getElementById("char");
  const revealTrigger = document.getElementById("hero-particle-reveal");
  const sceneElement = document.getElementById("s1");

  if (!container || !canvas || !portrait || !revealTrigger || !sceneElement) {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forcedOff = searchParams.get("heroParticles") === "off";
  const debugEnabled = searchParams.get("heroParticlesDebug") === "1";
  let debugOutput = null;

  function showDebugStatus(message) {
    if (!debugEnabled) {
      return;
    }
    if (!debugOutput) {
      debugOutput = document.createElement("output");
      debugOutput.style.cssText = "position:fixed;right:10px;bottom:10px;z-index:10000;padding:6px 9px;border-radius:4px;background:rgba(0,0,0,.78);color:#ffe59a;font:11px/1.4 monospace;pointer-events:none";
      document.body.appendChild(debugOutput);
    }
    debugOutput.textContent = `Hero particles · ${message}`;
  }

  function useStaticPortrait(reason, detail = "") {
    container.classList.remove("is-particle-pending", "is-particle-ready");
    container.classList.add("is-particle-fallback");
    container.dataset.particleState = reason;
    showDebugStatus(`fallback · ${reason}${detail ? ` · ${detail}` : ""}`);
  }

  if (reducedMotion || forcedOff || !window.THREE) {
    useStaticPortrait(reducedMotion ? "reduced-motion" : forcedOff ? "forced-off" : "three-unavailable");
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  const compactQuery = window.matchMedia("(max-width: 960px)");
  const pointerRevealQuery = window.matchMedia("(min-width: 761px) and (hover: hover) and (pointer: fine)");
  const pointerInteractionMode = "water";
  const THREE = window.THREE;
  let renderer = null;
  let camera = null;
  let scene = null;
  let particles = null;
  let geometry = null;
  let material = null;
  let resizeObserver = null;
  let visibilityObserver = null;
  let isVisible = false;
  let isDisposed = false;
  let loopRunning = false;
  let lastTimestamp = 0;
  let activeTime = 0;
  let monitorStart = 0;
  let monitorFrames = 0;
  let monitorComplete = false;
  let qualityReduced = false;
  let totalParticles = 0;
  let totalFlowParticles = 0;
  let currentPixelRatio = 1;
  let scrollFrame = 0;
  let revealFrame = 0;
  let revealStartTime = 0;
  let revealProgress = 0;
  let revealHoverStrength = 0;
  let hoverStrength = 0;
  let targetHoverStrength = 0;
  let lastPointerSample = null;
  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerHead = new THREE.Vector2(0, 0);
  const pointerTrail = new THREE.Vector2(0, 0);
  const pointerTail = new THREE.Vector2(0, 0);
  const windDirection = new THREE.Vector2(0.94, 0.34).normalize();
  const targetWindDirection = windDirection.clone();

  const flowZones = [
    { x: -0.38, y: -0.08, radiusX: 0.105, radiusY: 0.115 },
    { x: 0.17, y: -0.035, radiusX: 0.095, radiusY: 0.12 },
    { x: 0.31, y: -0.385, radiusX: 0.11, radiusY: 0.135 },
  ];

  const vertexShader = `
    attribute vec3 aTarget;
    attribute vec3 aInkColor;
    attribute float aInkAlpha;
    attribute float aSize;
    attribute float aPhase;
    attribute float aFlowStrength;

    uniform float uProgress;
    uniform float uDissolve;
    uniform vec2 uPointer;
    uniform vec2 uPointerTrail;
    uniform vec2 uPointerTail;
    uniform vec2 uWindDirection;
    uniform float uInteractionAspect;
    uniform float uInteractionMode;
    uniform float uRevealHoverStrength;
    uniform float uHoverTime;
    uniform float uHoverStrength;
    uniform float uTime;
    uniform float uPixelRatio;

    varying vec3 vInkColor;
    varying float vInkAlpha;

    float easeOutQuart(float value) {
      return 1.0 - pow(1.0 - value, 4.0);
    }

    void main() {
      float assembled = easeOutQuart(clamp(uProgress, 0.0, 1.0));
      float settled = smoothstep(0.72, 1.0, assembled);
      vec3 transformed = mix(position, aTarget, assembled);

      float breezeX = sin(uTime * 0.00028 + aPhase * 6.28318);
      float breezeY = cos(uTime * 0.00022 + aPhase * 4.71239);
      transformed.x += breezeX * 0.00145 * settled * aInkAlpha;
      transformed.y += breezeY * 0.00105 * settled * aInkAlpha;

      float flowCycle = fract(uTime * (0.0001 + aPhase * 0.00007) + aPhase);
      float flowActive = aFlowStrength * settled * (1.0 - uDissolve);
      float flowDrop = flowCycle * flowCycle * (0.065 + aPhase * 0.14);
      transformed.x += sin(flowCycle * 6.28318 + aPhase * 12.0) * 0.008 * flowActive;
      transformed.y -= flowDrop * flowActive;

      float dissolveStart = aPhase * 0.62;
      float dissolve = smoothstep(dissolveStart, min(1.0, dissolveStart + 0.34), uDissolve);
      transformed.x += sin(aPhase * 41.7) * dissolve * (0.018 + aPhase * 0.085);
      transformed.y -= dissolve * (0.075 + fract(aPhase * 11.73) * 0.31);

      vec2 wind = normalize(uWindDirection);
      vec2 crossWind = vec2(-wind.y, wind.x);
      vec2 headDelta = aTarget.xy - uPointer;
      vec2 trailDelta = aTarget.xy - uPointerTrail;
      vec2 tailDelta = aTarget.xy - uPointerTail;
      float legacyHeadDistance = length(vec2(dot(headDelta, wind) * 0.64, dot(headDelta, crossWind) * 1.48));
      float legacyTrailDistance = length(vec2(dot(trailDelta, wind) * 0.72, dot(trailDelta, crossWind) * 1.38));
      float legacyTailDistance = length(vec2(dot(tailDelta, wind) * 0.82, dot(tailDelta, crossWind) * 1.3));
      float legacyHeadGust = 1.0 - smoothstep(0.035, 0.18, legacyHeadDistance);
      float legacyTrailGust = (1.0 - smoothstep(0.035, 0.165, legacyTrailDistance)) * 0.72;
      float legacyTailGust = (1.0 - smoothstep(0.03, 0.15, legacyTailDistance)) * 0.46;
      float legacyHoverScatter = max(legacyHeadGust, max(legacyTrailGust, legacyTailGust));
      float hoverGrain = 0.34 + fract(aPhase * 17.37) * 0.96;
      float gustPulse = 0.84 + sin(uHoverTime * 0.006 + aPhase * 19.0) * 0.16;
      float legacyWindTravel = legacyHoverScatter * gustPulse * (0.11 + hoverGrain * 0.23);
      float legacyTurbulence = sin(uHoverTime * 0.009 + aPhase * 31.0) * legacyHoverScatter * (0.012 + hoverGrain * 0.026);
      vec2 legacyWindDisplacement = wind * legacyWindTravel + crossWind * legacyTurbulence;

      vec2 circularDelta = vec2(headDelta.x, headDelta.y * uInteractionAspect);
      float waterDistance = length(circularDelta);
      float waterScatter = 1.0 - smoothstep(0.035, 0.155, waterDistance);
      vec2 radialDirection = waterDistance > 0.001
        ? normalize(vec2(circularDelta.x, circularDelta.y / max(0.001, uInteractionAspect)))
        : vec2(sin(aPhase * 31.0), cos(aPhase * 29.0));
      vec2 swirlDirection = vec2(-radialDirection.y, radialDirection.x);
      float ripple = 0.78 + sin(uHoverTime * 0.012 - waterDistance * 58.0 + aPhase * 17.0) * 0.22;
      float waterTravel = waterScatter * ripple * (0.065 + hoverGrain * 0.14);
      float waterSwirl = sin(uHoverTime * 0.01 + aPhase * 37.0) * waterScatter * (0.018 + hoverGrain * 0.035);
      vec2 waterDisplacement = radialDirection * waterTravel
        + swirlDirection * waterSwirl
        + wind * waterScatter * (0.018 + hoverGrain * 0.04);

      float interactionMode = step(0.5, uInteractionMode);
      vec2 hoverDisplacement = mix(legacyWindDisplacement, waterDisplacement, interactionMode);
      float activeHoverStrength = max(uHoverStrength * (1.0 - uDissolve), uRevealHoverStrength);
      transformed.xy += hoverDisplacement * activeHoverStrength;

      vInkColor = aInkColor;
      float flowFade = 1.0 - smoothstep(0.48, 1.0, flowCycle);
      float flowingAlpha = mix(1.0, flowFade, min(1.0, flowActive * 0.9));
      vInkAlpha = aInkAlpha * mix(0.2, 1.0, assembled) * flowingAlpha * (1.0 - dissolve);

      gl_PointSize = max(1.0, aSize * uPixelRatio * mix(0.76, 1.0, assembled) * (1.0 - dissolve * 0.42));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;

    varying vec3 vInkColor;
    varying float vInkAlpha;

    void main() {
      float distanceToCenter = length(gl_PointCoord - vec2(0.5));
      float softDisc = 1.0 - smoothstep(0.22, 0.5, distanceToCenter);
      float grain = 0.92 + 0.08 * sin((gl_PointCoord.x + gl_PointCoord.y) * 24.0);
      float alpha = vInkAlpha * softDisc * grain;
      if (alpha < 0.015) discard;
      gl_FragColor = vec4(vInkColor, alpha);
    }
  `;

  function createRandom(seedValue = 20260921) {
    let seed = seedValue >>> 0;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function getQualitySettings() {
    if (mobileQuery.matches) {
      return { particleBudget: 4200, sampleHeight: 300, pixelRatio: Math.min(1.12, window.devicePixelRatio || 1) };
    }
    if (compactQuery.matches) {
      return { particleBudget: 9000, sampleHeight: 370, pixelRatio: Math.min(1.3, window.devicePixelRatio || 1) };
    }
    return { particleBudget: 18000, sampleHeight: 460, pixelRatio: Math.min(1.5, window.devicePixelRatio || 1) };
  }

  function getFlowStrength(x, y) {
    let strength = 0;
    flowZones.forEach((zone) => {
      const deltaX = (x - zone.x) / zone.radiusX;
      const deltaY = (y - zone.y) / zone.radiusY;
      const distance = Math.hypot(deltaX, deltaY);
      strength = Math.max(strength, Math.max(0, 1 - distance));
    });
    return strength;
  }

  function readPortraitSamples(settings) {
    const source = window.HERO_PARTICLE_DATA;
    if (!source || source.version !== 1 || !source.bytes || source.stride !== 8) {
      throw new Error("Prebuilt portrait particle data unavailable");
    }

    const decoded = window.atob(source.bytes);
    const count = Math.min(settings.particleBudget, source.count, Math.floor(decoded.length / source.stride));
    if (count < 800) {
      throw new Error("Prebuilt portrait particle data is incomplete");
    }

    const samples = new Array(count);
    for (let index = 0; index < count; index += 1) {
      const byteIndex = index * source.stride;
      const x = decoded.charCodeAt(byteIndex) | (decoded.charCodeAt(byteIndex + 1) << 8);
      const y = decoded.charCodeAt(byteIndex + 2) | (decoded.charCodeAt(byteIndex + 3) << 8);
      samples[index] = {
        // Core Graphics stores the sampled rows bottom-up. Flip that vertical
        // axis while preserving the source portrait's original left/right gaze.
        x: x / 65535 - 0.5,
        y: y / 65535 - 0.5,
        red: decoded.charCodeAt(byteIndex + 4) / 255,
        green: decoded.charCodeAt(byteIndex + 5) / 255,
        blue: decoded.charCodeAt(byteIndex + 6) / 255,
        alpha: decoded.charCodeAt(byteIndex + 7) / 255,
      };
    }
    return samples;
  }

  function buildGeometry(samples) {
    const count = samples.length;
    const starts = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const flowStrengths = new Float32Array(count);
    const random = createRandom(402026);
    let flowingCount = 0;

    samples.forEach((sample, index) => {
      const vectorIndex = index * 3;
      const angle = random() * Math.PI * 2;
      const spread = 0.09 + Math.pow(random(), 0.56) * 0.62;
      const directionalLift = (1 - sample.alpha) * 0.08;

      targets[vectorIndex] = sample.x;
      targets[vectorIndex + 1] = sample.y;
      targets[vectorIndex + 2] = (random() - 0.5) * 0.035;

      starts[vectorIndex] = sample.x + Math.cos(angle) * spread + (random() - 0.5) * 0.07;
      starts[vectorIndex + 1] = sample.y + Math.sin(angle) * spread + directionalLift;
      starts[vectorIndex + 2] = (random() - 0.5) * 0.12;

      colors[vectorIndex] = sample.red;
      colors[vectorIndex + 1] = sample.green;
      colors[vectorIndex + 2] = sample.blue;
      alphas[index] = Math.max(0.34, Math.pow(sample.alpha, 0.7));
      sizes[index] = 1.12 + Math.pow(random(), 1.55) * (mobileQuery.matches ? 2.2 : 2.7);
      phases[index] = random();
      const localFlow = getFlowStrength(sample.x, sample.y);
      const flowProbability = mobileQuery.matches ? 0.44 : 0.58;
      flowStrengths[index] = localFlow > 0.12 && random() < localFlow * flowProbability
        ? Math.min(1, 0.38 + localFlow * 0.72)
        : 0;
      if (flowStrengths[index] > 0) {
        flowingCount += 1;
      }
    });

    totalFlowParticles = flowingCount;

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(starts, 3));
    nextGeometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
    nextGeometry.setAttribute("aInkColor", new THREE.BufferAttribute(colors, 3));
    nextGeometry.setAttribute("aInkAlpha", new THREE.BufferAttribute(alphas, 1));
    nextGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    nextGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    nextGeometry.setAttribute("aFlowStrength", new THREE.BufferAttribute(flowStrengths, 1));
    nextGeometry.setDrawRange(0, count);
    return nextGeometry;
  }

  function resizeRenderer() {
    if (!renderer || !camera || !particles || isDisposed) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const portraitRect = portrait.getBoundingClientRect();
    const containerWidth = Math.max(1, Math.round(containerRect.width));
    const containerHeight = Math.max(1, Math.round(containerRect.height));
    const overflowX = pointerRevealQuery.matches ? Math.min(220, Math.round(containerWidth * 0.28)) : 0;
    const overflowY = pointerRevealQuery.matches ? Math.min(90, Math.round(containerHeight * 0.1)) : 0;
    const width = containerWidth + overflowX * 2;
    const height = containerHeight + overflowY * 2;
    const sourceAspect = portrait.naturalWidth / portrait.naturalHeight;
    const contentWidth = Math.min(portraitRect.width, portraitRect.height * sourceAspect);
    const contentHeight = contentWidth / sourceAspect;
    const contentLeft = portraitRect.left + (portraitRect.width - contentWidth) / 2;
    const contentTop = portraitRect.top;

    renderer.setPixelRatio(currentPixelRatio);
    renderer.setSize(width, height, false);
    canvas.style.left = `${-overflowX}px`;
    canvas.style.top = `${-overflowY}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();

    particles.scale.set(Math.max(1, contentWidth), Math.max(1, contentHeight), 1);
    material.uniforms.uInteractionAspect.value = contentHeight / Math.max(1, contentWidth);
    particles.position.set(
      contentLeft - containerRect.left + overflowX + contentWidth / 2 - width / 2,
      height / 2 - overflowY - (contentTop - containerRect.top + contentHeight / 2),
      0,
    );
  }

  function stopLoop() {
    if (!renderer || !loopRunning) {
      return;
    }
    renderer.setAnimationLoop(null);
    loopRunning = false;
    lastTimestamp = 0;
  }

  function applyRevealProgress(progress) {
    if (!material || isDisposed) {
      return;
    }

    const safeProgress = Math.min(1, Math.max(0, progress));
    material.uniforms.uDissolve.value = safeProgress;
    container.style.setProperty("--hero-image-reveal", safeProgress.toFixed(4));
    container.dataset.particleDissolve = safeProgress.toFixed(3);
  }

  function updateScrollProgress() {
    scrollFrame = 0;
    if (!phoneQuery.matches) {
      applyRevealProgress(revealProgress);
      return;
    }

    const sceneTop = sceneElement.offsetTop;
    const sceneHeight = Math.max(1, sceneElement.offsetHeight || window.innerHeight);
    const rawProgress = Math.min(1, Math.max(0, (window.scrollY - sceneTop) / (sceneHeight * 0.82)));
    const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

    applyRevealProgress(easedProgress);
  }

  function requestScrollUpdate() {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(updateScrollProgress);
    }
  }

  function resetPointerReveal(immediate = false) {
    targetHoverStrength = 0;
    lastPointerSample = null;
    if (!immediate) {
      return;
    }

    hoverStrength = 0;
    revealHoverStrength = 0;
    container.style.setProperty("--hero-hover-strength", "0");
    if (material) {
      material.uniforms.uHoverStrength.value = 0;
      material.uniforms.uRevealHoverStrength.value = 0;
    }
    container.classList.remove("is-pointer-active");
  }

  function updatePointerReveal(event) {
    if (!pointerRevealQuery.matches || revealFrame || revealProgress > 0) {
      resetPointerReveal();
      return;
    }

    const portraitRect = portrait.getBoundingClientRect();
    const pointerX = (event.clientX - portraitRect.left) / Math.max(1, portraitRect.width);
    const pointerY = (event.clientY - portraitRect.top) / Math.max(1, portraitRect.height);
    const insidePortrait = pointerX >= 0 && pointerX <= 1 && pointerY >= 0 && pointerY <= 1;

    if (!insidePortrait) {
      resetPointerReveal();
      return;
    }

    const nextPointerX = pointerX - 0.5;
    const nextPointerY = 0.5 - pointerY;
    const now = event.timeStamp || performance.now();

    if (!lastPointerSample || targetHoverStrength === 0) {
      pointerTarget.set(nextPointerX, nextPointerY);
      pointerHead.copy(pointerTarget);
      pointerTrail.copy(pointerTarget);
      pointerTail.copy(pointerTarget);
    } else {
      const deltaX = nextPointerX - lastPointerSample.x;
      const deltaY = nextPointerY - lastPointerSample.y;
      const distance = Math.hypot(deltaX, deltaY);
      const elapsed = Math.max(8, now - lastPointerSample.time);
      if (distance > 0.002 && elapsed < 180) {
        targetWindDirection.set(deltaX, deltaY).normalize();
      }
      pointerTarget.set(nextPointerX, nextPointerY);
    }

    lastPointerSample = { x: nextPointerX, y: nextPointerY, time: now };
    container.style.setProperty("--hero-hover-x", `${(pointerX * 100).toFixed(2)}%`);
    container.style.setProperty("--hero-hover-y", `${(pointerY * 100).toFixed(2)}%`);
    container.style.setProperty("--hero-wake-x", `${Math.min(100, Math.max(0, pointerX * 100 - targetWindDirection.x * 9)).toFixed(2)}%`);
    container.style.setProperty("--hero-wake-y", `${Math.min(100, Math.max(0, pointerY * 100 + targetWindDirection.y * 9)).toFixed(2)}%`);
    container.style.setProperty("--hero-wake-tail-x", `${Math.min(100, Math.max(0, pointerX * 100 - targetWindDirection.x * 17)).toFixed(2)}%`);
    container.style.setProperty("--hero-wake-tail-y", `${Math.min(100, Math.max(0, pointerY * 100 + targetWindDirection.y * 17)).toFixed(2)}%`);
    targetHoverStrength = 1;
    container.classList.add("is-pointer-active");
  }

  function syncPointerRevealMode() {
    if (!pointerRevealQuery.matches) {
      resetPointerReveal(true);
    }
  }

  function leavePointerReveal() {
    resetPointerReveal();
  }

  function updateClickReveal(timestamp) {
    revealFrame = 0;
    if (!revealStartTime) {
      revealStartTime = timestamp;
    }

    const elapsed = Math.min(1, (timestamp - revealStartTime) / 1700);
    revealProgress = elapsed * elapsed * (3 - 2 * elapsed);
    applyRevealProgress(revealProgress);

    if (elapsed < 1) {
      revealFrame = window.requestAnimationFrame(updateClickReveal);
      return;
    }

    revealProgress = 1;
    container.classList.remove("is-revealing");
    container.classList.add("is-revealed");
    revealTrigger.disabled = true;
  }

  function revealPortrait() {
    if (phoneQuery.matches || revealFrame || revealProgress >= 1) {
      return;
    }

    revealStartTime = 0;
    revealHoverStrength = hoverStrength;
    material.uniforms.uRevealHoverStrength.value = revealHoverStrength;
    container.dataset.particleRevealHover = revealHoverStrength.toFixed(3);
    targetHoverStrength = 0;
    lastPointerSample = null;
    container.classList.remove("is-pointer-active");
    container.classList.add("is-revealing");
    revealFrame = window.requestAnimationFrame(updateClickReveal);
  }

  function syncRevealMode() {
    if (revealFrame) {
      window.cancelAnimationFrame(revealFrame);
      revealFrame = 0;
    }

    resetPointerReveal(true);
    revealStartTime = 0;
    revealProgress = 0;
    container.classList.remove("has-click-reveal", "is-revealing", "is-revealed");
    container.setAttribute("aria-hidden", phoneQuery.matches ? "true" : "false");
    revealTrigger.disabled = false;

    if (phoneQuery.matches) {
      updateScrollProgress();
      return;
    }

    container.classList.add("has-click-reveal");
    applyRevealProgress(0);
  }

  function disposeToStatic(reason, detail = "") {
    if (isDisposed) {
      return;
    }
    isDisposed = true;
    stopLoop();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    }
    if (revealFrame) {
      window.cancelAnimationFrame(revealFrame);
      revealFrame = 0;
    }
    window.removeEventListener("scroll", requestScrollUpdate);
    revealTrigger.removeEventListener("click", revealPortrait);
    revealTrigger.removeEventListener("pointermove", updatePointerReveal);
    revealTrigger.removeEventListener("pointerleave", leavePointerReveal);
    phoneQuery.removeEventListener("change", syncRevealMode);
    pointerRevealQuery.removeEventListener("change", syncPointerRevealMode);
    geometry?.dispose();
    material?.dispose();
    renderer?.dispose();
    useStaticPortrait(reason, detail);
  }

  function monitorPerformance(timestamp, progress) {
    if (!mobileQuery.matches || monitorComplete || progress < 1) {
      return;
    }

    if (!monitorStart) {
      monitorStart = timestamp;
      monitorFrames = 0;
      return;
    }

    monitorFrames += 1;
    const elapsed = timestamp - monitorStart;
    if (elapsed < 1600) {
      return;
    }

    const framesPerSecond = monitorFrames * 1000 / elapsed;
    if (framesPerSecond < 22 && !qualityReduced) {
      qualityReduced = true;
      currentPixelRatio = 1;
      geometry.setDrawRange(0, Math.max(1600, Math.floor(totalParticles * 0.62)));
      container.dataset.particleQuality = "reduced";
      monitorStart = 0;
      monitorFrames = 0;
      resizeRenderer();
      return;
    }

    if (framesPerSecond < 16 && qualityReduced) {
      disposeToStatic("low-frame-rate");
      return;
    }

    monitorComplete = true;
    container.dataset.particleFps = Math.round(framesPerSecond).toString();
  }

  function render(timestamp) {
    if (!renderer || !material || isDisposed || !isVisible || document.hidden) {
      return;
    }

    const frameTime = lastTimestamp ? Math.min(50, Math.max(0, timestamp - lastTimestamp)) : 16.67;
    lastTimestamp = timestamp;
    activeTime += frameTime;
    const progress = Math.min(1, Math.max(0, (activeTime - 120) / 1850));
    const hoverEase = 1 - Math.exp(-frameTime / (targetHoverStrength > 0 ? 70 : 230));
    hoverStrength += (targetHoverStrength - hoverStrength) * hoverEase;
    const headEase = 1 - Math.exp(-frameTime / 34);
    const trailEase = 1 - Math.exp(-frameTime / 105);
    const tailEase = 1 - Math.exp(-frameTime / 190);
    const windEase = 1 - Math.exp(-frameTime / 130);
    pointerHead.lerp(pointerTarget, headEase);
    pointerTrail.lerp(pointerHead, trailEase);
    pointerTail.lerp(pointerTrail, tailEase);
    windDirection.lerp(targetWindDirection, windEase).normalize();

    if (targetHoverStrength === 0 && hoverStrength < 0.012) {
      hoverStrength = 0;
      container.classList.remove("is-pointer-active");
    }

    material.uniforms.uProgress.value = progress;
    material.uniforms.uPointer.value.copy(pointerHead);
    material.uniforms.uPointerTrail.value.copy(pointerTrail);
    material.uniforms.uPointerTail.value.copy(pointerTail);
    material.uniforms.uWindDirection.value.copy(windDirection);
    material.uniforms.uHoverStrength.value = hoverStrength;
    material.uniforms.uTime.value = activeTime;
    if (!revealFrame && revealProgress <= 0) {
      material.uniforms.uHoverTime.value = activeTime;
    }
    container.style.setProperty("--hero-hover-strength", hoverStrength.toFixed(3));
    renderer.render(scene, camera);
    monitorPerformance(timestamp, progress);
  }

  function startLoop() {
    if (!renderer || loopRunning || isDisposed || !isVisible || document.hidden) {
      return;
    }
    loopRunning = true;
    renderer.setAnimationLoop(render);
  }

  function updateLoopState() {
    if (isVisible && !document.hidden) {
      startLoop();
    } else {
      stopLoop();
    }
  }

  async function initialize() {
    try {
      if (!portrait.complete || !portrait.naturalWidth) {
        await new Promise((resolve, reject) => {
          portrait.addEventListener("load", resolve, { once: true });
          portrait.addEventListener("error", reject, { once: true });
        });
      }

      if (typeof portrait.decode === "function") {
        await portrait.decode().catch(() => undefined);
      }

      const settings = getQualitySettings();
      currentPixelRatio = settings.pixelRatio;
      const samples = readPortraitSamples(settings);
      geometry = buildGeometry(samples);
      totalParticles = samples.length;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
        premultipliedAlpha: true,
      });
      renderer.setClearColor(0xffffff, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
      camera.position.z = 2;

      material = new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uDissolve: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uPointerTrail: { value: new THREE.Vector2(0, 0) },
          uPointerTail: { value: new THREE.Vector2(0, 0) },
          uWindDirection: { value: windDirection.clone() },
          uInteractionAspect: { value: 1 },
          uInteractionMode: { value: pointerInteractionMode === "water" ? 1 : 0 },
          uRevealHoverStrength: { value: 0 },
          uHoverTime: { value: 0 },
          uHoverStrength: { value: 0 },
          uTime: { value: 0 },
          uPixelRatio: { value: currentPixelRatio },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      particles = new THREE.Points(geometry, material);
      particles.frustumCulled = false;
      scene.add(particles);
      resizeRenderer();
      renderer.render(scene, camera);

      container.dataset.particleCount = totalParticles.toString();
      container.dataset.particleQuality = mobileQuery.matches ? "mobile" : compactQuery.matches ? "compact" : "desktop";
      container.dataset.particleState = "ready";
      container.dataset.particleFlowCount = totalFlowParticles.toString();
      container.dataset.hoverFlow = pointerInteractionMode;
      showDebugStatus(`${totalParticles} points · ${totalFlowParticles} flowing · ${container.dataset.particleQuality}`);
      container.classList.remove("is-particle-fallback");
      container.classList.add("is-particle-ready");
      syncRevealMode();
      window.requestAnimationFrame(() => container.classList.remove("is-particle-pending"));

      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        disposeToStatic("webgl-context-lost");
      }, { once: true });

      visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        updateLoopState();
      }, { threshold: 0.04 });
      visibilityObserver.observe(sceneElement);

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resizeRenderer);
        resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", resizeRenderer, { passive: true });
      }

      document.addEventListener("visibilitychange", updateLoopState);
      window.addEventListener("scroll", requestScrollUpdate, { passive: true });
      revealTrigger.addEventListener("click", revealPortrait);
      revealTrigger.addEventListener("pointermove", updatePointerReveal, { passive: true });
      revealTrigger.addEventListener("pointerleave", leavePointerReveal);
      phoneQuery.addEventListener("change", syncRevealMode);
      pointerRevealQuery.addEventListener("change", syncPointerRevealMode);
    } catch (error) {
      console.warn("Hero particles fell back to the static portrait:", error);
      disposeToStatic("initialization-failed", error instanceof Error ? error.message : String(error));
    }
  }

  initialize();
})();
