/* ===================================================================
   LA RED · neuronal pero legible

   El cruce de las dos cosas que pidio Alfredo:
     · el aspecto de red neuronal de las versiones de Three.js
     · la claridad del esquema tecnico: TODO NODO IMPORTANTE TIENE
       NOMBRE Y CIFRA, hay jerarquia y hay leyenda

   Por que canvas 2D y no WebGL. Las cinco versiones anteriores dibujaban
   puntos con mezcla aditiva, y ademas de no explicar nada, el texto
   salia borroso. Aqui la proyeccion 3D se hace a mano —rotar, proyectar,
   ordenar por profundidad— y se dibuja en 2D, donde el texto sale
   afilado. Se gana legibilidad y se ahorran los 670 KB de Three.js.

   CIFRAS, medidas con psql el 1-oct-2026:
     pi.entidad -> VE 1.209 · CO 604 · SG 22 · CN 15 · US 9 · TR 5 · MX 4 · ES+DE 3
     pi.hecho campo 'ciudad' (solo VE) -> Maturin 17, Ciudad Ojeda 7,
     Cabimas 2, Caracas 1. Son 27 de 1.209: el resto no tiene ciudad
     registrada, y por eso los racimos de ciudad son chicos. Inflarlos
     seria inventarlos.
   =================================================================== */
(() => {
  "use strict";
  const lienzo = document.getElementById("neuronal");
  if (!lienzo) return;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AZUL = "#2F6FDE", TINTA = "#F5F1F1", BLANCO = "#fff";
  const ACERO = "#A79FA0", NIEBLA = "#6E6364";
  const MONO = (p) => `500 ${p}px "IBM Plex Mono", ui-monospace, monospace`;

  const VE_TOTAL = 1209, PADRON = 1863;
  const CIUDADES = [
    { n: "MATURÍN", c: 17 }, { n: "CIUDAD OJEDA", c: 7 },
    { n: "CABIMAS", c: 2 }, { n: "CARACAS", c: 1 },
  ];
  const PAISES = [
    { n: "COLOMBIA", c: 604 }, { n: "SINGAPUR", c: 22 }, { n: "CHINA", c: 15 },
    { n: "EE. UU.", c: 9 }, { n: "TURQUÍA", c: 5 }, { n: "MÉXICO", c: 4 },
    { n: "EUROPA", c: 3 },
  ];

  /* ── el grafo ─────────────────────────────────────────────────── */
  const nodos = [];     // {x,y,z, g, r}  g = indice de racimo, -1 nucleo
  const racimos = [];   // {n,c,dentro, cx,cy,cz, ini,fin, hl, objetivo}
  const V = (x, y, z) => ({ x, y, z });

  function sembrar(c, n, radio, g) {
    const ini = nodos.length;
    for (let i = 0; i < n; i++) {
      const u = Math.pow(Math.random(), 1 / 3) * radio;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      nodos.push({
        x: c.x + u * Math.sin(ph) * Math.cos(th),
        y: c.y + u * Math.sin(ph) * Math.sin(th) * 0.8,
        z: c.z + u * Math.cos(ph),
        g, r: 0.7 + Math.random() * 0.8,
      });
    }
    return [ini, nodos.length];
  }

  // El nucleo venezolano va en el ORIGEN, y la camara se corre para que
  // caiga al 76% del ancho. El mundo se reparte a su izquierda, cruzando
  // la seccion entera. Asi se lee de izquierda a derecha: el mundo
  // entra, Venezuela recibe. Antes era un anillo simetrico y por eso no
  // habia ni direccion ni jerarquia.
  const nucleo = sembrar(V(0, 0, 0), 165, 2.4, -1);

  // las ciudades: pegadas a Venezuela, en abanico corto hacia la izquierda
  CIUDADES.forEach((cd, k) => {
    const a = Math.PI * (0.62 + (k / (CIUDADES.length - 1)) * 0.76);   // de arriba-izq a abajo-izq
    const d = 4.2 + (k % 2) * 0.9;
    const c = V(Math.cos(a) * d, Math.sin(a) * d * 0.72, (k % 2 ? 1 : -1) * 1.1);
    const n = Math.max(5, Math.round(4.6 * Math.sqrt(cd.c)));
    const [ini, fin] = sembrar(c, n, 0.55 + Math.sqrt(n) * 0.13, racimos.length);
    racimos.push({ ...cd, dentro: true, cx: c.x, cy: c.y, cz: c.z, ini, fin, hl: 0, objetivo: 0 });
  });

  // los paises: un campo suelto a la izquierda que ocupa toda la seccion
  const REJA = [
    [-14.6,  3.4, -2.4], [-13.4, -3.2,  2.2], [-10.6,  5.4,  1.4],
    [ -9.9, -5.6, -1.8], [ -6.9,  2.8,  3.0], [ -6.3, -2.0, -3.2],
    [ -3.6,  5.8, -0.8],
  ];
  PAISES.forEach((p, k) => {
    const [x, y, z] = REJA[k];
    const c = V(x, y, z);
    const n = Math.max(6, Math.min(40, Math.round(3.4 * Math.sqrt(p.c))));
    const [ini, fin] = sembrar(c, n, 0.6 + Math.sqrt(n) * 0.15, racimos.length);
    racimos.push({ ...p, dentro: false, cx: c.x, cy: c.y, cz: c.z, ini, fin, hl: 0, objetivo: 0 });
  });

  // aristas: vecinos cercanos dentro de cada racimo + radios al nucleo
  const aristas = [];
  function tejer(ini, fin, g, k) {
    for (let i = ini; i < fin; i++) {
      const cerca = [];
      for (let j = ini; j < fin; j++) {
        if (i === j) continue;
        const a = nodos[i], b = nodos[j];
        cerca.push([(a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2, j]);
      }
      cerca.sort((p, q) => p[0] - q[0]);
      for (let m = 0; m < Math.min(k, cerca.length); m++) {
        if (i < cerca[m][1]) aristas.push({ a: i, b: cerca[m][1], g, dentro: g < 0 || racimos[g].dentro });
      }
    }
  }
  tejer(nucleo[0], nucleo[1], -1, 3);
  racimos.forEach((r, k) => tejer(r.ini, r.fin, k, r.dentro ? 3 : 2));
  const alNucleo = () => nucleo[0] + ((Math.random() * (nucleo[1] - nucleo[0])) | 0);
  racimos.forEach((r, k) => {
    for (let s = 0; s < (r.dentro ? 4 : 3); s++) {
      aristas.push({ a: r.ini + ((Math.random() * (r.fin - r.ini)) | 0), b: alNucleo(),
                     g: k, dentro: r.dentro, radio: true });
    }
  });

  // pulsos: dos de cada tres por lineas de adentro
  const dentroL = aristas.filter((e) => e.dentro);
  const fueraL = aristas.filter((e) => !e.dentro);
  const pulsos = [];
  for (let i = 0; i < 170; i++) {
    const lista = i % 3 === 2 && fueraL.length ? fueraL : dentroL;
    const e = lista[(i * 7919) % lista.length];
    pulsos.push({ e, t: Math.random(), v: 0.2 + Math.random() * 0.4, haciaDentro: i % 2 === 0 });
  }

  /* ── proyeccion ───────────────────────────────────────────────── */
  let an = 1, al = 1, esc = 1, cx = 0, cy = 0, pr = 1, tipo = 1, apretado = false;
  const CAM = 26;                        // distancia de la camara
  // Sin giro en Y. Girar un anillo lo hacia dar vueltas; con Venezuela
  // fija a la derecha, cualquier rotacion se la lleva al otro lado. Lo
  // que queda es un balanceo minimo y la inclinacion del raton, que es
  // SEIS VECES mas suave que antes (0,05 rad contra 0,30).
  let giroY = 0, incX = 0.22, mx = 0, my = 0, omx = 0, omy = 0;
  const pantalla = new Array(nodos.length);

  function proyectar() {
    const cg = Math.cos(giroY), sg = Math.sin(giroY);
    const ci = Math.cos(incX), si = Math.sin(incX);
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      const x1 = n.x * cg - n.z * sg;
      const z1 = n.x * sg + n.z * cg;
      const y2 = n.y * ci - z1 * si;
      const z2 = n.y * si + z1 * ci;
      // perspectiva: cuanto mas lejos, mas chico y mas apagado
      const k = CAM / (CAM - z2);
      pantalla[i] = { x: cx + x1 * esc * k, y: cy - y2 * esc * k, k, z: z2 };
    }
  }
  function proyectarUno(p) {
    const cg = Math.cos(giroY), sg = Math.sin(giroY);
    const ci = Math.cos(incX), si = Math.sin(incX);
    const x1 = p.x * cg - p.z * sg, z1 = p.x * sg + p.z * cg;
    const y2 = p.y * ci - z1 * si, z2 = p.y * si + z1 * ci;
    const k = CAM / (CAM - z2);
    return { x: cx + x1 * esc * k, y: cy - y2 * esc * k, k, z: z2 };
  }

  function medir() {
    const b = lienzo.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    pr = Math.min(devicePixelRatio || 1, 2);
    an = b.width; al = b.height;
    lienzo.width = Math.round(an * pr); lienzo.height = Math.round(al * pr);
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    const angosta = an / al < 1.05;
    // El racimo mas lejano esta en x = -16,5 y Venezuela en 0. Para que
    // Venezuela caiga al 76% del ancho y el mas lejano al 16%, esos 16,5
    // de mundo tienen que medir el 60% del lienzo.
    tipo = Math.min(Math.max(an / 1250, 0.56), 1);   // escala de los rotulos
    apretado = an < 680;
    cx = angosta ? an * 0.60 : an * 0.76;
    cy = al * 0.46;
    // 14,6 de mundo entre Venezuela y el racimo mas lejano; el alto
    // util son unos 13 (de -5,6 a +5,8 mas el radio de los racimos)
    esc = angosta
      ? Math.min((an * 0.50) / 14.6, al / 17)
      : Math.min((an * 0.58) / 14.6, al / 13.6);
  }

  /* ── raton ────────────────────────────────────────────────────── */
  const raton = { x: -999, y: -999, dentro: false };
  lienzo.addEventListener("pointermove", (e) => {
    const b = lienzo.getBoundingClientRect();
    raton.x = e.clientX - b.left; raton.y = e.clientY - b.top; raton.dentro = true;
    omx = ((raton.x / an) * 2 - 1) * 0.050;
    omy = ((raton.y / al) * 2 - 1) * 0.035;
  });
  lienzo.addEventListener("pointerleave", () => {
    raton.dentro = false; raton.x = raton.y = -999; omx = 0; omy = 0;
  });

  /* ── dibujo ───────────────────────────────────────────────────── */
  let antes = 0;
  function pintar(ms) {
    const t = ms / 1000;
    const dt = Math.min(t - antes, 0.05) || 0.016;
    antes = t;

    const vaiven = quieto ? 0 : Math.sin(t * 0.21) * 0.055;
    mx += (omx - mx) * Math.min(dt * 3.4, 1);
    my += (omy - my) * Math.min(dt * 3.4, 1);
    incX = 0.22 + my;
    giroY = vaiven + mx;
    proyectar();

    // que racimo esta bajo el cursor: se mide contra su centro proyectado
    let sobre = -1, mejor = 1e9;
    if (raton.dentro) {
      racimos.forEach((r, k) => {
        const p = proyectarUno({ x: r.cx, y: r.cy, z: r.cz });
        const d = Math.hypot(raton.x - p.x, raton.y - p.y);
        if (d < 72 && d < mejor) { mejor = d; sobre = k; }
      });
    }
    racimos.forEach((r, k) => (r.objetivo = k === sobre ? 1 : 0));
    for (const r of racimos) {
      const d = r.objetivo - r.hl;
      r.hl += Math.abs(d) > 0.004 ? d * Math.min(dt * 9, 1) : d;
    }
    lienzo.style.cursor = sobre >= 0 ? "pointer" : "";

    ctx.clearRect(0, 0, an, al);

    // 1 · aristas. Curvas suaves, no rectas: eso es lo «neuronal».
    for (const e of aristas) {
      const A = pantalla[e.a], B = pantalla[e.b];
      if (A.z < -CAM * 0.85 || B.z < -CAM * 0.85) continue;
      const hl = e.g >= 0 ? racimos[e.g].hl : 0;
      const prof = Math.min(Math.max((A.k + B.k) / 2 - 0.55, 0), 1);
      let a = (e.dentro ? 0.44 : 0.19) * (0.45 + prof * 0.8) + hl * 0.65;
      if (e.radio) a *= 1.25;
      ctx.strokeStyle = hl > 0.03
        ? `rgba(200,219,250,${Math.min(a + 0.2, 1)})`
        : (e.dentro ? `rgba(47,111,222,${a})` : `rgba(176,158,158,${a})`);
      ctx.lineWidth = (e.radio ? 1.15 : 0.9) * (0.7 + prof * 0.6) + hl * 0.7;
      // el control se desvia perpendicular: da el arqueo de una sinapsis
      const mxp = (A.x + B.x) / 2 + (B.y - A.y) * 0.13;
      const myp = (A.y + B.y) / 2 - (B.x - A.x) * 0.13;
      ctx.beginPath(); ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(mxp, myp, B.x, B.y); ctx.stroke();
    }

    // 2 · pulsos
    for (const p of pulsos) {
      const hl = p.e.g >= 0 ? racimos[p.e.g].hl : 0;
      if (!quieto) { p.t += p.v * (1 + hl * 1.8) * dt; if (p.t > 1) p.t = 0; }
      const A0 = pantalla[p.e.a], B0 = pantalla[p.e.b];
      const A = p.haciaDentro ? A0 : B0, B = p.haciaDentro ? B0 : A0;
      const mxp = (A.x + B.x) / 2 + (B.y - A.y) * 0.13;
      const myp = (A.y + B.y) / 2 - (B.x - A.x) * 0.13;
      const u = p.t, v = 1 - u;
      const px = v*v*A.x + 2*v*u*mxp + u*u*B.x;
      const py = v*v*A.y + 2*v*u*myp + u*u*B.y;
      const prof = Math.min(Math.max((A.k + B.k) / 2 - 0.55, 0), 1);
      const s = (2.4 + prof * 1.6 + hl * 1.4);
      ctx.fillStyle = p.haciaDentro ? AZUL : "#E6EEFC";
      ctx.globalAlpha = Math.sin(u * Math.PI) * (0.5 + prof * 0.5);
      ctx.beginPath(); ctx.arc(px, py, s, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 3 · nodos, de atras hacia adelante
    const orden = pantalla.map((p, i) => i).sort((a, b) => pantalla[a].z - pantalla[b].z);
    for (const i of orden) {
      const p = pantalla[i], n = nodos[i];
      if (p.z < -CAM * 0.85) continue;
      const hl = n.g >= 0 ? racimos[n.g].hl : 0;
      const prof = Math.min(Math.max(p.k - 0.55, 0), 1);
      const s = (1.8 + n.r * 1.8) * (0.55 + prof * 0.8) + hl * 1.6;
      ctx.fillStyle = hl > 0.03 ? "#FFFFFF" : (n.g < 0 ? "#DCE8FB" : racimos[n.g].dentro ? "#B9CEF5" : "#8E949B");
      ctx.globalAlpha = (0.38 + prof * 0.58) + hl * 0.35;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 4 · el cerco: marca hasta donde llega la red venezolana
    const C0 = proyectarUno({ x: 0, y: 0, z: 0 });
    const radioCerco = 2.95 * esc * C0.k;
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = "rgba(47,111,222,.42)";
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(C0.x, C0.y, radioCerco, radioCerco * 0.82, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
    ctx.font = MONO(9.5 * tipo);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(47,111,222,.62)";
    ctx.fillText("LA RED VENEZOLANA", C0.x, C0.y + radioCerco * 0.82 + 7);

    // 5 · el centro: anillos que laten
    const C = proyectarUno({ x: 0, y: 0, z: 0 });
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.32 + k / 3) % 1);
      ctx.strokeStyle = `rgba(47,111,222,${(0.55 * (1 - u) * (1 - u)).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(C.x, C.y, (10 + u * 120) * (esc / 26), 0, 6.283); ctx.stroke();
    }
    const late = 0.6 + Math.sin(t * 2.2) * 0.28;
    const g = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, 26);
    g.addColorStop(0, `rgba(96,150,240,${late})`); g.addColorStop(1, "rgba(47,111,222,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, 26, 0, 6.283); ctx.fill();
    ctx.fillStyle = BLANCO;
    ctx.beginPath(); ctx.arc(C.x, C.y, 4.4, 0, 6.283); ctx.fill();

    /* 6 · LOS ROTULOS. Esto es lo que separa esta version de las cinco
       anteriores: un punto sin nombre no dice nada. */
    const carteles = [];
    racimos.forEach((r, k) => {
      // en pantalla angosta no caben nueve carteles sin montarse: se
      // quedan los que pesan, y los chicos solo cuando los señalas
      if (apretado && r.c < 15 && r.hl < 0.2) return;
      const p = proyectarUno({ x: r.cx, y: r.cy, z: r.cz });
      carteles.push({ p, n: r.n, c: r.c, dentro: r.dentro, hl: r.hl });
    });
    carteles.sort((a, b) => a.p.z - b.p.z);
    for (const q of carteles) {
      const prof = Math.min(Math.max(q.p.k - 0.55, 0), 1);
      const base = (q.dentro ? 0.62 : 0.4) * (0.4 + prof * 0.75);
      const a = Math.min(base + q.hl * 0.5, 1);
      const dx = 16, dy = -4;
      ctx.strokeStyle = `rgba(47,111,222,${a * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(q.p.x, q.p.y); ctx.lineTo(q.p.x + dx - 4, q.p.y + dy); ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.font = MONO((q.hl > 0.5 ? 14.5 : 12.5) * tipo);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillText(q.n, q.p.x + dx, q.p.y + dy - 7);
      ctx.font = MONO(11.5 * tipo);
      ctx.fillStyle = `rgba(47,111,222,${a})`;
      ctx.fillText(q.c + (q.dentro ? "" : " empresas"), q.p.x + dx, q.p.y + dy + 8);
    }
    // el del centro, siempre encendido
    const izq = apretado;                       // en movil, el cartel va a la izquierda
    ctx.textAlign = izq ? "right" : "left"; ctx.textBaseline = "middle";
    const lxC = C.x + (izq ? -20 : 20);
    ctx.font = MONO(18 * tipo); ctx.fillStyle = BLANCO;
    ctx.fillText("VENEZUELA", lxC, C.y - 9 * tipo);
    ctx.font = MONO(13 * tipo); ctx.fillStyle = AZUL;
    ctx.fillText(apretado ? VE_TOTAL + " empresas"
                          : VE_TOTAL + " empresas · el centro de la red", lxC, C.y + 8 * tipo);

    /* 7 · LA LEYENDA. Sin esto, los colores son decoracion. */
    const lx = 18, ly = al - 18;
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.font = MONO(11.5 * tipo);
    ctx.fillStyle = AZUL;
    ctx.beginPath(); ctx.arc(lx + 4, ly - 26, 3.4, 0, 6.283); ctx.fill();
    ctx.fillStyle = ACERO; ctx.fillText("dato entrando", lx + 14, ly - 22);
    ctx.fillStyle = "#E6EEFC";
    ctx.beginPath(); ctx.arc(lx + 124, ly - 26, 3.4, 0, 6.283); ctx.fill();
    ctx.fillStyle = ACERO; ctx.fillText("oportunidad saliendo", lx + 134, ly - 22);
    ctx.fillStyle = NIEBLA;
    ctx.fillText(apretado
      ? PADRON + " empresas · 1-oct-2026"
      : "Azul: red venezolana · Gris: el resto del mundo · " + PADRON
        + " empresas en el padrón, 1-oct-2026", lx, ly);
  }

  let vivo = false, lazo = 0;
  function cuadro(ms) { pintar(ms); lazo = requestAnimationFrame(cuadro); }
  function arranca() { if (vivo || quieto) return; vivo = true; antes = performance.now()/1000; cuadro(performance.now()); }
  function para() { vivo = false; cancelAnimationFrame(lazo); }

  medir(); pintar(performance.now());
  addEventListener("resize", () => { medir(); pintar(performance.now()); });
  document.addEventListener("visibilitychange", () => (document.hidden ? para() : arranca()));
  new IntersectionObserver((e) => (e[0].isIntersecting ? arranca() : para()),
    { threshold: 0 }).observe(lienzo);
})();
