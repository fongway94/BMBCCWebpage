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
  Navigation
} from 'lucide-react';
import { initialData } from './data/initialData';

// Theme color map for CSS variable injection
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
        // Ensure standard structure is present
        return { ...initialData, ...parsed };
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
  
  // Editor temporary states
  const [editingSlide, setEditingSlide] = useState(null); // slide ID or 'new'
  const [editingTimetable, setEditingTimetable] = useState(null); // timetable item ID or 'new'
  const [editingEvent, setEditingEvent] = useState(null); // event ID or 'new'
  const [editingMinistry, setEditingMinistry] = useState(null); // ministry ID or 'new'
  const [editingBulletin, setEditingBulletin] = useState(null);
  const [editingCellGroup, setEditingCellGroup] = useState(null);
  const [editingLeader, setEditingLeader] = useState(null);
  const [editingSermon, setEditingSermon] = useState(null);
  const [sermonFilter, setSermonFilter] = useState('all');
  const [bulletinsTab, setBulletinsTab] = useState('bulletins');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  
  // Apply theme color
  useEffect(() => {
    const colorKey = data.settings.themeColor || 'emerald';
    const selected = colorsMap[colorKey] || colorsMap.emerald;
    document.documentElement.style.setProperty('--color-primary', selected.primary);
    document.documentElement.style.setProperty('--color-primary-dark', selected.dark);
    document.documentElement.style.setProperty('--color-primary-light', selected.light);
  }, [data.settings.themeColor]);

  // Save helper
  const saveAllData = (newData) => {
    setData(newData);
    localStorage.setItem('bmbcc_site_data', JSON.stringify(newData));
    triggerAdminSuccess("修改已成功保存并即时生效！Changes saved successfully!");
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

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === data.settings.adminPassword) {
      setIsAdminLoggedIn(true);
      setAdminLoginError('');
      setAdminPasswordInput('');
    } else {
      setAdminLoginError(lang === 'zh' ? '密码不正确，请重试' : 'Incorrect password, please try again');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setActiveTab('home');
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

  const handleMoveSlide = (index, direction) => {
    const updated = { ...data };
    const arr = [...updated.carousel];
    if (direction === 'up' && index > 0) {
      [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    } else if (direction === 'down' && index < arr.length - 1) {
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    }
    updated.carousel = arr;
    saveAllData(updated);
  };

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

  // 9.6 Page Visibility Actions
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

  const handleSaveOfferingMethod = (method) => {
    const updated = { ...data };
    if (!updated.offerings) updated.offerings = {};
    if (!updated.offerings.methods) updated.offerings.methods = [];
    const newId = Math.max(...updated.offerings.methods.map(m => m.id || 0), 0) + 1;
    updated.offerings.methods.push({ ...method, id: method.id || newId });
    saveAllData(updated);
  };

  const handleDeleteOfferingMethod = (index) => {
    if (window.confirm(lang === 'zh' ? '确定要删除此奉献方式吗？' : 'Are you sure you want to delete this giving method?')) {
      const updated = { ...data };
      if (!updated.offerings) updated.offerings = {};
      updated.offerings.methods = [...(updated.offerings.methods || [])];
      updated.offerings.methods.splice(index, 1);
      saveAllData(updated);
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
    if (index !== undefined && index >= 0) {
      updated.newFriendGuide.sections[index] = section;
    } else {
      const newId = Math.max(...(updated.newFriendGuide.sections.map(s => s.id) || [0]), 0) + 1;
      updated.newFriendGuide.sections.push({ ...section, id: newId });
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
    const jsonStr = JSON.stringify(data, null, 2);
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
    <div className="min-h-screen flex flex-col font-sans">
      
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
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl shadow-md shadow-primary/20 transition-all">
                  {/* Custom cross SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m-6-8h12" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-lg md:text-xl text-gray-900 block leading-tight tracking-wide font-sans">
                    {t(data.settings.churchName)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                    {data.settings.churchAbbreviation} • {lang === 'zh' ? '百利镇社区教会' : 'Taman Bukit Minyak Community'}
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
                        onClick={() => { setActiveTab(group.id); window.scrollTo(0, 0); }}
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
                            onClick={() => { setActiveTab(item.id); window.scrollTo(0, 0); }}
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

              {/* Admin Panel Access Button - Hidden by default for security */}
              {(data.settings.showLoginButton || isAdminLoggedIn) && (
                <button
                  onClick={() => { setActiveTab('admin'); window.scrollTo(0, 0); }}
                  className={`p-2 rounded-lg flex items-center gap-1.5 transition-all text-sm ${
                    activeTab === 'admin'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-500 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                  title={lang === 'zh' ? '管理员后台' : 'Admin Panel'}
                >
                  <Shield size={17} />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    {isAdminLoggedIn ? (lang === 'zh' ? '后台' : 'Admin') : (lang === 'zh' ? '登录' : 'Login')}
                  </span>
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
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
                  vis.newfriend !== false && { id: 'newfriend', label: lang === 'zh' ? '  新朋友指南' : '  New Friend Guide', sub: true },
                  vis.maps !== false && { id: 'maps', label: lang === 'zh' ? '地图' : 'Maps' },
                  (data.settings.showLoginButton || isAdminLoggedIn) && { id: 'admin', label: lang === 'zh' ? (isAdminLoggedIn ? '管理员控制台' : '后台管理登录') : (isAdminLoggedIn ? 'Admin Console' : 'Admin Login'), icon: Shield }
                ].filter(Boolean);

                return allTabs.map((tab) => (
                  tab.disabled ? (
                    <div key={tab.id} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">
                      <span>{tab.label}</span>
                    </div>
                  ) : (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                        window.scrollTo(0, 0);
                      }}
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
            <div className="relative h-[480px] md:h-[620px] bg-gray-900 overflow-hidden group">
              {data.carousel.length > 0 ? (
                <>
                  {/* Current Slide */}
                  <div className="absolute inset-0 transition-all duration-1000 ease-out transform scale-100">
                    <img 
                      src={data.carousel[currentSlide].image} 
                      alt="Banner Image" 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                  </div>

                  {/* Slide Text Content */}
                  <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                    <div className="max-w-4xl mx-auto space-y-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs uppercase tracking-wider font-bold animate-pulse">
                        <Sparkles size={13} />
                        {lang === 'zh' ? '欢迎莅临大山脚浸信教会' : 'Welcome to BMBCC'}
                      </span>
                      <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                        {t(data.carousel[currentSlide].title)}
                      </h1>
                      <p className="text-base sm:text-lg md:text-xl text-gray-200 font-light max-w-2xl mx-auto leading-relaxed drop-shadow">
                        {t(data.carousel[currentSlide].subtitle)}
                      </p>
                      
                      <div className="pt-4 flex flex-wrap justify-center gap-4">
                        <button 
                          onClick={() => setActiveTab('timetable')}
                          className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold transition-all shadow-lg shadow-primary/30 flex items-center gap-2 transform hover:-translate-y-0.5"
                        >
                          <Clock size={18} />
                          <span>{lang === 'zh' ? '聚会时间表' : 'Join Our Services'}</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('about')}
                          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/30 backdrop-blur-sm transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                        >
                          <Info size={18} />
                          <span>{lang === 'zh' ? '关于我们' : 'Learn More'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manual Controls */}
                  <button 
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + data.carousel.length) % data.carousel.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % data.carousel.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Indicator Dots */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {data.carousel.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-primary' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
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
                      {lang === 'zh' ? '年度主题与异象' : 'Yearly Vision'}
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                      {lang === 'zh' ? '走入社区，宣扬主爱' : 'Go into the Community, Proclaim Lord\'s Love'}
                    </h3>
                    
                    <div className="border-l-4 border-primary pl-4 text-lg font-medium text-gray-800 whitespace-pre-line leading-relaxed italic bg-white/60 p-4 rounded-r-lg">
                      {t(data.settings.themeYear)}
                    </div>

                    <div className="space-y-3 text-gray-600 font-light leading-relaxed">
                      <p>
                        {lang === 'zh' 
                          ? '大山脚浸信教会深信神赐予我们的召命：走出教会的舒适圈，切切实实走入我们所在的百利镇社区，接触身边的邻舍。' 
                          : 'BMBCC firmly believes in the calling given by God: to step out of our comfort zones and walk directly into Taman Bukit Minyak community to touch our neighbors\' lives.'}
                      </p>
                      <p>
                        {lang === 'zh'
                          ? '我们透过‘爱邻社区关怀’、‘五饼二鱼’爱心便当等，用实际行动表明：主耶稣是爱他们的，也是在苦难和缺乏中的安慰与倚靠。'
                          : 'Through our "Neighborly Community Care" and "Five Loaves & Two Fishes" warm bento service, we demonstrate in deeds: the Lord Jesus loves them and is their solace and provider.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Soaring Eagle Image & Scripture Overlay */}
                  <div className="md:col-span-5 h-[320px] md:h-full min-h-[360px] relative">
                    <img 
                      src="https://images.unsplash.com/photo-1540979388789-6cee28a16838?auto=format&fit=crop&w=800&q=80" 
                      alt="Soaring Eagle" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent md:bg-gradient-to-l md:from-black/90 md:via-black/40" />
                    <div className="absolute inset-0 flex flex-col justify-end p-8 text-white space-y-3">
                      <span className="text-primary font-bold tracking-widest text-xs uppercase">
                        {lang === 'zh' ? '展翅高飞 • 广传福音' : 'Soar High • Spread Gospel'}
                      </span>
                      <h4 className="text-lg font-bold italic leading-relaxed">
                        “{lang === 'zh' ? '神爱世人，甚至把他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。' : 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.'}”
                      </h4>
                      <span className="text-right text-xs text-gray-300 font-semibold block">
                        —— {lang === 'zh' ? '约翰福音 3:16' : 'John 3:16'}
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
                  {lang === 'zh' ? '耶稣爱你，我们欢迎你！' : 'Jesus Loves You & We Welcome You!'}
                </h2>
                <p className="text-base md:text-lg text-white/95 max-w-xl mx-auto font-light leading-relaxed">
                  {lang === 'zh' 
                    ? '无论您是在寻找生命的意义、属灵的港湾，还是社区的陪伴，这里的大门始终为您敞开。让我们一起在主爱里生活，彼此扶持！' 
                    : 'Whether you seek the meaning of life, a spiritual home, or community fellowship, our doors are always open. Let\'s grow and support each other in His grace!'}
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
                {lang === 'zh' ? '了解我们大山脚浸信教会' : 'Get to Know BMBCC'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '关于我们' : 'About Us'}
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
                  {lang === 'zh' ? '属灵领袖与关怀同工' : 'Spiritual Guides & Shepherds'}
                </span>
                <h2 className="text-3xl font-extrabold text-gray-900">
                  {lang === 'zh' ? '牧者与事工团队' : 'Leadership Team'}
                </h2>
                <p className="text-gray-600 text-sm font-light leading-relaxed">
                  {lang === 'zh' 
                    ? '神选召并赐予我们的忠心仆人，倾尽爱心，牧养群羊，引领社区事工蓬勃发展。' 
                    : 'Servants called by God to shepherd the congregation and guide community ministries with love.'}
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
                {lang === 'zh' ? '走入人群，服侍弱势' : 'Outreach & Community Service'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '教会事工介绍' : 'Our Ministries'}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {lang === 'zh' 
                  ? '大山脚浸信教会不仅专注于信徒身心灵的牧养，更带着沉甸甸的负担投身于百利镇周边社区。我们相信，爱需要行动来显明，福音是看得见的。' 
                  : 'BMBCC focuses on shepherding believers as well as reaching out to the surrounding communities. We believe love requires action and the gospel should be visible.'}
              </p>
            </div>

            {/* Full Ministry List with Alternate Layout */}
            <div className="space-y-16">
              {data.ministries.map((min, index) => (
                <div 
                  key={min.id}
                  className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-center bg-white p-6 md:p-8 rounded-2xl border border-gray-150 shadow-sm ${
                    index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className="w-full lg:w-1/2 h-64 sm:h-80 md:h-96 relative overflow-hidden rounded-xl shrink-0">
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
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                      {t(min.name)}
                    </h2>
                    <div className="w-16 h-1 bg-primary rounded" />
                    <p className="text-gray-700 text-sm md:text-base font-light leading-relaxed whitespace-pre-line">
                      {t(min.description)}
                    </p>
                    <div className="pt-2 flex gap-3">
                      <button 
                        onClick={() => { setActiveTab('timetable'); window.scrollTo(0, 0); }}
                        className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-md shadow-primary/15"
                      >
                        <Clock size={16} />
                        <span>{lang === 'zh' ? '查看相关聚会时间' : 'View Timetable'}</span>
                      </button>
                      <button 
                        onClick={() => { setActiveTab('about'); window.scrollTo(0, 0); }}
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
                      >
                        {lang === 'zh' ? '联系负责人' : 'Contact Minister'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== PAGE: TIMETABLE ==================== */}
        {activeTab === 'timetable' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {lang === 'zh' ? '与我们一同朝见神' : 'Fellowship & Grow Together'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '周聚会时间表' : 'Weekly Timetable'}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {lang === 'zh' 
                  ? '我们诚挚地邀请您和您的家人参与我们的周聚会，共同在敬拜、祷告、真理和爱心团契里，经历生命的翻转与复兴。' 
                  : 'We sincerely invite you and your family to join our weekly fellowships, experiencing transformation and revival through worship, prayer, truth, and community.'}
              </p>
            </div>

            {/* Elegant Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
              <div className="bg-primary/5 py-4 px-6 border-b border-gray-150 flex items-center gap-2">
                <CalendarCheck className="text-primary shrink-0" size={20} />
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  {lang === 'zh' ? '定期崇拜与各级团契时间' : 'Regular Weekly Services & Fellowships'}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-6">{lang === 'zh' ? '聚会名称' : 'Meeting / Service'}</th>
                      <th className="py-4 px-6">{lang === 'zh' ? '聚会时间' : 'Day & Time'}</th>
                      <th className="py-4 px-6">{lang === 'zh' ? '地点 / 平台' : 'Location / Format'}</th>
                      <th className="py-4 px-6">{lang === 'zh' ? '媒介语言' : 'Language'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.timetable.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors text-sm text-gray-700">
                        <td className="py-4.5 px-6 font-bold text-gray-900">
                          {t(item.name)}
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-primary-light text-primary text-xs font-bold shrink-0">
                              {t(item.day)}
                            </span>
                            <span className="font-medium text-gray-600">{item.time}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-gray-600 font-light">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-gray-400 shrink-0" />
                            <span>{t(item.location)}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">
                            {t(item.language)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notice Footer */}
            <div className="mt-8 bg-amber-50 rounded-xl p-5 border border-amber-200/60 flex items-start gap-3.5 max-w-3xl mx-auto">
              <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1.5 text-xs text-amber-900 font-light leading-relaxed">
                <p className="font-bold">{lang === 'zh' ? '温馨提示' : 'Kind Notice'}:</p>
                <p>
                  {lang === 'zh'
                    ? '由于有些聚会（如祷告会）或遇公共假期会改为联合或调整时间，新朋友莅临前欢迎先致电咨询，或通过后台联系同工，以便我们能为您提供最好的接待。'
                    : 'Since some services or prayer meetings may shift or merge during public holidays, first-time visitors are encouraged to contact our pastoral team in advance for the best hospitality.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PAGE: EVENTS ==================== */}
        {activeTab === 'events' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {lang === 'zh' ? '教会精彩纪实与未来计划' : 'Highlights & Upcoming Outlines'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '特别活动预告' : 'Special Events'}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {lang === 'zh' 
                  ? '在这里，您可以了解到教会近期举办的大型特殊崇拜、节日庆典、关怀行动和社区营会，欢迎带同亲友报名并一同参盛。' 
                  : 'Here, you can learn about our upcoming special worship services, holiday celebrations, welfare activities, and camps. Welcome to register and attend with friends!'}
              </p>
            </div>

            {/* Events Grid */}
            {data.events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.events.map((evt) => (
                  <div key={evt.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm flex flex-col hover:shadow-lg transition-all duration-300">
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
                    </div>
                  </div>
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
                  <div className="p-6 flex-grow space-y-4">
                    <p className="text-gray-600 text-sm font-light leading-relaxed">{t(method.description)}</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-gray-700 text-xs font-medium leading-relaxed whitespace-pre-line">{t(method.details)}</p>
                    </div>
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
          const sermons = data.sermons || [];
          const allPreachers = [...new Set(sermons.map(s => t(s.preacher)))];
          const allSeries = [...new Set(sermons.map(s => t(s.series)))];
          
          const filteredSermons = sermonFilter === 'all' ? sermons :
            sermons.filter(s => t(s.preacher) === sermonFilter || t(s.series) === sermonFilter);
          
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
                  {lang === 'zh' ? '教会资源中心' : 'Church Resource Centre'}
                </span>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {lang === 'zh' ? '周报与讲道库' : 'Bulletins & Sermon Library'}
                </h1>
                <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                  {lang === 'zh'
                    ? '查阅每周周报、代祷事项，或回顾过往讲道信息。'
                    : 'Access weekly bulletins, prayer items, and past sermon messages.'}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex justify-center mb-10">
                <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setBulletinsTab('bulletins')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      bulletinsTab === 'bulletins'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText size={16} />
                    <span>{lang === 'zh' ? '周报下载' : 'Weekly Bulletins'}</span>
                  </button>
                  <button
                    onClick={() => setBulletinsTab('sermons')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      bulletinsTab === 'sermons'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>{lang === 'zh' ? '讲道库' : 'Sermon Library'}</span>
                  </button>
                </div>
              </div>

              {/* Bulletins Tab */}
              {bulletinsTab === 'bulletins' && (
                <div>
                  {(data.bulletins || []).length > 0 ? (
                    <div className="space-y-6">
                      {data.bulletins.map((bulletin) => (
                        <div key={bulletin.id} className="bg-white rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-all overflow-hidden">
                          <div className="flex flex-col md:flex-row">
                            <div className="md:w-16 bg-primary/5 flex items-center justify-center p-4 md:p-0 shrink-0">
                              <FileText className="text-primary" size={24} />
                            </div>
                            <div className="flex-grow p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                  <h3 className="font-extrabold text-lg text-gray-900">{t(bulletin.title)}</h3>
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
                                {bulletin.fileUrl && bulletin.fileUrl !== '#' && (
                                  <a href={bulletin.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shrink-0">
                                    <Download size={14} />
                                    <span>{lang === 'zh' ? '下载周报' : 'Download PDF'}</span>
                                  </a>
                                )}
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
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                      <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-500 font-light">{lang === 'zh' ? '目前暂无周报发布。' : 'No bulletins available at the moment.'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sermons Tab */}
              {bulletinsTab === 'sermons' && (
                <div>
                  {/* Filters */}
                  {(allPreachers.length > 0 || allSeries.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3 mb-8 justify-center">
                      <button
                        onClick={() => setSermonFilter('all')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                          sermonFilter === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {lang === 'zh' ? '全部' : 'All'}
                      </button>
                      {allSeries.map((series) => (
                        <button
                          key={series}
                          onClick={() => setSermonFilter(series)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            sermonFilter === series
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {series}
                        </button>
                      ))}
                      {allPreachers.map((preacher) => (
                        <button
                          key={preacher}
                          onClick={() => setSermonFilter(preacher)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            sermonFilter === preacher
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {preacher}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredSermons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredSermons.map((sermon) => (
                        <div key={sermon.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                          {/* Video Thumbnail / Embed */}
                          <div className="relative aspect-video bg-gray-900">
                            {sermon.videoUrl && getYoutubeEmbedUrl(sermon.videoUrl) ? (
                              <iframe
                                src={getYoutubeEmbedUrl(sermon.videoUrl)}
                                title={t(sermon.title)}
                                className="absolute inset-0 w-full h-full"
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
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                  {t(sermon.series)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-gray-400 text-[10px]">
                                  <Calendar size={10} />
                                  {sermon.date}
                                </span>
                              </div>
                              <h3 className="font-extrabold text-sm text-gray-900 leading-tight">{t(sermon.title)}</h3>
                              {sermon.scripture && (
                                <p className="text-xs text-primary font-medium mt-1 italic">📖 {sermon.scripture}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 text-xs font-light leading-relaxed line-clamp-2">{t(sermon.description)}</p>
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <Users size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-500">{t(sermon.preacher)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                      <BookOpen className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-500 font-light">{lang === 'zh' ? '目前暂无讲道信息。' : 'No sermons available at the moment.'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================== PAGE: CELL GROUPS ==================== */}
        {activeTab === 'cellgroups' && (
          <div className="animate-fade-in py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-primary font-bold uppercase tracking-wider text-xs">
                {lang === 'zh' ? '小组生活 · 彼此相顾' : 'Community Life · Caring for One Another'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {lang === 'zh' ? '细胞小组' : 'Cell Groups'}
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {lang === 'zh'
                  ? '小组是我们教会最重要的团契生活单元。每个小组定期聚会，一同查经、祷告、分享生命，在主爱中彼此建立。欢迎加入我们的小组！'
                  : 'Cell groups are the heart of our fellowship life. Each group meets regularly for Bible study, prayer, and life sharing, building each other up in the Lord\'s love. Join us!'}
              </p>
            </div>

            {(data.cellGroups || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.cellGroups.map((group) => (
                  <div key={group.id} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="relative h-48 overflow-hidden">
                      <img src={group.image} alt={t(group.name)} className="w-full h-full object-cover hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="font-extrabold text-xl">{t(group.name)}</h3>
                        <span className="text-xs text-white/80 bg-primary/80 px-2 py-0.5 rounded mt-1 inline-block">{t(group.target)}</span>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm font-light leading-relaxed">{t(group.description)}</p>
                      <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
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
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span className="font-medium text-gray-700">{lang === 'zh' ? '地点：' : 'Location: '}</span>
                          <span>{t(group.location)}</span>
                        </div>
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
                {lang === 'zh' ? '找到我们' : 'Find Us'}
              </span>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3">
                <MapIcon className="text-primary" size={36} />
                <span>{lang === 'zh' ? '教会地图与交通指南' : 'Church Map & Directions'}</span>
              </h1>
              <p className="text-gray-600 font-light text-base md:text-lg leading-relaxed">
                {lang === 'zh' ? '我们在多个地点设有聚会点，请选择离您最近的地点。' : 'We have fellowship points at multiple locations. Choose the one closest to you.'}
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
                    Default Password: <span className="font-bold underline select-all">bmbccadmin123</span>
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
                        { id: 'settings', label: lang === 'zh' ? '基本设置 & 配色' : 'General & Colors', icon: SettingsIcon },
                        { id: 'carousel', label: lang === 'zh' ? '横幅幻灯片' : 'Banner Slides', icon: Sparkles },
                        { id: 'timetable', label: lang === 'zh' ? '聚会时间表' : 'Timetable Services', icon: Calendar },
                        { id: 'ministries', label: lang === 'zh' ? '核心事工管理' : 'Ministries Content', icon: Heart },
                        { id: 'events', label: lang === 'zh' ? '活动内容发布' : 'Events Post', icon: CalendarCheck },
                        { id: 'leadership', label: lang === 'zh' ? '牧者同工编辑' : 'Pastor/Leader Editor', icon: Users },
                        { id: 'offerings', label: lang === 'zh' ? '奉献设置' : 'Offerings Settings', icon: HandHeart },
                        { id: 'bulletins', label: lang === 'zh' ? '周报管理' : 'Bulletins Manager', icon: FileText },
                        { id: 'sermons', label: lang === 'zh' ? '讲道库' : 'Sermon Library', icon: BookOpen },
                        { id: 'cellgroups', label: lang === 'zh' ? '小组管理' : 'Cell Groups', icon: Compass },
                        { id: 'newfriend', label: lang === 'zh' ? '新朋友指南' : 'New Friend Guide', icon: HelpCircle },
                        { id: 'maps', label: lang === 'zh' ? '地图设置' : 'Maps Settings', icon: MapIcon },
                        { id: 'backup', label: lang === 'zh' ? '数据备份与恢复' : 'Backup & Restore', icon: Download }
                      ].map((sec) => (
                        <button
                          key={sec.id}
                          onClick={() => {
                            setAdminActiveSection(sec.id);
                            setEditingSlide(null);
                            setEditingTimetable(null);
                            setEditingEvent(null);
                            setEditingMinistry(null);
                            setEditingBulletin(null);
                            setEditingCellGroup(null);
                            setEditingLeader(null);
                            setEditingSermon(null);
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

                        {/* Contact details */}
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

                        {/* Change Password */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">修改后台管理密码 / Admin Password</label>
                          <input 
                            type="text"
                            value={data.settings.adminPassword}
                            onChange={(e) => updateSetting('adminPassword', null, e.target.value)}
                            className="w-full px-3 py-2 rounded border border-amber-300 bg-amber-50/30 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>

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
                              {data.timetable.map((item) => (
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
                          {data.ministries.map((min) => (
                            <div key={min.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <img src={min.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{min.name.zh} / {min.name.en}</h4>
                                  <p className="text-xs text-gray-500 font-light line-clamp-1">{min.description.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
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
                              description: { zh: '在此处填写新活动详情和报名信息。', en: 'Write detail registration or information here.' }
                            })}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '发布新活动' : 'Publish Event'}</span>
                          </button>
                        )}
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
                          {data.events.map((evt) => (
                            <div key={evt.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <img src={evt.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{evt.title.zh} / {evt.title.en}</h4>
                                  <div className="flex items-center gap-1 text-[11px] text-primary font-bold">
                                    <Calendar size={11} />
                                    <span>{evt.date}</span>
                                    <span className="text-gray-400 font-light">({evt.time})</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
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


                  {/* SECTION: LEADERSHIP / PASTOR EDITOR */}
                  {adminActiveSection === 'leadership' && (
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
                          {(data.leadership || []).map((leader) => (
                            <div key={leader.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-4 items-center w-full sm:w-3/4">
                                <img src={leader.image} alt="Preview" className="w-14 h-14 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{leader.name.zh} / {leader.name.en}</h4>
                                  <p className="text-xs text-primary font-semibold">{leader.role.zh} / {leader.role.en}</p>
                                  <p className="text-xs text-gray-500 font-light line-clamp-1">{leader.bio.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
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
                          <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '奉献方式管理' : 'Giving Methods'}</h3>
                          {(data.offerings?.methods || []).map((method, idx) => (
                            <div key={method.id || idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 flex flex-col sm:flex-row gap-3 items-start justify-between">
                              <div className="flex-grow">
                                <span className="font-bold text-sm text-gray-900">{method.title.zh} / {method.title.en}</span>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{method.description.zh}</p>
                              </div>
                              <button onClick={() => handleDeleteOfferingMethod(idx)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleSaveOfferingMethod({
                              title: { zh: '新奉献方式', en: 'New Method' },
                              description: { zh: '描述...', en: 'Description...' },
                              details: { zh: '详细信息...', en: 'Details...' },
                              icon: 'heart'
                            })}
                            className="mt-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加奉献方式' : 'Add Method'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION: BULLETINS MANAGER */}
                  {adminActiveSection === 'bulletins' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '周报/月刊管理' : 'Bulletins Manager'}</h2>
                          <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '管理教会周报和月刊的发布' : 'Manage church weekly bulletins and monthly newsletters'}</p>
                        </div>
                        {editingBulletin === null && (
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
                      </div>

                      {editingBulletin ? (
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
                              <label className="block text-xs font-bold text-gray-600 mb-1">{lang === 'zh' ? 'PDF/文件链接' : 'PDF/File URL'}</label>
                              <input type="text" value={editingBulletin.fileUrl} onChange={(e) => setEditingBulletin({ ...editingBulletin, fileUrl: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
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
                          {(data.bulletins || []).map((bulletin) => (
                            <div key={bulletin.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <FileText className="text-primary shrink-0" size={20} />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{bulletin.title.zh} / {bulletin.title.en}</h4>
                                  <p className="text-xs text-gray-500">{bulletin.date} • {bulletin.category.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
                                <button onClick={() => setEditingBulletin(bulletin)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteBulletin(bulletin.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION: SERMON LIBRARY MANAGER */}
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
                          {(data.sermons || []).map((sermon) => (
                            <div key={sermon.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
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
                                <button onClick={() => setEditingSermon(sermon)} className="p-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteSermon(sermon.id)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
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
                          {(data.cellGroups || []).map((group) => (
                            <div key={group.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-3 items-center w-full sm:w-3/4">
                                <img src={group.image} alt="Preview" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-200" />
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-gray-900">{group.name.zh} / {group.name.en}</h4>
                                  <p className="text-xs text-gray-500">{group.schedule.zh} • {group.location.zh}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end shrink-0 w-full sm:w-auto">
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
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '新朋友指南编辑' : 'New Friend Guide Editor'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '编辑新朋友指南的欢迎词和各章节内容' : 'Edit welcome message and section content of the new friend guide'}</p>
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

                        {/* Guide Sections */}
                        <div className="pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '指南章节管理' : 'Guide Sections'}</h3>
                          {(data.newFriendGuide?.sections || []).map((section, idx) => (
                            <div key={section.id || idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 flex flex-col sm:flex-row gap-3 items-start justify-between">
                              <div className="flex-grow">
                                <span className="font-bold text-sm text-gray-900">{section.title.zh} / {section.title.en}</span>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{section.content.zh?.substring(0, 80)}...</p>
                              </div>
                              <button onClick={() => handleDeleteGuideSection(idx)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 shrink-0"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleSaveGuideSection({
                              title: { zh: '新章节标题', en: 'New Section Title' },
                              content: { zh: '章节内容...', en: 'Section content...' }
                            })}
                            className="mt-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Plus size={14} />
                            <span>{lang === 'zh' ? '添加章节' : 'Add Section'}</span>
                          </button>
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

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        {(data.maps || []).map((church, idx) => (
                          <div key={church.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-extrabold text-sm text-gray-900">
                                {lang === 'zh' ? `地点 ${idx + 1}: ` : `Location ${idx + 1}: `} {t(church.name)}
                              </h3>
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
                  {adminActiveSection === 'backup' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{lang === 'zh' ? '数据备份、本地恢复与重置' : 'Backup, Import & Factory Reset'}</h2>
                        <p className="text-xs text-gray-500 font-light mt-1">{lang === 'zh' ? '为了实现“100%零托管订阅费”，本站直接使用浏览器本地存储(LocalStorage)保存您的所有编辑。您在此可以导出配置备份或导入历史配置' : 'This website utilizes high-speed LocalStorage to keep your adjustments for free. Use this page to download configurations and backup your site.'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                        
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
              {lang === 'zh' 
                ? '我们是走入社区的教会。爱邻舍、送温情，大山脚百利镇社区的一个充满主爱、温暖人心的恩典家园。' 
                : 'A community-centered church in Taman Bukit Minyak, shepherding souls and serving vulnerable neighbors with Christ’s love.'}
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{lang === 'zh' ? '网站导航' : 'Navigation'}</h4>
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
                  vis.newfriend !== false && { id: 'newfriend', label: lang === 'zh' ? '新朋友' : 'New Friend' },
                  vis.maps !== false && { id: 'maps', label: lang === 'zh' ? '地图' : 'Maps' },
                  (data.settings.showLoginButton || isAdminLoggedIn) && { id: 'admin', label: lang === 'zh' ? '后台管理' : 'Admin Area' }
                ].filter(Boolean).map((lnk) => (
                  <button
                    key={lnk.id}
                    onClick={() => { setActiveTab(lnk.id); window.scrollTo(0, 0); }}
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
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{lang === 'zh' ? '核心崇拜聚会' : 'Combined Service'}</h4>
            <div className="space-y-1.5">
              <p className="font-bold text-gray-300">{lang === 'zh' ? '周日主日崇拜' : 'Sunday Combined Worship'}</p>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={12} />
                <span>{lang === 'zh' ? '星期日早上 10:00 AM' : 'Sundays at 10:00 AM'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin size={12} className="shrink-0" />
                <span>{lang === 'zh' ? '教会主堂 / 线上直播同步' : 'Church Sanctuary / Live'}</span>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Social links */}
          <div className="space-y-3 text-xs">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">{lang === 'zh' ? '联系与到访' : 'Contact Us'}</h4>
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
          <p>© {new Date().getFullYear()} {t(data.settings.churchName)}. {lang === 'zh' ? '保留所有权利。' : 'All rights reserved.'}</p>
          <p className="font-light">
            {lang === 'zh' 
              ? '免费开源网站 · 零订阅费 · 极速自管理后台' 
              : 'Free Open-Source Website • No Subscription Fees • Instant Admin Console'}
          </p>
        </div>
      </footer>

    </div>
  );
}
