import { renderLucide } from '../../utils/icons';
import { Copy, Check, Eye, EyeOff, Clock, Play, Pause, RotateCcw } from 'lucide';
import { hideTagsEnabled, showTimerEnabled } from '../../state/settingsState';

let tagsRevealed = false;
let timerContainer: HTMLElement | null = null;
let timerSeconds = 0;
let timerInterval: number | null = null;
let timerRunning = false;

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function enhanceProblemPage() {
  // 1. Difficulty badge right next to problem title
  const titleEl = document.querySelector('.problem-statement .header .title');
  if (titleEl && !titleEl.querySelector('.lc-title-diff-chip')) {
    const diffSpan = document.querySelector('.roundbox.sidebox span[title="Difficulty"]');
    let ratingStr = diffSpan?.textContent?.trim().replace('*', '');
    if (!ratingStr) {
      const sideboxText = document.querySelector('.roundbox.sidebox')?.textContent || '';
      const match = sideboxText.match(/\*(\d{3,4})/);
      if (match && match[1]) ratingStr = match[1];
    }

    if (ratingStr) {
      const rating = parseInt(ratingStr, 10);
      let diffClass = 'lc-diff-medium';
      let diffName = 'Medium';
      if (rating < 1200) {
        diffClass = 'lc-diff-easy';
        diffName = 'Easy';
      } else if (rating >= 1900) {
        diffClass = 'lc-diff-hard';
        diffName = 'Hard';
      }

      const badge = document.createElement('span');
      badge.className = `lc-title-diff-chip ${diffClass}`;
      badge.textContent = `${diffName} · ${rating}`;
      titleEl.appendChild(badge);
    }
  }

  // 2. Add Copy buttons to sample tests with Lucide Copy & Check icons
  const sampleInputs = document.querySelectorAll('.sample-test .input, .sample-test .output');
  sampleInputs.forEach((container) => {
    if (container.querySelector('.lc-copy-btn')) return;
    const pre = container.querySelector('pre');
    if (!pre) return;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'lc-copy-btn';
    copyBtn.appendChild(renderLucide(Copy, { size: 12, stroke: '#909090' }));
    copyBtn.appendChild(document.createTextNode(' Copy'));

    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const text = pre.innerText || pre.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '';
        copyBtn.appendChild(renderLucide(Check, { size: 12, stroke: '#00b8a3' }));
        copyBtn.appendChild(document.createTextNode(' Copied!'));
        setTimeout(() => {
          copyBtn.innerHTML = '';
          copyBtn.appendChild(renderLucide(Copy, { size: 12, stroke: '#909090' }));
          copyBtn.appendChild(document.createTextNode(' Copy'));
        }, 1500);
      });
    });

    container.appendChild(copyBtn);
  });

  // 3. Practice Mode & Timer
  manageProblemTags(hideTagsEnabled);
  manageProblemTimer(showTimerEnabled);
}

// --- Practice Mode (Hide Tags) with Lucide Eye / EyeOff icons ---
export function manageProblemTags(hide: boolean) {
  const sideboxes = document.querySelectorAll('.roundbox.sidebox');
  let targetBox: HTMLElement | null = null;

  for (let i = 0; i < sideboxes.length; i++) {
    const box = sideboxes[i];
    if (!box) continue;
    const caption = box.querySelector('.caption, .caption.titled');
    if (caption && caption.textContent?.toLowerCase().includes('problem tags')) {
      targetBox = box as HTMLElement;
      break;
    }
  }

  if (!targetBox) return;

  const tagElements = targetBox.querySelectorAll('.tag-box, a[href*="/problemset/tags/"], span[title="Difficulty"]');
  let toggleBtn = document.getElementById('cf-boost-tags-toggle') as HTMLButtonElement | null;

  if (!hide || tagsRevealed) {
    tagElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.filter = '';
      htmlEl.style.userSelect = 'auto';
      htmlEl.style.pointerEvents = 'auto';
    });
    if (toggleBtn) {
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(renderLucide(EyeOff, { size: 12, stroke: '#1a1a1a' }));
      toggleBtn.appendChild(document.createTextNode(' Hide Tags'));
      toggleBtn.style.display = hide ? 'inline-flex' : 'none';
    }
  } else {
    tagElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.filter = 'blur(6px)';
      htmlEl.style.userSelect = 'none';
      htmlEl.style.pointerEvents = 'none';
      htmlEl.style.transition = 'filter 0.2s ease';
    });

    if (!toggleBtn) {
      toggleBtn = document.createElement('button') as HTMLButtonElement;
      toggleBtn.id = 'cf-boost-tags-toggle';
      toggleBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 6px auto;
        padding: 4px 10px;
        font-size: 11px;
        font-family: inherit;
        background: #ffa116;
        color: #1a1a1a;
        font-weight: 600;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      `;
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        tagsRevealed = !tagsRevealed;
        manageProblemTags(hideTagsEnabled);
      });

      const caption = targetBox.querySelector('.caption');
      if (caption && caption.parentNode) {
        caption.parentNode.insertBefore(toggleBtn, caption.nextSibling);
      } else {
        targetBox.prepend(toggleBtn);
      }
    }

    toggleBtn.innerHTML = '';
    toggleBtn.appendChild(renderLucide(Eye, { size: 12, stroke: '#1a1a1a' }));
    toggleBtn.appendChild(document.createTextNode(' Reveal Tags'));
    toggleBtn.style.display = 'inline-flex';
  }
}

// --- Floating Problem Timer with Lucide icons ---
export function manageProblemTimer(show: boolean) {
  if (!show) {
    if (timerContainer) {
      timerContainer.style.display = 'none';
    }
    return;
  }

  if (!timerContainer) {
    timerContainer = document.createElement('div');
    timerContainer.id = 'cf-boost-timer-widget';
    timerContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #202020;
      color: #f0f4f8;
      padding: 10px 14px;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--lc-border, #383838);
      font-size: 13px;
    `;

    const timerTitle = document.createElement('div');
    timerTitle.style.cssText = `
      font-weight: 600;
      color: #ffa116;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    timerTitle.appendChild(renderLucide(Clock, { size: 12, stroke: '#ffa116' }));
    timerTitle.appendChild(document.createTextNode('Timer'));

    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'cf-boost-time-display';
    timeDisplay.style.cssText = 'font-size: 18px; font-weight: bold; font-family: monospace; min-width: 60px;';
    timeDisplay.textContent = '00:00';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'cf-boost-timer-toggle-btn';
    toggleBtn.style.cssText = `
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      background: #2e7d32;
      color: white;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;
    toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
    toggleBtn.appendChild(document.createTextNode('Start'));

    const resetBtn = document.createElement('button');
    resetBtn.id = 'cf-boost-timer-reset-btn';
    resetBtn.style.cssText = `
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      background: #455a64;
      color: white;
      cursor: pointer;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;
    resetBtn.appendChild(renderLucide(RotateCcw, { size: 11, stroke: 'white' }));
    resetBtn.appendChild(document.createTextNode('Reset'));

    timerContainer.appendChild(timerTitle);
    timerContainer.appendChild(timeDisplay);
    timerContainer.appendChild(toggleBtn);
    timerContainer.appendChild(resetBtn);
    document.body.appendChild(timerContainer);

    const startTimer = () => {
      timerRunning = true;
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(renderLucide(Pause, { size: 11, fill: 'white', stroke: 'white' }));
      toggleBtn.appendChild(document.createTextNode('Pause'));
      toggleBtn.style.background = '#e65100';
      timerInterval = window.setInterval(() => {
        timerSeconds++;
        timeDisplay.textContent = formatTime(timerSeconds);
      }, 1000);
    };

    const pauseTimer = () => {
      timerRunning = false;
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
      toggleBtn.appendChild(document.createTextNode('Resume'));
      toggleBtn.style.background = '#2e7d32';
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    };

    toggleBtn.addEventListener('click', () => {
      if (timerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    resetBtn.addEventListener('click', () => {
      pauseTimer();
      timerSeconds = 0;
      timeDisplay.textContent = formatTime(0);
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
      toggleBtn.appendChild(document.createTextNode('Start'));
    });

    startTimer();
  }

  timerContainer.style.display = 'flex';
}

