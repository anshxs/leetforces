import { Filter, Search, Settings as SettingsIcon, History } from 'lucide';
import { renderLucide } from '../../utils/icons';
import { enhancePayAttentionContests } from '../contests/payAttention';

export function enhanceSidebarFilters(): void {
  const sidebar =
    document.getElementById('sidebar') ||
    (document.querySelector('.content-with-sidebar > div:last-child, .sidebar') as HTMLElement | null);
  if (!sidebar) return;

  // Enhance contest cards in sidebar (Pay attention section)
  enhancePayAttentionContests();

  const boxes = Array.from(
    sidebar.querySelectorAll('.roundbox, .sidebox')
  ) as HTMLElement[];

  boxes.forEach((box) => {
    // Skip contest card box completely - preserve user's contest changes
    if (box.classList.contains('lc-pay-attention-box') || box.querySelector('.lc-contest-card')) {
      return;
    }

    // Remove legacy beveled corner artifacts
    box
      .querySelectorAll(
        '.roundbox-lt, .roundbox-rt, .roundbox-lb, .roundbox-rb, .roundbox-top, .roundbox-bottom, .bottom-links, .top-links, .corner'
      )
      .forEach((el) => el.remove());

    const caption = box.querySelector('.caption, .caption.titled') as HTMLElement | null;
    if (!caption) return;

    const text = caption.textContent?.toLowerCase() || '';

    // 1. "Filter problems" / "Problem tags"
    if (text.includes('filter problems') || text.includes('tags') || box.querySelector('input[name="minDifficulty"]')) {
      box.classList.add('lc-filter-box');

      if (!caption.dataset.lcEnhanced) {
        caption.dataset.lcEnhanced = 'true';
        const rawText = caption.textContent?.replace(/[→\u2192]\s*/g, '').trim() || 'Filter Problems';
        caption.innerHTML = '';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-caption-icon';
        iconWrap.appendChild(renderLucide(Filter, { size: 14, stroke: 'currentColor' }));
        caption.appendChild(iconWrap);
        caption.appendChild(document.createTextNode(` ${rawText}`));
      }

      // Difficulty inputs cleanup & LeetCode presets
      const minDiff = box.querySelector('input[name="minDifficulty"]') as HTMLInputElement | null;
      const maxDiff = box.querySelector('input[name="maxDifficulty"]') as HTMLInputElement | null;
      if (minDiff && maxDiff && !box.querySelector('.lc-diff-presets-row')) {
        minDiff.placeholder = 'Min';
        maxDiff.placeholder = 'Max';

        const diffTitle = document.createElement('div');
        diffTitle.className = 'lc-filter-section-title';
        diffTitle.textContent = 'Difficulty Rating';

        const presetsRow = document.createElement('div');
        presetsRow.className = 'lc-diff-presets-row';

        const presets = [
          { label: 'All', min: '', max: '' },
          { label: 'Easy (<1200)', min: '', max: '1199', cls: 'preset-easy' },
          { label: 'Med (1200-1800)', min: '1200', max: '1800', cls: 'preset-med' },
          { label: 'Hard (>1800)', min: '1801', max: '', cls: 'preset-hard' },
        ];

        const updateActivePreset = () => {
          const curMin = minDiff.value.trim();
          const curMax = maxDiff.value.trim();
          presetsRow.querySelectorAll('.lc-diff-preset-btn').forEach((btn, idx) => {
            const p = presets[idx];
            if (!p) return;
            const isActive = p.min === curMin && p.max === curMax;
            btn.classList.toggle('active', isActive);
          });
        };

        presets.forEach((p) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `lc-diff-preset-btn ${p.cls || ''}`;
          btn.textContent = p.label;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            minDiff.value = p.min;
            maxDiff.value = p.max;
            updateActivePreset();
          });
          presetsRow.appendChild(btn);
        });

        minDiff.addEventListener('input', updateActivePreset);
        maxDiff.addEventListener('input', updateActivePreset);
        updateActivePreset();

        const inputsWrap = document.createElement('div');
        inputsWrap.className = 'lc-diff-inputs-wrap';

        const sep = document.createElement('span');
        sep.className = 'lc-diff-sep';
        sep.textContent = '—';

        const diffSection = document.createElement('div');
        diffSection.className = 'lc-diff-section-wrap';
        diffSection.appendChild(diffTitle);
        diffSection.appendChild(presetsRow);
        inputsWrap.appendChild(minDiff);
        inputsWrap.appendChild(sep);
        inputsWrap.appendChild(maxDiff);
        diffSection.appendChild(inputsWrap);

        const tagsTableRef = box.querySelector('table');
        if (tagsTableRef && tagsTableRef.parentNode) {
          tagsTableRef.parentNode.insertBefore(diffSection, tagsTableRef);
        } else if (minDiff.parentElement) {
          minDiff.parentElement.insertBefore(diffSection, minDiff);
        }
      }

      // Tags section: Live search filter + scrollable container + tag highlights
      const tagsTable = box.querySelector('table');
      if (tagsTable && !box.querySelector('.lc-tag-search-input')) {
        const tagsTitle = document.createElement('div');
        tagsTitle.className = 'lc-filter-section-title';
        tagsTitle.textContent = 'Tags / Topics';

        const searchWrap = document.createElement('div');
        searchWrap.className = 'lc-tag-search-wrap';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'lc-tag-search-input';
        searchInput.placeholder = 'Search tags...';

        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim().toLowerCase();
          const cells = tagsTable.querySelectorAll('td');
          cells.forEach((td) => {
            const t = td.textContent?.trim().toLowerCase() || '';
            (td as HTMLElement).style.display = t.includes(q) ? '' : 'none';
          });
        });

        searchWrap.appendChild(searchInput);

        let scrollWrap = tagsTable.parentElement;
        if (!scrollWrap?.classList.contains('lc-sidebar-tags-scroll')) {
          scrollWrap = document.createElement('div');
          scrollWrap.className = 'lc-sidebar-tags-scroll';
          tagsTable.parentNode?.insertBefore(scrollWrap, tagsTable);
          scrollWrap.appendChild(tagsTable);
        }

        scrollWrap.parentNode?.insertBefore(tagsTitle, scrollWrap);
        scrollWrap.parentNode?.insertBefore(searchWrap, scrollWrap);

        const checkboxes = tagsTable.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach((cb) => {
          const cell = cb.closest('td');
          if (cell && cb.checked) {
            cell.classList.add('lc-tag-checked');
          }
          cb.addEventListener('change', () => {
            if (cell) {
              cell.classList.toggle('lc-tag-checked', cb.checked);
            }
          });
        });
      }

      // Modern Dual Action Buttons: Apply Filter & Reset
      const submitBtn = box.querySelector('input[type="submit"]') as HTMLInputElement | null;
      const resetLink = box.querySelector('a[href*="/problemset"]') as HTMLAnchorElement | null;
      if (submitBtn && !box.querySelector('.lc-filter-actions-row')) {
        submitBtn.value = 'Apply Filter';

        const actionsRow = document.createElement('div');
        actionsRow.className = 'lc-filter-actions-row';

        submitBtn.parentNode?.insertBefore(actionsRow, submitBtn);
        actionsRow.appendChild(submitBtn);

        if (resetLink) {
          resetLink.classList.add('lc-filter-reset-btn');
          resetLink.textContent = 'Reset';
          actionsRow.appendChild(resetLink);
        } else {
          const reset = document.createElement('a');
          reset.className = 'lc-filter-reset-btn';
          reset.href = '/problemset';
          reset.textContent = 'Reset';
          actionsRow.appendChild(reset);
        }
      }
    } else if (text.includes('find problem') || text.includes('search')) {
      // 2. "Find problem" box
      if (!caption.dataset.lcEnhanced) {
        caption.dataset.lcEnhanced = 'true';
        const rawText = caption.textContent?.replace(/[→\u2192]\s*/g, '').trim() || 'Find Problem';
        caption.innerHTML = '';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-caption-icon';
        iconWrap.appendChild(renderLucide(Search, { size: 14, stroke: 'currentColor' }));
        caption.appendChild(iconWrap);
        caption.appendChild(document.createTextNode(` ${rawText}`));
      }
      const findInput = box.querySelector('input[type="text"]') as HTMLInputElement | null;
      if (findInput && !findInput.placeholder) {
        findInput.placeholder = 'Search by name or code...';
        findInput.style.width = '100%';
        findInput.style.marginBottom = '8px';
      }
      const findSubmit = box.querySelector('input[type="submit"]') as HTMLInputElement | null;
      if (findSubmit) {
        findSubmit.value = 'Search';
      }
    } else if (
      text.includes('setting') ||
      text.includes('настройк') ||
      box.querySelector('input[name="showTags"]') ||
      box.querySelector('input[name="hideSolved"]')
    ) {
      // 3. "Settings" box (when logged in)
      box.classList.add('lc-settings-box');
      if (!caption.dataset.lcEnhanced) {
        caption.dataset.lcEnhanced = 'true';
        const rawText = caption.textContent?.replace(/[→\u2192]\s*/g, '').trim() || 'Settings';
        caption.innerHTML = '';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-caption-icon';
        iconWrap.appendChild(renderLucide(SettingsIcon, { size: 14, stroke: 'currentColor' }));
        caption.appendChild(iconWrap);
        caption.appendChild(document.createTextNode(` ${rawText}`));
      }

      // Remove any stray <br> tags in the box
      box.querySelectorAll('br').forEach((br) => br.remove());

      // Find ALL checkboxes in this settings box
      const checkboxes = Array.from(box.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
      checkboxes.forEach((cb) => {
        const parent = cb.parentElement;
        if (!parent) return;

        // Direct flex row styling on the parent container
        parent.classList.add('lc-setting-row');
        parent.style.setProperty('display', 'flex', 'important');
        parent.style.setProperty('flex-direction', 'row', 'important');
        parent.style.setProperty('align-items', 'center', 'important');
        parent.style.setProperty('gap', '10px', 'important');
        parent.style.setProperty('cursor', 'pointer', 'important');
        parent.style.setProperty('width', '100%', 'important');
        parent.style.setProperty('box-sizing', 'border-box', 'important');

        cb.style.setProperty('margin', '0', 'important');
        cb.style.setProperty('flex-shrink', '0', 'important');
        cb.style.setProperty('cursor', 'pointer', 'important');

        const label = parent.querySelector('label') || (cb.id ? box.querySelector(`label[for="${cb.id}"]`) : null);
        if (label) {
          if (label.parentElement !== parent) {
            parent.appendChild(label);
          }
          label.classList.add('lc-setting-label');
          label.style.setProperty('display', 'inline-block', 'important');
          label.style.setProperty('margin', '0', 'important');
          label.style.setProperty('cursor', 'pointer', 'important');
          label.style.setProperty('line-height', '1.4', 'important');
          label.style.setProperty('font-size', '12px', 'important');
          label.style.setProperty('color', '#eff1f6', 'important');
        } else {
          Array.from(parent.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
              const span = document.createElement('span');
              span.className = 'lc-setting-label';
              span.textContent = node.textContent.trim();
              span.style.setProperty('display', 'inline-block', 'important');
              span.style.setProperty('margin', '0', 'important');
              span.style.setProperty('cursor', 'pointer', 'important');
              span.style.setProperty('line-height', '1.4', 'important');
              span.style.setProperty('font-size', '12px', 'important');
              span.style.setProperty('color', '#eff1f6', 'important');
              parent.replaceChild(span, node);
            }
          });
        }
      });

      const submitBtn = box.querySelector('input[type="submit"]') as HTMLInputElement | null;
      if (submitBtn) {
        submitBtn.classList.add('lc-filter-submit-btn');
        submitBtn.value = 'Apply';
      }
    } else if (text.includes('unsolved') || text.includes('нерешенн')) {
      // 4. "Last unsolved" box (when logged in)
      box.classList.add('lc-unsolved-box');
      box.style.setProperty('overflow', 'hidden', 'important');

      if (!caption.dataset.lcEnhanced) {
        caption.dataset.lcEnhanced = 'true';
        const rawText = caption.textContent?.replace(/[→\u2192]\s*/g, '').trim() || 'Last Unsolved';
        caption.innerHTML = '';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-caption-icon';
        iconWrap.appendChild(renderLucide(History, { size: 14, stroke: 'currentColor' }));
        caption.appendChild(iconWrap);
        caption.appendChild(document.createTextNode(` ${rawText}`));
      }

      const ul = box.querySelector('ul');
      if (ul) {
        ul.classList.add('lc-unsolved-list');
      }

      // Format all unsolved links: compact pill, truncated text with full tooltip
      box.querySelectorAll('a[href*="/problem/"]').forEach((link) => {
        link.classList.add('lc-unsolved-link');
        const fullTitle = link.getAttribute('data-full-title') || link.textContent?.trim() || '';
        link.setAttribute('data-full-title', fullTitle);
        (link as HTMLElement).title = fullTitle;
      });
    }
  });
}

