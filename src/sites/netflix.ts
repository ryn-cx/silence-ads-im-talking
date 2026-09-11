const AD_TIME_SELECTOR = '[data-uia="ads-info-time"]';
const MODAL_ID = "stmat-modal";
const POLL_INTERVAL_MS = 500;

/** Videos we muted, mapped to the muted state they had before we touched them. */
const previousMuted = new Map<HTMLVideoElement, boolean>();

let adActive = false;
let modal: HTMLDivElement | null = null;
/** Set when the user closes the cover; cleared when the ad break ends. */
let dismissed = false;

/** Netflix restores its own volume settings, so re-assert mute when it does. */
function reassertMute(event: Event): void {
  const video = event.currentTarget as HTMLVideoElement;
  if (adActive && !video.muted) {
    video.muted = true;
  }
}

function muteVideos(): void {
  for (const video of Array.from(document.querySelectorAll("video"))) {
    if (!previousMuted.has(video)) {
      previousMuted.set(video, video.muted);
      video.addEventListener("volumechange", reassertMute);
    }
    video.muted = true;
  }
}

/** Restore the muted state from before the ad, so an already-muted user stays muted. */
function restoreVideos(): void {
  for (const [video, wasMuted] of previousMuted) {
    video.removeEventListener("volumechange", reassertMute);
    video.muted = wasMuted;
  }
  previousMuted.clear();
}

/**
 * Styles are inline rather than in a stylesheet so nothing can leak into
 * Netflix's own page.
 */
function buildModal(): HTMLDivElement {
  const root = document.createElement("div");
  root.id = MODAL_ID;
  root.style.cssText = [
    "position: fixed",
    "inset: 0",
    "z-index: 2147483647",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    // Mostly opaque: enough to blot out the ad, but the player still shows
    // through faintly.
    "background: rgba(0, 0, 0, 0.9)",
    // A cover, not a control surface: never swallow the player's clicks.
    "pointer-events: none",
  ].join(";");

  const text = document.createElement("span");
  // "Ad Break" is roughly 4.2em wide, so 21vw spans ~88% of the width at any
  // aspect ratio; the vh cap stops it overflowing a short, wide window.
  text.style.cssText = [
    "font-family: sans-serif",
    "font-size: min(21vw, 60vh)",
    "font-weight: 700",
    "line-height: 1",
    "white-space: nowrap",
    "color: #fff",
  ].join(";");
  text.textContent = "Ad Break";

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Hide the ad break cover");
  close.textContent = "×";
  close.style.cssText = [
    "position: absolute",
    "top: 2vmin",
    "right: 2vmin",
    "width: 6vmin",
    "height: 6vmin",
    "padding: 0",
    "border: 0",
    "border-radius: 50%",
    "background: rgba(255, 255, 255, 0.15)",
    "color: #fff",
    "font-family: sans-serif",
    "font-size: 4vmin",
    "line-height: 1",
    "cursor: pointer",
    // The cover ignores pointer events, so opt this one control back in.
    "pointer-events: auto",
  ].join(";");
  close.addEventListener("click", () => {
    dismissed = true;
    root.remove();
  });

  root.append(text, close);
  modal = root;
  return root;
}

function showModal(): void {
  const root = modal ?? buildModal();

  // Fullscreen playback fullscreens the player container, so an element
  // outside of it would not be painted. Host the modal inside whatever
  // element is currently fullscreen.
  const host = document.fullscreenElement ?? document.body;
  if (root.parentElement !== host) {
    host.appendChild(root);
  }
}

/**
 * Netflix renders the ad counter only while an ad is playing, so its presence
 * is the whole signal. Note that the player's `active`/`passive`/`inactive`
 * class tracks control visibility, not playback state.
 */
function sync(): void {
  const adPlaying = document.querySelector(AD_TIME_SELECTOR) !== null;

  if (adPlaying) {
    adActive = true;
    muteVideos();
    if (!dismissed) {
      showModal();
    }
    return;
  }

  if (adActive) {
    adActive = false;
    dismissed = false;
    restoreVideos();
  }
  modal?.remove();
}

if (location.hostname === "www.netflix.com") {
  sync();

  // The counter re-renders every second, which keeps the observer honest; the
  // interval is a cheap safety net for renders we miss.
  new MutationObserver(sync).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  setInterval(sync, POLL_INTERVAL_MS);
  document.addEventListener("fullscreenchange", sync);
}
