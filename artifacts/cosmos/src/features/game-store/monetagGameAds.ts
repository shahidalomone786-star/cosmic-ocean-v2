const MONETAG_SCRIPT_ID = 'monetag-game-store-script';
const MONETAG_SCRIPT_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE_ID = '271144';
const MONETAG_LOAD_TIMEOUT_MS = 1500;

let monetagLoadPromise: Promise<void> | null = null;

function existingMonetagScript(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>(
    `script#${MONETAG_SCRIPT_ID}, script[src="${MONETAG_SCRIPT_SRC}"][data-zone="${MONETAG_ZONE_ID}"]`,
  );
}

export function loadGameStoreMonetagAd(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  const existingScript = existingMonetagScript();
  if (existingScript?.dataset.loaded === 'true') return Promise.resolve();
  if (monetagLoadPromise) return monetagLoadPromise;

  monetagLoadPromise = new Promise<void>((resolve) => {
    const script = existingScript ?? document.createElement('script');
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      script.dataset.loaded = 'true';
      resolve();
    };

    const timeoutId = window.setTimeout(finish, MONETAG_LOAD_TIMEOUT_MS);

    script.addEventListener('load', () => {
      window.clearTimeout(timeoutId);
      finish();
    }, { once: true });

    script.addEventListener('error', () => {
      window.clearTimeout(timeoutId);
      finish();
    }, { once: true });

    if (!existingScript) {
      script.id = MONETAG_SCRIPT_ID;
      script.src = MONETAG_SCRIPT_SRC;
      script.dataset.zone = MONETAG_ZONE_ID;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      document.head.appendChild(script);
    }
  });

  return monetagLoadPromise;
}
