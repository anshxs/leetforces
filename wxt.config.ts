import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LeetForces - LeetCode Theme for Codeforces',
    description: 'Transforms Codeforces into LeetCode Dark Theme with difficulty badges, status checkmarks, and CP practice tools.',
    permissions: ['storage'],
    action: {
      default_title: 'LeetForces',
    },
    web_accessible_resources: [
      {
        resources: ['codeforces.png'],
        matches: ['*://*.codeforces.com/*', '*://*.codeforces.net/*'],
      },
    ],
  },
});

