/* Flip Score — placar de tênis de mesa (baseado no motor de flip do FlipClock Timer) */
let muteFlipAudio = false;

const scoreACard = document.getElementById("score-a-card");
const scoreBCard = document.getElementById("score-b-card");
const holderA = document.getElementById("holder-a");
const holderB = document.getElementById("holder-b");
const gamesACard = document.getElementById("games-a-card");
const gamesBCard = document.getElementById("games-b-card");
const nameA = document.getElementById("name-a");
const nameB = document.getElementById("name-b");
const bestOfSelect = document.getElementById("best-of-select");
const sizeSlider = document.getElementById("size_range_slider");
const clockContainer = document.querySelector(".container");
const menuToggle = document.getElementById("menu_toggle");
const menuClose = document.getElementById("menu_close");
const controls = document.getElementById("controls");
const resetBtn = document.getElementById("reset-btn");
const swapServeBtn = document.getElementById("swap-serve-btn");
const winnerOverlay = document.getElementById("winner-overlay");
const winnerName = document.getElementById("winner-name");
const winnerCloseBtn = document.getElementById("winner-close-btn");

const state = {
  points: { a: 0, b: 0 },
  games: { a: 0, b: 0 },
  firstServer: "a",
  manualServer: null,
  bestOf: 3,
};

/* ---------- Sound: WebAudio synthesized flip tick + fanfare de vitória ---------- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function playTick() {
  if (muteFlipAudio) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const variants = [1900, 2300, 2600, 3100, 1700];
    osc.frequency.value = variants[Math.floor(Math.random() * variants.length)];
    osc.type = "square";
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch (e) { /* audio indisponível */ }
}
function playWinChime() {
  if (muteFlipAudio) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime;
    [880, 1108, 1318].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.4);
    });
  } catch (e) { /* noop */ }
}

/* ---------- Flip rendering (mesma técnica do timer original) ---------- */
function flip(flipCard, newText) {
  const topHalf = flipCard.querySelector(".top");
  const startText = topHalf.textContent;
  if (newText === startText) return;
  const bottomHalf = flipCard.querySelector(".bottom");
  const topFlip = document.createElement("div");
  topFlip.classList.add("top-flip");
  const bottomFlip = document.createElement("div");
  bottomFlip.classList.add("bottom-flip");
  topHalf.textContent = startText;
  bottomHalf.textContent = startText;
  topFlip.textContent = startText;
  bottomFlip.textContent = newText;
  topFlip.addEventListener("animationstart", () => { topHalf.textContent = newText; });
  topFlip.addEventListener("animationend", () => { topFlip.remove(); });
  bottomFlip.addEventListener("animationend", () => {
    bottomHalf.textContent = newText;
    bottomFlip.remove();
  });
  flipCard.append(topFlip, bottomFlip);
}
function paintScoreImmediate(card, text) {
  card.querySelector(".top").textContent = text;
  card.querySelector(".bottom").textContent = text;
}

/* ---------- Regras de saque do tênis de mesa (ITTF): troca a cada 2 pontos, e a cada 1 ponto em 10x10+ ---------- */
function otherPlayer(p) {
  return p === "a" ? "b" : "a";
}
function currentServer() {
  if (state.manualServer) return state.manualServer;
  const { a, b } = state.points;
  const total = a + b;
  const deuce = a >= 10 && b >= 10;
  const turnIndex = deuce ? total % 2 : Math.floor(total / 2) % 2;
  return turnIndex === 0 ? state.firstServer : otherPlayer(state.firstServer);
}

/* ---------- Render ---------- */
function render() {
  flip(scoreACard, String(state.points.a).padStart(2, "0"));
  flip(scoreBCard, String(state.points.b).padStart(2, "0"));
  flip(gamesACard, String(state.games.a));
  flip(gamesBCard, String(state.games.b));
  const server = currentServer();
  holderA.classList.toggle("serving", server === "a");
  holderB.classList.toggle("serving", server === "b");
}

/* ---------- Pontuação ---------- */
function addPoint(player, delta) {
  ensureAudio();
  const next = state.points[player] + delta;
  if (next < 0) return;
  state.points[player] = next;
  state.manualServer = null;
  playTick();
  render();
  checkGameWinner();
}

function checkGameWinner() {
  const { a, b } = state.points;
  const winScore = 11;
  const won = (a >= winScore || b >= winScore) && Math.abs(a - b) >= 2;
  if (!won) return;
  const winner = a > b ? "a" : "b";
  state.games[winner]++;
  const gamesNeeded = Math.floor(state.bestOf / 2) + 1;
  if (state.games[winner] >= gamesNeeded) {
    showMatchWinner(winner);
  } else {
    state.firstServer = otherPlayer(state.firstServer);
    state.points = { a: 0, b: 0 };
    setTimeout(render, 500);
  }
}

function showMatchWinner(winner) {
  setTimeout(() => {
    winnerName.textContent = winner === "a" ? nameA.value : nameB.value;
    winnerOverlay.classList.remove("hide");
    playWinChime();
  }, 500);
}

function resetMatch() {
  state.points = { a: 0, b: 0 };
  state.games = { a: 0, b: 0 };
  state.firstServer = "a";
  state.manualServer = null;
  winnerOverlay.classList.add("hide");
  paintScoreImmediate(scoreACard, "00");
  paintScoreImmediate(scoreBCard, "00");
  paintScoreImmediate(gamesACard, "0");
  paintScoreImmediate(gamesBCard, "0");
  render();
}

document.querySelectorAll(".score-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const player = btn.dataset.player;
    const delta = parseInt(btn.dataset.delta, 10);
    addPoint(player, delta);
  });
});
swapServeBtn.addEventListener("click", () => {
  state.manualServer = otherPlayer(currentServer());
  render();
});
resetBtn.addEventListener("click", resetMatch);
winnerCloseBtn.addEventListener("click", resetMatch);
bestOfSelect.addEventListener("change", () => {
  state.bestOf = parseInt(bestOfSelect.value, 10);
});

/* ---------- Size slider (desativado no mobile: o layout se ajusta sozinho) ---------- */
const isMobile = window.matchMedia("(max-width: 900px)").matches;
function clockSize() {
  clockContainer.style.transform = "scale(" + sizeSlider.value / 100 + ")";
  localStorage.setItem("clock_scale", sizeSlider.value);
}
if (!isMobile) {
  sizeSlider.addEventListener("input", clockSize);
  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("clock_scale");
    if (saved) {
      sizeSlider.value = saved;
      clockContainer.style.transform = "scale(" + saved / 100 + ")";
    }
  });
}

/* ---------- Menu show/hide (começa fechado) ---------- */
menuToggle.style.display = "block";
menuClose.style.display = "none";
controls.classList.add("close");
menuToggle.onclick = () => {
  menuToggle.style.display = "none";
  menuClose.style.display = "block";
  controls.classList.remove("close");
  controls.style.display = "flex";
};
menuClose.onclick = closeMenu;
function closeMenu() {
  menuToggle.style.display = "block";
  menuClose.style.display = "none";
  controls.classList.add("close");
}
document.addEventListener("click", (e) => {
  if (controls.classList.contains("close")) return;
  if (e.target.closest("#controls") || e.target.closest(".menu")) return;
  closeMenu();
});

/* ---------- Light / dark (automático: segue o navegador) ---------- */
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: light)");
function applyColorScheme() {
  const mode = colorSchemeQuery.matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", mode);
  applyCustomThemeColors();
}
function applyStoredThemeMode() {
  applyColorScheme();
}
if (typeof colorSchemeQuery.addEventListener === "function") {
  colorSchemeQuery.addEventListener("change", applyColorScheme);
} else if (typeof colorSchemeQuery.addListener === "function") {
  colorSchemeQuery.addListener(applyColorScheme);
}

/* ---------- Custom color themes ---------- */
const THEMES = {
  theme1: { dark: ["#0F140F", "#1A1F1A", "#C4EBC1"], light: ["#E8FFE8", "#D6F5D6", "#546654"] },
  theme2: { dark: ["#131315", "#1B1C20", "#C5C8F8"], light: ["#EFF2FF", "#E4E7FE", "#222843"] },
  theme3: { dark: ["#1B1616", "#271E1E", "#EF6666"], light: ["#FFF4F4", "#FFEDED", "#FF8F8F"] },
  theme4: { dark: ["#16120B", "#221E17", "#FFAC45"], light: ["#FFF7EC", "#FFEED6", "#FDC97B"] },
  theme5: { dark: ["#131519", "#1A1E23", "#CCE1FF"], light: ["#F5F9FF", "#E4EFFF", "#2C3440"] },
  theme6: { dark: ["#0D0F11", "#14161A", "#FFD458"], light: ["#FFFDF4", "#FFF8E1", "#FFDB57"] },
  theme7: { dark: ["#1A171C", "#221D23", "#E3CEEC"], light: ["#FCF5FF", "#F8E8FF", "#574260"] },
  theme8: { dark: ["#181B19", "#1E2320", "#BEEBD2"], light: ["#F5FFFA", "#E6F8EE", "#5F8873"] },
};
function applyCustomThemeColors() {
  const current = localStorage.getItem("current_theme");
  const mode = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  if (!current || !THEMES[current]) return;
  const [bg, holder, text] = THEMES[current][mode];
  document.body.style.setProperty("--background", bg);
  document.body.style.setProperty("--holder", holder);
  document.body.style.setProperty("--text", text);
}
document.querySelector(".default_theme").addEventListener("click", () => {
  localStorage.removeItem("current_theme");
  document.body.style.removeProperty("--background");
  document.body.style.removeProperty("--holder");
  document.body.style.removeProperty("--text");
});
Object.keys(THEMES).forEach((key) => {
  const el = document.querySelector("." + key);
  if (!el) return;
  el.addEventListener("click", () => {
    localStorage.setItem("current_theme", key);
    applyCustomThemeColors();
  });
});

/* ---------- Themes panel toggle ---------- */
const themesContainer = document.getElementsByClassName("themes_container")[0];
const themesToggle = document.getElementsByClassName("themes_toggle")[0];
const themesCloseToggle = document.getElementById("themes_close_toggle");
themesToggle.addEventListener("click", () => {
  themesContainer.classList.remove("close");
  themesContainer.style.display = "grid";
  themesToggle.style.display = "none";
  themesCloseToggle.style.display = "block";
});
themesCloseToggle.addEventListener("click", () => {
  themesContainer.classList.add("close");
  themesToggle.style.display = "block";
  themesCloseToggle.style.display = "none";
});

/* ---------- Fullscreen ---------- */
document.querySelector(".full").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen();
};

/* ---------- Init ---------- */
applyStoredThemeMode();
(function init() {
  paintScoreImmediate(scoreACard, "00");
  paintScoreImmediate(scoreBCard, "00");
  paintScoreImmediate(gamesACard, "0");
  paintScoreImmediate(gamesBCard, "0");
  render();
})();
