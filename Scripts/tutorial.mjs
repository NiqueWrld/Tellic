import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../public/videos');
const FINAL_OUTPUT = path.resolve(OUTPUT_DIR, 'chat-portal.webm');
const APP_URL = 'https://chat.easyreception.co.za';

const user = {
  email: 'reviewer@easyreception.co.za',
  password: 'Reviewer321@',
};

// All narration lines — pre-generated as WAV files, played in-page for tab capture
const NARRATIONS = {
  intro: 'Welcome to the Easy Reception chat portal. This is a dedicated web app where business owners can monitor every WhatsApp conversation their AI receptionist handles. The reason this exists is simple. You need full visibility into what your AI is saying to your customers. Let\'s take a closer look.',
  loginPage: 'Here we have the login page. It\'s clean and straightforward. You\'ll see an email field, a password field, and a sign in button. Only authorized business owners can access their conversation data, keeping everything secure.',
  typingEmail: 'We\'re entering our email address. This is the same account used to set up the AI receptionist on the main Easy Reception dashboard.',
  typingPassword: 'Now entering the password. Once signed in, you\'ll be taken directly to your receptionists.',
  clickingSignIn: 'Clicking the sign in button now.',
  loggedIn: 'We\'re now signed in and can see our list of receptionists. Each card here represents an AI receptionist you\'ve created. If you have multiple businesses or departments, each one gets its own receptionist with its own conversation history.',
  openInbox: 'Let\'s click on the first receptionist to open its inbox. This is where all the WhatsApp conversations live.',
  inboxLoaded: 'The inbox is now loaded. On the left side, you can see the conversation list. Each entry shows the customer\'s phone number or name, along with a preview of the last message and a timestamp. This makes it easy to scan through recent activity and find specific conversations quickly.',
  openConvo: 'Let\'s open the first conversation to see the full message thread.',
  viewingMessages: 'Now we can see the complete conversation between a customer and the AI receptionist. Messages from the customer appear on one side, and the AI\'s responses on the other. Notice how the AI handles the interaction naturally, answering questions, providing information, and guiding the customer, all without any human intervention.',
  scrolling: 'Let\'s scroll up through this conversation to see how it started. Every single message is logged with timestamps. This is important for quality assurance, training, and understanding how customers interact with your business.',
  nextConvo: 'Let\'s check another conversation. Each one tells a different story. Some customers ask about services, others book appointments, and some need urgent help. The AI handles all of them.',
  browsingMore: 'Here\'s another conversation. You can see the AI adapting its responses based on the customer\'s needs. It provides pricing, availability, and confirms bookings, all automatically.',
  outro: 'That\'s the Easy Reception chat portal. It gives you complete transparency and control over your AI receptionist\'s conversations. Every message, every interaction, always accessible. Simple, powerful, and built to keep you informed.',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Generate a WAV file using Windows SAPI via PowerShell */
function generateTTS(text, outputPath) {
  const escaped = text.replace(/'/g, "''");
  const safePath = outputPath.replace(/\\/g, '\\\\');
  const ps = [
    'Add-Type -AssemblyName System.Speech',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    "try { $s.SelectVoice('Microsoft Mark') } catch { }",
    `$s.SetOutputToWaveFile('${safePath}')`,
    `$s.Speak('${escaped}')`,
    '$s.Dispose()',
  ].join('; ');
  execSync(`powershell -Command "${ps}"`);
}

/** Play a base64 WAV inside the page (captured by getDisplayMedia) */
async function playAudio(page, b64) {
  await page.evaluate((data) => new Promise((resolve) => {
    const audio = new Audio(`data:audio/wav;base64,${data}`);
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play();
  }), b64);
}

// ──────── Main ────────
(async () => {
  // Step 1 — Pre-generate ALL TTS clips
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const tmpDir = path.join(os.tmpdir(), 'easyreception-tts');
  mkdirSync(tmpDir, { recursive: true });

  console.log('Generating TTS audio clips...');
  const audioClips = {};
  for (const [key, text] of Object.entries(NARRATIONS)) {
    const wavPath = path.join(tmpDir, `${key}.wav`);
    generateTTS(text, wavPath);
    audioClips[key] = readFileSync(wavPath).toString('base64');
    unlinkSync(wavPath);
    console.log(`  ✓ ${key}`);
  }
  console.log('All clips ready.\n');

  // Step 2 — Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: [
      '--start-maximized',
      '--auto-accept-this-tab-capture',
      '--enable-usermedia-screen-capturing',
      '--autoplay-policy=no-user-gesture-required',
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();

  // Step 3 — Open login page
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' });
  console.log('Opened login page');

  // Step 4 — Start tab capture recording
  await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
    });
    window.__stream = stream;
    window.__chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) window.__chunks.push(e.data);
    };
    recorder.start();
    window.__recorder = recorder;
  });
  console.log('Recording started.\n');
  await sleep(1000);

  // ── Intro narration ──
  await playAudio(page, audioClips.intro);
  await sleep(1000);

  // ── Describe the login page ──
  await playAudio(page, audioClips.loginPage);
  await sleep(500);

  // ── Type email with narration ──
  await playAudio(page, audioClips.typingEmail);
  await sleep(300);
  await page.type('#email', user.email, { delay: 40 });
  console.log('Typed email');
  await sleep(500);

  // ── Type password with narration ──
  await playAudio(page, audioClips.typingPassword);
  await sleep(300);
  await page.type('#password', user.password, { delay: 40 });
  console.log('Typed password');
  await sleep(500);

  // ── Click sign in ──
  await playAudio(page, audioClips.clickingSignIn);
  await sleep(300);
  await page.click('button[type="submit"]');
  console.log('Clicked Sign In');

  // ── Wait for redirect ──
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  console.log('Logged in:', page.url());
  await sleep(1500);

  await playAudio(page, audioClips.loggedIn);
  await sleep(1500);

  // ── Open first receptionist ──
  await page.waitForSelector('a[href*="/receptionist"]', { timeout: 15000 }).catch(() => {});
  await sleep(1000);
  const receptionistLink = await page.$('a[href*="/receptionist"]');

  if (receptionistLink) {
    await playAudio(page, audioClips.openInbox);
    await sleep(500);
    await receptionistLink.click();
    console.log('Clicked first receptionist');

    await sleep(3000);
    console.log('Inbox loaded:', page.url());

    await playAudio(page, audioClips.inboxLoaded);
    await sleep(1500);

    // ── Browse specific conversations ──
    await page.waitForSelector('.overflow-y-auto button.w-full', { timeout: 15000 }).catch(() => {});
    await sleep(1000);

    const targetConvos = ['Sipho Nkosi', 'Thandi Mokoena'];

    for (let ci = 0; ci < targetConvos.length; ci++) {
      const name = targetConvos[ci];

      // Find the conversation button containing this contact name
      const btn = await page.evaluateHandle((targetName) => {
        const buttons = document.querySelectorAll('.overflow-y-auto button.w-full');
        for (const b of buttons) {
          if (b.textContent.includes(targetName)) return b;
        }
        return null;
      }, name);

      if (!btn || !(await btn.asElement())) {
        console.log(`  ⚠ Could not find conversation for ${name}`);
        continue;
      }

      // Narration for opening this conversation
      if (ci === 0) {
        await playAudio(page, audioClips.openConvo);
      } else {
        await playAudio(page, audioClips.nextConvo);
      }
      await sleep(500);

      await btn.asElement().click();
      console.log(`Opened conversation: ${name}`);
      await sleep(2000);

      // Narrate message view on the first conversation
      if (ci === 0) {
        await playAudio(page, audioClips.viewingMessages);
        await sleep(1500);
      }

      // ── Scroll UP through messages ──
      const containers = await page.$$('.overflow-y-auto');
      const messagesContainer = containers.length > 1 ? containers[1] : containers[0];
      if (messagesContainer) {
        // Start at the bottom
        await page.evaluate((el) => { el.scrollTop = el.scrollHeight; }, messagesContainer);
        await sleep(500);

        if (ci === 0) {
          await playAudio(page, audioClips.scrolling);
        }

        const scrollHeight = await page.evaluate((el) => el.scrollHeight, messagesContainer);
        const clientHeight = await page.evaluate((el) => el.clientHeight, messagesContainer);
        const scrollDistance = scrollHeight - clientHeight;
        const steps = 20;
        const stepSize = scrollDistance / steps;

        // Scroll from bottom to top
        for (let i = steps; i >= 0; i--) {
          await page.evaluate((el, top) => { el.scrollTop = top; }, messagesContainer, stepSize * i);
          await sleep(250);
        }
        console.log(`  Scrolled up through messages`);
      }

      await sleep(1500);
    }
  } else {
    console.log('No receptionists found');
  }

  // ── Outro ──
  await playAudio(page, audioClips.outro);
  await sleep(2000);

  // ── Stop recording & save ──
  try {
    const base64 = await page.evaluate(() => new Promise((resolve, reject) => {
      const recorder = window.__recorder;
      recorder.onstop = () => {
        try {
          const blob = new Blob(window.__chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        } catch (e) { reject(e); }
      };
      recorder.stop();
    }));

    await page.evaluate(() => {
      window.__stream.getTracks().forEach((t) => t.stop());
    }).catch(() => {});

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const tmpOut = FINAL_OUTPUT + '.tmp';
    writeFileSync(tmpOut, Buffer.from(base64, 'base64'));
    try { unlinkSync(FINAL_OUTPUT); } catch {}
    renameSync(tmpOut, FINAL_OUTPUT);
    console.log(`\nDone! Video saved to ${FINAL_OUTPUT}`);
  } catch (e) {
    console.error('Error saving recording:', e.message);
  }

  await browser.close().catch(() => {});
})();