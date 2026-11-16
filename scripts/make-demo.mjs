/**
 * Records the demo animation shown in the README (docs/demo.gif).
 *
 *   npm run demo
 *
 * How it works:
 *  1. Loads the built extension in Chromium and takes real pictures of the
 *     popup in each state (web page, YouTube video, localhost).
 *  2. Places those pictures inside a drawn browser window, so the viewer can
 *     see which page and which click led to each popup.
 *  3. Photographs that window scene by scene and joins the frames into a GIF.
 *
 * The popups are the real extension. The browser window around them is a
 * drawing: an automated browser cannot photograph its own toolbar.
 */
import { chromium } from '@playwright/test';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const ROOT = path.resolve(import.meta.dirname, '..');
const EXTENSION_DIR = path.join(ROOT, '.output/chrome-mv3-e2e');
const OUTPUT = path.join(ROOT, 'docs/demo.gif');
/** Set DEMO_FRAMES_DIR to also save each frame as a PNG, for checking by eye. */
const FRAMES_DIR = process.env.DEMO_FRAMES_DIR;

const STAGE = { width: 760, height: 600 };
const POPUP_WIDTH = 300;

const PAGE_URL = 'https://example.com/blog/weekend-hiking-guide';
// "Me at the zoo", the first video uploaded to YouTube.
const VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const LOCAL_URL = 'http://localhost:3000/dashboard';

/** Stand-in for a YouTube watch page whose video is 83.4 seconds in. */
const FAKE_YOUTUBE_PAGE = `<!doctype html><title>Video</title>
<div id="movie_player"><video></video></div>
<script>document.querySelector('video').currentTime = 83.4;</script>`;

const dataUrl = (png) => `data:image/png;base64,${png.toString('base64')}`;

/** Step 1: real pictures of the popup, taken from the built extension. */
async function capturePopups() {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    colorScheme: 'light',
    viewport: { width: POPUP_WIDTH, height: 500 },
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  });

  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(worker.url()).host;
    await context.route('https://www.youtube.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: FAKE_YOUTUBE_PAGE }),
    );

    const videoTab = await context.newPage();
    await videoTab.goto(VIDEO_URL);
    const videoTabId = await worker.evaluate(
      'chrome.tabs.query({ url: "https://www.youtube.com/*" }).then((tabs) => tabs[0].id)',
    );

    const popup = await context.newPage();

    async function open(url, tabId) {
      const params = new URLSearchParams({ url });
      if (tabId != null) params.set('tabId', String(tabId));
      await popup.goto(`chrome-extension://${extensionId}/popup.html?${params}`);
      await popup.getByRole('img', { name: /QR code for/ }).waitFor();
    }

    /** Photograph the popup, cropped to its content. */
    async function shoot() {
      const { height } = await popup.locator('main').boundingBox();
      return popup.screenshot({
        clip: { x: 0, y: 0, width: POPUP_WIDTH, height: Math.ceil(height) },
      });
    }

    await open(PAGE_URL);
    const web = await shoot();

    await open(VIDEO_URL, videoTabId);
    const option = popup.getByRole('checkbox', { name: /Start at/ });
    const box = await option.boundingBox();
    const videoTicked = await shoot();
    await option.uncheck();
    const videoUnticked = await shoot();

    await open(LOCAL_URL);
    const local = await shoot();

    return {
      web,
      videoTicked,
      videoUnticked,
      local,
      /** Centre of the "Start at" checkbox, measured from the popup's top-left. */
      checkbox: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    };
  } finally {
    await context.close();
  }
}

/** Step 2: the drawn browser window the popup pictures are placed in. */
function stageHtml(icon) {
  return `<!doctype html>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; width: ${STAGE.width}px; height: ${STAGE.height}px; overflow: hidden;
         background: #dfe3e8; font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1a1a1a; }
  .window { position: absolute; inset: 12px; background: #fff; border-radius: 10px; overflow: hidden;
            border: 1px solid #c4c9d0; }
  .tabs { height: 36px; background: #e9ecf0; display: flex; align-items: center; gap: 7px; padding: 0 14px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #c9ced6; }
  .tab { margin-left: 10px; align-self: flex-end; height: 28px; padding: 5px 14px; background: #fff;
         border-radius: 8px 8px 0 0; font-size: 12px; max-width: 220px; white-space: nowrap; overflow: hidden; }
  .bar { height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-bottom: 1px solid #e3e6ea; }
  .address { flex: 1; height: 28px; border-radius: 14px; background: #f1f3f4; padding: 4px 14px;
             font-size: 13px; color: #3c4043; white-space: nowrap; overflow: hidden; }
  .icon { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; }
  .icon img { width: 20px; height: 20px; display: block; }
  .icon.pressed { background: #d2e3fc; }
  .content { position: absolute; top: 80px; left: 0; right: 0; bottom: 0; padding: 26px 30px; }
  .content > div { display: none; }
  .content > div.on { display: block; }
  .line { height: 10px; border-radius: 5px; background: #e6e8eb; margin: 12px 0; }
  h2 { margin: 0 0 18px; font-size: 22px; }
  .photo { width: 360px; height: 150px; border-radius: 8px; background: #cfe3d4; margin-bottom: 18px; }
  .player { width: 380px; height: 214px; border-radius: 8px; background: #111; position: relative; }
  .player .play { position: absolute; left: 50%; top: 46%; translate: -50% -50%; border: 20px solid transparent;
                  border-left: 32px solid #fff; border-right: 0; opacity: .85; }
  .player .track { position: absolute; left: 12px; right: 12px; bottom: 14px; height: 4px; background: #555; }
  .player .played { width: 35%; height: 100%; background: #f00; }
  .player .time { position: absolute; left: 12px; bottom: 24px; color: #fff; font-size: 12px; }
  .cards { display: flex; gap: 14px; }
  .card { width: 118px; height: 84px; border-radius: 8px; background: #eef1f5; padding: 12px; font-size: 12px; color: #5f6368; }
  .card b { display: block; font-size: 22px; color: #1a1a1a; }
  #popup { position: absolute; top: 86px; right: 14px; width: ${POPUP_WIDTH}px; border-radius: 10px;
           border: 1px solid #c4c9d0; box-shadow: 0 8px 28px rgba(0, 0, 0, .22); display: none; }
  #caption { position: absolute; left: 30px; bottom: 26px; max-width: 370px; padding: 10px 14px; border-radius: 10px;
             background: #1a56db; color: #fff; font-size: 15px; font-weight: 600; }
  #cursor { position: absolute; width: 22px; height: 22px; }
</style>
<div class="window">
  <div class="tabs"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div class="tab" id="tab"></div></div>
  <div class="bar">
    <div class="address" id="address"></div>
    <div class="icon" id="icon"><img src="${icon}" alt=""></div>
  </div>
  <div class="content">
    <div id="page-web"><h2>A weekend hiking guide</h2><div class="photo"></div>
      <div class="line" style="width:380px"></div><div class="line" style="width:340px"></div><div class="line" style="width:365px"></div></div>
    <div id="page-video"><div class="player"><i class="play"></i><span class="time">1:23 / 3:58</span>
      <div class="track"><div class="played"></div></div></div>
      <div class="line" style="width:300px;margin-top:18px"></div><div class="line" style="width:200px"></div></div>
    <div id="page-local"><h2>Dashboard</h2><div class="cards">
      <div class="card"><b>128</b>orders</div><div class="card"><b>42</b>drivers</div><div class="card"><b>7</b>alerts</div></div>
      <div class="line" style="width:380px;margin-top:22px"></div><div class="line" style="width:320px"></div></div>
  </div>
  <img id="popup" alt="">
  <div id="caption"></div>
</div>
<svg id="cursor" viewBox="0 0 22 22"><path d="M3 2l14 9-6.5 1.2L14 19l-2.6 1.3-3.4-6.9L3 18z" fill="#111" stroke="#fff" stroke-width="1.4"/></svg>
<script>
  window.show = (s) => {
    for (const el of document.querySelectorAll('.content > div')) el.classList.toggle('on', el.id === 'page-' + s.page);
    document.getElementById('tab').textContent = s.tab;
    document.getElementById('address').textContent = s.address;
    document.getElementById('icon').classList.toggle('pressed', !!s.popup);
    const popup = document.getElementById('popup');
    popup.style.display = s.popup ? 'block' : 'none';
    if (s.popup) popup.src = s.popup;
    document.getElementById('caption').textContent = s.caption;
    const cursor = document.getElementById('cursor');
    cursor.style.left = s.cursor.x + 'px';
    cursor.style.top = s.cursor.y + 'px';
  };
</script>`;
}

/** Step 3: play the scenes and join the photographs into a GIF. */
async function record(popups) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: STAGE });
  const icon = dataUrl(readFileSync(path.join(ROOT, 'public/icon/48.png')));
  await page.setContent(stageHtml(icon));

  // Where things are on the stage, for the cursor to point at.
  const iconBox = await page.locator('#icon').boundingBox();
  const onIcon = { x: iconBox.x + 12, y: iconBox.y + 14 };
  const resting = { x: 300, y: 330 };
  const halfway = { x: (resting.x + onIcon.x) / 2, y: (resting.y + onIcon.y) / 2 };
  // The popup sits 14px from the window's right edge and 86px from its top.
  const popupLeft = STAGE.width - 12 - 14 - POPUP_WIDTH;
  const onCheckbox = { x: popupLeft + popups.checkbox.x - 3, y: 12 + 86 + popups.checkbox.y - 2 };

  const web = {
    page: 'web',
    tab: 'A weekend hiking guide',
    address: 'example.com/blog/weekend-hiking-guide',
  };
  const video = {
    page: 'video',
    tab: 'Me at the zoo - YouTube',
    address: 'youtube.com/watch?v=jNQXAC9IVRw',
  };
  const local = { page: 'local', tab: 'Dashboard', address: 'localhost:3000/dashboard' };

  /** Each scene: what the stage shows, and how long the GIF holds it (ms). */
  const scenes = [
    [{ ...web, cursor: resting, caption: '1. Open any page' }, 1100],
    [{ ...web, cursor: halfway, caption: '2. Click ScanHop' }, 160],
    [{ ...web, cursor: onIcon, caption: '2. Click ScanHop' }, 500],
    [
      {
        ...web,
        cursor: onIcon,
        popup: dataUrl(popups.web),
        caption: '3. Scan the code with your phone camera',
      },
      3000,
    ],

    [{ ...video, cursor: resting, caption: 'On a YouTube video…' }, 1100],
    [{ ...video, cursor: onIcon, caption: 'On a YouTube video…' }, 500],
    [
      {
        ...video,
        cursor: onIcon,
        popup: dataUrl(popups.videoTicked),
        caption: '…the code is a YouTube app link that starts at 1:23',
      },
      3000,
    ],
    [
      {
        ...video,
        cursor: onCheckbox,
        popup: dataUrl(popups.videoTicked),
        caption: 'Untick to start from the beginning',
      },
      700,
    ],
    [
      {
        ...video,
        cursor: onCheckbox,
        popup: dataUrl(popups.videoUnticked),
        caption: 'Untick to start from the beginning',
      },
      2400,
    ],

    [{ ...local, cursor: onIcon, caption: 'On a localhost page…' }, 1000],
    [
      {
        ...local,
        cursor: onIcon,
        popup: dataUrl(popups.local),
        caption: '…ScanHop warns that your phone can’t reach it',
      },
      3000,
    ],
  ];

  const gif = GIFEncoder();
  if (FRAMES_DIR) mkdirSync(FRAMES_DIR, { recursive: true });

  for (const [index, [state, holdMs]] of scenes.entries()) {
    await page.evaluate(`show(${JSON.stringify(state)})`);
    // Wait until the popup picture has been decoded and drawn.
    await page.evaluate('document.getElementById("popup").decode().catch(() => {})');

    const png = await page.screenshot();
    if (FRAMES_DIR) writeFileSync(path.join(FRAMES_DIR, `frame-${index + 1}.png`), png);

    const { data, width, height } = PNG.sync.read(png);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: holdMs });
  }

  gif.finish();
  await browser.close();
  writeFileSync(OUTPUT, gif.bytes());
  return scenes.length;
}

const popups = await capturePopups();
const frames = await record(popups);
console.log(
  `docs/demo.gif: ${frames} frames, ${Math.round(readFileSync(OUTPUT).length / 1024)} kB`,
);
