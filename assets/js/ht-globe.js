/**
 * Hyperthings CTA — realistic WebGL Earth (Three.js)
 * Elementor-safe: scoped, pauses off-screen, falls back to static image.
 *
 * Markup:
 * <div class="ht-cta__globe"
 *      data-day="…/globe-earth.jpg"
 *      data-night="…/globe-night.jpg"
 *      aria-hidden="true"></div>
 *
 * Scripts (footer): three.min.js → ht-globe.js → ht-home.js
 */
(function () {
  "use strict";

  var BRAND_RED = 0xc3252d;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function resolveUrl(el, attr, fallback) {
    var v = el.getAttribute(attr);
    if (v && v.trim()) return v.trim();
    return fallback;
  }

  function fallbackStatic(mount, dayUrl) {
    mount.classList.add("is-fallback");
    mount.innerHTML = "";
    var img = document.createElement("div");
    img.className = "ht-cta__globe-fallback";
    img.style.backgroundImage = 'url("' + dayUrl + '")';
    mount.appendChild(img);
  }

  function createEarthMaterial(THREE, dayMap, nightMap) {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayMap },
        nightMap: { value: nightMap },
        sunDirection: { value: new THREE.Vector3(0.45, 0.35, 0.82).normalize() },
      },
      vertexShader: [
        "varying vec2 vUv;",
        "varying vec3 vNormalV;",
        "varying vec3 vViewPos;",
        "void main() {",
        "  vUv = uv;",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  vViewPos = mv.xyz;",
        "  vNormalV = normalize(normalMatrix * normal);",
        "  gl_Position = projectionMatrix * mv;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D dayMap;",
        "uniform sampler2D nightMap;",
        "uniform vec3 sunDirection;",
        "varying vec2 vUv;",
        "varying vec3 vNormalV;",
        "varying vec3 vViewPos;",
        "void main() {",
        "  vec3 n = normalize(vNormalV);",
        "  vec3 sun = normalize(sunDirection);",
        "  float ndl = max(dot(n, sun), 0.0);",
        "  float dayFactor = smoothstep(0.0, 0.45, ndl);",
        "  vec3 day = texture2D(dayMap, vUv).rgb;",
        "  day = pow(day, vec3(0.85)) * 1.55;",
        "  vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.2, 1.1, 0.9);",
        "  vec3 color = mix(night * 0.7, day, max(dayFactor, 0.55));",
        "  color *= 0.55 + 0.7 * ndl + 0.25;",
        "  vec3 viewDir = normalize(-vViewPos);",
        "  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.4);",
        "  color += fresnel * vec3(0.45, 0.65, 1.0) * 0.2;",
        "  vec3 halfDir = normalize(sun + viewDir);",
        "  float spec = pow(max(dot(n, halfDir), 0.0), 42.0) * dayFactor;",
        "  color += spec * 0.18;",
        "  gl_FragColor = vec4(color, 1.0);",
        "}",
      ].join("\n"),
    });
  }

  function createAtmosphereMaterial(THREE) {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4f8fff) },
      },
      vertexShader: [
        "varying vec3 vNormal;",
        "varying vec3 vWorldPos;",
        "void main() {",
        "  vec4 wp = modelMatrix * vec4(position, 1.0);",
        "  vWorldPos = wp.xyz;",
        "  vNormal = normalize(mat3(modelMatrix) * normal);",
        "  gl_Position = projectionMatrix * viewMatrix * wp;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 glowColor;",
        "varying vec3 vNormal;",
        "varying vec3 vWorldPos;",
        "void main() {",
        "  vec3 viewDir = normalize(cameraPosition - vWorldPos);",
        "  float fresnel = pow(0.65 - abs(dot(normalize(vNormal), viewDir)), 2.4);",
        "  fresnel = clamp(fresnel, 0.0, 1.0);",
        "  gl_FragColor = vec4(glowColor, fresnel * 0.55);",
        "}",
      ].join("\n"),
    });
  }

  function makeOrbit(THREE, radiusX, radiusY, color, opacity, rotX, rotY, rotZ) {
    var curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0);
    var pts = curve.getPoints(180).map(function (p) {
      return new THREE.Vector3(p.x, p.y, 0);
    });
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
    });
    var line = new THREE.LineLoop(geo, mat);
    line.rotation.set(rotX, rotY, rotZ);
    return line;
  }

  function latLonToVec3(lat, lon, radius) {
    var phi = ((90 - lat) * Math.PI) / 180;
    var theta = ((lon + 180) * Math.PI) / 180;
    return {
      x: -radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  }

  function initGlobe(mount) {
    if (!mount || mount.getAttribute("data-ht-globe-ready") === "1") return;
    if (typeof THREE === "undefined") {
      console.warn("[ht-globe] THREE is missing — enqueue vendor/three.min.js before ht-globe.js");
      return;
    }

    var dayUrl = resolveUrl(mount, "data-day", "assets/images/globe-earth.jpg");
    var nightUrl = resolveUrl(mount, "data-night", "assets/images/globe-night.jpg");
    var cloudsUrl = resolveUrl(mount, "data-clouds", "assets/images/globe-clouds.png");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var renderer;
    var scene;
    var camera;
    var root;
    var earth;
    var clouds;
    var orbits = [];
    var hubs = [];
    var running = false;
    var visible = false;
    var raf = 0;
    var last = 0;
    var failed = false;
    var built = false;
    var dayMap = null;
    var nightMap = null;
    var cloudMap = null;
    var dayDone = false;
    var nightDone = false;
    var cloudsDone = false;

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function fail() {
      if (failed) return;
      failed = true;
      stop();
      fallbackStatic(mount, dayUrl);
    }

    function resize() {
      var w = mount.clientWidth || 420;
      var h = mount.clientHeight || w;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function renderFrame(t) {
      if (earth && !reduceMotion) {
        earth.rotation.y += 0.00105;
        if (clouds) clouds.rotation.y += 0.00135;
        if (orbits[0]) orbits[0].rotation.z += 0.0004;
        if (orbits[1]) orbits[1].rotation.z -= 0.0006;
        if (orbits[2]) orbits[2].rotation.y += 0.00045;
        var pulse = 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.002));
        hubs.forEach(function (h, i) {
          h.material.opacity = pulse + i * 0.03;
          h.scale.setScalar(1 + 0.1 * Math.sin(t * 0.002 + i));
        });
      }
      renderer.render(scene, camera);
    }

    function loop(t) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (t - last < 16) return;
      last = t;
      renderFrame(t);
    }

    function start() {
      if (running || reduceMotion || failed || !built || !visible) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    }

    function build() {
      if (failed || built || !dayMap) return;
      if (!nightMap) nightMap = dayMap;
      built = true;

      dayMap.colorSpace = THREE.SRGBColorSpace;
      nightMap.colorSpace = THREE.SRGBColorSpace;
      dayMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
      nightMap.anisotropy = dayMap.anisotropy;

      earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 96, 96),
        createEarthMaterial(THREE, dayMap, nightMap)
      );
      root.add(earth);

      if (cloudMap) {
        cloudMap.colorSpace = THREE.SRGBColorSpace;
        clouds = new THREE.Mesh(
          new THREE.SphereGeometry(1.018, 64, 64),
          new THREE.MeshBasicMaterial({
            map: cloudMap,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        root.add(clouds);
      }

      root.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.06, 64, 64),
          createAtmosphereMaterial(THREE)
        )
      );

      orbits = [
        makeOrbit(THREE, 1.28, 1.28, 0xd8e6ff, 0.32, 1.15, 0.15, 0.4),
        makeOrbit(THREE, 1.42, 1.18, BRAND_RED, 0.45, 1.35, -0.25, -0.55),
        makeOrbit(THREE, 1.58, 1.35, 0xffffff, 0.18, 0.85, 0.55, 0.2),
      ];
      orbits.forEach(function (o) {
        root.add(o);
      });

      [
        { lat: 20.5, lon: 78.9, color: 0xffffff },
        { lat: 25.2, lon: 55.3, color: BRAND_RED },
        { lat: 1.35, lon: 103.8, color: 0xffffff },
      ].forEach(function (m) {
        var p = latLonToVec3(m.lat, m.lon, 1.012);
        var dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 16, 16),
          new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.95 })
        );
        dot.position.set(p.x, p.y, p.z);
        earth.add(dot);

        var halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 16, 16),
          new THREE.MeshBasicMaterial({
            color: m.color,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
          })
        );
        halo.position.copy(dot.position);
        earth.add(halo);
        hubs.push(halo);
      });

      root.rotation.y = 0.35;
      root.rotation.x = 0.12;
      mount.classList.add("is-live");
      mount.setAttribute("data-ht-globe-ready", "1");
      resize();
      renderFrame(0);
      if (!reduceMotion) start();
    }

    function maybeBuild() {
      if (!dayDone || !nightDone || !cloudsDone) return;
      build();
    }

    try {
      var canvas = document.createElement("canvas");
      canvas.className = "ht-cta__globe-canvas";
      mount.innerHTML = "";
      mount.appendChild(canvas);

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.08, 3.15);

      root = new THREE.Group();
      scene.add(root);

      scene.add(new THREE.AmbientLight(0x9aacc4, 0.85));
      var key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(5, 2.2, 4);
      scene.add(key);
      var fill = new THREE.DirectionalLight(0x7ea8ff, 0.4);
      fill.position.set(-3.5, -0.2, -1.5);
      scene.add(fill);

      var loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");

      loader.load(
        dayUrl,
        function (tex) {
          dayMap = tex;
          dayDone = true;
          maybeBuild();
        },
        undefined,
        fail
      );

      loader.load(
        nightUrl,
        function (tex) {
          nightMap = tex;
          nightDone = true;
          maybeBuild();
        },
        undefined,
        function () {
          nightMap = null;
          nightDone = true;
          maybeBuild();
        }
      );

      loader.load(
        cloudsUrl,
        function (tex) {
          cloudMap = tex;
          cloudsDone = true;
          maybeBuild();
        },
        undefined,
        function () {
          cloudMap = null;
          cloudsDone = true;
          maybeBuild();
        }
      );

      window.addEventListener(
        "resize",
        function () {
          if (!built || failed) return;
          resize();
          if (!running) renderFrame(performance.now());
        },
        { passive: true }
      );

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              visible = entry.isIntersecting;
              if (visible) start();
              else stop();
            });
          },
          { threshold: 0.12 }
        );
        io.observe(mount);
      } else {
        visible = true;
      }

      mount.addEventListener(
        "pointermove",
        function (e) {
          if (reduceMotion || !root || !built) return;
          var rect = mount.getBoundingClientRect();
          var nx = ((e.clientX - rect.left) / rect.width - 0.5) * 0.18;
          var ny = ((e.clientY - rect.top) / rect.height - 0.5) * 0.12;
          root.rotation.x = 0.12 + ny;
          root.rotation.z = nx * 0.35;
        },
        { passive: true }
      );
      mount.addEventListener(
        "pointerleave",
        function () {
          if (!root) return;
          root.rotation.x = 0.12;
          root.rotation.z = 0;
        },
        { passive: true }
      );
    } catch (err) {
      console.warn("[ht-globe]", err);
      fail();
    }
  }

  function boot() {
    document.querySelectorAll(".ht-cta__globe").forEach(initGlobe);
  }

  ready(boot);
  window.HTGlobe = { init: initGlobe, boot: boot };
})();
