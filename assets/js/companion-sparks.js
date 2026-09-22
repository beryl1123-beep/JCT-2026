(() => {
  "use strict";

  const scene = document.getElementById("s4");
  const figure = document.querySelector(".companion-art");
  const image = document.getElementById("companion-image");
  const canvas = document.getElementById("companion-sparks");

  if (!scene || !figure || !image || !canvas) {
    return;
  }

  const context = canvas.getContext("2d", { alpha: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!context || reducedMotion) {
    return;
  }

  const compactQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
  const compactMode = compactQuery.matches;

  // The butterfly cursor sheds one point every 34 ms. Multiplying that rate
  // by 1.15 keeps this field approximately 15% denser without DOM churn.
  const CURSOR_TRAIL_INTERVAL = 34;
  const DENSITY_MULTIPLIER = 1.15;
  const EMISSION_RATE = DENSITY_MULTIPLIER * (1000 / CURSOR_TRAIL_INTERVAL);
  const MAX_PARTICLES = compactMode ? 54 : 76;
  const FRAME_INTERVAL = 1000 / (compactMode ? 30 : 45);
  const colorSamples = [];
  const particles = [];

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let previousTime = 0;
  let lastPaintTime = 0;
  let emissionBudget = 0;
  let figureVisible = false;
  let samplesReady = false;
  let imageOffsetX = 0;
  let imageOffsetY = 0;
  let imageWidth = 0;
  let imageHeight = 0;

  function createGlowSprite() {
    const sprite = document.createElement("canvas");
    const size = 48;
    sprite.width = size;
    sprite.height = size;
    const spriteContext = sprite.getContext("2d");
    const glow = spriteContext.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    glow.addColorStop(0, "rgba(255, 249, 202, 1)");
    glow.addColorStop(0.2, "rgba(255, 215, 91, 0.96)");
    glow.addColorStop(0.52, "rgba(244, 183, 46, 0.34)");
    glow.addColorStop(1, "rgba(231, 159, 26, 0)");
    spriteContext.fillStyle = glow;
    spriteContext.fillRect(0, 0, size, size);
    return sprite;
  }

  const glowSprite = createGlowSprite();

  function readPrebuiltSamples() {
    const source = window.COMPANION_SPARK_DATA;
    if (!source || source.version !== 1 || source.stride !== 7 || !source.bytes) {
      canvas.dataset.sparkState = "data-unavailable";
      return false;
    }

    try {
      const decoded = window.atob(source.bytes);
      const count = Math.min(source.count, Math.floor(decoded.length / source.stride));
      colorSamples.length = 0;

      for (let index = 0; index < count; index += 1) {
        const byteIndex = index * source.stride;
        const x = decoded.charCodeAt(byteIndex) | (decoded.charCodeAt(byteIndex + 1) << 8);
        const y = decoded.charCodeAt(byteIndex + 2) | (decoded.charCodeAt(byteIndex + 3) << 8);
        colorSamples.push({
          x: x / 65535,
          y: y / 65535,
          red: decoded.charCodeAt(byteIndex + 4),
          green: decoded.charCodeAt(byteIndex + 5),
          blue: decoded.charCodeAt(byteIndex + 6),
        });
      }
    } catch (error) {
      console.warn("Companion spark data could not be decoded:", error);
      canvas.dataset.sparkState = "decode-error";
      return false;
    }

    samplesReady = colorSamples.length > 0;
    canvas.dataset.sparkState = samplesReady ? "ready" : "empty";
    canvas.dataset.sparkSamples = String(colorSamples.length);
    return samplesReady;
  }

  function resizeCanvas() {
    const canvasRect = canvas.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const nextWidth = Math.max(1, canvasRect.width);
    const nextHeight = Math.max(1, canvasRect.height);
    const nextPixelRatio = Math.min(compactMode ? 1 : 1.25, window.devicePixelRatio || 1);
    const bufferWidth = Math.round(nextWidth * nextPixelRatio);
    const bufferHeight = Math.round(nextHeight * nextPixelRatio);
    const sizeChanged = canvas.width !== bufferWidth || canvas.height !== bufferHeight;

    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextPixelRatio;
    if (sizeChanged) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    imageOffsetX = imageRect.left - canvasRect.left;
    imageOffsetY = imageRect.top - canvasRect.top;
    imageWidth = imageRect.width;
    imageHeight = imageRect.height;
    canvas.dataset.sparkQuality = compactMode ? "compact-30fps" : "desktop-45fps";
    return sizeChanged;
  }

  function createParticle(initialAge = 0) {
    if (!colorSamples.length || particles.length >= MAX_PARTICLES) {
      return;
    }

    const sample = colorSamples[Math.floor(Math.random() * colorSamples.length)];
    const lifetime = 1.35 + Math.random() * 1.05;
    particles.push({
      originX: imageOffsetX + sample.x * imageWidth,
      originY: imageOffsetY + sample.y * imageHeight,
      red: Math.max(232, sample.red),
      green: Math.max(156, sample.green),
      blue: Math.max(38, sample.blue),
      age: Math.min(initialAge, lifetime * 0.94),
      lifetime,
      size: 1.15 + Math.random() * 2.45,
      rise: 62 + Math.random() * 116,
      drift: (Math.random() - 0.5) * 28,
      sway: 5 + Math.random() * 17,
      frequency: 0.8 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      forkAt: 0.42 + Math.random() * 0.28,
      fork: (Math.random() - 0.5) * 88,
    });
  }

  function seedParticleField() {
    particles.length = 0;
    const initialCount = Math.min(MAX_PARTICLES, Math.round(EMISSION_RATE * 1.88));
    for (let index = 0; index < initialCount; index += 1) {
      createParticle(Math.random() * 1.88);
    }
    canvas.dataset.sparkParticles = String(initialCount);
  }

  function particlePosition(particle, progress) {
    const forkProgress = Math.max(0, progress - particle.forkAt);
    const flameWaver = Math.sin(particle.phase + progress * particle.frequency * Math.PI * 2);
    const emberJitter = Math.sin(particle.phase * 1.7 + progress * Math.PI * 7.5) * 2.4 * progress;
    return {
      x: particle.originX
        + particle.drift * progress
        + flameWaver * particle.sway * (0.18 + progress)
        + particle.fork * forkProgress * forkProgress
        + emberJitter,
      y: particle.originY - particle.rise * (progress + 0.24 * progress * progress),
    };
  }

  function drawParticle(particle) {
    const progress = particle.age / particle.lifetime;
    const position = particlePosition(particle, progress);
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.46);
    const flicker = 0.8 + Math.sin(particle.phase + progress * Math.PI * 19) * 0.2;
    const alpha = Math.max(0, fadeIn * fadeOut * flicker);
    const radius = particle.size * (1 - progress * 0.46);
    const color = `${particle.red}, ${particle.green}, ${particle.blue}`;

    const glowRadius = 4.8 + radius * 3.8;
    context.globalAlpha = alpha * 0.78;
    context.drawImage(
      glowSprite,
      position.x - glowRadius,
      position.y - glowRadius,
      glowRadius * 2,
      glowRadius * 2,
    );

    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${color})`;
    context.beginPath();
    context.arc(position.x, position.y, Math.max(0.42, radius * 0.58), 0, Math.PI * 2);
    context.fill();
  }

  function render(time) {
    frame = 0;
    if (!shouldAnimate()) {
      return;
    }

    if (lastPaintTime && time - lastPaintTime < FRAME_INTERVAL) {
      frame = window.requestAnimationFrame(render);
      return;
    }

    const deltaSeconds = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
    previousTime = time;
    lastPaintTime = time;
    emissionBudget += deltaSeconds * EMISSION_RATE;

    while (emissionBudget >= 1) {
      createParticle();
      emissionBudget -= 1;
    }

    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += deltaSeconds;
      if (particle.age >= particle.lifetime) {
        particles.splice(index, 1);
      } else {
        drawParticle(particle);
      }
    }

    context.restore();
    frame = window.requestAnimationFrame(render);
  }

  function shouldAnimate() {
    return samplesReady
      && figureVisible
      && scene.classList.contains("is-ending")
      && !document.hidden;
  }

  function syncAnimation() {
    if (shouldAnimate()) {
      if (!frame) {
        previousTime = 0;
        lastPaintTime = 0;
        frame = window.requestAnimationFrame(render);
      }
      return;
    }

    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    previousTime = 0;
    lastPaintTime = 0;
    context.clearRect(0, 0, width, height);
  }

  function initialize() {
    if (!readPrebuiltSamples()) {
      return;
    }
    resizeCanvas();
    seedParticleField();
    syncAnimation();
  }

  const endingObserver = new MutationObserver(syncAnimation);
  endingObserver.observe(scene, { attributes: true, attributeFilter: ["class"] });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    figureVisible = entry.isIntersecting;
    syncAnimation();
  }, { threshold: 0.04 });
  visibilityObserver.observe(figure);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      if (samplesReady && resizeCanvas()) {
        seedParticleField();
      }
      syncAnimation();
    });
    resizeObserver.observe(figure);
  } else {
    window.addEventListener("resize", () => {
      resizeCanvas();
      seedParticleField();
      syncAnimation();
    });
  }

  document.addEventListener("visibilitychange", syncAnimation);

  if (image.complete && image.naturalWidth) {
    initialize();
  } else {
    image.addEventListener("load", initialize, { once: true });
  }
})();
