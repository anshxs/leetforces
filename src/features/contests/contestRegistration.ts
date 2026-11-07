import { renderLucide } from '../../utils/icons';
import { Trophy, ShieldCheck, CheckCircle2, Users, UserCheck } from 'lucide';
import { isContestRegistrationPage } from '../../utils/page';

function parseAndRenderTerms(rawText: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'lc-terms-card';

  const header = document.createElement('div');
  header.className = 'lc-terms-card-header';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'lc-terms-icon';
  iconWrap.appendChild(renderLucide(ShieldCheck, { size: 18, stroke: '#00b8a3' }));
  header.appendChild(iconWrap);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'lc-terms-title-wrap';

  const title = document.createElement('div');
  title.className = 'lc-terms-title';
  title.textContent = 'Terms & Fair Play Agreement';

  const subtitle = document.createElement('div');
  subtitle.className = 'lc-terms-subtitle';
  subtitle.textContent = 'Registration confirms you understand and agree to the following rules:';

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);
  header.appendChild(titleWrap);
  container.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'lc-terms-list';

  const lines = rawText.split('\n');
  const ruleLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
      ruleLines.push(trimmed.replace(/^[*•-]\s*/, '').trim());
    } else if (
      trimmed.toLowerCase().includes('confirm') ||
      trimmed.toLowerCase().includes('agree') ||
      trimmed.toLowerCase().includes('registration confirms')
    ) {
      // Intro line handled in subtitle
    } else if (ruleLines.length > 0) {
      ruleLines[ruleLines.length - 1] += ' ' + trimmed;
    } else {
      ruleLines.push(trimmed);
    }
  }

  ruleLines.forEach((rule) => {
    const li = document.createElement('li');
    li.className = 'lc-terms-item';

    const check = document.createElement('span');
    check.className = 'lc-term-check';
    check.appendChild(renderLucide(CheckCircle2, { size: 15, stroke: '#00b8a3' }));
    li.appendChild(check);

    const textSpan = document.createElement('span');
    textSpan.className = 'lc-term-text';

    // Parse URLs into clean clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = rule.split(urlRegex);
    parts.forEach((part) => {
      if (part.match(urlRegex)) {
        const a = document.createElement('a');
        a.href = part;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'lc-terms-link';
        if (part.includes('/blog/entry/8790')) {
          a.textContent = 'Third-Party Code Regulations ↗';
        } else if (part.includes('/blog/entry/133941')) {
          a.textContent = 'AI Assistants Policy ↗';
        } else {
          a.textContent = part;
        }
        textSpan.appendChild(a);
      } else {
        textSpan.appendChild(document.createTextNode(part));
      }
    });

    li.appendChild(textSpan);
    list.appendChild(li);
  });

  container.appendChild(list);
  return container;
}

export function enhanceContestRegistration() {
  if (!isContestRegistrationPage()) return;

  const form = document.querySelector(
    'form.contestRegistration, form[action*="contestRegistration"], form[action*="gymRegistration"]'
  ) as HTMLFormElement | null;

  if (!form) return;

  const pageContent =
    document.getElementById('pageContent') || document.getElementById('content') || form.parentElement;
  if (!pageContent) return;

  // Extract contest ID from URL, form action, or contest heading
  let contestId = '';
  const urlMatch = window.location.pathname.match(/(?:contestRegistration|gymRegistration)\/(\d+)/);
  if (urlMatch && urlMatch[1]) {
    contestId = urlMatch[1];
  } else if (form.action) {
    const formMatch = form.action.match(/(?:contestRegistration|gymRegistration)\/(\d+)/);
    if (formMatch && formMatch[1]) contestId = formMatch[1];
  }

  const isVirtual = window.location.pathname.includes('/virtual');

  // 1. Clean up stray raw text nodes ("Registration for the contest") in pageContent
  Array.from(pageContent.childNodes).forEach((node) => {
    if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent &&
      node.textContent.toLowerCase().includes('registration for the contest')
    ) {
      node.textContent = '';
    }
  });

  // 2. Wrap form and heading into .lc-contest-reg-card if not already wrapped
  let card = form.closest('.lc-contest-reg-card') as HTMLElement | null;
  if (!card) {
    // Find contest heading h2
    let contestTitle = 'Contest Registration';
    let prevH2: HTMLElement | null = null;

    let sibling = form.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'H2') {
        prevH2 = sibling as HTMLElement;
        contestTitle = prevH2.textContent?.trim() || contestTitle;
        break;
      }
      sibling = sibling.previousElementSibling;
    }

    if (!contestId) {
      const titleMatch = contestTitle.match(/(?:Round|Div\.?\s*\d+|#)\s*(\d{3,4})/i);
      if (titleMatch && titleMatch[1]) contestId = titleMatch[1];
    }

    // Create modern card container
    card = document.createElement('div');
    card.className = 'lc-contest-reg-card';

    // Insert card where h2 or form was
    if (prevH2 && prevH2.parentElement) {
      prevH2.parentElement.insertBefore(card, prevH2);
      prevH2.remove(); // Replaced by our sleek header
    } else if (form.parentElement) {
      form.parentElement.insertBefore(card, form);
    }

    // Build modern LeetCode header inside card
    const headerWrap = document.createElement('div');
    headerWrap.className = 'lc-contest-reg-header';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'lc-reg-icon-wrap';
    iconWrap.appendChild(renderLucide(Trophy, { size: 24, stroke: '#ffa116' }));

    const titleInfo = document.createElement('div');
    titleInfo.className = 'lc-reg-title-info';

    const badgeRow = document.createElement('div');
    badgeRow.className = 'lc-reg-badge-row';

    if (contestId) {
      const idBadge = document.createElement('span');
      idBadge.className = 'lc-reg-id-badge';
      idBadge.textContent = `#${contestId}`;
      badgeRow.appendChild(idBadge);
    }

    const statusBadge = document.createElement('span');
    statusBadge.className = 'lc-reg-status-badge';
    statusBadge.textContent = isVirtual ? 'Virtual Participation' : 'Official Round';
    badgeRow.appendChild(statusBadge);

    const titleText = document.createElement('h1');
    titleText.className = 'lc-reg-heading';
    titleText.textContent = contestTitle;

    titleInfo.appendChild(badgeRow);
    titleInfo.appendChild(titleText);

    headerWrap.appendChild(iconWrap);
    headerWrap.appendChild(titleInfo);

    card.appendChild(headerWrap);
    card.appendChild(form);
  }

  // 3. Render Terms Directly inside Box instead of Raw Textarea
  const termsTextarea = form.querySelector('textarea.terms, textarea#registrationTerms') as HTMLTextAreaElement | null;
  if (termsTextarea) {
    termsTextarea.style.display = 'none';

    const td = termsTextarea.closest('td');
    if (td && !td.querySelector('.lc-terms-card')) {
      const rawText = termsTextarea.value || termsTextarea.textContent || '';
      const renderedTermsCard = parseAndRenderTerms(rawText);
      td.insertBefore(renderedTermsCard, termsTextarea);
    }
  }

  // 4. Enhance Radio Options ("Take part as individual participant", "as a team")
  const radioInputs = form.querySelectorAll('input[type="radio"]');
  radioInputs.forEach((radioInput) => {
    const radio = radioInput as HTMLInputElement;
    const label = radio.closest('label');
    const containerDiv =
      label?.parentElement?.tagName === 'DIV' ? label.parentElement : label || radio.parentElement;
    if (!containerDiv || containerDiv.classList.contains('lc-reg-option-tile')) return;

    containerDiv.classList.add('lc-reg-option-tile');
    if (radio.checked) {
      containerDiv.classList.add('is-selected');
    }

    const text = (label ? label.textContent : containerDiv.textContent)?.trim().toLowerCase() || '';
    const isTeam = text.includes('team');

    if (!containerDiv.querySelector('.lc-tile-icon')) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'lc-tile-icon';
      iconSpan.appendChild(renderLucide(isTeam ? Users : UserCheck, { size: 16, stroke: '#ffa116' }));
      containerDiv.insertBefore(iconSpan, containerDiv.firstChild);
    }

    containerDiv.addEventListener('click', (e) => {
      if (e.target !== radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      form.querySelectorAll('.lc-reg-option-tile').forEach((t) => t.classList.remove('is-selected'));
      containerDiv.classList.add('is-selected');
    });

    radio.addEventListener('change', () => {
      form.querySelectorAll('.lc-reg-option-tile').forEach((t) => t.classList.remove('is-selected'));
      if (radio.checked) {
        containerDiv.classList.add('is-selected');
      }
    });
  });

  // 5. Enhance Submit / Action Buttons (clean centered LeetCode pill)
  const submitBtn = form.querySelector('input.submit, input[type="submit"]') as HTMLInputElement | null;
  if (submitBtn && !submitBtn.classList.contains('lc-reg-submit-btn')) {
    submitBtn.classList.add('lc-reg-submit-btn');

    const submitContainer = submitBtn.parentElement;
    if (submitContainer) {
      submitContainer.classList.add('lc-reg-submit-wrap');
      // Ensure no back link is added
      const oldBackLink = submitContainer.querySelector('.lc-reg-back-link');
      if (oldBackLink) oldBackLink.remove();
    }
  }

  // 6. Enhance Sidebar on Contest Registration Page
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.querySelectorAll('.roundbox.sidebox, .roundbox').forEach((box) => {
      if (!box.classList.contains('lc-sidebar-reg-card')) {
        box.classList.add('lc-sidebar-reg-card');
      }
    });
  }
}
