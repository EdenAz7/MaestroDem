document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Lien actif dans la navigation ===== */
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.getAttribute("href") === page) a.setAttribute("aria-current", "page");
  });

  /* ===== Menu mobile ===== */
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");
  const closeBtn = document.querySelector("[data-close]");

  const openDrawer = () => {
    drawer.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    closeBtn && closeBtn.focus();
  };
  const closeDrawer = () => {
    drawer.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  };

  if (burger && drawer) {
    burger.addEventListener("click", openDrawer);
    closeBtn && closeBtn.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", e => { if (e.target === drawer) closeDrawer(); });
    drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", closeDrawer));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
  }

  /* ===== Baguette du chef : traînée dorée qui suit le pointeur ===== */
  document.querySelectorAll("[data-baton]").forEach(stage => {
    if (reduceMotion) return;
    const canvas = document.createElement("canvas");
    canvas.className = "baton-trail";
    canvas.setAttribute("aria-hidden", "true");
    stage.prepend(canvas);
    const ctx = canvas.getContext("2d");
    const LIFE = 650;               // durée de vie d'un point (ms)
    let pts = [], raf = null, w = 0, h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = stage.clientWidth; h = stage.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const now = performance.now();
      pts = pts.filter(p => now - p.t < LIFE);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const life = 1 - (now - b.t) / LIFE;
        ctx.strokeStyle = `rgba(227, 195, 90, ${life * 0.9})`;
        ctx.shadowColor = "rgba(227, 195, 90, .8)";
        ctx.shadowBlur = 14 * life;
        ctx.lineWidth = 1 + 5 * life;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // pointe lumineuse de la baguette
      const last = pts[pts.length - 1];
      if (last) {
        const life = 1 - (now - last.t) / LIFE;
        ctx.shadowBlur = 20; ctx.fillStyle = `rgba(255, 240, 190, ${life})`;
        ctx.beginPath(); ctx.arc(last.x, last.y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      raf = pts.length ? requestAnimationFrame(draw) : null;
    };
    const add = (x, y) => {
      pts.push({ x, y, t: performance.now() });
      if (!raf) raf = requestAnimationFrame(draw);
    };

    stage.addEventListener("pointermove", e => {
      const r = stage.getBoundingClientRect();
      add(e.clientX - r.left, e.clientY - r.top);
    });

    // À l'ouverture : la baguette dessine une mesure à 4 temps
    const beat = [[.70, .22], [.70, .70], [.48, .56], [.90, .58], [.72, .24], [.70, .22]];
    const cr = (p0, p1, p2, p3, t) => {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    };
    const path = [];
    for (let i = 0; i < beat.length - 1; i++) {
      const p0 = beat[Math.max(i - 1, 0)], p1 = beat[i], p2 = beat[i + 1], p3 = beat[Math.min(i + 2, beat.length - 1)];
      for (let s = 0; s < 1; s += 0.06) path.push([cr(p0[0], p1[0], p2[0], p3[0], s), cr(p0[1], p1[1], p2[1], p3[1], s)]);
    }
    let k = 0;
    setTimeout(function step() {
      if (k >= path.length) return;
      add(path[k][0] * w, path[k][1] * h); k++;
      setTimeout(step, 22);
    }, 700);
  });

  /* ===== Formulaire de devis → Google Sheets ===== */
  const form = document.getElementById("form");
  const status = document.getElementById("message");
  const submitBtn = document.getElementById("submit-button");

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBDSiGYs7NqUAPRbUU-VjcnlqWBVTduqRJ36k8pHz82NFOJgMG3fvBfGNT2pKtEFnr/exec";

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      submitBtn.disabled = true;
      status.className = "form-status";
      status.textContent = "Envoi de votre demande…";

      try {
        await fetch(SCRIPT_URL, { method: "POST", body: new FormData(form) });
        window.location.href = "merci.html";
      } catch (err) {
        console.error(err);
        status.className = "form-status error";
        status.textContent = "La demande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez, ou appelez-nous.";
        submitBtn.disabled = false;
      }
    });
  }

  /* ===== La partition : chaque champ rempli ajoute une note ===== */
  const partition = document.querySelector("[data-partition]");
  if (form && partition) {
    const svg = partition.querySelector("svg");
    const counter = partition.querySelector("[data-count]");
    const fields = [...form.querySelectorAll("input:not([type=hidden]):not([tabindex='-1']), select, textarea")];
    const MELODY = [0, 2, 4, 2, 5, 4, 3, 1, 2, 4, 7, 6, 5, 7];   // hauteur des notes sur la portée
    const NS = "http://www.w3.org/2000/svg";
    const x0 = 70, span = 600 - x0 - 20, gap = span / fields.length;

    const notes = fields.map((f, i) => {
      const step = MELODY[i % MELODY.length];
      const x = x0 + gap * i + gap / 2, y = 60 - step * 5;   // E4 = ligne du bas (y=60)
      const g = document.createElementNS(NS, "g"); g.setAttribute("class", "note");
      const head = document.createElementNS(NS, "ellipse");
      head.setAttribute("cx", x); head.setAttribute("cy", y); head.setAttribute("rx", 6.2); head.setAttribute("ry", 4.4);
      head.setAttribute("transform", `rotate(-20 ${x} ${y})`);
      const stem = document.createElementNS(NS, "line");
      const up = step < 4;
      stem.setAttribute("x1", up ? x + 5.6 : x - 5.6); stem.setAttribute("x2", up ? x + 5.6 : x - 5.6);
      stem.setAttribute("y1", y); stem.setAttribute("y2", up ? y - 30 : y + 30);
      g.append(head, stem); svg.appendChild(g);
      return { el: g, on: false };
    });

    const filled = f => f.value.trim() !== "" && f.checkValidity();
    const update = () => {
      let n = 0;
      fields.forEach((f, i) => {
        const on = filled(f);
        notes[i].on = on; notes[i].el.classList.toggle("on", on);
        if (on) n++;
      });
      counter.textContent = n === fields.length
        ? "Partition complète, prête pour le final !"
        : `${n} / ${fields.length} notes`;
      partition.classList.toggle("complete", n === fields.length);
    };
    fields.forEach(f => {
      f.addEventListener("change", () => update());
      f.addEventListener("blur", () => update());
    });
    form.addEventListener("reset", () => setTimeout(() => update(), 0));
    update();
  }

  /* ===== Date minimum = aujourd'hui ===== */
  const dateInput = document.getElementById("date");
  if (dateInput) {
    const t = new Date();
    dateInput.min = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }

  /* ===== Année du copyright ===== */
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
});
