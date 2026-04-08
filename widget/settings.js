(function () {
  // ─── Constants ────────────────────────────────────────────────────────────

  const AUTHOR = {
    name: "SirBepy",
    github: "https://github.com/sirbepy",
    youtube: "https://youtube.com/@sirbepy",
  };

  const FEEDBACK_URL = "https://forms.gle/AGPabTu624aMaayE7";
  const FALLBACK_THEMES = ["void", "glacier", "cosmo", "nebula"];
  const LS_KEY = "tabs-labs-theme";
  const LS_MODE_KEY = "tabs-labs-mode";
  const CDN_THEMES = "https://cdn.jsdelivr.net/gh/sirbepy/sirbepy-styleguide@main/themes/";

  // ─── DOM element references (set during renderPanel) ──────────────────────

  let elPanel, elBackdrop, elCogBtn, elCloseBtn;
  let elAppName, elAppDesc, elBuildTime, elThemeBtns, elModeBtns, elBgBtns;
  let _savedBodyOverflow = null;
  let _mediaQuery = null;

  // ─── 1. CSS Injection ─────────────────────────────────────────────────────

  function injectCSS() {
    const css = `
      .tl-cog {
        position: fixed; top: 1rem; right: 1rem; z-index: 9999;
      }
      .tl-backdrop {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.3); display: none;
      }
      .tl-backdrop.tl-open { display: block; }
      .tl-panel {
        position: fixed; top: 0; right: 0; height: 100vh; width: 300px;
        z-index: 10000;
        background: var(--color-surface, #1e1d2b);
        border-left: 1px solid var(--color-border, #2d2c44);
        backdrop-filter: blur(12px);
        transform: translateX(100%);
        transition: transform 0.25s ease;
        overflow-y: auto; padding: 1.5rem; box-sizing: border-box;
      }
      .tl-panel.tl-open { transform: translateX(0); }
      @media (max-width: 480px) {
        .tl-panel {
          width: 100%; height: 50vh; top: auto; bottom: 0; right: 0;
          border-left: none;
          border-top: 1px solid var(--color-border, #2d2c44);
          transform: translateY(100%);
        }
        .tl-panel.tl-open { transform: translateY(0); }
      }
      .tl-panel-header {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 1rem;
      }
      .tl-panel-header span {
        color: var(--color-text, #e2e0f0); font-size: 0.95rem; font-weight: 600;
      }
      .tl-close-btn {
        opacity: 0.7;
      }
      .tl-section-label {
        text-transform: uppercase; font-size: 0.7rem;
        letter-spacing: 0.08em;
        color: var(--color-text-muted, #6b6990);
        margin-top: 1.25rem; margin-bottom: 0.5rem;
      }
      .tl-app-name { font-weight: bold; color: var(--color-text, #e2e0f0); }
      .tl-app-desc, .tl-build-time {
        font-size: 0.8rem; color: var(--color-text-muted, #6b6990);
      }
      .tl-build-time { font-style: italic; }
      .tl-theme-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .tl-theme-btn {
        background: var(--color-surface-alt, #242334);
        border: 1px solid var(--color-border, #2d2c44);
        border-radius: var(--radius-badge, 6px);
        padding: 0.3rem 0.7rem; font-size: 0.8rem;
        cursor: pointer; color: var(--color-text, #e2e0f0);
      }
      .tl-theme-btn:hover { filter: brightness(1.2); }
      .tl-theme-btn.tl-active {
        border-color: var(--color-primary, #9d7dfc);
        color: var(--color-primary, #9d7dfc);
      }
      .tl-theme-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .tl-theme-error { font-size: 0.8rem; color: #f08a5d; }
      .tl-link-btn {
        background: var(--color-surface-alt, #242334);
        border: 1px solid var(--color-border, #2d2c44);
        border-radius: var(--radius-badge, 6px);
        padding: 0.3rem 0.7rem; font-size: 0.8rem;
        cursor: pointer; color: var(--color-text, #e2e0f0);
        text-decoration: none; display: inline-flex; align-items: center;
      }
      .tl-link-btn:hover { filter: brightness(1.2); }
      .tl-feedback-btn { width: 100%; justify-content: center; margin-top: 0.4rem; }
      .tl-about-name {
        font-weight: bold; color: var(--color-text, #e2e0f0); margin-bottom: 0.2rem;
      }
      .tl-about-meta {
        font-size: 0.8rem; color: var(--color-text-muted, #6b6990); margin-bottom: 0.5rem;
      }
      .tl-about-links { display: flex; gap: 0.4rem; }
      .tl-feedback-text { font-size: 0.8rem; color: var(--color-text-muted, #6b6990); }
      .tl-bg-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .tl-bg-btn {
        background: var(--color-surface-alt, #242334);
        border: 1px solid var(--color-border, #2d2c44);
        border-radius: var(--radius-badge, 6px);
        padding: 0.3rem 0.7rem; font-size: 0.8rem;
        cursor: pointer; color: var(--color-text, #e2e0f0);
      }
      .tl-bg-btn:hover { filter: brightness(1.2); }
      .tl-bg-btn.tl-active {
        border-color: var(--color-primary, #9d7dfc);
        color: var(--color-primary, #9d7dfc);
      }
      .tl-mode-btns { display: flex; gap: 0.4rem; }
      .tl-mode-btn {
        background: var(--color-surface-alt, #242334);
        border: 1px solid var(--color-border, #2d2c44);
        border-radius: var(--radius-badge, 6px);
        padding: 0.3rem 0.7rem; font-size: 0.8rem;
        cursor: pointer; color: var(--color-text, #e2e0f0);
        flex: 1; text-align: center;
      }
      .tl-mode-btn:hover { filter: brightness(1.2); }
      .tl-mode-btn.tl-active {
        border-color: var(--color-primary, #9d7dfc);
        color: var(--color-primary, #9d7dfc);
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── 2. Relative time helper ──────────────────────────────────────────────

  function getRelativeTime(utcDateString) {
    if (!utcDateString || String(utcDateString).includes("PLACEHOLDER")) {
      return "Local build";
    }
    const diff = Date.now() - new Date(utcDateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + " minutes ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " hours ago";
    const days = Math.floor(hours / 24);
    return days + " days ago";
  }

  // ─── 3. DOM rendering ─────────────────────────────────────────────────────

  function renderPanel() {
    // Backdrop
    elBackdrop = document.createElement("div");
    elBackdrop.className = "tl-backdrop";
    document.body.appendChild(elBackdrop);

    // Load Phosphor Icons if not already present
    if (!document.querySelector('script[src*="phosphor-icons"]')) {
      var phosphorScript = document.createElement("script");
      phosphorScript.src = "https://unpkg.com/@phosphor-icons/web";
      document.head.appendChild(phosphorScript);
    }

    // Cog button
    elCogBtn = document.createElement("button");
    elCogBtn.className = "tl-cog btn-icon";
    elCogBtn.type = "button";
    var cogIcon = document.createElement("i");
    cogIcon.className = "ph ph-gear";
    elCogBtn.appendChild(cogIcon);
    document.body.appendChild(elCogBtn);

    // Panel
    elPanel = document.createElement("div");
    elPanel.className = "tl-panel";

    // Header
    const header = document.createElement("div");
    header.className = "tl-panel-header";
    const headerTitle = document.createElement("span");
    headerTitle.textContent = "Settings";
    elCloseBtn = document.createElement("button");
    elCloseBtn.className = "tl-close-btn btn-icon btn-icon-sm";
    elCloseBtn.type = "button";
    var closeIcon = document.createElement("i");
    closeIcon.className = "ph ph-x";
    elCloseBtn.appendChild(closeIcon);
    header.appendChild(headerTitle);
    header.appendChild(elCloseBtn);
    elPanel.appendChild(header);

    // APP section (hidden later if local build)
    var elAppSection = document.createElement("div");
    elAppSection.className = "tl-app-section";

    const appLabel = document.createElement("div");
    appLabel.className = "tl-section-label";
    appLabel.textContent = "APP";
    elAppSection.appendChild(appLabel);

    elAppName = document.createElement("div");
    elAppName.className = "tl-app-name";
    elAppName.textContent = "";
    elAppSection.appendChild(elAppName);

    elAppDesc = document.createElement("div");
    elAppDesc.className = "tl-app-desc";
    elAppSection.appendChild(elAppDesc);

    elBuildTime = document.createElement("div");
    elBuildTime.className = "tl-build-time";
    elAppSection.appendChild(elBuildTime);

    elPanel.appendChild(elAppSection);

    // THEME section
    const themeLabel = document.createElement("div");
    themeLabel.className = "tl-section-label";
    themeLabel.textContent = "THEME";
    elPanel.appendChild(themeLabel);

    elThemeBtns = document.createElement("div");
    elThemeBtns.className = "tl-theme-btns";
    elPanel.appendChild(elThemeBtns);

    // MODE section
    const modeLabel = document.createElement("div");
    modeLabel.className = "tl-section-label";
    modeLabel.textContent = "MODE";
    elPanel.appendChild(modeLabel);

    elModeBtns = document.createElement("div");
    elModeBtns.className = "tl-mode-btns";
    elPanel.appendChild(elModeBtns);

    renderModeButtons();

    // BACKGROUND section
    const bgLabel = document.createElement("div");
    bgLabel.className = "tl-section-label";
    bgLabel.textContent = "BACKGROUND";
    elPanel.appendChild(bgLabel);

    elBgBtns = document.createElement("div");
    elBgBtns.className = "tl-bg-btns";
    elPanel.appendChild(elBgBtns);

    renderBgButtons();

    // ABOUT section
    const aboutLabel = document.createElement("div");
    aboutLabel.className = "tl-section-label";
    aboutLabel.textContent = "ABOUT";
    elPanel.appendChild(aboutLabel);

    const aboutName = document.createElement("div");
    aboutName.className = "tl-about-name";
    aboutName.textContent = AUTHOR.name;
    elPanel.appendChild(aboutName);

    const aboutLinks = document.createElement("div");
    aboutLinks.className = "tl-about-links";

    const ghLink = document.createElement("a");
    ghLink.className = "tl-link-btn";
    ghLink.href = AUTHOR.github;
    ghLink.target = "_blank";
    ghLink.rel = "noopener";
    ghLink.textContent = "GitHub ↗";
    aboutLinks.appendChild(ghLink);

    const ytLink = document.createElement("a");
    ytLink.className = "tl-link-btn";
    ytLink.href = AUTHOR.youtube;
    ytLink.target = "_blank";
    ytLink.rel = "noopener";
    ytLink.textContent = "YouTube ↗";
    aboutLinks.appendChild(ytLink);

    elPanel.appendChild(aboutLinks);

    // FEEDBACK section
    const feedbackLabel = document.createElement("div");
    feedbackLabel.className = "tl-section-label";
    feedbackLabel.textContent = "FEEDBACK";
    elPanel.appendChild(feedbackLabel);

    const feedbackText = document.createElement("div");
    feedbackText.className = "tl-feedback-text";
    feedbackText.textContent =
      "Help improve this toolkit: share your thoughts.";
    elPanel.appendChild(feedbackText);

    const feedbackBtn = document.createElement("a");
    feedbackBtn.className = "tl-link-btn tl-feedback-btn";
    feedbackBtn.href = FEEDBACK_URL;
    feedbackBtn.target = "_blank";
    feedbackBtn.rel = "noopener";
    feedbackBtn.textContent = "Give Feedback ↗";
    elPanel.appendChild(feedbackBtn);

    document.body.appendChild(elPanel);
  }

  // ─── 4. Panel open / close ────────────────────────────────────────────────

  function openPanel() {
    renderBgButtons();
    elPanel.classList.add("tl-open");
    elBackdrop.classList.add("tl-open");
    if (window.innerWidth <= 480) {
      _savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  }

  function closePanel() {
    elPanel.classList.remove("tl-open");
    elBackdrop.classList.remove("tl-open");
    if (_savedBodyOverflow !== null) {
      document.body.style.overflow = _savedBodyOverflow;
      _savedBodyOverflow = null;
    }
  }

  function wireEvents() {
    elCogBtn.addEventListener("click", function () {
      if (elPanel.classList.contains("tl-open")) closePanel();
      else openPanel();
    });
    elCloseBtn.addEventListener("click", closePanel);
    elBackdrop.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && elPanel.classList.contains("tl-open"))
        closePanel();
    });
  }

  // ─── 5. Theme application ─────────────────────────────────────────────────

  async function applyTheme(name) {
    async function fetchCss(base) {
      const res = await fetch(base + "theme-" + name + ".css");
      if (!res.ok) throw new Error("fetch failed");
      return res.text();
    }

    let css;
    try {
      css = await fetchCss(CDN_THEMES);
    } catch (_) {
      let err = elThemeBtns.querySelector(".tl-theme-error");
      if (!err) {
        err = document.createElement("div");
        err.className = "tl-theme-error";
        elThemeBtns.appendChild(err);
      }
      err.textContent = '⚠ Could not load theme "' + name + '".';
      return;
    }

    let el = document.getElementById("tl-active-theme");
    if (el) {
      el.textContent = css;
    } else {
      el = document.createElement("style");
      el.id = "tl-active-theme";
      el.textContent = css;
      document.head.appendChild(el);
    }
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem(LS_KEY, name);
    const prev = elThemeBtns.querySelector(".tl-theme-error");
    if (prev) prev.remove();
  }

  // ─── 6. Theme button rendering ────────────────────────────────────────────

  function renderThemeButtons(themes) {
    elThemeBtns.innerHTML = "";

    if (!themes || themes.length === 0) {
      const err = document.createElement("div");
      err.className = "tl-theme-error";
      err.textContent =
        "⚠ Themes not found. Copy manually from:\ngithub.com/sirbepy/sirbepy-styleguide/themes";
      elThemeBtns.appendChild(err);
      return;
    }

    const active = localStorage.getItem(LS_KEY) || "void";
    themes.forEach(function (name) {
      const btn = document.createElement("button");
      btn.className = "tl-theme-btn";
      btn.type = "button";
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      btn.textContent = name === active ? label + " ✓" : label;
      if (name === active) btn.classList.add("tl-active");
      btn.addEventListener("click", function () {
        applyTheme(name).then(function () {
          renderThemeButtons(themes);
        });
      });
      elThemeBtns.appendChild(btn);
    });
  }

  // ─── 6b. Mode logic ───────────────────────────────────────────────────────

  function getResolvedMode(mode) {
    if (mode === "auto") {
      return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    return mode;
  }

  function applyMode(mode) {
    localStorage.setItem(LS_MODE_KEY, mode);
    var resolved = getResolvedMode(mode);
    if (resolved === "light") {
      document.documentElement.setAttribute("data-mode", "light");
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
    renderModeButtons();
  }

  function renderModeButtons() {
    if (!elModeBtns) return;
    elModeBtns.innerHTML = "";
    var active = localStorage.getItem(LS_MODE_KEY) || "auto";
    var modes = [
      { key: "dark", label: "Dark" },
      { key: "light", label: "Light" },
      { key: "auto", label: "Auto" },
    ];
    modes.forEach(function (m) {
      var btn = document.createElement("button");
      btn.className = "tl-mode-btn";
      btn.type = "button";
      btn.textContent = m.key === active ? m.label + " ✓" : m.label;
      if (m.key === active) btn.classList.add("tl-active");
      btn.addEventListener("click", function () {
        applyMode(m.key);
      });
      elModeBtns.appendChild(btn);
    });
  }

  function renderBgButtons() {
    if (!elBgBtns || !window.BEPY_BG) return;
    elBgBtns.innerHTML = "";
    var variants = window.BEPY_BG.getVariants();
    var active = window.BEPY_BG.getActive();
    variants.forEach(function (v) {
      var btn = document.createElement("button");
      btn.className = "tl-bg-btn";
      btn.type = "button";
      btn.textContent = v.key === active ? v.label + " \u2713" : v.label;
      if (v.key === active) btn.classList.add("tl-active");
      btn.addEventListener("click", function () {
        window.BEPY_BG.set(v.key);
        renderBgButtons();
      });
      elBgBtns.appendChild(btn);
    });
  }

  function initModeListener() {
    _mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    _mediaQuery.addEventListener("change", function () {
      if ((localStorage.getItem(LS_MODE_KEY) || "auto") === "auto") {
        applyMode("auto");
      }
    });
  }

  // ─── 7. Theme list fetch ──────────────────────────────────────────────────

  async function loadThemeList() {
    const cdnAvailable = (
      await Promise.all(
        FALLBACK_THEMES.map(function (name) {
          return fetch(CDN_THEMES + "theme-" + name + ".css").then(
            function (r) { return r.ok ? name : null; },
            function () { return null; },
          );
        }),
      )
    ).filter(Boolean);

    renderThemeButtons(cdnAvailable);
  }

  // ─── 8. Restore saved theme (fire-and-forget) ─────────────────────────────

  function restoreSavedTheme() {
    const saved = localStorage.getItem(LS_KEY) || "void";

    function applyCss(css) {
      let el = document.getElementById("tl-active-theme");
      if (el) {
        el.textContent = css;
      } else {
        el = document.createElement("style");
        el.id = "tl-active-theme";
        el.textContent = css;
        document.head.appendChild(el);
      }
      document.documentElement.setAttribute("data-theme", saved);
    }

    fetch(CDN_THEMES + "theme-" + saved + ".css")
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(applyCss)
      .catch(function () {});

    // Restore saved mode
    var savedMode = localStorage.getItem(LS_MODE_KEY) || "auto";
    var resolved = getResolvedMode(savedMode);
    if (resolved === "light") {
      document.documentElement.setAttribute("data-mode", "light");
    } else {
      document.documentElement.removeAttribute("data-mode");
    }
  }

  // ─── 9. App info fetch ────────────────────────────────────────────────────

  async function loadAppInfo() {
    let appName, appDesc;
    try {
      const pkg = await fetch("/package.json").then(function (r) {
        return r.json();
      });
      appName = pkg.name || "";
      appDesc = pkg.description || "";
    } catch (_) {
      appName =
        window.PROJECT_NAME && !window.PROJECT_NAME.includes("PLACEHOLDER")
          ? window.PROJECT_NAME
          : "";
      appDesc = "";
    }
    elAppName.textContent = appName || "";
    elAppDesc.textContent = appDesc;
  }

  // ─── 10. Build info (synchronous) ─────────────────────────────────────────

  function populateBuildInfo() {
    const ts = window.BUILD_TIMESTAMP;
    const rel = getRelativeTime(ts);
    elBuildTime.textContent = "Built: " + rel;
    if (rel === "Local build") {
      var appSection = document.querySelector(".tl-app-section");
      if (appSection) appSection.style.display = "none";
    }
  }

  // ─── 11. Init ─────────────────────────────────────────────────────────────

  async function init() {
    injectCSS();
    renderPanel();
    wireEvents();
    restoreSavedTheme();
    initModeListener();
    populateBuildInfo();
    await loadAppInfo();
    await loadThemeList();
  }

  init();
})();
