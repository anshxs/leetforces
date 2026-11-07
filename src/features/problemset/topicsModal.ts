import { Tag, X } from 'lucide';
import { renderLucide } from '../../utils/icons';
import { problemMetaCache, fetchProblemTags } from '../../state/problemCache';
import type { ProblemTag } from '../../types';

export async function openTopicsDialog(
  problemTitle: string,
  initialTopics: ProblemTag[],
  problemId?: string
): Promise<void> {
  let dialog = document.getElementById('cf-lc-topics-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'cf-lc-topics-dialog';
    dialog.className = 'lc-dialog-overlay';

    const modal = document.createElement('div');
    modal.className = 'lc-dialog-modal';

    const header = document.createElement('div');
    header.className = 'lc-dialog-header';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'lc-dialog-title';
    titleDiv.appendChild(renderLucide(Tag, { size: 16, stroke: '#ffa116' }));
    const nameSpan = document.createElement('span');
    nameSpan.id = 'cf-lc-dialog-problem-name';
    titleDiv.appendChild(nameSpan);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'cf-lc-dialog-close';
    closeBtn.className = 'lc-dialog-close-btn';
    closeBtn.appendChild(renderLucide(X, { size: 16, stroke: '#909090' }));

    header.appendChild(titleDiv);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'lc-dialog-body';
    body.id = 'cf-lc-dialog-topics-list';

    modal.appendChild(header);
    modal.appendChild(body);
    dialog.appendChild(modal);
    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog!.style.display = 'none';
      }
    });

    closeBtn.addEventListener('click', () => {
      dialog!.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog && dialog.style.display !== 'none') {
        dialog.style.display = 'none';
      }
    });
  }

  const nameEl = dialog.querySelector('#cf-lc-dialog-problem-name');
  if (nameEl) nameEl.textContent = `Topics · ${problemTitle}`;

  const listEl = dialog.querySelector('#cf-lc-dialog-topics-list');
  if (!listEl) return;

  const renderTopics = (topicsList: ProblemTag[]) => {
    listEl.innerHTML = '';
    if (topicsList.length === 0) {
      listEl.innerHTML = '<div class="lc-dialog-empty">No topics listed for this problem.</div>';
      return;
    }
    topicsList.forEach((t) => {
      const pill = document.createElement('a');
      pill.className = 'lc-dialog-tag-pill';
      pill.href = t.url;
      pill.target = '_blank';
      pill.rel = 'noreferrer';
      pill.appendChild(renderLucide(Tag, { size: 11, stroke: '#94a3b8' }));
      pill.appendChild(document.createTextNode(` ${t.name}`));
      listEl.appendChild(pill);
    });
  };

  dialog.style.display = 'flex';

  if (initialTopics.length > 0) {
    renderTopics(initialTopics);
    return;
  }

  const pId = problemId ? problemId.toUpperCase().replace(/\s+/g, '') : '';
  if (pId && problemMetaCache.has(pId)) {
    const cached = problemMetaCache.get(pId)?.tags || [];
    if (cached.length > 0) {
      renderTopics(cached);
      return;
    }
  }

  listEl.innerHTML =
    '<div class="lc-dialog-loading"><span class="lc-dialog-spinner"></span> Loading topics...</div>';

  const fetchedTopics = await fetchProblemTags(pId);
  renderTopics(fetchedTopics);
}

