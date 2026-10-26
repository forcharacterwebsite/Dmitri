(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- boot ---------- */
  const boot = $("#boot"), log = $("#bootLog"), bar = $("#bootBar"), pct = $("#bootPct");
  const lines = [
    ["> GHD-OS v4.0.26 // concordia node", ""],
    ["> mount /dev/sapientia/applicants", "ok"],
    ["> decrypt application_026.enc", "ok"],
    ["> verify subject: Шостакович Д.Д.", "ok"],
    ["> check firewall integrity", "err"],
    ["  patch proposal found (author: subject) ... applied", "ok"],
    ["> load hotfix_block.exe", "ok"],
    ["> render profile", ""]
  ];
  function runBoot() {
    document.body.classList.add("is-booting");
    let i = 0, p = 0;
    const step = () => {
      if (i < lines.length) {
        const [t, s] = lines[i++];
        const tag = s === "ok" ? ' <span class="ok">[ OK ]</span>' : s === "err" ? ' <span class="err">[WARN]</span>' : "";
        log.insertAdjacentHTML("beforeend", t.replace(/</g, "&lt;") + tag + "\n");
      }
      p = Math.min(100, p + 7 + Math.random() * 11);
      bar.style.width = p + "%";
      pct.textContent = String(Math.floor(p)).padStart(3, "0");
      if (p < 100) setTimeout(step, 70 + Math.random() * 90);
      else {
        while (i < lines.length) {
          const [t, s] = lines[i++];
          log.insertAdjacentHTML("beforeend", t.replace(/</g, "&lt;") + (s === "ok" ? ' <span class="ok">[ OK ]</span>' : "") + "\n");
        }
        log.insertAdjacentHTML("beforeend", '<span class="ok">> access granted_</span>');
        setTimeout(endBoot, 420);
      }
    };
    step();
  }
  function endBoot() {
    boot.classList.add("is-done");
    document.body.classList.remove("is-booting");
    try { sessionStorage.setItem("booted", "1"); } catch (e) {}
    setTimeout(() => boot.remove(), 600);
  }
  function startBoot() {
    let seen = false;
    try { seen = sessionStorage.getItem("booted") === "1"; } catch (e) {}
    if (reduce || seen) { boot.remove(); } else { runBoot(); }
  }

  /* ---------- background music ---------- */
  const bgm = $("#bgm"), soundBtn = $("#soundBtn"), soundLabel = $("#soundLabel");
  const VOL = 0.35;           // 기본 볼륨 (0 ~ 1)
  let soundOn = false, fadeRaf = 0, missing = false;
  const saveSound = v => { try { sessionStorage.setItem("dmitri-sound", v ? "1" : "0"); } catch (e) {} };
  function paintSound() {
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundLabel.textContent = missing ? "NO TRACK" : soundOn ? "SOUND ON" : "SOUND OFF";
    soundBtn.disabled = missing;
  }
  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeRaf);
    const from = bgm.volume, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      bgm.volume = Math.min(1, Math.max(0, from + (target - from) * k));
      if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
    };
    fadeRaf = requestAnimationFrame(step);
  }
  function setSound(on) {
    if (missing) { soundOn = false; paintSound(); return; }
    soundOn = on; saveSound(on); paintSound();
    if (on) {
      bgm.volume = 0;
      const p = bgm.play();
      if (p && p.catch) p.catch(err => {
        if (err && err.name === "NotSupportedError") missing = true;   // 파일 없음
        soundOn = false; saveSound(false); paintSound();
      });
      fadeTo(VOL, 1500);
    } else {
      fadeTo(0, 500, () => { if (!soundOn) bgm.pause(); });
    }
  }
  const markMissing = () => { missing = true; soundOn = false; paintSound(); };
  bgm.addEventListener("error", markMissing);
  if (bgm.error) markMissing();
  soundBtn.addEventListener("click", () => setSound(!soundOn));
  document.addEventListener("visibilitychange", () => {
    if (!soundOn) return;
    if (document.hidden) bgm.pause(); else bgm.play().catch(() => {});
  });
  paintSound();

  /* ---------- photosensitivity + audio gate ----------
     Shown once per tab. Enter buttons unlock after the warning has been on
     screen for LOCK ms. "소리 켜고 보기" / "소리 끄고 보기" both enter;
     "웹사이트 보지 않기" offers the Google Docs text instead. */
  function runGate(onEnter) {
    const gate = $("#gate"), key = "dmitri-gate";
    let ok = false;
    try { ok = sessionStorage.getItem(key) === "1"; } catch (e) {}
    if (!gate || ok) {
      if (gate) gate.remove();
      let pref = false;
      try { pref = sessionStorage.getItem("dmitri-sound") === "1"; } catch (e) {}
      if (pref) setSound(true);   // 새로고침 시 이전 선택 유지 (브라우저가 막으면 OFF로 돌아감)
      onEnter(); return;
    }
    document.body.classList.add("is-gated");
    const LOCK = 3000;
    const actions = $("#gateActions"), alt = $("#gateAlt");
    const enter = $("#gateEnter"), mute = $("#gateMute"), decline = $("#gateDecline"), back = $("#gateBack");
    const doc = $("#gateDoc"), bar = $("#gateBar"), status = $("#gateStatus"), timer = $(".gate__timer");
    const t0 = performance.now();
    let lastSec = -1;
    const lockLoop = now => {
      const k = Math.min(1, (now - t0) / LOCK);
      bar.style.width = k * 100 + "%";
      const left = Math.ceil((LOCK - (now - t0)) / 1000);
      if (k < 1) {
        if (left !== lastSec) { lastSec = left; status.textContent = "경고 확인 중 … " + left; }
        requestAnimationFrame(lockLoop);
      } else {
        status.textContent = "> 확인 완료. 보는 방법을 선택하세요";
        timer.classList.add("is-ready");
        enter.disabled = false; mute.disabled = false;
        if (!actions.hidden) enter.focus();
      }
    };
    requestAnimationFrame(lockLoop);
    setTimeout(() => decline.focus(), 50);
    const go = withSound => {
      if (enter.disabled) return;
      try { sessionStorage.setItem(key, "1"); } catch (e) {}
      setSound(withSound);        // 클릭 직후라 브라우저 자동재생 제한에 걸리지 않음
      gate.classList.add("is-done");
      document.body.classList.remove("is-gated");
      setTimeout(() => gate.remove(), 600);
      onEnter();
    };
    enter.addEventListener("click", () => go(true));
    mute.addEventListener("click", () => go(false));
    decline.addEventListener("click", () => { actions.hidden = true; alt.hidden = false; doc.focus(); });
    back.addEventListener("click", () => { alt.hidden = true; actions.hidden = false; (enter.disabled ? decline : enter).focus(); });
    gate.addEventListener("keydown", e => {   // 경고 창 안에서만 Tab 이동
      if (e.key !== "Tab") return;
      const f = $$("button:not([disabled]),a[href]", gate).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  runGate(startBoot);


  /* ---------- fit text to container width ---------- */
  const fitEls = $$("[data-fit]");
  function fitAll() {
    fitEls.forEach(el => {
      el.style.fontSize = "100px";
      const inner = el.firstElementChild || el;
      const w = inner.getBoundingClientRect().width, cw = el.clientWidth;
      if (w && cw) el.style.fontSize = Math.floor((100 * cw / w) * 0.985) + "px";
    });
  }
  fitAll();
  addEventListener("resize", fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

  /* ---------- panic hex dump ---------- */
  const hex = $("#panicHex");
  if (hex) {
    const rows = [];
    for (let r = 0; r < 22; r++) {
      let line = (0xdead0000 + r * 16).toString(16).toUpperCase() + "  ";
      for (let c = 0; c < 8; c++) line += ((Math.random() * 65536) | 0).toString(16).padStart(4, "0").toUpperCase() + " ";
      rows.push(line);
    }
    hex.textContent = rows.join("\n");
  }

  /* ---------- clock ---------- */
  const clock = $("#clock");
  const tick = () => { clock.textContent = new Date().toTimeString().slice(0, 8); };
  tick(); setInterval(tick, 1000);

  /* ---------- progress + active nav ---------- */
  const prog = $("#progress");
  const navLinks = $$(".nav__index a");
  const secs = navLinks.map(a => $(a.getAttribute("href")));
  const onScroll = () => {
    const h = document.documentElement;
    prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + "%";
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    navLinks.forEach((a, i) => a.classList.toggle("is-on", i === cur));
    oathUpdate();
  };
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- text scramble ---------- */
  const glyphs = "!<>-_\\/[]{}=+*^?#01";
  function scramble(el) {
    const final = el.dataset.final || el.textContent;
    el.dataset.final = final;
    let frame = 0;
    const total = 18;
    const run = () => {
      const progress = frame / total;
      el.textContent = final.split("").map((c, i) => {
        if (c === " ") return " ";
        return i / final.length < progress ? c : glyphs[(Math.random() * glyphs.length) | 0];
      }).join("");
      if (++frame <= total) requestAnimationFrame(run); else el.textContent = final;
    };
    run();
  }

  /* ---------- reveal ---------- */
  const revealTargets = $$(".sec__head, .ident > *, .look > *, .persona__keys, .hp, .card, .lhs__col, .stats > *, .skill, .panic > *, .hotfix > *, .trait, .inv__item, .link > *, .coupling, .oath__label");
  revealTargets.forEach(el => el.classList.add("rv"));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("in");
      const sc = el.querySelector && el.querySelector(".scramble");
      if (sc && !reduce) scramble(sc);
      if (el.classList.contains("stats") || el.closest(".stats")) runStats();
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  revealTargets.forEach(el => io.observe(el));

  /* ---------- radar ---------- */
  const stats = [["추가 체력", 90], ["공격력", 10], ["방어력", 90], ["민첩성", 50], ["정확성", 10], ["정신력", 70]];
  const R = 100;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const svgNS = "http://www.w3.org/2000/svg";
  const grid = $(".radar__grid"), labels = $(".radar__labels"), shape = $(".radar__shape");
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const p = document.createElementNS(svgNS, "polygon");
    p.setAttribute("points", stats.map((_, i) => pt(i, R * f).join(",")).join(" "));
    grid.appendChild(p);
  });
  stats.forEach(([name, v], i) => {
    const l = document.createElementNS(svgNS, "line");
    const [x, y] = pt(i, R);
    l.setAttribute("x1", 0); l.setAttribute("y1", 0); l.setAttribute("x2", x); l.setAttribute("y2", y);
    grid.appendChild(l);
    const [lx, ly] = pt(i, R + 18);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", lx); t.setAttribute("y", ly - 3); t.setAttribute("text-anchor", "middle");
    t.textContent = name; labels.appendChild(t);
    const tv = document.createElementNS(svgNS, "text");
    tv.setAttribute("x", lx); tv.setAttribute("y", ly + 8); tv.setAttribute("text-anchor", "middle");
    tv.setAttribute("class", "v"); tv.textContent = v; labels.appendChild(tv);
  });
  let statsDone = false;
  function runStats() {
    if (statsDone) return; statsDone = true;
    shape.setAttribute("points", stats.map(([, v], i) => pt(i, (R * v) / 100).join(",")).join(" "));
    $$("#bars li").forEach((li, i) => setTimeout(() => { $("i", li).style.width = li.dataset.v + "%"; }, i * 90));
  }
  if (reduce) runStats();

  /* ---------- portrait glitch ---------- */
  const portrait = $("#portrait");
  if (!reduce) {
    const glitchOnce = () => {
      portrait.classList.add("is-glitching");
      setTimeout(() => portrait.classList.remove("is-glitching"), 120 + Math.random() * 160);
      setTimeout(glitchOnce, 1800 + Math.random() * 3200);
    };
    setTimeout(glitchOnce, 2200);
    portrait.addEventListener("mouseenter", () => portrait.classList.add("is-glitching"));
    portrait.addEventListener("mouseleave", () => portrait.classList.remove("is-glitching"));
  }

  /* ---------- kernel panic trigger ----------
     typing → crash wave (glitch rings + error fragments + noise bands, full screen)
     → crash dump box → 7.1 allies ROLLBACK / 7.2 enemies INJECT stamps */
  const panicBtn = $("#panicBtn"), panicStatus = $("#panicStatus");
  const fx = $("#crashFx"), fxg = fx.getContext("2d"), dump = $("#crashDump"), crashR = $("#crashR");
  const sides = $$(".panic__side"), BTN_LABEL = panicBtn.innerHTML;
  const GLYPHS = ["0xDEAD", "SIGKILL", "NULL", "ERR", "0x00", "SEGFAULT", "PANIC", "//", "0xFF", "OVERFLOW", "#!", "RST", "0xC0DE", "λ", "!!"];
  let panicBusy = false, actx = null;
  function crashSound() {           // short bit-crushed noise burst (only when SOUND ON)
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const len = actx.sampleRate * .7, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      let hold = 0, v = 0;
      for (let i = 0; i < len; i++) { if (hold-- <= 0) { v = Math.random() * 2 - 1; hold = 6 + (Math.random() * 30 | 0); } d[i] = v * Math.pow(1 - i / len, 2); }
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = .7; g.gain.value = .32;
      s.buffer = buf; s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
      const o = actx.createOscillator(), og = actx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(220, actx.currentTime); o.frequency.exponentialRampToValueAtTime(40, actx.currentTime + .5);
      og.gain.setValueAtTime(.08, actx.currentTime); og.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .55);
      o.connect(og); og.connect(actx.destination); o.start(); o.stop(actx.currentTime + .6);
    } catch (e) {}
  }
  function typeOut(text, done) {
    let i = 0;
    const step = () => { panicBtn.textContent = text.slice(0, ++i) + (i < text.length ? "_" : ""); if (i < text.length) setTimeout(step, 14); else done(); };
    step();
  }
  function crashWave() {
    const DPR = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    fx.width = W * DPR; fx.height = H * DPR; fx.classList.add("is-on");
    const b = panicBtn.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 60;
    const parts = Array.from({ length: W < 600 ? 40 : 80 }, () => {
      const a = Math.random() * Math.PI * 2, sp = 260 + Math.random() * 760;
      return { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        c: Math.random() < .5 ? "62,224,143" : Math.random() < .6 ? "255,63,164" : "236,235,230", s: 10 + Math.random() * 10, d: Math.random() * .25 };
    });
    let jit = [], t0 = performance.now(), last = t0;
    const ring = (r, col, ox, w, a) => {
      if (r <= 0) return;
      fxg.strokeStyle = `rgba(${col},${a})`; fxg.lineWidth = w; fxg.beginPath();
      for (let k = 0; k <= 96; k++) {
        const ang = k / 96 * Math.PI * 2, rr = r + (jit[k % 96] || 0);
        const x = cx + ox + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        k ? fxg.lineTo(x, y) : fxg.moveTo(x, y);
      }
      fxg.stroke();
    };
    const frame = now => {
      const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
      fxg.setTransform(DPR, 0, 0, DPR, 0, 0); fxg.clearRect(0, 0, W, H);
      if ((now | 0) % 3 === 0 || !jit.length) jit = Array.from({ length: 96 }, () => (Math.random() < .18 ? (Math.random() - .5) * 46 : (Math.random() - .5) * 6));
      const e1 = 1 - Math.pow(1 - Math.min(1, t / .9), 3), e2 = 1 - Math.pow(1 - Math.max(0, Math.min(1, (t - .15) / .95)), 3);
      const fade = Math.max(0, 1 - t / 1.25);
      /* noise bands sweeping the screen */
      if (t < .75) for (let k = 0; k < 7; k++) {
        const y = Math.random() * H, h = 2 + Math.random() * 26;
        fxg.fillStyle = `rgba(${Math.random() < .5 ? "62,224,143" : "255,63,164"},${(.08 + Math.random() * .16).toFixed(2)})`;
        fxg.fillRect(0, y, W, h);
        if (Math.random() < .4) { fxg.fillStyle = "rgba(236,235,230,.18)"; fxg.fillRect(Math.random() * W, y, 40 + Math.random() * 220, 2); }
      }
      /* shockwave: RGB-split glitch rings */
      fxg.globalCompositeOperation = "lighter";
      ring(e1 * maxR, "255,63,164", -6, 3, (fade * .9).toFixed(3));
      ring(e1 * maxR, "62,224,143", 6, 3, (fade * .9).toFixed(3));
      ring(e1 * maxR, "236,235,230", 0, 1.2, fade.toFixed(3));
      ring(e2 * maxR * .82, "62,224,143", 0, 1, (fade * .6).toFixed(3));
      /* inner glow at the origin */
      if (t < .5) { const gr = fxg.createRadialGradient(cx, cy, 0, cx, cy, 220 * (1 - t)); gr.addColorStop(0, `rgba(255,63,164,${(.5 * (1 - t * 2)).toFixed(3)})`); gr.addColorStop(1, "rgba(255,63,164,0)"); fxg.fillStyle = gr; fxg.fillRect(cx - 240, cy - 240, 480, 480); }
      /* error fragments */
      fxg.textAlign = "center";
      for (const p of parts) {
        if (t < p.d) continue;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97;
        const a = Math.max(0, 1 - (t - p.d) / 1.1);
        fxg.font = `700 ${p.s}px "JetBrains Mono", monospace`;
        fxg.fillStyle = `rgba(${p.c},${a.toFixed(3)})`; fxg.fillText(p.t, p.x, p.y);
      }
      fxg.globalCompositeOperation = "source-over";
      crashR.textContent = String(Math.round(Math.min(1, t / .9) * 100)).padStart(3, "0");
      if (t < 1.35) requestAnimationFrame(frame); else { fxg.clearRect(0, 0, W, H); fx.classList.remove("is-on"); }
    };
    requestAnimationFrame(frame);
  }
  function stamp(side, text) {
    let s = $(".panic__stamp", side);
    if (!s) { s = document.createElement("span"); s.className = "panic__stamp"; side.appendChild(s); }
    s.textContent = text; s.classList.remove("is-on"); void s.offsetWidth; s.classList.add("is-on");
  }
  panicBtn.addEventListener("click", () => {
    if (panicBusy) return;
    panicBusy = true; panicBtn.disabled = true; panicBtn.classList.add("is-running");
    panicStatus.className = "panic__status mono is-hot"; panicStatus.textContent = "executing…";
    sides.forEach(s => { s.classList.remove("is-rollback", "is-inject"); const st = $(".panic__stamp", s); if (st) st.classList.remove("is-on"); });
    typeOut("> kernel_panic --radius=100m ... SYSTEM CRASH WAVE", () => {
      crashSound();
      if (!reduce) {
        crashWave();
        dump.classList.remove("is-on"); void dump.offsetWidth; dump.classList.add("is-on");
        document.body.classList.remove("is-crash"); void document.body.offsetWidth; document.body.classList.add("is-crash");
        setTimeout(() => document.body.classList.remove("is-crash"), 950);
      } else { crashR.textContent = "100"; }
      panicStatus.textContent = "crash wave · r = 100m";
      setTimeout(() => {
        if (sides[0]) { sides[0].classList.add("is-rollback"); stamp(sides[0], "ROLLBACK · 상태이상 해제"); }
        if (sides[1]) { sides[1].classList.add("is-inject"); stamp(sides[1], "CANCELLED · 1 ROUND LAG"); }
        panicStatus.className = "panic__status mono is-ok"; panicStatus.textContent = "아군 롤백 완료 · 적군 행동 강제 캔슬";
      }, reduce ? 0 : 1050);
      setTimeout(() => {
        panicBtn.innerHTML = BTN_LABEL; panicBtn.disabled = false; panicBtn.classList.remove("is-running"); panicBusy = false;
        if (sides[1]) sides[1].classList.remove("is-inject");
      }, reduce ? 300 : 3200);
    });
  });

  /* ---------- hotfix simulator ----------
     The screen is a 15.625 x 12.5 m patch of ground (5:4). Click anywhere, or on an ally,
     and the cube is thrown from YOU to that point; the field opens where it lands. */
  const sim = $("#sim"), field = $("#simField"), dEl = $("#simD"), nEl = $("#simN"), sEl = $("#simS"), cEl = $("#simC");
  const screen = $("#simScreen"), ghost = $("#simGhost"), shot = $("#simThrow"), me = $(".sim__me");
  const allies = $$(".sim__ally"), hintEl = $("#simHint");
  const deployBtn = $("#simDeploy"), resetBtn = $("#simReset");
  const W_M = 15.625, H_M = 12.5;            // screen size in metres
  let uses = 0, resetting = false, at = { x: 50, y: 50 }, flying = null;
  const diameter = n => Math.max(4, 10 - Math.floor((n - 1) / 2));
  const posOf = el => ({ x: parseFloat(el.style.getPropertyValue("--x")), y: parseFloat(el.style.getPropertyValue("--y")) });
  const metres = (a, b) => Math.hypot((a.x - b.x) * W_M / 100, (a.y - b.y) * H_M / 100);
  const render = () => {
    const d = uses ? diameter(uses) : 10;
    field.style.setProperty("--d", d);
    [field, ghost].forEach(el => { el.style.setProperty("--x", at.x); el.style.setProperty("--y", at.y); });
    dEl.textContent = d;
    nEl.textContent = uses;
    field.classList.toggle("is-on", uses > 0 && !flying);
    let n = 0;
    allies.forEach(a => {
      const inside = uses > 0 && !flying && metres(posOf(a), at) <= d / 2;
      a.classList.toggle("is-in", inside); if (inside) n++;
    });
    cEl.textContent = n;
    if (!resetting) sEl.textContent = uses === 0 ? "READY" : uses >= 2 ? "UNSTABLE" : "ACTIVE";
    resetBtn.disabled = resetting || uses === 0;
    deployBtn.disabled = resetting;
  };
  function throwTo(target) {
    if (resetting) { hintEl.textContent = "> rebooting… 시전자 무방비 상태"; sim.classList.remove("is-used"); return; }
    uses++;
    sim.classList.add("is-used");
    at = { x: Math.min(97, Math.max(3, target.x)), y: Math.min(97, Math.max(3, target.y)) };
    if (flying) flying.cancel();
    field.classList.remove("is-on"); void field.offsetWidth;
    if (reduce || !shot.animate) { flying = null; render(); return; }
    const r = screen.getBoundingClientRect(), from = posOf(me);
    const px = p => [p.x / 100 * r.width - 7, p.y / 100 * r.height - 7];
    const [x0, y0] = px(from), [x1, y1] = px(at);
    const lift = Math.min(90, 30 + Math.hypot(x1 - x0, y1 - y0) * .25);   // arc height
    flying = shot.animate([
      { transform: `translate(${x0}px,${y0}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px,${(y0 + y1) / 2 - lift}px) rotate(270deg)`, opacity: 1 },
      { transform: `translate(${x1}px,${y1}px) rotate(540deg)`, opacity: 1 }
    ], { duration: 420, easing: "cubic-bezier(.3,.1,.5,1)" });
    render();
    const mine = flying;
    mine.onfinish = () => { if (flying === mine) { flying = null; render(); } };
  }
  screen.addEventListener("click", e => {
    if (e.target.closest(".sim__ally")) return;
    const r = screen.getBoundingClientRect();
    throwTo({ x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 });
  });
  allies.forEach(a => a.addEventListener("click", () => throwTo(posOf(a))));
  deployBtn.addEventListener("click", () => {
    const ps = allies.map(posOf);
    throwTo({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length });
  });
  resetBtn.addEventListener("click", () => {
    if (resetting || !uses) return;
    resetting = true; sim.classList.add("is-reset");
    let left = 300;
    const loop = setInterval(() => {
      left -= 6;
      const m = Math.max(0, left);
      sEl.textContent = "VULNERABLE " + Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
      if (left <= 0) {
        clearInterval(loop); resetting = false; uses = 0; sim.classList.remove("is-reset");
        hintEl.textContent = "> reboot 완료 · 다시 던질 수 있습니다"; sim.classList.remove("is-used");
        render();
      }
    }, 100);
    render();
  });
  render();

  /* ---------- oath word reveal ---------- */
  const oath = $("#oath");
  const words = oath.textContent.trim().split(/\s+/);
  oath.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(" ");
  const ws = $$(".w", oath);
  function oathUpdate() {
    const r = oath.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
    const n = Math.round(p * ws.length);
    ws.forEach((w, i) => w.classList.toggle("on", reduce || i < n));
  }
  onScroll();
  /* ---------- 선관 링크: 주소를 넣기 전(href="#")에는 눌러도 움직이지 않게 ---------- */
  document.querySelectorAll('.link__a, .rel__link').forEach(a => a.addEventListener("click", e => {
    if (a.getAttribute("href") === "#") e.preventDefault();
  }));
})();
