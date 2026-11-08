# LeetForces ⚡

> **Transform Codeforces into a sleek, minimalist LeetCode-inspired experience.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![WXT](https://img.shields.io/badge/Framework-WXT-red.svg)](https://wxt.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.js.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

---
<img width="1512" height="982" alt="Screenshot 2026-11-08 at 15 43 22" src="https://github.com/user-attachments/assets/906f983a-ed6e-4610-b07d-453364692c67" />


## 📖 Overview

**LeetForces** is an open-source browser extension that brings the modern, focused, and distraction-free user interface of **LeetCode** to **Codeforces**.

While Codeforces provides the best competitive programming problems and contests in the world, its default layout can feel dated and visually busy. LeetForces restyles key workflows with a minimalist `#1a1a1a` / `#222222` dark theme, clean typography, custom icons, and refined ergonomics—all while maintaining 100% compatibility with native Codeforces functionality.

---

## ✨ Features

### 📋 1. LeetCode-Style Problemset Table
- **Clean Problem Tiles**: Rounded row tiles with zero harsh shadows and subtle hover states.
- **No Underline Typography**: Problem titles render in clean `#ffffff` without distracting browser default underlines.
- **Color-Coded Difficulty**: Ratings rendered with clean LeetCode difficulty tags (Easy `<1200`, Medium `1200–1800`, Hard `>1800`).
- **Quick Action Bar**:
  - ⭐ **Favorites**: Bookmark problems locally with persistent storage.
  - 🚀 **Quick Submit**: One-click jump to the problem submission page.
  - 🏷️ **Topics Modal**: Fast dialog showing problem algorithm tags with direct search links.
- **Solved Counters**: Clean user solve metrics without cluttered default icons.
- **Shuffle / Pick One**: Randomly pick an unsolved problem matching your active filters.

### 🎯 2. Modernized Sidebar Filters & Widgets
- **Difficulty Presets**: Instant filter buttons (`All`, `Easy <1200`, `Med 1200–1800`, `Hard >1800`).
- **Tag Search**: Real-time searchable problem tag checklist with custom styled checkboxes.
- **Horizontal Settings Row**: Streamlined checkbox controls aligned cleanly in horizontal flex rows.
- **Compact Last Unsolved**: Scrollable container displaying recent unsolved attempts with full title tooltips.
- **Preserved Sidebar Links**: "View all →" and "Detailed →" buttons for **Top Rated**, **Top Contributors**, **Streams**, and **Recent Actions** are preserved and styled as sleek dark pill buttons.

### 🏆 3. Pay Attention & Contest Cards
- **Dark Zero-Shadow Cards**: Custom `#282828` / `#222222` aesthetic with 25px rounded corners.
- **Live Countdown Ticker**: Real-time timer countdown to upcoming rounds.
- **Direct Registration Links**: Links directly to the official `https://codeforces.com/contestRegistration/${id}` registration endpoint.

### 📝 4. Contest Registration Page Redesign
- **Full Form Restyle**: Converts the raw registration page into a modern `#222222` card container.
- **Contest Header**: Features an amber **Trophy icon**, contest ID badge, and participation status badge (`Official Round` / `Virtual Participation`).
- **Rendered Fair Play Checklist**: Replaces the ugly yellow `#ffd` `<textarea>` with an interactive checklist formatted with teal `CheckCircle2` icons.
- **Smart Link Formatting**: Long URLs for third-party code and AI regulations are automatically converted into clean clickable links (`Third-Party Code Regulations ↗`).
- **Selectable Option Cards**: Converted radio buttons for Individual vs. Team participation into modern selectable tiles with LeetCode orange borders.
- **Centered Submit Button**: LeetCode orange pill button with smooth hover transitions.

### 🌈 5. Preserved User Rating Colors
- **Full Rank Fidelity**: Preserves all Codeforces rank colors everywhere on the platform:
  - **Legendary Grandmaster** (`#ff3333` with crisp white first letter)
  - **Grandmaster & IGM** (`#ff3333`)
  - **Master & IM** (`#ff8c00`)
  - **Candidate Master** (`#bb55ff`)
  - **Expert** (`#3b82f6`)
  - **Specialist** (`#03a89e`)
  - **Pupil** (`#22c55e`)
  - **Newbie** (`#9ca3af`)
- Rating handles strictly retain their color on hover with an underline.

### 🔢 6. Perfectly Proportioned Pagination
- **32×32px Square Buttons**: Every page button has consistent sizing, rounded corners, and smooth hover states.
- **Distortion-Free Active Button**: The selected page is styled in LeetCode orange (`#ffa116`) with dark `#111111` bold text, with zero horizontal or vertical distortion.

### 🛡️ 7. Strict Scope Isolation
- **Targeted Application**: Enhancements only run on **Problemset** (`/problemset*`) and **Contest Registration** (`/contestRegistration/*`, `/gymRegistration/*`).
- **100% Native Everywhere Else**: Profiles, blogs, gym, contest standings, and groups remain 100% native Codeforces without any layout interference.

### ⚡ 8. Minimalist Popup UI
- **Single Master Toggle**: Instantly enable or disable the LeetCode theme.
- **Rounded Window Borders**: 20px rounded window framing.
- **Community Actions**: Direct buttons for **Buy me a coffee** and **Star on GitHub**.

---

## 📂 Project Architecture & Folder Structure

LeetForces is built using [WXT](https://wxt.dev/) with a clean, modular TypeScript architecture:

```
leetforces/
├── entrypoints/
│   ├── content.ts                # Lightweight coordinator script (~90 lines)
│   ├── leetcode.css              # Core LeetCode dark stylesheet
│   ├── background.ts             # Service worker
│   └── popup/                    # React popup extension interface
│       ├── App.tsx               # Minimalist toggle & action buttons
│       ├── App.css               # Popup rounded card styling
│       ├── index.html
│       └── main.tsx
│
├── src/
│   ├── types/
│   │   └── index.ts              # Centralized TypeScript definitions & models
│   │
│   ├── state/
│   │   ├── settingsState.ts      # Extension storage sync & favorites state
│   │   └── problemCache.ts       # Problem metadata & API tag fetching
│   │
│   ├── utils/
│   │   ├── icons.ts              # Lucide icon renderer utility
│   │   ├── page.ts               # URL route matchers & scope isolation guards
│   │   └── timer.ts              # Countdown timer & relative time formatters
│   │
│   └── features/
│       ├── auth/
│       │   └── floatingAuth.ts   # Floating profile pill & rank colors
│       │
│       ├── contests/
│       │   ├── payAttention.ts   # Contest cards & countdown ticker
│       │   └── contestRegistration.ts # Registration card & rules checklist
│       │
│       ├── navigation/
│       │   └── mainNav.ts        # Left sidebar navigation & subnav tabs
│       │
│       ├── problemset/
│       │   ├── tableEnhancer.ts  # Problem table, search, presets & shuffle
│       │   └── topicsModal.ts    # Interactive tags dialog modal
│       │
│       ├── problemPage/
│       │   └── problemEnhancer.ts# Problem page tools (diff chips, copy buttons)
│       │
│       └── sidebar/
│           └── sidebarFilters.ts # Filter problems, tags checklist, last unsolved
│
├── public/                       # Static extension icons & assets
├── package.json
├── tsconfig.json
├── wxt.config.ts
└── README.md
```

---

## 🛠️ Development & Installation

### Prerequisites
- Node.js (v18 or newer)
- npm, pnpm, or yarn

### 1. Clone & Install
```bash
git clone https://github.com/anshxs/leetforces.git
cd leetforces
npm install
```

### 2. Run in Development Mode
```bash
# Starts Chrome with hot-reloading extension dev server
npm run dev

# Or for Firefox
npm run dev:firefox
```

### 3. Build for Production
```bash
# Type check with TypeScript
npm run compile

# Build optimized production bundle
npm run build
```
The compiled extension will be placed in `.output/chrome-mv3`.

### 4. Load in Your Browser (Chrome / Brave / Edge)
1. Open your browser and navigate to `chrome://extensions/` (or `brave://extensions/` / `edge://extensions/`).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside the `leetforces` directory.
5. Visit [codeforces.com/problemset](https://codeforces.com/problemset) and enjoy!

---

## 🤝 Contributing Guidelines

Contributions, bug reports, and feature suggestions are very welcome!

### Development Rules & Guidelines
1. **Design Philosophy**:
   - Keep designs **minimalist and aesthetic**, modeled closely after modern LeetCode.
   - Avoid heavy shadows (`box-shadow: none !important` is preferred across cards).
   - Use `#ffa116` as the primary accent color.
2. **Preserve User Colors**:
   - Never override or erase Codeforces user rating handle colors (`.rated-user`, `user-*`).
3. **Strict Scope Isolation**:
   - Always verify URL guards in [src/utils/page.ts](file:///Users/anshsharma/Desktop/Projects/ongoing/leetboost/src/utils/page.ts). Do not inject intrusive styles into unenhanced native Codeforces pages.
4. **Code Quality**:
   - Ensure `npm run compile` and `npm run build` pass with zero TypeScript errors before opening a pull request.

### Pull Request Process
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request detailing your changes.

---

## ☕ Support & Community

If you find LeetForces helpful for your daily competitive programming practice:
- ⭐ **Star this repository** on GitHub: [github.com/anshxs/leetforces](https://github.com/anshxs/leetforces)
- ☕ **Buy me a coffee**: [buymeacoffee.com/anshxs](https://buymeacoffee.com/anshxs)
- 💬 **Share feedback**: Open an issue or suggestion on GitHub.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Codeforces is a registered trademark of Mike Mirzayanov and Codeforces. LeetForces is an independent open-source project and is not affiliated with or endorsed by Codeforces or LeetCode.
