(function () {
  // ─── Config ───────────────────────────────────────────────────────────────
  // Disable:        set window.BEPY_BACKGROUND = false before this script
  // Custom pattern: set window.BEPY_BG_PATTERN = 'path/to/pattern.svg' before this script

  if (window.BEPY_BACKGROUND === false) return;

  var CDN = "https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/widget/";
  var patternUrl = window.BEPY_BG_PATTERN || (CDN + "background_pattern.svg");

  // ─── Styles ───────────────────────────────────────────────────────────────

  var css = `
    html, body { background: transparent !important; }

    #bepy-bg {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }

    #bepy-bg-fill {
      position: relative;
      width: 100%;
      height: 100%;
      background: radial-gradient(
        ellipse at 50% 60%,
        color-mix(in srgb, var(--color-primary, #9d7dfc) 70%, white) 0%,
        color-mix(in srgb, var(--color-primary, #9d7dfc) 30%, black) 100%
      );
    }

    #bepy-bg-pattern {
      position: absolute;
      inset: 0;
      background-image: url("${patternUrl}");
      background-size: 10%;
      opacity: 0.08;
      animation: bepy-pan 180s linear infinite;
      will-change: background-position;
    }

    @keyframes bepy-pan {
      0%   { background-position: 0% 0%; }
      100% { background-position: 100% -300%; }
    }

    #bepy-bg-vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(
        circle,
        transparent 55%,
        color-mix(in srgb, var(--color-primary, #9d7dfc) 20%, black) 100%
      );
    }
  `;

  var style = document.createElement("style");
  style.id = "bepy-bg-style";
  style.textContent = css;
  document.head.appendChild(style);

  // ─── DOM ──────────────────────────────────────────────────────────────────

  var bg       = document.createElement("div"); bg.id = "bepy-bg";
  var fill     = document.createElement("div"); fill.id = "bepy-bg-fill";
  var pattern  = document.createElement("div"); pattern.id = "bepy-bg-pattern";
  var vignette = document.createElement("div"); vignette.id = "bepy-bg-vignette";

  fill.appendChild(pattern);
  fill.appendChild(vignette);
  bg.appendChild(fill);

  // ─── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    document.body.insertBefore(bg, document.body.firstChild);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
