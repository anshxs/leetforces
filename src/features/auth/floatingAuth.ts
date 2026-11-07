import { User, LogOut } from 'lucide';
import { renderLucide } from '../../utils/icons';
import { leetcodeThemeEnabled } from '../../state/settingsState';
import type { CodeforcesAuthStatus, CodeforcesUserProfile } from '../../types';

export function getCodeforcesAuthStatus(): CodeforcesAuthStatus {
  const logoutLink = document.querySelector(
    '#header a[href*="/logout"], .lang-chooser a[href*="/logout"], .personal-sidebar a[href*="/logout"], a[href*="/logout"]'
  ) as HTMLAnchorElement | null;

  const enterOrRegisterBox = document.querySelector(
    '#header .enter-or-registerBox, .enter-or-registerBox'
  );

  let profileLink: HTMLAnchorElement | null = null;
  if (logoutLink) {
    profileLink =
      logoutLink.parentElement?.querySelector('a[href*="/profile/"]') ||
      logoutLink.closest('div')?.querySelector('a[href*="/profile/"]') ||
      (document.querySelector('#header a[href*="/profile/"]') as HTMLAnchorElement | null) ||
      (document.querySelector('.lang-chooser a[href*="/profile/"]') as HTMLAnchorElement | null) ||
      (document.querySelector('.personal-sidebar a[href*="/profile/"]') as HTMLAnchorElement | null);
  }

  if (!profileLink && !enterOrRegisterBox) {
    profileLink = document.querySelector(
      '#header a[href*="/profile/"], .personal-sidebar a[href*="/profile/"]'
    ) as HTMLAnchorElement | null;
  }

  let handle = '';
  if (profileLink) {
    const match = profileLink.href.match(/\/profile\/([^/?#]+)/);
    if (match && match[1]) {
      handle = match[1];
    } else {
      handle = profileLink.textContent?.trim() || '';
    }
  }

  const isSignedIn = logoutLink !== null || (handle !== '' && !enterOrRegisterBox);

  return {
    isSignedIn,
    handle,
    profileUrl: profileLink?.href || (handle ? `/profile/${handle}` : ''),
    logoutUrl: logoutLink?.href || '/logout',
  };
}

export function getRatingColor(rating: number): string {
  if (rating < 1200) return '#cccccc'; // Newbie
  if (rating < 1400) return '#77ff77'; // Pupil
  if (rating < 1600) return '#77ddbb'; // Specialist
  if (rating < 1900) return '#aaaaff'; // Expert
  if (rating < 2100) return '#ff88ff'; // Candidate Master
  if (rating < 2400) return '#ffcc88'; // Master
  return '#ff7777'; // Grandmaster+
}

export async function fetchUserProfileData(handle: string): Promise<Partial<CodeforcesUserProfile>> {
  let avatarUrl = '';
  let rating: number | undefined;
  let rank: string | undefined;

  // 1. Fetch user profile page
  try {
    const profileRes = await fetch(`/profile/${encodeURIComponent(handle)}`, {
      credentials: 'include',
    });
    if (profileRes.ok) {
      const htmlText = await profileRes.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const titlePhotoImg = doc.querySelector(
        '.title-photo img, .userbox img, img[src*="userpic"]'
      ) as HTMLImageElement | null;
      let src = titlePhotoImg?.getAttribute('src') || '';
      if (!src) {
        const match = htmlText.match(/src=["']([^"']*(?:userpic\.codeforces\.org|\/avatar\/)[^"']*)["']/i);
        if (match && match[1]) {
          src = match[1];
        }
      }
      if (src) {
        if (src.startsWith('//')) {
          avatarUrl = `https:${src}`;
        } else if (src.startsWith('/')) {
          avatarUrl = `https://codeforces.com${src}`;
        } else {
          avatarUrl = src;
        }
      }
    }
  } catch (err) {
    console.debug('[LeetBoost] Profile HTML fetch error:', err);
  }

  // 2. Fetch Codeforces official user.info API for rating, rank, and backup avatar
  try {
    const apiRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.status === 'OK' && data.result && data.result[0]) {
        const u = data.result[0];
        if (u.rating !== undefined) rating = u.rating;
        if (u.rank !== undefined) rank = u.rank;
        if (!avatarUrl && (u.avatar || u.titlePhoto)) {
          let apiAvatar = u.avatar || u.titlePhoto;
          if (apiAvatar.startsWith('//')) {
            apiAvatar = `https:${apiAvatar}`;
          }
          avatarUrl = apiAvatar;
        }
      }
    }
  } catch (err) {
    console.debug('[LeetBoost] User API fetch error:', err);
  }

  return { rating, rank, avatarUrl };
}

export function enhanceFloatingAuth(): void {
  if (!leetcodeThemeEnabled) {
    const auth = document.getElementById('lc-floating-auth');
    if (auth) auth.style.display = 'none';
    return;
  }

  let authContainer = document.getElementById('lc-floating-auth');
  if (!authContainer) {
    authContainer = document.createElement('div');
    authContainer.id = 'lc-floating-auth';
    authContainer.className = 'lc-floating-auth';
    document.body.appendChild(authContainer);
  }
  authContainer.style.display = 'flex';

  const authStatus = getCodeforcesAuthStatus();
  const targetState = authStatus.isSignedIn && authStatus.handle ? 'signed_in' : 'signed_out';
  const currentRenderedState = authContainer.dataset.authState;
  const currentRenderedHandle = authContainer.dataset.authHandle || '';

  if (
    currentRenderedState === targetState &&
    (targetState === 'signed_out' || currentRenderedHandle === authStatus.handle)
  ) {
    return;
  }

  authContainer.dataset.authState = targetState;
  authContainer.dataset.authHandle = authStatus.handle;
  authContainer.innerHTML = '';

  if (targetState === 'signed_in') {
    const handle = authStatus.handle;
    const profileHref = authStatus.profileUrl || `/profile/${handle}`;
    const logoutHref = authStatus.logoutUrl || '/logout';

    browser.storage.local.set({ cf_current_user: handle });

    const profileLink = document.querySelector(`a[href*="/profile/${handle}"]`);
    const userSpan = profileLink?.querySelector('span[class*="user-"]') || profileLink;
    const userColorClass = userSpan
      ? Array.from(userSpan.classList).find((c) => c.startsWith('user-')) || ''
      : '';

    const userPill = document.createElement('div');
    userPill.className = 'lc-auth-user-pill';

    const avatarLink = document.createElement('a');
    avatarLink.className = 'lc-auth-avatar-wrap';
    avatarLink.href = profileHref;
    avatarLink.title = `View profile (${handle})`;

    const defaultIcon = renderLucide(User, { size: 14, stroke: 'currentColor' });
    avatarLink.appendChild(defaultIcon);

    function setAvatar(url: string) {
      if (!url) return;
      const img = document.createElement('img');
      img.className = 'lc-auth-user-avatar';
      img.src = url;
      img.alt = handle;
      img.onload = () => {
        avatarLink.innerHTML = '';
        avatarLink.appendChild(img);
      };
      img.onerror = () => {
        avatarLink.innerHTML = '';
        avatarLink.appendChild(renderLucide(User, { size: 14, stroke: 'currentColor' }));
      };
    }

    const handleLink = document.createElement('a');
    handleLink.className = `lc-auth-handle ${userColorClass}`;
    handleLink.href = profileHref;
    handleLink.textContent = handle;
    handleLink.title = `View profile (${handle})`;

    const ratingBadge = document.createElement('span');
    ratingBadge.className = 'lc-auth-rating-badge';

    function applyRating(rating: number) {
      ratingBadge.textContent = `${rating}`;
      const color = getRatingColor(rating);
      ratingBadge.style.color = color;
      ratingBadge.title = `Rating: ${rating}`;
      handleLink.style.color = color;
    }

    browser.storage.local
      .get<{ [key: string]: any }>(`cf_user_${handle}`)
      .then((res) => {
        const cached = res[`cf_user_${handle}`];
        const isFresh = cached && Date.now() - (cached.updatedAt || 0) < 3600000;
        if (cached?.avatarUrl) {
          setAvatar(cached.avatarUrl);
        }
        if (cached?.rating !== undefined) {
          applyRating(cached.rating);
        }

        if (!isFresh || !cached?.avatarUrl || cached?.rating === undefined) {
          fetchUserProfileData(handle).then((data) => {
            if (data.avatarUrl) {
              setAvatar(data.avatarUrl);
            }
            if (data.rating !== undefined) {
              applyRating(data.rating);
            }
            browser.storage.local.set({
              [`cf_user_${handle}`]: {
                rating: data.rating ?? cached?.rating,
                rank: data.rank ?? cached?.rank,
                avatarUrl: data.avatarUrl ?? cached?.avatarUrl,
                updatedAt: Date.now(),
              },
            });
          });
        }
      });

    const logoutBtn = document.createElement('a');
    logoutBtn.className = 'lc-auth-logout-btn';
    logoutBtn.href = logoutHref;
    logoutBtn.title = 'Logout';
    logoutBtn.appendChild(renderLucide(LogOut, { size: 14, stroke: 'currentColor' }));
    logoutBtn.addEventListener('click', () => {
      browser.storage.local.remove('cf_current_user');
    });

    userPill.appendChild(avatarLink);
    userPill.appendChild(handleLink);
    userPill.appendChild(ratingBadge);
    userPill.appendChild(logoutBtn);
    authContainer.appendChild(userPill);
  } else {
    browser.storage.local.remove('cf_current_user');

    const enterLink = document.querySelector('a[href*="/enter"]') as HTMLAnchorElement | null;
    const registerLink = document.querySelector('a[href*="/register"]') as HTMLAnchorElement | null;

    const enterHref = enterLink?.href || 'https://codeforces.com/enter';
    const registerHref = registerLink?.href || 'https://codeforces.com/register';

    const enterBtn = document.createElement('a');
    enterBtn.className = 'lc-floating-btn lc-btn-enter';
    enterBtn.href = enterHref;
    enterBtn.textContent = 'Enter';
    enterBtn.title = 'Sign In to Codeforces';

    const registerBtn = document.createElement('a');
    registerBtn.className = 'lc-floating-btn lc-btn-register';
    registerBtn.href = registerHref;
    registerBtn.textContent = 'Register';
    registerBtn.title = 'Register on Codeforces';

    authContainer.appendChild(enterBtn);
    authContainer.appendChild(registerBtn);
  }
}

