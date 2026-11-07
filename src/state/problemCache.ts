import type { ProblemMetaItem, ProblemTag } from '../types';

export const problemMetaCache = new Map<string, ProblemMetaItem>();

let fetchProblemTagsPromise: Promise<void> | null = null;

export async function loadAllProblemTags(): Promise<void> {
  if (problemMetaCache.size > 0) return;
  if (fetchProblemTagsPromise) {
    return fetchProblemTagsPromise;
  }
  fetchProblemTagsPromise = (async () => {
    try {
      const stored = await browser.storage.local.get('cf_problem_tags_cache');
      if (stored.cf_problem_tags_cache && typeof stored.cf_problem_tags_cache === 'object') {
        const cachedObj = stored.cf_problem_tags_cache as {
          timestamp?: number;
          data?: Record<string, { tags: string[]; rating?: number }>;
        };
        if (cachedObj.timestamp && cachedObj.data) {
          const age = Date.now() - cachedObj.timestamp;
          if (age < 1000 * 60 * 60 * 12) {
            // Valid cache (< 12 hours)
            Object.entries(cachedObj.data).forEach(([pId, item]) => {
              const tagsList = Array.isArray(item.tags) ? item.tags : [];
              problemMetaCache.set(pId, {
                tags: tagsList.map((t) => ({
                  name: t,
                  url: `https://codeforces.com/problemset?tags=${encodeURIComponent(t)}`,
                })),
                rating: typeof item.rating === 'number' ? item.rating : undefined,
              });
            });
            return;
          }
        }
      }

      const res = await fetch('https://codeforces.com/api/problemset.problems');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'OK' && json.result?.problems) {
        const toStore: Record<string, { tags: string[]; rating?: number }> = {};
        json.result.problems.forEach((p: { contestId?: number; index?: string; tags?: string[]; rating?: number }) => {
          if (p.contestId && p.index) {
            const pId = `${p.contestId}${p.index}`.toUpperCase();
            const tagsArr = Array.isArray(p.tags) ? p.tags : [];
            toStore[pId] = { tags: tagsArr, rating: p.rating };
            problemMetaCache.set(pId, {
              tags: tagsArr.map((t) => ({
                name: t,
                url: `https://codeforces.com/problemset?tags=${encodeURIComponent(t)}`,
              })),
              rating: p.rating,
            });
          }
        });
        await browser.storage.local.set({
          cf_problem_tags_cache: {
            timestamp: Date.now(),
            data: toStore,
          },
        });
      }
    } catch (err) {
      console.debug('[LeetBoost] Tags fetch error:', err);
    } finally {
      fetchProblemTagsPromise = null;
    }
  })();
  return fetchProblemTagsPromise;
}

export function updateUnratedRowRatings(): void {
  document.querySelectorAll('tr.lc-problem-row').forEach((row) => {
    const unratedSpan = row.querySelector('.lc-diff-unrated');
    if (!unratedSpan) return;
    const idCell = row.querySelector('td.id');
    const pId = (idCell?.textContent?.trim() || '').toUpperCase().replace(/\s+/g, '');
    if (!pId || !problemMetaCache.has(pId)) return;
    const meta = problemMetaCache.get(pId);
    if (meta && typeof meta.rating === 'number') {
      const rating = meta.rating;
      let diffClass = 'lc-diff-medium';
      if (rating < 1200) diffClass = 'lc-diff-easy';
      else if (rating >= 1900) diffClass = 'lc-diff-hard';
      const ratingCell = unratedSpan.closest('.lc-rating-cell') || unratedSpan.parentElement;
      if (ratingCell) {
        ratingCell.innerHTML = `<span class="lc-diff-text ${diffClass}">${rating}</span>`;
      }
    }
  });
}

export async function fetchProblemTags(problemId: string): Promise<ProblemTag[]> {
  const pId = problemId.toUpperCase().replace(/\s+/g, '');
  if (problemMetaCache.has(pId)) {
    return problemMetaCache.get(pId)?.tags || [];
  }
  await loadAllProblemTags();
  return problemMetaCache.get(pId)?.tags || [];
}

