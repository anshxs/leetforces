import { useState, useEffect } from 'react';
import { Zap, Clock, Eye, ExternalLink } from 'lucide-react';
import './App.css';

interface CFUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  avatar?: string;
}

interface StoredData {
  cf_handle?: string;
  cf_leetcode_theme?: boolean;
  cf_hide_tags?: boolean;
  cf_show_timer?: boolean;
}

const getRankColor = (rank?: string): string => {
  if (!rank) return '#9e9e9e';
  const r = rank.toLowerCase();
  if (r.includes('legendary') || r.includes('international grandmaster') || r.includes('grandmaster')) {
    return '#ff375f';
  }
  if (r.includes('international master') || r.includes('master')) {
    return '#ffa116';
  }
  if (r.includes('candidate master')) {
    return '#c084fc';
  }
  if (r.includes('expert')) {
    return '#38bdf8';
  }
  if (r.includes('specialist')) {
    return '#2dd4bf';
  }
  if (r.includes('pupil')) {
    return '#00b8a3';
  }
  return '#94a3b8';
};

export default function App() {
  const [handle, setHandle] = useState<string>('');
  const [inputHandle, setInputHandle] = useState<string>('');
  const [userInfo, setUserInfo] = useState<CFUserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [leetcodeTheme, setLeetcodeTheme] = useState<boolean>(true);
  const [hideTags, setHideTags] = useState<boolean>(false);
  const [showTimer, setShowTimer] = useState<boolean>(true);

  useEffect(() => {
    browser.storage.local
      .get(['cf_handle', 'cf_leetcode_theme', 'cf_hide_tags', 'cf_show_timer'])
      .then((data) => {
        const res = data as StoredData;
        if (typeof res.cf_handle === 'string') {
          setHandle(res.cf_handle);
          setInputHandle(res.cf_handle);
          fetchUserData(res.cf_handle);
        }
        if (typeof res.cf_leetcode_theme === 'boolean') {
          setLeetcodeTheme(res.cf_leetcode_theme);
        }
        if (typeof res.cf_hide_tags === 'boolean') {
          hideTagsEnabledSet(res.cf_hide_tags);
        }
        if (typeof res.cf_show_timer === 'boolean') {
          setShowTimer(res.cf_show_timer);
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
      });
  }, []);

  const hideTagsEnabledSet = (val: boolean) => setHideTags(val);

  const fetchUserData = async (h: string) => {
    if (!h.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(h.trim())}`);
      const data = await resp.json();
      if (data.status === 'OK' && data.result?.length > 0) {
        const user = data.result[0];
        setUserInfo({
          handle: user.handle,
          rating: user.rating,
          maxRating: user.maxRating,
          rank: user.rank,
          maxRank: user.maxRank,
          avatar: user.avatar,
        });
      } else {
        setError(data.comment || 'User not found');
        setUserInfo(null);
      }
    } catch {
      setError('Unable to fetch Codeforces stats');
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = inputHandle.trim();
    if (!cleanHandle) return;
    setHandle(cleanHandle);
    await browser.storage.local.set({ cf_handle: cleanHandle });
    fetchUserData(cleanHandle);
  };

  const toggleTheme = async (checked: boolean) => {
    setLeetcodeTheme(checked);
    await browser.storage.local.set({ cf_leetcode_theme: checked });
  };

  const toggleHideTags = async (checked: boolean) => {
    setHideTags(checked);
    await browser.storage.local.set({ cf_hide_tags: checked });
  };

  const toggleShowTimer = async (checked: boolean) => {
    setShowTimer(checked);
    await browser.storage.local.set({ cf_show_timer: checked });
  };

  return (
    <div className="lc-popup">
      {/* Header */}
      <header className="lc-header">
        <div className="lc-brand">
          <span className="lc-icon">
            <Zap size={20} fill="#ffa116" stroke="#ffa116" />
          </span>
          <div>
            <h1 className="lc-title">LeetBoost</h1>
            <div className="lc-subtitle">LeetCode Theme for Codeforces</div>
          </div>
        </div>
        <span className="lc-pill">CF Only</span>
      </header>

      {/* Main Theme Toggle */}
      <div className="lc-card theme-hero-card">
        <div className="theme-hero-info">
          <div className="theme-hero-title">LeetCode Dark Theme</div>
          <div className="theme-hero-desc">Transforms /problemset & problem pages</div>
        </div>
        <label className="lc-switch">
          <input
            type="checkbox"
            checked={leetcodeTheme}
            onChange={(e) => toggleTheme(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      {/* Codeforces Profile Card */}
      <div className="lc-card">
        <div className="lc-card-header">Codeforces Profile</div>
        <form onSubmit={handleSaveUser} className="handle-form">
          <input
            type="text"
            placeholder="Enter handle (e.g. tourist)"
            value={inputHandle}
            onChange={(e) => setInputHandle(e.target.value)}
            className="lc-input"
          />
          <button type="submit" disabled={loading} className="lc-btn primary">
            {loading ? '...' : 'Track'}
          </button>
        </form>

        {error && <div className="lc-error">{error}</div>}

        {userInfo && (
          <div className="user-profile">
            {userInfo.avatar && (
              <img src={userInfo.avatar} alt={userInfo.handle} className="user-avatar" />
            )}
            <div className="user-details">
              <a
                href={`https://codeforces.com/profile/${userInfo.handle}`}
                target="_blank"
                rel="noreferrer"
                className="user-handle"
                style={{ color: getRankColor(userInfo.rank) }}
              >
                {userInfo.handle}
              </a>
              <div className="user-rank" style={{ color: getRankColor(userInfo.rank) }}>
                {userInfo.rank ? userInfo.rank.toUpperCase() : 'UNRATED'}
              </div>
              <div className="user-ratings">
                <span>Rating: <strong>{userInfo.rating ?? 'N/A'}</strong></span>
                {userInfo.maxRating && (
                  <span>Max: <strong>{userInfo.maxRating}</strong></span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="lc-card">
        <div className="lc-card-header">Features & Tools</div>
        <label className="toggle-row">
          <div>
            <div className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} style={{ color: '#ffa116' }} /> Floating Problem Timer
            </div>
            <div className="toggle-sub">Stopwatch on problem pages</div>
          </div>
          <input
            type="checkbox"
            checked={showTimer}
            onChange={(e) => toggleShowTimer(e.target.checked)}
          />
        </label>

        <label className="toggle-row">
          <div>
            <div className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={13} style={{ color: '#60a5fa' }} /> Practice Mode (Hide Tags)
            </div>
            <div className="toggle-sub">Blur algorithm tags until revealed</div>
          </div>
          <input
            type="checkbox"
            checked={hideTags}
            onChange={(e) => toggleHideTags(e.target.checked)}
          />
        </label>
      </div>

      {/* Quick Nav */}
      <div className="lc-footer">
        <a href="https://codeforces.com/problemset" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Problemset <ExternalLink size={10} />
        </a>
        <span>•</span>
        <a href="https://codeforces.com/contests" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Contests <ExternalLink size={10} />
        </a>
        {handle && (
          <>
            <span>•</span>
            <a
              href={`https://codeforces.com/submissions/${handle}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Submissions <ExternalLink size={10} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
