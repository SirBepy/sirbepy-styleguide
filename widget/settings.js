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

  // ─── DOM element references (set during renderPanel) ──────────────────────

  let elPanel, elBackdrop, elCogBtn, elCloseBtn;
  let elAppName, elAppDesc, elBuildTime, elThemeBtns;
  let _savedBodyOverflow = null;

  // ─── 1. CSS Injection ─────────────────────────────────────────────────────

  function injectCSS() {
    const css = `
      .tl-cog {
        position: fixed; top: 1rem; right: 1rem; z-index: 9999;
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--color-surface, #1e1d2b);
        border: 1px solid var(--color-border, #2d2c44);
        color: var(--color-text, #e2e0f0);
        cursor: pointer; font-size: 18px;
        display: flex; align-items: center; justify-content: center;
      }
      .tl-cog:hover {
        background: var(--color-primary, #9d7dfc); color: #fff;
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
      .tl-close-btn {
        background: transparent; border: none; cursor: pointer;
        border-radius: 50%; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        color: var(--color-text, #e2e0f0); font-size: 16px;
      }
      .tl-close-btn:hover {
        background: var(--color-primary, #9d7dfc); color: #fff;
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

    // Cog button
    elCogBtn = document.createElement("button");
    elCogBtn.className = "tl-cog";
    elCogBtn.type = "button";
    elCogBtn.textContent = "⚙️";
    document.body.appendChild(elCogBtn);

    // Panel
    elPanel = document.createElement("div");
    elPanel.className = "tl-panel";

    // Header
    const header = document.createElement("div");
    header.className = "tl-panel-header";
    const headerTitle = document.createElement("span");
    headerTitle.textContent = "⚙️ Settings";
    elCloseBtn = document.createElement("button");
    elCloseBtn.className = "tl-close-btn";
    elCloseBtn.type = "button";
    elCloseBtn.textContent = "×";
    header.appendChild(headerTitle);
    header.appendChild(elCloseBtn);
    elPanel.appendChild(header);

    // APP section
    const appLabel = document.createElement("div");
    appLabel.className = "tl-section-label";
    appLabel.textContent = "APP";
    elPanel.appendChild(appLabel);

    elAppName = document.createElement("div");
    elAppName.className = "tl-app-name";
    elAppName.textContent = "—";
    elPanel.appendChild(elAppName);

    elAppDesc = document.createElement("div");
    elAppDesc.className = "tl-app-desc";
    elPanel.appendChild(elAppDesc);

    elBuildTime = document.createElement("div");
    elBuildTime.className = "tl-build-time";
    elPanel.appendChild(elBuildTime);

    // THEME section
    const themeLabel = document.createElement("div");
    themeLabel.className = "tl-section-label";
    themeLabel.textContent = "THEME";
    elPanel.appendChild(themeLabel);

    elThemeBtns = document.createElement("div");
    elThemeBtns.className = "tl-theme-btns";
    elPanel.appendChild(elThemeBtns);

    // ABOUT section
    const aboutLabel = document.createElement("div");
    aboutLabel.className = "tl-section-label";
    aboutLabel.textContent = "ABOUT";
    elPanel.appendChild(aboutLabel);

    const aboutName = document.createElement("div");
    aboutName.className = "tl-about-name";
    aboutName.textContent = AUTHOR.name;
    elPanel.appendChild(aboutName);

    // const aboutMeta = document.createElement("div");
    // aboutMeta.className = "tl-about-meta";
    // aboutMeta.textContent = AUTHOR.company + " · " + AUTHOR.location;
    // elPanel.appendChild(aboutMeta);

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
      "Help improve this toolkit — share your thoughts.";
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
    try {
      const res = await fetch("/assets/themes/theme-" + name + ".css");
      if (!res.ok) throw new Error("fetch failed");
      const css = await res.text();
      let el = document.getElementById("tl-active-theme");
      if (el) {
        el.textContent = css;
      } else {
        el = document.createElement("style");
        el.id = "tl-active-theme";
        el.textContent = css;
        document.head.appendChild(el);
      }
      localStorage.setItem(LS_KEY, name);
      const prev = elThemeBtns.querySelector(".tl-theme-error");
      if (prev) prev.remove();
    } catch (_) {
      let err = elThemeBtns.querySelector(".tl-theme-error");
      if (!err) {
        err = document.createElement("div");
        err.className = "tl-theme-error";
        elThemeBtns.appendChild(err);
      }
      err.textContent = '⚠ Could not load theme "' + name + '".';
    }
  }

  // ─── 6. Theme button rendering ────────────────────────────────────────────

  function renderThemeButtons(themes) {
    elThemeBtns.innerHTML = "";

    if (!themes || themes.length === 0) {
      const err = document.createElement("div");
      err.className = "tl-theme-error";
      err.textContent =
        "⚠ Themes not found. Copy manually from:\ngithub.com/sirbepy/bepy-project-init/themes";
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

  // ─── 7. Theme list fetch ──────────────────────────────────────────────────

  async function loadThemeList() {
    try {
      const res = await fetch("/assets/themes/");
      if (res.ok) {
        const html = await res.text();
        const matches = html.match(/theme-([a-z0-9-]+)\.css/gi) || [];
        const names = matches.map(function (m) {
          return m.replace(/^theme-/i, "").replace(/\.css$/i, "");
        });
        const unique = names.filter(function (v, i, a) {
          return a.indexOf(v) === i;
        });
        if (unique.length > 0) {
          renderThemeButtons(unique);
          return;
        }
      }
    } catch (_) {}
    const available = (
      await Promise.all(
        FALLBACK_THEMES.map(function (name) {
          return fetch("/assets/themes/theme-" + name + ".css").then(
            function (r) {
              return r.ok ? name : null;
            },
            function () {
              return null;
            },
          );
        }),
      )
    ).filter(Boolean);
    renderThemeButtons(available);
  }

  // ─── 8. Restore saved theme (fire-and-forget) ─────────────────────────────

  function restoreSavedTheme() {
    const saved = localStorage.getItem(LS_KEY) || "void";
    fetch("/assets/themes/theme-" + saved + ".css")
      .then(function (r) {
        return r.ok ? r.text() : Promise.reject();
      })
      .then(function (css) {
        let el = document.getElementById("tl-active-theme");
        if (el) {
          el.textContent = css;
        } else {
          el = document.createElement("style");
          el.id = "tl-active-theme";
          el.textContent = css;
          document.head.appendChild(el);
        }
      })
      .catch(function () {});
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
    elAppName.textContent = appName || "—";
    elAppDesc.textContent = appDesc;
  }

  // ─── 10. Build info (synchronous) ─────────────────────────────────────────

  function populateBuildInfo() {
    const ts = window.BUILD_TIMESTAMP;
    const rel = getRelativeTime(ts);
    elBuildTime.textContent = "Built: " + rel;
  }

  // ─── 11. Init ─────────────────────────────────────────────────────────────

  async function init() {
    injectCSS();
    renderPanel();
    wireEvents();
    restoreSavedTheme();
    populateBuildInfo();
    await loadAppInfo();
    await loadThemeList();
  }

  init();
})();
