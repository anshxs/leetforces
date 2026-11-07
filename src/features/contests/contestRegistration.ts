import { renderLucide } from '../../utils/icons';
import { Trophy, Calendar, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Users, UserCheck } from 'lucide';
import { isContestRegistrationPage } from '../../utils/page';

export function enhanceContestRegistration() {
  if (!isContestRegistrationPage()) return;

  const contestIdMatch = window.location.pathname.match(/(?:contestRegistration|gymRegistration)\/(\d+)/);
  const contestId = contestIdMatch ? contestIdMatch[1] : '';
  const isVirtual = window.location.pathname.includes('/virtual');

  // Find the main registration card
  const regBox = document.querySelector(
    '#content .roundbox:has(form), .roundbox:has(form[action*="Registration"]), .roundbox:has(table.table-form)'
  ) as HTMLElement | null;

  if (regBox && !regBox.classList.contains('lc-contest-reg-box')) {
    regBox.classList.add('lc-contest-reg-box');

    // 1. Modern Header / Caption
    const caption = regBox.querySelector('.caption.titled, .caption') as HTMLElement | null;
    if (caption && !caption.querySelector('.lc-contest-reg-header')) {
      const originalText = caption.textContent?.replace(/[→\s]+/g, ' ').trim() || 'Register for contest';
      caption.innerHTML = '';

      const headerWrap = document.createElement('div');
      headerWrap.className = 'lc-contest-reg-header';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'lc-reg-icon-wrap';
      iconWrap.appendChild(renderLucide(Trophy, { size: 20, stroke: '#ffa116' }));

      const titleInfo = document.createElement('div');
      titleInfo.className = 'lc-reg-title-info';

      const badgeRow = document.createElement('div');
      badgeRow.className = 'lc-reg-badge-row';

      const statusBadge = document.createElement('span');
      statusBadge.className = 'lc-reg-status-badge';
      statusBadge.textContent = isVirtual ? 'Virtual Participation' : 'Official Round';

      if (contestId) {
        const idBadge = document.createElement('span');
        idBadge.className = 'lc-reg-id-badge';
        idBadge.textContent = `#${contestId}`;
        badgeRow.appendChild(idBadge);
      }
      badgeRow.appendChild(statusBadge);

      const titleText = document.createElement('h2');
      titleText.className = 'lc-reg-heading';
      titleText.textContent = originalText;

      titleInfo.appendChild(badgeRow);
      titleInfo.appendChild(titleText);

      headerWrap.appendChild(iconWrap);
      headerWrap.appendChild(titleInfo);
      caption.appendChild(headerWrap);
    }

    // 2. Modernize Option Cards (Radio buttons for Individual / Team)
    const radioRows = regBox.querySelectorAll('table.table-form tr');
    radioRows.forEach((row) => {
      const radio = row.querySelector('input[type="radio"]') as HTMLInputElement | null;
      if (radio) {
        const parentCell = radio.closest('td');
        if (parentCell && !parentCell.classList.contains('lc-radio-tile-cell')) {
          parentCell.classList.add('lc-radio-tile-cell');
          const label = parentCell.querySelector('label') || parentCell;
          
          const tile = document.createElement('div');
          tile.className = `lc-reg-option-tile ${radio.checked ? 'is-selected' : ''}`;
          
          const tileIcon = document.createElement('span');
          tileIcon.className = 'lc-tile-icon';
          const isTeam = label.textContent?.toLowerCase().includes('team');
          tileIcon.appendChild(renderLucide(isTeam ? Users : UserCheck, { size: 16, stroke: '#ffa116' }));
          
          tile.addEventListener('click', (e) => {
            if (e.target !== radio) {
              radio.checked = true;
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
            regBox.querySelectorAll('.lc-reg-option-tile').forEach((t) => t.classList.remove('is-selected'));
            tile.classList.add('is-selected');
          });

          radio.addEventListener('change', () => {
            regBox.querySelectorAll('.lc-reg-option-tile').forEach((t) => t.classList.remove('is-selected'));
            if (radio.checked) {
              tile.classList.add('is-selected');
            }
          });
        }
      }
    });

    // 3. Modernize Notice / Alerts inside form
    const notices = regBox.querySelectorAll('.notice, .info, .shift, div.alert, p.attention');
    notices.forEach((notice) => {
      if (notice.classList.contains('lc-reg-callout')) return;
      notice.classList.add('lc-reg-callout');
      const text = notice.textContent?.trim() || '';
      if (text && !notice.querySelector('.lc-callout-icon')) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'lc-callout-icon';
        iconSpan.appendChild(renderLucide(AlertCircle, { size: 16, stroke: '#ffa116' }));
        notice.prepend(iconSpan);
      }
    });

    // 4. Modernize Submit / Action Buttons
    const submitBtn = regBox.querySelector('input[type="submit"]') as HTMLInputElement | null;
    if (submitBtn && !submitBtn.classList.contains('lc-reg-btn')) {
      const isCancel = submitBtn.value.toLowerCase().includes('cancel') || submitBtn.value.toLowerCase().includes('unregister');
      submitBtn.classList.add('lc-reg-btn', isCancel ? 'lc-reg-btn-danger' : 'lc-reg-btn-primary');

      // Wrap actions with back link
      const actionsCell = submitBtn.closest('td') || submitBtn.parentElement;
      if (actionsCell && !actionsCell.querySelector('.lc-reg-actions-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'lc-reg-actions-wrap';

        // Move submit button inside wrap
        submitBtn.parentElement?.insertBefore(wrap, submitBtn);
        wrap.appendChild(submitBtn);

        // Add back link
        if (contestId) {
          const backLink = document.createElement('a');
          backLink.className = 'lc-reg-back-link';
          backLink.href = `/contest/${contestId}`;
          backLink.appendChild(renderLucide(ArrowLeft, { size: 14, stroke: 'currentColor' }));
          backLink.appendChild(document.createTextNode(' Back to Contest'));
          wrap.appendChild(backLink);
        }
      }
    }
  }

  // 5. Enhance Sidebar on Contest Registration Page
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const sideboxes = sidebar.querySelectorAll('.roundbox.sidebox, .roundbox');
    sideboxes.forEach((box) => {
      if (!box.classList.contains('lc-sidebar-reg-card')) {
        box.classList.add('lc-sidebar-reg-card');
      }
    });
  }
}

