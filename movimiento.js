/* ===================================================================
   Movimiento del sitio.

   Tres cosas se mueven, y las tres representan algo que de verdad
   pasa: la portada convierte un requerimiento en ofertas comparables,
   la red enseña rutas saliendo hacia una planta, y el proceso se
   recorre bajando. Las cifras de `.base` SI cuentan hacia arriba: el
   invariante 7 del brandbook lo prohibe, y Alfredo lo pidio igual el
   27-sep-2026. Es su decision y esta anotada en el bloque 7.

   Lo pesado lo hace el CSS con `animation-timeline`. Este archivo
   solo: (a) orquesta la portada, (b) llena el panel de actividad,
   (c) suple el scroll guiado donde el navegador no lo soporta, y
   (d) desmonta todo si el visitante pidio menos movimiento.
   =================================================================== */
(() => {
  "use strict";

  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hayObservador = "IntersectionObserver" in window;

  /**
   * Avisa una sola vez cuando el elemento asoma.
   *
   * Lleva respaldo por scroll a proposito: un IntersectionObserver no
   * dispara mientras el documento esta oculto (otra pestaña, panel
   * cerrado). Sin respaldo, una cifra que arranca en 0 se quedaria en 0,
   * y enseñar un 0 donde hay un dato medido es justo lo que este
   * proyecto no hace.
   */
  function alAsomar(el, umbral, hacer) {
    if (!el) return;
    let hecho = false;

    const enVista = () => {
      const r = el.getBoundingClientRect();
      const margen = innerHeight * Math.min(umbral, 0.5) * 0.5;
      return r.top < innerHeight - margen && r.bottom > margen;
    };
    const disparar = () => {
      if (hecho) return;
      hecho = true;
      limpiar();
      hacer();
    };
    const alRodar = () => { if (enVista()) disparar(); };
    function limpiar() {
      if (io) io.disconnect();
      removeEventListener("scroll", alRodar);
      removeEventListener("resize", alRodar);
      document.removeEventListener("visibilitychange", alRodar);
    }

    const io = hayObservador
      ? new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) disparar(); }, { threshold: umbral })
      : null;
    if (io) io.observe(el);
    addEventListener("scroll", alRodar, { passive: true });
    addEventListener("resize", alRodar);
    document.addEventListener("visibilitychange", alRodar);
    alRodar();
  }

  /* ── 0 · LA CORTINA DE CARGA · va la primera a proposito ────────
     Antes estaba en el puesto 11 y un error en el bloque 10 impidio
     que se abriera: la pagina se quedaba cargando para siempre. Lo
     que deja entrar al visitante corre antes que cualquier adorno. */
  // Se abre cuando la pagina esta lista, y como MUCHO a los 3,4 s. Una
  // web que no deja entrar es peor que una web sin animacion. Ya no hay
  // `aterriza()`: existia para frenar el punto que orbitaba, y el signo
  // ahora se ensambla en vez de girar.
  (() => {
    const cortina = document.getElementById("carga");
    if (!cortina) return;

    const abrir = () => {
      if (cortina.dataset.yendo) return;
      cortina.dataset.yendo = "1";
      cortina.classList.add("fuera");
      document.documentElement.classList.remove("cargando");
      setTimeout(() => cortina.remove(), 700);
    };
    if (quieto) { cortina.remove(); document.documentElement.classList.remove("cargando"); return; }

    // Dos relojes:
    //  · el TOPE abre aunque la carga se atasque.
    //  · el PISO impide lo contrario. Cuenta de la secuencia, sumada de los
    //    retardos del CSS: la ultima pieza sale a 400 ms y tarda 660 en
    //    las dos listas acaban de aparecer a 1,0 s y los anillos tardan
    //    2,6 s en una vuelta. 2,4 s deja ver una onda entera y las dos
    //    columnas puestas.
    // El piso se cuenta desde que arranco el documento, no desde `load`.
    const PISO = 2400, TOPE = 3600;

    // EL MAPA. Se dibuja con los 3.710 puntos de mundo-puntos.js --los
    // mismos del globo de «La red»-- en proyeccion equirrectangular: x va
    // de -1800 a 1799 (longitud x10) e y de -546 a 763 (latitud x10).
    // Dibujarlo sale mas barato que cargar una imagen y queda nitido a
    // cualquier tamaño.
    (() => {
      const lienzo = document.getElementById("cg-tierra");
      if (!lienzo || !window.TIERRA) return;
      const ctx = lienzo.getContext("2d");
      if (!ctx) return;
      const pintar = () => {
        const c = lienzo.getBoundingClientRect();
        if (c.width < 2) return;
        const pr = Math.min(devicePixelRatio || 1, 2);
        lienzo.width = Math.round(c.width * pr);
        lienzo.height = Math.round(c.height * pr);
        ctx.setTransform(pr, 0, 0, pr, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        const T = window.TIERRA;
        const X0 = -1800, X1 = 1799, Y0 = 763, Y1 = -546;
        const r = Math.max(0.7, c.width / 620);
        ctx.fillStyle = "rgba(146,160,180,.34)";
        for (let i = 0; i < T.length; i += 2) {
          const x = (T[i] - X0) / (X1 - X0) * c.width;
          const y = (Y0 - T[i + 1]) / (Y0 - Y1) * c.height;
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
      };
      pintar();
      addEventListener("resize", pintar);
      // Si el tipo de letra o el layout cambian el ancho, se repinta.
      requestAnimationFrame(pintar);
    })();

    // El contador. No mide la descarga --inventarse una medicion es
    // justo lo que este sitio no hace-- sino lo que falta para entrar:
    // llega a 100 en el instante en que se abre la cortina.
    const num = document.getElementById("cg-n");
    if (num) {
      const t0 = performance.now();
      const tic = () => {
        if (cortina.dataset.yendo) { num.textContent = "100"; return; }
        const p = Math.min(0.99, (performance.now() - t0) / PISO);
        num.textContent = String(Math.floor(p * 100)).padStart(2, "0");
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    }
    const arranque = performance.now();
    const tope = setTimeout(abrir, TOPE);
    addEventListener("load", () => {
      clearTimeout(tope);
      setTimeout(abrir, Math.max(0, PISO - (performance.now() - arranque)));
      setTimeout(abrir, TOPE);   // red de seguridad si el de arriba no corre
    });
  })();

  /* ── 2 · la red: las rutas se dibujan al llegar ─────────────────── */
  const red = document.querySelector(".red");
  if (red) {
    // El punto que viaja es SMIL, y SMIL no sabe de prefers-reduced-motion.
    // Hay que quitarlo a mano: es lo unico que se repite sin parar.
    if (quieto) red.querySelectorAll("animateMotion").forEach((n) => n.remove());
    alAsomar(red, 0.15, () => red.classList.add("dentro"));
  }

  /* ── 3 · el panel de actividad ──────────────────────────────────── */
  // Es un EJEMPLO, y lo dice en su cabecera y en su pie. Enseña el tipo
  // de aviso que recibe un comprador, no una operacion en curso.
  const SUCESOS = [
    ["ok",    "Muestra entregada · su planta la aprobó",        "renglón 03 · dos días antes del plazo"],
    ["curso", "Mercancía en tránsito · llega en 36 h",          "embarque 4 de 6 · Puerto Cabello"],
    ["nota",  "Cotización recibida · 6 renglones",              "Ningbo, CN · leída y cuadrada"],
    ["ok",    "Negociación cerrada · tercera contraoferta",     "Hamburgo, DE · cumple la especificación"],
    ["curso", "Muestra en camino · courier",                    "Shenzhen, CN · llega el jueves"],
    ["nota",  "Especificación confirmada con el fabricante",    "renglón 07 · espesor y grado"],
    ["curso", "Arancel pendiente de partida arancelaria",       "se la pedimos al fabricante"],
    ["ok",    "Orden emitida · seguimiento activo",             "8 renglones · 3 proveedores"],
    ["nota",  "Requerimiento recibido · WhatsApp",              "PDF de 4 páginas · convertido"],
    ["ok",    "Documentos cotejados contra la orden",           "factura, conocimiento de embarque y certificado"],
  ];
  const ICONO = {
    ok: '<path d="M4 9.5 7.2 13 14 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    curso: '<circle cx="9" cy="9" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 5.4V9l2.6 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    nota: '<circle cx="9" cy="9" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 6.2v.1M9 8.6v3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  };
  const lista = document.getElementById("sucesos");
  if (lista) {
    const VISIBLES = 6;
    const pintar = (s) => {
      const li = document.createElement("li");
      li.className = `suceso ${s[0]}`;
      li.innerHTML =
        `<svg class="suceso-i" viewBox="0 0 18 18" aria-hidden="true">${ICONO[s[0]]}</svg>` +
        `<div><p class="suceso-t">${s[1]}</p><p class="suceso-d">${s[2]}</p></div>`;
      lista.prepend(li);
      while (lista.children.length > VISIBLES) lista.lastElementChild.remove();
    };

    if (quieto || !hayObservador) {
      // Quieto: la lista se pinta entera de una vez y ahi se queda.
      SUCESOS.slice(0, VISIBLES).reverse().forEach(pintar);
    } else {
      SUCESOS.slice(0, 3).reverse().forEach(pintar);
      let n = 3;
      alAsomar(lista, 0.2, () => {
        setInterval(() => { pintar(SUCESOS[n % SUCESOS.length]); n += 1; }, 2600);
      });
    }
  }

  /* ── 4 · el proceso, donde no hay scroll guiado por CSS ─────────── */
  const hayScrollCSS = CSS.supports?.("animation-timeline", "view()");
  if (!hayScrollCSS && !quieto && hayObservador) {
    const proceso = document.querySelector(".proceso");
    alAsomar(proceso, 0.05, () => proceso.classList.add("dentro"));
    const ojo = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("dentro");
        ojo.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -18% 0px", threshold: 0.15 });
    document.querySelectorAll(".paso").forEach((p) => ojo.observe(p));
  } else if (!hayScrollCSS) {
    document.querySelectorAll(".paso").forEach((p) => p.classList.add("dentro"));
    document.querySelector(".proceso")?.classList.add("dentro");
  }

  /* ── 6 · el selector de contacto ──────────────────────────────── */
  // Los enlaces siguen apuntando a #hablar: sin JavaScript llevan al
  // cierre de la pagina, que ofrece correo y WhatsApp igual. Esto solo
  // adelanta la eleccion sin obligar a bajar hasta el final.
  (() => {
    const caja = document.getElementById("elegir");
    if (!caja || typeof caja.showModal !== "function") return;
    document.querySelectorAll("[data-contactar]").forEach((b) => {
      b.addEventListener("click", (ev) => { ev.preventDefault(); caja.showModal(); });
    });
    // Pulsar el fondo cierra. El <dialog> ocupa solo su caja, asi que un
    // clic cuyas coordenadas caen fuera de ella es un clic en el fondo.
    caja.addEventListener("click", (ev) => {
      const r = caja.getBoundingClientRect();
      const fuera = ev.clientX < r.left || ev.clientX > r.right ||
                    ev.clientY < r.top  || ev.clientY > r.bottom;
      if (fuera) caja.close();
    });
  })();

  /* ── 7 · las cifras cuentan hacia arriba ────────────────────────── */
  // El brandbook lo prohibe (invariante 7: «los datos no se animan»).
  // Alfredo lo pidio explicitamente el 27-sep-2026 y es su decision.
  // Se hace con tres condiciones: arranca solo cuando la seccion se ve,
  // ocurre UNA vez, y termina en la cifra medida, con su fecha debajo.
  // Quien pidio menos movimiento ve el numero final y ya.
  (() => {
    const cifras = [...document.querySelectorAll("[data-cifra]")];
    if (!cifras.length) return;
    const es = new Intl.NumberFormat("es-VE");
    if (quieto || !hayObservador) return;   // el HTML ya trae el numero final

    const contar = (el) => {
      const fin = Number(el.dataset.cifra);
      if (!Number.isFinite(fin)) return;
      const dur = 1400;
      el.textContent = "0";
      const t0 = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const suave = 1 - Math.pow(1 - p, 3);          // easeOutCubic
        el.textContent = es.format(Math.round(fin * suave));
        if (p < 1) requestAnimationFrame(paso);
        else el.textContent = es.format(fin);          // siempre cierra exacto
      };
      requestAnimationFrame(paso);
    };

    // El HTML trae la cifra final escrita. Solo se pone a cero en el
    // instante en que empieza la cuenta, nunca antes: si el navegador
    // no llega a disparar nada, lo que se ve es el numero de verdad.
    alAsomar(document.querySelector(".base"), 0.4, () => cifras.forEach(contar));
  })();

  /* ── 8 · la serpiente: cada paso se enciende al llegar el hilo ─── */
  (() => {
    const s = document.querySelector(".serpiente");
    if (!s) return;
    const nodos = [...s.querySelectorAll(".eslabon")];
    if (!nodos.length) return;
    // Encender un eslabon = marcarlo y RELANZAR su escena. Quitar y volver
    // a poner la clase reinicia las animaciones desde el principio, asi que
    // el dibujo se ve empezar aunque vuelvas a subir.
    const encender = (n) => {
      n.classList.add("tocado");
      const esc = n.querySelector(".escena");
      if (!esc) return;
      esc.classList.remove("activa");
      void esc.offsetWidth;
      esc.classList.add("activa");
    };
    if (quieto) { s.classList.add("dentro"); nodos.forEach(encender); return; }

    // La punta del hilo tiene que recorrer el alto real de la lista.
    const medir = () => s.style.setProperty("--alto", s.offsetHeight + "px");
    medir();
    addEventListener("resize", medir);

    alAsomar(s, 0.05, () => s.classList.add("dentro"));
    if (!hayObservador) { nodos.forEach(encender); return; }
    const ojo = new IntersectionObserver((e) => {
      e.forEach((x) => { if (x.isIntersecting) encender(x.target); });
    }, { rootMargin: "0px 0px -22% 0px", threshold: 0.2 });
    nodos.forEach((n) => ojo.observe(n));
  })();

  /* ── 9 · la pared, y que siga escribiendose ────────────────────── */
  // Las dos referencias que pidio Alfredo (legencymedia, el tarot) viven
  // de movimiento AMBIENTE: la ola de particulas y las velas no paran.
  // Aqui el equivalente honesto es que la pared siga llenandose mientras
  // la miras, porque es literalmente lo que hace la base.
  (() => {
    const p = document.querySelector(".padron");
    if (!p) return;
    if (quieto) { p.classList.add("dentro"); return; }

    const celdas = [...p.querySelectorAll(".pared i")];
    const vacias = () => celdas.filter((c) => !c.className);
    let reloj = null, escritas = 0;
    const TOPE = 34;   // no se llena entera: el padron nunca esta "terminado"

    const escribir = () => {
      const libres = vacias();
      if (!libres.length || escritas >= TOPE) { clearInterval(reloj); reloj = null; return; }
      const cuantas = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < cuantas && escritas < TOPE; k += 1) {
        const c = libres[Math.floor(Math.random() * libres.length)];
        if (!c || c.className) continue;
        c.className = Math.random() < 0.42 ? "ll" : "ti";
        c.classList.add("recien");
        escritas += 1;
        setTimeout(() => c.classList.remove("recien"), 900);
      }
    };
    const latir = () => { if (!reloj) reloj = setInterval(escribir, 1100); };
    const quieta = () => { clearInterval(reloj); reloj = null; };

    alAsomar(p, 0.12, () => {
      p.classList.add("dentro");
      // Arranca cuando la onda inicial ya termino de barrer.
      setTimeout(() => {
        latir();
        if (hayObservador) {
          new IntersectionObserver((e) => (e[0].isIntersecting ? latir() : quieta()),
            { threshold: 0 }).observe(p);
        }
        document.addEventListener("visibilitychange", () => (document.hidden ? quieta() : latir()));
      }, 3800);
    });
  })();

  /* ── 12 · el globo de la red ────────────────────────────────────── */
  // Los 3.710 puntos de tierra salen de `mundo.json`, el mismo archivo
  // que usa el mapa de la aplicacion. Se llevan a la esfera, se giran y
  // se proyectan en ortografica; el hemisferio de atras no se dibuja.
  // Canvas 2D, sin librerias: un WebGL aqui seria traer un martillo.
  (() => {
    const lienzo = document.getElementById("globo");
    if (!lienzo || !window.TIERRA) return;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;

    const PLAZAS = [
      ["Ningbo", "CN", 29.9, 121.6], ["Shenzhen", "CN", 22.5, 114.1], ["Busan", "KR", 35.1, 129.0],
      ["Bombay", "IN", 19.1, 72.9], ["Estambul", "TR", 41.0, 28.9], ["Hamburgo", "DE", 53.5, 10.0],
      ["Milán", "IT", 45.5, 9.2], ["Valencia", "ES", 39.5, -0.4], ["Miami", "US", 25.8, -80.2],
      ["Houston", "US", 29.8, -95.4], ["São Paulo", "BR", -23.5, -46.6], ["Cali", "CO", 3.4, -76.5],
      ["Ciudad de México", "MX", 19.4, -99.1],
    ];
    const DESTINO = [8.3, -64.0];                    // Anzoátegui
    const rad = (g) => (g * Math.PI) / 180;

    // lat/lon -> punto en la esfera unidad. El eje Y es el de giro.
    const enEsfera = (la, lo) => {
      const p = rad(90 - la), t = rad(lo);
      return [Math.sin(p) * Math.sin(t), Math.cos(p), Math.sin(p) * Math.cos(t)];
    };
    const girar = (v, gy, gx) => {
      const [x, y, z] = v;
      const x1 = x * Math.cos(gy) - z * Math.sin(gy);
      const z1 = x * Math.sin(gy) + z * Math.cos(gy);
      const y2 = y * Math.cos(gx) - z1 * Math.sin(gx);
      const z2 = y * Math.sin(gx) + z1 * Math.cos(gx);
      return [x1, y2, z2];
    };

    const tierra = [];
    for (let i = 0; i < TIERRA.length; i += 2) tierra.push(enEsfera(TIERRA[i + 1] / 10, TIERRA[i] / 10));
    const plazas = PLAZAS.map(([n, iso, la, lo]) => ({ n, iso, v: enEsfera(la, lo) }));
    const destino = enEsfera(DESTINO[0], DESTINO[1]);

    // Arco por el camino corto sobre la esfera, no por una recta que
    // atravesaria el planeta.
    const arco = (a, b, n = 34) => {
      const pun = [];
      const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      const w = Math.acos(dot), s = Math.sin(w) || 1e-6;
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        const k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
        const alto = 1 + Math.sin(Math.PI * t) * 0.14;   // se despega un poco
        pun.push([(a[0] * k1 + b[0] * k2) * alto, (a[1] * k1 + b[1] * k2) * alto, (a[2] * k1 + b[2] * k2) * alto]);
      }
      return pun;
    };
    const arcos = plazas.map((p) => arco(p.v, destino));

    let an = 0, al = 0, R = 0, cx = 0, cy = 0, dpr = 1;
    let gy = -1.25, gx = 0.34, corriendo = false, t = 0;
    let arrastrando = false, ux = 0, uy = 0, inercia = 0.0016;

    const medir = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      an = lienzo.clientWidth; al = lienzo.clientHeight;
      lienzo.width = Math.round(an * dpr); lienzo.height = Math.round(al * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(an, al) * 0.42; cx = an / 2; cy = al / 2;
    };
    const proy = (v) => [cx + v[0] * R, cy - v[1] * R, v[2]];

    const pintar = () => {
      ctx.clearRect(0, 0, an, al);
      if (!arrastrando) gy += inercia;
      t += 0.01;

      // El disco de atras, para que el globo tenga cuerpo.
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "#15191C"; ctx.fill();

      for (const v of tierra) {
        const g = girar(v, gy, gx);
        if (g[2] < 0.02) continue;                     // cara de atras, fuera
        const [x, y, z] = proy(g);
        ctx.globalAlpha = 0.18 + z * 0.62;
        ctx.fillStyle = "#AEB7BD";
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      ctx.lineCap = "round";
      arcos.forEach((pun, i) => {
        ctx.beginPath();
        let dibujando = false, visibles = 0;
        for (const p of pun) {
          const g = girar(p, gy, gx);
          if (g[2] < -0.12) { dibujando = false; continue; }
          const [x, y] = proy(g);
          if (!dibujando) { ctx.moveTo(x, y); dibujando = true; } else ctx.lineTo(x, y);
          visibles += 1;
        }
        if (visibles > 2) {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = "#566169";
          ctx.lineWidth = 1; ctx.stroke();
          // El punto que recorre el arco: uno por plaza, desfasado.
          const k = (t * 0.22 + i / arcos.length) % 1;
          const p = pun[Math.floor(k * (pun.length - 1))];
          const g = girar(p, gy, gx);
          if (g[2] > 0) {
            const [x, y] = proy(g);
            ctx.globalAlpha = 0.95; ctx.fillStyle = "#7FA6F2";
            ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      for (const p of plazas) {
        const g = girar(p.v, gy, gx);
        if (g[2] < 0) continue;
        const [x, y, z] = proy(g);
        ctx.globalAlpha = 0.35 + z * 0.65;
        ctx.fillStyle = "#E8EAEC";
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      }

      const gd = girar(destino, gy, gx);
      if (gd[2] > -0.05) {
        const [x, y] = proy(gd);
        const pulso = (Math.sin(t * 1.6) + 1) / 2;
        ctx.globalAlpha = 0.5 - pulso * 0.42;
        ctx.strokeStyle = "#2F6FDE"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 5 + pulso * 13, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = "#2F6FDE";
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = "#E8EAEC";
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.fillText("SU PLANTA", x + 12, y - 2);
        ctx.globalAlpha = 0.6;
        ctx.font = '400 10px Manrope, sans-serif';
        ctx.fillText("Anzoátegui, Venezuela", x + 12, y + 11);
      }

      ctx.globalAlpha = 1;
      if (corriendo) requestAnimationFrame(pintar);
    };

    const arrancar = () => { if (!corriendo) { corriendo = true; requestAnimationFrame(pintar); } };
    const parar = () => { corriendo = false; };

    // Se puede arrastrar para mirar otra cara del mundo.
    lienzo.addEventListener("pointerdown", (e) => { arrastrando = true; ux = e.clientX; uy = e.clientY; lienzo.setPointerCapture(e.pointerId); });
    lienzo.addEventListener("pointermove", (e) => {
      if (!arrastrando) return;
      gy += (e.clientX - ux) * 0.006;
      gx = Math.max(-0.9, Math.min(0.9, gx + (e.clientY - uy) * 0.004));
      ux = e.clientX; uy = e.clientY;
    });
    const soltar = () => { arrastrando = false; };
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);

    medir();
    addEventListener("resize", medir);
    if (quieto) { inercia = 0; pintar(); return; }   // quieto: un solo fotograma
    if (hayObservador) {
      new IntersectionObserver((e) => (e[0].isIntersecting ? arrancar() : parar()), { threshold: 0 }).observe(lienzo);
    } else arrancar();
    document.addEventListener("visibilitychange", () => (document.hidden ? parar() : arrancar()));
  })();

  /* 13 · EL MANIFIESTO · cada palabra se enciende al pasar.
     El HTML trae la frase entera en texto plano; aqui se parte en
     <span class="pal">. Si el JS no corre, se lee igual: el color de
     reposo es --niebla, que es legible, no transparente.
     Donde el navegador soporta animation-timeline, el CSS se encarga
     solo y este fallback no toca nada. */
  (function manifiesto() {
    const parrafos = document.querySelectorAll("[data-palabras]");
    if (!parrafos.length) return;

    // Se parte en PALABRAS y, dentro de cada una, en LETRAS. Las palabras
    // siguen siendo inline-block para que el renglon corte donde debe; las
    // letras llevan un indice global `--i` que es lo que hace que la luz
    // viaje de una a la siguiente en vez de encenderse todas de golpe.
    parrafos.forEach((p) => {
      const palabras = p.textContent.trim().split(/\s+/);
      p.textContent = "";
      let n = 0;
      palabras.forEach((w) => {
        const pal = document.createElement("span");
        pal.className = "pal";
        for (const car of w) {
          const l = document.createElement("i");
          l.className = "ch";
          l.textContent = car;
          l.style.setProperty("--i", n++);
          pal.append(l);
        }
        p.append(pal, document.createTextNode(" "));
      });
      // Cuantas letras hay se lo decimos al CSS: con eso reparte el
      // recorrido del scroll entre todas, sea el parrafo largo o corto.
      p.style.setProperty("--n", n);
    });

    if (quieto) {
      document.querySelectorAll(".ch").forEach((s) => s.classList.add("on"));
      return;
    }
    if (hayScrollCSS) return;               // lo maneja el CSS

    parrafos.forEach((p) => {
      const letras = p.querySelectorAll(".ch");
      alAsomar(p, 0.18, () => {
        letras.forEach((s, i) => setTimeout(() => s.classList.add("on"), i * 13));
      });
    });
  })();

  /* 14 · LA LINEA AL SIGNO · respaldo para navegadores sin
     animation-timeline. Donde lo hay, el CSS se encarga y esto no
     toca nada: la clase .sin-scroll-css ni siquiera se pone. */
  (function lineaAlSigno() {
    const linea = document.querySelector(".ac-linea");
    if (!linea || hayScrollCSS || quieto) return;
    document.documentElement.classList.add("sin-scroll-css");
    alAsomar(linea, 0.3, () => linea.classList.add("on"));
  })();

  /* ── 15 · las tarjetas de «El momento» ───────────────────────────
     Donde hay `animation-timeline` lo lleva el CSS y esto no se activa.
     Aqui solo esta el respaldo: la clase `.sin-scroll-css` ya la pone
     el bloque de la linea cuando hace falta. */
  (function tarjetasDelMomento() {
    const cel = document.querySelectorAll(".problema.claro .ac-cel");
    if (!cel.length || quieto) return;
    if (hayScrollCSS) return;
    document.documentElement.classList.add("sin-scroll-css");
    cel.forEach((c, i) => alAsomar(c, 0.2, () => setTimeout(() => c.classList.add("puesta"), i * 90)));
  })();

  /* ── 16 · el acordeon de «Operacion documentada» ────────────────
     Abre uno y solo uno, y el panel de la izquierda cambia a la imagen
     de ese paso. Es lo que hace heronaiapp.com y lo que convierte la
     seccion en un panel con lista en vez de siete tarjetas sueltas. */
  (function casosAcordeon() {
    const items = [...document.querySelectorAll(".uc-item")];
    const imgs = [...document.querySelectorAll(".uc-img")];
    if (!items.length) return;
    const abrir = (n) => {
      items.forEach((it, i) => {
        const on = i === n;
        it.classList.toggle("on", on);
        it.querySelector(".uc-cab").setAttribute("aria-expanded", String(on));
      });
      imgs.forEach((im, i) => im.classList.toggle("on", i === n));
    };
    items.forEach((it, i) =>
      it.querySelector(".uc-cab").addEventListener("click", () => abrir(i)));
  })();

  /* ── 17 · HOVER ───────────────────────────────────────────────────
     El boton magnetico estuvo aqui y lo quito Alfredo el 8-oct: tiraba
     del boton siguiendo al cursor y no le gusto. Queda el reflejo, que
     es lo unico de los cuatro patrones que aprobo.
     Todo va detras de `hover:hover` y `pointer:fine`: en tactil un toque
     dispara un hover falso que luego no se puede quitar. */
  (function hovers() {
    if (quieto) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    /* b · EL REFLEJO SIGUE AL CURSOR. Se escriben --mx/--my en la propia
       tarjeta y su ::after los usa: no se toca ningun hijo, asi que no
       hay recalculo en cascada. */
    const conReflejo = ".ac-cel, .ac-garantias li, .grados li, .plazas li, .ac-tar li,"
                     + " .ac-rejilla article, .pista-t, .apila-t";
    document.querySelectorAll(conReflejo).forEach((c) => {
      c.classList.add("reflejo");
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      }, { passive: true });
    });
  })();


  /* ── 18 · PISTA HORIZONTAL Y BARAJA ───────────────────────────────
     Un solo bucle de rAF para las dos cosas, y solo cuando algo esta
     a la vista. Dos motores separados leerian `getBoundingClientRect`
     dos veces por cuadro, que es un reflujo sincrono cada vez.

     Lo que no se puede hacer en CSS, y por eso esto existe:
       · el desplazamiento del tren depende de su ANCHO REAL, que CSS no
         conoce. Se mide `scrollWidth - clientWidth`.
       · una tarjeta `sticky` deja de moverse respecto al viewport, asi
         que su propia `view()` se congela y no sirve para encogerla.
     ------------------------------------------------------------------ */
  (function pistas() {
    const pistas = [...document.querySelectorAll(".pista")];
    const barajas = [...document.querySelectorAll(".apila")];
    if (!pistas.length && !barajas.length) return;

    if (quieto) return;                 // con movimiento reducido el CSS ya
                                        // las deja en vertical y legibles

    // `.lista` enciende la version pineada: sin JS el CSS deja la tira
    // arrastrable, que sigue siendo usable.
    pistas.forEach((p) => p.classList.add("lista"));

    let alto = 0;
    const medir = () => {
      alto = innerHeight;
      pistas.forEach((p) => {
        const tren = p.querySelector(".pista-tren");
        const fijo = p.querySelector(".pista-fijo");
        if (!tren || !fijo) return;
        // OJO: el tren es `width:max-content`, asi que su `scrollWidth` y su
        // `clientWidth` son el mismo numero y la resta daba 0. Quien recorta
        // es el contenedor pineado, y es contra ese ancho que hay que medir.
        const recorrido = Math.max(0, tren.scrollWidth - fijo.clientWidth);
        p.style.setProperty("--recorrido", recorrido + "px");
        // la altura del contenedor ES el pin: una pantalla para leer la
        // cabecera, mas exactamente lo que hay que correr. 1:1 con el dedo.
        p.style.height = (alto + recorrido) + "px";
      });
    };

    const pinta = () => {
      for (const p of pistas) {
        const r = p.getBoundingClientRect();
        if (r.bottom < -200 || r.top > alto + 200) continue;
        const total = r.height - alto;
        const avance = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        p.style.setProperty("--p", avance.toFixed(4));
        // cercania al centro, por tarjeta. El medio de la pantalla es 1,
        // los bordes 0: eso es lo que hace que la del centro pese mas.
        const medio = innerWidth / 2;
        for (const t of p.querySelectorAll(".pista-t")) {
          const tr = t.getBoundingClientRect();
          const d = Math.abs(tr.left + tr.width / 2 - medio) / (innerWidth * 0.62);
          t.style.setProperty("--c", Math.max(0, 1 - d).toFixed(3));
        }
      }
      for (const b of barajas) {
        const r = b.getBoundingClientRect();
        if (r.bottom < -200 || r.top > alto + 200) continue;
        const ts = [...b.querySelectorAll(".apila-t")];
        ts.forEach((t, i) => {
          // cuantas de las siguientes ya la han alcanzado: eso es el
          // numero de capas que tiene encima
          let z = 0;
          const mio = t.getBoundingClientRect().top;
          for (let j = i + 1; j < ts.length; j++) {
            if (ts[j].getBoundingClientRect().top <= mio + 4) z++;
          }
          t.style.setProperty("--z", Math.min(z, 4));
        });
      }
    };

    /* El candado tiene que guardar el ID del cuadro, no un booleano.
       Medido el 8-oct: en una pestana oculta `requestAnimationFrame` no
       corre, asi que con un booleano la primera peticion deja el candado
       echado PARA SIEMPRE y el motor no vuelve a pintar nunca. Lo vi con
       `document.hidden === true` y `--p` clavado en 0 mientras un
       `resize` --que llama a pinta() directo-- lo movia a 0,66.
       Le pasa a cualquiera que abra la pagina en una pestana de fondo. */
    let cuadro = 0;
    let red = 0;
    const pide = () => {
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => { cuadro = 0; clearTimeout(red); pinta(); });
      // Cinturon: los temporizadores SI corren en pestana oculta --con
      // tope de 1 s-- y el rAF no. Sin esto, basta un cuadro que no
      // llega para que el candado se quede echado y el motor muera.
      red = setTimeout(() => { cuadro = 0; pinta(); }, 400);
    };

    medir();
    pinta();
    addEventListener("scroll", pide, { passive: true });
    addEventListener("resize", () => { medir(); pinta(); }, { passive: true });
    addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      if (cuadro) cancelAnimationFrame(cuadro);
      cuadro = 0;
      medir();
      pinta();
    });
    // las fuentes aterrizan despues y cambian el ancho del tren
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medir(); pinta(); });
  })();


  /* ── 19 · EL SELECTOR DE IDIOMA ───────────────────────────────────
     Solo dos cortesias. El dropdown es un `<details>` y YA FUNCIONA SIN
     ESTO: se abre al pulsar y se cierra pulsando otra vez. Lo que falta
     a `<details>` de serie es cerrarse al pulsar fuera y con Escape, que
     es lo que la gente espera de un menu y lo unico que se añade aqui.

     Nada de `role="listbox"` ni de gestionar el foco con flechas: el
     panel son enlaces y el Tab ya los recorre. Un dropdown con ARIA
     hecho a mano se rompe por ahi, y aqui no hay nada que ganar. */
  (function idiomas() {
    const cajas = [...document.querySelectorAll("details[data-idiomas]")];
    if (!cajas.length) return;
    const cerrar = (menos) => cajas.forEach((d) => { if (d !== menos) d.open = false; });

    addEventListener("pointerdown", (e) => {
      // `composedPath` y no `contains`: el clic puede venir del <use> de
      // una bandera, que es shadow DOM y a `contains` se le escapa.
      const dentro = e.composedPath().some((n) => cajas.includes(n));
      if (!dentro) cerrar(null);
    }, { passive: true });

    addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const abierta = cajas.find((d) => d.open);
      if (!abierta) return;
      abierta.open = false;
      abierta.querySelector("summary")?.focus();   // el foco vuelve al boton
    });

    // abrir una cierra las demas, por si algun dia hay dos en la pagina
    cajas.forEach((d) => d.addEventListener("toggle", () => { if (d.open) cerrar(d); }));
  })();

})();
