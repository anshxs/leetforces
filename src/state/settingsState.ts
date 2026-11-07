import { Star } from 'lucide';
import { renderLucide } from '../utils/icons';
import type { ExtensionSettings } from '../types';

export let leetcodeThemeEnabled = true;
export let hideTagsEnabled = false;
export let showTimerEnabled = true;
export const userFavorites = new Set<string>();

export function updateFavoritesUI(): void {
  document.querySelectorAll('.lc-btn-star').forEach((btn) => {
    const pId = btn.getAttribute('data-problem-id');
    if (!pId) return;
    const isFav = userFavorites.has(pId);
    btn.innerHTML = '';
    if (isFav) {
      btn.classList.add('favorited');
      btn.setAttribute('title', 'Remove from favourites');
      btn.appendChild(renderLucide(Star, { size: 14, fill: '#ffa116', stroke: '#ffa116' }));
    } else {
      btn.classList.remove('favorited');
      btn.setAttribute('title', 'Add to favourites');
      btn.appendChild(renderLucide(Star, { size: 14, fill: 'none', stroke: 'currentColor' }));
    }
  });
}

export function applyThemeState(): void {
  const sidebar = document.getElementById('lc-sidebar-nav');
  const auth = document.getElementById('lc-floating-auth');
  if (leetcodeThemeEnabled) {
    document.documentElement.classList.add('lc-theme');
    if (sidebar) sidebar.style.display = 'flex';
    if (auth) auth.style.display = 'flex';
  } else {
    document.documentElement.classList.remove('lc-theme');
    if (sidebar) sidebar.style.display = 'none';
    if (auth) auth.style.display = 'none';
  }
}

export interface SettingsCallbacks {
  onThemeChanged?: () => void;
  onHideTagsChanged?: (enabled: boolean) => void;
  onShowTimerChanged?: (enabled: boolean) => void;
}

export async function initSettingsAndFavorites(
  callbacks?: SettingsCallbacks
): Promise<void> {
  const onThemeChanged = callbacks?.onThemeChanged;
  const onHideTagsChanged = callbacks?.onHideTagsChanged;
  const onShowTimerChanged = callbacks?.onShowTimerChanged;
  try {
    const data = await browser.storage.local.get([
      'cf_leetcode_theme',
      'cf_hide_tags',
      'cf_show_timer',
      'cf_favorites',
    ]);
    const res = data as ExtensionSettings & { cf_favorites?: string[] };
    if (typeof res.cf_leetcode_theme === 'boolean') {
      leetcodeThemeEnabled = res.cf_leetcode_theme;
    }
    if (typeof res.cf_hide_tags === 'boolean') {
      hideTagsEnabled = res.cf_hide_tags;
    }
    if (typeof res.cf_show_timer === 'boolean') {
      showTimerEnabled = res.cf_show_timer;
    }
    if (Array.isArray(res.cf_favorites)) {
      userFavorites.clear();
      res.cf_favorites.forEach((id) => userFavorites.add(id));
      updateFavoritesUI();
    }
    applyThemeState();
    if (onThemeChanged) onThemeChanged();
  } catch {
    applyThemeState();
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.cf_leetcode_theme && typeof changes.cf_leetcode_theme.newValue === 'boolean') {
      leetcodeThemeEnabled = changes.cf_leetcode_theme.newValue;
      applyThemeState();
      if (onThemeChanged) onThemeChanged();
    }
    if (changes.cf_hide_tags && typeof changes.cf_hide_tags.newValue === 'boolean') {
      hideTagsEnabled = changes.cf_hide_tags.newValue;
      if (onHideTagsChanged) onHideTagsChanged(hideTagsEnabled);
    }
    if (changes.cf_show_timer && typeof changes.cf_show_timer.newValue === 'boolean') {
      showTimerEnabled = changes.cf_show_timer.newValue;
      if (onShowTimerChanged) onShowTimerChanged(showTimerEnabled);
    }
    if (changes.cf_favorites && Array.isArray(changes.cf_favorites.newValue)) {
      userFavorites.clear();
      changes.cf_favorites.newValue.forEach((id: string) => userFavorites.add(id));
      updateFavoritesUI();
    }
  });
}
