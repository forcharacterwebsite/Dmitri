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
  const revealTargets = $$(".sec__head, .ident > *, .look > *, .persona__keys, .hp, .card, .lhs__col, .stats > *, .skill, .panic > *, .hotfix > *, .trait, .inv__item, .link > *, .oath__label");
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

  /* ---------- kernel panic trigger ---------- */
  $("#panicBtn").addEventListener("click", () => {
    if (reduce) return;
    document.body.classList.remove("is-crash");
    void document.body.offsetWidth;
    document.body.classList.add("is-crash");
    setTimeout(() => document.body.classList.remove("is-crash"), 950);
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
