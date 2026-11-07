import { Trophy, Clock } from 'lucide';
import { renderLucide } from '../../utils/icons';
import { formatContestTimer } from '../../utils/timer';
import type { DOMContestItem } from '../../types';

let contestTimerInterval: number | null = null;
let isFetchingContests = false;

export function getAllPayAttentionBoxes(): HTMLElement[] {
  const boxes = new Set<HTMLElement>();

  // 1. Direct query via contest elements
  document.querySelectorAll('.contest-state-phase, .countdown[cdid], .countdown[home]').forEach((el) => {
    const box = el.closest('.roundbox, .sidebox, .borderTopRound') as HTMLElement | null;
    if (box) boxes.add(box);
  });

  // 2. Query via caption or ID or roundbox containing attention
  document.querySelectorAll('.roundbox, .sidebox, .borderTopRound').forEach((el) => {
    const box = el as HTMLElement;
    if (box.id === 'lc-pay-attention-box') {
      boxes.add(box);
      return;
    }
    const cap = box.querySelector('.caption, .caption.titled');
    const t = (cap?.textContent || box.textContent || '').toLowerCase();
    if (
      t.includes('pay attention') ||
      t.includes('attention') ||
      t.includes('обратите внимание') ||
      box.querySelector('.contest-state-phase, .countdown')
    ) {
      boxes.add(box);
    }
  });

  return Array.from(boxes);
}

export function startContestCountdownTicker(): void {
  if (contestTimerInterval) return;
  contestTimerInterval = window.setInterval(() => {
    document.querySelectorAll('.lc-contest-card .lc-contest-time').forEach((el) => {
      const text = el.textContent?.trim() || '';
      const parts = text.split(':').map(Number);
      if (
        parts.length === 3 &&
        typeof parts[0] === 'number' &&
        typeof parts[1] === 'number' &&
        typeof parts[2] === 'number' &&
        !parts.some(isNaN)
      ) {
        let total = parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (total > 0) {
          total--;
          const h = String(Math.floor(total / 3600)).padStart(2, '0');
          const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
          const s = String(total % 60).padStart(2, '0');
          el.textContent = `${h}:${m}:${s}`;
        }
      }
    });
  }, 1000);
}

export function renderContestCardsFromDOM(payAttentionBox: HTMLElement, titleLinks: HTMLAnchorElement[]): void {
  const rawItems: DOMContestItem[] = [];

  titleLinks.forEach((link) => {
    const href = link.getAttribute('href') || link.href || '';
    const match = href.match(/\/contest[s]?\/(\d+)/);
    const contestId = match && match[1] ? match[1] : '';
    const name = link.textContent?.replace(/\s+/g, ' ').trim() || 'Contest';
    const itemDiv = link.closest('div[style*="text-align"], div') || link.parentElement || payAttentionBox;

    const phaseEl =
      itemDiv.querySelector('.contest-state-phase') ||
      link.parentElement?.querySelector('.contest-state-phase') ||
      payAttentionBox.querySelector('.contest-state-phase');
    const phaseText = phaseEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const lowerPhase = phaseText.toLowerCase();

    const isRunning =
      lowerPhase.includes('running') ||
      lowerPhase.includes('идет') ||
      href.includes('/standings');

    const isRegistration =
      lowerPhase.includes('register') ||
      lowerPhase.includes('open') ||
      lowerPhase.includes('регистрац');

    const countdownEl = (itemDiv.querySelector('.countdown') ||
      link.parentElement?.querySelector('.countdown') ||
      payAttentionBox.querySelector('.countdown')) as HTMLElement | null;
    const countdownText = countdownEl?.textContent?.trim() || '';
    const countdownId = countdownEl?.getAttribute('cdid') || '';

    const regLink = (itemDiv.querySelector('a[href*="contestRegistration"], a[href*="/register"]') ||
      payAttentionBox.querySelector(`a[href*="contestRegistration/${contestId}"], a[href*="/contest/${contestId}/register"]`)) as HTMLAnchorElement | null;
    const regUrl = regLink?.href || (contestId ? `https://codeforces.com/contestRegistration/${contestId}` : href);

    rawItems.push({
      id: contestId,
      name,
      url: contestId ? `/contest/${contestId}` : href,
      phaseText,
      isRunning,
      isRegistration,
      countdownText,
      countdownId,
      regUrl,
    });
  });

  const seen = new Set<string>();
  const items = rawItems.filter((item) => {
    const key = item.id || item.url || item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (items.length === 0) return;

  payAttentionBox.innerHTML = '';
  payAttentionBox.removeAttribute('style');
  payAttentionBox.className = 'roundbox sidebox borderTopRound lc-pay-attention-box';
  payAttentionBox.dataset.lcContestEnhanced = 'true';

  const caption = document.createElement('div');
  caption.className = 'caption titled';
  const iconWrap = document.createElement('span');
  iconWrap.className = 'lc-sidebar-caption-icon';
  iconWrap.appendChild(renderLucide(Trophy, { size: 14, stroke: 'currentColor' }));
  caption.appendChild(iconWrap);
  caption.appendChild(document.createTextNode(' Pay Attention'));
  payAttentionBox.appendChild(caption);

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'lc-contest-cards-container';

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = `lc-contest-card ${item.isRunning ? 'is-running' : ''}`;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('a, button')) return;
      if (item.url) window.location.href = item.url;
    });

    const headerRow = document.createElement('div');
    headerRow.className = 'lc-contest-header';

    const badge = document.createElement('span');
    if (item.isRunning) {
      badge.className = 'lc-contest-badge running';
      const dot = document.createElement('span');
      dot.className = 'lc-live-dot';
      badge.appendChild(dot);
      badge.appendChild(document.createTextNode(' Contest Running'));
    } else if (item.isRegistration) {
      badge.className = 'lc-contest-badge register';
      badge.textContent = 'Registration Open';
    } else {
      badge.className = 'lc-contest-badge upcoming';
      badge.textContent = item.phaseText || 'Upcoming Contest';
    }
    headerRow.appendChild(badge);
    card.appendChild(headerRow);

    const titleLink = document.createElement('a');
    titleLink.className = 'lc-contest-title';
    titleLink.href = item.url;
    titleLink.textContent = item.name;
    titleLink.title = item.name;
    card.appendChild(titleLink);

    const metaRow = document.createElement('div');
    metaRow.className = 'lc-contest-meta';
    metaRow.appendChild(renderLucide(Clock, { size: 12, stroke: '#909090' }));

    const timeLabel = document.createElement('span');
    timeLabel.className = 'lc-contest-time-label';
    timeLabel.textContent = item.isRunning
      ? 'Ends in: '
      : item.isRegistration
      ? 'Closes in: '
      : 'Starts in: ';
    metaRow.appendChild(timeLabel);

    const countdownSpan = document.createElement('span');
    countdownSpan.className = 'countdown lc-contest-time';
    if (item.countdownId) {
      countdownSpan.setAttribute('cdid', item.countdownId);
    }
    countdownSpan.textContent = item.countdownText || 'Live';
    metaRow.appendChild(countdownSpan);

    card.appendChild(metaRow);

    const actionBtn = document.createElement('a');
    if (item.isRunning) {
      actionBtn.className = 'lc-contest-btn enter';
      actionBtn.href = item.url;
      actionBtn.textContent = 'Enter Contest →';
    } else {
      actionBtn.className = 'lc-contest-btn register';
      actionBtn.href = item.regUrl;
      actionBtn.textContent = 'Register Now →';
    }
    card.appendChild(actionBtn);

    cardsContainer.appendChild(card);
  });

  payAttentionBox.appendChild(cardsContainer);
  startContestCountdownTicker();
}

export async function enhancePayAttentionContests(): Promise<void> {
  const payAttentionBoxes = getAllPayAttentionBoxes();
  const sidebar =
    document.getElementById('sidebar') ||
    (document.querySelector('.content-with-sidebar > div:last-child, .sidebar') as HTMLElement | null);

  if (payAttentionBoxes.length === 0 && !sidebar) return;

  let anyEnhanced = false;

  for (const box of payAttentionBoxes) {
    if (box.querySelector('.lc-contest-card')) {
      anyEnhanced = true;
      continue;
    }

    const contestLinks = Array.from(
      box.querySelectorAll('a[href*="/contest"], a[href*="/contests"]')
    ) as HTMLAnchorElement[];

    const titleLinks = contestLinks.filter(
      (a) =>
        !a.href.includes('/register') &&
        !a.href.includes('contestRegistration') &&
        !a.textContent?.toLowerCase().includes('register') &&
        !a.textContent?.toLowerCase().includes('here')
    );

    if (titleLinks.length > 0) {
      renderContestCardsFromDOM(box, titleLinks);
      anyEnhanced = true;
    }
  }

  if (anyEnhanced) return;

  if (isFetchingContests) return;
  isFetchingContests = true;

  try {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
    isFetchingContests = false;
    if (!res.ok) return;
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.result)) return;

    const allContests: any[] = data.result;
    const runningContests = allContests
      .filter((c) => c.phase === 'CODING')
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

    const upcomingContests = allContests
      .filter((c) => c.phase === 'BEFORE')
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
      .slice(0, 2);

    const activeContests = [...runningContests, ...upcomingContests].slice(0, 3);
    if (activeContests.length === 0) return;

    let targetBox = payAttentionBoxes[0] || null;
    if (!targetBox && sidebar) {
      targetBox = document.createElement('div');
      targetBox.id = 'lc-pay-attention-box';
      targetBox.className = 'roundbox sidebox borderTopRound';
      sidebar.prepend(targetBox);
    }

    if (!targetBox) return;

    targetBox.dataset.lcContestEnhanced = 'true';
    targetBox.innerHTML = '';
    targetBox.removeAttribute('style');
    targetBox.className = 'roundbox sidebox borderTopRound lc-pay-attention-box';

    const caption = document.createElement('div');
    caption.className = 'caption titled';
    const iconWrap = document.createElement('span');
    iconWrap.className = 'lc-sidebar-caption-icon';
    iconWrap.appendChild(renderLucide(Trophy, { size: 14, stroke: 'currentColor' }));
    caption.appendChild(iconWrap);
    caption.appendChild(document.createTextNode(' Pay Attention'));
    targetBox.appendChild(caption);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'lc-contest-cards-container';

    const now = Math.floor(Date.now() / 1000);

    activeContests.forEach((c) => {
      const isRunning = c.phase === 'CODING';
      const card = document.createElement('div');
      card.className = `lc-contest-card ${isRunning ? 'is-running' : ''}`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('a, button')) return;
        window.location.href = `/contest/${c.id}`;
      });

      const headerRow = document.createElement('div');
      headerRow.className = 'lc-contest-header';

      const badge = document.createElement('span');
      if (isRunning) {
        badge.className = 'lc-contest-badge running';
        const dot = document.createElement('span');
        dot.className = 'lc-live-dot';
        badge.appendChild(dot);
        badge.appendChild(document.createTextNode(' Contest Running'));
      } else {
        const startsInSec = c.startTimeSeconds ? c.startTimeSeconds - now : -c.relativeTimeSeconds;
        if (startsInSec <= 259200) {
          badge.className = 'lc-contest-badge register';
          badge.textContent = 'Registration Open';
        } else {
          badge.className = 'lc-contest-badge upcoming';
          badge.textContent = 'Upcoming Round';
        }
      }
      headerRow.appendChild(badge);
      card.appendChild(headerRow);

      const titleLink = document.createElement('a');
      titleLink.className = 'lc-contest-title';
      titleLink.href = `/contest/${c.id}`;
      titleLink.textContent = c.name;
      titleLink.title = c.name;
      card.appendChild(titleLink);

      const metaRow = document.createElement('div');
      metaRow.className = 'lc-contest-meta';
      metaRow.appendChild(renderLucide(Clock, { size: 12, stroke: '#909090' }));

      const timeLabel = document.createElement('span');
      timeLabel.className = 'lc-contest-time-label';
      timeLabel.textContent = isRunning ? 'Ends in: ' : 'Starts in: ';
      metaRow.appendChild(timeLabel);

      let durationSec = 0;
      if (isRunning) {
        const endTime = c.startTimeSeconds + c.durationSeconds;
        durationSec = Math.max(0, endTime - now);
      } else {
        durationSec = Math.max(0, (c.startTimeSeconds || 0) - now);
      }

      const countdownSpan = document.createElement('span');
      countdownSpan.className = 'countdown lc-contest-time';
      countdownSpan.textContent = formatContestTimer(durationSec);
      metaRow.appendChild(countdownSpan);

      card.appendChild(metaRow);

      const actionBtn = document.createElement('a');
      if (isRunning) {
        actionBtn.className = 'lc-contest-btn enter';
        actionBtn.href = `/contest/${c.id}`;
        actionBtn.textContent = 'Enter Contest →';
      } else {
        actionBtn.className = 'lc-contest-btn register';
        actionBtn.href = `https://codeforces.com/contestRegistration/${c.id}`;
        actionBtn.textContent = 'Register Now →';
      }
      card.appendChild(actionBtn);

      cardsContainer.appendChild(card);
    });

    targetBox.appendChild(cardsContainer);
    startContestCountdownTicker();
  } catch (err) {
    isFetchingContests = false;
    console.debug('[LeetBoost] Contest API fetch error:', err);
  }
}

