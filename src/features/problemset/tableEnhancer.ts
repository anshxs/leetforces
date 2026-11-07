import { Star, Send, Tag, Search, Shuffle } from 'lucide';
import { renderLucide } from '../../utils/icons';
import { userFavorites } from '../../state/settingsState';
import { problemMetaCache } from '../../state/problemCache';
import { enhanceSecondLevelMenu } from '../navigation/mainNav';
import { openTopicsDialog } from './topicsModal';
import type { ProblemRowMeta } from '../../types';

export const problemData: ProblemRowMeta[] = [];
export let updateFiltersFn: (() => void) | null = null;
export let isEnhancingTable = false;

export function enhanceProblemsetTable(): void {
  if (isEnhancingTable) return;
  isEnhancingTable = true;
  try {
    // Remove legacy Codeforces datatable header ("Problems", magnifier, rowCount)
    document.querySelectorAll('.userListMarker, .rowCount, .datatable img.closed').forEach((el) => {
      const headerDiv = el.closest('.datatable > div') || el.parentElement;
      if (headerDiv && (headerDiv.textContent?.includes('Problems') || headerDiv.querySelector('.userListMarker'))) {
        headerDiv.remove();
      }
    });

    const table = document.querySelector('table.problems') as HTMLTableElement | null;
    if (!table) return;

    // Reset cache if table was replaced in the DOM
    if (problemData.length > 0 && problemData[0]?.row && !table.contains(problemData[0].row)) {
      problemData.length = 0;
    }

    const allRows = Array.from(table.querySelectorAll('tr'));
    if (allRows.length === 0) return;

    // Check if user is signed in to Codeforces
    const isSignedIn =
      document.querySelector('a[href*="/logout"]') !== null ||
      (document.querySelector('a[href*="/enter"]') === null &&
        document.querySelector('.personal-sidebar a[href*="/profile/"]') !== null);

    // 1. Transform Header Row (only once)
    const headerRow = allRows[0];
    if (headerRow && !headerRow.querySelector('.lc-actions-header')) {
      const headerCells = Array.from(headerRow.querySelectorAll('th'));
      if (headerCells.length > 0) {
        let titleTh: HTMLTableCellElement | null = null;
        let ratingTh: HTMLTableCellElement | null = null;
        const actTh = headerRow.querySelector('th.act');

        headerCells.forEach((th) => {
          const txt = th.textContent?.trim() || '';
          if (th.classList.contains('id') || txt === '#') {
            th.style.display = 'none';
          } else if (th.classList.contains('act') || txt === '') {
            th.style.display = 'none';
          } else if (txt.toLowerCase().includes('name') || txt.toLowerCase().includes('title')) {
            th.textContent = 'TITLE';
            th.style.textAlign = 'left';
            th.classList.add('lc-title-header');
            titleTh = th;
          } else if (txt.includes('*') || txt.toLowerCase().includes('rating') || txt.toLowerCase().includes('diff')) {
            th.textContent = 'RATING';
            th.style.textAlign = 'right';
            th.classList.add('lc-rating-header');
            ratingTh = th;
          } else if (th.querySelector('img') || th.querySelector('a') || txt.toLowerCase().includes('solved')) {
            th.textContent = 'SOLVED BY';
            th.style.textAlign = 'right';
            th.classList.add('lc-solved-header');
          }
        });

        const actionsTh = document.createElement('th');
        actionsTh.className = 'lc-actions-header';
        actionsTh.style.textAlign = 'right';
        actionsTh.textContent = '';

        if (actTh) {
          headerRow.insertBefore(actionsTh, actTh);
        } else if (ratingTh) {
          headerRow.insertBefore(actionsTh, ratingTh);
        } else if (titleTh && (titleTh as HTMLTableCellElement).nextSibling) {
          headerRow.insertBefore(actionsTh, (titleTh as HTMLTableCellElement).nextSibling);
        } else {
          headerRow.appendChild(actionsTh);
        }
      }
    }

    // 2. Transform Body Rows (only unenhanced rows)
    const unenhancedRows = allRows.slice(1).filter((r) => r.dataset.lcEnhanced !== 'true');
    for (const row of unenhancedRows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length === 0) continue;

      if (cells.length < 4 && !row.querySelector('a[href*="/status/"]')) {
        continue;
      }

      if (!row.classList.contains('lc-problem-row')) {
        row.classList.add('lc-problem-row');
      }

      const isSolved =
        row.classList.contains('accepted-problem') ||
        (row.querySelector('.act-item') !== null &&
          (row.style.backgroundColor.includes('green') || row.classList.contains('accepted-problem'))) ||
        row.style.backgroundColor.includes('rgb(212') ||
        row.style.backgroundColor.includes('green');

      // 1. Hide '#' column cell and extract problem ID
      const idCell = row.querySelector('td.id') as HTMLTableCellElement | null;
      let problemId = '';
      if (idCell) {
        problemId = idCell.textContent?.trim() || '';
        idCell.style.display = 'none';
      }

      // 2. Hide native '.act' column cell and extract native submit link & favorite img
      const actCell = row.querySelector('td.act') as HTMLTableCellElement | null;
      if (actCell) {
        actCell.style.display = 'none';
      }
      const nativeSubmitLink = actCell?.querySelector('a[href*="/submit/"]') as HTMLAnchorElement | null;
      const nativeFavImg = actCell?.querySelector('img.toggle-favourite') as HTMLImageElement | null;

      // 3. Find the REAL Title cell
      const titleCell = cells.find(
        (c) =>
          c !== idCell &&
          c !== actCell &&
          !c.classList.contains('id') &&
          !c.classList.contains('act') &&
          c.querySelector('a[href*="/problem/"]')
      ) as HTMLTableCellElement | null;

      let combinedTitle = '';
      let problemUrl = '';
      const titleLink = titleCell?.querySelector('a[href*="/problem/"]') as HTMLAnchorElement | null;

      const tagLinks = Array.from(
        row.querySelectorAll('a[href*="tags="], a[href*="/tags/"], a[href*="/problemset/tags"], a.notice, a.tag-box')
      );
      let topics = tagLinks
        .map((tag) => ({
          name: tag.textContent?.trim() || '',
          url: (tag as HTMLAnchorElement).href || `https://codeforces.com/problemset?tags=${encodeURIComponent(tag.textContent?.trim() || '')}`,
        }))
        .filter((t) => t.name.length > 0 && !t.name.startsWith('*') && !t.name.match(/^\d+$/));

      const normalizedProblemId = problemId.toUpperCase().replace(/\s+/g, '');
      if (topics.length === 0 && normalizedProblemId && problemMetaCache.has(normalizedProblemId)) {
        topics = problemMetaCache.get(normalizedProblemId)?.tags || [];
      }

      if (titleCell) {
        titleCell.style.textAlign = 'left';
        titleCell.classList.add('lc-title-cell');

        tagLinks.forEach((tag) => {
          let parent = tag.parentElement;
          while (parent && parent !== titleCell) {
            if (parent.parentElement === titleCell) {
              parent.remove();
              break;
            }
            parent = parent.parentElement;
          }
          tag.remove();
        });

        titleCell
          .querySelectorAll('.notice, a[href*="/problemset/tags/"], div[style*="font-size: 11px"], div[style*="padding-top: 6px"]')
          .forEach((el) => {
            el.remove();
          });
      }

      if (titleLink) {
        const rawTitle = titleLink.getAttribute('data-raw-title') || titleLink.textContent?.trim() || '';
        titleLink.setAttribute('data-raw-title', rawTitle);

        combinedTitle = problemId ? `${problemId}. ${rawTitle}` : rawTitle;
        titleLink.textContent = combinedTitle;
        problemUrl = titleLink.href;
        titleLink.classList.add('lc-problem-title');
      }

      // 4. Rating Handling
      let ratingValue: number | null = null;
      let diffCategory: 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED' = 'UNRATED';
      let ratingCell: HTMLTableCellElement | null = row.querySelector('.lc-rating-cell');

      if (!ratingCell) {
        cells.forEach((cell) => {
          if (cell === idCell || cell === actCell || cell === titleCell || cell.classList.contains('lc-actions-cell')) return;
          const text = cell.textContent?.trim() || '';
          const ratingMatch = text.match(/^(\d{3,4})$/);
          if (ratingMatch && ratingMatch[1] && !cell.querySelector('.lc-diff-text')) {
            ratingCell = cell;
            ratingCell.classList.add('lc-rating-cell');
            const rating = parseInt(ratingMatch[1], 10);
            ratingValue = rating;
            let diffClass = 'lc-diff-medium';

            if (rating < 1200) {
              diffClass = 'lc-diff-easy';
              diffCategory = 'EASY';
            } else if (rating < 1900) {
              diffClass = 'lc-diff-medium';
              diffCategory = 'MEDIUM';
            } else {
              diffClass = 'lc-diff-hard';
              diffCategory = 'HARD';
            }

            cell.style.textAlign = 'right';
            cell.innerHTML = `<span class="lc-diff-text ${diffClass}">${rating}</span>`;
          }
        });
      }

      if (!ratingCell || !ratingCell.querySelector('.lc-diff-text')) {
        const solvedTd = row.querySelector('a[href*="/status/"]')?.closest('td');
        if (
          solvedTd &&
          solvedTd.previousElementSibling &&
          solvedTd.previousElementSibling !== titleCell &&
          !solvedTd.previousElementSibling.classList.contains('lc-actions-cell')
        ) {
          ratingCell = solvedTd.previousElementSibling as HTMLTableCellElement;
        }
        if (ratingCell && !ratingCell.querySelector('.lc-diff-text')) {
          ratingCell.classList.add('lc-rating-cell');
          ratingCell.style.textAlign = 'right';

          const apiMeta = normalizedProblemId ? problemMetaCache.get(normalizedProblemId) : null;
          if (apiMeta && typeof apiMeta.rating === 'number') {
            const rating = apiMeta.rating;
            ratingValue = rating;
            let diffClass = 'lc-diff-medium';
            if (rating < 1200) {
              diffClass = 'lc-diff-easy';
              diffCategory = 'EASY';
            } else if (rating < 1900) {
              diffClass = 'lc-diff-medium';
              diffCategory = 'MEDIUM';
            } else {
              diffClass = 'lc-diff-hard';
              diffCategory = 'HARD';
            }
            ratingCell.innerHTML = `<span class="lc-diff-text ${diffClass}">${rating}</span>`;
          } else {
            ratingCell.innerHTML = `<span class="lc-diff-text lc-diff-unrated" title="Unrated">-</span>`;
          }
        }
      }

      // 5. Solved By Handling
      const solvedLink = row.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
      const solvedCell = (solvedLink?.closest('td') || cells[cells.length - 1]) as HTMLTableCellElement | null;
      if (solvedCell) {
        solvedCell.style.textAlign = 'right';
        solvedCell.classList.add('lc-solved-cell');
      }
      if (solvedLink) {
        solvedLink.querySelectorAll('img').forEach((img) => img.remove());
        const rawText = solvedLink.textContent || '';
        const numMatch = rawText.match(/(\d+)/);
        if (numMatch && numMatch[1]) {
          const count = parseInt(numMatch[1], 10);
          const formattedCount = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`;
          solvedLink.innerHTML = `<span class="lc-solved-num" title="${count} solved">${formattedCount}</span>`;
          solvedLink.dataset.lcFormatted = 'true';
        }
      }

      // 6. Action Buttons Handling
      if (!row.querySelector('.lc-actions-cell')) {
        const actionsTd = document.createElement('td');
        actionsTd.className = 'lc-actions-cell';

        const group = document.createElement('div');
        group.className = 'lc-actions-group';

        const isNativeFav = nativeFavImg
          ? nativeFavImg.classList.contains('remove-favourite') ||
            nativeFavImg.src.includes('star_yellow') ||
            (nativeFavImg.getAttribute('title') || '').toLowerCase().includes('remove')
          : false;
        const isFav = isNativeFav || (problemId ? userFavorites.has(problemId) : false);

        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = `lc-icon-btn lc-btn-star ${isFav ? 'favorited' : ''}`;
        if (problemId) starBtn.setAttribute('data-problem-id', problemId);
        starBtn.title = isFav ? 'Remove from favourites' : 'Add to favourites';
        starBtn.appendChild(
          renderLucide(Star, {
            size: 14,
            fill: isFav ? '#ffa116' : 'none',
            stroke: isFav ? '#ffa116' : 'currentColor',
          })
        );

        starBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (nativeFavImg) {
            nativeFavImg.click();
            const willBeFav = !starBtn.classList.contains('favorited');
            starBtn.innerHTML = '';
            if (willBeFav) {
              starBtn.classList.add('favorited');
              starBtn.title = 'Remove from favourites';
              starBtn.appendChild(renderLucide(Star, { size: 14, fill: '#ffa116', stroke: '#ffa116' }));
              if (problemId) userFavorites.add(problemId);
            } else {
              starBtn.classList.remove('favorited');
              starBtn.title = 'Add to favourites';
              starBtn.appendChild(renderLucide(Star, { size: 14, fill: 'none', stroke: 'currentColor' }));
              if (problemId) userFavorites.delete(problemId);
            }
            browser.storage.local.set({ cf_favorites: Array.from(userFavorites) });

            setTimeout(() => {
              const nowFav =
                nativeFavImg.classList.contains('remove-favourite') ||
                nativeFavImg.src.includes('star_yellow') ||
                (nativeFavImg.getAttribute('title') || '').toLowerCase().includes('remove');
              starBtn.innerHTML = '';
              if (nowFav) {
                starBtn.classList.add('favorited');
                starBtn.title = 'Remove from favourites';
                starBtn.appendChild(renderLucide(Star, { size: 14, fill: '#ffa116', stroke: '#ffa116' }));
              } else {
                starBtn.classList.remove('favorited');
                starBtn.title = 'Add to favourites';
                starBtn.appendChild(renderLucide(Star, { size: 14, fill: 'none', stroke: 'currentColor' }));
              }
            }, 400);
          } else {
            const willBeFav = !starBtn.classList.contains('favorited');
            starBtn.innerHTML = '';
            if (willBeFav) {
              starBtn.classList.add('favorited');
              starBtn.title = 'Remove from favourites';
              starBtn.appendChild(renderLucide(Star, { size: 14, fill: '#ffa116', stroke: '#ffa116' }));
              if (problemId) userFavorites.add(problemId);
            } else {
              starBtn.classList.remove('favorited');
              starBtn.title = 'Add to favourites';
              starBtn.appendChild(renderLucide(Star, { size: 14, fill: 'none', stroke: 'currentColor' }));
              if (problemId) userFavorites.delete(problemId);
            }
            browser.storage.local.set({ cf_favorites: Array.from(userFavorites) });
          }
        });

        const submitBtn = document.createElement('a');
        submitBtn.className = 'lc-icon-btn lc-btn-submit';
        submitBtn.title = 'Submit solution';
        submitBtn.target = '_blank';
        submitBtn.rel = 'noreferrer';
        submitBtn.appendChild(renderLucide(Send, { size: 14, stroke: 'currentColor' }));

        if (nativeSubmitLink && nativeSubmitLink.href) {
          submitBtn.href = nativeSubmitLink.href;
        } else {
          const match =
            problemUrl.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/) ||
            problemUrl.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
          if (match && match[1] && match[2]) {
            submitBtn.href = `https://codeforces.com/contest/${match[1]}/submit?submittedProblemCode=${match[2]}`;
          } else if (problemId) {
            submitBtn.href = `https://codeforces.com/problemset/submit?submittedProblemCode=${problemId}`;
          } else {
            submitBtn.href = 'https://codeforces.com/problemset/submit';
          }
        }

        const topicsBtn = document.createElement('button');
        topicsBtn.type = 'button';
        topicsBtn.className = 'lc-icon-btn lc-btn-topics';
        topicsBtn.title = 'View Topics';
        topicsBtn.appendChild(renderLucide(Tag, { size: 14, stroke: 'currentColor' }));
        topicsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTopicsDialog(combinedTitle || problemId || 'Problem Topics', topics, problemId);
        });

        if (isSignedIn) {
          group.appendChild(starBtn);
        }
        group.appendChild(submitBtn);
        group.appendChild(topicsBtn);
        actionsTd.appendChild(group);

        if (actCell) {
          row.insertBefore(actionsTd, actCell);
        } else if (ratingCell) {
          row.insertBefore(actionsTd, ratingCell);
        } else if (titleCell && titleCell.nextSibling) {
          row.insertBefore(actionsTd, titleCell.nextSibling);
        } else {
          row.appendChild(actionsTd);
        }
      }

      if (problemUrl) {
        row.style.cursor = 'pointer';
        row.setAttribute('data-problem-url', problemUrl);
        row.addEventListener('click', (e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.closest('a, button, input, .lc-fav-btn, .lc-tag-chip, .lc-submit-btn, .lc-tags-dialog')) {
            return;
          }

          if (e.ctrlKey || e.metaKey || e.button === 1) {
            window.open(problemUrl, '_blank');
          } else if (e.button === 0) {
            window.location.href = problemUrl;
          }
        });

        row.addEventListener('auxclick', (e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.closest('a, button, input, .lc-fav-btn, .lc-tag-chip, .lc-submit-btn, .lc-tags-dialog')) {
            return;
          }
          if (e.button === 1) {
            window.open(problemUrl, '_blank');
          }
        });
      }

      row.dataset.lcEnhanced = 'true';

      const existingIdx = problemData.findIndex((p) => p.row === row || (p.id && p.id === problemId));
      if (existingIdx >= 0) {
        const existing = problemData[existingIdx];
        if (existing) {
          existing.rating = ratingValue;
          existing.difficultyCategory = diffCategory;
          existing.title = combinedTitle || existing.title;
        }
      } else {
        problemData.push({
          row,
          id: problemId,
          title: combinedTitle,
          rating: ratingValue,
          difficultyCategory: diffCategory,
          isSolved,
          problemUrl,
        });
      }
    }

    if (unenhancedRows.length > 0 && updateFiltersFn) {
      updateFiltersFn();
    }

    const datatable = document.querySelector('.datatable') || table;
    const roundbox = datatable.closest('.roundbox') as HTMLElement | null;
    if (roundbox) {
      roundbox.classList.add('lc-table-roundbox');
    }
    const containerParent = datatable.parentElement;

    document.getElementById('cf-lc-stats-banner')?.remove();

    enhanceSecondLevelMenu();

    // 4. LeetCode Toolbar (Instant Search, Filter by Difficulty / Status, Pick One)
    if (!document.getElementById('cf-lc-toolbar') && containerParent) {
      const toolbar = document.createElement('div');
      toolbar.id = 'cf-lc-toolbar';
      toolbar.className = 'lc-toolbar';

      const toolbarLeft = document.createElement('div');
      toolbarLeft.className = 'lc-toolbar-left';

      const searchWrap = document.createElement('div');
      searchWrap.className = 'lc-search-wrap';
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.id = 'cf-lc-search';
      searchInput.className = 'lc-search-input';
      searchInput.placeholder = 'Search problems or ID (e.g. 2284F)...';
      searchWrap.appendChild(searchInput);
      toolbarLeft.appendChild(searchWrap);

      const diffGroup = document.createElement('div');
      diffGroup.className = 'lc-filter-group';
      diffGroup.id = 'cf-lc-diff-group';
      diffGroup.innerHTML = `
        <button class="lc-filter-btn active" data-diff="ALL">All</button>
        <button class="lc-filter-btn easy" data-diff="EASY">Easy</button>
        <button class="lc-filter-btn medium" data-diff="MEDIUM">Medium</button>
        <button class="lc-filter-btn hard" data-diff="HARD">Hard</button>
      `;
      toolbarLeft.appendChild(diffGroup);

      const statusGroup = document.createElement('div');
      statusGroup.className = 'lc-filter-group';
      statusGroup.id = 'cf-lc-status-group';

      const btnAll = document.createElement('button');
      btnAll.className = 'lc-filter-btn active';
      btnAll.setAttribute('data-status', 'ALL');
      btnAll.textContent = 'All';

      const btnTodo = document.createElement('button');
      btnTodo.className = 'lc-filter-btn';
      btnTodo.setAttribute('data-status', 'TODO');
      btnTodo.textContent = 'Todo';

      const btnSolved = document.createElement('button');
      btnSolved.className = 'lc-filter-btn';
      btnSolved.setAttribute('data-status', 'SOLVED');
      btnSolved.textContent = 'Solved';

      const btnFav = document.createElement('button');
      btnFav.className = 'lc-filter-btn';
      btnFav.setAttribute('data-status', 'FAVORITES');
      btnFav.appendChild(renderLucide(Star, { size: 12, fill: '#ffa116', stroke: '#ffa116' }));
      btnFav.appendChild(document.createTextNode(' Favorites'));

      statusGroup.appendChild(btnAll);
      statusGroup.appendChild(btnTodo);
      statusGroup.appendChild(btnSolved);
      statusGroup.appendChild(btnFav);
      toolbarLeft.appendChild(statusGroup);

      const toolbarRight = document.createElement('div');
      toolbarRight.className = 'lc-toolbar-right';
      const pickOneBtn = document.createElement('button');
      pickOneBtn.id = 'cf-lc-pick-one-btn';
      pickOneBtn.className = 'lc-pick-one-btn';
      pickOneBtn.title = 'Pick a random problem from the list';
      pickOneBtn.appendChild(renderLucide(Shuffle, { size: 13, stroke: '#ffa116' }));
      pickOneBtn.appendChild(document.createTextNode(' Pick One'));
      toolbarRight.appendChild(pickOneBtn);

      toolbar.appendChild(toolbarLeft);
      toolbar.appendChild(toolbarRight);
      containerParent.insertBefore(toolbar, datatable);

      let searchQuery = '';
      let selectedDiff = 'ALL';
      let selectedStatus = 'ALL';

      const updateFilters = () => {
        let visibleCount = 0;
        let visibleSolved = 0;

        problemData.forEach((item) => {
          const matchesQuery =
            searchQuery === '' ||
            item.title.toLowerCase().includes(searchQuery) ||
            item.id.toLowerCase().includes(searchQuery);

          const matchesDiff =
            selectedDiff === 'ALL' || item.difficultyCategory === selectedDiff;

          const isFav = userFavorites.has(item.id);
          const matchesStatus =
            selectedStatus === 'ALL' ||
            (selectedStatus === 'SOLVED' && item.isSolved) ||
            (selectedStatus === 'TODO' && !item.isSolved) ||
            (selectedStatus === 'FAVORITES' && isFav);

          if (matchesQuery && matchesDiff && matchesStatus) {
            item.row.style.display = '';
            visibleCount++;
            if (item.isSolved) visibleSolved++;
          } else {
            item.row.style.display = 'none';
          }
        });

        const subText = document.getElementById('cf-lc-stats-sub');
        if (subText) {
          subText.textContent = `${visibleCount} of ${problemData.length} problems matching`;
        }
        const solvedText = document.getElementById('cf-lc-stat-solved');
        if (solvedText) {
          solvedText.textContent = `${visibleSolved} / ${visibleCount}`;
        }
      };

      updateFiltersFn = updateFilters;

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          searchQuery = searchInput.value.trim().toLowerCase();
          updateFilters();
        });
      }

      const diffButtons = toolbar.querySelectorAll('#cf-lc-diff-group button');
      diffButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          diffButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedDiff = btn.getAttribute('data-diff') || 'ALL';
          updateFilters();
        });
      });

      const statusButtons = toolbar.querySelectorAll('#cf-lc-status-group button');
      statusButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          statusButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedStatus = btn.getAttribute('data-status') || 'ALL';
          updateFilters();
        });
      });

      if (pickOneBtn) {
        pickOneBtn.addEventListener('click', () => {
          const visible = problemData.filter((p) => p.row.style.display !== 'none');
          if (visible.length === 0) {
            alert('No problems match your current search/filter!');
            return;
          }
          const randomProblem = visible[Math.floor(Math.random() * visible.length)];
          if (randomProblem && randomProblem.problemUrl) {
            window.location.href = randomProblem.problemUrl;
          }
        });
      }
    }
  } finally {
    isEnhancingTable = false;
  }
}

