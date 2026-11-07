import './leetcode.css';
import {
  createElement as createLucideElement,
  Star,
  Upload,
  Tag,
  Search,
  Filter,
  Shuffle,
  Zap,
  Check,
  Eye,
  EyeOff,
  Copy,
  Clock,
  Play,
  Pause,
  RotateCcw,
  X,
  Send,
  Home,
  Flame,
  BookOpen,
  Trophy,
  Dumbbell,
  Code2,
  Users,
  Award,
  GraduationCap,
  Terminal,
  Calendar,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
} from 'lucide';

interface ExtensionSettings {
  cf_leetcode_theme?: boolean;
  cf_hide_tags?: boolean;
  cf_show_timer?: boolean;
}

function renderLucide(
  iconNode: any,
  options: {
    size?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    className?: string;
  } = {}
): SVGElement {
  const size = options.size || 15;
  return createLucideElement(iconNode, {
    width: size,
    height: size,
    'stroke-width': options.strokeWidth || 2,
    stroke: options.stroke || 'currentColor',
    fill: options.fill || 'none',
    class: `lc-lucide-icon ${options.className || ''}`.trim(),
  });
}

export default defineContentScript({
  matches: ['*://*.codeforces.com/*', '*://*.codeforces.net/*'],
  runAt: 'document_start',
  main() {
    // Immediately apply theme class to prevent white flash
    document.documentElement.classList.add('lc-theme');

    let leetcodeThemeEnabled = true;
    let hideTagsEnabled = false;
    let showTimerEnabled = true;
    let userFavorites: Set<string> = new Set();

    // Load favorites and settings
    browser.storage.local
      .get(['cf_leetcode_theme', 'cf_hide_tags', 'cf_show_timer', 'cf_favorites'])
      .then((data) => {
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
          userFavorites = new Set(res.cf_favorites);
          updateFavoritesUI();
        }
        applyThemeState();
      })
      .catch(() => {
        applyThemeState();
      });

    // Listen for settings and favorites changes
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.cf_leetcode_theme && typeof changes.cf_leetcode_theme.newValue === 'boolean') {
        leetcodeThemeEnabled = changes.cf_leetcode_theme.newValue;
        applyThemeState();
      }
      if (changes.cf_hide_tags && typeof changes.cf_hide_tags.newValue === 'boolean') {
        hideTagsEnabled = changes.cf_hide_tags.newValue;
        if (isProblemPage()) {
          manageProblemTags(hideTagsEnabled);
        }
      }
      if (changes.cf_show_timer && typeof changes.cf_show_timer.newValue === 'boolean') {
        showTimerEnabled = changes.cf_show_timer.newValue;
        if (isProblemPage()) {
          manageProblemTimer(showTimerEnabled);
        }
      }
      if (changes.cf_favorites && Array.isArray(changes.cf_favorites.newValue)) {
        userFavorites = new Set(changes.cf_favorites.newValue);
        updateFavoritesUI();
      }
    });

    function updateFavoritesUI() {
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

    function applyThemeState() {
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
      runDomEnhancements();
    }

    const isProblemsetPage = () => {
      const path = window.location.pathname;
      return path.startsWith('/problemset') && !path.includes('/problemset/problem/');
    };

    const isProblemPage = () => {
      const path = window.location.pathname;
      return (
        path.includes('/problemset/problem/') ||
        (path.includes('/contest/') && path.includes('/problem/')) ||
        (path.includes('/gym/') && path.includes('/problem/'))
      );
    };

    function runDomEnhancements() {
      if (!leetcodeThemeEnabled) {
        const sidebar = document.getElementById('lc-sidebar-nav');
        if (sidebar) sidebar.style.display = 'none';
        const auth = document.getElementById('lc-floating-auth');
        if (auth) auth.style.display = 'none';
        return;
      }

      // Remove contest announcement banners / infobars
      document.querySelectorAll('[data-infobarid], .alert.alert-success, .infobar-close').forEach((el) => {
        const box = el.closest('[data-infobarid], .alert') || el;
        box.remove();
      });

      enhanceMainNavigation();
      enhanceFloatingAuth();
      enhanceSecondLevelMenu();

      if (document.getElementById('sidebar')) {
        enhanceSidebarFilters();
      }

      if (isProblemsetPage()) {
        enhanceProblemsetTable();
      } else if (isProblemPage()) {
        enhanceProblemPage();
      }
    }

    // ========================================================================
    // Floating Auth & User Status (Top-Right)
    // ========================================================================
    function getCodeforcesAuthStatus(): {
      isSignedIn: boolean;
      handle: string;
      profileUrl: string;
      logoutUrl: string;
    } {
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

    async function fetchUserProfileData(handle: string): Promise<{
      rating?: number;
      rank?: string;
      avatarUrl?: string;
    }> {
      let avatarUrl = '';
      let rating: number | undefined;
      let rank: string | undefined;

      // 1. Fetch user profile page (as requested: https://codeforces.com/profile/<handle>)
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

    function enhanceFloatingAuth() {
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

      // If already accurately rendered, avoid unnecessary DOM updates
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

        // 1. User Avatar / Icon Link
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

        // 2. User Handle Link
        const handleLink = document.createElement('a');
        handleLink.className = `lc-auth-handle ${userColorClass}`;
        handleLink.href = profileHref;
        handleLink.textContent = handle;
        handleLink.title = `View profile (${handle})`;

        // 3. Rating Badge (Numeric)
        const ratingBadge = document.createElement('span');
        ratingBadge.className = 'lc-auth-rating-badge';

        function applyRating(rating: number) {
          ratingBadge.textContent = `${rating}`;
          const color = getRatingColor(rating);
          ratingBadge.style.color = color;
          ratingBadge.title = `Rating: ${rating}`;
          handleLink.style.color = color;
        }

        // Try reading cached profile data (rating & avatar)
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

        // 4. Logout Button
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

    function getRatingColor(rating: number): string {
      if (rating < 1200) return '#cccccc'; // Newbie
      if (rating < 1400) return '#77ff77'; // Pupil
      if (rating < 1600) return '#77ddbb'; // Specialist
      if (rating < 1900) return '#aaaaff'; // Expert
      if (rating < 2100) return '#ff88ff'; // Candidate Master
      if (rating < 2400) return '#ffcc88'; // Master
      return '#ff7777'; // Grandmaster+
    }

    // ========================================================================
    // Second-Level Menu (Main, acmsguru) -> Modern LeetCode Segmented Tabs
    // ========================================================================
    function enhanceSecondLevelMenu() {
      const menu = document.querySelector('.second-level-menu') as HTMLElement | null;
      if (!menu) return;

      menu.classList.add('lc-second-level-menu');
      menu
        .querySelectorAll(
          '.roundbox-lt, .roundbox-rt, .roundbox-lb, .roundbox-rb, .roundbox-top, .roundbox-bottom, li.back, .corner'
        )
        .forEach((el) => el.remove());

      menu.removeAttribute('style');
      menu.querySelectorAll('div, ul, li, a').forEach((el) => {
        el.removeAttribute('style');
      });
    }

    // ========================================================================
    // Main Navigation -> LeetCode Left Sidebar
    // ========================================================================
    function enhanceMainNavigation() {
      let sidebar = document.getElementById('lc-sidebar-nav');
      if (sidebar) {
        sidebar.style.display = leetcodeThemeEnabled ? 'flex' : 'none';
        return;
      }
      if (!leetcodeThemeEnabled) return;

      interface NavItemConfig {
        name: string;
        href: string;
        icon: typeof Home;
        key: string;
      }

      const defaultNavItems: NavItemConfig[] = [
        { name: 'Home', href: '/', icon: Home, key: 'home' },
        { name: 'Top', href: '/top', icon: Flame, key: 'top' },
        { name: 'Catalog', href: '/catalog', icon: BookOpen, key: 'catalog' },
        { name: 'Contests', href: '/contests', icon: Trophy, key: 'contests' },
        { name: 'Gym', href: '/gyms', icon: Dumbbell, key: 'gym' },
        { name: 'Problemset', href: '/problemset', icon: Code2, key: 'problemset' },
        { name: 'Groups', href: '/groups', icon: Users, key: 'groups' },
        { name: 'Rating', href: '/rating', icon: Award, key: 'rating' },
        { name: 'Edu', href: '/edu', icon: GraduationCap, key: 'edu' },
        { name: 'API', href: '/apiHelp', icon: Terminal, key: 'api' },
        { name: 'Calendar', href: '/calendar', icon: Calendar, key: 'calendar' },
        { name: 'Help', href: '/help', icon: HelpCircle, key: 'help' },
      ];

      // Extract raw links from Codeforces menu if present, otherwise use defaults
      const rawLinks = Array.from(
        document.querySelectorAll('.main-menu-list a, .menu-list a, #main-menu a')
      ) as HTMLAnchorElement[];

      let navItems: NavItemConfig[] = [];

      if (rawLinks.length > 0) {
        navItems = rawLinks.map((link) => {
          const text = link.textContent?.trim() || '';
          const href = link.getAttribute('href') || '/';
          const lower = text.toLowerCase();

          let icon = Code2;
          let key = lower;

          if (lower.includes('home')) {
            icon = Home;
            key = 'home';
          } else if (lower.includes('top')) {
            icon = Flame;
            key = 'top';
          } else if (lower.includes('catalog')) {
            icon = BookOpen;
            key = 'catalog';
          } else if (lower.includes('contest')) {
            icon = Trophy;
            key = 'contests';
          } else if (lower.includes('gym')) {
            icon = Dumbbell;
            key = 'gym';
          } else if (lower.includes('problem')) {
            icon = Code2;
            key = 'problemset';
          } else if (lower.includes('group')) {
            icon = Users;
            key = 'groups';
          } else if (lower.includes('rating')) {
            icon = Award;
            key = 'rating';
          } else if (lower.includes('edu')) {
            icon = GraduationCap;
            key = 'edu';
          } else if (lower.includes('api')) {
            icon = Terminal;
            key = 'api';
          } else if (lower.includes('calendar')) {
            icon = Calendar;
            key = 'calendar';
          } else if (lower.includes('help')) {
            icon = HelpCircle;
            key = 'help';
          }

          const formattedName = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

          return {
            name: formattedName,
            href,
            icon,
            key,
          };
        });
      } else {
        navItems = defaultNavItems;
      }

      // Create Sidebar element
      sidebar = document.createElement('aside');
      sidebar.id = 'lc-sidebar-nav';
      sidebar.className = 'lc-sidebar-nav';

      // Check saved collapsed state
      browser.storage.local
        .get<{ cf_sidebar_collapsed?: boolean }>('cf_sidebar_collapsed')
        .then((res) => {
          if (res.cf_sidebar_collapsed && sidebar) {
            document.documentElement.classList.add('lc-sidebar-collapsed');
            sidebar.classList.add('collapsed');
            updateToggleBtn(true);
          }
        });

      // 1. Sidebar Header (Brand Logo)
      const brandHeader = document.createElement('div');
      brandHeader.className = 'lc-sidebar-header';

      const brand = document.createElement('a');
      brand.className = 'lc-sidebar-brand';
      brand.href = '/problemset';
      brand.title = 'Codeforces';

      const logoImg = document.createElement('img');
      logoImg.className = 'lc-sidebar-logo-img';
      logoImg.src = browser.runtime.getURL('/codeforces.png' as any);
      logoImg.alt = 'Codeforces';

      brand.appendChild(logoImg);
      brandHeader.appendChild(brand);
      sidebar.appendChild(brandHeader);

      // 2. Navigation Items List
      const navList = document.createElement('nav');
      navList.className = 'lc-sidebar-nav-list';

      const currentPath = window.location.pathname;

      navItems.forEach((item) => {
        const navLink = document.createElement('a');
        navLink.className = 'lc-sidebar-nav-item';
        navLink.href = item.href;
        navLink.title = item.name;

        // Check active state
        let isActive = false;
        if (
          item.key === 'problemset' &&
          (currentPath.startsWith('/problemset') || currentPath.includes('/problem/'))
        ) {
          isActive = true;
        } else if (
          item.key === 'contests' &&
          (currentPath.startsWith('/contest') || currentPath.startsWith('/contests'))
        ) {
          isActive = true;
        } else if (item.key === 'gym' && currentPath.startsWith('/gym')) {
          isActive = true;
        } else if (
          item.key === 'home' &&
          (currentPath === '/' || currentPath === '/index.html')
        ) {
          isActive = true;
        } else if (item.href !== '/' && currentPath.startsWith(item.href)) {
          isActive = true;
        }

        if (isActive) {
          navLink.classList.add('active');
        }

        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-nav-icon';
        iconWrap.appendChild(renderLucide(item.icon, { size: 18, stroke: 'currentColor' }));

        const labelSpan = document.createElement('span');
        labelSpan.className = 'lc-sidebar-nav-label';
        labelSpan.textContent = item.name;

        navLink.appendChild(iconWrap);
        navLink.appendChild(labelSpan);
        navList.appendChild(navLink);
      });

      sidebar.appendChild(navList);

      // 3. Sidebar Footer (Toggle collapse button)
      const footer = document.createElement('div');
      footer.className = 'lc-sidebar-footer';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'lc-sidebar-toggle-btn';
      toggleBtn.title = 'Collapse sidebar';

      function updateToggleBtn(isCollapsed: boolean) {
        toggleBtn.innerHTML = '';
        if (isCollapsed) {
          toggleBtn.appendChild(
            renderLucide(PanelLeftOpen, { size: 16, stroke: 'currentColor' })
          );
          toggleBtn.title = 'Expand sidebar';
        } else {
          toggleBtn.appendChild(
            renderLucide(PanelLeftClose, { size: 16, stroke: 'currentColor' })
          );
          const txt = document.createElement('span');
          txt.className = 'lc-sidebar-toggle-text';
          txt.textContent = 'Collapse';
          toggleBtn.appendChild(txt);
          toggleBtn.title = 'Collapse sidebar';
        }
      }

      updateToggleBtn(false);

      toggleBtn.addEventListener('click', () => {
        if (!sidebar) return;
        const isCollapsed = document.documentElement.classList.toggle('lc-sidebar-collapsed');
        sidebar.classList.toggle('collapsed', isCollapsed);
        updateToggleBtn(isCollapsed);
        browser.storage.local.set({ cf_sidebar_collapsed: isCollapsed });
      });

      footer.appendChild(toggleBtn);
      sidebar.appendChild(footer);

      document.body.appendChild(sidebar);
    }

    // ========================================================================
    // Contest Cards in "Pay attention" Section (Running or Registration Open)
    // ========================================================================
    let contestTimerInterval: number | null = null;
    let isFetchingContests = false;

    function getPayAttentionBox(): HTMLElement | null {
      const allSideboxes = Array.from(
        document.querySelectorAll('.roundbox.sidebox, .sidebox, #sidebar .roundbox')
      ) as HTMLElement[];

      for (const box of allSideboxes) {
        if (box.id === 'lc-pay-attention-box') return box;
        const cap = box.querySelector('.caption, .caption.titled');
        const t = cap?.textContent?.toLowerCase() || '';
        if (
          t.includes('pay attention') ||
          t.includes('attention') ||
          t.includes('обратите внимание') ||
          box.querySelector('.contest-state-phase, .countdown[cdid]')
        ) {
          return box;
        }
      }
      return null;
    }

    function renderContestCardsFromDOM(payAttentionBox: HTMLElement, titleLinks: HTMLAnchorElement[]) {
      payAttentionBox.dataset.lcContestEnhanced = 'true';

      interface DOMContestItem {
        id: string;
        name: string;
        url: string;
        phaseText: string;
        isRunning: boolean;
        isRegistration: boolean;
        countdownEl: HTMLElement | null;
        countdownText: string;
        regUrl: string;
      }

      const items: DOMContestItem[] = [];

      titleLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/contest[s]?\/(\d+)/);
        const contestId = (match && match[1]) ? match[1] : '';
        const name = link.textContent?.trim() || 'Contest';
        const itemDiv = link.closest('div[style*="text-align"], div') || link.parentElement || payAttentionBox;

        const phaseEl = itemDiv.querySelector('.contest-state-phase');
        const phaseText = phaseEl?.textContent?.trim() || '';
        const lowerPhase = phaseText.toLowerCase();

        const isRunning =
          lowerPhase.includes('running') ||
          lowerPhase.includes('идет') ||
          href.includes('/standings');

        const isRegistration =
          lowerPhase.includes('register') ||
          lowerPhase.includes('open') ||
          lowerPhase.includes('регистрац');

        const countdownEl = itemDiv.querySelector('.countdown') as HTMLElement | null;
        const countdownText = countdownEl?.textContent?.trim() || '';

        const regLink = itemDiv.querySelector('a[href*="/register"]') as HTMLAnchorElement | null;
        const regUrl = regLink?.href || (contestId ? `/contest/${contestId}/register` : href);

        items.push({
          id: contestId,
          name,
          url: contestId ? `/contest/${contestId}` : href,
          phaseText,
          isRunning,
          isRegistration,
          countdownEl,
          countdownText,
          regUrl,
        });
      });

      // Clear legacy box contents
      payAttentionBox.innerHTML = '';
      payAttentionBox.removeAttribute('style');
      payAttentionBox.className = 'roundbox sidebox lc-pay-attention-box';

      // Clean Header Caption
      const caption = document.createElement('div');
      caption.className = 'caption titled';
      const iconWrap = document.createElement('span');
      iconWrap.className = 'lc-sidebar-caption-icon';
      iconWrap.appendChild(renderLucide(Trophy, { size: 14, stroke: 'currentColor' }));
      caption.appendChild(iconWrap);
      caption.appendChild(document.createTextNode(' Pay Attention'));
      payAttentionBox.appendChild(caption);

      // Cards Container
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'lc-contest-cards-container';

      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = `lc-contest-card ${item.isRunning ? 'is-running' : ''}`;

        // 1. Header Badge Row
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

        // 2. Contest Title
        const titleLink = document.createElement('a');
        titleLink.className = 'lc-contest-title';
        titleLink.href = item.url;
        titleLink.textContent = item.name;
        titleLink.title = item.name;
        card.appendChild(titleLink);

        // 3. Timing / Countdown Row
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

        if (item.countdownEl) {
          item.countdownEl.classList.add('lc-contest-time');
          metaRow.appendChild(item.countdownEl);
        } else if (item.countdownText) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'lc-contest-time';
          timeSpan.textContent = item.countdownText;
          metaRow.appendChild(timeSpan);
        }

        card.appendChild(metaRow);

        // 4. Action Button
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
    }

    async function enhancePayAttentionContests() {
      const sidebar = document.getElementById('sidebar');
      const payAttentionBox = getPayAttentionBox();

      if (!payAttentionBox && !sidebar) return;

      // If already enhanced by our extension, avoid re-running if cards are already in place
      if (payAttentionBox?.dataset.lcContestEnhanced === 'true' && payAttentionBox.querySelector('.lc-contest-card')) {
        return;
      }

      // 1. Try parsing directly from DOM (instant & sync)
      if (payAttentionBox) {
        const contestLinks = Array.from(
          payAttentionBox.querySelectorAll('a[href*="/contest/"], a[href*="/contests/"]')
        ) as HTMLAnchorElement[];

        const titleLinks = contestLinks.filter(
          (a) => !a.href.includes('/register') && !a.textContent?.toLowerCase().includes('register')
        );

        if (titleLinks.length > 0) {
          renderContestCardsFromDOM(payAttentionBox, titleLinks);
          return;
        }
      }

      // 2. Fallback to API if not already in DOM
      if (isFetchingContests) return;
      isFetchingContests = true;

      try {
        const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
        isFetchingContests = false;
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'OK' || !Array.isArray(data.result)) return;

        const allContests: any[] = data.result;
        // 1. Running contests (phase: CODING)
        const runningContests = allContests
          .filter((c) => c.phase === 'CODING')
          .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

        // 2. Upcoming contests (phase: BEFORE)
        const upcomingContests = allContests
          .filter((c) => c.phase === 'BEFORE')
          .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
          .slice(0, 2);

        const activeContests = [...runningContests, ...upcomingContests].slice(0, 3);
        if (activeContests.length === 0) return;

        let targetBox = payAttentionBox;
        // If no Pay attention box in sidebar, create one and prepend to sidebar
        if (!targetBox && sidebar) {
          targetBox = document.createElement('div');
          targetBox.id = 'lc-pay-attention-box';
          targetBox.className = 'roundbox sidebox';
          sidebar.prepend(targetBox);
        }

        if (!targetBox) return;

        targetBox.dataset.lcContestEnhanced = 'true';
        targetBox.innerHTML = '';
        targetBox.removeAttribute('style');
        targetBox.className = 'roundbox sidebox lc-pay-attention-box';

        // Header caption
        const caption = document.createElement('div');
        caption.className = 'caption titled';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'lc-sidebar-caption-icon';
        iconWrap.appendChild(renderLucide(Trophy, { size: 14, stroke: 'currentColor' }));
        caption.appendChild(iconWrap);
        caption.appendChild(document.createTextNode(' Pay Attention'));
        targetBox.appendChild(caption);

        // Cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'lc-contest-cards-container';

        const now = Math.floor(Date.now() / 1000);

        activeContests.forEach((c) => {
          const isRunning = c.phase === 'CODING';
          const card = document.createElement('div');
          card.className = `lc-contest-card ${isRunning ? 'is-running' : ''}`;

          // Header badge row
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

          // Contest Title
          const title = document.createElement('a');
          title.className = 'lc-contest-title';
          title.href = `/contest/${c.id}`;
          title.textContent = c.name;
          title.title = c.name;
          card.appendChild(title);

          // Meta Row (Clock icon + remaining/start time)
          const metaRow = document.createElement('div');
          metaRow.className = 'lc-contest-meta';
          metaRow.appendChild(renderLucide(Clock, { size: 12, stroke: '#909090' }));

          const timeSpan = document.createElement('span');
          timeSpan.className = 'lc-contest-time';

          if (isRunning) {
            const elapsed = c.relativeTimeSeconds || (now - c.startTimeSeconds);
            const remaining = Math.max(0, (c.durationSeconds || 7200) - elapsed);
            timeSpan.dataset.remainingSeconds = `${remaining}`;
            timeSpan.textContent = `Ends in: ${formatContestTimer(remaining)}`;
          } else {
            const startsIn = Math.max(0, c.startTimeSeconds ? c.startTimeSeconds - now : -c.relativeTimeSeconds);
            timeSpan.textContent = `Starts in: ${formatContestRelative(startsIn)}`;
          }

          metaRow.appendChild(timeSpan);
          card.appendChild(metaRow);

          // Action Button
          const actionBtn = document.createElement('a');
          if (isRunning) {
            actionBtn.className = 'lc-contest-btn enter';
            actionBtn.href = `/contest/${c.id}`;
            actionBtn.textContent = 'Enter Contest →';
          } else {
            actionBtn.className = 'lc-contest-btn register';
            actionBtn.href = `/contest/${c.id}/register`;
            actionBtn.textContent = 'Register Now →';
          }
          card.appendChild(actionBtn);

          cardsContainer.appendChild(card);
        });

        targetBox.appendChild(cardsContainer);

        // Start ticking timer if there are running contests
        if (contestTimerInterval) clearInterval(contestTimerInterval);
        contestTimerInterval = window.setInterval(() => {
          const timerEls = document.querySelectorAll('.lc-contest-time[data-remaining-seconds]');
          if (timerEls.length === 0 && contestTimerInterval) {
            clearInterval(contestTimerInterval);
            contestTimerInterval = null;
            return;
          }
          timerEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            let current = parseInt(htmlEl.dataset.remainingSeconds || '0', 10);
            if (current > 0) {
              current--;
              htmlEl.dataset.remainingSeconds = `${current}`;
              htmlEl.textContent = `Ends in: ${formatContestTimer(current)}`;
            } else {
              htmlEl.textContent = 'Contest Ended';
            }
          });
        }, 1000);
      } catch (err) {
        isFetchingContests = false;
        console.debug('[LeetBoost] Contest fetch error:', err);
      }
    }

    function formatContestTimer(seconds: number): string {
      if (seconds <= 0) return '00:00:00';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function formatContestRelative(seconds: number): string {
      if (seconds <= 0) return 'Starting soon';
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (d > 0) return `${d}d ${h}h`;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }

    // ========================================================================
    // Sidebar Filters (Right Side) -> Clean LeetCode Card UI
    // ========================================================================
    function enhanceSidebarFilters() {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;

      // Enhance or inject Pay Attention contest cards
      enhancePayAttentionContests();

      const boxes = sidebar.querySelectorAll('.roundbox, .sidebox');
      boxes.forEach((box) => {
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
        if (text.includes('filter problems') || text.includes('tags')) {
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

          // Difficulty inputs cleanup
          const minDiff = box.querySelector('input[name="minDifficulty"]') as HTMLInputElement | null;
          const maxDiff = box.querySelector('input[name="maxDifficulty"]') as HTMLInputElement | null;
          if (minDiff && maxDiff) {
            if (!minDiff.placeholder) minDiff.placeholder = 'Min';
            if (!maxDiff.placeholder) maxDiff.placeholder = 'Max';
            const diffParent = minDiff.parentElement;
            if (diffParent && !diffParent.classList.contains('lc-diff-filter-row')) {
              diffParent.classList.add('lc-diff-filter-row');
            }
          }

          // Tags table container: wrap in scrollable container if not wrapped
          const tagsTable = box.querySelector('table');
          if (tagsTable && !tagsTable.parentElement?.classList.contains('lc-sidebar-tags-scroll')) {
            const scrollWrap = document.createElement('div');
            scrollWrap.className = 'lc-sidebar-tags-scroll';
            tagsTable.parentNode?.insertBefore(scrollWrap, tagsTable);
            scrollWrap.appendChild(tagsTable);
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
        }
      });
    }

    // ========================================================================
    // Problemset Table -> LeetCode Transformation
    // ========================================================================
    function enhanceProblemsetTable() {
      // Remove legacy Codeforces datatable header ("Problems", magnifier, rowCount)
      document.querySelectorAll('.userListMarker, .rowCount, .datatable img.closed').forEach((el) => {
        const headerDiv = el.closest('.datatable > div') || el.parentElement;
        if (headerDiv && (headerDiv.textContent?.includes('Problems') || headerDiv.querySelector('.userListMarker'))) {
          headerDiv.remove();
        }
      });

      const table = document.querySelector('table.problems') as HTMLTableElement | null;
      if (!table || table.dataset.lcEnhanced === 'true') return;
      table.dataset.lcEnhanced = 'true';

      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return;

      let solvedCount = 0;
      let totalProblems = 0;
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;

      // Check if user is signed in to Codeforces
      const isSignedIn =
        document.querySelector('a[href*="/logout"]') !== null ||
        (document.querySelector('a[href*="/enter"]') === null &&
         document.querySelector('.personal-sidebar a[href*="/profile/"]') !== null);

      // 1. Transform Header Row
      const headerRow = rows[0];
      if (headerRow) {
        const headerCells = Array.from(headerRow.querySelectorAll('th'));
        if (headerCells.length > 0 && !headerRow.querySelector('.lc-actions-header')) {
          let titleTh: HTMLTableCellElement | null = null;
          let ratingTh: HTMLTableCellElement | null = null;

          headerCells.forEach((th) => {
            const txt = th.textContent?.trim() || '';
            // Hide '#' column and native 'act' column in header
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

          // Insert Actions column header without heading text (third last from right)
          const actionsTh = document.createElement('th');
          actionsTh.className = 'lc-actions-header';
          actionsTh.style.textAlign = 'right';
          actionsTh.textContent = ''; // Without heading as requested

          if (ratingTh) {
            headerRow.insertBefore(actionsTh, ratingTh);
          } else if (titleTh && (titleTh as HTMLTableCellElement).nextSibling) {
            headerRow.insertBefore(actionsTh, (titleTh as HTMLTableCellElement).nextSibling);
          } else {
            headerRow.appendChild(actionsTh);
          }
        }
      }

      // Metadata for client-side search/filter
      interface ProblemRowMeta {
        row: HTMLTableRowElement;
        id: string;
        title: string;
        rating: number | null;
        difficultyCategory: 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED';
        isSolved: boolean;
        problemUrl: string;
      }

      const problemData: ProblemRowMeta[] = [];

      // 2. Transform Body Rows
      for (const row of rows.slice(1)) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) continue;
        row.classList.add('lc-problem-row');

        totalProblems++;
        const isSolved =
          row.classList.contains('accepted-problem') ||
          (row.querySelector('.act-item') !== null &&
            (row.style.backgroundColor.includes('green') || row.classList.contains('accepted-problem'))) ||
          row.style.backgroundColor.includes('rgb(212') ||
          row.style.backgroundColor.includes('green');

        if (isSolved) solvedCount++;

        // 1. Hide '#' column cell and extract problem ID
        const idCell = row.querySelector('td.id') as HTMLTableCellElement | null;
        let problemId = '';
        if (idCell) {
          problemId = idCell.textContent?.trim() || '';
          idCell.style.display = 'none'; // Hide # column
        }

        // 2. Hide native '.act' column cell and extract native submit link & favorite img
        const actCell = row.querySelector('td.act') as HTMLTableCellElement | null;
        if (actCell) {
          actCell.style.display = 'none'; // Hide native buttons in questions
        }
        const nativeSubmitLink = actCell?.querySelector('a[href*="/submit/"]') as HTMLAnchorElement | null;
        const nativeFavImg = actCell?.querySelector('img.toggle-favourite') as HTMLImageElement | null;

        // 3. Find the REAL Title cell (NOT idCell and NOT actCell)
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

        // Extract topics/tags for this problem
        const tagLinks = Array.from(row.querySelectorAll('a[href*="/problemset/tags/"], a.notice'));
        const topics = tagLinks
          .map((tag) => ({
            name: tag.textContent?.trim() || '',
            url: (tag as HTMLAnchorElement).href || '#',
          }))
          .filter((t) => t.name.length > 0);

        if (titleCell) {
          titleCell.style.textAlign = 'left';
          titleCell.classList.add('lc-title-cell');

          // Completely remove tag links and their container divs from the title cell
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

          // Also remove any remaining tag/notice divs or links inside titleCell
          titleCell
            .querySelectorAll('.notice, a[href*="/problemset/tags/"], div[style*="font-size: 11px"], div[style*="padding-top: 6px"]')
            .forEach((el) => {
              el.remove();
            });
        }

        if (titleLink) {
          const rawTitle = titleLink.getAttribute('data-raw-title') || titleLink.textContent?.trim() || '';
          titleLink.setAttribute('data-raw-title', rawTitle);

          // Combined: "# question id + title of question" (e.g. "2284F. Game of Division")
          combinedTitle = problemId ? `${problemId}. ${rawTitle}` : rawTitle;
          titleLink.textContent = combinedTitle;
          problemUrl = titleLink.href;
          titleLink.classList.add('lc-problem-title');
        }

        // 4. Rating Handling (Second last from right)
        let ratingValue: number | null = null;
        let diffCategory: 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED' = 'UNRATED';
        let ratingCell: HTMLTableCellElement | null = null;

        cells.forEach((cell) => {
          if (cell === idCell || cell === actCell || cell === titleCell) return;
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
              easyCount++;
            } else if (rating < 1900) {
              diffClass = 'lc-diff-medium';
              diffCategory = 'MEDIUM';
              mediumCount++;
            } else {
              diffClass = 'lc-diff-hard';
              diffCategory = 'HARD';
              hardCount++;
            }

            cell.style.textAlign = 'right';
            cell.innerHTML = `<span class="lc-diff-text ${diffClass}">${rating}</span>`;
          }
        });

        // If unrated (no rating found), display simple grayish hyphen text
        if (!ratingCell) {
          const solvedTd = row.querySelector('a[href*="/status/"]')?.closest('td');
          if (solvedTd && solvedTd.previousElementSibling && solvedTd.previousElementSibling !== titleCell) {
            ratingCell = solvedTd.previousElementSibling as HTMLTableCellElement;
          }
          if (ratingCell && !ratingCell.querySelector('.lc-diff-text')) {
            ratingCell.classList.add('lc-rating-cell');
            ratingCell.style.textAlign = 'right';
            ratingCell.innerHTML = `<span class="lc-diff-text lc-diff-unrated" title="Unrated">-</span>`;
          }
        }

        // 5. Solved By Handling (Rightmost column)
        const solvedLink = row.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
        const solvedCell = solvedLink?.closest('td');
        if (solvedCell) {
          solvedCell.style.textAlign = 'right';
          solvedCell.classList.add('lc-solved-cell');
        }
        if (solvedLink && !solvedLink.dataset.lcFormatted) {
          solvedLink.dataset.lcFormatted = 'true';
          const rawText = solvedLink.textContent || '';
          const numMatch = rawText.match(/(\d+)/);
          if (numMatch && numMatch[1]) {
            const count = parseInt(numMatch[1], 10);
            const formattedCount = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`;
            solvedLink.innerHTML = `<span class="lc-solved-num" title="${count} solved">${formattedCount}</span>`;
          }
        }

        // 6. Action Buttons Handling (Third last from right: Star, Submit, Topics)
        if (!row.querySelector('.lc-actions-cell')) {
          const actionsTd = document.createElement('td');
          actionsTd.className = 'lc-actions-cell';

          const group = document.createElement('div');
          group.className = 'lc-actions-group';

          // A. Star / Favorite Button (connected to Codeforces native favorite system!)
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
              // Click the Codeforces native image to trigger native $.post("/data/favourite", ...)
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

              // Verify and sync state after native AJAX response
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
              // Fallback to extension local storage
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

          // B. Submit Button (Lucide Upload icon, connected to native Codeforces submit link!)
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

          // C. Topics Button (Lucide Tag icon)
          const topicsBtn = document.createElement('button');
          topicsBtn.type = 'button';
          topicsBtn.className = 'lc-icon-btn lc-btn-topics';
          topicsBtn.title = 'View Topics';
          topicsBtn.appendChild(renderLucide(Tag, { size: 14, stroke: 'currentColor' }));
          topicsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openTopicsDialog(combinedTitle || problemId || 'Problem Topics', topics);
          });

          // Only show star button if signed in to Codeforces
          if (isSignedIn) {
            group.appendChild(starBtn);
          }
          group.appendChild(submitBtn);
          group.appendChild(topicsBtn);
          actionsTd.appendChild(group);

          // Insert before ratingCell or after titleCell
          if (ratingCell) {
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

      const datatable = document.querySelector('.datatable') || table;
      const roundbox = datatable.closest('.roundbox') as HTMLElement | null;
      if (roundbox) {
        roundbox.classList.add('lc-table-roundbox');
      }
      const containerParent = datatable.parentElement;

      // Clean up legacy stats banner if present
      document.getElementById('cf-lc-stats-banner')?.remove();

      // Enhance secondary tab bar (Main, acmsguru)
      enhanceSecondLevelMenu();

      // 4. LeetCode Toolbar (Instant Search, Filter by Difficulty / Status, Pick One)
      if (!document.getElementById('cf-lc-toolbar') && containerParent) {
        const toolbar = document.createElement('div');
        toolbar.id = 'cf-lc-toolbar';
        toolbar.className = 'lc-toolbar';

        const toolbarLeft = document.createElement('div');
        toolbarLeft.className = 'lc-toolbar-left';

        // Search Input with Lucide Search icon
        const searchWrap = document.createElement('div');
        searchWrap.className = 'lc-search-wrap';
        // const searchIconSpan = document.createElement('span');
        // searchIconSpan.className = 'lc-search-icon';
        // searchIconSpan.appendChild(renderLucide(Search, { size: 14, stroke: '#909090' }));
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'cf-lc-search';
        searchInput.className = 'lc-search-input';
        searchInput.placeholder = 'Search problems or ID (e.g. 2284F)...';
        // searchWrap.appendChild(searchIconSpan);
        searchWrap.appendChild(searchInput);
        toolbarLeft.appendChild(searchWrap);

        // Difficulty filter buttons
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

        // Status filter buttons
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

        // Right side: Pick One button with Lucide Shuffle icon
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

        // Filter state
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
            subText.textContent = `${visibleCount} of ${totalProblems} problems matching`;
          }
          const solvedText = document.getElementById('cf-lc-stat-solved');
          if (solvedText) {
            solvedText.textContent = `${visibleSolved} / ${visibleCount}`;
          }
        };

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
    }

    // ========================================================================
    // Topics Modal Dialog
    // ========================================================================
    function openTopicsDialog(problemTitle: string, topics: Array<{ name: string; url: string }>) {
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
      if (listEl) {
        listEl.innerHTML = '';
        if (topics.length === 0) {
          listEl.innerHTML = '<div class="lc-dialog-empty">No topics listed for this problem.</div>';
        } else {
          topics.forEach((t) => {
            const pill = document.createElement('a');
            pill.className = 'lc-dialog-tag-pill';
            pill.href = t.url;
            pill.target = '_blank';
            pill.rel = 'noreferrer';
            pill.appendChild(renderLucide(Tag, { size: 11, stroke: '#94a3b8' }));
            pill.appendChild(document.createTextNode(` ${t.name}`));
            listEl.appendChild(pill);
          });
        }
      }

      dialog.style.display = 'flex';
    }

    // ========================================================================
    // Problem Page Enhancements (Copy Buttons, Spoiler Blocker, Timer)
    // ========================================================================
    function enhanceProblemPage() {
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
    let tagsRevealed = false;
    function manageProblemTags(hide: boolean) {
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

    function manageProblemTimer(show: boolean) {
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runDomEnhancements);
    } else {
      runDomEnhancements();
    }

    window.addEventListener('load', runDomEnhancements);

    // Observe dynamic DOM replacements & late loading of auth/header elements
    const observer = new MutationObserver(() => {
      const table = document.querySelector('table.problems') as HTMLTableElement | null;
      if (table && table.dataset.lcEnhanced !== 'true') {
        runDomEnhancements();
      } else {
        enhanceFloatingAuth();
        enhanceMainNavigation();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
