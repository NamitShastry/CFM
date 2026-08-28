/*
 * CreateForMe — CFM3D interactive studio system
 * Vanilla Three.js + DOM/CSS interaction layer shared across every page.
 * No build step: loaded as a native ES module, Three.js pulled from a
 * pinned CDN URL. Designed to be entirely additive — it never touches
 * existing markup classes it doesn't already recognise, degrades to a
 * no-op on WebGL failure, and respects prefers-reduced-motion throughout.
 */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches;
const SMALL_VIEWPORT = window.innerWidth < 720;

const THEME_PALETTES = {
  violet: { a: 0x8b5cf6, b: 0x60a5fa, c: 0xf9a8d4 },
  ocean: { a: 0x60a5fa, b: 0x34d399, c: 0xf472b6 },
  sunrise: { a: 0xf59e0b, b: 0xf472b6, c: 0x818cf8 },
  slate: { a: 0x94a3b8, b: 0x60a5fa, c: 0xc4b5fd },
};

function pickTheme() {
  const explicit = document.body.getAttribute("data-cfm-theme");
  if (explicit && THEME_PALETTES[explicit]) return THEME_PALETTES[explicit];
  const path = location.pathname;
  if (path.includes("pricing")) return THEME_PALETTES.sunrise;
  if (path.includes("portfolio")) return THEME_PALETTES.ocean;
  if (path.includes("services")) return THEME_PALETTES.slate;
  return THEME_PALETTES.violet;
}

/* ------------------------------------------------------------------ */
/* Loader                                                              */
/* ------------------------------------------------------------------ */
function initLoader() {
  const loader = document.getElementById("cfm-loader");
  if (!loader) return;
  const finish = () => {
    loader.classList.add("cfm-loader--done");
    window.setTimeout(() => loader.remove(), 500);
  };
  if (document.readyState === "complete") {
    window.setTimeout(finish, REDUCED_MOTION ? 0 : 350);
  } else {
    window.addEventListener("load", () => window.setTimeout(finish, REDUCED_MOTION ? 0 : 350), { once: true });
  }
  // Never let a slow asset hold the loader hostage.
  window.setTimeout(finish, 2200);
}

/* ------------------------------------------------------------------ */
/* Ambient WebGL background field                                     */
/* ------------------------------------------------------------------ */
async function initAmbientField() {
  const canvas = document.getElementById("cfm-bg-canvas");
  if (!canvas) return;
  if (!window.WebGLRenderingContext) return;

  let THREE;
  try {
    THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  } catch (err) {
    console.warn("[CreateForMe] 3D background unavailable, falling back to static gradient.", err);
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (err) {
    console.warn("[CreateForMe] WebGL renderer failed to initialize.", err);
    return;
  }

  const theme = pickTheme();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  const dpr = Math.min(window.devicePixelRatio || 1, SMALL_VIEWPORT ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  /* --- particle constellation --- */
  const count = SMALL_VIEWPORT ? 220 : 520;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c1 = new THREE.Color(theme.a);
  const c2 = new THREE.Color(theme.b);
  const c3 = new THREE.Color(theme.c);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 26;
    positions[i3 + 1] = (Math.random() - 0.5) * 16;
    positions[i3 + 2] = (Math.random() - 0.5) * 18;
    const mix = Math.random();
    const col = mix < 0.34 ? c1 : mix < 0.67 ? c2 : c3;
    colors[i3] = col.r;
    colors[i3 + 1] = col.g;
    colors[i3 + 2] = col.b;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particleMat = new THREE.PointsMaterial({
    size: SMALL_VIEWPORT ? 0.09 : 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* --- floating creative "building block" wireframes --- */
  const blockGroup = new THREE.Group();
  const geometries = [
    new THREE.IcosahedronGeometry(2.1, 0),
    new THREE.TorusGeometry(1.5, 0.42, 8, 24),
    new THREE.OctahedronGeometry(1.7, 0),
  ];
  const blockColors = [theme.a, theme.b, theme.c];
  const positionsPreset = [
    [-6.2, 2.4, -4],
    [6.4, -2.2, -6],
    [-4.4, -3.4, -3],
  ];
  const blocks = geometries.map((geo, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: blockColors[i], wireframe: true, transparent: true, opacity: 0.22 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...positionsPreset[i]);
    mesh.userData.spin = 0.05 + i * 0.02;
    mesh.userData.tilt = 0.03 + i * 0.015;
    blockGroup.add(mesh);
    return mesh;
  });
  scene.add(blockGroup);

  let width = window.innerWidth;
  let height = window.innerHeight;
  const pointer = { x: 0, y: 0 };
  let scrollFraction = 0;
  let visible = !document.hidden;
  let raf = 0;

  function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener("resize", onResize, { passive: true });

  if (!COARSE_POINTER) {
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.x = (e.clientX / width) * 2 - 1;
        pointer.y = (e.clientY / height) * 2 - 1;
      },
      { passive: true }
    );
  }

  function onScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollFraction = Math.min(1, window.scrollY / max);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && !REDUCED_MOTION) tick();
  });

  const clock = new THREE.Clock();

  function renderStatic() {
    camera.position.x = 0;
    camera.position.y = 0;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function tick() {
    if (!visible) return;
    const t = clock.getElapsedTime();

    camera.position.x += ((pointer.x || 0) * 1.4 - camera.position.x) * 0.04;
    camera.position.y += ((-pointer.y || 0) * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    particles.rotation.y = t * 0.015 + scrollFraction * 0.6;
    particles.rotation.x = scrollFraction * 0.2;

    blockGroup.rotation.y = scrollFraction * 0.9;
    blocks.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.tilt * 0.01;
      mesh.rotation.y += mesh.userData.spin * 0.01;
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  if (REDUCED_MOTION) {
    renderStatic();
  } else {
    tick();
  }

  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(raf);
      particleGeo.dispose();
      particleMat.dispose();
      geometries.forEach((g) => g.dispose());
      blocks.forEach((m) => m.material.dispose());
      renderer.dispose();
    },
    { once: true }
  );
}

/* ------------------------------------------------------------------ */
/* Pointer-reactive card depth (no HTML edits required)                */
/* ------------------------------------------------------------------ */
const TILT_SELECTOR = [
  ".grid-box",
  ".text-card",
  ".image-card",
  ".contact-item",
  ".content-card",
  ".intro-card",
  ".intro-box",
  ".approach-card",
  ".fact-item",
  ".process-card",
  ".thumb-box",
  ".service-card",
  ".pricing-block:not(.pricing-image-box)",
].join(", ");

function initTilt() {
  if (COARSE_POINTER || REDUCED_MOTION) return;
  const cards = document.querySelectorAll(TILT_SELECTOR);
  cards.forEach((card) => {
    card.classList.add("cfm-tilt");
    let raf = 0;

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty("--cfm-rx", (-py * 7).toFixed(2) + "deg");
        card.style.setProperty("--cfm-ry", (px * 9).toFixed(2) + "deg");
        card.style.setProperty("--cfm-tz", "14px");
        card.style.setProperty("--cfm-glow-x", `${(px + 0.5) * 100}%`);
        card.style.setProperty("--cfm-glow-y", `${(py + 0.5) * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      card.style.setProperty("--cfm-rx", "0deg");
      card.style.setProperty("--cfm-ry", "0deg");
      card.style.setProperty("--cfm-tz", "0px");
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
  });
}

/* ------------------------------------------------------------------ */
/* Magnetic navigation & CTAs                                          */
/* ------------------------------------------------------------------ */
const MAGNETIC_SELECTOR = [
  ".logo",
  ".dropdown-btn",
  ".nav-links > li > a",
  "a.value",
  ".back-btn",
].join(", ");

function initMagnetic() {
  if (COARSE_POINTER || REDUCED_MOTION) return;
  document.querySelectorAll(MAGNETIC_SELECTOR).forEach((el) => {
    el.classList.add("cfm-magnetic");
    const strength = 0.28;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${(mx * strength).toFixed(1)}px, ${(my * strength).toFixed(1)}px)`;
    };
    const onLeave = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
  });
}

/* ------------------------------------------------------------------ */
/* Cursor glow                                                         */
/* ------------------------------------------------------------------ */
function initCursorGlow() {
  if (COARSE_POINTER || REDUCED_MOTION) return;
  const glow = document.createElement("div");
  glow.className = "cfm-cursor-glow";
  document.body.appendChild(glow);
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let curX = x;
  let curY = y;
  window.addEventListener(
    "pointermove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      glow.style.opacity = "1";
    },
    { passive: true }
  );
  document.addEventListener("pointerleave", () => (glow.style.opacity = "0"));

  function tick() {
    curX += (x - curX) * 0.12;
    curY += (y - curY) * 0.12;
    glow.style.transform = `translate(${curX}px, ${curY}px)`;
    requestAnimationFrame(tick);
  }
  tick();
}

/* ------------------------------------------------------------------ */
/* Scroll-driven parallax variable                                     */
/* ------------------------------------------------------------------ */
function initScrollParallax() {
  const targets = document.querySelectorAll(".page-title, .fancy-title, .page-header, .page-subtitle");
  targets.forEach((el) => el.classList.add("cfm-parallax"));
  if (REDUCED_MOTION || targets.length === 0) return;
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty("--cfm-scroll", window.scrollY.toFixed(1));
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------------------ */
/* Reveal-on-scroll for elements not already covered by a page's own   */
/* inline reveal script (idempotent: skips anything already .reveal)   */
/* ------------------------------------------------------------------ */
function initReveal() {
  const selector = [
    ".contact-item",
    ".grid-box",
    ".pricing-block",
    ".policy-block",
    ".thumb-box",
    ".coming-soon-container",
  ].join(", ");
  const nodes = Array.from(document.querySelectorAll(selector)).filter((el) => !el.classList.contains("reveal"));
  if (nodes.length === 0) return;
  nodes.forEach((el) => el.classList.add("cfm-reveal"));
  if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
    nodes.forEach((el) => el.classList.add("cfm-reveal--visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => entry.target.classList.add("cfm-reveal--visible"), i * 60);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  nodes.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/* Mini orb — small inline 3D preview mounted into "coming soon" panels */
/* ------------------------------------------------------------------ */
async function initMiniOrbs() {
  const hosts = document.querySelectorAll(".coming-soon-container");
  if (hosts.length === 0 || REDUCED_MOTION) return;
  let THREE;
  try {
    THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  } catch {
    return;
  }
  const theme = pickTheme();

  hosts.forEach((host) => {
    if (host.querySelector(".cfm-orb-canvas")) return;
    const wrap = document.createElement("div");
    wrap.className = "cfm-orb-wrap";
    const canvas = document.createElement("canvas");
    canvas.className = "cfm-orb-canvas";
    wrap.appendChild(canvas);
    host.insertBefore(wrap, host.firstChild);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      wrap.remove();
      return;
    }
    const size = 132;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.set(0, 0, 5);

    const geo = new THREE.IcosahedronGeometry(1.4, 1);
    const mat = new THREE.MeshBasicMaterial({ color: theme.a, wireframe: true, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const glowGeo = new THREE.IcosahedronGeometry(1.55, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: theme.c, wireframe: true, transparent: true, opacity: 0.25 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    let raf = 0;
    function tick() {
      mesh.rotation.x += 0.006;
      mesh.rotation.y += 0.009;
      glow.rotation.y -= 0.004;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) cancelAnimationFrame(raf);
        else if (!raf) tick();
      });
    });
    io.observe(host);
  });
}

/* ------------------------------------------------------------------ */
/* Same-origin page transition                                         */
/* ------------------------------------------------------------------ */
function initPageTransitions() {
  document.documentElement.classList.add("cfm-enter");
  requestAnimationFrame(() => document.documentElement.classList.add("cfm-enter--active"));

  if (REDUCED_MOTION) return;

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    let url;
    try {
      url = new URL(href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.href === location.href) return;

    e.preventDefault();
    document.documentElement.classList.add("cfm-leaving");
    window.setTimeout(() => {
      window.location.href = url.href;
    }, 190);
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */
function boot() {
  initLoader();
  initPageTransitions();
  initScrollParallax();
  initReveal();
  initTilt();
  initMagnetic();
  initCursorGlow();
  initAmbientField();
  initMiniOrbs();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
