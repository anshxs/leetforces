import './leetcode.css';
import {
  initSettingsAndFavorites,
  leetcodeThemeEnabled,
  hideTagsEnabled,
  showTimerEnabled,
} from '../src/state/settingsState';
import { loadAllProblemTags, updateUnratedRowRatings } from '../src/state/problemCache';
import {
  isProblemsetPage,
  isContestRegistrationPage,
  isExtensionActivePage,
} from '../src/utils/page';
import { enhanceMainNavigation, enhanceSecondLevelMenu } from '../src/features/navigation/mainNav';
import { enhanceFloatingAuth } from '../src/features/auth/floatingAuth';
import { enhancePayAttentionContests } from '../src/features/contests/payAttention';
import { enhanceContestRegistration } from '../src/features/contests/contestRegistration';
import { enhanceSidebarFilters } from '../src/features/sidebar/sidebarFilters';
import { enhanceProblemsetTable, isEnhancingTable } from '../src/features/problemset/tableEnhancer';

export default defineContentScript({
  matches: ['*://*.codeforces.com/*'],
  cssInjectionMode: 'manifest',

  main() {
    function runDomEnhancements() {
      if (!leetcodeThemeEnabled || !isExtensionActivePage()) {
        document.documentElement.classList.remove('lc-theme');
        const sidebar = document.getElementById('lc-sidebar-nav');
        const auth = document.getElementById('lc-floating-auth');
        if (sidebar) sidebar.style.display = 'none';
        if (auth) auth.style.display = 'none';
        return;
      }

      document.documentElement.classList.add('lc-theme');
      enhanceFloatingAuth();
      enhanceMainNavigation();
      enhanceSecondLevelMenu();

      if (isProblemsetPage()) {
        enhancePayAttentionContests();
        enhanceSidebarFilters();
        enhanceProblemsetTable();
      }

      if (isContestRegistrationPage()) {
        enhanceContestRegistration();
      }
    }

    // Initialize extension settings & sync with storage
    initSettingsAndFavorites({
      onThemeChanged: () => {
        if (leetcodeThemeEnabled && isExtensionActivePage()) {
          runDomEnhancements();
        } else {
          document.documentElement.classList.remove('lc-theme');
          const sidebar = document.getElementById('lc-sidebar-nav');
          const auth = document.getElementById('lc-floating-auth');
          if (sidebar) sidebar.style.display = 'none';
          if (auth) auth.style.display = 'none';
        }
      },
      onHideTagsChanged: () => {},
      onShowTimerChanged: () => {},
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runDomEnhancements);
    } else {
      runDomEnhancements();
    }

    window.addEventListener('load', runDomEnhancements);

    // Dynamic timer fallbacks for late-injected Codeforces elements (infobar, contests, auth)
    setTimeout(runDomEnhancements, 300);
    setTimeout(runDomEnhancements, 1000);

    // Warm up problem metadata cache in background only if on problemset
    if (isProblemsetPage()) {
      setTimeout(() => {
        loadAllProblemTags().then(updateUnratedRowRatings).catch(() => {});
      }, 1500);
    }

    // Observe dynamic DOM replacements & late loading of auth/header elements with debouncing
    let observerDebounce: number | null = null;
    const observer = new MutationObserver(() => {
      if (!leetcodeThemeEnabled || !isExtensionActivePage()) return;
      if (observerDebounce) clearTimeout(observerDebounce);
      observerDebounce = window.setTimeout(() => {
        observerDebounce = null;
        enhanceFloatingAuth();
        enhanceMainNavigation();

        if (isProblemsetPage()) {
          enhancePayAttentionContests();

          const table = document.querySelector('table.problems') as HTMLTableElement | null;
          if (
            table &&
            !isEnhancingTable &&
            (table.querySelector('tr:not([data-lc-enhanced="true"]) td') || !table.querySelector('.lc-actions-header'))
          ) {
            enhanceProblemsetTable();
          }

          if (document.getElementById('sidebar') || document.querySelector('.sidebox, .roundbox')) {
            enhanceSidebarFilters();
          }
        }

        if (isContestRegistrationPage()) {
          enhanceContestRegistration();
        }
      }, 60);
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      });
    }
  },
});
