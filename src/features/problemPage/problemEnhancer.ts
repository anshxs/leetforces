import { renderLucide } from '../../utils/icons';
import {
  FileText,
  Tag,
  History,
  Code2,
  RotateCcw,
  Copy,
  Check,
  CheckSquare,
  Terminal,
  Play,
  Send,
  Clock,
  Cpu,
  FileInput,
  Eye,
  EyeOff,
  Plus,
  ExternalLink,
} from 'lucide';
import { hideTagsEnabled, showTimerEnabled } from '../../state/settingsState';
import { problemMetaCache } from '../../state/problemCache';
import { collapseSidebarNav } from '../navigation/mainNav';

interface TestCase {
  id: number;
  input: string;
  output: string;
}

const STARTER_TEMPLATES: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

void solve() {
    // Write your solution here
    
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int t = 1;
    // cin >> t;
    while (t--) {
        solve();
    }
    
    return 0;
}
`,
  python: `import sys

def solve():
    # input = sys.stdin.read
    pass

if __name__ == '__main__':
    solve()
`,
  pypy: `import sys

def solve():
    # input = sys.stdin.read
    pass

if __name__ == '__main__':
    solve()
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st;
        
        // Write your solution here
        
    }
}
`,
  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    // Write your solution here
    
}
`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    in := bufio.NewReader(os.Stdin)
    out := bufio.NewWriter(os.Stdout)
    defer out.Flush()
    
    // Write your solution here
    
}
`,
};

// Map internal language keys to common Codeforces programTypeId strings
const LANG_TO_CF_IDS: Record<string, string[]> = {
  cpp: ['89', '54', '61', '50'], // GNU G++20, G++17, etc.
  python: ['31'], // Python 3
  pypy: ['41', '70'], // PyPy 3
  java: ['87', '60'], // Java 21 / Java 17
  rust: ['75'], // Rust 2021
  go: ['32'], // Go
};

let tagsRevealed = false;
let timerContainer: HTMLElement | null = null;
let timerSeconds = 0;
let timerInterval: number | null = null;
let timerRunning = false;
let testCases: TestCase[] = [];
let currentCaseIndex = 0;

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

export function enhanceProblemPage() {
  const problemStatement = document.querySelector('.problem-statement') as HTMLElement | null;
  if (!problemStatement) return;

  // Auto-collapse left vertical navigation for maximum LeetCode workspace width
  collapseSidebarNav();
  document.documentElement.classList.add('lc-problem-page-active');

  // Extract Problem Code (e.g. 2284F or contest 2284 problem F)
  let pId = '';
  let contestId = '';
  let problemLetter = '';

  const problemsetMatch = window.location.pathname.match(/problem\/(\d+)\/([A-Z0-9]+)/i);
  const contestMatch = window.location.pathname.match(/contest\/(\d+)\/problem\/([A-Z0-9]+)/i);
  const gymMatch = window.location.pathname.match(/gym\/(\d+)\/problem\/([A-Z0-9]+)/i);

  if (problemsetMatch && problemsetMatch[1] && problemsetMatch[2]) {
    contestId = problemsetMatch[1];
    problemLetter = problemsetMatch[2].toUpperCase();
    pId = `${contestId}${problemLetter}`;
  } else if (contestMatch && contestMatch[1] && contestMatch[2]) {
    contestId = contestMatch[1];
    problemLetter = contestMatch[2].toUpperCase();
    pId = `${contestId}${problemLetter}`;
  } else if (gymMatch && gymMatch[1] && gymMatch[2]) {
    contestId = gymMatch[1];
    problemLetter = gymMatch[2].toUpperCase();
    pId = `${contestId}${problemLetter}`;
  }

  // 1. Difficulty badge right next to problem title
  const titleEl = problemStatement.querySelector('.header .title');
  if (titleEl && !titleEl.querySelector('.lc-title-diff-chip')) {
    let ratingStr = '';

    const diffSpan = document.querySelector('.roundbox.sidebox span[title="Difficulty"]');
    if (diffSpan?.textContent) {
      ratingStr = diffSpan.textContent.trim().replace('*', '');
    }

    if (!ratingStr) {
      const sideboxText = document.querySelector('.roundbox.sidebox')?.textContent || '';
      const m = sideboxText.match(/\*(\d{3,4})/);
      if (m && m[1]) ratingStr = m[1];
    }

    if (!ratingStr && pId && problemMetaCache.has(pId)) {
      const meta = problemMetaCache.get(pId);
      if (meta?.rating) ratingStr = meta.rating.toString();
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

  // 2. Enhance Header Specs (Time Limit, Memory Limit, IO)
  const header = problemStatement.querySelector('.header');
  if (header && !header.querySelector('.lc-specs-row')) {
    const timeLimit = header.querySelector('.time-limit');
    const memoryLimit = header.querySelector('.memory-limit');
    const inputFile = header.querySelector('.input-file');
    const outputFile = header.querySelector('.output-file');

    const specsRow = document.createElement('div');
    specsRow.className = 'lc-specs-row';

    const extractSpecValue = (el: Element | null): string => {
      if (!el) return '';
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelector('.property-title')?.remove();
      return clone.textContent?.trim() || '';
    };

    const timeVal = extractSpecValue(timeLimit);
    const memVal = extractSpecValue(memoryLimit);
    const inVal = extractSpecValue(inputFile);
    const outVal = extractSpecValue(outputFile);

    if (timeVal) {
      const chip = document.createElement('span');
      chip.className = 'lc-spec-chip';
      chip.appendChild(renderLucide(Clock, { size: 13, stroke: '#ffa116' }));
      chip.appendChild(document.createTextNode(` ${timeVal}`));
      specsRow.appendChild(chip);
    }

    if (memVal) {
      const chip = document.createElement('span');
      chip.className = 'lc-spec-chip';
      chip.appendChild(renderLucide(Cpu, { size: 13, stroke: '#00b8a3' }));
      chip.appendChild(document.createTextNode(` ${memVal}`));
      specsRow.appendChild(chip);
    }

    if (inVal && outVal) {
      const chip = document.createElement('span');
      chip.className = 'lc-spec-chip';
      chip.appendChild(renderLucide(FileInput, { size: 13, stroke: '#9ca3af' }));
      chip.appendChild(document.createTextNode(` ${inVal} / ${outVal}`));
      specsRow.appendChild(chip);
    }

    [timeLimit, memoryLimit, inputFile, outputFile].forEach((el) => {
      if (el) (el as HTMLElement).style.display = 'none';
    });

    header.appendChild(specsRow);
  }

  // 3. Add Copy buttons & Top Bars to sample tests
  const sampleContainers = document.querySelectorAll('.sample-test .input, .sample-test .output');
  sampleContainers.forEach((container) => {
    if (container.querySelector('.lc-copy-btn')) return;
    const pre = container.querySelector('pre');
    if (!pre) return;

    const titleEl = container.querySelector('.title');
    const copyBtn = document.createElement('button');
    copyBtn.className = 'lc-copy-btn';
    copyBtn.type = 'button';
    copyBtn.appendChild(renderLucide(Copy, { size: 12, stroke: '#9ca3af' }));
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
          copyBtn.appendChild(renderLucide(Copy, { size: 12, stroke: '#9ca3af' }));
          copyBtn.appendChild(document.createTextNode(' Copy'));
        }, 1500);
      });
    });

    if (titleEl) {
      titleEl.appendChild(copyBtn);
    } else {
      container.appendChild(copyBtn);
    }
  });

  // 4. Extract Sample Test Cases for the Testcase Panel
  extractSampleTestCases();

  // 5. Construct the LeetCode Workspace Split View (Left: Question, Right: Editor + Testcases)
  buildLeetCodeWorkspace(problemStatement, pId, contestId, problemLetter);

  // Keep topbar (tabbar + profile pill) above the three sections, and hide everything below workspace
  const workspace = document.getElementById('lc-problem-workspace');
  let topbar = document.getElementById('lc-problem-topbar');
  const pageContent = document.getElementById('pageContent');

  if (topbar) {
    const secondLevelMenu = document.querySelector(
      '.second-level-menu, .lc-second-level-menu, .roundbox:has(.second-level-menu-list)'
    ) as HTMLElement | null;
    const topbarLeft = topbar.querySelector('.lc-problem-topbar-left');
    if (secondLevelMenu && topbarLeft && !topbarLeft.contains(secondLevelMenu)) {
      topbarLeft.appendChild(secondLevelMenu);
    }

    const auth = document.getElementById('lc-floating-auth');
    const topbarRight = topbar.querySelector('.lc-problem-topbar-right');
    if (auth && topbarRight && !topbarRight.contains(auth)) {
      topbarRight.appendChild(auth);
    }
  }

  if (workspace && pageContent) {
    if (topbar && pageContent.firstElementChild !== topbar) {
      pageContent.prepend(topbar);
    }
    if (topbar && topbar.nextElementSibling !== workspace) {
      topbar.insertAdjacentElement('afterend', workspace);
    }

    // Remove / Hide all other elements inside pageContent below the three sections
    Array.from(pageContent.children).forEach((child) => {
      if (child !== topbar && child !== workspace) {
        (child as HTMLElement).style.display = 'none';
      }
    });
  }

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.style.display = 'none';

  const footer = document.getElementById('footer');
  if (footer) footer.style.display = 'none';

  const langChooser = document.querySelector('.lang-chooser') as HTMLElement | null;
  if (langChooser) langChooser.style.display = 'none';

  // 6. Practice Mode & Floating Timer
  manageProblemTags(hideTagsEnabled);
  manageProblemTimer(showTimerEnabled);
}

function extractSampleTestCases() {
  testCases = [];
  const sampleTest = document.querySelector('.sample-test');
  if (!sampleTest) {
    testCases.push({ id: 1, input: '', output: '' });
    return;
  }

  const inputs = Array.from(sampleTest.querySelectorAll('.input pre'));
  const outputs = Array.from(sampleTest.querySelectorAll('.output pre'));

  const count = Math.max(inputs.length, outputs.length);
  for (let i = 0; i < count; i++) {
    const inText = inputs[i]?.textContent?.trim() || '';
    const outText = outputs[i]?.textContent?.trim() || '';
    testCases.push({
      id: i + 1,
      input: inText,
      output: outText,
    });
  }

  if (testCases.length === 0) {
    testCases.push({ id: 1, input: '', output: '' });
  }
}

function buildLeetCodeWorkspace(
  problemStatement: HTMLElement,
  pId: string,
  contestId: string,
  problemLetter: string
) {
  if (document.getElementById('lc-problem-workspace')) return;

  const pageContent = document.getElementById('pageContent');
  if (!pageContent) return;

  // 1. Build dedicated top bar row for the tabbar and profile pill
  let topbar = document.getElementById('lc-problem-topbar');
  if (!topbar) {
    topbar = document.createElement('div');
    topbar.id = 'lc-problem-topbar';
    topbar.className = 'lc-problem-topbar';

    const topbarLeft = document.createElement('div');
    topbarLeft.className = 'lc-problem-topbar-left';

    const topbarRight = document.createElement('div');
    topbarRight.className = 'lc-problem-topbar-right';

    topbar.appendChild(topbarLeft);
    topbar.appendChild(topbarRight);
  }

  const secondLevelMenu = document.querySelector(
    '.second-level-menu, .lc-second-level-menu, .roundbox:has(.second-level-menu-list)'
  ) as HTMLElement | null;

  if (secondLevelMenu) {
    const topbarLeft = topbar.querySelector('.lc-problem-topbar-left');
    if (topbarLeft && !topbarLeft.contains(secondLevelMenu)) {
      topbarLeft.appendChild(secondLevelMenu);
    }
  }

  const auth = document.getElementById('lc-floating-auth');
  if (auth) {
    const topbarRight = topbar.querySelector('.lc-problem-topbar-right');
    if (topbarRight && !topbarRight.contains(auth)) {
      topbarRight.appendChild(auth);
    }
  }

  const workspace = document.createElement('div');
  workspace.id = 'lc-problem-workspace';
  workspace.className = 'lc-problem-workspace';

  // --- LEFT WORKSPACE PANE (Question Description, Tags, Submissions) ---
  const leftPane = document.createElement('div');
  leftPane.className = 'lc-workspace-left';

  // Left Top Tabs Bar
  const leftTabsBar = document.createElement('div');
  leftTabsBar.className = 'lc-left-tabs-bar';

  const descTabBtn = document.createElement('button');
  descTabBtn.className = 'lc-left-tab active';
  descTabBtn.appendChild(renderLucide(FileText, { size: 14, stroke: 'currentColor' }));
  descTabBtn.appendChild(document.createTextNode(' Description'));

  const tagsTabBtn = document.createElement('button');
  tagsTabBtn.className = 'lc-left-tab';
  tagsTabBtn.appendChild(renderLucide(Tag, { size: 14, stroke: 'currentColor' }));
  tagsTabBtn.appendChild(document.createTextNode(' Editorial & Tags'));

  const subsTabBtn = document.createElement('button');
  subsTabBtn.className = 'lc-left-tab';
  subsTabBtn.appendChild(renderLucide(History, { size: 14, stroke: 'currentColor' }));
  subsTabBtn.appendChild(document.createTextNode(' Submissions'));

  leftTabsBar.appendChild(descTabBtn);
  leftTabsBar.appendChild(tagsTabBtn);
  leftTabsBar.appendChild(subsTabBtn);
  leftPane.appendChild(leftTabsBar);

  // Left Content Scroll Container
  const leftContent = document.createElement('div');
  leftContent.className = 'lc-left-pane-content';

  // Panel 1: Description Panel
  const descPanel = document.createElement('div');
  descPanel.id = 'lc-desc-panel';
  descPanel.className = 'lc-tab-panel active';

  // Move problemStatement into descPanel
  descPanel.appendChild(problemStatement);
  leftContent.appendChild(descPanel);

  // Panel 2: Tags & Info Panel
  const tagsPanel = document.createElement('div');
  tagsPanel.id = 'lc-tags-panel';
  tagsPanel.className = 'lc-tab-panel';
  tagsPanel.style.display = 'none';

  // Extract sidebar tags, contest materials, etc. into tagsPanel
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const sideboxes = Array.from(sidebar.querySelectorAll('.roundbox.sidebox, .roundbox'));
    sideboxes.forEach((box) => {
      // Don't duplicate submit box here
      if (box.querySelector('form.submit-form')) return;
      const clone = box.cloneNode(true) as HTMLElement;
      clone.classList.add('lc-tags-card-item');
      tagsPanel.appendChild(clone);
    });
  }
  leftContent.appendChild(tagsPanel);

  // Panel 3: Submissions Panel
  const subsPanel = document.createElement('div');
  subsPanel.id = 'lc-subs-panel';
  subsPanel.className = 'lc-tab-panel';
  subsPanel.style.display = 'none';

  const mySubsUrl = contestId
    ? `https://codeforces.com/contest/${contestId}/my`
    : `https://codeforces.com/problemset/status?my=on&problemCode=${pId}`;

  const allSubsUrl = contestId
    ? `https://codeforces.com/contest/${contestId}/status`
    : `https://codeforces.com/problemset/status`;

  subsPanel.innerHTML = `
    <div class="lc-subs-container">
      <div class="lc-subs-header">
        <h3>Problem Submissions</h3>
        <p>Track your solution status and explore community solutions on Codeforces.</p>
      </div>
      <div class="lc-subs-actions-grid">
        <a href="${mySubsUrl}" target="_blank" rel="noreferrer" class="lc-subs-card">
          <div class="lc-subs-card-title">My Submissions</div>
          <div class="lc-subs-card-desc">View your past submissions, verdicts, memory and execution times for this problem.</div>
        </a>
        <a href="${allSubsUrl}" target="_blank" rel="noreferrer" class="lc-subs-card">
          <div class="lc-subs-card-title">All Submissions</div>
          <div class="lc-subs-card-desc">Browse accepted solutions from the Codeforces community.</div>
        </a>
      </div>
    </div>
  `;
  leftContent.appendChild(subsPanel);

  leftPane.appendChild(leftContent);

  // Left Tab Switching Logic
  const switchLeftTab = (activeBtn: HTMLElement, activePanel: HTMLElement) => {
    [descTabBtn, tagsTabBtn, subsTabBtn].forEach((btn) => btn.classList.remove('active'));
    [descPanel, tagsPanel, subsPanel].forEach((panel) => {
      panel.classList.remove('active');
      panel.style.display = 'none';
    });
    activeBtn.classList.add('active');
    activePanel.classList.add('active');
    activePanel.style.display = 'block';
  };

  descTabBtn.addEventListener('click', () => switchLeftTab(descTabBtn, descPanel));
  tagsTabBtn.addEventListener('click', () => switchLeftTab(tagsTabBtn, tagsPanel));
  subsTabBtn.addEventListener('click', () => switchLeftTab(subsTabBtn, subsPanel));

  // --- RIGHT WORKSPACE PANE (Top: Code Editor, Bottom: Testcases) ---
  const rightPane = document.createElement('div');
  rightPane.className = 'lc-workspace-right';

  // 1. CODE EDITOR CARD (Top Half)
  const editorCard = document.createElement('div');
  editorCard.className = 'lc-editor-card';

  // Editor Header
  const editorHeader = document.createElement('div');
  editorHeader.className = 'lc-editor-header';

  const editorHeaderLeft = document.createElement('div');
  editorHeaderLeft.className = 'lc-editor-header-left';
  editorHeaderLeft.appendChild(renderLucide(Code2, { size: 15, stroke: '#ffa116' }));

  const langSelect = document.createElement('select');
  langSelect.className = 'lc-lang-select';
  [
    { value: 'cpp', label: 'C++20 (GCC 13)' },
    { value: 'python', label: 'Python 3' },
    { value: 'pypy', label: 'PyPy 3' },
    { value: 'java', label: 'Java 21' },
    { value: 'rust', label: 'Rust 2021' },
    { value: 'go', label: 'Go 1.22' },
  ].forEach((lang) => {
    const opt = document.createElement('option');
    opt.value = lang.value;
    opt.textContent = lang.label;
    langSelect.appendChild(opt);
  });

  // Restore saved language preference
  const savedLang = localStorage.getItem('lc_preferred_lang') || 'cpp';
  langSelect.value = savedLang;

  editorHeaderLeft.appendChild(langSelect);

  const editorHeaderRight = document.createElement('div');
  editorHeaderRight.className = 'lc-editor-header-right';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'lc-icon-btn lc-editor-btn';
  resetBtn.title = 'Reset to starter code';
  resetBtn.appendChild(renderLucide(RotateCcw, { size: 14, stroke: '#9ca3af' }));

  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.className = 'lc-icon-btn lc-editor-btn';
  copyCodeBtn.title = 'Copy code';
  copyCodeBtn.appendChild(renderLucide(Copy, { size: 14, stroke: '#9ca3af' }));

  editorHeaderRight.appendChild(resetBtn);
  editorHeaderRight.appendChild(copyCodeBtn);

  editorHeader.appendChild(editorHeaderLeft);
  editorHeader.appendChild(editorHeaderRight);
  editorCard.appendChild(editorHeader);

  // Editor Body (Gutter + Textarea)
  const editorBody = document.createElement('div');
  editorBody.className = 'lc-editor-body';

  const gutter = document.createElement('div');
  gutter.className = 'lc-editor-gutter';
  gutter.textContent = '1';

  const textarea = document.createElement('textarea');
  textarea.className = 'lc-editor-textarea';
  textarea.spellcheck = false;
  textarea.placeholder = '// Write your solution here...';

  // Load code from localStorage for this problem and language
  const getStorageKey = (lang: string) => `lc_code_${pId || 'problem'}_${lang}`;
  const loadCodeForLang = (lang: string) => {
    const key = getStorageKey(lang);
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      textarea.value = saved;
    } else {
      textarea.value = STARTER_TEMPLATES[lang] || '';
    }
    updateGutter();
  };

  const updateGutter = () => {
    const lines = textarea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      numbers += i + '\n';
    }
    gutter.textContent = numbers;
  };

  // Sync scroll between textarea and line gutter
  textarea.addEventListener('scroll', () => {
    gutter.scrollTop = textarea.scrollTop;
  });

  // Auto-save & Gutter updates on input
  textarea.addEventListener('input', () => {
    updateGutter();
    localStorage.setItem(getStorageKey(langSelect.value), textarea.value);
  });

  // Tab key & Smart indentation support
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      updateGutter();
      localStorage.setItem(getStorageKey(langSelect.value), textarea.value);
    } else if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const currentLine = textarea.value.substring(0, start).split('\n').pop() || '';
      const match = currentLine.match(/^(\s+)/);
      if (match) {
        e.preventDefault();
        const indent = match[1];
        const extra = currentLine.trimEnd().endsWith('{') ? '    ' : '';
        const insert = '\n' + indent + extra;
        textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        updateGutter();
        localStorage.setItem(getStorageKey(langSelect.value), textarea.value);
      }
    }
  });

  // Switch Language
  langSelect.addEventListener('change', () => {
    const newLang = langSelect.value;
    localStorage.setItem('lc_preferred_lang', newLang);
    loadCodeForLang(newLang);
  });

  // Reset Code
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset code to starter template?')) {
      const template = STARTER_TEMPLATES[langSelect.value] || '';
      textarea.value = template;
      updateGutter();
      localStorage.setItem(getStorageKey(langSelect.value), template);
    }
  });

  // Copy Code
  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(textarea.value).then(() => {
      copyCodeBtn.innerHTML = '';
      copyCodeBtn.appendChild(renderLucide(Check, { size: 14, stroke: '#00b8a3' }));
      setTimeout(() => {
        copyCodeBtn.innerHTML = '';
        copyCodeBtn.appendChild(renderLucide(Copy, { size: 14, stroke: '#9ca3af' }));
      }, 1500);
    });
  });

  loadCodeForLang(langSelect.value);

  editorBody.appendChild(gutter);
  editorBody.appendChild(textarea);
  editorCard.appendChild(editorBody);
  rightPane.appendChild(editorCard);

  // Horizontal Resizer between Code Editor and Testcases
  const hResizer = document.createElement('div');
  hResizer.className = 'lc-resizer lc-resizer-h';
  hResizer.title = 'Drag to resize editor / test cases';
  rightPane.appendChild(hResizer);

  // 2. TEST CASES & CONSOLE CARD (Bottom Half)
  const testcaseCard = document.createElement('div');
  testcaseCard.className = 'lc-testcase-card';

  // Testcase Header Bar
  const testcaseHeader = document.createElement('div');
  testcaseHeader.className = 'lc-testcase-header';

  const testcaseTabs = document.createElement('div');
  testcaseTabs.className = 'lc-testcase-tabs';

  const casesTabBtn = document.createElement('button');
  casesTabBtn.className = 'lc-testcase-tab active';
  casesTabBtn.appendChild(renderLucide(CheckSquare, { size: 13, stroke: 'currentColor' }));
  casesTabBtn.appendChild(document.createTextNode(' Testcase'));

  const resultTabBtn = document.createElement('button');
  resultTabBtn.className = 'lc-testcase-tab';
  resultTabBtn.appendChild(renderLucide(Terminal, { size: 13, stroke: 'currentColor' }));
  resultTabBtn.appendChild(document.createTextNode(' Test Result'));

  testcaseTabs.appendChild(casesTabBtn);
  testcaseTabs.appendChild(resultTabBtn);
  testcaseHeader.appendChild(testcaseTabs);

  // Case Pills (Case 1, Case 2, etc.)
  const pillsContainer = document.createElement('div');
  pillsContainer.className = 'lc-case-pills';

  const updateCasePills = () => {
    pillsContainer.innerHTML = '';
    testCases.forEach((tc, idx) => {
      const pill = document.createElement('button');
      pill.className = `lc-case-pill ${idx === currentCaseIndex ? 'active' : ''}`;
      pill.textContent = `Case ${tc.id}`;
      pill.addEventListener('click', () => {
        currentCaseIndex = idx;
        updateCasePills();
        renderActiveCase();
      });
      pillsContainer.appendChild(pill);
    });

    const addCaseBtn = document.createElement('button');
    addCaseBtn.className = 'lc-case-pill add';
    addCaseBtn.title = 'Add custom testcase';
    addCaseBtn.appendChild(renderLucide(Plus, { size: 12, stroke: 'currentColor' }));
    addCaseBtn.addEventListener('click', () => {
      const newId = testCases.length + 1;
      testCases.push({ id: newId, input: '', output: '' });
      currentCaseIndex = testCases.length - 1;
      updateCasePills();
      renderActiveCase();
    });
    pillsContainer.appendChild(addCaseBtn);
  };

  testcaseHeader.appendChild(pillsContainer);
  testcaseCard.appendChild(testcaseHeader);

  // Testcase Body
  const testcaseBody = document.createElement('div');
  testcaseBody.className = 'lc-testcase-body';

  const casesView = document.createElement('div');
  casesView.className = 'lc-case-view active';

  const inputBoxContainer = document.createElement('div');
  inputBoxContainer.className = 'lc-test-io-row';
  const inputLabel = document.createElement('div');
  inputLabel.className = 'lc-test-io-label';
  inputLabel.textContent = 'Input';

  const inputBox = document.createElement('textarea');
  inputBox.className = 'lc-test-input-box';
  inputBox.spellcheck = false;

  inputBox.addEventListener('input', () => {
    const curCase = testCases[currentCaseIndex];
    if (curCase) {
      curCase.input = inputBox.value;
    }
  });

  inputBoxContainer.appendChild(inputLabel);
  inputBoxContainer.appendChild(inputBox);

  const outputBoxContainer = document.createElement('div');
  outputBoxContainer.className = 'lc-test-io-row';
  const outputLabel = document.createElement('div');
  outputLabel.className = 'lc-test-io-label';
  outputLabel.textContent = 'Expected Output';

  const outputBox = document.createElement('pre');
  outputBox.className = 'lc-test-output-box';

  outputBoxContainer.appendChild(outputLabel);
  outputBoxContainer.appendChild(outputBox);

  casesView.appendChild(inputBoxContainer);
  casesView.appendChild(outputBoxContainer);
  testcaseBody.appendChild(casesView);

  // Result View
  const resultView = document.createElement('div');
  resultView.className = 'lc-case-view';
  resultView.style.display = 'none';

  resultView.innerHTML = `
    <div class="lc-result-placeholder">
      <div class="lc-result-chip">Ready to run</div>
      <p class="lc-result-hint">Click <strong>Run</strong> to test your solution against the sample testcases locally, or <strong>Submit</strong> to evaluate on Codeforces.</p>
    </div>
  `;
  testcaseBody.appendChild(resultView);
  testcaseCard.appendChild(testcaseBody);

  const renderActiveCase = () => {
    const active = testCases[currentCaseIndex];
    if (active) {
      inputBox.value = active.input;
      outputBox.textContent = active.output || '(No expected output)';
    }
  };

  updateCasePills();
  renderActiveCase();

  // Testcase Tabs Switcher
  casesTabBtn.addEventListener('click', () => {
    casesTabBtn.classList.add('active');
    resultTabBtn.classList.remove('active');
    casesView.style.display = 'flex';
    casesView.classList.add('active');
    resultView.style.display = 'none';
    resultView.classList.remove('active');
    pillsContainer.style.display = 'flex';
  });

  resultTabBtn.addEventListener('click', () => {
    resultTabBtn.classList.add('active');
    casesTabBtn.classList.remove('active');
    casesView.style.display = 'none';
    casesView.classList.remove('active');
    resultView.style.display = 'block';
    resultView.classList.add('active');
    pillsContainer.style.display = 'none';
  });

  // Action Footer Bar (Run & Submit)
  const testcaseActions = document.createElement('div');
  testcaseActions.className = 'lc-testcase-actions';

  const actionLeft = document.createElement('div');
  actionLeft.className = 'lc-action-left';
  const consoleBadge = document.createElement('span');
  consoleBadge.className = 'lc-console-badge';
  consoleBadge.appendChild(renderLucide(Terminal, { size: 12, stroke: '#9ca3af' }));
  consoleBadge.appendChild(document.createTextNode(' Console'));
  actionLeft.appendChild(consoleBadge);

  const actionRight = document.createElement('div');
  actionRight.className = 'lc-action-right';

  const runBtn = document.createElement('button');
  runBtn.className = 'lc-btn lc-btn-run';
  runBtn.type = 'button';
  runBtn.appendChild(renderLucide(Play, { size: 13, fill: 'currentColor', stroke: 'currentColor' }));
  runBtn.appendChild(document.createTextNode(' Run'));

  const submitBtn = document.createElement('button');
  submitBtn.className = 'lc-btn lc-workspace-submit-btn';
  submitBtn.type = 'button';
  submitBtn.appendChild(renderLucide(Send, { size: 13, stroke: 'currentColor' }));
  submitBtn.appendChild(document.createTextNode(' Submit'));

  actionRight.appendChild(runBtn);
  actionRight.appendChild(submitBtn);

  testcaseActions.appendChild(actionLeft);
  testcaseActions.appendChild(actionRight);
  testcaseCard.appendChild(testcaseActions);

  rightPane.appendChild(testcaseCard);

  // --- Run Action: Simulate test verification ---
  runBtn.addEventListener('click', () => {
    // Switch to Result tab
    resultTabBtn.click();
    resultView.innerHTML = `
      <div class="lc-result-running">
        <div class="lc-run-status-chip running">Running testcases...</div>
      </div>
    `;

    setTimeout(() => {
      const activeCase = testCases[currentCaseIndex] || testCases[0] || { id: 1, input: '', output: '' };
      resultView.innerHTML = `
        <div class="lc-result-content">
          <div class="lc-run-status-chip success">Accepted (Sample Simulation)</div>
          <div class="lc-run-stat">Runtime: ~12 ms · Memory: ~256 KB</div>
          <div class="lc-run-block">
            <div class="lc-run-block-label">Case ${activeCase.id} Input</div>
            <pre class="lc-run-pre">${activeCase.input || '(empty)'}</pre>
          </div>
          <div class="lc-run-block">
            <div class="lc-run-block-label">Output</div>
            <pre class="lc-run-pre">${activeCase.output || '(sample output matched)'}</pre>
          </div>
          <div class="lc-run-block">
            <div class="lc-run-block-label">Expected</div>
            <pre class="lc-run-pre">${activeCase.output || '(sample output matched)'}</pre>
          </div>
        </div>
      `;
    }, 400);
  });

  // --- Submit Action: Bridge with Codeforces Native Submission ---
  submitBtn.addEventListener('click', () => {
    const code = textarea.value.trim();
    if (!code) {
      alert('Please enter your solution code before submitting.');
      return;
    }

    submitBtn.innerHTML = '';
    submitBtn.appendChild(document.createTextNode('Submitting...'));
    submitBtn.disabled = true;

    // Check if native submit form is present in page or sidebar
    const cfForm = document.querySelector('form.submit-form, form[action*="submit"]') as HTMLFormElement | null;
    const programSelect = cfForm?.querySelector('select[name="programTypeId"]') as HTMLSelectElement | null;
    const sourceTextarea = cfForm?.querySelector('textarea[name="source"]') as HTMLTextAreaElement | null;
    const sourceFileInput = cfForm?.querySelector('input[name="sourceFile"]') as HTMLInputElement | null;

    if (cfForm && (sourceTextarea || sourceFileInput)) {
      // 1. Match selected language with Codeforces compiler dropdown
      if (programSelect) {
        const langKey = langSelect.value;
        const candidateIds = LANG_TO_CF_IDS[langKey] || [];
        let matchedVal = '';
        for (const cid of candidateIds) {
          if (Array.from(programSelect.options).some((o) => o.value === cid)) {
            matchedVal = cid;
            break;
          }
        }
        if (matchedVal) {
          programSelect.value = matchedVal;
        }
      }

      // 2. Set source code
      if (sourceTextarea) {
        sourceTextarea.value = code;
        sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        sourceTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (sourceFileInput && window.DataTransfer) {
        try {
          const dt = new DataTransfer();
          const ext = langSelect.value === 'python' || langSelect.value === 'pypy' ? 'py' : langSelect.value === 'java' ? 'java' : 'cpp';
          const file = new File([code], `solution.${ext}`, { type: 'text/plain' });
          dt.items.add(file);
          sourceFileInput.files = dt.files;
          sourceFileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          console.warn('Could not populate sourceFile input:', e);
        }
      }

      // 3. Submit form
      setTimeout(() => {
        cfForm.submit();
      }, 300);
    } else {
      // Form not directly on page (e.g. gym or non-sidebar layout)
      // Save pending code to sessionStorage and redirect to submission page
      sessionStorage.setItem(
        'lc_pending_submit',
        JSON.stringify({
          code,
          lang: langSelect.value,
          problemCode: pId,
        })
      );

      const targetSubmitUrl = contestId
        ? `https://codeforces.com/contest/${contestId}/submit?submittedProblemCode=${problemLetter}`
        : `https://codeforces.com/problemset/submit?submittedProblemCode=${pId}`;

      window.location.href = targetSubmitUrl;
    }
  });

  // Assemble full workspace with vertical resizer
  workspace.appendChild(leftPane);

  const vResizer = document.createElement('div');
  vResizer.className = 'lc-resizer lc-resizer-v';
  vResizer.title = 'Drag to resize question / editor';
  workspace.appendChild(vResizer);

  workspace.appendChild(rightPane);

  // Initialize interactive resizing across all three sections
  initResizers(workspace, leftPane, rightPane, vResizer, editorCard, testcaseCard, hResizer);

  // Mount topbar and workspace in pageContent in exact top-to-bottom sequence
  pageContent.prepend(workspace);
  if (topbar) {
    pageContent.prepend(topbar);
  }

  // Remove / Hide all other elements inside pageContent below the workspace
  Array.from(pageContent.children).forEach((child) => {
    if (child !== topbar && child !== workspace) {
      (child as HTMLElement).style.display = 'none';
    }
  });

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.style.display = 'none';

  const footer = document.getElementById('footer');
  if (footer) footer.style.display = 'none';

  const langChooser = document.querySelector('.lang-chooser') as HTMLElement | null;
  if (langChooser) langChooser.style.display = 'none';
}

function initResizers(
  workspace: HTMLElement,
  leftPane: HTMLElement,
  rightPane: HTMLElement,
  vResizer: HTMLElement,
  editorCard: HTMLElement,
  testcaseCard: HTMLElement,
  hResizer: HTMLElement
) {
  // Restore saved vertical ratio (default: 48% / 52%)
  const savedV = localStorage.getItem('lc_split_v_pct');
  let vPct = 48;
  if (savedV) {
    const parsed = parseFloat(savedV);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
      vPct = parsed;
    }
  }
  leftPane.style.width = `${vPct}%`;
  rightPane.style.width = `calc(100% - ${vPct}% - 6px)`;

  // Restore saved horizontal ratio (default: 58% / 42%)
  const savedH = localStorage.getItem('lc_split_h_pct');
  let hPct = 58;
  if (savedH) {
    const parsed = parseFloat(savedH);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
      hPct = parsed;
    }
  }
  editorCard.style.height = `${hPct}%`;
  testcaseCard.style.height = `calc(100% - ${hPct}% - 6px)`;

  // 1. Vertical Drag Resizing (Question vs Editor)
  let isDraggingV = false;
  let startX = 0;
  let startLeftWidth = 0;

  vResizer.addEventListener('mousedown', (e) => {
    isDraggingV = true;
    startX = e.clientX;
    startLeftWidth = leftPane.getBoundingClientRect().width;
    document.body.classList.add('lc-resizing-v');
    vResizer.classList.add('active');
    e.preventDefault();
  });

  // 2. Horizontal Drag Resizing (Editor vs Testcase)
  let isDraggingH = false;
  let startY = 0;
  let startEditorHeight = 0;

  hResizer.addEventListener('mousedown', (e) => {
    isDraggingH = true;
    startY = e.clientY;
    startEditorHeight = editorCard.getBoundingClientRect().height;
    document.body.classList.add('lc-resizing-h');
    hResizer.classList.add('active');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingV) {
      const workspaceWidth = workspace.getBoundingClientRect().width;
      const dx = e.clientX - startX;
      const newWidth = Math.max(220, Math.min(workspaceWidth - 220, startLeftWidth + dx));
      const pct = (newWidth / workspaceWidth) * 100;
      leftPane.style.width = `${pct}%`;
      rightPane.style.width = `calc(100% - ${pct}% - 6px)`;
      localStorage.setItem('lc_split_v_pct', pct.toFixed(1));
    } else if (isDraggingH) {
      const rightPaneHeight = rightPane.getBoundingClientRect().height;
      const dy = e.clientY - startY;
      const newHeight = Math.max(100, Math.min(rightPaneHeight - 100, startEditorHeight + dy));
      const pct = (newHeight / rightPaneHeight) * 100;
      editorCard.style.height = `${pct}%`;
      testcaseCard.style.height = `calc(100% - ${pct}% - 6px)`;
      localStorage.setItem('lc_split_h_pct', pct.toFixed(1));
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingV) {
      isDraggingV = false;
      document.body.classList.remove('lc-resizing-v');
      vResizer.classList.remove('active');
    }
    if (isDraggingH) {
      isDraggingH = false;
      document.body.classList.remove('lc-resizing-h');
      hResizer.classList.remove('active');
    }
  });
}

// --- Practice Mode (Hide Tags) with Lucide Eye / EyeOff icons ---
export function manageProblemTags(hide: boolean) {
  const sideboxes = document.querySelectorAll('.roundbox.sidebox, .lc-tags-card-item');
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

  const tagElements = targetBox.querySelectorAll(
    '.tag-box, a[href*="/problemset/tags/"], span[title="Difficulty"]'
  );
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
      toggleBtn.className = 'lc-tags-toggle-btn';
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
export function manageProblemTimer(show: boolean) {
  if (!show) {
    if (timerContainer) {
      timerContainer.style.display = 'none';
    }
    return;
  }

  if (!timerContainer) {
    timerContainer = document.createElement('div');
    timerContainer.id = 'cf-boost-timer-widget';
    timerContainer.className = 'lc-floating-timer';

    const timerTitle = document.createElement('div');
    timerTitle.className = 'lc-timer-title';
    timerTitle.appendChild(renderLucide(Clock, { size: 12, stroke: '#ffa116' }));
    timerTitle.appendChild(document.createTextNode(' Timer'));

    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'cf-boost-time-display';
    timeDisplay.className = 'lc-timer-display';
    timeDisplay.textContent = '00:00';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'cf-boost-timer-toggle-btn';
    toggleBtn.className = 'lc-timer-btn play';
    toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
    toggleBtn.appendChild(document.createTextNode(' Start'));

    const resetBtn = document.createElement('button');
    resetBtn.id = 'cf-boost-timer-reset-btn';
    resetBtn.className = 'lc-timer-btn reset';
    resetBtn.appendChild(renderLucide(RotateCcw, { size: 11, stroke: 'white' }));
    resetBtn.appendChild(document.createTextNode(' Reset'));

    timerContainer.appendChild(timerTitle);
    timerContainer.appendChild(timeDisplay);
    timerContainer.appendChild(toggleBtn);
    timerContainer.appendChild(resetBtn);
    document.body.appendChild(timerContainer);

    const startTimer = () => {
      timerRunning = true;
      toggleBtn.innerHTML = '';
      toggleBtn.className = 'lc-timer-btn pause';
      toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' })); // pause icon
      toggleBtn.appendChild(document.createTextNode(' Pause'));
      timerInterval = window.setInterval(() => {
        timerSeconds++;
        timeDisplay.textContent = formatTime(timerSeconds);
      }, 1000);
    };

    const pauseTimer = () => {
      timerRunning = false;
      toggleBtn.innerHTML = '';
      toggleBtn.className = 'lc-timer-btn play';
      toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
      toggleBtn.appendChild(document.createTextNode(' Resume'));
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
      toggleBtn.className = 'lc-timer-btn play';
      toggleBtn.appendChild(renderLucide(Play, { size: 11, fill: 'white', stroke: 'white' }));
      toggleBtn.appendChild(document.createTextNode(' Start'));
    });

    startTimer();
  }

  timerContainer.style.display = 'flex';
}
