import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Languages, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  Lock, 
  Check, 
  Settings as SettingsIcon, 
  Heart, 
  BookOpen, 
  Users, 
  Sparkles, 
  ArrowRight,
  Info,
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  LogOut,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  FileText,
  Gift,
  Map as MapIcon,
  Building,
  Smartphone,
  HandHeart,
  Compass,
  HelpCircle,
  Navigation,
  Search,
  LayoutGrid,
  ListFilter,
  CalendarDays,
  Copy,
  Globe,
  Filter,
  Layers,
  PlayCircle,
  Video
} from 'lucide-react';
import { initialData } from './data/initialData';

const AUTH_ENDPOINT = '/functions/auth';
const GITHUB_SETTINGS_ENDPOINT = '/functions/github-settings';

// Helper functions for Timetable styling - standardized to primary emerald theme
const getDayBadgeStyle = (dayStr) => {
  return {
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/90',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    gradient: 'from-primary to-primary-dark',
    pill: 'bg-emerald-100 text-emerald-800 font-semibold',
    dot: 'bg-primary'
  };
};

const getLangBadgeStyle = (langStr) => {
  const str = String(langStr || '').toLowerCase();
  if (str.includes('华') || str.includes('中') || str.includes('chinese') || str.includes('mandarin')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/20';
  }
  if (str.includes('闽') || str.includes('福') || str.includes('hokkien')) {
    return 'bg-violet-50 text-violet-700 border-violet-200/80 ring-violet-500/20';
  }
  if (str.includes('马') || str.includes('bahasa') || str.includes('malay')) {
    return 'bg-amber-50 text-amber-800 border-amber-200/80 ring-amber-500/20';
  }
  if (str.includes('尼') || str.includes('nepal')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/20';
  }
  if (str.includes('英') || str.includes('english')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80 ring-blue-500/20';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

// Theme color map for CSS variable injection

const stripSensitiveData = (siteData) => {
  const sanitized = {
    ...siteData,
    settings: { ...(siteData?.settings || {}) }
  };

  // Older localStorage/backups may contain a client-side adminPassword field.
  // Never keep it in state, exports, localStorage, or GitHub auto-save commits.
  delete sanitized.settings.adminPassword;
  return sanitized;
};

const hexToRgb = (hex) => {
  const value = String(hex || '').replace('#', '').trim();
  const normalized = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return { r: parseInt(normalized.slice(0, 2), 16), g: parseInt(normalized.slice(2, 4), 16), b: parseInt(normalized.slice(4, 6), 16) };
};
const rgbString = (rgb) => `${rgb.r} ${rgb.g} ${rgb.b}`;

const fontFamilyOptions = {
  zh: [
    { value: 'noto-sans-sc', label: 'Noto Sans SC / 思源黑体', family: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif' },
    { value: 'system-sans', label: 'System Sans / 系统无衬线', family: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif' },
    { value: 'serif', label: 'Noto Serif SC / 思源宋体', family: '"Noto Serif SC", "Songti SC", SimSun, serif' },
    { value: 'kai', label: 'KaiTi / 楷体', family: 'KaiTi, STKaiti, "Kaiti SC", serif' }
  ],
  en: [
    { value: 'inter', label: 'Inter / Modern Sans', family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { value: 'system-sans', label: 'System Sans', family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' },
    { value: 'serif', label: 'Georgia / Serif', family: 'Georgia, "Times New Roman", serif' },
    { value: 'rounded', label: 'Rounded Sans', family: '"Arial Rounded MT Bold", "Trebuchet MS", ui-sans-serif, sans-serif' }
  ]
};

const getFontFamily = (language, fontKey) =>
  fontFamilyOptions[language].find(font => font.value === fontKey)?.family || fontFamilyOptions[language][0].family;

const colorsMap = {
  emerald: { primary: '16 185 129', dark: '5 150 105', light: '209 250 229', name: 'Emerald / 翡翠绿' },
  indigo: { primary: '99 102 241', dark: '79 70 229', light: '224 231 255', name: 'Indigo / 靛青蓝' },
  blue: { primary: '59 130 246', dark: '37 99 235', light: '219 234 254', name: 'Blue / 蔚蓝色' },
  violet: { primary: '139 92 246', dark: '124 58 237', light: '237 233 254', name: 'Violet / 罗兰紫' },
  amber: { primary: '245 158 11', dark: '217 119 6', light: '254 243 199', name: 'Amber / 琥珀黄' },
  rose: { primary: '244 63 94', dark: '225 29 72', light: '254 228 230', name: 'Rose / 玫瑰红' }
};

export default function App() {
  // Load data from LocalStorage or fallback to initialData
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('bmbcc_site_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deep merge settings to ensure new fields (aboutIntro, etc.) are not lost if user has old LocalStorage
        const mergeBilingual = (initial, parsedObj) => {
          if (!parsedObj) return initial;
          if (typeof initial !== 'object' || initial === null) return parsedObj;
          // if bilingual object {zh,en}
          if ('zh' in initial || 'en' in initial) {
            return { ...initial, ...parsedObj };
          }
          return parsedObj;
        };
        const settingsKeys = [
          'churchName','slogan','description','themeYear',
          'aboutBadge','aboutTitle','aboutIntro','aboutVision','aboutMission',
          'leadershipBadge','leadershipTitle','leadershipIntro',
          'ministriesBadge','ministriesTitle','ministriesIntro',
          'timetableBadge','timetableTitle','timetableIntro',
          'eventsBadge','eventsTitle','eventsIntro',
          'bulletinsBadge','bulletinsTitle','bulletinsIntro',
          'servicesBadge','servicesTitle','servicesIntro',
          'cellGroupsBadge','cellGroupsTitle','cellGroupsIntro',
          'mapsBadge','mapsTitle','mapsIntro',
          'homeVisionPara1','homeVisionPara2','yearlyVisionLabel','yearlyVisionTitle',
          'yearlyVisionBadge','yearlyVisionScripture','yearlyVisionRef','ctaTitle',
          'ctaDescription','footerCopyright','footerTagline','churchTagline','headerLogo'
        ];
        const mergedSettings = { ...initialData.settings, ...(parsed.settings || {}) };
        delete mergedSettings.adminPassword;
        settingsKeys.forEach(k => {
          if (initialData.settings[k]) {
            mergedSettings[k] = mergeBilingual(initialData.settings[k], parsed.settings?.[k]);
          }
        });
        // Ensure standard structure is present
        return stripSensitiveData({ ...initialData, ...parsed, settings: mergedSettings });
      } catch (e) {
        console.error("Error parsing localstorage data, using defaults", e);
        return initialData;
      }
    }
    return initialData;
  });

  // Global state
  const [lang, setLang] = useState('zh'); // 'zh' or 'en'
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'about', 'ministries', 'timetable', 'events', 'admin'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Admin-specific state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminActiveSection, setAdminActiveSection] = useState('settings'); // 'settings', 'carousel', 'timetable', 'events', 'ministries', 'backup'
  const [adminSuccessMessage, setAdminSuccessMessage] = useState('');
  const [logoUploadError, setLogoUploadError] = useState('');
  const [eventPopupOpen, setEventPopupOpen] = useState(false);
  const [eventPopupSlide, setEventPopupSlide] = useState(0);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [selectedCellGroup, setSelectedCellGroup] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Verify auth session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(AUTH_ENDPOINT, {
          method: 'GET', 
          credentials: 'include' 
        });
        const data = await res.json();
        setIsAdminLoggedIn(data.isAdmin);
      } catch (err) {
        console.error('Auth check failed:', err);
        setIsAdminLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Load GitHub settings from Cloudflare KV (server-side persistence)
  // Called when admin logs in, so the PAT/repo/auto-save survive across sessions
  const loadGithubSettingsFromCloud = async () => {
    try {
      const res = await fetch(GITHUB_SETTINGS_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return; // Not configured or not authenticated
      const result = await res.json();
      if (result.ok && result.settings) {
        const s = result.settings;
        // Only overwrite localStorage if the server has values
        if (s.pat !== undefined && s.pat !== '') {
          localStorage.setItem('bmbcc_github_pat', s.pat);
          setGithubPat(s.pat);
        }
        if (s.repo !== undefined && s.repo !== '') {
          localStorage.setItem('bmbcc_github_repo', s.repo);
          setGithubRepo(s.repo);
          // Also update data.settings for cross-session persistence
          setData(prev => {
            const updated = { ...prev, settings: { ...prev.settings, githubRepo: s.repo } };
            return updated;
          });
        }
        if (s.autoSave !== undefined) {
          localStorage.setItem('bmbcc_autosave_github', String(s.autoSave));
          setAutoSaveToGithub(s.autoSave);
          setData(prev => {
            const updated = { ...prev, settings: { ...prev.settings, autoSaveToGithub: s.autoSave } };
            return updated;
          });
        }
      }
    } catch (err) {
      // Silently fail — KV may not be configured yet, fall back to localStorage
      console.log('Cloudflare GitHub settings not available, using localStorage fallback:', err?.message || err);
    }
  };

  // Save GitHub settings to Cloudflare KV (server-side persistence)
  const saveGithubSettingsToCloud = async (settings) => {
    try {
      await fetch(GITHUB_SETTINGS_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      // Silently fail — KV may not be configured yet
      console.log('Could not save GitHub settings to Cloudflare:', err?.message || err);
    }
  };

  // Load GitHub settings from Cloudflare when admin logs in
  useEffect(() => {
    if (isAdminLoggedIn) {
      loadGithubSettingsFromCloud();
    }
  }, [isAdminLoggedIn]);

  // Editor temporary states
  const [editingSlide, setEditingSlide] = useState(null); // slide ID or 'new'
  const [editingTimetable, setEditingTimetable] = useState(null); // timetable item ID or 'new'
  const [editingEvent, setEditingEvent] = useState(null); // event ID or 'new'
  const [editingMinistry, setEditingMinistry] = useState(null); // ministry ID or 'new'
  const [editingBulletin, setEditingBulletin] = useState(null);
  const [editingCellGroup, setEditingCellGroup] = useState(null);
  const [editingLeader, setEditingLeader] = useState(null);
  const [editingSermon, setEditingSermon] = useState(null);
  const [editingOfferingMethod, setEditingOfferingMethod] = useState(null);
  const [editingGuideSection, setEditingGuideSection] = useState(null);
  const [sermonFilter, setSermonFilter] = useState('all');
  const [bulletinsTab, setBulletinsTab] = useState('bulletins'); // 'bulletins' | 'sermons'
  // Bulletins & Sermons search & view states
  const [bulletinSearchQuery, setBulletinSearchQuery] = useState('');
  const [bulletinViewMode, setBulletinViewMode] = useState('cards'); // 'cards' | 'table'
  const [bulletinCategoryFilter, setBulletinCategoryFilter] = useState('all');
  const [sermonSearchQuery, setSermonSearchQuery] = useState('');
  const [sermonViewMode, setSermonViewMode] = useState('cards'); // 'cards' | 'table'
  const [selectedBulletinModal, setSelectedBulletinModal] = useState(null);
  const [selectedSermonModal, setSelectedSermonModal] = useState(null);
  // Service Library states - now Services & Worships
  const [editingService, setEditingService] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceViewMode, setServiceViewMode] = useState('cards'); // 'cards' | 'table'
  const [selectedServiceModal, setSelectedServiceModal] = useState(null);
  const [serviceMainTab, setServiceMainTab] = useState('all'); // 'all' | 'service' | 'worship'
  const [aboutSettingsTab, setAboutSettingsTab] = useState('about'); // 'about' | 'homeVision' | 'yearlyVision' | 'leaders'
  const [adminServiceTab, setAdminServiceTab] = useState('service'); // 'service' | 'worship'
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');

  // Timetable page states
  const [timetableFilterDay, setTimetableFilterDay] = useState('all');
  const [timetableFilterLang, setTimetableFilterLang] = useState('all');
  const [timetableSearchQuery, setTimetableSearchQuery] = useState('');
  const [timetableViewMode, setTimetableViewMode] = useState('cards'); // 'cards', 'timeline', 'table'
  const [selectedTimetableModal, setSelectedTimetableModal] = useState(null);
  const [copiedModalItem, setCopiedModalItem] = useState(false);

  // Build-time GitHub config (injected by Vite from env vars)
  const GITHUB_PAT_DEFAULT = ''; // Never inject GitHub tokens at build time; enter them in the admin UI only.
  const GITHUB_REPO_DEFAULT = import.meta.env?.VITE_GITHUB_REPO || 'fongway94/BMBCCWebpage';
  const AUTO_SAVE_GITHUB_DEFAULT = import.meta.env?.VITE_AUTO_SAVE_GITHUB === 'true';

  // Auto-save to GitHub state (direct API - no server needed)
  const [autoSaveToGithub, setAutoSaveToGithub] = useState(() => {
    const saved = localStorage.getItem('bmbcc_autosave_github');
    if (saved !== null) return saved === 'true';
    // Fallback: check if autoSaveToGithub is stored in site data settings
    // (helps when the dedicated localStorage key is cleared but data was previously auto-saved)
    try {
      const siteData = localStorage.getItem('bmbcc_site_data');
      if (siteData) {
        const parsed = JSON.parse(siteData);
        if (parsed?.settings?.autoSaveToGithub !== undefined) {
          return !!parsed.settings.autoSaveToGithub;
        }
      }
    } catch (e) {}
    return AUTO_SAVE_GITHUB_DEFAULT;
  });
  const [githubPat, setGithubPat] = useState(() => {
    return localStorage.getItem('bmbcc_github_pat') || GITHUB_PAT_DEFAULT;
  });
  const [githubRepo, setGithubRepo] = useState(() => {
    const saved = localStorage.getItem('bmbcc_github_repo');
    if (saved) return saved;
    // Fallback: check if githubRepo is stored in site data settings
    try {
      const siteData = localStorage.getItem('bmbcc_site_data');
      if (siteData) {
        const parsed = JSON.parse(siteData);
        if (parsed?.settings?.githubRepo) {
          return parsed.settings.githubRepo;
        }
      }
    } catch (e) {}
    return GITHUB_REPO_DEFAULT;
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // 'saving', 'success', 'error'
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [backupReauthOpen, setBackupReauthOpen] = useState(false);
  const [backupAccessGranted, setBackupAccessGranted] = useState(false);
  const [backupPasswordInput, setBackupPasswordInput] = useState('');
  const [backupLoginError, setBackupLoginError] = useState('');

  // GitHub auto-save: SHA cache, push lock, debounce, and latest data ref
  const lastKnownShaRef = React.useRef(null);
  const isPushingRef = React.useRef(false);
  const autoSaveTimeoutRef = React.useRef(null);
  const latestDataRef = React.useRef(null);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Apply the selected preset or freely chosen custom brand color.
  useEffect(() => {
    const custom = hexToRgb(data.settings.customThemeColor);
    const colorKey = data.settings.themeColor || 'emerald';
    if (colorKey === 'custom' && custom) {
      const dark = { r: Math.max(0, Math.round(custom.r * .82)), g: Math.max(0, Math.round(custom.g * .82)), b: Math.max(0, Math.round(custom.b * .82)) };
      const light = { r: Math.min(255, Math.round(custom.r + (255 - custom.r) * .78)), g: Math.min(255, Math.round(custom.g + (255 - custom.g) * .78)), b: Math.min(255, Math.round(custom.b + (255 - custom.b) * .78)) };
      document.documentElement.style.setProperty('--color-primary', rgbString(custom));
      document.documentElement.style.setProperty('--color-primary-dark', rgbString(dark));
      document.documentElement.style.setProperty('--color-primary-light', rgbString(light));
      return;
    }
    const selected = colorsMap[colorKey] || colorsMap.emerald;
    document.documentElement.style.setProperty('--color-primary', selected.primary);
    document.documentElement.style.setProperty('--color-primary-dark', selected.dark);
    document.documentElement.style.setProperty('--color-primary-light', selected.light);
  }, [data.settings.themeColor, data.settings.customThemeColor]);

  // Scale the document's rem-based typography so the setting affects the whole site,
  // including navigation, content, forms, and the footer.
  useEffect(() => {
    const scale = Number(data.settings.textScale) || 100;
    document.documentElement.style.fontSize = `${Math.min(140, Math.max(80, scale))}%`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [data.settings.textScale]);

  // Use separate typefaces for the Chinese and English versions of the site.
  // The selected language determines which setting is used in the live preview.
  useEffect(() => {
    const fontKey = lang === 'zh' ? data.settings.fontFamilyZh : data.settings.fontFamilyEn;
    document.documentElement.style.setProperty('--site-font-family', getFontFamily(lang, fontKey));
    return () => {
      document.documentElement.style.removeProperty('--site-font-family');
    };
  }, [lang, data.settings.fontFamilyZh, data.settings.fontFamilyEn]);

  // Keep the browser tab icon in sync with the uploaded header logo.
  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = data.settings.headerLogo || '/favicon.svg';
  }, [data.settings.headerLogo]);

  // Event alerts are intentionally shown on every page load (not once per session).
  useEffect(() => {
    const popupEvents = (data.events || []).filter(e => e.popupEnabled);
    if (data.settings.eventPopupEnabled && popupEvents.length > 0 && activeTab !== 'admin') {
      setEventPopupSlide(0);
      setEventPopupOpen(true);
    }
  }, []);

  // Save helper
  const saveAllData = (newData) => {
    const sanitizedData = stripSensitiveData(newData);
    setData(sanitizedData);
    localStorage.setItem('bmbcc_site_data', JSON.stringify(sanitizedData));
    triggerAdminSuccess("修改已成功保存并即时生效！Changes saved successfully!");

    // Auto-save to GitHub if enabled (direct GitHub API, no server needed)
    if (autoSaveToGithub && githubPat && githubRepo) {
      // Store latest data for debounced push
      latestDataRef.current = sanitizedData;

      // Debounce: cancel any pending push and schedule a new one
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      setAutoSaveStatus('saving');
      setAutoSaveMessage(lang === 'zh' ? '正在同步到 GitHub...' : 'Syncing to GitHub...');

      autoSaveTimeoutRef.current = setTimeout(() => {
        const doGithubPush = async () => {
          const dataToPush = latestDataRef.current;
          if (!dataToPush) return;

          // Prevent concurrent pushes
          if (isPushingRef.current) {
            // Schedule a retry after a short delay
            autoSaveTimeoutRef.current = setTimeout(() => {
              setAutoSaveStatus('saving');
              setAutoSaveMessage(lang === 'zh' ? '正在同步到 GitHub...' : 'Syncing to GitHub...');
              doGithubPush();
            }, 3000);
            return;
          }

          isPushingRef.current = true;

          const filePath = 'src/data/initialData.js';
          const apiUrl = 'https://api.github.com/repos/' + githubRepo + '/contents/' + filePath;
          const jsContent = 'export const initialData = ' + JSON.stringify(dataToPush, null, 2) + ';\n';
          const base64Content = btoa(unescape(encodeURIComponent(jsContent)));

          const pushWithRetry = async (maxRetries = 3) => {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                // Fetch SHA: use cache if available, otherwise fetch from GitHub
                let sha = lastKnownShaRef.current;
                if (!sha) {
                  const shaRes = await fetch(apiUrl, {
                    headers: {
                      Authorization: 'Bearer ' + githubPat,
                      Accept: 'application/vnd.github.v3+json',
                    },
                  });
                  if (shaRes.ok) {
                    const shaInfo = await shaRes.json();
                    sha = shaInfo.sha;
                  }
                }

                // Push the file
                const body = {
                  message: 'Auto-save: update site data [' + new Date().toISOString().slice(0, 19).replace('T', ' ') + ']',
                  content: base64Content,
                };
                if (sha) body.sha = sha;

                const pushRes = await fetch(apiUrl, {
                  method: 'PUT',
                  headers: {
                    Authorization: 'Bearer ' + githubPat,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body),
                });

                const result = await pushRes.json().catch(() => ({}));

                if (pushRes.ok) {
                  // Cache the new SHA for next push
                  lastKnownShaRef.current = result.content?.sha || null;
                  setAutoSaveStatus('success');
                  setAutoSaveMessage(lang === 'zh'
                    ? '\u2705 已自动同步到 GitHub！'
                    : '\u2705 Auto-saved to GitHub!');
                  return; // Success!
                }

                if ((pushRes.status === 409 || pushRes.status === 422) && attempt < maxRetries) {
                  // SHA mismatch - invalidate cache and retry with fresh SHA
                  lastKnownShaRef.current = null;
                  console.log('Auto-save: SHA mismatch, retrying (' + (attempt + 1) + '/' + maxRetries + ')...');
                  // Small delay before retry
                  await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                  continue;
                }

                throw new Error(result.message || 'HTTP ' + pushRes.status);
              } catch (err) {
                if (attempt === maxRetries) {
                  throw err;
                }
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
              }
            }
          };

          pushWithRetry()
            .catch((err) => {
              console.error('Auto-save to GitHub failed:', err);
              setAutoSaveStatus('error');
              setAutoSaveMessage(lang === 'zh'
                ? '\u26a0\ufe0f GitHub 同步失败: ' + err.message
                : '\u26a0\ufe0f GitHub sync failed: ' + err.message);
            })
            .finally(() => {
              isPushingRef.current = false;
              setTimeout(() => {
                setAutoSaveStatus('');
                setAutoSaveMessage('');
              }, 6000);
            });
        };

        doGithubPush();
      }, 1500);
    }
  };

  const triggerAdminSuccess = (msg) => {
    setAdminSuccessMessage(msg);
    setTimeout(() => {
      setAdminSuccessMessage('');
    }, 4000);
  };

  // Carousel auto-play
  useEffect(() => {
    if (activeTab !== 'home') return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % data.carousel.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [data.carousel.length, activeTab]);

  // URL-based admin access detection
  useEffect(() => {
    const openAdminFromUrl = () => {
      const hash = window.location.hash.replace(/\/+$/, '').trim().toLowerCase();
      const pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const adminQuery = searchParams.has('admin') || searchParams.get('page') === 'admin';

      if (
        hash === '#/admin' ||
        hash === '#admin' ||
        pathname.endsWith('/admin') ||
        adminQuery
      ) {
        setActiveTab('admin');
        setMobileMenuOpen(false);
        window.scrollTo(0, 0);
      }
    };

    openAdminFromUrl();
    window.addEventListener('hashchange', openAdminFromUrl);
    window.addEventListener('popstate', openAdminFromUrl);

    return () => {
      window.removeEventListener('hashchange', openAdminFromUrl);
      window.removeEventListener('popstate', openAdminFromUrl);
    };
  }, []);

  // Translate helper
  const t = (obj, key) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    // Handle bilingual objects
    if (obj[lang]) return obj[lang];
    if (obj['zh']) return obj['zh'];
    if (obj['en']) return obj['en'];
    return '';
  };

  const getGoogleMapsEmbedUrl = (church) => {
    const rawUrl = (church?.googleMapsEmbedUrl || '').trim();
    // Some older/default demo embed URLs point at incomplete placeholder coordinates
    // and can render as an empty map. Fall back to a reliable query-based embed.
    const isPlaceholderEmbed = /!1d3966|!1d3967|!2d100\.4!3d5\.3/.test(rawUrl);
    if (rawUrl && !isPlaceholderEmbed) return rawUrl;

    const query = t(church?.address) || t(church?.name) || data.settings.contactAddress;
    return query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : '';
  };

  // Global YouTube embed helper - used by Sermons and Services & Worships
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const match = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : '';
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    // Client-side minimum length check
    if (adminPasswordInput.length < 8) {
      setAdminLoginError(
        lang === 'zh'
          ? '密码至少需要 8 位字符'
          : 'Password must be at least 8 characters'
      );
      return;
    }

    try {
      const res = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Critical: sends HttpOnly cookie
        body: JSON.stringify({ password: adminPasswordInput })
      });
      const result = await res.json();
      
      if (result.ok) {
        setIsAdminLoggedIn(true);
        setAdminLoginError('');
        setAdminPasswordInput('');
        // Load GitHub settings from Cloudflare KV after successful login
        loadGithubSettingsFromCloud();
      } else {
        setAdminLoginError(result.error || (lang === 'zh' ? '登录失败' : 'Login failed'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setAdminLoginError(lang === 'zh' ? '网络错误，请重试' : 'Network error, please try again');
    }
  };

  // Helper function to switch tabs and handle URL hashes smoothly
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (tabId === 'admin') {
      if (window.location.hash !== '#/admin' && window.location.hash !== '#admin' && !window.location.pathname.endsWith('/admin')) {
        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', '#/admin');
        } else {
          window.location.hash = '#/admin';
        }
      }
    } else {
      if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
        try {
          if (window.history && window.history.pushState) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.hash = '';
            window.history.pushState({}, '', cleanUrl.pathname + cleanUrl.search);
          } else {
            window.location.hash = '';
          }
        } catch (e) {
          window.location.hash = '';
        }
      }
    }
    window.scrollTo(0, 0);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(AUTH_ENDPOINT, {
        method: 'DELETE', 
        credentials: 'include' 
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAdminLoggedIn(false);
    setActiveTab('home');
    setBackupAccessGranted(false);
    setBackupReauthOpen(false);
    setBackupPasswordInput('');
    setBackupLoginError('');

    // Clear /admin and #/admin from URL back to standard site URL
    try {
      if (window.history && window.history.pushState) {
        let cleanPath = window.location.pathname;
        if (cleanPath.endsWith('/admin') || cleanPath.endsWith('/admin/')) {
          cleanPath = cleanPath.replace(/\/admin\/?$/, '');
          if (!cleanPath) cleanPath = '/';
        }
        const cleanUrl = new URL(window.location.href);
        cleanUrl.pathname = cleanPath;
        if (cleanUrl.hash === '#/admin' || cleanUrl.hash === '#admin') {
          cleanUrl.hash = '';
        }
        cleanUrl.searchParams.delete('admin');
        cleanUrl.searchParams.delete('page');
        window.history.pushState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } else {
        if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
          window.location.hash = '';
        }
      }
    } catch (e) {
      console.error('Error clearing admin URL:', e);
    }
    window.scrollTo(0, 0);
  };

  const resetAdminEditors = () => {
    setEditingSlide(null);
    setEditingTimetable(null);
    setEditingEvent(null);
    setEditingMinistry(null);
    setEditingBulletin(null);
    setEditingCellGroup(null);
    setEditingLeader(null);
    setEditingSermon(null);
    setEditingService(null);
    setEditingOfferingMethod(null);
    setEditingGuideSection(null);
  };

  const requestBackupAccess = () => {
    resetAdminEditors();
    setBackupAccessGranted(false);
    setBackupPasswordInput('');
    setBackupLoginError('');
    setBackupReauthOpen(true);
  };

  const handleBackupReauth = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: backupPasswordInput })
      });
      const result = await res.json();

      if (result.ok) {
        setBackupAccessGranted(true);
        setBackupReauthOpen(false);
        setBackupLoginError('');
        setBackupPasswordInput('');
        setAdminActiveSection('backup');
      } else {
        setBackupLoginError(result.error || (lang === 'zh' ? '密码不正确，请重新验证' : 'Incorrect password, please verify again'));
      }
    } catch (err) {
      console.error('Backup re-auth error:', err);
      setBackupLoginError(lang === 'zh' ? '网络错误，请重试' : 'Network error, please try again');
    }
  };

  // 1. Settings Update
  const updateSetting = (key, subKey, value) => {
    const updated = { ...data };
    if (subKey) {
      updated.settings[key][subKey] = value;
    } else {
      updated.settings[key] = value;
    }
    saveAllData(updated);
  };

  // Header logo is stored with the rest of the site settings. Images are resized
  // before saving so LocalStorage/backups/GitHub auto-save remain reasonably small.
  const handleHeaderLogoUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setLogoUploadError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError(lang === 'zh' ? '请选择图片文件（PNG、JPG、WebP 等）。' : 'Please choose an image file (PNG, JPG, WebP, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError(lang === 'zh' ? '图片不能超过 5MB。' : 'The image must be 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setLogoUploadError(lang === 'zh' ? '无法读取该图片，请重试。' : 'Could not read this image. Please try again.');
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => setLogoUploadError(lang === 'zh' ? '该文件不是有效的图片。' : 'This file is not a valid image.');
      image.onload = () => {
        const maxDimension = 512;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        // PNG preserves transparency, which is especially useful for church marks.
        const logoDataUrl = canvas.toDataURL('image/png');
        if (logoDataUrl.length > 900 * 1024) {
          setLogoUploadError(lang === 'zh' ? '图片压缩后仍然太大，请使用较简单或较小的图片。' : 'The compressed image is still too large. Please use a smaller or simpler image.');
          return;
        }
        updateSetting('headerLogo', null, logoDataUrl);
        triggerAdminSuccess(lang === 'zh' ? '教会标志已上传并显示在顶部菜单。' : 'Church logo uploaded and shown in the header.');
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // 2. Carousel Actions
  const handleSaveSlide = (slide) => {
    const updated = { ...data };
    if (slide.id === 'new') {
      const newId = Math.max(...updated.carousel.map(c => c.id), 0) + 1;
      updated.carousel.push({ ...slide, id: newId });
    } else {
      updated.carousel = updated.carousel.map(c => c.id === slide.id ? slide : c);
    }
    saveAllData(updated);
    setEditingSlide(null);
  };

  const handleDeleteSlide = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除这张幻灯片吗？' : 'Are you sure you want to delete this slide?')) {
      const updated = { ...data };
      updated.carousel = updated.carousel.filter(c => c.id !== id);
      saveAllData(updated);
      if (currentSlide >= updated.carousel.length) {
        setCurrentSlide(0);
      }
    }
  };

  // Generic reorder helper: move array items up/down without delete+re-add
  // Supports top-level keys (e.g. 'timetable') and nested paths (e.g. 'offerings.methods')
  const handleMoveItem = (path, index, direction) => {
    const updated = { ...data };
    const keys = path.split('.');
    let parent = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      parent[keys[i]] = { ...parent[keys[i]] };
      parent = parent[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const arr = [...(parent[lastKey] || [])];
    if (direction === 'up' && index > 0) {
      [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    } else if (direction === 'down' && index < arr.length - 1) {
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    } else {
      return;
    }
    parent[lastKey] = arr;
    saveAllData(updated);
  };

  const handleMoveSlide = (index, direction) => handleMoveItem('carousel', index, direction);

  // 3. Timetable Actions
  const handleSaveTimetable = (item) => {
    const updated = { ...data };
    if (item.id === 'new') {
      const newId = Math.max(...updated.timetable.map(t => t.id), 0) + 1;
      updated.timetable.push({ ...item, id: newId });
    } else {
      updated.timetable = updated.timetable.map(t => t.id === item.id ? item : t);
    }
    saveAllData(updated);
    setEditingTimetable(null);
  };

  const handleDeleteTimetable = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此聚会时间吗？' : 'Are you sure you want to delete this service schedule?')) {
      const updated = { ...data };
      updated.timetable = updated.timetable.filter(t => t.id !== id);
      saveAllData(updated);
    }
  };

  // 4. Ministry Actions
  const handleSaveMinistry = (min) => {
    const updated = { ...data };
    if (min.id === 'new') {
      const newId = Math.max(...updated.ministries.map(m => m.id), 0) + 1;
      updated.ministries.push({ ...min, id: newId });
    } else {
      updated.ministries = updated.ministries.map(m => m.id === min.id ? min : m);
    }
    saveAllData(updated);
    setEditingMinistry(null);
  };

  const handleDeleteMinistry = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此项事工吗？' : 'Are you sure you want to delete this ministry?')) {
      const updated = { ...data };
      updated.ministries = updated.ministries.filter(m => m.id !== id);
      saveAllData(updated);
    }
  };

  // 5. Event Actions
  const handleSaveEvent = (evt) => {
    const updated = { ...data };
    if (evt.id === 'new') {
      const newId = Math.max(...updated.events.map(e => e.id), 0) + 1;
      updated.events.push({ ...evt, id: newId });
    } else {
      updated.events = updated.events.map(e => e.id === evt.id ? evt : e);
    }
    saveAllData(updated);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此活动吗？' : 'Are you sure you want to delete this event?')) {
      const updated = { ...data };
      updated.events = updated.events.filter(e => e.id !== id);
      saveAllData(updated);
    }
  };

    // 7. Bulletin Actions
  const handleSaveBulletin = (item) => {
    const updated = { ...data };
    if (!updated.bulletins) updated.bulletins = [];
    if (item.id === 'new') {
      const newId = Math.max(...updated.bulletins.map(b => b.id), 0) + 1;
      updated.bulletins.push({ ...item, id: newId });
    } else {
      updated.bulletins = updated.bulletins.map(b => b.id === item.id ? item : b);
    }
    saveAllData(updated);
    setEditingBulletin(null);
  };

  const handleDeleteBulletin = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此周报吗？' : 'Are you sure you want to delete this bulletin?')) {
      const updated = { ...data };
      updated.bulletins = updated.bulletins.filter(b => b.id !== id);
      saveAllData(updated);
    }
  };

  // 8. Cell Group Actions
  const handleSaveCellGroup = (item) => {
    const updated = { ...data };
    if (!updated.cellGroups) updated.cellGroups = [];
    if (item.id === 'new') {
      const newId = Math.max(...updated.cellGroups.map(c => c.id), 0) + 1;
      updated.cellGroups.push({ ...item, id: newId });
    } else {
      updated.cellGroups = updated.cellGroups.map(c => c.id === item.id ? item : c);
    }
    saveAllData(updated);
    setEditingCellGroup(null);
  };

  const handleDeleteCellGroup = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此小组吗？' : 'Are you sure you want to delete this cell group?')) {
      const updated = { ...data };
      updated.cellGroups = updated.cellGroups.filter(c => c.id !== id);
      saveAllData(updated);
    }
  };

  // 9. Leadership/Pastor Actions
  const handleSaveLeader = (item) => {
    const updated = { ...data };
    if (!updated.leadership) updated.leadership = [];
    if (item.id === 'new') {
      const newId = Math.max(...updated.leadership.map(l => l.id), 0) + 1;
      updated.leadership.push({ ...item, id: newId });
    } else {
      updated.leadership = updated.leadership.map(l => l.id === item.id ? item : l);
    }
    saveAllData(updated);
    setEditingLeader(null);
  };

  const handleDeleteLeader = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此牧者/同工吗？' : 'Are you sure you want to delete this leader?')) {
      const updated = { ...data };
      updated.leadership = updated.leadership.filter(l => l.id !== id);
      saveAllData(updated);
    }
  };

  // 9.5 Sermon Actions
  const handleSaveSermon = (item) => {
    const updated = { ...data };
    if (!updated.sermons) updated.sermons = [];
    if (item.id === 'new') {
      const newId = Math.max(...updated.sermons.map(s => s.id), 0) + 1;
      updated.sermons.push({ ...item, id: newId });
    } else {
      updated.sermons = updated.sermons.map(s => s.id === item.id ? item : s);
    }
    saveAllData(updated);
    setEditingSermon(null);
  };

  const handleDeleteSermon = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此讲道吗？' : 'Are you sure you want to delete this sermon?')) {
      const updated = { ...data };
      updated.sermons = updated.sermons.filter(s => s.id !== id);
      saveAllData(updated);
    }
  };

  // 9.7 Service Library Actions
  const handleSaveService = (item) => {
    const updated = { ...data };
    if (!updated.services) updated.services = [];
    if (item.id === 'new') {
      const newId = Math.max(...updated.services.map(s => s.id), 0) + 1;
      updated.services.push({ ...item, id: newId });
    } else {
      updated.services = updated.services.map(s => s.id === item.id ? item : s);
    }
    saveAllData(updated);
    setEditingService(null);
  };

  const handleDeleteService = (id) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此崇拜录影吗？' : 'Are you sure you want to delete this service recording?')) {
      const updated = { ...data };
      updated.services = updated.services.filter(s => s.id !== id);
      saveAllData(updated);
    }
  };

  // 9.8 Page Visibility Actions
  const togglePageVisibility = (pageKey) => {
    const updated = { ...data };
    if (!updated.pageVisibility) updated.pageVisibility = {};
    updated.pageVisibility[pageKey] = !updated.pageVisibility[pageKey];
    saveAllData(updated);
  };

    // 10. Update Offerings
  const updateOfferings = (key, value) => {
    const updated = { ...data };
    if (!updated.offerings) updated.offerings = {};
    updated.offerings[key] = value;
    saveAllData(updated);
  };

  const handleSaveOfferingMethod = (method, index) => {
    const updated = { ...data };
    if (!updated.offerings) updated.offerings = {};
    if (!updated.offerings.methods) updated.offerings.methods = [];
    
    if (index !== undefined && index !== null && index >= 0) {
      updated.offerings.methods[index] = { ...method };
    } else {
      const newId = Math.max(...updated.offerings.methods.map(m => m.id || 0), 0) + 1;
      updated.offerings.methods.push({ ...method, id: newId });
    }
    saveAllData(updated);
    setEditingOfferingMethod(null);
  };

  const handleDeleteOfferingMethod = (index) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此奉献方式吗？' : 'Are you sure you want to delete this giving method?')) {
      const updated = { ...data };
      if (!updated.offerings) updated.offerings = {};
      updated.offerings.methods = [...(updated.offerings.methods || [])];
      updated.offerings.methods.splice(index, 1);
      saveAllData(updated);
      setEditingOfferingMethod(null);
    }
  };

  // 11. Update Maps
  // 12. Update New Friend Guide
  const updateNewFriendGuide = (key, value) => {
    const updated = { ...data };
    if (!updated.newFriendGuide) updated.newFriendGuide = {};
    updated.newFriendGuide[key] = value;
    saveAllData(updated);
  };

  const handleSaveGuideSection = (section, index) => {
    const updated = { ...data };
    if (!updated.newFriendGuide) updated.newFriendGuide = {};
    if (!updated.newFriendGuide.sections) updated.newFriendGuide.sections = [];
    // Strip temporary index field before saving
    const { index: _idx, ...cleanSection } = section;
    if (index !== undefined && index >= 0) {
      // Preserve original id if editing existing
      const existingId = updated.newFriendGuide.sections[index]?.id || cleanSection.id;
      updated.newFriendGuide.sections[index] = { ...cleanSection, id: existingId };
    } else {
      const newId = Math.max(...(updated.newFriendGuide.sections.map(s => s.id) || [0]), 0) + 1;
      updated.newFriendGuide.sections.push({ ...cleanSection, id: newId });
    }
    saveAllData(updated);
  };

  const handleDeleteGuideSection = (index) => {
    const updated = { ...data };
    if (!updated.newFriendGuide || !updated.newFriendGuide.sections) return;
    updated.newFriendGuide.sections.splice(index, 1);
    saveAllData(updated);
  };

  // 6. Backup Actions
  const handleExportData = () => {
    const jsonStr = JSON.stringify(stripSensitiveData(data), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bmbcc-church-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.settings || !parsed.carousel || !parsed.timetable || !parsed.ministries || !parsed.events) {
        throw new Error(lang === 'zh' ? 'JSON数据结构不完整' : 'Incomplete JSON data structure');
      }
      saveAllData(parsed);
      setImportJsonText('');
      setImportError('');
      triggerAdminSuccess("网站数据成功导入！Web data imported successfully!");
    } catch (err) {
      setImportError(lang === 'zh' ? `导入失败: ${err.message}` : `Import failed: ${err.message}`);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm(lang === 'zh' ? '确定要重置所有网站内容为出厂默认设置吗？您当前的所有修改都将被清空！' : 'Are you sure you want to reset all website content to factory defaults? All your current edits will be cleared!')) {
      saveAllData(initialData);
      triggerAdminSuccess("重置成功！Reset successfully!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ fontFamily: 'var(--site-font-family)' }}>
      
      {/* ADMIN SESSION ACTIVE TOP BANNER - Appears when logged in as admin but viewing live site */}
      {isAdminLoggedIn && activeTab !== 'admin' && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm z-50 shrink-0 sticky top-0">
          <div className="flex items-center gap-2">
            <Shield size={14} className="animate-pulse text-amber-100 shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-none">
              {lang === 'zh' ? '管理员已登录（正预览公开网站）' : 'Admin Session Active (Previewing Live Site)'}
            </span>
          </div>
          <button
            onClick={() => switchTab('admin')}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs"
          >
            <span>{lang === 'zh' ? '返回后台控制台 »' : 'Return to Admin Console »'}</span>
          </button>
        </div>
      )}

      {/* 1. TOP INFORMATION HEADER */}
      <header className="bg-gray-900 text-gray-300 text-xs py-2 px-4 sm:px-6 md:px-8 border-b border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone size={13} className="text-primary" />
              <span>{data.settings.contactPhone}</span>
            </span>
            <span className="flex items-center gap-1">
              <Mail size={13} className="text-primary" />
              <span>{data.settings.contactEmail}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-center sm:text-right">
              <MapPin size={13} className="text-primary shrink-0" />
              <span className="truncate max-w-[280px] md:max-w-md">{data.settings.contactAddress}</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. NAVIGATION BAR */}
      <nav className="bg-white sticky top-0 z-40 shadow-sm transition-all border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => switchTab('home')}>
                {data.settings.headerLogo ? (
                  <img
                    src={data.settings.headerLogo}
                    alt={`${t(data.settings.churchName)} logo`}
                    className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-white p-1 shadow-sm"
                  />
                ) : (
                  <div className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl shadow-md shadow-primary/20 transition-all">
                    {/* Default cross shown until a logo is uploaded in Admin Settings. */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m-6-8h12" />
                    </svg>
                  </div>
                )}
                <div>
                  <span className="font-bold text-lg md:text-xl text-gray-900 block leading-tight tracking-wide font-sans">
                    {t(data.settings.churchName)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                    {data.settings.churchAbbreviation} • {t(data.settings.churchTagline)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links - Grouped */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {(() => {
                const vis = data.pageVisibility || {};
                const navGroups = [
                  { id: 'home', label: lang === 'zh' ? '首页' : 'Home', standalone: true },
                  { id: 'about', label: lang === 'zh' ? '关于我们' : 'About Us', standalone: true },
                  { 
                    id: 'ministry', 
                    label: lang === 'zh' ? '事工' : 'Ministry', 
                    items: [
                      vis.ministries !== false && { id: 'ministries', label: lang === 'zh' ? '主要事工' : 'Ministries' },
                      vis.cellgroups !== false && { id: 'cellgroups', label: lang === 'zh' ? '小组' : 'Cell Groups' },
                      vis.offerings !== false && { id: 'offerings', label: lang === 'zh' ? '奉献' : 'Offerings' }
                    ].filter(Boolean)
                  },
                  { 
                    id: 'gatherings', 
                    label: lang === 'zh' ? '聚会' : 'Gatherings', 
                    items: [
                      vis.timetable !== false && { id: 'timetable', label: lang === 'zh' ? '聚会时间' : 'Timetable' },
                      vis.events !== false && { id: 'events', label: lang === 'zh' ? '特别活动' : 'Events' }
                    ].filter(Boolean)
                  },
                  { 
                    id: 'resources', 
                    label: lang === 'zh' ? '资源' : 'Resources', 
                    items: [
                      vis.bulletins !== false && { id: 'bulletins', label: lang === 'zh' ? '周报与讲道' : 'Bulletins & Sermons' },
                      vis.services !== false && { id: 'services', label: lang === 'zh' ? '崇拜与敬拜' : 'Services & Worships' },
                      vis.newfriend !== false && { id: 'newfriend', label: lang === 'zh' ? '新朋友指南' : 'New Friend Guide' }
                    ].filter(Boolean)
                  },
                  vis.maps !== false && { id: 'maps', label: lang === 'zh' ? '地图' : 'Maps', standalone: true }
                ].filter(g => g && (g.standalone || (g.items && g.items.length > 0)));

                return navGroups.map((group) => {
                  if (group.standalone) {
                    return (
                      <button
                        key={group.id}
                        onClick={() => switchTab(group.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === group.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {group.label}
                      </button>
                    );
                  }

                  const isActive = group.items.some(item => item.id === activeTab);
                  return (
                    <div key={group.id} className="relative group/nav">
                      <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {group.label}
                        <ChevronDown size={14} className="transition-transform group-hover/nav:rotate-180" />
                      </button>
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all z-50">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => switchTab(item.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-all first:rounded-t-lg last:rounded-b-lg ${
                              activeTab === item.id
                                ? 'bg-primary/5 text-primary font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}

              <div className="h-5 w-[1px] bg-gray-200 mx-2"></div>

              {/* Language Switch Button */}
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1.5 transition-all text-sm"
                title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                <Languages size={17} />
                <span className="font-medium text-xs uppercase tracking-wider">{lang === 'zh' ? 'EN' : '中文'}</span>
              </button>

              {/* Admin Mode Indicator / Return Button */}
              {activeTab === 'admin' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 shadow-xs shrink-0 whitespace-nowrap">
                  <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Shield size={13} />
                  </div>
                  <div className="flex flex-col leading-none shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {lang === 'zh' ? '后台管理' : 'Admin'}
                    </span>
                    <span className="text-[9px] font-medium text-amber-700/90 whitespace-nowrap">
                      {isAdminLoggedIn ? (lang === 'zh' ? '已登录' : 'Managing') : (lang === 'zh' ? '未登录' : 'Guest')}
                    </span>
                  </div>
                  {isAdminLoggedIn && (
                    <button
                      onClick={handleAdminLogout}
                      className="ml-0.5 p-1 rounded-md bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all shrink-0"
                      title={lang === 'zh' ? '退出登录' : 'Logout'}
                    >
                      <LogOut size={11} />
                    </button>
                  )}
                </div>
              ) : (
                (data.settings.showLoginButton || isAdminLoggedIn) && (
                  <button
                    onClick={() => switchTab('admin')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isAdminLoggedIn
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                        : 'border border-gray-200 text-gray-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                    }`}
                    title={lang === 'zh' ? '管理员后台' : 'Admin Panel'}
                  >
                    <Shield size={14} className="shrink-0" />
                    <span className="uppercase tracking-wider shrink-0 whitespace-nowrap">
                      {isAdminLoggedIn
                        ? (lang === 'zh' ? '控制台' : 'Admin Console')
                        : (lang === 'zh' ? '登录' : 'Login')}
                    </span>
                  </button>
                )
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              {(activeTab === 'admin' || isAdminLoggedIn) && (
                <button
                  onClick={() => switchTab('admin')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase shrink-0 whitespace-nowrap"
                >
                  <Shield size={12} className="text-amber-600 shrink-0" />
                  <span>{lang === 'zh' ? '控制台' : 'Admin'}</span>
                </button>
              )}
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 flex items-center gap-1 transition-all"
              >
                <Languages size={16} />
                <span className="text-[10px] font-bold uppercase">{lang === 'zh' ? 'EN' : '中'}</span>
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state. */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-150 animate-fade-in-down shadow-inner">
            <div className="px-4 pt-2 pb-6 space-y-1">
               {(() => {
                const vis = data.pageVisibility || {};
                const allTabs = [
                  { id: 'home', label: lang === 'zh' ? '首页' : 'Home' },
                  { id: 'about', label: lang === 'zh' ? '关于我们' : 'About Us' },
                  { id: '__group_ministry__', label: lang === 'zh' ? '▸ 事工 / Ministry' : '▸ Ministry', group: true, disabled: true },
                  vis.ministries !== false && { id: 'ministries', label: lang === 'zh' ? '  主要事工' : '  Ministries', sub: true },
                  vis.cellgroups !== false && { id: 'cellgroups', label: lang === 'zh' ? '  小组' : '  Cell Groups', sub: true },
                  vis.offerings !== false && { id: 'offerings', label: lang === 'zh' ? '  奉献' : '  Offerings', sub: true },
                  { id: '__group_gatherings__', label: lang === 'zh' ? '▸ 聚会 / Gatherings' : '▸ Gatherings', group: true, disabled: true },
                  vis.timetable !== false && { id: 'timetable', label: lang === 'zh' ? '  聚会时间' : '  Timetable', sub: true },
                  vis.events !== false && { id: 'events', label: lang === 'zh' ? '  特别活动' : '  Events', sub: true },
                  { id: '__group_resources__', label: lang === 'zh' ? '▸ 资源 / Resources' : '▸ Resources', group: true, disabled: true },
                  vis.bulletins !== false && { id: 'bulletins', label: lang === 'zh' ? '  周报与讲道' : '  Bulletins & Sermons', sub: true },
                  vis.services !== false && { id: 'services', label: lang === 'zh' ? '  崇拜与敬拜' : '  Services & Worships', sub: true },
                  vis.newfriend !== false && { id: 'newfriend', label: lang === 'zh' ? '  新朋友指南' : '  New Friend Guide', sub: true },
                  vis.maps !== false && { id: 'maps', label: lang === 'zh' ? '地图' : 'Maps' },
                  (data.settings.showLoginButton || isAdminLoggedIn || activeTab === 'admin') && { id: 'admin', label: lang === 'zh' ? (isAdminLoggedIn ? '管理员控制台' : '后台管理登录') : (isAdminLoggedIn ? 'Admin Console' : 'Admin Login'), icon: Shield }
                ].filter(Boolean);

                return allTabs.map((tab) => (
                  tab.disabled ? (
                    <div key={tab.id} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">
                      <span>{tab.label}</span>
                    </div>
                  ) : (
                    <button
                      key={tab.id}
                      onClick={() => switchTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium flex items-center gap-2 ${
                        tab.sub ? 'pl-8' : ''
                      } ${
                        activeTab === tab.id
                          ? 'bg-primary/10 text-primary font-bold'
                          : tab.id === 'admin'
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tab.id === 'admin' && <Shield size={18} />}
                      <span>{tab.label}</span>
                    </button>
                  )
                ));
              })()}
            </div>
          </div>
        )}
      </nav>

      {/* 3. APP MAIN VIEWPORT */}
      <main className="flex-grow">
        
        {/* ==================== PAGE: HOME ==================== */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* HERO CAROUSEL BANNER */}
            <div className="relative h-[520px] sm:h-[580px] md:h-[650px] bg-gray-950 overflow-hidden group">
              {data.carousel.length > 0 ? (
                <>
                  {/* Current Slide Image & Subtle Bottom Gradient (Keeps top 75% completely clear) */}
                  <div className="absolute inset-0 transition-all duration-1000 ease-out transform scale-100">
                    <img 
                      src={data.carousel[currentSlide].image} 
                      alt="Banner Image" 
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-black/50 via-35% to-transparent" />
                  </div>

                  {/* Floating Bottom Strip Card (Sits at the bottom just above indicator dots) */}
                  <div className="absolute bottom-11 sm:bottom-12 md:bottom-14 inset-x-3 sm:inset-x-6 md:inset-x-12 z-10 flex justify-center pointer-events-none">
                    <div className="w-full max-w-6xl p-4 sm:p-6 md:p-7 rounded-2xl md:rounded-3xl bg-black/60 sm:bg-black/55 backdrop-blur-md border border-white/15 shadow-2xl transition-all pointer-events-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
                      
                      {/* Left: Title & Subtitle */}
                      <div className="flex-1 space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/30 text-white border border-primary/40 text-[11px] sm:text-xs uppercase tracking-wider font-extrabold shadow-sm">
                            <Sparkles size={13} className="text-amber-300 shrink-0" />
                            {lang === 'zh' ? '欢迎莅临大山脚浸信教会' : 'Welcome to BMBCC'}
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                          {t(data.carousel[currentSlide].title)}
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base text-white/90 font-medium max-w-3xl leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] line-clamp-2">
                          {t(data.carousel[currentSlide].subtitle)}
                        </p>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap sm:flex-nowrap shrink-0 items-center gap-2.5 sm:gap-3 w-full md:w-auto pt-1 md:pt-0">
                        <button 
                          onClick={() => setActiveTab('timetable')}
                          className="flex-1 md:flex-initial px-5 py-2.5 sm:py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 text-xs sm:text-sm md:text-base whitespace-nowrap"
                        >
                          <Clock size={16} className="shrink-0" />
                          <span>{lang === 'zh' ? '聚会时间表' : 'Join Our Services'}</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('about')}
                          className="flex-1 md:flex-initial px-5 py-2.5 sm:py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold border border-white/30 backdrop-blur-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 shadow-md text-xs sm:text-sm md:text-base whitespace-nowrap"
                        >
                          <Info size={16} className="shrink-0" />
                          <span>{lang === 'zh' ? '关于我们' : 'Learn More'}</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Manual Controls */}
                  <button 
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + data.carousel.length) % data.carousel.length)}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg border border-white/10"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button 
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % data.carousel.length)}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg border border-white/10"
                    aria-label="Next Slide"
                  >
                    <ChevronRight size={22} />
                  </button>

                  {/* Indicator Dots */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {data.carousel.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        aria-label={`Slide ${idx + 1}`}
                        className={`h-2.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-primary shadow-sm' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white p-4">
                  <div className="text-center">
                    <p className="text-xl">No Slides available. Add one in Admin panel.</p>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK WELCOME STRIP */}
            <div className="bg-primary-light/50 py-10 px-4 text-center border-b border-primary/10">
              <div className="max-w-4xl mx-auto space-y-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                  {t(data.settings.slogan)}
                </h2>
                <p className="text-base text-gray-700 max-w-2xl mx-auto font-light">
                  {t(data.settings.description)}
                </p>
              </div>
            </div>

            {/* CHURCH VISION CARD & SCRIPTURE (MINIC THE DESIGN) */}
            <section className="py-16 px-4 bg-white">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  
                  {/* Left Column: Vision Header & Text */}
                  <div className="md:col-span-7 p-8 md:p-12 space-y-6">
                    <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                      {t(data.settings.yearlyVisionLabel) || (lang === 'zh' ? '年度主题与异象' : 'Yearly Vision')}
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                      {t(data.settings.yearlyVisionTitle) || (lang === 'zh' ? '走入社区，宣扬主爱' : 'Go into the Community, Proclaim Lord\'s Love')}
                    </h3>
                    
                    <div className="border-l-4 border-primary pl-4 text-lg font-medium text-gray-800 whitespace-pre-line leading-relaxed italic bg-white/60 p-4 rounded-r-lg">
                      {t(data.settings.themeYear)}
                    </div>

                    <div className="space-y-3 text-gray-600 font-light leading-relaxed">
                      <p>
                        {t(data.settings.homeVisionPara1) || (lang === 'zh' 
                          ? '大山脚浸信教会深信神赐予我们的召命：走出教会的舒适圈，切切实实走入我们所在的百利镇社区，接触身边的邻舍。' 
                          : 'BMBCC firmly believes in the calling given by God: to step out of our comfort zones and walk directly into Taman Bukit Minyak community to touch our neighbors\' lives.')}
                      </p>
                      <p>
                        {t(data.settings.homeVisionPara2) || (lang === 'zh'
                          ? '我们透过‘爱邻社区关怀’、‘五饼二鱼’爱心便当等，用实际行动表明：主耶稣是爱他们的，也是在苦难和缺乏中的安慰与倚靠。'
                          : 'Through our "Neighborly Community Care" and "Five Loaves & Two Fishes" warm bento service, we demonstrate in deeds: the Lord Jesus loves them and is their solace and provider.')}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Soaring Eagle Image & Scripture Overlay */}
                  <div className="md:col-span-5 h-[320px] md:h-full min-h-[360px] relative">
                    <img 
                      src={data.settings.yearlyVisionImage || "https://images.unsplash.com/photo-1540979388789-6cee28a16838?auto=format&fit=crop&w=800&q=80"}
                      alt="Vision" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent md:bg-gradient-to-l md:from-black/90 md:via-black/40" />
                    <div className="absolute inset-0 flex flex-col justify-end p-8 text-white space-y-3">
                      <span className="text-primary font-bold tracking-widest text-xs uppercase">
                        {t(data.settings.yearlyVisionBadge) || (lang === 'zh' ? '展翅高飞 • 广传福音' : 'Soar High • Spread Gospel')}
                      </span>
                      <h4 className="text-lg font-bold italic leading-relaxed">
                        “{t(data.settings.yearlyVisionScripture) || (lang === 'zh' ? '神爱世人，甚至把他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。' : 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.')}”
                      </h4>
                      <span className="text-right text-xs text-gray-300 font-semibold block">
                        —— {t(data.settings.yearlyVisionRef) || (lang === 'zh' ? '约翰福音 3:16' : 'John 3:16')}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* MINISTRIES PREVIEW (主要事工) */}
            <section className="py-16 px-4 bg-gray-50 border-t border-b border-gray-100">
              <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
                  <span className="text-primary font-bold uppercase tracking-wider text-xs">
                    {lang === 'zh' ? '我们忠心实践的使命' : 'Active Outreach Ministries'}
                  </span>
                  <h2 className="text-3xl font-extrabold text-gray-900">
                    {lang === 'zh' ? '社区关怀主要事工' : 'Key Community Ministries'}
                  </h2>
                  <p className="text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                    {lang === 'zh' 
                      ? '大山脚浸信教会是走入社区的教会，对于社区关怀的事工有极大的托付与热忱。神满满的恩典浇灌并为我们在百利镇社区的事工大大地开路。哈利路亚！' 
                      : 'We are a missional church reaching deep into neighborhoods. God’s overflowing grace continues to open wide doors for our work here. Hallelujah!'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {data.ministries.slice(0, 3).map((min) => (
                    <div 
                      key={min.id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col group transform hover:-translate-y-1"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={min.image} 
                          alt={t(min.name)} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                        <div className="absolute bottom-4 left-4 text-white font-bold text-lg md:text-xl drop-shadow-sm">
                          {t(min.name)}
                        </div>
                      </div>
                      <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                        <p className="text-gray-600 text-sm font-light leading-relaxed line-clamp-4">
                          {t(min.description)}
                        </p>
                        <button 
                          onClick={() => { setActiveTab('ministries'); window.scrollTo(0, 0); }}
                          className="text-primary font-semibold text-xs flex items-center gap-1 hover:text-primary-dark transition-all self-start uppercase tracking-wider pt-2 border-t border-gray-50 w-full"
                        >
                          <span>{lang === 'zh' ? '阅读更多详情' : 'Read Full Details'}</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* UPCOMING EVENTS & ADDS */}
            {data.events.length > 0 && (
              <section className="py-16 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
                    <div>
                      <span className="text-primary font-bold uppercase tracking-wider text-xs">
                        {lang === 'zh' ? '近期动向与联合活动' : 'Calendar & Highlights'}
                      </span>
                      <h2 className="text-3xl font-extrabold text-gray-900 mt-1">
                        {lang === 'zh' ? '特别活动预告' : 'Upcoming Church Events'}
                      </h2>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('events'); window.scrollTo(0, 0); }}
                      className="px-5 py-2.5 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-all"
                    >
                      {lang === 'zh' ? '查看全部活动' : 'View All Events'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {data.events.slice(0, 2).map((evt) => (
                      <div 
                        key={evt.id} 
                        className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-150 flex flex-col md:flex-row hover:shadow-lg transition-all duration-300"
                      >
                        <div className="md:w-2/5 h-48 md:h-full min-h-[200px] relative shrink-0">
                          <img 
                            src={evt.image} 
                            alt={t(evt.title)} 
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-6 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold">
                              <Calendar size={11} />
                              <span>{evt.date}</span>
                            </span>
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">
                              {t(evt.title)}
                            </h3>
                            <p className="text-gray-600 text-xs font-light leading-relaxed line-clamp-3">
                              {t(evt.description)}
                            </p>
                          </div>
                          
                          <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-gray-400" />
                              <span>{evt.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">{t(evt.location)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CALL TO ACTION WELCOME */}
            <section className="bg-primary/90 text-white py-16 px-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-dark via-primary to-primary opacity-90" />
              <div className="relative max-w-4xl mx-auto space-y-6">
                <Heart size={44} className="mx-auto text-white fill-white/10 animate-bounce" />
                <h2 className="text-3xl md:text-4xl font-extrabold">
                  {t(data.settings.ctaTitle) || (lang === 'zh' ? '耶稣爱你，我们欢迎你！' : 'Jesus Loves You & We Welcome You!')}
                </h2>
                <p className="text-base md:text-lg text-white/95 max-w-xl mx-auto font-light leading-relaxed">
                  {t(data.settings.ctaDescription) || (lang === 'zh' 
                    ? '无论您是在寻找生命的意义、属灵的港湾，还是社区的陪伴，这里的大门始终为您敞开。让我们一起在主爱里生活，彼此扶持！' 
                    : 'Whether you seek the meaning of life, a spiritual home, or community fellowship, our doors are always open. Let\'s grow and support each other in His grace!')}
                </p>
                <div className="pt-2 flex justify-center gap-4">
                  <button 
                    onClick={() => { setActiveTab('timetable'); window.scrollTo(0, 0); }}
                    className="px-6 py-3 rounded-lg bg-white text-primary font-bold shadow-lg transition-all hover:bg-gray-100"
                  >
                    {lang === 'zh' ? '聚会时间表' : 'Service Timetable'}
                  </button>
                  <button 
                    onClick={() => { setActiveTab('about'); window.scrollTo(0, 0); }}
                    className="px-6 py-3 rounded-lg bg-primary-dark text-white font-bold border border-white/20 transition-all hover:bg-black/10"
                  >
                    {lang === 'zh' ? '联系牧者团队' : 'Contact Pastors'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== PAGE: ABOUT US ==================== */}
        {activeTab === 'about' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {t(data.settings.aboutBadge) || (lang === 'zh' ? '了解我们大山脚浸信教会' : 'Get to Know BMBCC')}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {t(data.settings.aboutTitle) || (lang === 'zh' ? '关于我们' : 'About Us')}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.settings.aboutIntro)}
              </p>
            </div>

            {/* Vision & Mission Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
              <div className="bg-white p-8 md:p-10 rounded-2xl border border-gray-150 shadow-sm space-y-4 relative overflow-hidden group hover:border-primary/20 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-2">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">
                  {lang === 'zh' ? '教会愿景 (Vision)' : 'Our Vision'}
                </h3>
                <p className="text-gray-700 font-light text-base md:text-lg leading-relaxed">
                  {t(data.settings.aboutVision)}
                </p>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-2xl border border-gray-150 shadow-sm space-y-4 relative overflow-hidden group hover:border-primary/20 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-2">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">
                  {lang === 'zh' ? '教会使命 (Mission)' : 'Our Mission'}
                </h3>
                <p className="text-gray-700 font-light text-base md:text-lg leading-relaxed">
                  {t(data.settings.aboutMission)}
                </p>
              </div>
            </div>

            {/* Leadership / Pastor Team */}
            <div className="space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-primary font-bold uppercase tracking-wider text-xs">
                  {t(data.settings.leadershipBadge) || (lang === 'zh' ? '属灵领袖与关怀同工' : 'Spiritual Guides & Shepherds')}
                </span>
                <h2 className="text-3xl font-extrabold text-gray-900">
                  {t(data.settings.leadershipTitle) || (lang === 'zh' ? '牧者与事工团队' : 'Leadership Team')}
                </h2>
                <p className="text-gray-600 text-sm font-light leading-relaxed">
                  {t(data.settings.leadershipIntro) || (lang === 'zh' 
                    ? '神选召并赐予我们的忠心仆人，倾尽爱心，牧养群羊，引领社区事工蓬勃发展。' 
                    : 'Servants called by God to shepherd the congregation and guide community ministries with love.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {data.leadership?.map((leader) => (
                  <div key={leader.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="relative h-72 w-full overflow-hidden bg-gray-100">
                      <img 
                        src={leader.image} 
                        alt={t(leader.name)} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <span className="bg-primary px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider block w-fit mb-1 shadow-sm">
                          {t(leader.role)}
                        </span>
                        <h4 className="text-xl font-bold">{t(leader.name)}</h4>
                      </div>
                    </div>
                    <div className="p-6 flex-grow space-y-3">
                      <p className="text-gray-600 text-sm font-light leading-relaxed">
                        {t(leader.bio)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== PAGE: MINISTRIES ==================== */}
        {activeTab === 'ministries' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {t(data.settings.ministriesBadge) || (lang === 'zh' ? '走入人群，服侍弱势' : 'Outreach & Community Service')}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {t(data.settings.ministriesTitle) || (lang === 'zh' ? '教会事工介绍' : 'Our Ministries')}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.settings.ministriesIntro) || (lang === 'zh' 
                  ? '大山脚浸信教会不仅专注于信徒身心灵的牧养，更带着沉甸甸的负担投身于百利镇周边社区。我们相信，爱需要行动来显明，福音是看得见的。' 
                  : 'BMBCC focuses on shepherding believers as well as reaching out to the surrounding communities. We believe love requires action and the gospel should be visible.')}
              </p>
            </div>

            {/* Full Ministry List with Alternate Layout */}
            <div className="space-y-16">
              {data.ministries.map((min, index) => (
                <div 
                  key={min.id}
                  className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-center bg-white p-6 md:p-8 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-all ${
                    index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div 
                    className="w-full lg:w-1/2 h-64 sm:h-80 md:h-96 relative overflow-hidden rounded-xl shrink-0 cursor-zoom-in"
                    onClick={() => setSelectedMinistry(min)}
                  >
                    <img 
                      src={min.image} 
                      alt={t(min.name)} 
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-all duration-700"
                    />
                  </div>
                  <div className="w-full lg:w-1/2 space-y-6">
                    <div className="inline-flex px-3 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                      {lang === 'zh' ? `事工 ${index + 1}` : `Ministry ${index + 1}`}
                    </div>
                    <h2 
                      className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setSelectedMinistry(min)}
                    >
                      {t(min.name)}
                    </h2>
                    <div className="w-16 h-1 bg-primary rounded" />
                    <p className="text-gray-700 text-sm md:text-base font-light leading-relaxed whitespace-pre-line line-clamp-6">
                      {t(min.description)}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-3">
                      <button 
                        onClick={() => setSelectedMinistry(min)}
                        className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <Info size={16} />
                        <span>{lang === 'zh' ? '查看详情' : 'View Details'}</span>
                      </button>
                      <button 
                        onClick={() => { setActiveTab('timetable'); window.scrollTo(0, 0); }}
                        className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-md shadow-primary/15"
                      >
                        <Clock size={16} />
                        <span>{lang === 'zh' ? '查看相关聚会时间' : 'View Timetable'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== PAGE: TIMETABLE ==================== */}
        {activeTab === 'timetable' && (() => {
          // Dynamic available days & languages from data
          const rawDays = data.timetable.map(item => t(item.day)).filter(Boolean);
          const uniqueDays = Array.from(new Set(rawDays));
          
          const rawLangs = data.timetable.map(item => t(item.language)).filter(Boolean);
          const uniqueLangs = Array.from(new Set(rawLangs));

          // Filter logic
          const filteredItems = data.timetable.filter(item => {
            const nameStr = t(item.name).toLowerCase();
            const dayStr = t(item.day).toLowerCase();
            const timeStr = String(item.time || '').toLowerCase();
            const locStr = t(item.location).toLowerCase();
            const langStr = t(item.language).toLowerCase();
            const q = timetableSearchQuery.toLowerCase().trim();

            const matchesSearch = !q || nameStr.includes(q) || dayStr.includes(q) || timeStr.includes(q) || locStr.includes(q) || langStr.includes(q);
            const matchesDay = timetableFilterDay === 'all' || t(item.day) === timetableFilterDay;
            const matchesLang = timetableFilterLang === 'all' || t(item.language) === timetableFilterLang;

            return matchesSearch && matchesDay && matchesLang;
          });

          // Group by Day for Timeline view
          const groupedByDay = filteredItems.reduce((acc, item) => {
            const dayName = t(item.day) || (lang === 'zh' ? '其他' : 'Other');
            if (!acc[dayName]) acc[dayName] = [];
            acc[dayName].push(item);
            return acc;
          }, {});

          const handleCopyInfo = (item) => {
            const text = `${t(item.name)} | ${t(item.day)} ${item.time} | ${t(item.location)} (${t(item.language)})`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text);
              setCopiedModalItem(true);
              setTimeout(() => setCopiedModalItem(false), 2000);
            }
          };

          return (
            <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
              {/* Header - standardized to match other pages */}
              <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                <span className="text-primary font-bold uppercase tracking-wider text-xs">
                  {t(data.settings.timetableBadge) || (lang === 'zh' ? '与我们一同朝见神与相聚' : 'Fellowship & Grow Together')}
                </span>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {t(data.settings.timetableTitle) || (lang === 'zh' ? '周聚会与崇拜时间表' : 'Weekly Services & Timetable')}
                </h1>
                <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                  {t(data.settings.timetableIntro) || (lang === 'zh' 
                    ? '我们诚挚地邀请您和您的家人参与我们的周聚会，共同在敬拜、祷告、真理和爱心团契里，经历生命的翻转与复兴。' 
                    : 'We warmly invite you and your family to join our weekly gatherings for worship, prayer, truth, and genuine community.')}
                </p>
              </div>

              {/* Filters & Control Toolbar */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4 mb-8">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={timetableSearchQuery}
                      onChange={(e) => setTimetableSearchQuery(e.target.value)}
                      placeholder={lang === 'zh' ? '搜索聚会名称、时间、地点或语言...' : 'Search service, location, language, or time...'}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-250 bg-gray-50/50 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
                    />
                    {timetableSearchQuery && (
                      <button 
                        onClick={() => setTimetableSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200/60"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start lg:self-auto border border-gray-200/60">
                    <button
                      onClick={() => setTimetableViewMode('cards')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        timetableViewMode === 'cards' 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                      title={lang === 'zh' ? '网格卡片视图' : 'Grid View'}
                    >
                      <LayoutGrid size={16} />
                      <span>{lang === 'zh' ? '卡片模式' : 'Grid'}</span>
                    </button>
                    <button
                      onClick={() => setTimetableViewMode('timeline')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        timetableViewMode === 'timeline' 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                      title={lang === 'zh' ? '按星期时间轴视图' : 'Day Timeline View'}
                    >
                      <CalendarDays size={16} />
                      <span>{lang === 'zh' ? '日程轴模式' : 'Timeline'}</span>
                    </button>
                    <button
                      onClick={() => setTimetableViewMode('table')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        timetableViewMode === 'table' 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                      title={lang === 'zh' ? '表格视图' : 'Table View'}
                    >
                      <ListFilter size={16} />
                      <span>{lang === 'zh' ? '列表表格' : 'Table'}</span>
                    </button>
                  </div>
                </div>

                {/* Day & Language Filter Badges */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  {/* Day Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                      <Filter size={12} />
                      {lang === 'zh' ? '按星期:' : 'Day:'}
                    </span>
                    <button
                      onClick={() => setTimetableFilterDay('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        timetableFilterDay === 'all'
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lang === 'zh' ? '全部日期' : 'All Days'}
                    </button>
                    {uniqueDays.map(dayName => (
                      <button
                        key={dayName}
                        onClick={() => setTimetableFilterDay(dayName)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          timetableFilterDay === dayName
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {dayName}
                      </button>
                    ))}
                  </div>

                  {/* Language Filter Pills */}
                  {uniqueLangs.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                        <Globe size={12} />
                        {lang === 'zh' ? '语言:' : 'Lang:'}
                      </span>
                      <button
                        onClick={() => setTimetableFilterLang('all')}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                          timetableFilterLang === 'all'
                            ? 'bg-primary/20 text-primary border border-primary/30 font-bold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang === 'zh' ? '全部语言' : 'All'}
                      </button>
                      {uniqueLangs.map(lName => (
                        <button
                          key={lName}
                          onClick={() => setTimetableFilterLang(lName)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                            timetableFilterLang === lName
                              ? 'bg-primary/20 text-primary border border-primary/30 font-bold'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {lName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Empty state if search or filter matches 0 items */}
              {filteredItems.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center gap-2 justify-center mx-auto border border-amber-200">
                    <CalendarCheck size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {lang === 'zh' ? '未找到相关聚会' : 'No Matching Gatherings Found'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {lang === 'zh' 
                      ? '您可以尝试清除搜索关键词或重置日期与语言筛选条件。' 
                      : 'Try clearing your search query or resetting the day and language filters.'}
                  </p>
                  <button
                    onClick={() => {
                      setTimetableSearchQuery('');
                      setTimetableFilterDay('all');
                      setTimetableFilterLang('all');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-all"
                  >
                    {lang === 'zh' ? '重置筛选条件' : 'Reset All Filters'}
                  </button>
                </div>
              )}

              {/* ================= VIEW MODE 1: GRID CARDS ================= */}
              {timetableViewMode === 'cards' && filteredItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => {
                    const style = getDayBadgeStyle(t(item.day));
                    const langBadgeStyle = getLangBadgeStyle(t(item.language));

                    return (
                      <div
                        key={item.id}
                        className="group bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Accent top gradient bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${style.gradient}`} />

                        <div className="p-6 space-y-5 flex-1">
                          {/* Badges row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs ${style.pill} border ${style.border} flex items-center gap-1.5`}>
                              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                              {t(item.day)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${langBadgeStyle}`}>
                              {t(item.language)}
                            </span>
                          </div>

                          {/* Meeting Title */}
                          <div>
                            <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-primary transition-colors leading-snug">
                              {t(item.name)}
                            </h3>
                          </div>

                          {/* Time Card */}
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                                {lang === 'zh' ? '聚会时间' : 'Gathering Time'}
                              </div>
                              <div className="text-sm font-bold text-gray-800">
                                {item.time}
                              </div>
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-start gap-2.5 text-xs text-gray-600 font-medium">
                            <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{t(item.location)}</span>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedTimetableModal(item)}
                            className="flex-1 py-2 px-3 rounded-xl bg-white border border-gray-250 hover:border-primary hover:text-primary text-gray-700 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <Info size={14} />
                            <span>{lang === 'zh' ? '查看详情与指南' : 'View Details'}</span>
                          </button>
                          
                          <button
                            onClick={() => handleCopyInfo(item)}
                            title={lang === 'zh' ? '复制时间与地点信息' : 'Copy gathering details'}
                            className="p-2 rounded-xl bg-white border border-gray-250 text-gray-500 hover:text-primary hover:border-primary transition-all shadow-2xs"
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================= VIEW MODE 2: TIMELINE / DAY SCHEDULE ================= */}
              {timetableViewMode === 'timeline' && filteredItems.length > 0 && (
                <div className="space-y-8">
                  {Object.entries(groupedByDay).map(([dayTitle, items]) => {
                    const style = getDayBadgeStyle(dayTitle);

                    return (
                      <div key={dayTitle} className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                        {/* Day Header */}
                        <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${style.gradient} text-white flex items-center justify-center font-bold shadow-md`}>
                              <CalendarCheck size={20} />
                            </div>
                            <div>
                              <h2 className="text-xl font-extrabold text-gray-900">{dayTitle}</h2>
                              <p className="text-xs text-gray-500">
                                {lang === 'zh' ? `共 ${items.length} 场崇拜 / 团契` : `${items.length} services/fellowships`}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style.pill} ${style.border}`}>
                            {dayTitle}
                          </span>
                        </div>

                        {/* Items Timeline list */}
                        <div className="relative pl-4 sm:pl-6 space-y-6 border-l-2 border-primary/20 ml-2 sm:ml-4">
                          {items.map((item) => (
                            <div key={item.id} className="relative group">
                              {/* Glowing node dot on vertical timeline */}
                              <div className="absolute -left-[25px] sm:-left-[33px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-xs group-hover:scale-125 transition-transform" />

                              <div className="bg-gray-50/80 hover:bg-primary/5 p-4 sm:p-5 rounded-2xl border border-gray-200/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-primary transition-colors">
                                      {t(item.name)}
                                    </h3>
                                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${getLangBadgeStyle(t(item.language))}`}>
                                      {t(item.language)}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600">
                                    <div className="flex items-center gap-1.5 font-bold text-gray-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                                      <Clock size={14} className="text-primary" />
                                      <span>{item.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={14} className="text-gray-400" />
                                      <span>{t(item.location)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                  <button
                                    onClick={() => setSelectedTimetableModal(item)}
                                    className="px-3.5 py-2 rounded-xl bg-white border border-gray-250 hover:border-primary hover:text-primary text-xs font-bold text-gray-700 shadow-2xs transition-all flex items-center gap-1.5"
                                  >
                                    <Info size={14} />
                                    <span>{lang === 'zh' ? '详情' : 'Details'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================= VIEW MODE 3: REFINED MODERN TABLE ================= */}
              {timetableViewMode === 'table' && filteredItems.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 bg-primary/5 border-b border-gray-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="text-primary shrink-0" size={22} />
                      <span className="text-base font-extrabold text-gray-900">
                        {lang === 'zh' ? '定期崇拜与各级团契时间总览' : 'Regular Weekly Services Overview'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {filteredItems.length} {lang === 'zh' ? '项结果' : 'Items'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/90 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="py-4 px-6">{lang === 'zh' ? '聚会名称' : 'Meeting / Service'}</th>
                          <th className="py-4 px-6">{lang === 'zh' ? '聚会时间' : 'Day & Time'}</th>
                          <th className="py-4 px-6">{lang === 'zh' ? '地点 / 平台' : 'Location / Format'}</th>
                          <th className="py-4 px-6">{lang === 'zh' ? '媒介语言' : 'Language'}</th>
                          <th className="py-4 px-6 text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {filteredItems.map((item) => {
                          const style = getDayBadgeStyle(t(item.day));
                          return (
                            <tr key={item.id} className="hover:bg-primary/5 transition-colors text-sm text-gray-700 group">
                              <td className="py-4.5 px-6 font-extrabold text-gray-900 group-hover:text-primary transition-colors">
                                {t(item.name)}
                              </td>
                              <td className="py-4.5 px-6">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs ${style.pill} border ${style.border} shrink-0`}>
                                    {t(item.day)}
                                  </span>
                                  <span className="font-bold text-gray-700">{item.time}</span>
                                </div>
                              </td>
                              <td className="py-4.5 px-6 text-gray-600 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={15} className="text-primary/70 shrink-0" />
                                  <span>{t(item.location)}</span>
                                </div>
                              </td>
                              <td className="py-4.5 px-6">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getLangBadgeStyle(t(item.language))}`}>
                                  {t(item.language)}
                                </span>
                              </td>
                              <td className="py-4.5 px-6 text-right">
                                <button
                                  onClick={() => setSelectedTimetableModal(item)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark hover:underline"
                                >
                                  <span>{lang === 'zh' ? '查看指南' : 'View Details'}</span>
                                  <ChevronRight size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Service Modal Dialog */}
              {selectedTimetableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 space-y-6 p-6 sm:p-8 relative">
                    {/* Close button */}
                    <button 
                      onClick={() => setSelectedTimetableModal(null)}
                      className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} />
                    </button>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDayBadgeStyle(t(selectedTimetableModal.day)).pill}`}>
                          {t(selectedTimetableModal.day)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getLangBadgeStyle(t(selectedTimetableModal.language))}`}>
                          {t(selectedTimetableModal.language)}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        {t(selectedTimetableModal.name)}
                      </h2>
                    </div>

                    <div className="space-y-3.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 text-sm">
                      <div className="flex items-center gap-3 text-gray-800">
                        <Clock className="text-primary shrink-0" size={18} />
                        <div>
                          <div className="text-[11px] font-bold text-gray-400 uppercase">{lang === 'zh' ? '时间' : 'Time'}</div>
                          <div className="font-bold">{selectedTimetableModal.time}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-gray-800 pt-2 border-t border-gray-200/60">
                        <MapPin className="text-primary shrink-0 mt-0.5" size={18} />
                        <div>
                          <div className="text-[11px] font-bold text-gray-400 uppercase">{lang === 'zh' ? '地点 / 会堂' : 'Location / Sanctuary'}</div>
                          <div className="font-bold">{t(selectedTimetableModal.location)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-gray-800 pt-2 border-t border-gray-200/60">
                        <Globe className="text-primary shrink-0" size={18} />
                        <div>
                          <div className="text-[11px] font-bold text-gray-400 uppercase">{lang === 'zh' ? '使用语言' : 'Language'}</div>
                          <div className="font-bold">{t(selectedTimetableModal.language)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions in Modal */}
                    <div className="space-y-2.5 pt-2">
                      <button
                        onClick={() => handleCopyInfo(selectedTimetableModal)}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          copiedModalItem 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'bg-primary text-white hover:bg-primary-dark shadow-md'
                        }`}
                      >
                        {copiedModalItem ? (
                          <>
                            <CheckCircle size={16} />
                            <span>{lang === 'zh' ? '已复制聚会详情到剪贴板！' : 'Copied Details to Clipboard!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>{lang === 'zh' ? '复制聚会时间与地点信息' : 'Copy Gathering Details'}</span>
                          </>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTimetableModal(null);
                            setActiveTab('about');
                            window.scrollTo(0, 0);
                          }}
                          className="flex-1 py-2.5 rounded-xl border border-gray-250 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all text-center"
                        >
                          {lang === 'zh' ? '联系教会/负责人' : 'Contact Pastoral Team'}
                        </button>
                        <button
                          onClick={() => setSelectedTimetableModal(null)}
                          className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-100 transition-all"
                        >
                          {lang === 'zh' ? '关闭' : 'Close'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice Footer Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-6 border border-amber-200/80 flex flex-col sm:flex-row items-start gap-4 shadow-xs mt-8 sm:mt-10 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Info size={20} />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-extrabold text-amber-900 text-sm">
                    {lang === 'zh' ? '新朋友与聚会温馨提示' : 'Kind Notice for Visitors & Holidays'}
                  </h4>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    {lang === 'zh'
                      ? '由于部分聚会（如祷告会、特别讲座等）在公共假期可能调整时间或举行联合崇拜，新朋友在第一次参加前欢迎先致电咨询，或通过网站后台联系牧者同工，以便我们安排最热情的接待。'
                      : 'Some special or prayer gatherings may merge or adjust timing on public holidays. First-time visitors are warmly welcome to contact our team in advance for directions and hospitality.'}
                  </p>
                  <div className="pt-1 flex items-center gap-3">
                    <button
                      onClick={() => { setActiveTab('about'); window.scrollTo(0, 0); }}
                      className="text-xs font-bold text-amber-900 hover:text-amber-700 underline flex items-center gap-1"
                    >
                      <span>{lang === 'zh' ? '前往联系牧者与寻找交通路线' : 'Contact Pastors & View Directions'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== PAGE: EVENTS ==================== */}
        {activeTab === 'events' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {t(data.settings.eventsBadge) || (lang === 'zh' ? '教会精彩纪实与未来计划' : 'Highlights & Upcoming Outlines')}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {t(data.settings.eventsTitle) || (lang === 'zh' ? '特别活动预告' : 'Special Events')}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.settings.eventsIntro) || (lang === 'zh' 
                  ? '在这里，您可以了解到教会近期举办的大型特殊崇拜、节日庆典、关怀行动和社区营会，欢迎带同亲友报名并一同参盛。' 
                  : 'Here, you can learn about our upcoming special worship services, holiday celebrations, welfare activities, and camps. Welcome to register and attend with friends!')}
              </p>
            </div>

            {/* Events Grid */}
            {data.events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.events.map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => { setSelectedEvent(evt); setEventDetailsOpen(true); }}
                    aria-label={`${lang === 'zh' ? '查看活动详情：' : 'View event details: '}${t(evt.title)}`}
                    className="group text-left bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm flex flex-col hover:shadow-lg hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300"
                  >
                    <div className="relative h-52 overflow-hidden bg-gray-100">
                      <img 
                        src={evt.image} 
                        alt={t(evt.title)} 
                        className="w-full h-full object-cover hover:scale-103 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4 bg-primary text-white py-1 px-3 rounded-lg font-bold text-xs shadow-md">
                        {evt.date}
                      </div>
                    </div>
                    <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <h3 className="font-extrabold text-lg text-gray-900 leading-tight">
                          {t(evt.title)}
                        </h3>
                        <p className="text-gray-600 text-xs font-light leading-relaxed whitespace-pre-line">
                          {t(evt.description)}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-primary" />
                          <span>{evt.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-primary shrink-0" />
                          <span className="truncate">{t(evt.location)}</span>
                        </div>
                      </div>
                      <div className="px-6 pb-5 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {lang === 'zh' ? '点击查看详情 →' : 'Click for full details →'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 font-light text-base">{lang === 'zh' ? '目前没有安排新活动。' : 'No upcoming events planned at the moment.'}</p>
              </div>
            )}
          </div>
        )}


         {/* ==================== PAGE: OFFERINGS ==================== */}
        {activeTab === 'offerings' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {lang === 'zh' ? '忠心管家 · 感恩奉献' : 'Faithful Stewardship · Thankful Giving'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '奉献指南' : 'Offerings & Tithes'}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.offerings?.intro)}
              </p>
            </div>

            {/* Scripture Quote */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl">
                <p className="text-gray-700 italic text-sm md:text-base leading-relaxed font-light">
                  {t(data.offerings?.scripture)}
                </p>
              </div>
            </div>

            {/* Offering Methods */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {(data.offerings?.methods || []).map((method, idx) => (
                <div key={method.id || idx} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                  <div className="bg-primary/5 p-6 text-center border-b border-gray-100">
                    <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3">
                      {method.icon === 'heart' && <HandHeart size={28} />}
                      {method.icon === 'building' && <Building size={28} />}
                      {method.icon === 'smartphone' && <Smartphone size={28} />}
                      {!['heart','building','smartphone'].includes(method.icon) && <Gift size={28} />}
                    </div>
                    <h3 className="font-extrabold text-lg text-gray-900">{t(method.title)}</h3>
                  </div>
                  <div className="p-6 flex-grow space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm font-light leading-relaxed">{t(method.description)}</p>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <p className="text-gray-700 text-xs font-medium leading-relaxed whitespace-pre-line">{t(method.details)}</p>
                      </div>
                    </div>
                    {method.qrCodeUrl && (
                      <div className="pt-4 border-t border-gray-100 flex flex-col items-center justify-center space-y-2 mt-4">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          {lang === 'zh' ? '扫码奉献' : 'Scan to Give'}
                        </span>
                        <div 
                          className="p-2 border border-gray-200 rounded-xl bg-white shadow-sm max-w-[160px] cursor-zoom-in hover:border-primary transition-colors"
                          onClick={() => setSelectedImage({ url: method.qrCodeUrl, title: t(method.title) })}
                        >
                          <img src={method.qrCodeUrl} alt="QR Code" className="w-full h-auto rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
           </div>

            {/* Contact Note */}
            <div className="max-w-2xl mx-auto bg-amber-50 rounded-xl p-5 border border-amber-200/60 flex items-start gap-3.5">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-amber-900 font-light leading-relaxed">{t(data.offerings?.contactNote)}</p>
            </div>
          </div>
        )}

        {/* ==================== PAGE: BULLETINS & SERMONS ==================== */}
        {activeTab === 'bulletins' && (() => {
          const bulletins = data.bulletins || [];
          const allBulletinCategories = [...new Set(bulletins.map(b => t(b.category)))];
          const filteredBulletins = bulletins.filter(b => {
            const matchesCategory = bulletinCategoryFilter === 'all' || t(b.category) === bulletinCategoryFilter;
            const q = bulletinSearchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
              t(b.title).toLowerCase().includes(q) ||
              t(b.category).toLowerCase().includes(q) ||
              (b.date && b.date.toLowerCase().includes(q)) ||
              (b.summary && t(b.summary).toLowerCase().includes(q)) ||
              (b.highlights && t(b.highlights).toLowerCase().includes(q));
            return matchesCategory && matchesSearch;
          });

          const sermons = data.sermons || [];
          const allPreachers = [...new Set(sermons.map(s => t(s.preacher)))];
          const allSeries = [...new Set(sermons.map(s => t(s.series)))];
          
          const filteredSermons = sermons.filter(s => {
            const matchesFilter = sermonFilter === 'all' || t(s.preacher) === sermonFilter || t(s.series) === sermonFilter;
            const q = sermonSearchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
              t(s.title).toLowerCase().includes(q) ||
              t(s.preacher).toLowerCase().includes(q) ||
              t(s.series).toLowerCase().includes(q) ||
              (s.scripture && s.scripture.toLowerCase().includes(q)) ||
              (s.date && s.date.toLowerCase().includes(q)) ||
              (s.description && t(s.description).toLowerCase().includes(q));
            return matchesFilter && matchesSearch;
          });
          
          // Helper to extract YouTube video ID
          const getYoutubeEmbedUrl = (url) => {
            if (!url) return '';
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
            return match ? `https://www.youtube.com/embed/${match[1]}` : '';
          };
          
          return (
            <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
                <span className="text-primary font-bold uppercase tracking-wider text-xs">
                  {t(data.settings.bulletinsBadge) || (lang === 'zh' ? '教会资源中心' : 'Church Resource Centre')}
                </span>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {t(data.settings.bulletinsTitle) || (lang === 'zh' ? '周报与讲道库' : 'Bulletins & Sermon Library')}
                </h1>
                <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                  {t(data.settings.bulletinsIntro) || (lang === 'zh'
                    ? '查阅每周周报、代祷事项，或回顾过往讲道信息。'
                    : 'Access weekly bulletins, prayer items, and past sermon messages.')}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1 border border-gray-200/60 shadow-xs">
                  <button
                    onClick={() => setBulletinsTab('bulletins')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      bulletinsTab === 'bulletins'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <FileText size={16} />
                    <span>{lang === 'zh' ? '周报下载' : 'Weekly Bulletins'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                      {bulletins.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setBulletinsTab('sermons')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      bulletinsTab === 'sermons'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>{lang === 'zh' ? '讲道库' : 'Sermon Library'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                      {sermons.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bulletins Tab */}
              {bulletinsTab === 'bulletins' && (
                <div className="space-y-8">
                  {/* Bulletins Filters & Control Toolbar */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4 mb-8">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text"
                          value={bulletinSearchQuery}
                          onChange={(e) => setBulletinSearchQuery(e.target.value)}
                          placeholder={lang === 'zh' ? '搜索周报标题、类别、日期或摘要...' : 'Search bulletin title, category, date, or summary...'}
                          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-250 bg-gray-50/50 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
                        />
                        {bulletinSearchQuery && (
                          <button 
                            onClick={() => setBulletinSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200/60"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start lg:self-auto border border-gray-200/60">
                        <button
                          onClick={() => setBulletinViewMode('cards')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            bulletinViewMode === 'cards' 
                              ? 'bg-white text-primary shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                          title={lang === 'zh' ? '卡片视图' : 'Cards View'}
                        >
                          <LayoutGrid size={16} />
                          <span>{lang === 'zh' ? '卡片模式' : 'Cards'}</span>
                        </button>
                        <button
                          onClick={() => setBulletinViewMode('table')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            bulletinViewMode === 'table' 
                              ? 'bg-white text-primary shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                          title={lang === 'zh' ? '表格视图' : 'Table View'}
                        >
                          <ListFilter size={16} />
                          <span>{lang === 'zh' ? '列表表格' : 'Table'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    {allBulletinCategories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                        <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                          <Filter size={12} />
                          {lang === 'zh' ? '按类别:' : 'Category:'}
                        </span>
                        <button
                          onClick={() => setBulletinCategoryFilter('all')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            bulletinCategoryFilter === 'all'
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {lang === 'zh' ? '全部类别' : 'All Categories'}
                        </button>
                        {allBulletinCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setBulletinCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              bulletinCategoryFilter === cat
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Empty state if search/filter matches 0 items */}
                  {filteredBulletins.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center gap-2 justify-center mx-auto border border-amber-200">
                        <FileText size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {lang === 'zh' ? '未找到相关周报' : 'No Matching Bulletins Found'}
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        {lang === 'zh'
                          ? '您可以尝试清除搜索关键词或重置类别筛选条件。'
                          : 'Try clearing your search query or resetting the category filter.'}
                      </p>
                      <button
                        onClick={() => {
                          setBulletinSearchQuery('');
                          setBulletinCategoryFilter('all');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-all"
                      >
                        {lang === 'zh' ? '重置筛选条件' : 'Reset All Filters'}
                      </button>
                    </div>
                  ) : bulletinViewMode === 'cards' ? (
                    /* Cards View Mode */
                    <div className="space-y-6">
                      {filteredBulletins.map((bulletin) => (
                        <div key={bulletin.id} className="bg-white rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-all overflow-hidden">
                          <div className="flex flex-col md:flex-row">
                            <div className="md:w-16 bg-primary/5 flex items-center justify-center p-4 md:p-0 shrink-0">
                              <FileText className="text-primary" size={24} />
                            </div>
                            <div className="flex-grow p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div onClick={() => setSelectedBulletinModal(bulletin)} className="cursor-pointer group">
                                  <h3 className="font-extrabold text-lg text-gray-900 group-hover:text-primary transition-colors">{t(bulletin.title)}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold">
                                      <Calendar size={11} />
                                      <span>{bulletin.date}</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                                      {t(bulletin.category)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedBulletinModal(bulletin)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all shrink-0"
                                  >
                                    <Info size={14} />
                                    <span>{lang === 'zh' ? '查看详情' : 'Details'}</span>
                                  </button>
                                  {bulletin.fileUrl && bulletin.fileUrl !== '#' && (
                                    <a href={bulletin.fileUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shrink-0">
                                      <Download size={14} />
                                      <span>{lang === 'zh' ? '下载周报' : 'Download PDF'}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-600 text-sm font-light leading-relaxed mb-3">{t(bulletin.summary)}</p>
                              {bulletin.highlights && (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                  <p className="text-gray-700 text-xs font-medium leading-relaxed whitespace-pre-line">{t(bulletin.highlights)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View Mode */
                    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-6 bg-primary/5 border-b border-gray-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="text-primary shrink-0" size={22} />
                          <span className="text-base font-extrabold text-gray-900">
                            {lang === 'zh' ? '教会周报与月刊列表' : 'Church Bulletins & Newsletters Overview'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                          {filteredBulletins.length} {lang === 'zh' ? '份资源' : 'Items'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/90 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <th className="py-4 px-6">{lang === 'zh' ? '周报标题' : 'Bulletin Title'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '发布日期' : 'Date'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '类别' : 'Category'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '摘要概览' : 'Summary'}</th>
                              <th className="py-4 px-6 text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150">
                            {filteredBulletins.map((bulletin) => (
                              <tr key={bulletin.id} className="hover:bg-primary/5 transition-colors text-sm text-gray-700 group">
                                <td 
                                  onClick={() => setSelectedBulletinModal(bulletin)}
                                  className="py-4.5 px-6 font-extrabold text-gray-900 group-hover:text-primary transition-colors cursor-pointer"
                                >
                                  {t(bulletin.title)}
                                </td>
                                <td className="py-4.5 px-6">
                                  <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-bold inline-flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span>{bulletin.date}</span>
                                  </span>
                                </td>
                                <td className="py-4.5 px-6">
                                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-gray-100 text-gray-700 border-gray-200">
                                    {t(bulletin.category)}
                                  </span>
                                </td>
                                <td className="py-4.5 px-6 text-gray-600 font-medium text-xs max-w-xs truncate">
                                  {t(bulletin.summary)}
                                </td>
                                <td className="py-4.5 px-6 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => setSelectedBulletinModal(bulletin)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-primary mr-3 hover:underline"
                                  >
                                    <span>{lang === 'zh' ? '查看详情' : 'Details'}</span>
                                  </button>
                                  {bulletin.fileUrl && bulletin.fileUrl !== '#' ? (
                                    <a
                                      href={bulletin.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-2xs transition-all"
                                    >
                                      <Download size={13} />
                                      <span>{lang === 'zh' ? '下载' : 'PDF'}</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400 font-medium">{lang === 'zh' ? '无文件' : 'N/A'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sermons Tab */}
              {bulletinsTab === 'sermons' && (
                <div className="space-y-8">
                  {/* Sermons Filters & Control Toolbar */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4 mb-8">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text"
                          value={sermonSearchQuery}
                          onChange={(e) => setSermonSearchQuery(e.target.value)}
                          placeholder={lang === 'zh' ? '搜索讲题、讲员、系列、经文或日期...' : 'Search sermon title, preacher, series, scripture, or date...'}
                          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-250 bg-gray-50/50 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
                        />
                        {sermonSearchQuery && (
                          <button 
                            onClick={() => setSermonSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200/60"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start lg:self-auto border border-gray-200/60">
                        <button
                          onClick={() => setSermonViewMode('cards')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            sermonViewMode === 'cards' 
                              ? 'bg-white text-primary shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                          title={lang === 'zh' ? '卡片网格视图' : 'Grid View'}
                        >
                          <LayoutGrid size={16} />
                          <span>{lang === 'zh' ? '卡片模式' : 'Grid'}</span>
                        </button>
                        <button
                          onClick={() => setSermonViewMode('table')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            sermonViewMode === 'table' 
                              ? 'bg-white text-primary shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                          title={lang === 'zh' ? '表格视图' : 'Table View'}
                        >
                          <ListFilter size={16} />
                          <span>{lang === 'zh' ? '列表表格' : 'Table'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Pills (Series & Preachers) */}
                    {(allSeries.length > 0 || allPreachers.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                        <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                          <Filter size={12} />
                          {lang === 'zh' ? '分类筛选:' : 'Filter by:'}
                        </span>
                        <button
                          onClick={() => setSermonFilter('all')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            sermonFilter === 'all'
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {lang === 'zh' ? '全部系列与讲员' : 'All Sermons'}
                        </button>
                        {allSeries.map(series => (
                          <button
                            key={series}
                            onClick={() => setSermonFilter(series)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              sermonFilter === series
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            📌 {series}
                          </button>
                        ))}
                        {allPreachers.map(preacher => (
                          <button
                            key={preacher}
                            onClick={() => setSermonFilter(preacher)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              sermonFilter === preacher
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            🎙️ {preacher}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Empty state if search/filter matches 0 items */}
                  {filteredSermons.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center gap-2 justify-center mx-auto border border-amber-200">
                        <BookOpen size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {lang === 'zh' ? '未找到相关讲道' : 'No Matching Sermons Found'}
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        {lang === 'zh'
                          ? '您可以尝试清除搜索关键词或重置讲员/系列筛选条件。'
                          : 'Try clearing your search query or resetting the preacher/series filter.'}
                      </p>
                      <button
                        onClick={() => {
                          setSermonSearchQuery('');
                          setSermonFilter('all');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-all"
                      >
                        {lang === 'zh' ? '重置筛选条件' : 'Reset All Filters'}
                      </button>
                    </div>
                  ) : sermonViewMode === 'cards' ? (
                    /* Cards View Mode */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredSermons.map((sermon) => (
                        <div key={sermon.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
                          {/* Video Thumbnail / Embed */}
                          <div className="relative aspect-video bg-gray-900 cursor-pointer" onClick={() => setSelectedSermonModal(sermon)}>
                            {sermon.videoUrl && getYoutubeEmbedUrl(sermon.videoUrl) ? (
                              <iframe
                                src={getYoutubeEmbedUrl(sermon.videoUrl)}
                                title={t(sermon.title)}
                                className="absolute inset-0 w-full h-full pointer-events-auto"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-white">
                                <BookOpen size={48} className="opacity-30" />
                              </div>
                            )}
                          </div>
                          <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2 justify-between">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                  {t(sermon.series)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-gray-400 text-[10px] font-medium">
                                  <Calendar size={10} />
                                  {sermon.date}
                                </span>
                              </div>
                              <h3 onClick={() => setSelectedSermonModal(sermon)} className="font-extrabold text-sm text-gray-900 leading-tight group-hover:text-primary transition-colors cursor-pointer">{t(sermon.title)}</h3>
                              {sermon.scripture && (
                                <p className="text-xs text-primary font-medium mt-1 italic">📖 {sermon.scripture}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs font-light leading-relaxed line-clamp-2">{t(sermon.description)}</p>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5">
                                  <Users size={12} className="text-gray-400" />
                                  <span className="text-xs font-bold text-gray-700">{t(sermon.preacher)}</span>
                                </div>
                                <button
                                  onClick={() => setSelectedSermonModal(sermon)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                >
                                  <span>{lang === 'zh' ? '观看/详情' : 'Watch Video'}</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View Mode */
                    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-6 bg-primary/5 border-b border-gray-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="text-primary shrink-0" size={22} />
                          <span className="text-base font-extrabold text-gray-900">
                            {lang === 'zh' ? '在线讲道与证道视频总览' : 'Sermon Library Overview'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                          {filteredSermons.length} {lang === 'zh' ? '场证道' : 'Sermons'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/90 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <th className="py-4 px-6">{lang === 'zh' ? '讲题与经文' : 'Sermon Title & Scripture'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '讲道系列' : 'Series'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '主讲人 / 牧者' : 'Preacher'}</th>
                              <th className="py-4 px-6">{lang === 'zh' ? '聚会日期' : 'Date'}</th>
                              <th className="py-4 px-6 text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150">
                            {filteredSermons.map((sermon) => (
                              <tr key={sermon.id} className="hover:bg-primary/5 transition-colors text-sm text-gray-700 group">
                                <td 
                                  onClick={() => setSelectedSermonModal(sermon)}
                                  className="py-4.5 px-6 font-extrabold text-gray-900 group-hover:text-primary transition-colors cursor-pointer"
                                >
                                  <div>{t(sermon.title)}</div>
                                  {sermon.scripture && (
                                    <div className="text-xs text-primary font-medium mt-0.5 italic">📖 {sermon.scripture}</div>
                                  )}
                                </td>
                                <td className="py-4.5 px-6">
                                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                                    {t(sermon.series)}
                                  </span>
                                </td>
                                <td className="py-4.5 px-6 font-bold text-gray-800">
                                  <div className="flex items-center gap-1.5">
                                    <Users size={14} className="text-gray-400" />
                                    <span>{t(sermon.preacher)}</span>
                                  </div>
                                </td>
                                <td className="py-4.5 px-6 font-medium text-gray-600 text-xs">
                                  {sermon.date}
                                </td>
                                <td className="py-4.5 px-6 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => setSelectedSermonModal(sermon)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-2xs"
                                  >
                                    <PlayCircle size={14} />
                                    <span>{lang === 'zh' ? '观看视频' : 'Watch Video'}</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Bulletin Modal Dialog */}
              {selectedBulletinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 space-y-6 p-6 sm:p-8 relative">
                    <button 
                      onClick={() => setSelectedBulletinModal(null)}
                      className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <div className="space-y-2 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {selectedBulletinModal.date}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {t(selectedBulletinModal.category)}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        {t(selectedBulletinModal.title)}
                      </h2>
                    </div>
                    <div className="space-y-4 text-sm">
                      <p className="text-gray-700 font-medium leading-relaxed">{t(selectedBulletinModal.summary)}</p>
                      {selectedBulletinModal.highlights && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
                          <div className="text-xs font-bold text-gray-500 uppercase mb-2">{lang === 'zh' ? '要点与代祷事项' : 'Highlights & Prayer Items'}</div>
                          <p className="text-gray-800 text-xs font-medium leading-relaxed whitespace-pre-line">{t(selectedBulletinModal.highlights)}</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 flex gap-3">
                      {selectedBulletinModal.fileUrl && selectedBulletinModal.fileUrl !== '#' && (
                        <a
                          href={selectedBulletinModal.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                          <Download size={16} />
                          <span>{lang === 'zh' ? '下载周报 (PDF)' : 'Download PDF'}</span>
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedBulletinModal(null)}
                        className="py-3 px-6 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-all"
                      >
                        {lang === 'zh' ? '关闭' : 'Close'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Sermon Video Modal Dialog */}
              {selectedSermonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 space-y-5 p-6 sm:p-8 relative">
                    <button 
                      onClick={() => setSelectedSermonModal(null)}
                      className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10"
                    >
                      <X size={20} />
                    </button>
                    <div className="space-y-1.5 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {t(selectedSermonModal.series)}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {selectedSermonModal.date} • {t(selectedSermonModal.preacher)}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                        {t(selectedSermonModal.title)}
                      </h2>
                      {selectedSermonModal.scripture && (
                        <p className="text-xs text-primary font-bold italic">📖 {selectedSermonModal.scripture}</p>
                      )}
                    </div>
                    
                    {/* Video Player */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
                      {selectedSermonModal.videoUrl && getYoutubeEmbedUrl(selectedSermonModal.videoUrl) ? (
                        <iframe
                          src={getYoutubeEmbedUrl(selectedSermonModal.videoUrl)}
                          title={t(selectedSermonModal.title)}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                          <BookOpen size={48} className="opacity-40 mb-2" />
                          <p className="text-sm">{lang === 'zh' ? '无法嵌入视频，或未提供视频链接。' : 'No embeddable video URL provided.'}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 font-normal leading-relaxed">{t(selectedSermonModal.description)}</p>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSelectedSermonModal(null)}
                        className="py-2.5 px-6 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-all"
                      >
                        {lang === 'zh' ? '关闭' : 'Close'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice Footer Card (with proper top spacing just like timetable) */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-6 border border-amber-200/80 flex flex-col sm:flex-row items-start gap-4 shadow-xs mt-8 sm:mt-10 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Info size={20} />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-extrabold text-amber-900 text-sm">
                    {lang === 'zh' ? '周报与讲道资源温馨提示' : 'Resource Center Notice & Support'}
                  </h4>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    {lang === 'zh'
                      ? '每周周报通常于每周五或六完成上传；若您在下载 PDF 档案或观看讲道视频时遇到任何问题，或需获取过往月份之内部资料，欢迎随时联系教会行政同工查询。'
                      : 'Weekly bulletins are updated usually on Friday or Saturday. If you experience issues downloading files or viewing sermon videos, or need archived materials from previous months, please feel free to contact our administrative office.'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== PAGE: SERVICES & WORSHIPS ==================== */}
        {activeTab === 'services' && (() => {
          const services = data.services || [];
          const getServiceType = (s) => (s.type || 'service');
          // Count for tabs
          const countAll = services.length;
          const countService = services.filter(s => getServiceType(s) !== 'worship').length;
          const countWorship = services.filter(s => getServiceType(s) === 'worship').length;
          // Filter by main tab (service/worship) first to derive series list
          const servicesByMainTab = services.filter(s => {
            if (serviceMainTab === 'all') return true;
            return getServiceType(s) === serviceMainTab;
          });
          const allSeries = [...new Set(servicesByMainTab.map(s => t(s.series)))];
          const filteredServices = services.filter(s => {
            const matchesMainTab = serviceMainTab === 'all' || getServiceType(s) === serviceMainTab;
            const matchesFilter = serviceFilter === 'all' || t(s.series) === serviceFilter;
            const q = serviceSearchQuery.toLowerCase().trim();
            const matchesSearch = !q || t(s.title).toLowerCase().includes(q) || t(s.series).toLowerCase().includes(q) || s.date.includes(q) || t(s.description).toLowerCase().includes(q);
            return matchesMainTab && matchesFilter && matchesSearch;
          });
          return (
            <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
                <span className="text-primary font-bold uppercase tracking-wider text-xs">
                  {t(data.settings.servicesBadge) || (lang === 'zh' ? '崇拜与敬拜 · 完整回顾' : 'Services & Worships · Full Replay')}
                </span>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {t(data.settings.servicesTitle) || (lang === 'zh' ? '崇拜与敬拜' : 'Services & Worships')}
                </h1>
                <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                  {t(data.settings.servicesIntro) || (lang === 'zh'
                    ? '回顾完整主日崇拜与敬拜赞美录影，包括敬拜、证道、祷告及教会报告事项。崇拜与敬拜分开标签，方便查找。'
                    : 'Revisit full Sunday service & worship recordings, including praise, sermon, prayer, and announcements. Browse by Services and Worships tabs.')}
                </p>
              </div>

              {/* Main Tabs: Services & Worships */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1 border border-gray-200/60 shadow-xs">
                  <button
                    onClick={() => { setServiceMainTab('all'); setServiceFilter('all'); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      serviceMainTab === 'all'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <Layers size={16} />
                    <span>{lang === 'zh' ? '全部' : 'All'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                      {countAll}
                    </span>
                  </button>
                  <button
                    onClick={() => { setServiceMainTab('service'); setServiceFilter('all'); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      serviceMainTab === 'service'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <Video size={16} />
                    <span>{lang === 'zh' ? '崇拜录影' : 'Services'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                      {countService}
                    </span>
                  </button>
                  <button
                    onClick={() => { setServiceMainTab('worship'); setServiceFilter('all'); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      serviceMainTab === 'worship'
                        ? 'bg-white text-primary shadow-sm font-bold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    <PlayCircle size={16} />
                    <span>{lang === 'zh' ? '敬拜录影' : 'Worships'}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-bold">
                      {countWorship}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filters & Control Toolbar */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4 mb-8">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                      placeholder={lang === 'zh' ? '搜索标题、系列或日期...' : 'Search title, series, or date...'}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-250 bg-gray-50/50 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-all"
                    />
                    {serviceSearchQuery && (
                      <button 
                        onClick={() => setServiceSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200/60"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start lg:self-auto border border-gray-200/60">
                    <button
                      onClick={() => setServiceViewMode('cards')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        serviceViewMode === 'cards' 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                      title={lang === 'zh' ? '卡片网格视图' : 'Grid View'}
                    >
                      <LayoutGrid size={16} />
                      <span>{lang === 'zh' ? '卡片模式' : 'Grid'}</span>
                    </button>
                    <button
                      onClick={() => setServiceViewMode('table')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        serviceViewMode === 'table' 
                          ? 'bg-white text-primary shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                      title={lang === 'zh' ? '表格视图' : 'Table View'}
                    >
                      <ListFilter size={16} />
                      <span>{lang === 'zh' ? '列表表格' : 'Table'}</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                {allSeries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
                      <Filter size={12} />
                      {lang === 'zh' ? '分类筛选:' : 'Filter by:'}
                    </span>
                    <button
                      onClick={() => setServiceFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        serviceFilter === 'all'
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lang === 'zh' ? '全部系列' : 'All Services'}
                    </button>
                    {allSeries.map(series => (
                      <button
                        key={series}
                        onClick={() => setServiceFilter(series)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          serviceFilter === series
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        📌 {series}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty state */}
              {filteredServices.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center gap-2 justify-center mx-auto border border-amber-200">
                    <Video size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {lang === 'zh'
                      ? (serviceMainTab === 'worship' ? '未找到相关敬拜录影' : serviceMainTab === 'service' ? '未找到相关崇拜录影' : '未找到相关录影')
                      : (serviceMainTab === 'worship' ? 'No Matching Worships Found' : serviceMainTab === 'service' ? 'No Matching Services Found' : 'No Matching Recordings Found')}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {lang === 'zh'
                      ? '您可以尝试清除搜索关键词、重置系列筛选或切换崇拜/敬拜标签。'
                      : 'Try clearing search, resetting series filter, or switching Services/Worships tabs.'}
                  </p>
                  <button
                    onClick={() => {
                      setServiceSearchQuery('');
                      setServiceFilter('all');
                      setServiceMainTab('all');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-all"
                  >
                    {lang === 'zh' ? '重置筛选条件' : 'Reset All Filters'}
                  </button>
                </div>
              ) : serviceViewMode === 'cards' ? (
                /* Cards View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
                      {/* Video Thumbnail / Embed */}
                      <div className="relative aspect-video bg-gray-900 cursor-pointer" onClick={() => setSelectedServiceModal(service)}>
                        {service.videoUrl && getYoutubeEmbedUrl(service.videoUrl) ? (
                          <iframe
                            src={getYoutubeEmbedUrl(service.videoUrl)}
                            title={t(service.title)}
                            className="absolute inset-0 w-full h-full pointer-events-auto"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <Video size={48} className="opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2 justify-between flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getServiceType(service) === 'worship' ? 'bg-violet-100 text-violet-700' : 'bg-primary/10 text-primary'}`}>
                                {getServiceType(service) === 'worship' ? (lang === 'zh' ? '敬拜' : 'Worship') : (lang === 'zh' ? '崇拜' : 'Service')}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                                {t(service.series)}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-gray-400 text-[10px] font-medium">
                              <Calendar size={10} />
                              {service.date}
                            </span>
                          </div>
                          <h3 onClick={() => setSelectedServiceModal(service)} className="font-extrabold text-sm text-gray-900 leading-tight group-hover:text-primary transition-colors cursor-pointer">{t(service.title)}</h3>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setSelectedServiceModal(service)}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <PlayCircle size={14} />
                            {lang === 'zh' ? '观看录影' : 'Watch Recording'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Table View Mode */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{lang === 'zh' ? '日期' : 'Date'}</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{lang === 'zh' ? '类型' : 'Type'}</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{lang === 'zh' ? '标题' : 'Title'}</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{lang === 'zh' ? '系列' : 'Series'}</th>
                          <th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">{lang === 'zh' ? '操作' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredServices.map((service) => (
                          <tr key={service.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5 text-xs text-gray-600 font-medium whitespace-nowrap">{service.date}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getServiceType(service) === 'worship' ? 'bg-violet-100 text-violet-700' : 'bg-primary/10 text-primary'}`}>
                                {getServiceType(service) === 'worship' ? (lang === 'zh' ? '敬拜' : 'Worship') : (lang === 'zh' ? '崇拜' : 'Service')}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-bold text-gray-900">{t(service.title)}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">{t(service.series)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => setSelectedServiceModal(service)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-2xs"
                              >
                                <PlayCircle size={14} />
                                <span>{lang === 'zh' ? '观看录影' : 'Watch'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Service Detail Modal */}
              {selectedServiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 space-y-5 p-6 sm:p-8 relative">
                    <button 
                      onClick={() => setSelectedServiceModal(null)}
                      className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10"
                    >
                      <X size={20} />
                    </button>
                    <div className="space-y-1.5 pr-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ (selectedServiceModal.type || 'service') === 'worship' ? 'bg-violet-100 text-violet-700' : 'bg-primary/10 text-primary'}`}>
                          {(selectedServiceModal.type || 'service') === 'worship' ? (lang === 'zh' ? '敬拜' : 'Worship') : (lang === 'zh' ? '崇拜' : 'Service')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                          {t(selectedServiceModal.series)}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {selectedServiceModal.date}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                        {t(selectedServiceModal.title)}
                      </h2>
                    </div>
                    
                    {/* Video Player */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
                      {selectedServiceModal.videoUrl && getYoutubeEmbedUrl(selectedServiceModal.videoUrl) ? (
                        <iframe
                          src={getYoutubeEmbedUrl(selectedServiceModal.videoUrl)}
                          title={t(selectedServiceModal.title)}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                          <Video size={48} className="opacity-40 mb-2" />
                          <p className="text-sm">{lang === 'zh' ? '无法嵌入视频，或未提供视频链接。' : 'No embeddable video URL provided.'}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 font-normal leading-relaxed">{t(selectedServiceModal.description)}</p>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSelectedServiceModal(null)}
                        className="py-2.5 px-6 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-all"
                      >
                        {lang === 'zh' ? '关闭' : 'Close'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice Footer Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-6 border border-amber-200/80 flex flex-col sm:flex-row items-start gap-4 shadow-xs mt-8 sm:mt-10 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Info size={20} />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-extrabold text-amber-900 text-sm">
                    {lang === 'zh' ? '崇拜与敬拜录影温馨提示' : 'Services & Worships Recording Notice'}
                  </h4>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    {lang === 'zh'
                      ? '崇拜与敬拜录影通常于主日后一周内上传。若您在观看视频时遇到任何问题，欢迎随时联系教会行政同工查询。'
                      : 'Services & worship recordings are typically uploaded within one week after Sunday. If you experience issues viewing the videos, please contact our administrative office.'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== PAGE: CELL GROUPS ==================== */}
        {activeTab === 'cellgroups' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {t(data.settings.cellGroupsBadge) || (lang === 'zh' ? '小组生活 · 彼此相顾' : 'Community Life · Caring for One Another')}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {t(data.settings.cellGroupsTitle) || (lang === 'zh' ? '细胞小组' : 'Cell Groups')}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.settings.cellGroupsIntro) || (lang === 'zh'
                  ? '小组是我们教会最重要的团契生活单元。每个小组定期聚会，一同查经、祷告、分享生命，在主爱中彼此建立。欢迎加入我们的小组！'
                  : 'Cell groups are the heart of our fellowship life. Each group meets regularly for Bible study, prayer, and life sharing, building each other up in the Lord\'s love. Join us!')}
              </p>
            </div>

            {(data.cellGroups || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.cellGroups.map((group) => (
                  <div key={group.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                    <div 
                      className="relative h-48 overflow-hidden cursor-zoom-in"
                      onClick={() => setSelectedCellGroup(group)}
                    >
                      <img src={group.image} alt={t(group.name)} className="w-full h-full object-cover hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="font-extrabold text-xl">{t(group.name)}</h3>
                        <span className="text-xs text-white/80 bg-primary/80 px-2 py-0.5 rounded mt-1 inline-block">{t(group.target)}</span>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 flex-grow flex flex-col">
                      <h3 
                        className="font-extrabold text-lg text-gray-900 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setSelectedCellGroup(group)}
                      >
                        {t(group.name)}
                      </h3>
                      <p className="text-gray-600 text-sm font-light leading-relaxed line-clamp-3">{t(group.description)}</p>
                      <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-primary shrink-0" />
                          <span className="font-medium text-gray-700">{lang === 'zh' ? '负责人：' : 'Leader: '}</span>
                          <span>{t(group.leader)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-primary shrink-0" />
                          <span className="font-medium text-gray-700">{lang === 'zh' ? '聚会时间：' : 'Schedule: '}</span>
                          <span>{t(group.schedule)}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <button 
                          onClick={() => setSelectedCellGroup(group)}
                          className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Info size={14} />
                          <span>{lang === 'zh' ? '查看详情' : 'View Details'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <Users className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 font-light">{lang === 'zh' ? '目前暂无小组信息。' : 'No cell groups listed at the moment.'}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== PAGE: NEW FRIEND GUIDE ==================== */}
        {activeTab === 'newfriend' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {lang === 'zh' ? '欢迎来到神的家' : 'Welcome to God\'s Family'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3">
                <Compass className="text-primary" size={36} />
                <span>{lang === 'zh' ? '新朋友指南' : 'New Friend Guide'}</span>
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.newFriendGuide?.welcome)}
              </p>
            </div>

            <div className="space-y-8 max-w-4xl mx-auto">
              {(data.newFriendGuide?.sections || []).map((section, index) => (
                <div key={section.id || index} className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 md:p-8 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-grow space-y-3">
                      <h2 className="text-xl font-extrabold text-gray-900">{t(section.title)}</h2>
                      <div className="w-12 h-1 bg-primary rounded" />
                      <p className="text-gray-700 text-sm font-light leading-relaxed whitespace-pre-line">{t(section.content)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Contact CTA */}
            <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center max-w-3xl mx-auto border border-primary/10">
              <HelpCircle className="mx-auto text-primary mb-3" size={32} />
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                {lang === 'zh' ? '还有疑问？随时联系我们！' : 'Still have questions? Contact us anytime!'}
              </h3>
              <p className="text-gray-600 text-sm font-light mb-4">
                {lang === 'zh' ? '我们的接待团队随时准备为您解答任何问题。' : 'Our welcome team is ready to answer any questions you may have.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={`tel:${data.settings.contactPhone}`} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary-dark transition-all">
                  <Phone size={16} />
                  <span>{data.settings.contactPhone}</span>
                </a>
                <button onClick={() => { setActiveTab('maps'); window.scrollTo(0, 0); }}
                  className="px-5 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold flex items-center gap-2 hover:bg-primary/5 transition-all">
                  <Navigation size={16} />
                  <span>{lang === 'zh' ? '查看地图与方向' : 'View Map & Directions'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PAGE: MAPS ==================== */}
        {activeTab === 'maps' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {t(data.settings.mapsBadge) || (lang === 'zh' ? '找到我们' : 'Find Us')}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3">
                <MapIcon className="text-primary" size={36} />
                <span>{t(data.settings.mapsTitle) || (lang === 'zh' ? '教会地图与交通指南' : 'Church Map & Directions')}</span>
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {t(data.settings.mapsIntro) || (lang === 'zh' ? '我们在多个地点设有聚会点，请选择离您最近的地点。' : 'We have fellowship points at multiple locations. Choose the one closest to you.')}
              </p>
            </div>

            {/* Multiple Church Locations */}
            {(data.maps || []).length > 0 ? (
              <div className="space-y-12">
                {(data.maps || []).map((church) => (
                  <div key={church.id} className="space-y-6">
                    {/* Church Name Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <MapIcon size={20} />
                      </div>
                      <h2 className="text-2xl font-extrabold text-gray-900">{t(church.name)}</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Map Embed */}
                      <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 min-h-[400px]">
                        {getGoogleMapsEmbedUrl(church) ? (
                          <iframe
                            src={getGoogleMapsEmbedUrl(church)}
                            width="100%"
                            height="100%"
                            style={{ border: 0, minHeight: '400px' }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={t(church.name)}
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 text-gray-500">
                            <MapIcon size={48} className="text-gray-300 mb-3" />
                            <p className="text-sm font-medium">{lang === 'zh' ? '尚未设置嵌入地图链接' : 'Map embed URL has not been set yet.'}</p>
                          </div>
                        )}
                      </div>

                      {/* Info Sidebar */}
                      <div className="space-y-6">
                        {/* Address */}
                        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-3">
                          <div className="flex items-center gap-2 text-primary">
                            <MapPin size={20} />
                            <h3 className="font-extrabold text-gray-900">{lang === 'zh' ? '地址' : 'Address'}</h3>
                          </div>
                          <p className="text-gray-700 text-sm font-light leading-relaxed whitespace-pre-line">{t(church.address)}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t(church.address))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:text-primary-dark transition-all"
                          >
                            <Navigation size={14} />
                            <span>{lang === 'zh' ? '在 Google Maps 中打开' : 'Open in Google Maps'}</span>
                          </a>
                        </div>

                        {/* Directions */}
                        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-3">
                          <div className="flex items-center gap-2 text-primary">
                            <Navigation size={20} />
                            <h3 className="font-extrabold text-gray-900">{lang === 'zh' ? '交通指南' : 'Directions'}</h3>
                          </div>
                          <p className="text-gray-700 text-sm font-light leading-relaxed whitespace-pre-line">{t(church.directions)}</p>
                        </div>

                        {/* Landmarks */}
                        {church.landmarks && (
                          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                              <MapIcon size={20} />
                              <h3 className="font-extrabold text-gray-900">{lang === 'zh' ? '附近地标' : 'Nearby Landmarks'}</h3>
                            </div>
                            <p className="text-gray-700 text-sm font-light leading-relaxed whitespace-pre-line">{t(church.landmarks)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <MapIcon className="mx-auto text-gray-400 mb-3" size={48} />
                <h2 className="font-extrabold text-lg text-gray-900 mb-2">
                  {lang === 'zh' ? '地图资料尚未设置' : 'Map information is not set yet'}
                </h2>
                <p className="text-gray-600 text-sm font-light mb-5 px-6">
                  {lang === 'zh' ? '您仍可使用以下教会地址在 Google Maps 中搜寻。' : 'You can still search for the church using the address below.'}
                </p>
                <p className="text-gray-700 text-sm font-medium mb-5 px-6">{data.settings.contactAddress}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.settings.contactAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all"
                >
                  <Navigation size={16} />
                  <span>{lang === 'zh' ? '在 Google Maps 中打开' : 'Open in Google Maps'}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* ==================== PAGE: ADMIN PANEL ==================== */}
        {activeTab === 'admin' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            
            {/* Case: Not logged in */}
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 md:p-10 rounded-2xl border border-gray-150 shadow-md space-y-6">
                <div className="text-center space-y-3">
                  <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 mb-2 border border-amber-100">
                    <Lock size={32} />
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900">
                    {lang === 'zh' ? '管理员安全登录' : 'Admin Secure Login'}
                  </h1>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    {lang === 'zh' 
                      ? '后台管理可供修改教会基本信息、聚会日程、社区事工内容、主页轮播图及更换网站主题配色。' 
                      : 'Log in to update church info, weekly schedules, ministries, banner carousel images, and website theme colors.'}
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                      {lang === 'zh' ? '管理登录密码' : 'Admin Password'}
                    </label>
                    <input 
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm transition-all"
                    />
                  </div>

                  {adminLoginError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{adminLoginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Shield size={16} />
                    <span>{lang === 'zh' ? '确认登录' : 'Confirm Login'}</span>
                  </button>
                </form>

                <div className="pt-2 border-t border-gray-100 text-center">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {lang === 'zh' ? '密码由 Cloudflare Secret 安全验证' : 'Password verified securely by Cloudflare Secret'}
                  </span>
                </div>
              </div>
            ) : (
              
              /* Case: Logged in and viewing Admin Console */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col lg:flex-row min-h-[680px]">
                
                {/* Admin Sidebar Navigation */}
                <div className="w-full lg:w-64 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 shrink-0 p-5 flex flex-col justify-between gap-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                      <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                        <Shield size={20} />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-gray-900 block leading-tight">{lang === 'zh' ? '网站控制中心' : 'Control Center'}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">{lang === 'zh' ? '超级管理员' : 'Administrator'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {[
                        { id: 'settings', label: lang === 'zh' ? '基本设置 & 配色' : 'General & Colors', icon: SettingsIcon, group: 'about' },
                        { id: 'about', label: lang === 'zh' ? '关于我们设置' : 'About Us Settings', icon: Users, group: 'about' },
                        { id: 'carousel', label: lang === 'zh' ? '横幅幻灯片' : 'Banner Slides', icon: Sparkles },
                        { id: 'timetable', label: lang === 'zh' ? '聚会时间表' : 'Timetable Services', icon: Calendar },
                        { id: 'ministries', label: lang === 'zh' ? '核心事工管理' : 'Ministries Content', icon: Heart },
                        { id: 'events', label: lang === 'zh' ? '活动内容发布' : 'Events Post', icon: CalendarCheck },
                        { id: 'offerings', label: lang === 'zh' ? '奉献设置' : 'Offerings Settings', icon: HandHeart },
                        { id: 'bulletins', label: lang === 'zh' ? '周报与讲道库' : 'Bulletins & Sermon Library', icon: BookOpen },
                        { id: 'services', label: lang === 'zh' ? '崇拜与敬拜管理' : 'Services & Worships Manager', icon: Video },
                        { id: 'cellgroups', label: lang === 'zh' ? '小组管理' : 'Cell Groups', icon: Compass },
                        { id: 'newfriend', label: lang === 'zh' ? '新朋友指南' : 'New Friend Guide', icon: HelpCircle },
                        { id: 'maps', label: lang === 'zh' ? '地图设置' : 'Maps Settings', icon: MapIcon },
                        { id: 'backup', label: lang === 'zh' ? '数据备份与恢复' : 'Backup & Restore', icon: Download }
                      ].map((sec) => (
                        <button
                          key={sec.id}
                          onClick={() => {
                            if (sec.id === 'backup') {
                              requestBackupAccess();
                              return;
                            }
                            setAdminActiveSection(sec.id);
                            if (sec.id === 'about') setAboutSettingsTab('about');
                            setBackupAccessGranted(false);
                            resetAdminEditors();
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
                            adminActiveSection === sec.id
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <sec.icon size={15} />
                          <span>{sec.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAdminLogout}
                    className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut size={14} />
                    <span>{lang === 'zh' ? '安全退出后台' : 'Sign Out Console'}</span>
                  </button>
                </div>

                {/* Admin Editor Panel Body */}
                <div className="flex-grow p-6 md:p-8 lg:p-10 space-y-6 max-h-[750px] overflow-y-auto">
                  
                  {/* SUCCESS BANNER */}
                  {adminSuccessMessage && (
                    <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <CheckCircle size={16} className="shrink-0" />
                      <span>{adminSuccessMessage}</span>
                    </div>
                  )}

                  {backupReauthOpen && (
                    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-white rounded-2xl border border-amber-200 shadow-2xl p-6 space-y-5 animate-fade-in">
                        <div className="text-center space-y-3">
                          <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                            <Lock size={28} />
                          </div>
                          <h2 className="text-lg font-extrabold text-gray-900">
                            {lang === 'zh' ? '请再次验证管理员身份' : 'Re-enter Admin Login'}
                          </h2>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {lang === 'zh'
                              ? '备份与恢复包含 GitHub Token、同步开关、导入和重置等高风险设置。请重新输入管理员密码后才可进入。'
                              : 'Backup & Restore contains sensitive GitHub token, sync toggle, import, and reset controls. Please re-enter the admin password to continue.'}
                          </p>
                        </div>

                        <form onSubmit={handleBackupReauth} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                              {lang === 'zh' ? '管理员密码' : 'Admin Password'}
                            </label>
                            <input
                              type="password"
                              value={backupPasswordInput}
                              onChange={(e) => setBackupPasswordInput(e.target.value)}
                              placeholder="••••••••"
                              autoFocus
                              required
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm transition-all"
                            />
                          </div>

                          {backupLoginError && (
                            <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 flex items-center gap-1.5">
                              <AlertTriangle size={14} className="shrink-0" />
                              <span>{backupLoginError}</span>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setBackupReauthOpen(false);
                                setBackupPasswordInput('');
                                setBackupLoginError('');
                              }}
                              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-all"
                            >
                              {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                              <Shield size={14} />
                              <span>{lang === 'zh' ? '验证并进入' : 'Verify & Open'}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {adminActiveSection !== 'backup' && (
                    <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${autoSaveStatus === 'saving'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : autoSaveStatus === 'success'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : autoSaveStatus === 'error'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : autoSaveToGithub && githubPat && githubRepo
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {autoSaveStatus === 'saving' ? (
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : autoSaveStatus === 'success' ? (
                        <CheckCircle size={15} className="shrink-0" />
                      ) : autoSaveStatus === 'error' ? (
                        <AlertTriangle size={15} className="shrink-0" />
                      ) : (
                        <Download size={15} className="shrink-0" />
                      )}
                      <span>
                        {autoSaveMessage || (autoSaveToGithub && githubPat && githubRepo
                          ? (lang === 'zh' ? 'GitHub 自动同步已启用。保存内容时会自动同步。' : 'GitHub auto-sync is enabled. Saves will sync automatically.')
                          : (lang === 'zh' ? 'GitHub 自动同步未启用；设置仅在“备份与恢复”中管理。' : 'GitHub auto-sync is not enabled; settings are managed only in Backup & Restore.'))}
                      </span>
                    </div>
                  )}

                  {/* SECTION 1: SETTINGS */}
                  {adminActiveSection === 'settings' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '基本信息与颜色设置' : 'General Settings & Brand Color'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '修改教会的中英文名称、标语、主题、配色等' : 'Modify church name, slogan, description, and website theme color'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        
                        {/* Church Name Chinese */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">教会名称 (中文)</label>
                          <input 
                            type="text"
                            value={data.settings.churchName.zh}
                            onChange={(e) => updateSetting('churchName', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Church Name English */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Church Name (English)</label>
                          <input 
                            type="text"
                            value={data.settings.churchName.en}
                            onChange={(e) => updateSetting('churchName', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

{/* Header Logo */}
                        <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                              {data.settings.headerLogo ? (
                                <img src={data.settings.headerLogo} alt="Header logo preview" className="w-full h-full object-contain p-1" />
                              ) : (
                                <div className="bg-primary text-white p-2 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m-6-8h12" /></svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-gray-800 mb-1">
                                {lang === 'zh' ? '顶部菜单教会标志 / Header Logo' : 'Header Church Logo / 顶部菜单教会标志'}
                              </label>
                              <p className="text-[10px] text-gray-500 leading-relaxed">
                                {lang === 'zh' ? '上传后将取代顶部左侧的绿色十字标志。支持 PNG、JPG、WebP 或 GIF；图片会自动缩小并随网站设置一同保存。' : 'Uploading replaces the green cross at the top-left. PNG, JPG, WebP, and GIF are supported; the image is resized and saved with the site settings.'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="cursor-pointer px-3 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all flex items-center gap-1.5">
                              <Upload size={14} />
                              <span>{lang === 'zh' ? '上传标志图片' : 'Upload Logo Image'}</span>
                              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleHeaderLogoUpload} className="hidden" />
                            </label>
                            {data.settings.headerLogo && (
                              <button type="button" onClick={() => updateSetting('headerLogo', null, '')} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all flex items-center gap-1.5">
                                <Trash2 size={14} />
                                <span>{lang === 'zh' ? '恢复绿色十字' : 'Restore Green Cross'}</span>
                              </button>
                            )}
                          </div>
                          {logoUploadError && <p className="text-[11px] text-red-600">{logoUploadError}</p>}
                        </div>

                        {/* Church Abbreviation */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">教会简称 / Abbreviation (e.g. BMBCC)</label>
                          <input
                            type="text"
                            value={data.settings.churchAbbreviation || ''}
                            onChange={(e) => updateSetting('churchAbbreviation', null, e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Church Tagline/Subtitle */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '教会副标题 (中文)' : 'Church Tagline (Chinese)'}</label>
                          <input
                            type="text"
                            value={data.settings.churchTagline?.zh || ''}
                            onChange={(e) => updateSetting('churchTagline', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Church Tagline (English)</label>
                          <input
                            type="text"
                            value={data.settings.churchTagline?.en || ''}
                            onChange={(e) => updateSetting('churchTagline', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Church Slogan Chinese */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">主页核心标语 (中文)</label>
                          <input 
                            type="text"
                            value={data.settings.slogan.zh}
                            onChange={(e) => updateSetting('slogan', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Church Slogan English */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Main Slogan (English)</label>
                          <input 
                            type="text"
                            value={data.settings.slogan.en}
                            onChange={(e) => updateSetting('slogan', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div></div>

                        {/* Theme Year Vision Chinese */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">年度主题异象 (中文)</label>
                          <textarea 
                            rows={2}
                            value={data.settings.themeYear.zh}
                            onChange={(e) => updateSetting('themeYear', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Theme Year Vision English */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Theme/Vision Text (English)</label>
                          <textarea 
                            rows={2}
                            value={data.settings.themeYear.en}
                            onChange={(e) => updateSetting('themeYear', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Slogan Description Chinese */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">主页欢迎引导词 (中文)</label>
                          <textarea 
                            rows={2}
                            value={data.settings.description.zh}
                            onChange={(e) => updateSetting('description', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Slogan Description English */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Welcome Description (English)</label>
                          <textarea 
                            rows={2}
                            value={data.settings.description.en}
                            onChange={(e) => updateSetting('description', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* ===== Bottom CTA Banner ===== */}
                        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Heart size={14} className="text-primary" /> {lang === 'zh' ? '首页底部 CTA 横幅' : 'Home Bottom CTA Banner'}</h3>
                          <p className="text-[10px] text-gray-500 mb-3">{lang === 'zh' ? '“耶稣爱你，我们欢迎你！” 区域的标题和描述' : 'Edit title and description of the bottom welcome banner'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">底部 CTA 标题 (中文)</label>
                          <input type="text" value={data.settings.ctaTitle?.zh || ''} onChange={(e) => updateSetting('ctaTitle','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Bottom CTA Title (English)</label>
                          <input type="text" value={data.settings.ctaTitle?.en || ''} onChange={(e) => updateSetting('ctaTitle','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">底部 CTA 描述 (中文)</label>
                          <textarea rows={3} value={data.settings.ctaDescription?.zh || ''} onChange={(e) => updateSetting('ctaDescription','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Bottom CTA Description (English)</label>
                          <textarea rows={3} value={data.settings.ctaDescription?.en || ''} onChange={(e) => updateSetting('ctaDescription','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Contact details */}
                        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3">{lang === 'zh' ? '联系信息' : 'Contact Information'}</h3>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">联系电话 / Hotline Phone</label>
                          <input 
                            type="text"
                            value={data.settings.contactPhone}
                            onChange={(e) => updateSetting('contactPhone', null, e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">电子邮箱 / Email Address</label>
                          <input 
                            type="email"
                            value={data.settings.contactEmail}
                            onChange={(e) => updateSetting('contactEmail', null, e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">教会地址 / Church Address</label>
                          <input 
                            type="text"
                            value={data.settings.contactAddress}
                            onChange={(e) => updateSetting('contactAddress', null, e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        {/* Admin password change setting temporarily hidden.
                            Password rotation is handled in Cloudflare Pages secrets. */}
                                                {/* SHOW LOGIN BUTTON TOGGLE */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            {lang === 'zh' ? '显示登录按钮 / Show Login Button' : 'Show Login Button / 显示登录按钮'}
                          </label>
                          <p className="text-[10px] text-gray-500 mb-2">
                            {lang === 'zh'
                              ? '关闭后，登录按钮将从导航栏隐藏，提高安全性。仍可通过网址 #/admin 访问。'
                              : 'When disabled, the login button will be hidden from navigation for better security. You can still access admin via URL #/admin'}
                          </p>
                          <button
                            onClick={() => updateSetting('showLoginButton', null, !data.settings.showLoginButton)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                              data.settings.showLoginButton
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                          >
                            <Shield size={14} />
                            <span>
                              {data.settings.showLoginButton
                                ? (lang === 'zh' ? '✓ 登录按钮已显示' : '✓ Login Button Visible')
                                : (lang === 'zh' ? '✗ 登录按钮已隐藏' : '✗ Login Button Hidden')}
                            </span>
                          </button>
                          <p className="text-[10px] text-amber-600 mt-2 font-medium">
                            {lang === 'zh'
                              ? '💡 提示：访问后台管理网址 = 您的网站网址 + #/admin'
                              : '💡 Tip: Admin access URL = your site URL + #/admin'}
                          </p>
                        </div>

                        {/* PAGE VISIBILITY TOGGLES */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <label className="block text-xs font-bold text-gray-800 mb-3 uppercase tracking-wide">
                            {lang === 'zh' ? '页面显示控制 / Page Visibility' : 'Page Visibility / 页面显示控制'}
                          </label>
                          <p className="text-[10px] text-gray-500 mb-3">
                            {lang === 'zh' ? '关闭不需要的页面，它们将从导航菜单中隐藏' : 'Toggle off pages you don\'t need - they will be hidden from the navigation menu'}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {[
                              { key: 'ministries', zh: '主要事工', en: 'Ministries' },
                              { key: 'timetable', zh: '聚会时间', en: 'Timetable' },
                              { key: 'events', zh: '特别活动', en: 'Events' },
                              { key: 'offerings', zh: '奉献', en: 'Offerings' },
                              { key: 'bulletins', zh: '周报与讲道', en: 'Bulletins & Sermons' },
                              { key: 'services', zh: '崇拜与敬拜', en: 'Services & Worships' },
                              { key: 'cellgroups', zh: '小组', en: 'Cell Groups' },
                              { key: 'newfriend', zh: '新朋友指南', en: 'New Friend Guide' },
                              { key: 'maps', zh: '地图', en: 'Maps' }
                            ].map((page) => {
                              const isVisible = (data.pageVisibility || {})[page.key] !== false;
                              return (
                                <button
                                  key={page.key}
                                  onClick={() => togglePageVisibility(page.key)}
                                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left ${
                                    isVisible
                                      ? 'border-primary bg-primary/5 text-primary'
                                      : 'border-gray-200 bg-gray-50 text-gray-400'
                                  }`}
                                >
                                  <div className={`w-3 h-3 rounded-full border-2 ${
                                    isVisible ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                                  }`}>
                                    {isVisible && <Check size={10} className="text-white" />}
                                  </div>
                                  <span className="text-[10px] text-center font-medium">{lang === 'zh' ? page.zh : page.en}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* EVENT POP-UP SETTINGS */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <div className="flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">{lang === 'zh' ? '活动弹窗提醒 / Event Alert Pop-up' : 'Event Alert Pop-up / 活动弹窗提醒'}</label>
                              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{lang === 'zh' ? '开启后，访客每次打开网站都会看到活动提醒；有多个活动时可左右切换。' : 'When enabled, visitors see an event alert every time they open the website. Multiple events can be browsed like a carousel.'}</p>
                            </div>
                            <button type="button" role="switch" aria-checked={data.settings.eventPopupEnabled === true} onClick={() => updateSetting('eventPopupEnabled', null, !data.settings.eventPopupEnabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${data.settings.eventPopupEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${data.settings.eventPopupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>

                        {/* OVERALL TEXT SIZE */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <label htmlFor="overall-text-size" className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                                  {lang === 'zh' ? '整体文字大小 / Overall Text Size' : 'Overall Text Size / 整体文字大小'}
                                </label>
                                <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                                  {lang === 'zh' ? '调整网站所有页面的整体文字大小，保存后会立即生效。' : 'Adjust the overall text size across every page. Changes take effect immediately.'}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-primary shadow-sm border border-primary/10">
                                {data.settings.textScale || 100}%
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                              <span className="text-[10px] text-gray-500" aria-hidden="true">A</span>
                              <input
                                id="overall-text-size"
                                type="range"
                                min="80"
                                max="140"
                                step="5"
                                value={data.settings.textScale || 100}
                                onChange={(e) => updateSetting('textScale', null, Number(e.target.value))}
                                className="h-2 w-full cursor-pointer accent-primary"
                                aria-label={lang === 'zh' ? '整体文字大小' : 'Overall text size'}
                              />
                              <span className="text-lg font-semibold text-gray-700" aria-hidden="true">A</span>
                            </div>
                            <div className="mt-1 flex justify-between pl-5 text-[10px] text-gray-400">
                              <span>{lang === 'zh' ? '较小' : 'Smaller'}</span>
                              <span>{lang === 'zh' ? '默认' : 'Default'}</span>
                              <span>{lang === 'zh' ? '较大' : 'Larger'}</span>
                            </div>
                          </div>
                        </div>

                        {/* FONT FAMILY SETTINGS */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <div>
                              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">{lang === 'zh' ? '字体类型 / Font Type' : 'Font Type / 字体类型'}</h3>
                              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{lang === 'zh' ? '分别选择中文和英文版网站的字体。切换网站语言即可预览相应字体。' : 'Choose separate typefaces for the Chinese and English versions. Switch the site language to preview each typeface.'}</p>
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label htmlFor="font-family-zh" className="mb-1 block text-xs font-bold text-gray-700">中文字体 / Chinese Font</label>
                                <select id="font-family-zh" value={data.settings.fontFamilyZh || 'noto-sans-sc'} onChange={(e) => updateSetting('fontFamilyZh', null, e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                                  {fontFamilyOptions.zh.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <label htmlFor="font-family-en" className="mb-1 block text-xs font-bold text-gray-700">English Font / 英文字体</label>
                                <select id="font-family-en" value={data.settings.fontFamilyEn || 'inter'} onChange={(e) => updateSetting('fontFamilyEn', null, e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                                  {fontFamilyOptions.en.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SELECT BRAND COLOR Theme */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <label className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wide">
                            网站主题品牌主色调 / Web Brand Theme Color (Custom CSS Variables)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {Object.keys(colorsMap).map((colorKey) => {
                              const active = data.settings.themeColor === colorKey;
                              return (
                                <button
                                  key={colorKey}
                                  onClick={() => updateSetting('themeColor', null, colorKey)}
                                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left ${
                                    active
                                      ? 'ring-2 ring-primary border-primary bg-primary/5 font-bold'
                                      : 'border-gray-200 bg-white hover:border-gray-400'
                                  }`}
                                >
                                  {/* Color Block */}
                                  <div className="w-8 h-8 rounded-full border border-gray-200/50" style={{
                                    backgroundColor: `rgb(${colorsMap[colorKey].primary})`
                                  }} />
                                  <span className="text-[10px] text-gray-700 text-center">{colorsMap[colorKey].name}</span>
                                  {active && <CheckCircle size={13} className="text-primary" />}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-800">{lang === 'zh' ? '自由选择自定义颜色' : 'Pick a custom colour'}</p>
                              <p className="mt-1 text-[10px] text-gray-500">{lang === 'zh' ? '使用颜色选择器调整品牌色，所有 CSS 变量会即时更新。' : 'Use the picker to freely adjust the brand colour. CSS variables update instantly.'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="color" aria-label="Custom brand color" value={data.settings.customThemeColor || '#10b981'} onChange={(e) => { updateSetting('customThemeColor', null, e.target.value); updateSetting('themeColor', null, 'custom'); }} className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1" />
                              <input type="text" aria-label="Custom brand hex color" value={data.settings.customThemeColor || '#10b981'} onChange={(e) => { const value = e.target.value; if (/^#?[0-9a-f]{6}$/i.test(value)) { const hex = value.startsWith('#') ? value : `#${value}`; updateSetting('customThemeColor', null, hex); updateSetting('themeColor', null, 'custom'); } }} placeholder="#10B981" className="w-24 rounded border border-gray-300 px-2 py-2 text-xs font-mono uppercase" />
                            </div>
                          </div>
                        </div>

                        {/* ===== Footer Sections & Text Settings ===== */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Info size={14} className="text-primary" /> {lang === 'zh' ? '页脚栏目与内容设置 (Combined Service, 联系与到访等)' : 'Footer Sections & Content Settings'}</h3>
                          <p className="text-[10px] text-gray-500 mb-3">{lang === 'zh' ? '在此完整编辑页脚各栏目的标题、崇拜时间说明、简介及版权声明' : 'Edit footer column titles, service schedules, intro description, and copyright'}</p>
                        </div>

                        {/* Footer Description (Col 1) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '页脚教会简介 (中文)' : 'Footer Church Description (Chinese)'}</label>
                          <textarea rows={3} value={data.settings.footerDescription?.zh || ''} onChange={(e) => updateSetting('footerDescription', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Footer Church Description (English)</label>
                          <textarea rows={3} value={data.settings.footerDescription?.en || ''} onChange={(e) => updateSetting('footerDescription', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Footer Nav Title (Col 2) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '网站导航栏目标题 (中文)' : 'Navigation Title (Chinese)'}</label>
                          <input type="text" value={data.settings.footerNavTitle?.zh || ''} onChange={(e) => updateSetting('footerNavTitle', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Navigation Title (English)</label>
                          <input type="text" value={data.settings.footerNavTitle?.en || ''} onChange={(e) => updateSetting('footerNavTitle', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Combined Service Title (Col 3) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '核心崇拜栏目标题 (中文)' : 'Combined Service Title (Chinese)'}</label>
                          <input type="text" value={data.settings.footerServiceTitle?.zh || ''} onChange={(e) => updateSetting('footerServiceTitle', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Combined Service Title (English)</label>
                          <input type="text" value={data.settings.footerServiceTitle?.en || ''} onChange={(e) => updateSetting('footerServiceTitle', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Service Name */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '崇拜名称 (中文)' : 'Service Name (Chinese)'}</label>
                          <input type="text" value={data.settings.footerServiceName?.zh || ''} onChange={(e) => updateSetting('footerServiceName', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Service Name (English)</label>
                          <input type="text" value={data.settings.footerServiceName?.en || ''} onChange={(e) => updateSetting('footerServiceName', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Service Time */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '崇拜时间 (中文)' : 'Service Time (Chinese)'}</label>
                          <input type="text" value={data.settings.footerServiceTime?.zh || ''} onChange={(e) => updateSetting('footerServiceTime', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Service Time (English)</label>
                          <input type="text" value={data.settings.footerServiceTime?.en || ''} onChange={(e) => updateSetting('footerServiceTime', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Service Location */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '崇拜地点/直播说明 (中文)' : 'Service Location (Chinese)'}</label>
                          <input type="text" value={data.settings.footerServiceLocation?.zh || ''} onChange={(e) => updateSetting('footerServiceLocation', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Service Location (English)</label>
                          <input type="text" value={data.settings.footerServiceLocation?.en || ''} onChange={(e) => updateSetting('footerServiceLocation', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Contact Us Title (Col 4) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '联系栏目标题 (中文)' : 'Contact Title (Chinese)'}</label>
                          <input type="text" value={data.settings.footerContactTitle?.zh || ''} onChange={(e) => updateSetting('footerContactTitle', 'zh', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Contact Title (English)</label>
                          <input type="text" value={data.settings.footerContactTitle?.en || ''} onChange={(e) => updateSetting('footerContactTitle', 'en', e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Copyright & Tagline */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '版权声明 (中文)' : 'Copyright Notice (Chinese)'}</label>
                          <input
                            type="text"
                            value={data.settings.footerCopyright?.zh || ''}
                            onChange={(e) => updateSetting('footerCopyright', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Copyright Notice (English)</label>
                          <input
                            type="text"
                            value={data.settings.footerCopyright?.en || ''}
                            onChange={(e) => updateSetting('footerCopyright', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '网站标语 (中文)' : 'Website Tagline (Chinese)'}</label>
                          <input
                            type="text"
                            value={data.settings.footerTagline?.zh || ''}
                            onChange={(e) => updateSetting('footerTagline', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Website Tagline (English)</label>
                          <input
                            type="text"
                            value={data.settings.footerTagline?.en || ''}
                            onChange={(e) => updateSetting('footerTagline', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: CAROUSEL SLIDES */}
                  {adminActiveSection === 'carousel' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '横幅大图轮播管理' : 'Carousel Slide Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '在此管理网站主页顶部的巨型幻灯片轮播图片和文字' : 'Upload or edit image URL and captions of homepage banner slides'}</p>
                        </div>
                        {editingSlide === null && (
                          <button
                            onClick={() => setEditingSlide({
                              id: 'new',
                              image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80',
                              title: { zh: '新标题名称', en: 'New Slide Title' },
                              subtitle: { zh: '这里写一些描述性副文本，引人瞩目。', en: 'Add descriptive subtitle here to captivate users.' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加新幻灯片' : 'Add New Slide'}</span>
                          </button>
                        )}
                      </div>

                      {editingSlide ? (
                        /* Edit/New form */
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingSlide.id === 'new' ? (lang === 'zh' ? '新建幻灯片' : 'Create New Slide') : (lang === 'zh' ? '编辑幻灯片' : 'Edit Slide')}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">图片链接 / Image URL</label>
                              <input 
                                type="text"
                                value={editingSlide.image}
                                onChange={(e) => setEditingSlide({ ...editingSlide, image: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                {lang === 'zh' ? '支持直接黏贴Unsplash或任何公网可访问的图片链接' : 'Paste Unsplash or any direct public image URL'}
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">幻灯片大标题 (中文)</label>
                              <input 
                                type="text"
                                value={editingSlide.title.zh}
                                onChange={(e) => setEditingSlide({
                                  ...editingSlide,
                                  title: { ...editingSlide.title, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Slide Title (English)</label>
                              <input 
                                type="text"
                                value={editingSlide.title.en}
                                onChange={(e) => setEditingSlide({
                                  ...editingSlide,
                                  title: { ...editingSlide.title, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">副标题文本 / 圣经金句 (中文)</label>
                              <textarea 
                                rows={3}
                                value={editingSlide.subtitle.zh}
                                onChange={(e) => setEditingSlide({
                                  ...editingSlide,
                                  subtitle: { ...editingSlide.subtitle, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Slide Subtitle / Scripture (English)</label>
                              <textarea 
                                rows={3}
                                value={editingSlide.subtitle.en}
                                onChange={(e) => setEditingSlide({
                                  ...editingSlide,
                                  subtitle: { ...editingSlide.subtitle, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => setEditingSlide(null)}
                              className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all"
                            >
                              {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleSaveSlide(editingSlide)}
                              className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"
                            >
                              <Save size={13} />
                              <span>{lang === 'zh' ? '保存幻灯片' : 'Save Slide'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Carousel Slide list */
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {data.carousel.map((slide, idx) => (
                            <div key={slide.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                              <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-3/4">
                                <img src={slide.image} alt="Preview" className="w-24 h-16 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1 text-center sm:text-left">
                                  <h4 className="font-bold text-sm text-gray-900">{slide.title.zh} / {slide.title.en}</h4>
                                  <p className="text-xs text-gray-500 font-light line-clamp-1">{slide.subtitle.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full md:w-auto">
                                <button
                                  onClick={() => handleMoveSlide(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleMoveSlide(idx, 'down')}
                                  disabled={idx === data.carousel.length - 1}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingSlide(slide)}
                                  className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlide(slide.id)}
                                  className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 3: TIMETABLE WEEKLY SERVICES */}
                  {adminActiveSection === 'timetable' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '聚会时间表日程管理' : 'Weekly Services Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理周间的所有定期崇拜、青年团契、主日学、祷告会等日程时间' : 'Add or modify regular schedules like Sunday combined worship services, prayer meetings'}</p>
                        </div>
                        {editingTimetable === null && (
                          <button
                            onClick={() => setEditingTimetable({
                              id: 'new',
                              name: { zh: '主日崇拜聚会', en: 'Sunday Worship Service' },
                              day: { zh: '星期日', en: 'Sunday' },
                              time: '10:00 AM',
                              location: { zh: '教会主堂', en: 'Main Sanctuary' },
                              language: { zh: '华语 (闽南语翻译)', en: 'Mandarin (Hokkien translation)' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加新日程' : 'Add New Service'}</span>
                          </button>
                        )}
                      </div>

                      {/* Timetable Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.timetableBadge?.zh || ''} onChange={(e) => updateSetting('timetableBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="与我们一同朝见神与相聚" />
                              <input type="text" value={data.settings.timetableBadge?.en || ''} onChange={(e) => updateSetting('timetableBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Fellowship & Grow Together" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.timetableTitle?.zh || ''} onChange={(e) => updateSetting('timetableTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="周聚会与崇拜时间表" />
                              <input type="text" value={data.settings.timetableTitle?.en || ''} onChange={(e) => updateSetting('timetableTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Weekly Services & Timetable" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.timetableIntro?.zh || ''} onChange={(e) => updateSetting('timetableIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.timetableIntro?.en || ''} onChange={(e) => updateSetting('timetableIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingTimetable ? (
                        /* Edit Timetable Form */
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingTimetable.id === 'new' ? (lang === 'zh' ? '新增定期聚会' : 'Add Regular Meeting') : (lang === 'zh' ? '编辑聚会安排' : 'Edit Weekly Meeting')}
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">聚会名称 (中文)</label>
                              <input
                                type="text"
                                value={editingTimetable.name.zh}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  name: { ...editingTimetable.name, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Service/Meeting Name (English)</label>
                              <input
                                type="text"
                                value={editingTimetable.name.en}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  name: { ...editingTimetable.name, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">聚会星期/频次 (中文 - 例如: 星期日, 每周五)</label>
                              <input
                                type="text"
                                value={editingTimetable.day.zh}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  day: { ...editingTimetable.day, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Meeting Day / Frequency (English)</label>
                              <input
                                type="text"
                                value={editingTimetable.day.en}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  day: { ...editingTimetable.day, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">具体时间段 / Exact Time Frame (e.g. 10:00 AM - 11:30 AM)</label>
                              <input
                                type="text"
                                value={editingTimetable.time}
                                onChange={(e) => setEditingTimetable({ ...editingTimetable, time: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">聚会语言 (中文 - 例如: 华语/双语)</label>
                              <input
                                type="text"
                                value={editingTimetable.language.zh}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  language: { ...editingTimetable.language, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Language Used (English)</label>
                              <input
                                type="text"
                                value={editingTimetable.language.en}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  language: { ...editingTimetable.language, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">聚会地点/方式 (中文)</label>
                              <input
                                type="text"
                                value={editingTimetable.location.zh}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  location: { ...editingTimetable.location, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Location / Format (English)</label>
                              <input
                                type="text"
                                value={editingTimetable.location.en}
                                onChange={(e) => setEditingTimetable({
                                  ...editingTimetable,
                                  location: { ...editingTimetable.location, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => setEditingTimetable(null)}
                              className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all"
                            >
                              {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleSaveTimetable(editingTimetable)}
                              className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"
                            >
                              <Save size={13} />
                              <span>{lang === 'zh' ? '保存日程' : 'Save Schedule'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Timetable Grid list for edit */
                        <div className="overflow-x-auto pt-4 border-t border-gray-100">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase">
                                <th className="p-3">{lang === 'zh' ? '日程项目' : 'Name'}</th>
                                <th className="p-3">{lang === 'zh' ? '星期 & 时间' : 'Day & Time'}</th>
                                <th className="p-3">{lang === 'zh' ? '地点' : 'Location'}</th>
                                <th className="p-3 text-right">{lang === 'zh' ? '操作' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {data.timetable.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50 text-gray-700">
                                  <td className="p-3 font-bold text-gray-900">{item.name.zh} / {item.name.en}</td>
                                  <td className="p-3">
                                    <span className="font-bold text-primary mr-1 bg-primary/10 px-1 py-0.5 rounded">{item.day.zh}</span>
                                    <span>{item.time}</span>
                                  </td>
                                  <td className="p-3 text-gray-500">{item.location.zh}</td>
                                  <td className="p-3">
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => handleMoveItem('timetable', idx, 'up')}
                                        disabled={idx === 0}
                                        title={lang === 'zh' ? '上移' : 'Move up'}
                                        className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                      >
                                        <ArrowUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleMoveItem('timetable', idx, 'down')}
                                        disabled={idx === data.timetable.length - 1}
                                        title={lang === 'zh' ? '下移' : 'Move down'}
                                        className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                      >
                                        <ArrowDown size={13} />
                                      </button>
                                      <button
                                        onClick={() => setEditingTimetable(item)}
                                        className="p-1 rounded border border-blue-250 text-blue-600 hover:bg-blue-50"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTimetable(item.id)}
                                        className="p-1 rounded border border-red-250 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 4: MINISTRIES */}
                  {adminActiveSection === 'ministries' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '社区核心事工文案' : 'Ministries Content Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '编辑大山脚浸信教会的核心事工（如爱邻社区关怀、五饼二鱼、老人中心等）介绍文案和卡片图片' : 'Edit core church service ministries, descriptions, and display graphics'}</p>
                        </div>
                        {editingMinistry === null && (
                          <button
                            onClick={() => setEditingMinistry({
                              id: 'new',
                              name: { zh: '新核心事工', en: 'New Core Ministry' },
                              image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80',
                              description: { zh: '这儿填写事工的中文具体描述介绍。', en: 'Fill out detail ministry description in English.' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加新事工' : 'Add New Ministry'}</span>
                          </button>
                        )}
                      </div>

                      {/* Ministries Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.ministriesBadge?.zh || ''} onChange={(e) => updateSetting('ministriesBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="走入人群，服侍弱势" />
                              <input type="text" value={data.settings.ministriesBadge?.en || ''} onChange={(e) => updateSetting('ministriesBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Outreach & Community Service" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.ministriesTitle?.zh || ''} onChange={(e) => updateSetting('ministriesTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="教会事工介绍" />
                              <input type="text" value={data.settings.ministriesTitle?.en || ''} onChange={(e) => updateSetting('ministriesTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Our Ministries" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.ministriesIntro?.zh || ''} onChange={(e) => updateSetting('ministriesIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.ministriesIntro?.en || ''} onChange={(e) => updateSetting('ministriesIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingMinistry ? (
                        /* Edit Ministry form */
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingMinistry.id === 'new' ? (lang === 'zh' ? '新增核心事工' : 'Add Core Ministry') : (lang === 'zh' ? '编辑核心事工' : 'Edit Core Ministry')}
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">图片链接 / Image URL</label>
                              <input 
                                type="text"
                                value={editingMinistry.image}
                                onChange={(e) => setEditingMinistry({ ...editingMinistry, image: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">事工名称 (中文)</label>
                              <input 
                                type="text"
                                value={editingMinistry.name.zh}
                                onChange={(e) => setEditingMinistry({
                                  ...editingMinistry,
                                  name: { ...editingMinistry.name, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Ministry Name (English)</label>
                              <input 
                                type="text"
                                value={editingMinistry.name.en}
                                onChange={(e) => setEditingMinistry({
                                  ...editingMinistry,
                                  name: { ...editingMinistry.name, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">事工详细介绍 (中文)</label>
                              <textarea
                                rows={4}
                                value={editingMinistry.description.zh}
                                onChange={(e) => setEditingMinistry({
                                  ...editingMinistry,
                                  description: { ...editingMinistry.description, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Ministry Description (English)</label>
                              <textarea
                                rows={4}
                                value={editingMinistry.description.en}
                                onChange={(e) => setEditingMinistry({
                                  ...editingMinistry,
                                  description: { ...editingMinistry.description, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => setEditingMinistry(null)}
                              className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all"
                            >
                              {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleSaveMinistry(editingMinistry)}
                              className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"
                            >
                              <Save size={13} />
                              <span>{lang === 'zh' ? '保存事工' : 'Save Ministry'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Ministry list */
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {data.ministries.map((min, idx) => (
                            <div key={min.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <img src={min.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{min.name.zh} / {min.name.en}</h4>
                                  <p className="text-xs text-gray-500 font-light line-clamp-1">{min.description.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button
                                  onClick={() => handleMoveItem('ministries', idx, 'up')}
                                  disabled={idx === 0}
                                  title={lang === 'zh' ? '上移' : 'Move up'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleMoveItem('ministries', idx, 'down')}
                                  disabled={idx === data.ministries.length - 1}
                                  title={lang === 'zh' ? '下移' : 'Move down'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingMinistry(min)}
                                  className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMinistry(min.id)}
                                  className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 5: EVENTS */}
                  {adminActiveSection === 'events' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '特别/近期活动内容管理' : 'Events Post Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '在这里发布新活动通告、修改庆典、营会、健康检查等活动讯息' : 'Publish or update special holiday activities, camps, charity events, medical checks'}</p>
                          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                            <input type="checkbox" checked={data.settings.eventPopupEnabled === true} onChange={(e) => updateSetting('eventPopupEnabled', null, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <span>{lang === 'zh' ? '访客每次打开网站时显示活动弹窗' : 'Show event pop-up whenever visitors open the website'}</span>
                          </label>
                        </div>
                        {editingEvent === null && (
                          <button
                            onClick={() => setEditingEvent({
                              id: 'new',
                              title: { zh: '新活动发布标题', en: 'New Special Event' },
                              date: new Date().toISOString().slice(0, 10),
                              time: '9:00 AM - 12:00 PM',
                              location: { zh: '教会礼堂', en: 'Church Hall' },
                              image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
                              popupEnabled: false,
                              description: { zh: '在此处填写新活动详情和报名信息。', en: 'Write detail registration or information here.' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '发布新活动' : 'Publish Event'}</span>
                          </button>
                        )}
                      </div>

                      {/* Events Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.eventsBadge?.zh || ''} onChange={(e) => updateSetting('eventsBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="教会精彩纪实与未来计划" />
                              <input type="text" value={data.settings.eventsBadge?.en || ''} onChange={(e) => updateSetting('eventsBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Highlights & Upcoming Outlines" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.eventsTitle?.zh || ''} onChange={(e) => updateSetting('eventsTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="特别活动预告" />
                              <input type="text" value={data.settings.eventsTitle?.en || ''} onChange={(e) => updateSetting('eventsTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Special Events" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.eventsIntro?.zh || ''} onChange={(e) => updateSetting('eventsIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.eventsIntro?.en || ''} onChange={(e) => updateSetting('eventsIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingEvent ? (
                        /* Edit Event Form */
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingEvent.id === 'new' ? (lang === 'zh' ? '发布全新特别活动' : 'Publish New Activity') : (lang === 'zh' ? '编辑特别活动文案' : 'Edit Event Content')}
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">配图链接 / Cover Image URL</label>
                              <input 
                                type="text"
                                value={editingEvent.image}
                                onChange={(e) => setEditingEvent({ ...editingEvent, image: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">活动标题 (中文)</label>
                              <input 
                                type="text"
                                value={editingEvent.title.zh}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  title: { ...editingEvent.title, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Event Title (English)</label>
                              <input 
                                type="text"
                                value={editingEvent.title.en}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  title: { ...editingEvent.title, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">活动日期 / Event Date (例如: 2026-08-15)</label>
                              <input
                                type="date"
                                value={editingEvent.date}
                                onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">具体时间段 / Specific Time Frame</label>
                              <input
                                type="text"
                                value={editingEvent.time}
                                onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">举办具体地点 (中文)</label>
                              <input
                                type="text"
                                value={editingEvent.location.zh}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  location: { ...editingEvent.location, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">Event Location (English)</label>
                              <input
                                type="text"
                                value={editingEvent.location.en}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  location: { ...editingEvent.location, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">活动详细文案 (中文)</label>
                              <textarea 
                                rows={4}
                                value={editingEvent.description.zh}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  description: { ...editingEvent.description, zh: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">Event Detail Description (English)</label>
                              <textarea 
                                rows={4}
                                value={editingEvent.description.en}
                                onChange={(e) => setEditingEvent({
                                  ...editingEvent,
                                  description: { ...editingEvent.description, en: e.target.value }
                                })}
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={editingEvent.popupEnabled === true}
                                  onChange={(e) => setEditingEvent({ ...editingEvent, popupEnabled: e.target.checked })}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{lang === 'zh' ? '在首页弹窗中显示此活动' : 'Show this event in the homepage popup'}</span>
                              </label>
                              <p className="text-[10px] text-gray-400 mt-1 ml-6">{lang === 'zh' ? '仅勾选的活动才会在访客打开网站时以弹窗形式展示' : 'Only events with this checked will appear in the popup when visitors open the website'}</p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => setEditingEvent(null)}
                              className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all"
                            >
                              {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleSaveEvent(editingEvent)}
                              className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"
                            >
                              <Save size={13} />
                              <span>{lang === 'zh' ? '发布活动' : 'Publish Event'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Event list for edit */
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {data.events.map((evt, idx) => (
                            <div key={evt.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <img src={evt.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{evt.title.zh} / {evt.title.en}</h4>
                                  <div className="flex items-center gap-1 text-[11px] text-primary font-bold">
                                    <Calendar size={11} />
                                    <span>{evt.date}</span>
                                    <span className="text-gray-400 font-light">({evt.time})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${evt.popupEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                                      {evt.popupEnabled ? (lang === 'zh' ? '🔔 弹窗' : '🔔 Popup') : (lang === 'zh' ? '静默' : 'Silent')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button
                                  onClick={() => handleMoveItem('events', idx, 'up')}
                                  disabled={idx === 0}
                                  title={lang === 'zh' ? '上移' : 'Move up'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleMoveItem('events', idx, 'down')}
                                  disabled={idx === data.events.length - 1}
                                  title={lang === 'zh' ? '下移' : 'Move down'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingEvent(evt)}
                                  className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}


                  {/* SECTION: ABOUT US SETTINGS */}
                  {adminActiveSection === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '关于我们设置' : 'About Us Settings'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '集中管理关于我们页面、首页异象与牧者同工资料' : 'Manage About Us content, Home Vision, Yearly Vision, and leaders in one place'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-b border-gray-200">
                        {[
                          { id: 'about', zh: '关于我们', en: 'About Us' },
                          { id: 'homeVision', zh: '首页异象', en: 'Home Vision' },
                          { id: 'yearlyVision', zh: '年度异象', en: 'Yearly Vision' },
                          { id: 'leaders', zh: '牧者与同工', en: 'Pastors & Leaders' }
                        ].map((tab) => (
                          <button key={tab.id} type="button" onClick={() => { setAboutSettingsTab(tab.id); setEditingLeader(null); }} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${aboutSettingsTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}>
                            {lang === 'zh' ? tab.zh : tab.en}
                          </button>
                        ))}
                      </div>
                      {aboutSettingsTab !== 'leaders' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {aboutSettingsTab === 'about' && (<>
                        {/* ===== About Page Content ===== */}
                        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Info size={14} className="text-primary" /> {lang === 'zh' ? '关于我们页面内容设置' : 'About Us Page Content Settings'}</h3>
                          <p className="text-[10px] text-gray-500 mb-3">{lang === 'zh' ? '以下内容显示在“关于我们”页面的顶栏小标题、标题、顶部介绍文案、愿景与使命（牧者团队标题请在“牧者与领袖”标签中设置）' : 'Configure About Us top header badges, title, introduction text, and vision & mission cards (leadership team headers are managed in the Pastors & Leaders tab)'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文)</label>
                          <input
                            type="text"
                            value={data.settings.aboutBadge?.zh || ''}
                            onChange={(e) => updateSetting('aboutBadge', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="了解我们大山脚浸信教会"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Header Badge (English)</label>
                          <input
                            type="text"
                            value={data.settings.aboutBadge?.en || ''}
                            onChange={(e) => updateSetting('aboutBadge', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="Get to Know BMBCC"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">页面大标题 Title (中文)</label>
                          <input
                            type="text"
                            value={data.settings.aboutTitle?.zh || ''}
                            onChange={(e) => updateSetting('aboutTitle', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="关于我们"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Page Title (English)</label>
                          <input
                            type="text"
                            value={data.settings.aboutTitle?.en || ''}
                            onChange={(e) => updateSetting('aboutTitle', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="About Us"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">关于我们顶部引言 / Top Intro (中文)</label>
                          <textarea
                            rows={3}
                            value={data.settings.aboutIntro?.zh || ''}
                            onChange={(e) => updateSetting('aboutIntro', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">About Top Intro (English)</label>
                          <textarea
                            rows={3}
                            value={data.settings.aboutIntro?.en || ''}
                            onChange={(e) => updateSetting('aboutIntro', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">教会愿景 Vision (中文)</label>
                          <textarea
                            rows={2}
                            value={data.settings.aboutVision?.zh || ''}
                            onChange={(e) => updateSetting('aboutVision', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Church Vision (English)</label>
                          <textarea
                            rows={2}
                            value={data.settings.aboutVision?.en || ''}
                            onChange={(e) => updateSetting('aboutVision', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">教会使命 Mission (中文)</label>
                          <textarea
                            rows={3}
                            value={data.settings.aboutMission?.zh || ''}
                            onChange={(e) => updateSetting('aboutMission', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Church Mission (English)</label>
                          <textarea
                            rows={3}
                            value={data.settings.aboutMission?.en || ''}
                            onChange={(e) => updateSetting('aboutMission', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                          </>)}
                          {aboutSettingsTab === 'homeVision' && (<>
                        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Sparkles size={14} className="text-primary" /> {lang === 'zh' ? '首页愿景详细段落' : 'Home Vision Paragraphs'}</h3>
                          <p className="text-[10px] text-gray-500 mb-3">{lang === 'zh' ? '显示在首页年度主题与异象卡片下方的两段介绍文字' : 'Two paragraphs shown under Yearly Vision card on Home page'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">首页愿景段落1 (中文)</label>
                          <textarea
                            rows={3}
                            value={data.settings.homeVisionPara1?.zh || ''}
                            onChange={(e) => updateSetting('homeVisionPara1', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Home Vision Para 1 (English)</label>
                          <textarea
                            rows={3}
                            value={data.settings.homeVisionPara1?.en || ''}
                            onChange={(e) => updateSetting('homeVisionPara1', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">首页愿景段落2 (中文)</label>
                          <textarea
                            rows={3}
                            value={data.settings.homeVisionPara2?.zh || ''}
                            onChange={(e) => updateSetting('homeVisionPara2', 'zh', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Home Vision Para 2 (English)</label>
                          <textarea
                            rows={3}
                            value={data.settings.homeVisionPara2?.en || ''}
                            onChange={(e) => updateSetting('homeVisionPara2', 'en', e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

                          </>)}
                          {aboutSettingsTab === 'yearlyVision' && (<>
                        {/* ===== Yearly Vision Image & Scripture Card ===== */}
                        <div className="md:col-span-2 pt-4 mt-2 border-t border-gray-100">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Sparkles size={14} className="text-primary" /> {lang === 'zh' ? '首页 - 年度异象卡片（图片与经文）' : 'Home - Yearly Vision Card (Image & Scripture)'}</h3>
                          <p className="text-[10px] text-gray-500 mb-3">{lang === 'zh' ? '编辑首页年度异象卡片的图片、标签、标题和经文' : 'Edit image, labels, title and scripture of yearly vision card on Home'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">年度异象标签 (中文) - 小药丸标签</label>
                          <input type="text" value={data.settings.yearlyVisionLabel?.zh || ''} onChange={(e) => updateSetting('yearlyVisionLabel','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Yearly Vision Label (English)</label>
                          <input type="text" value={data.settings.yearlyVisionLabel?.en || ''} onChange={(e) => updateSetting('yearlyVisionLabel','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">年度异象标题 (中文) - 大标题</label>
                          <input type="text" value={data.settings.yearlyVisionTitle?.zh || ''} onChange={(e) => updateSetting('yearlyVisionTitle','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Yearly Vision Title (English)</label>
                          <input type="text" value={data.settings.yearlyVisionTitle?.en || ''} onChange={(e) => updateSetting('yearlyVisionTitle','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">年度异象图片链接 / Vision Card Image URL</label>
                          <input type="text" value={data.settings.yearlyVisionImage || ''} onChange={(e) => updateSetting('yearlyVisionImage', null, e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                          <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '建议使用 Unsplash 或公网图片链接，例如老鹰展翅图' : 'Use Unsplash or public image URL, e.g. soaring eagle'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">图片上小标签 (中文) - 如: 展翅高飞 • 广传福音</label>
                          <input type="text" value={data.settings.yearlyVisionBadge?.zh || ''} onChange={(e) => updateSetting('yearlyVisionBadge','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Image Badge (English)</label>
                          <input type="text" value={data.settings.yearlyVisionBadge?.en || ''} onChange={(e) => updateSetting('yearlyVisionBadge','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">经文内容 (中文) - 图片上的金句</label>
                          <textarea rows={3} value={data.settings.yearlyVisionScripture?.zh || ''} onChange={(e) => updateSetting('yearlyVisionScripture','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Scripture Text (English)</label>
                          <textarea rows={3} value={data.settings.yearlyVisionScripture?.en || ''} onChange={(e) => updateSetting('yearlyVisionScripture','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">经文出处 (中文) - 如: 约翰福音 3:16</label>
                          <input type="text" value={data.settings.yearlyVisionRef?.zh || ''} onChange={(e) => updateSetting('yearlyVisionRef','zh',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Scripture Reference (English) - e.g. John 3:16</label>
                          <input type="text" value={data.settings.yearlyVisionRef?.en || ''} onChange={(e) => updateSetting('yearlyVisionRef','en',e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                          </>)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: LEADERSHIP / PASTOR EDITOR */}
                  {adminActiveSection === 'about' && aboutSettingsTab === 'leaders' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '牧者同工编辑' : 'Pastor / Leader Editor'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理牧者、传道、长老及事工负责人的资料与简介' : 'Manage pastors, evangelists, elders, and ministry leaders profiles'}</p>
                        </div>
                        {editingLeader === null && (
                          <button
                            onClick={() => setEditingLeader({
                              id: 'new',
                              name: { zh: '新牧者/同工', en: 'New Leader' },
                              role: { zh: '职务', en: 'Role' },
                              image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
                              bio: { zh: '在此填写牧者/同工的简介。', en: 'Write the leader biography here.' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加牧者/同工' : 'Add Leader'}</span>
                          </button>
                        )}
                      </div>

                      {/* Leadership Section Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '牧者板块顶栏与引言设置' : 'Section Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.leadershipBadge?.zh || ''} onChange={(e) => updateSetting('leadershipBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="属灵领袖与关怀同工" />
                              <input type="text" value={data.settings.leadershipBadge?.en || ''} onChange={(e) => updateSetting('leadershipBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Spiritual Guides & Shepherds" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">板块大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.leadershipTitle?.zh || ''} onChange={(e) => updateSetting('leadershipTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="牧者与事工团队" />
                              <input type="text" value={data.settings.leadershipTitle?.en || ''} onChange={(e) => updateSetting('leadershipTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Leadership Team" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">板块引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.leadershipIntro?.zh || ''} onChange={(e) => updateSetting('leadershipIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.leadershipIntro?.en || ''} onChange={(e) => updateSetting('leadershipIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingLeader ? (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingLeader.id === 'new' ? (lang === 'zh' ? '新增牧者/同工' : 'Add New Leader') : (lang === 'zh' ? '编辑牧者/同工' : 'Edit Leader')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '照片链接' : 'Photo URL'}</label>
                              <input type="text" value={editingLeader.image} onChange={(e) => setEditingLeader({ ...editingLeader, image: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '姓名 (中文)' : 'Name (Chinese)'}</label>
                              <input type="text" value={editingLeader.name.zh} onChange={(e) => setEditingLeader({ ...editingLeader, name: { ...editingLeader.name, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Name (English)' : 'Name (English)'}</label>
                              <input type="text" value={editingLeader.name.en} onChange={(e) => setEditingLeader({ ...editingLeader, name: { ...editingLeader.name, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '职位/角色 (中文)' : 'Role (Chinese)'}</label>
                              <input type="text" value={editingLeader.role.zh} onChange={(e) => setEditingLeader({ ...editingLeader, role: { ...editingLeader.role, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Role (English)' : 'Role (English)'}</label>
                              <input type="text" value={editingLeader.role.en} onChange={(e) => setEditingLeader({ ...editingLeader, role: { ...editingLeader.role, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '简介 (中文)' : 'Bio (Chinese)'}</label>
                              <textarea rows={4} value={editingLeader.bio.zh} onChange={(e) => setEditingLeader({ ...editingLeader, bio: { ...editingLeader.bio, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Bio (English)' : 'Bio (English)'}</label>
                              <textarea rows={4} value={editingLeader.bio.en} onChange={(e) => setEditingLeader({ ...editingLeader, bio: { ...editingLeader.bio, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button onClick={() => setEditingLeader(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                            <button onClick={() => handleSaveLeader(editingLeader)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {(data.leadership || []).map((leader, idx) => (
                            <div key={leader.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <img src={leader.image} alt="Preview" className="w-14 h-14 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{leader.name.zh} / {leader.name.en}</h4>
                                  <p className="text-xs text-primary font-semibold">{leader.role.zh} / {leader.role.en}</p>
                                  <p className="text-xs text-gray-500 font-light line-clamp-1">{leader.bio.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => handleMoveItem('leadership', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMoveItem('leadership', idx, 'down')} disabled={idx === (data.leadership || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                <button onClick={() => setEditingLeader(leader)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteLeader(leader.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: OFFERINGS SETTINGS */}
                  {adminActiveSection === 'offerings' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '奉献页面设置' : 'Offerings Settings'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '编辑奉献页面的引言、经文、奉献方式和联系信息' : 'Edit offerings page intro, scripture, giving methods, and contact info'}</p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '奉献引言 (中文)' : 'Intro (Chinese)'}</label>
                          <textarea rows={3} value={data.offerings?.intro?.zh || ''} onChange={(e) => updateOfferings('intro', { ...(data.offerings?.intro || {}), zh: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Intro (English)' : 'Intro (English)'}</label>
                          <textarea rows={3} value={data.offerings?.intro?.en || ''} onChange={(e) => updateOfferings('intro', { ...(data.offerings?.intro || {}), en: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '经文引用 (中文)' : 'Scripture Quote (Chinese)'}</label>
                          <textarea rows={3} value={data.offerings?.scripture?.zh || ''} onChange={(e) => updateOfferings('scripture', { ...(data.offerings?.scripture || {}), zh: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Scripture Quote (English)' : 'Scripture Quote (English)'}</label>
                          <textarea rows={3} value={data.offerings?.scripture?.en || ''} onChange={(e) => updateOfferings('scripture', { ...(data.offerings?.scripture || {}), en: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '联系备注 (中文)' : 'Contact Note (Chinese)'}</label>
                          <input type="text" value={data.offerings?.contactNote?.zh || ''} onChange={(e) => updateOfferings('contactNote', { ...(data.offerings?.contactNote || {}), zh: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Contact Note (English)' : 'Contact Note (English)'}</label>
                          <input type="text" value={data.offerings?.contactNote?.en || ''} onChange={(e) => updateOfferings('contactNote', { ...(data.offerings?.contactNote || {}), en: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Offering Methods Management */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '奉献方式管理' : 'Giving Methods'}</h3>
                            {editingOfferingMethod === null && (
                              <button
                                onClick={() => setEditingOfferingMethod({
                                  title: { zh: '', en: '' },
                                  description: { zh: '', en: '' },
                                  details: { zh: '', en: '' },
                                  icon: 'heart',
                                  qrCodeUrl: ''
                                })}
                                className="px-3 py-1.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1 transition-all"
                              >
                                <Plus size={12} />
                                <span>{lang === 'zh' ? '添加奉献方式' : 'Add Method'}</span>
                              </button>
                            )}
                          </div>

                          {editingOfferingMethod !== null ? (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in mb-4">
                              <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                                {editingOfferingMethod.index !== undefined ? (lang === 'zh' ? '编辑奉献方式' : 'Edit Giving Method') : (lang === 'zh' ? '添加奉献方式' : 'Add Giving Method')}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '名称 (中文)' : 'Name (Chinese)'}</label>
                                  <input type="text" value={editingOfferingMethod.title?.zh || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, title: { ...(editingOfferingMethod.title || {}), zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Name (English)' : 'Name (English)'}</label>
                                  <input type="text" value={editingOfferingMethod.title?.en || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, title: { ...(editingOfferingMethod.title || {}), en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '简短描述 (中文)' : 'Short Description (Chinese)'}</label>
                                  <textarea rows={2} value={editingOfferingMethod.description?.zh || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, description: { ...(editingOfferingMethod.description || {}), zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Short Description (English)' : 'Short Description (English)'}</label>
                                  <textarea rows={2} value={editingOfferingMethod.description?.en || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, description: { ...(editingOfferingMethod.description || {}), en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '详细信息 / 账号信息 (中文)' : 'Details / Account Info (Chinese)'}</label>
                                  <textarea rows={3} value={editingOfferingMethod.details?.zh || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, details: { ...(editingOfferingMethod.details || {}), zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Details / Account Info (English)' : 'Details / Account Info (English)'}</label>
                                  <textarea rows={3} value={editingOfferingMethod.details?.en || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, details: { ...(editingOfferingMethod.details || {}), en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '图标类型' : 'Icon Type'}</label>
                                  <select value={editingOfferingMethod.icon || 'heart'} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, icon: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none">
                                    <option value="heart">{lang === 'zh' ? '爱心 (崇拜现场)' : 'Heart (In-Person)'}</option>
                                    <option value="building">{lang === 'zh' ? '建筑 (银行转账)' : 'Building (Bank Transfer)'}</option>
                                    <option value="smartphone">{lang === 'zh' ? '手机 (二维码扫码)' : 'Smartphone (E-Giving)'}</option>
                                    <option value="gift">{lang === 'zh' ? '礼包 (其他方式)' : 'Gift (Other)'}</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '二维码图片链接' : 'QR Code Image URL'}</label>
                                  <input type="text" value={editingOfferingMethod.qrCodeUrl || ''} onChange={(e) => setEditingOfferingMethod({ ...editingOfferingMethod, qrCodeUrl: e.target.value })} placeholder="https://example.com/qrcode.png" className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                  <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '留空则不显示二维码。可直接粘贴公网图片链接。' : 'Leave empty if no QR code. Paste a direct image URL.'}</p>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button onClick={() => setEditingOfferingMethod(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                                <button onClick={() => handleSaveOfferingMethod(editingOfferingMethod, editingOfferingMethod.index)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(data.offerings?.methods || []).map((method, idx) => (
                                <div key={method.id || idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                                  <div className="flex gap-3 items-center w-full sm:w-3/4">
                                    <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                    <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                                      {method.icon === 'heart' && <HandHeart size={16} />}
                                      {method.icon === 'building' && <Building size={16} />}
                                      {method.icon === 'smartphone' && <Smartphone size={16} />}
                                      {!['heart','building','smartphone'].includes(method.icon) && <Gift size={16} />}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-sm text-gray-900">{method.title.zh} / {method.title.en}</span>
                                      <p className="text-xs text-gray-500 line-clamp-1">{method.description.zh}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                    <button onClick={() => handleMoveItem('offerings.methods', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                    <button onClick={() => handleMoveItem('offerings.methods', idx, 'down')} disabled={idx === (data.offerings?.methods || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                    <button onClick={() => setEditingOfferingMethod({ ...method, index: idx })} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                    <button onClick={() => handleDeleteOfferingMethod(idx)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: BULLETINS & SERMONS MANAGER (Combined) */}
                  {adminActiveSection === 'bulletins' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '周报与讲道库管理' : 'Bulletins & Sermon Library Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理教会周报、月刊与讲道视频' : 'Manage church bulletins, newsletters, and sermon videos'}</p>
                        </div>
                        {bulletinsTab === 'bulletins' && editingBulletin === null && (
                          <button
                            onClick={() => setEditingBulletin({
                              id: 'new',
                              title: { zh: '新周报', en: 'New Bulletin' },
                              date: new Date().toISOString().slice(0, 10),
                              category: { zh: '周报', en: 'Bulletin' },
                              fileUrl: '#',
                              summary: { zh: '周报摘要...', en: 'Bulletin summary...' },
                              highlights: { zh: '• 要点1\n• 要点2', en: '• Point 1\n• Point 2' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '发布周报' : 'Publish Bulletin'}</span>
                          </button>
                        )}
                        {bulletinsTab === 'sermons' && editingSermon === null && (
                          <button
                            onClick={() => setEditingSermon({
                              id: 'new',
                              title: { zh: '新讲道', en: 'New Sermon' },
                              preacher: { zh: '讲员姓名', en: 'Preacher Name' },
                              date: new Date().toISOString().slice(0, 10),
                              videoUrl: 'https://www.youtube.com/watch?v=',
                              series: { zh: '讲道系列', en: 'Sermon Series' },
                              scripture: '',
                              description: { zh: '讲道描述...', en: 'Sermon description...' },
                              thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80'
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加讲道' : 'Add Sermon'}</span>
                          </button>
                        )}
                      </div>

                      {/* Tab Switcher */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/60">
                        <button
                          onClick={() => setBulletinsTab('bulletins')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            bulletinsTab === 'bulletins'
                              ? 'bg-white text-primary shadow-sm'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                        >
                          <FileText size={14} />
                          <span>{lang === 'zh' ? '周报/月刊' : 'Bulletins'}</span>
                        </button>
                        <button
                          onClick={() => setBulletinsTab('sermons')}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            bulletinsTab === 'sermons'
                              ? 'bg-white text-primary shadow-sm'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                          }`}
                        >
                          <BookOpen size={14} />
                          <span>{lang === 'zh' ? '讲道库' : 'Sermons'}</span>
                        </button>
                      </div>

                      {/* Bulletins Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.bulletinsBadge?.zh || ''} onChange={(e) => updateSetting('bulletinsBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="教会资源中心" />
                              <input type="text" value={data.settings.bulletinsBadge?.en || ''} onChange={(e) => updateSetting('bulletinsBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Church Resource Centre" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.bulletinsTitle?.zh || ''} onChange={(e) => updateSetting('bulletinsTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="周报与讲道库" />
                              <input type="text" value={data.settings.bulletinsTitle?.en || ''} onChange={(e) => updateSetting('bulletinsTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Bulletins & Sermon Library" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.bulletinsIntro?.zh || ''} onChange={(e) => updateSetting('bulletinsIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.bulletinsIntro?.en || ''} onChange={(e) => updateSetting('bulletinsIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {bulletinsTab === 'bulletins' && editingBulletin ? (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingBulletin.id === 'new' ? (lang === 'zh' ? '发布新周报' : 'New Bulletin') : (lang === 'zh' ? '编辑周报' : 'Edit Bulletin')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '标题 (中文)' : 'Title (Chinese)'}</label>
                              <input type="text" value={editingBulletin.title.zh} onChange={(e) => setEditingBulletin({ ...editingBulletin, title: { ...editingBulletin.title, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Title (English)' : 'Title (English)'}</label>
                              <input type="text" value={editingBulletin.title.en} onChange={(e) => setEditingBulletin({ ...editingBulletin, title: { ...editingBulletin.title, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                              <input type="date" value={editingBulletin.date} onChange={(e) => setEditingBulletin({ ...editingBulletin, date: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '分类 (中文)' : 'Category (Chinese)'}</label>
                              <input type="text" value={editingBulletin.category.zh} onChange={(e) => setEditingBulletin({ ...editingBulletin, category: { ...editingBulletin.category, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '分类 (英文)' : 'Category (English)'}</label>
                              <input type="text" value={editingBulletin.category.en} onChange={(e) => setEditingBulletin({ ...editingBulletin, category: { ...editingBulletin.category, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">
                                {lang === 'zh' ? '周报下载链接 (PDF/文件)' : 'Weekly Bulletin Download Link (PDF/File URL)'}
                              </label>
                              <input 
                                type="text" 
                                value={editingBulletin.fileUrl} 
                                onChange={(e) => setEditingBulletin({ ...editingBulletin, fileUrl: e.target.value })} 
                                placeholder={lang === 'zh' ? '例如: https://drive.google.com/... 或 http://...' : 'e.g., https://drive.google.com/... or http://...'} 
                                className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                {lang === 'zh' ? '💡 请粘帖周报的公网下载链接（如 Google Drive, Dropbox 共享链接等）。若填 # 或留空，周报页面将不会显示“下载周报”按钮。' : '💡 Please paste the public download link of your bulletin (e.g. Google Drive, Dropbox link). If set to # or left empty, the "Download PDF" button will be hidden.'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '摘要 (中文)' : 'Summary (Chinese)'}</label>
                              <textarea rows={2} value={editingBulletin.summary.zh} onChange={(e) => setEditingBulletin({ ...editingBulletin, summary: { ...editingBulletin.summary, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Summary (English)' : 'Summary (English)'}</label>
                              <textarea rows={2} value={editingBulletin.summary.en} onChange={(e) => setEditingBulletin({ ...editingBulletin, summary: { ...editingBulletin.summary, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '要点 (中文)' : 'Highlights (Chinese)'}</label>
                              <textarea rows={3} value={editingBulletin.highlights.zh} onChange={(e) => setEditingBulletin({ ...editingBulletin, highlights: { ...editingBulletin.highlights, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Highlights (English)' : 'Highlights (English)'}</label>
                              <textarea rows={3} value={editingBulletin.highlights.en} onChange={(e) => setEditingBulletin({ ...editingBulletin, highlights: { ...editingBulletin.highlights, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button onClick={() => setEditingBulletin(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                            <button onClick={() => handleSaveBulletin(editingBulletin)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {bulletinsTab === 'bulletins' && (
                            <>
                              {(data.bulletins || []).map((bulletin, idx) => (
                            <div key={bulletin.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <FileText className="text-primary shrink-0" size={20} />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{bulletin.title.zh} / {bulletin.title.en}</h4>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs text-gray-500">{bulletin.date} • {bulletin.category.zh}</p>
                                    {bulletin.fileUrl && bulletin.fileUrl !== '#' ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                                        {lang === 'zh' ? '已关联下载链接' : 'Download Link Attached'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                        {lang === 'zh' ? '无下载链接' : 'No Download Link'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => handleMoveItem('bulletins', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMoveItem('bulletins', idx, 'down')} disabled={idx === (data.bulletins || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                {bulletin.fileUrl && bulletin.fileUrl !== '#' && (
                                  <a href={bulletin.fileUrl} target="_blank" rel="noopener noreferrer" title={lang === 'zh' ? '打开/下载周报' : 'Open/Download Bulletin'} className="p-1.5 rounded border border-green-200 text-green-600 hover:bg-green-50">
                                    <Download size={14} />
                                  </a>
                                )}
                                <button onClick={() => setEditingBulletin(bulletin)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteBulletin(bulletin.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                            </>
                          )}
                        </div>
                      )}

                      {/* Sermons Tab Content */}
                      {bulletinsTab === 'sermons' && (
                        <>
                          {editingSermon ? (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                              <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                                {editingSermon.id === 'new' ? (lang === 'zh' ? '新增讲道' : 'Add New Sermon') : (lang === 'zh' ? '编辑讲道' : 'Edit Sermon')}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '标题 (中文)' : 'Title (Chinese)'}</label>
                                  <input type="text" value={editingSermon.title.zh} onChange={(e) => setEditingSermon({ ...editingSermon, title: { ...editingSermon.title, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Title (English)' : 'Title (English)'}</label>
                                  <input type="text" value={editingSermon.title.en} onChange={(e) => setEditingSermon({ ...editingSermon, title: { ...editingSermon.title, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '讲员 (中文)' : 'Preacher (Chinese)'}</label>
                                  <input type="text" value={editingSermon.preacher.zh} onChange={(e) => setEditingSermon({ ...editingSermon, preacher: { ...editingSermon.preacher, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Preacher (English)' : 'Preacher (English)'}</label>
                                  <input type="text" value={editingSermon.preacher.en} onChange={(e) => setEditingSermon({ ...editingSermon, preacher: { ...editingSermon.preacher, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                                  <input type="date" value={editingSermon.date} onChange={(e) => setEditingSermon({ ...editingSermon, date: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '经文引用' : 'Scripture Reference'}</label>
                                  <input type="text" value={editingSermon.scripture || ''} onChange={(e) => setEditingSermon({ ...editingSermon, scripture: e.target.value })} placeholder="例: 约翰福音 3:16" className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '系列 (中文)' : 'Series (Chinese)'}</label>
                                  <input type="text" value={editingSermon.series.zh} onChange={(e) => setEditingSermon({ ...editingSermon, series: { ...editingSermon.series, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Series (English)' : 'Series (English)'}</label>
                                  <input type="text" value={editingSermon.series.en} onChange={(e) => setEditingSermon({ ...editingSermon, series: { ...editingSermon.series, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'YouTube 视频链接' : 'YouTube Video URL'}</label>
                                  <input type="text" value={editingSermon.videoUrl} onChange={(e) => setEditingSermon({ ...editingSermon, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                  <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '支持 YouTube 视频链接' : 'Supports YouTube video URLs'}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '描述 (中文)' : 'Description (Chinese)'}</label>
                                  <textarea rows={3} value={editingSermon.description.zh} onChange={(e) => setEditingSermon({ ...editingSermon, description: { ...editingSermon.description, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Description (English)' : 'Description (English)'}</label>
                                  <textarea rows={3} value={editingSermon.description.en} onChange={(e) => setEditingSermon({ ...editingSermon, description: { ...editingSermon.description, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button onClick={() => setEditingSermon(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                                <button onClick={() => handleSaveSermon(editingSermon)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                              {(data.sermons || []).map((sermon, idx) => (
                                <div key={sermon.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                  <div className="flex gap-3 items-center w-full sm:w-3/4">
                                    <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                    <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                      {sermon.videoUrl ? (
                                        <BookOpen className="text-gray-400" size={20} />
                                      ) : (
                                        <BookOpen className="text-gray-400" size={20} />
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <h4 className="font-bold text-sm text-gray-900">{t(sermon.title)}</h4>
                                      <p className="text-xs text-gray-500">{sermon.date} • {t(sermon.preacher)} • {t(sermon.series)}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                    <button onClick={() => handleMoveItem('sermons', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                    <button onClick={() => handleMoveItem('sermons', idx, 'down')} disabled={idx === (data.sermons || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                    <button onClick={() => setEditingSermon(sermon)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                    <button onClick={() => handleDeleteSermon(sermon.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {adminActiveSection === 'sermons' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '讲道库管理' : 'Sermon Library Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理讲道视频、讲员、系列和日期' : 'Manage sermon videos, preachers, series, and dates'}</p>
                        </div>
                        {editingSermon === null && (
                          <button
                            onClick={() => setEditingSermon({
                              id: 'new',
                              title: { zh: '新讲道', en: 'New Sermon' },
                              preacher: { zh: '讲员姓名', en: 'Preacher Name' },
                              date: new Date().toISOString().slice(0, 10),
                              videoUrl: 'https://www.youtube.com/watch?v=',
                              series: { zh: '讲道系列', en: 'Sermon Series' },
                              scripture: '',
                              description: { zh: '讲道描述...', en: 'Sermon description...' },
                              thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80'
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加讲道' : 'Add Sermon'}</span>
                          </button>
                        )}
                      </div>

                      {editingSermon ? (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingSermon.id === 'new' ? (lang === 'zh' ? '新增讲道' : 'Add New Sermon') : (lang === 'zh' ? '编辑讲道' : 'Edit Sermon')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '标题 (中文)' : 'Title (Chinese)'}</label>
                              <input type="text" value={editingSermon.title.zh} onChange={(e) => setEditingSermon({ ...editingSermon, title: { ...editingSermon.title, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Title (English)' : 'Title (English)'}</label>
                              <input type="text" value={editingSermon.title.en} onChange={(e) => setEditingSermon({ ...editingSermon, title: { ...editingSermon.title, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '讲员 (中文)' : 'Preacher (Chinese)'}</label>
                              <input type="text" value={editingSermon.preacher.zh} onChange={(e) => setEditingSermon({ ...editingSermon, preacher: { ...editingSermon.preacher, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Preacher (English)' : 'Preacher (English)'}</label>
                              <input type="text" value={editingSermon.preacher.en} onChange={(e) => setEditingSermon({ ...editingSermon, preacher: { ...editingSermon.preacher, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                              <input type="date" value={editingSermon.date} onChange={(e) => setEditingSermon({ ...editingSermon, date: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '经文引用' : 'Scripture Reference'}</label>
                              <input type="text" value={editingSermon.scripture || ''} onChange={(e) => setEditingSermon({ ...editingSermon, scripture: e.target.value })} placeholder="例: 约翰福音 3:16" className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '系列 (中文)' : 'Series (Chinese)'}</label>
                              <input type="text" value={editingSermon.series.zh} onChange={(e) => setEditingSermon({ ...editingSermon, series: { ...editingSermon.series, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Series (English)' : 'Series (English)'}</label>
                              <input type="text" value={editingSermon.series.en} onChange={(e) => setEditingSermon({ ...editingSermon, series: { ...editingSermon.series, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'YouTube 视频链接' : 'YouTube Video URL'}</label>
                              <input type="text" value={editingSermon.videoUrl} onChange={(e) => setEditingSermon({ ...editingSermon, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '支持 YouTube 视频链接' : 'Supports YouTube video URLs'}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '描述 (中文)' : 'Description (Chinese)'}</label>
                              <textarea rows={3} value={editingSermon.description.zh} onChange={(e) => setEditingSermon({ ...editingSermon, description: { ...editingSermon.description, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Description (English)' : 'Description (English)'}</label>
                              <textarea rows={3} value={editingSermon.description.en} onChange={(e) => setEditingSermon({ ...editingSermon, description: { ...editingSermon.description, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button onClick={() => setEditingSermon(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                            <button onClick={() => handleSaveSermon(editingSermon)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {(data.sermons || []).map((sermon, idx) => (
                            <div key={sermon.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                  {sermon.videoUrl ? (
                                    <BookOpen className="text-gray-400" size={20} />
                                  ) : (
                                    <BookOpen className="text-gray-400" size={20} />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{t(sermon.title)}</h4>
                                  <p className="text-xs text-gray-500">{sermon.date} • {t(sermon.preacher)} • {t(sermon.series)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => handleMoveItem('sermons', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMoveItem('sermons', idx, 'down')} disabled={idx === (data.sermons || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                <button onClick={() => setEditingSermon(sermon)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteSermon(sermon.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: SERVICE LIBRARY MANAGER - Now Services & Worships */}
                  {adminActiveSection === 'services' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '崇拜与敬拜管理' : 'Services & Worships Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理完整崇拜与敬拜录影、类型、系列和日期' : 'Manage full service & worship recordings, type, series, and dates'}</p>
                        </div>
                        {editingService === null && (
                          <button
                            onClick={() => setEditingService({
                              id: 'new',
                              title: { zh: '新崇拜/敬拜录影', en: 'New Service/Worship Recording' },
                              date: new Date().toISOString().slice(0, 10),
                              videoUrl: 'https://www.youtube.com/watch?v=',
                              series: { zh: '崇拜系列', en: 'Service Series' },
                              description: { zh: '崇拜/敬拜录影描述...', en: 'Service/Worship recording description...' },
                              thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80',
                              type: adminServiceTab
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{adminServiceTab === 'worship' ? (lang === 'zh' ? '添加敬拜录影' : 'Add Worship') : (lang === 'zh' ? '添加崇拜录影' : 'Add Service')}</span>
                          </button>
                        )}
                      </div>

                      {/* Tab Switcher */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/60" role="tablist" aria-label="Service recording type">
                        {[
                          { id: 'service', zh: '崇拜录影', en: 'Services', icon: Video },
                          { id: 'worship', zh: '敬拜录影', en: 'Worships', icon: PlayCircle }
                        ].map((tab) => (
                          <button key={tab.id} type="button" role="tab" aria-selected={adminServiceTab === tab.id} onClick={() => { setAdminServiceTab(tab.id); setEditingService(null); }} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${adminServiceTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}>
                            <tab.icon size={14} />
                            <span>{lang === 'zh' ? tab.zh : tab.en}</span>
                          </button>
                        ))}
                      </div>

                      {/* Services Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.servicesBadge?.zh || ''} onChange={(e) => updateSetting('servicesBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="崇拜与敬拜 · 完整回顾" />
                              <input type="text" value={data.settings.servicesBadge?.en || ''} onChange={(e) => updateSetting('servicesBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Services & Worships · Full Replay" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.servicesTitle?.zh || ''} onChange={(e) => updateSetting('servicesTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="崇拜与敬拜" />
                              <input type="text" value={data.settings.servicesTitle?.en || ''} onChange={(e) => updateSetting('servicesTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Services & Worships" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.servicesIntro?.zh || ''} onChange={(e) => updateSetting('servicesIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.servicesIntro?.en || ''} onChange={(e) => updateSetting('servicesIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingService ? (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingService.id === 'new' ? (lang === 'zh' ? '新增崇拜/敬拜录影' : 'Add New Service/Worship') : (lang === 'zh' ? '编辑崇拜/敬拜录影' : 'Edit Service/Worship')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '标题 (中文)' : 'Title (Chinese)'}</label>
                              <input type="text" value={editingService.title.zh} onChange={(e) => setEditingService({ ...editingService, title: { ...editingService.title, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Title (English)' : 'Title (English)'}</label>
                              <input type="text" value={editingService.title.en} onChange={(e) => setEditingService({ ...editingService, title: { ...editingService.title, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '类型' : 'Type'}</label>
                              <select value={editingService.type || 'service'} onChange={(e) => setEditingService({ ...editingService, type: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none">
                                <option value="service">{lang === 'zh' ? '崇拜录影 (Service)' : 'Service Recording'}</option>
                                <option value="worship">{lang === 'zh' ? '敬拜录影 (Worship)' : 'Worship Video'}</option>
                              </select>
                              <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '选择此录影属于崇拜还是敬拜，决定在哪个标签显示' : 'Choose whether this is a Service or Worship video for tab filtering.'}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '日期' : 'Date'}</label>
                              <input type="date" value={editingService.date} onChange={(e) => setEditingService({ ...editingService, date: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '系列 (中文)' : 'Series (Chinese)'}</label>
                              <input type="text" value={editingService.series.zh} onChange={(e) => setEditingService({ ...editingService, series: { ...editingService.series, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Series (English)' : 'Series (English)'}</label>
                              <input type="text" value={editingService.series.en} onChange={(e) => setEditingService({ ...editingService, series: { ...editingService.series, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'YouTube 视频链接' : 'YouTube Video URL'}</label>
                              <input type="text" value={editingService.videoUrl} onChange={(e) => setEditingService({ ...editingService, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '支持 YouTube 视频链接，崇拜与敬拜通用' : 'Supports YouTube video URLs for both Service and Worship'}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '描述 (中文)' : 'Description (Chinese)'}</label>
                              <textarea rows={3} value={editingService.description.zh} onChange={(e) => setEditingService({ ...editingService, description: { ...editingService.description, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Description (English)' : 'Description (English)'}</label>
                              <textarea rows={3} value={editingService.description.en} onChange={(e) => setEditingService({ ...editingService, description: { ...editingService.description, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button onClick={() => setEditingService(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                            <button onClick={() => handleSaveService(editingService)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {(data.services || []).map((service, idx) => (
                            (service.type || 'service') === adminServiceTab && <div key={service.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                  {service.type === 'worship' ? <PlayCircle className="text-violet-500" size={20} /> : <Video className="text-gray-400" size={20} />}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${service.type === 'worship' ? 'bg-violet-100 text-violet-700' : 'bg-primary/10 text-primary'}`}>
                                      {service.type === 'worship' ? (lang === 'zh' ? '敬拜' : 'Worship') : (lang === 'zh' ? '崇拜' : 'Service')}
                                    </span>
                                    <h4 className="font-bold text-sm text-gray-900">{t(service.title)}</h4>
                                  </div>
                                  <p className="text-xs text-gray-500">{service.date} • {t(service.series)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => handleMoveItem('services', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMoveItem('services', idx, 'down')} disabled={idx === (data.services || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                <button onClick={() => setEditingService(service)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteService(service.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                          {(data.services || []).filter((service) => (service.type || 'service') === adminServiceTab).length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs">
                              {adminServiceTab === 'worship' ? (lang === 'zh' ? '暂无敬拜录影，点击上方按钮添加' : 'No worship recordings yet. Click the button above to add one.') : (lang === 'zh' ? '暂无崇拜录影，点击上方按钮添加' : 'No service recordings yet. Click the button above to add one.')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: CELL GROUPS MANAGER */}
                  {adminActiveSection === 'cellgroups' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '细胞小组管理' : 'Cell Groups Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理教会各细胞小组的信息、负责人和聚会时间' : 'Manage cell group details, leaders, and meeting schedules'}</p>
                        </div>
                        {editingCellGroup === null && (
                          <button
                            onClick={() => setEditingCellGroup({
                              id: 'new',
                              name: { zh: '新小组', en: 'New Cell Group' },
                              leader: { zh: '负责人', en: 'Leader' },
                              schedule: { zh: '聚会时间', en: 'Schedule' },
                              location: { zh: '聚会地点', en: 'Location' },
                              target: { zh: '适合人群', en: 'Target Group' },
                              description: { zh: '小组简介...', en: 'Group description...' },
                              image: 'https://images.unsplash.com/photo-1529156069898-49953e39b8f2?auto=format&fit=crop&w=600&q=80'
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加小组' : 'Add Cell Group'}</span>
                          </button>
                        )}
                      </div>

                      {/* Cell Groups Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.cellGroupsBadge?.zh || ''} onChange={(e) => updateSetting('cellGroupsBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="小组生活 · 彼此相顾" />
                              <input type="text" value={data.settings.cellGroupsBadge?.en || ''} onChange={(e) => updateSetting('cellGroupsBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Community Life · Caring for One Another" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.cellGroupsTitle?.zh || ''} onChange={(e) => updateSetting('cellGroupsTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="细胞小组" />
                              <input type="text" value={data.settings.cellGroupsTitle?.en || ''} onChange={(e) => updateSetting('cellGroupsTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Cell Groups" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.cellGroupsIntro?.zh || ''} onChange={(e) => updateSetting('cellGroupsIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.cellGroupsIntro?.en || ''} onChange={(e) => updateSetting('cellGroupsIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {editingCellGroup ? (
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                            {editingCellGroup.id === 'new' ? (lang === 'zh' ? '新增小组' : 'Add Cell Group') : (lang === 'zh' ? '编辑小组' : 'Edit Cell Group')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '图片链接' : 'Image URL'}</label>
                              <input type="text" value={editingCellGroup.image} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, image: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '小组名称 (中文)' : 'Name (Chinese)'}</label>
                              <input type="text" value={editingCellGroup.name.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, name: { ...editingCellGroup.name, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Name (English)' : 'Name (English)'}</label>
                              <input type="text" value={editingCellGroup.name.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, name: { ...editingCellGroup.name, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '负责人 (中文)' : 'Leader (Chinese)'}</label>
                              <input type="text" value={editingCellGroup.leader.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, leader: { ...editingCellGroup.leader, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Leader (English)' : 'Leader (English)'}</label>
                              <input type="text" value={editingCellGroup.leader.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, leader: { ...editingCellGroup.leader, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '聚会时间 (中文)' : 'Schedule (Chinese)'}</label>
                              <input type="text" value={editingCellGroup.schedule.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, schedule: { ...editingCellGroup.schedule, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Schedule (English)' : 'Schedule (English)'}</label>
                              <input type="text" value={editingCellGroup.schedule.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, schedule: { ...editingCellGroup.schedule, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '地点 (中文)' : 'Location (Chinese)'}</label>
                              <input type="text" value={editingCellGroup.location.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, location: { ...editingCellGroup.location, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Location (English)' : 'Location (English)'}</label>
                              <input type="text" value={editingCellGroup.location.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, location: { ...editingCellGroup.location, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '适合人群 (中文)' : 'Target (Chinese)'}</label>
                              <input type="text" value={editingCellGroup.target.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, target: { ...editingCellGroup.target, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Target (English)' : 'Target (English)'}</label>
                              <input type="text" value={editingCellGroup.target.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, target: { ...editingCellGroup.target, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '简介 (中文)' : 'Description (Chinese)'}</label>
                              <textarea rows={3} value={editingCellGroup.description.zh} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, description: { ...editingCellGroup.description, zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Description (English)' : 'Description (English)'}</label>
                              <textarea rows={3} value={editingCellGroup.description.en} onChange={(e) => setEditingCellGroup({ ...editingCellGroup, description: { ...editingCellGroup.description, en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <button onClick={() => setEditingCellGroup(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                            <button onClick={() => handleSaveCellGroup(editingCellGroup)} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存' : 'Save'}</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          {(data.cellGroups || []).map((group, idx) => (
                            <div key={group.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                                <img src={group.image} alt="Preview" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{group.name.zh} / {group.name.en}</h4>
                                  <p className="text-xs text-gray-500">{group.schedule.zh} • {group.location.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => handleMoveItem('cellGroups', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMoveItem('cellGroups', idx, 'down')} disabled={idx === (data.cellGroups || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                <button onClick={() => setEditingCellGroup(group)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteCellGroup(group.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: NEW FRIEND GUIDE EDITOR */}
                  {adminActiveSection === 'newfriend' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '新朋友指南编辑' : 'New Friend Guide Editor'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '编辑新朋友指南的欢迎词和各章节内容 - 现在支持完整编辑每个章节' : 'Edit welcome message and section content – now with full edit support for each chapter'}</p>
                        </div>
                        {editingGuideSection === null && (
                          <button
                            onClick={() => setEditingGuideSection({ id: 'new', title: { zh: '新章节标题', en: 'New Section Title' }, content: { zh: '章节内容...\n支持多行文本', en: 'Section content...\nSupports multi-line' } })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加章节' : 'Add Section'}</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '欢迎词 (中文)' : 'Welcome Message (Chinese)'}</label>
                          <textarea rows={3} value={data.newFriendGuide?.welcome?.zh || ''} onChange={(e) => updateNewFriendGuide('welcome', { ...(data.newFriendGuide?.welcome || {}), zh: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Welcome Message (English)' : 'Welcome Message (English)'}</label>
                          <textarea rows={3} value={data.newFriendGuide?.welcome?.en || ''} onChange={(e) => updateNewFriendGuide('welcome', { ...(data.newFriendGuide?.welcome || {}), en: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>

                        {/* Guide Sections - Full CRUD */}
                        <div className="pt-4 border-t border-gray-200">
                          {editingGuideSection ? (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4 animate-fade-in">
                              <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                                {editingGuideSection.id === 'new' ? (lang === 'zh' ? '新增指南章节' : 'Add Guide Section') : (lang === 'zh' ? '编辑指南章节' : 'Edit Guide Section')}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '章节标题 (中文)' : 'Section Title (Chinese)'}</label>
                                  <input type="text" value={editingGuideSection.title?.zh || ''} onChange={(e) => setEditingGuideSection({ ...editingGuideSection, title: { ...(editingGuideSection.title || {}), zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Title (English)' : 'Title (English)'}</label>
                                  <input type="text" value={editingGuideSection.title?.en || ''} onChange={(e) => setEditingGuideSection({ ...editingGuideSection, title: { ...(editingGuideSection.title || {}), en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? '章节内容 (中文) - 支持多行' : 'Content (Chinese) – multi-line supported'}</label>
                                  <textarea rows={5} value={editingGuideSection.content?.zh || ''} onChange={(e) => setEditingGuideSection({ ...editingGuideSection, content: { ...(editingGuideSection.content || {}), zh: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'Content (English)' : 'Content (English)'}</label>
                                  <textarea rows={5} value={editingGuideSection.content?.en || ''} onChange={(e) => setEditingGuideSection({ ...editingGuideSection, content: { ...(editingGuideSection.content || {}), en: e.target.value } })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button onClick={() => setEditingGuideSection(null)} className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-all">{lang === 'zh' ? '取消' : 'Cancel'}</button>
                                <button onClick={() => { handleSaveGuideSection(editingGuideSection, editingGuideSection.index); setEditingGuideSection(null); }} className="px-4 py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all flex items-center gap-1"><Save size={13} /><span>{lang === 'zh' ? '保存章节' : 'Save Section'}</span></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                                <span>{lang === 'zh' ? '指南章节列表' : 'Guide Sections List'}</span>
                                <span className="text-[10px] font-normal text-gray-500">{(data.newFriendGuide?.sections || []).length} {lang === 'zh' ? '个章节' : 'sections'}</span>
                              </h3>
                              <div className="space-y-3">
                                {(data.newFriendGuide?.sections || []).map((section, idx) => (
                                  <div key={section.id || idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3 items-start justify-between">
                                    <div className="flex gap-3 items-start w-full sm:w-3/4">
                                      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs mt-0.5">{idx+1}</div>
                                      <div className="flex-grow min-w-0">
                                        <span className="font-bold text-sm text-gray-900 block truncate">{section.title.zh} / {section.title.en}</span>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">{section.content.zh?.substring(0, 120)}...</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                      <button onClick={() => handleMoveItem('newFriendGuide.sections', idx, 'up')} disabled={idx === 0} title={lang === 'zh' ? '上移' : 'Move up'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={14} /></button>
                                      <button onClick={() => handleMoveItem('newFriendGuide.sections', idx, 'down')} disabled={idx === (data.newFriendGuide?.sections || []).length - 1} title={lang === 'zh' ? '下移' : 'Move down'} className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={14} /></button>
                                      <button onClick={() => setEditingGuideSection({ ...section, index: idx })} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                      <button onClick={() => handleDeleteGuideSection(idx)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0"><Trash2 size={14} /></button>
                                    </div>
                                  </div>
                                ))}
                                {(data.newFriendGuide?.sections || []).length === 0 && (
                                  <div className="text-center py-8 text-gray-400 text-xs border border-dashed border-gray-300 rounded-xl bg-white">
                                    {lang === 'zh' ? '暂无章节，点击上方“添加章节”创建' : 'No sections yet, click Add Section to create'}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: MAPS SETTINGS */}
                  {adminActiveSection === 'maps' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '地图设置' : 'Maps Settings'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理多个教会地点的地图、地址和交通指南' : 'Manage maps, addresses, and directions for multiple church locations'}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newLocation = {
                              id: 'new',
                              name: { zh: '新聚会点', en: 'New Fellowship Point' },
                              googleMapsEmbedUrl: '',
                              address: { zh: '地址', en: 'Address' },
                              directions: { zh: '交通指南', en: 'Directions' },
                              landmarks: { zh: '附近地标', en: 'Nearby Landmarks' }
                            };
                            const updated = { ...data };
                            if (!updated.maps) updated.maps = [];
                            const newId = Math.max(...updated.maps.map(m => m.id), 0) + 1;
                            updated.maps.push({ ...newLocation, id: newId });
                            saveAllData(updated);
                          }}
                          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Plus size={14} />
                          <span>{lang === 'zh' ? '添加聚会点' : 'Add Location'}</span>
                        </button>
                      </div>

                      {/* Maps Page Header Settings */}
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-primary" />
                          <span>{lang === 'zh' ? '页面顶栏与引言设置' : 'Page Header & Intro Settings'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">顶栏小标题 Badge (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.mapsBadge?.zh || ''} onChange={(e) => updateSetting('mapsBadge', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="找到我们" />
                              <input type="text" value={data.settings.mapsBadge?.en || ''} onChange={(e) => updateSetting('mapsBadge', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Find Us" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面大标题 Title (中文 / EN)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={data.settings.mapsTitle?.zh || ''} onChange={(e) => updateSetting('mapsTitle', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="教会地图与交通指南" />
                              <input type="text" value={data.settings.mapsTitle?.en || ''} onChange={(e) => updateSetting('mapsTitle', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Church Map & Directions" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">页面引言 Intro Description (中文 / EN)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <textarea rows={2} value={data.settings.mapsIntro?.zh || ''} onChange={(e) => updateSetting('mapsIntro', 'zh', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                              <textarea rows={2} value={data.settings.mapsIntro?.en || ''} onChange={(e) => updateSetting('mapsIntro', 'en', e.target.value)} className="px-2.5 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        {(data.maps || []).map((church, idx) => (
                          <div key={church.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-extrabold text-sm text-gray-900">
                                {lang === 'zh' ? `地点 ${idx + 1}: ` : `Location ${idx + 1}: `} {t(church.name)}
                              </h3>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleMoveItem('maps', idx, 'up')}
                                  disabled={idx === 0}
                                  title={lang === 'zh' ? '上移' : 'Move up'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => handleMoveItem('maps', idx, 'down')}
                                  disabled={idx === (data.maps || []).length - 1}
                                  title={lang === 'zh' ? '下移' : 'Move down'}
                                  className="p-1.5 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(lang === 'zh' ? '确定要删除此聚会点吗？' : 'Are you sure you want to delete this location?')) {
                                      const updated = { ...data };
                                      updated.maps = updated.maps.filter((_, i) => i !== idx);
                                      saveAllData(updated);
                                    }
                                  }}
                                  className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '地点名称 (中文)' : 'Location Name (Chinese)'}</label>
                                <input
                                  type="text"
                                  value={church.name.zh}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].name.zh = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Location Name (English)' : 'Location Name (English)'}</label>
                                <input
                                  type="text"
                                  value={church.name.en}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].name.en = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Google Maps 嵌入链接' : 'Google Maps Embed URL'}</label>
                                <input
                                  type="text"
                                  value={church.googleMapsEmbedUrl}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].googleMapsEmbedUrl = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{lang === 'zh' ? '从 Google Maps > 分享 > 嵌入地图 获取链接' : 'Get from Google Maps > Share > Embed a map'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '地址 (中文)' : 'Address (Chinese)'}</label>
                                <textarea
                                  rows={2}
                                  value={church.address.zh}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].address.zh = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Address (English)' : 'Address (English)'}</label>
                                <textarea
                                  rows={2}
                                  value={church.address.en}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].address.en = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '交通指南 (中文)' : 'Directions (Chinese)'}</label>
                                <textarea
                                  rows={4}
                                  value={church.directions.zh}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].directions.zh = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Directions (English)' : 'Directions (English)'}</label>
                                <textarea
                                  rows={4}
                                  value={church.directions.en}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].directions.en = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? '附近地标 (中文)' : 'Nearby Landmarks (Chinese)'}</label>
                                <textarea
                                  rows={3}
                                  value={church.landmarks.zh}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].landmarks.zh = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{lang === 'zh' ? 'Nearby Landmarks (English)' : 'Nearby Landmarks (English)'}</label>
                                <textarea
                                  rows={3}
                                  value={church.landmarks.en}
                                  onChange={(e) => {
                                    const updated = { ...data };
                                    updated.maps[idx].landmarks.en = e.target.value;
                                    saveAllData(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 6: BACKUP & DATA TRANSFERS */}
                  {adminActiveSection === 'backup' && backupAccessGranted && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '数据备份、本地恢复与重置' : 'Backup, Import & Factory Reset'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '为了实现“100%零托管订阅费”，本站直接使用浏览器本地存储(LocalStorage)保存您的所有编辑。您在此可以导出配置备份或导入历史配置' : 'This website utilizes high-speed LocalStorage to keep your adjustments for free. Use this page to download configurations and backup your site.'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                        
                        {/* ===== Auto-Save to GitHub ===== */}
                        <div className="md:col-span-2 pt-6 mt-4 border-t-2 border-primary/20">
                          <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Download size={14} className="text-primary" />
                            {lang === 'zh' ? '自动保存到 GitHub' : 'Auto-Save to GitHub'}
                          </h3>
                          <p className="text-[10px] text-gray-500 mb-4">
                            {lang === 'zh'
                              ? '开启后，每次在后台保存修改时，浏览器会直接通过 GitHub API 将数据提交到仓库的 initialData.js 文件。需要 GitHub Personal Access Token。'
                              : 'When enabled, every admin save commits directly to initialData.js on GitHub via the GitHub API. A GitHub Personal Access Token is required.'}
                          </p>

                          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-xs font-bold text-gray-700">
                                  {lang === 'zh' ? '启用自动同步' : 'Enable Auto-Sync'}
                                </label>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {lang === 'zh' ? '修改保存后自动推送到 GitHub' : 'Auto-push to GitHub after each save'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const next = !autoSaveToGithub;
                                  setAutoSaveToGithub(next);
                                  localStorage.setItem('bmbcc_autosave_github', String(next));
                                  // Also persist in data.settings so it survives across deployments and browser changes
                                  setData(prev => {
                                    const updated = { ...prev, settings: { ...prev.settings, autoSaveToGithub: next } };
                                    localStorage.setItem('bmbcc_site_data', JSON.stringify(stripSensitiveData(updated)));
                                    return updated;
                                  });
                                  // Save to Cloudflare KV for server-side persistence
                                  saveGithubSettingsToCloud({ autoSave: next });
                                }}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${autoSaveToGithub ? 'bg-primary' : 'bg-gray-300'}`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${autoSaveToGithub ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                              </button>
                            </div>

                            {/* PAT and repo fields are always visible so the token is never "lost"
                                when auto-save is toggled off. They are editable regardless of toggle state,
                                but visually dimmed when auto-save is off. */}
                            <div className={autoSaveToGithub ? '' : 'opacity-60'}>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                  {lang === 'zh' ? 'GitHub Personal Access Token' : 'GitHub Personal Access Token'}
                                </label>
                                <input
                                  type="password"
                                  value={githubPat}
                                  onChange={(e) => {
                                    setGithubPat(e.target.value);
                                    localStorage.setItem('bmbcc_github_pat', e.target.value);
                                    // Save to Cloudflare KV for server-side persistence
                                    saveGithubSettingsToCloud({ pat: e.target.value });
                                  }}
                                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {lang === 'zh'
                                    ? 'Token 安全保存在 Cloudflare KV（服务器端）及浏览器 localStorage 中，仅通过 HTTPS 发送到 api.github.com。'
                                    : 'Token is securely stored in Cloudflare KV (server-side) and browser localStorage, sent only to api.github.com over HTTPS.'}
                                </p>
                              </div>

                              <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                  {lang === 'zh' ? 'GitHub 仓库' : 'GitHub Repository'}
                                </label>
                                <input
                                  type="text"
                                  value={githubRepo}
                                  onChange={(e) => {
                                    setGithubRepo(e.target.value);
                                    localStorage.setItem('bmbcc_github_repo', e.target.value);
                                    // Also persist in data.settings for cross-session persistence
                                    setData(prev => {
                                      const updated = { ...prev, settings: { ...prev.settings, githubRepo: e.target.value } };
                                      localStorage.setItem('bmbcc_site_data', JSON.stringify(stripSensitiveData(updated)));
                                      return updated;
                                    });
                                    // Save to Cloudflare KV for server-side persistence
                                    saveGithubSettingsToCloud({ repo: e.target.value });
                                  }}
                                  placeholder="fongway94/BMBCCWebpage"
                                  className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                                />
                              </div>
                            </div>

                            {!autoSaveToGithub && (
                              <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                                <AlertTriangle size={12} className="shrink-0" />
                                {lang === 'zh'
                                  ? '自动同步已关闭。Token 和仓库设置已保留，开启开关后即可继续使用。'
                                  : 'Auto-sync is off. Your token and repo settings are preserved — flip the switch to resume.'}
                              </p>
                            )}

                            {autoSaveToGithub && autoSaveStatus && (
                              <div
                                className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${autoSaveStatus === 'saving'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : autoSaveStatus === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                              >
                                {autoSaveStatus === 'saving' && (
                                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                )}
                                <span>{autoSaveMessage}</span>
                              </div>
                            )}

                            <details className="text-[10px] text-gray-500 mt-2">
                              <summary className="cursor-pointer font-semibold text-gray-600 hover:text-gray-800">
                                {lang === 'zh' ? '📖 如何设置？只需3步！' : '📖 How to set up? Only 3 steps!'}
                              </summary>
                              <div className="mt-2 space-y-2 pl-1 leading-relaxed">
                                <p className="font-bold text-gray-700">
                                  {lang === 'zh' ? '步骤：' : 'Steps:'}
                                </p>
                                <ol className="list-decimal pl-4 space-y-1.5">
                                  <li>
                                    {lang === 'zh'
                                      ? '在 GitHub 创建 Personal Access Token：Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token'
                                      : 'Create a PAT on GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token'}
                                    <ul className="pl-3 mt-1 space-y-0.5 text-[9px]">
                                      <li>{lang === 'zh' ? '• Repository access: Only select repositories → BMBCCWebpage' : '• Repository access: Only select repositories → BMBCCWebpage'}</li>
                                      <li>{lang === 'zh' ? '• Permissions: Contents → Read and write' : '• Permissions: Contents → Read and write'}</li>
                                    </ul>
                                  </li>
                                  <li>
                                    {lang === 'zh'
                                      ? '将生成的 Token（以 ghp_ 开头）粘贴到上面的输入框中'
                                      : 'Paste the generated token (starts with ghp_) into the input field above'}
                                  </li>
                                  <li>
                                    {lang === 'zh'
                                      ? '确认仓库名为 fongway94/BMBCCWebpage，然后开启开关 — 以后每次保存就会自动提交到 GitHub！不需要任何服务器。'
                                      : 'Confirm the repo name is fongway94/BMBCCWebpage, then flip the switch — every save will auto-commit to GitHub! No server needed at all.'}
                                  </li>
                                </ol>
                                <p className="text-[9px] text-amber-600 mt-2">
                                  {lang === 'zh'
                                    ? '⚠️ Token 安全保存在 Cloudflare KV 和浏览器 localStorage 中，仅通过 HTTPS 发送到 api.github.com。建议使用 Fine-grained token 并设置过期时间。'
                                    : '⚠️ Token is securely stored in Cloudflare KV and browser localStorage, sent only to api.github.com over HTTPS. Use a fine-grained token with expiry for best security.'}
                                </p>
                              </div>
                            </details>
                          </div>
                        </div>

                        {/* Export block */}
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Download size={20} />
                            <h3 className="font-bold text-sm text-gray-900">{lang === 'zh' ? '备份：导出数据文件' : 'Export JSON Config'}</h3>
                          </div>
                          <p className="text-xs text-gray-500 font-light leading-relaxed">
                            {lang === 'zh'
                              ? '点击下方按钮将您当前修改过的所有网站数据（包括时间表、标语、配色、活动及幻灯片图片）下载为一个JSON备份文件。您可以妥善保管该文件，或者用它在其他浏览器、甚至发给开发人员替换GitHub上的默认配置文件（bmbcc-data.json）。'
                              : 'Download all your customized content (including timetables, events, images, colors) as a single portable JSON file. Keep it safe or share it to overwrite repository settings.'}
                          </p>
                          <button
                            onClick={handleExportData}
                            className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Download size={14} />
                            <span>{lang === 'zh' ? '导出并下载 church-data.json' : 'Download church-data.json'}</span>
                          </button>
                        </div>

                        {/* Reset Factory settings */}
                        <div className="bg-red-50/50 rounded-xl p-5 border border-red-200 space-y-4">
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={20} />
                            <h3 className="font-bold text-sm text-gray-900">{lang === 'zh' ? '重置：清空并恢复出厂默认' : 'Factory Reset Website'}</h3>
                          </div>
                          <p className="text-xs text-gray-500 font-light leading-relaxed">
                            {lang === 'zh'
                              ? '警告：重置后，您在后台编辑的所有本地修改和发布的信息都将被永久抹去，网站将重新显示我们最初设计的精美默认内容。在进行此操作前，强烈建议您先导出一份JSON文件作为备份！'
                              : 'Warning: This will permanently purge all your local modifications from this browser. The website will load our premium default content again. Download a backup first.'}
                          </p>
                          <button
                            onClick={handleResetToDefault}
                            className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                          >
                            <Trash2 size={14} />
                            <span>{lang === 'zh' ? '强力重置回默认数据' : 'Force Factory Reset'}</span>
                          </button>
                        </div>

                        {/* Import Text block */}
                        <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                          <div className="flex items-center gap-2 text-blue-600">
                            <Upload size={20} />
                            <h3 className="font-bold text-sm text-gray-900">{lang === 'zh' ? '恢复：导入备份数据' : 'Restore / Import JSON Config'}</h3>
                          </div>
                          
                          <form onSubmit={handleImportData} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                                {lang === 'zh' ? '请将备份的 .json 文件的所有文本内容黏贴在下方文本框中：' : 'Paste the entire contents of your backup .json file in the box below:'}
                              </label>
                              <textarea
                                rows={6}
                                value={importJsonText}
                                onChange={(e) => setImportJsonText(e.target.value)}
                                placeholder='{ "settings": { ... }, "carousel": [ ... ] }'
                                required
                                className="w-full p-3 font-mono text-[11px] bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>

                            {importError && (
                              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100">
                                {importError}
                              </div>
                            )}

                            <button
                              type="submit"
                              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                            >
                              <Upload size={14} />
                              <span>{lang === 'zh' ? '验证并导入网站数据' : 'Verify & Import Site Data'}</span>
                            </button>
                          </form>
                        </div>

                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* 4. FOOTER */}
      {eventDetailsOpen && selectedEvent && (
        <div className="fixed inset-0 z-[75] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={lang === 'zh' ? '活动详情' : 'Event details'} onMouseDown={(e) => { if (e.target === e.currentTarget) setEventDetailsOpen(false); }}>
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button onClick={() => setEventDetailsOpen(false)} aria-label={lang === 'zh' ? '关闭' : 'Close'} className="absolute right-4 top-4 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={20} /></button>
            <img src={selectedEvent.image} alt={t(selectedEvent.title)} className="max-h-[62vh] w-full object-contain bg-gray-950" />
            <div className="p-6 sm:p-8">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Calendar size={15} /> {lang === 'zh' ? '特别活动' : 'Special event'}</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t(selectedEvent.title)}</h2>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600"><span className="flex items-center gap-1.5"><Calendar size={15} />{selectedEvent.date}</span><span className="flex items-center gap-1.5"><Clock size={15} />{selectedEvent.time}</span><span className="flex items-center gap-1.5"><MapPin size={15} />{t(selectedEvent.location)}</span></div>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-600">{t(selectedEvent.description)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Ministry Details Modal */}
      {selectedMinistry && (
        <div 
          className="fixed inset-0 z-[75] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-4" 
          role="dialog" 
          aria-modal="true" 
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedMinistry(null); }}
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <button onClick={() => setSelectedMinistry(null)} className="absolute right-4 top-4 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75 transition-all"><X size={20} /></button>
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-1/2 h-64 sm:h-80 lg:h-auto relative bg-gray-100 shrink-0">
                <img src={selectedMinistry.image} alt={t(selectedMinistry.name)} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="lg:w-1/2 p-6 sm:p-8 space-y-6">
                <div className="inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  {lang === 'zh' ? '事工详情' : 'Ministry Details'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{t(selectedMinistry.name)}</h2>
                <div className="w-16 h-1.5 bg-primary rounded-full" />
                <p className="text-gray-700 text-sm sm:text-base font-light leading-relaxed whitespace-pre-line">
                  {t(selectedMinistry.description)}
                </p>
                <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                  <button 
                    onClick={() => { setSelectedMinistry(null); setActiveTab('timetable'); window.scrollTo(0, 0); }}
                    className="flex-1 px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Clock size={18} />
                    <span>{lang === 'zh' ? '查看聚会时间' : 'View Timetable'}</span>
                  </button>
                  <button 
                    onClick={() => { setSelectedMinistry(null); setActiveTab('about'); window.scrollTo(0, 0); }}
                    className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-all"
                  >
                    {lang === 'zh' ? '联系教会' : 'Contact Us'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Cell Group Details Modal */}
      {selectedCellGroup && (
        <div 
          className="fixed inset-0 z-[75] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-4" 
          role="dialog" 
          aria-modal="true" 
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedCellGroup(null); }}
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl animate-fade-in-down">
            <button onClick={() => setSelectedCellGroup(null)} className="absolute right-4 top-4 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75 transition-all"><X size={20} /></button>
            <div className="h-56 sm:h-72 relative bg-gray-100">
              <img src={selectedCellGroup.image} alt={t(selectedCellGroup.name)} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <span className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block shadow-sm">
                  {t(selectedCellGroup.target)}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{t(selectedCellGroup.name)}</h2>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                    <Users size={14} />
                    <span>{lang === 'zh' ? '负责人' : 'Leader'}</span>
                  </div>
                  <p className="text-gray-900 font-bold">{t(selectedCellGroup.leader)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                    <Clock size={14} />
                    <span>{lang === 'zh' ? '聚会时间' : 'Schedule'}</span>
                  </div>
                  <p className="text-gray-900 font-bold">{t(selectedCellGroup.schedule)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                    <MapPin size={14} />
                    <span>{lang === 'zh' ? '聚会地点' : 'Location'}</span>
                  </div>
                  <p className="text-gray-900 font-bold">{t(selectedCellGroup.location)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{lang === 'zh' ? '小组简介' : 'About this group'}</h4>
                <p className="text-gray-700 text-sm sm:text-base font-light leading-relaxed whitespace-pre-line">
                  {t(selectedCellGroup.description)}
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => { setSelectedCellGroup(null); setActiveTab('about'); window.scrollTo(0, 0); }}
                  className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  {lang === 'zh' ? '联系加入小组' : 'Contact to Join'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged QR Code / Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[80] bg-gray-950/90 backdrop-blur-md flex items-center justify-center p-4" 
          role="dialog" 
          aria-modal="true" 
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedImage(null); }}
        >
          <div className="relative max-w-2xl w-full flex flex-col items-center gap-6">
            <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"><X size={32} /></button>
            <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md">
              <img src={selectedImage.url} alt="Enlarged" className="w-full h-auto rounded-xl shadow-inner" />
            </div>
            {selectedImage.title && (
              <h3 className="text-white text-xl font-bold tracking-wide">{selectedImage.title}</h3>
            )}
            <p className="text-white/60 text-xs uppercase font-bold tracking-[0.2em]">
              {lang === 'zh' ? '点击背景或关闭按钮退出' : 'Click background or close to exit'}
            </p>
          </div>
        </div>
      )}

      {eventPopupOpen && (() => {
        const popupEvents = (data.events || []).filter(e => e.popupEnabled);
        if (popupEvents.length === 0 || activeTab === 'admin') return null;
        const popupEvent = popupEvents[eventPopupSlide % popupEvents.length];
        return (
          <div className="fixed inset-0 z-[70] bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={lang === 'zh' ? '活动通知' : 'Event alert'}>
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <button onClick={() => setEventPopupOpen(false)} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"><X size={18} /></button>
              <img src={popupEvent.image} alt={t(popupEvent.title)} className="w-full max-h-[70vh] object-contain bg-gray-100" />
              <div className="p-6 sm:p-8">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Calendar size={15} /> {lang === 'zh' ? '活动通知' : 'Event alert'}</div>
                <h2 className="text-2xl font-extrabold text-gray-900">{t(popupEvent.title)}</h2>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600"><span className="flex items-center gap-1.5"><Calendar size={15} />{popupEvent.date}</span><span className="flex items-center gap-1.5"><Clock size={15} />{popupEvent.time}</span><span className="flex items-center gap-1.5"><MapPin size={15} />{t(popupEvent.location)}</span></div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">{t(popupEvent.description)}</p>
                {popupEvents.length > 1 && <div className="mt-6 flex items-center justify-between gap-3"><button onClick={() => setEventPopupSlide((eventPopupSlide - 1 + popupEvents.length) % popupEvents.length)} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50" aria-label="Previous event"><ChevronLeft size={18} /></button><div className="flex gap-1.5">{popupEvents.map((_, i) => <button key={i} onClick={() => setEventPopupSlide(i)} aria-label={`Event ${i + 1}`} className={`h-2 w-2 rounded-full ${i === eventPopupSlide ? 'bg-primary' : 'bg-gray-300'}`} />)}</div><button onClick={() => setEventPopupSlide((eventPopupSlide + 1) % popupEvents.length)} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50" aria-label="Next event"><ChevronRight size={18} /></button></div>}
              </div>
            </div>
          </div>
        );
      })()}

      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 md:px-8 border-t border-gray-800 transition-all font-light">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Church identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-primary text-white p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m-6-8h12" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-wide">{t(data.settings.churchName)}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              {t(data.settings.footerDescription) || (lang === 'zh' 
                ? '我们是走入社区的教会。爱邻舍、送温情，大山脚百利镇社区的一个充满主爱、温暖人心的恩典家园。' 
                : 'A community-centered church in Taman Bukit Minyak, shepherding souls and serving vulnerable neighbors with Christ’s love.')}
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{t(data.settings.footerNavTitle) || (lang === 'zh' ? '网站导航' : 'Navigation')}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(() => {
                const vis = data.pageVisibility || {};
                return [
                  { id: 'home', label: lang === 'zh' ? '主页' : 'Home' },
                  { id: 'about', label: lang === 'zh' ? '关于我们' : 'About Us' },
                  vis.ministries !== false && { id: 'ministries', label: lang === 'zh' ? '主要事工' : 'Ministries' },
                  vis.timetable !== false && { id: 'timetable', label: lang === 'zh' ? '聚会时间' : 'Timetable' },
                  vis.events !== false && { id: 'events', label: lang === 'zh' ? '活动预告' : 'Events' },
                  vis.cellgroups !== false && { id: 'cellgroups', label: lang === 'zh' ? '小组' : 'Cell Groups' },
                  vis.offerings !== false && { id: 'offerings', label: lang === 'zh' ? '奉献' : 'Offerings' },
                  vis.bulletins !== false && { id: 'bulletins', label: lang === 'zh' ? '周报与讲道' : 'Bulletins & Sermons' },
                  vis.services !== false && { id: 'services', label: lang === 'zh' ? '崇拜与敬拜' : 'Services & Worships' },
                  vis.newfriend !== false && { id: 'newfriend', label: lang === 'zh' ? '新朋友' : 'New Friend' },
                  vis.maps !== false && { id: 'maps', label: lang === 'zh' ? '地图' : 'Maps' },
                  (data.settings.showLoginButton || isAdminLoggedIn || activeTab === 'admin') && { id: 'admin', label: lang === 'zh' ? (isAdminLoggedIn ? '管理员控制台' : '后台管理') : (isAdminLoggedIn ? 'Admin Console' : 'Admin Area') }
                ].filter(Boolean).map((lnk) => (
                  <button
                    key={lnk.id}
                    onClick={() => switchTab(lnk.id)}
                    className="text-left hover:text-white hover:underline transition-all"
                  >
                    {lnk.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Col 3: Service Schedule Simple Summary */}
          <div className="space-y-3 text-xs leading-relaxed">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{t(data.settings.footerServiceTitle) || (lang === 'zh' ? '核心崇拜聚会' : 'Combined Service')}</h4>
            <div className="space-y-1.5">
              <p className="font-bold text-gray-300">{t(data.settings.footerServiceName) || (lang === 'zh' ? '周日主日崇拜' : 'Sunday Combined Worship')}</p>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={12} />
                <span>{t(data.settings.footerServiceTime) || (lang === 'zh' ? '星期日早上 10:00 AM' : 'Sundays at 10:00 AM')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin size={12} className="shrink-0" />
                <span>{t(data.settings.footerServiceLocation) || (lang === 'zh' ? '教会主堂 / 线上直播同步' : 'Church Sanctuary / Live')}</span>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Social links */}
          <div className="space-y-3 text-xs">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{t(data.settings.footerContactTitle) || (lang === 'zh' ? '联系与到访' : 'Contact Us')}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary shrink-0" />
                <span>{data.settings.contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary shrink-0" />
                <span className="break-all">{data.settings.contactEmail}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{data.settings.contactAddress}</span>
              </div>
            </div>
          </div>

        </div>

{/* Legal block */}
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-gray-800 text-center flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} {t(data.settings.churchName)}. {t(data.settings.footerCopyright)}</p>
          <p className="font-light">
            {t(data.settings.footerTagline)}
          </p>
        </div>
      </footer>

    </div>
  );
}
