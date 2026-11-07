import { useState, useEffect } from 'react';
import { Zap, Coffee, Star } from 'lucide-react';
import './App.css';

export default function App() {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    browser.storage.local
      .get(['cf_leetcode_theme'])
      .then((data) => {
        if (typeof data.cf_leetcode_theme === 'boolean') {
          setEnabled(data.cf_leetcode_theme);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = async (checked: boolean) => {
    setEnabled(checked);
    await browser.storage.local.set({ cf_leetcode_theme: checked });
  };

  return (
    <div className="lc-popup">
      <header className="lc-popup-header">
        <div className="lc-brand">
          <div className="lc-logo-icon">
            <Zap size={18} fill="#ffa116" stroke="#ffa116" />
          </div>
          <div>
            <h1 className="lc-title">LeetForces</h1>
            <span className="lc-subtitle">LeetCode UI for Codeforces</span>
          </div>
        </div>
        <span
          className={`lc-status-dot ${enabled ? 'active' : ''}`}
          title={enabled ? 'Active' : 'Disabled'}
        />
      </header>

      {/* Main Theme Toggle Card */}
      <div className="lc-toggle-card">
        <div className="lc-toggle-info">
          <div className="lc-toggle-title">LeetCode Theme</div>
          <div className="lc-toggle-desc">
            {enabled ? 'Active on Problemset & Reg' : 'Theme is disabled'}
          </div>
        </div>
        <label className="lc-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggleTheme(e.target.checked)}
          />
          <span className="slider round" />
        </label>
      </div>

      {/* Action Buttons */}
      <div className="lc-actions-group">
        <a
          href="https://buymeacoffee.com/anshxs"
          target="_blank"
          rel="noopener noreferrer"
          className="lc-action-btn coffee-btn"
        >
          <Coffee size={15} stroke="#ffa116" className="btn-icon" />
          <span>Buy me a coffee</span>
        </a>

        <a
          href="https://github.com/anshxs/leetforces"
          target="_blank"
          rel="noopener noreferrer"
          className="lc-action-btn star-btn"
        >
          <Star size={15} fill="#ffa116" stroke="#ffa116" className="btn-icon" />
          <span>Star on GitHub</span>
        </a>
      </div>
    </div>
  );
}
