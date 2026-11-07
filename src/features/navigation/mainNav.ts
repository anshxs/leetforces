import {
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
} from 'lucide';
import { renderLucide } from '../../utils/icons';
import { leetcodeThemeEnabled } from '../../state/settingsState';

interface NavItemConfig {
  name: string;
  href: string;
  icon: typeof Home;
  key: string;
}

export function enhanceSecondLevelMenu(): void {
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

export function enhanceMainNavigation(): void {
  let sidebar = document.getElementById('lc-sidebar-nav');
  if (sidebar) {
    sidebar.style.display = leetcodeThemeEnabled ? 'flex' : 'none';
    return;
  }
  if (!leetcodeThemeEnabled) return;

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

  sidebar = document.createElement('aside');
  sidebar.id = 'lc-sidebar-nav';
  sidebar.className = 'lc-sidebar-nav';

  browser.storage.local
    .get<{ cf_sidebar_collapsed?: boolean }>('cf_sidebar_collapsed')
    .then((res) => {
      if (res.cf_sidebar_collapsed && sidebar) {
        document.documentElement.classList.add('lc-sidebar-collapsed');
        sidebar.classList.add('collapsed');
        updateToggleBtn(true);
      }
    });

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

  const navList = document.createElement('nav');
  navList.className = 'lc-sidebar-nav-list';

  const currentPath = window.location.pathname;

  navItems.forEach((item) => {
    const navLink = document.createElement('a');
    navLink.className = 'lc-sidebar-nav-item';
    navLink.href = item.href;
    navLink.title = item.name;

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

export function collapseSidebarNav(): void {
  const sidebar = document.getElementById('lc-sidebar-nav');
  document.documentElement.classList.add('lc-sidebar-collapsed');
  if (sidebar) {
    sidebar.classList.add('collapsed');
    const toggleBtn = sidebar.querySelector('.lc-sidebar-toggle-btn') as HTMLButtonElement | null;
    if (toggleBtn) {
      toggleBtn.innerHTML = '';
      toggleBtn.appendChild(
        renderLucide(PanelLeftOpen, { size: 16, stroke: 'currentColor' })
      );
      toggleBtn.title = 'Expand sidebar';
    }
  }
}

