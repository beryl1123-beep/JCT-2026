(() => {
  "use strict";

  const container = document.getElementById("char-half");
  const canvas = document.getElementById("hero-particles");
  const portrait = document.getElementById("char");
  const sceneElement = document.getElementById("s1");

  if (!container || !canvas || !portrait || !sceneElement) {
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
  const compactQuery = window.matchMedia("(max-width: 960px)");
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
    const width = Math.max(1, Math.round(containerRect.width));
    const height = Math.max(1, Math.round(containerRect.height));
    const sourceAspect = portrait.naturalWidth / portrait.naturalHeight;
    const contentWidth = Math.min(portraitRect.width, portraitRect.height * sourceAspect);
    const contentHeight = contentWidth / sourceAspect;
    const contentLeft = portraitRect.left + (portraitRect.width - contentWidth) / 2;
    const contentTop = portraitRect.top;

    renderer.setPixelRatio(currentPixelRatio);
    renderer.setSize(width, height, false);

    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();

    particles.scale.set(Math.max(1, contentWidth), Math.max(1, contentHeight), 1);
    particles.position.set(
      contentLeft - containerRect.left + contentWidth / 2 - width / 2,
      height / 2 - (contentTop - containerRect.top + contentHeight / 2),
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

  function updateScrollProgress() {
    scrollFrame = 0;
    if (!material || isDisposed) {
      return;
    }

    const sceneTop = sceneElement.offsetTop;
    const sceneHeight = Math.max(1, sceneElement.offsetHeight || window.innerHeight);
    const rawProgress = Math.min(1, Math.max(0, (window.scrollY - sceneTop) / (sceneHeight * 0.82)));
    const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

    material.uniforms.uDissolve.value = easedProgress;
    container.style.setProperty("--hero-image-reveal", easedProgress.toFixed(4));
    container.dataset.particleDissolve = easedProgress.toFixed(3);
  }

  function requestScrollUpdate() {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(updateScrollProgress);
    }
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
    window.removeEventListener("scroll", requestScrollUpdate);
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

    material.uniforms.uProgress.value = progress;
    material.uniforms.uTime.value = activeTime;
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
      showDebugStatus(`${totalParticles} points · ${totalFlowParticles} flowing · ${container.dataset.particleQuality}`);
      container.classList.remove("is-particle-fallback");
      container.classList.add("is-particle-ready");
      updateScrollProgress();
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
    } catch (error) {
      console.warn("Hero particles fell back to the static portrait:", error);
      disposeToStatic("initialization-failed", error instanceof Error ? error.message : String(error));
    }
  }

  initialize();
})();
