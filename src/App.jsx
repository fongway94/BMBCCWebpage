import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Menu, X, Languages, ShoppingCart, ShoppingBag, Heart, User, Search, Plus, Minus,
  Trash2, Edit3, Save, Download, Upload, Shield, LogOut, ChevronLeft, ChevronRight,
  ArrowRight, ArrowUp, ArrowDown, Star, Gift, Tag, Package, Truck, CreditCard,
  MapPin, Phone, Mail, Calendar, Clock, Check, CheckCircle, AlertTriangle, Info,
  Filter, LayoutGrid, ExternalLink, Sparkles, Award, Users, DollarSign, Percent,
  Copy, Settings as SettingsIcon, Layers, FileText, Eye, EyeOff, Home, Grid,
  Zap, Crown, Bell, RefreshCw, Image as ImageIcon, List, ChevronDown, Globe,
  Camera, PlayCircle
} from 'lucide-react';
import { initialData } from './data/initialData';
import MediaStorageManager from './components/MediaStorageManager';
import { formatPrice as fmtPriceUtil, calcSubtotal, getMembershipTier, calcPoints, isBirthdayMonth, checkGWP, applyCoupon, generateOrderId, generateReferralCode } from './lib/ecommerceUtils';

const AUTH_ENDPOINT = '/functions/auth';
const GITHUB_SETTINGS_ENDPOINT = '/functions/github-settings';
const GITHUB_REPO_DEFAULT = import.meta.env?.VITE_GITHUB_REPO || 'fongway94/BMBCCWebpage';
const AUTO_SAVE_DEBOUNCE_MS = 30000;

// --- Media upload context (same as before) ---
const MediaUploadContext = React.createContext(false);
function MediaUrlField({ value, onChange, category='images', accept='image/jpeg,image/png,image/webp', label='Image URL', highlightId }) {
  const uploadsEnabled = React.useContext(MediaUploadContext);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const upload = async (file) => {
    if (!uploadsEnabled) { setMessage('Media uploads disabled in Media Storage settings. Paste URL.'); return; }
    if (!file) return;
    if (file.type === 'image/jpeg' && category !== 'logos' && category !== 'qrcodes') {
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
        canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
        const blob = await new Promise(r=>canvas.toBlob(r,'image/webp',.82));
        bitmap.close();
        if (blob) file = new File([blob], `${file.name.replace(/\.[^.]+$/,'')}.webp`, {type:'image/webp'});
      } catch {}
    }
    setMessage('Uploading…'); setProgress(5);
    const body = new FormData(); body.append('file', file); body.append('category', category);
    if (highlightId) body.append('fellowshipHighlightId', String(highlightId));
    const xhr = new XMLHttpRequest(); xhr.open('POST','/media'); xhr.withCredentials=true;
    xhr.upload.onprogress = e=> e.lengthComputable && setProgress(Math.round(e.loaded/e.total*100));
    xhr.onload = ()=>{ try{ const res=JSON.parse(xhr.responseText); if(xhr.status<300 && res.ok){ onChange(res.url); setProgress(100); setMessage('Uploaded. Save form to publish.'); } else throw new Error(res.error);}catch(e){ setProgress(0); setMessage(e.message||'Upload failed'); } };
    xhr.onerror = ()=>{ setProgress(0); setMessage('Network error'); };
    xhr.send(body);
  };
  return <div className="space-y-1"><label className="block text-xs font-bold text-gray-600 mb-1">{label}</label><div className="flex gap-2"><input type="text" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 px-3 py-2 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-primary focus:outline-none"/><input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e=>upload(e.target.files?.[0])}/><button type="button" disabled={!uploadsEnabled} onClick={()=>inputRef.current?.click()} className="shrink-0 px-3 py-2 rounded bg-primary text-white text-xs font-semibold disabled:opacity-45">Upload</button></div>{message && <p className={`text-[10px] ${message.startsWith('Uploaded')?'text-green-600':message.startsWith('Uploading')?'text-gray-500':'text-red-600'}`}>{message} {progress>0&&progress<100?`${progress}%`:''}</p>}</div>;
}

// --- Helpers ---
const stripSensitiveData = (siteData) => {
  const s = { ...siteData, settings: { ...(siteData?.settings||{}) } };
  delete s.settings.adminPassword;
  return s;
};

const hexToRgb = (hex) => {
  const v = String(hex||'').replace('#','').trim();
  const norm = v.length===3 ? v.split('').map(c=>c+c).join('') : v;
  if (!/^[0-9a-f]{6}$/i.test(norm)) return null;
  return { r: parseInt(norm.slice(0,2),16), g: parseInt(norm.slice(2,4),16), b: parseInt(norm.slice(4,6),16) };
};
const rgbString = rgb => `${rgb.r} ${rgb.g} ${rgb.b}`;

// Expanded font options - fixing missing Chinese fonts issue
const fontFamilyOptions = {
  zh: [
    { value: 'noto-sans-sc', label: 'Noto Sans SC 思源黑體 簡 (推薦)', family: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif' },
    { value: 'noto-sans-tc', label: 'Noto Sans TC 思源黑體 繁', family: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif' },
    { value: 'noto-serif-sc', label: 'Noto Serif SC 思源宋體 簡', family: '"Noto Serif SC", "Songti SC", SimSun, serif' },
    { value: 'noto-serif-tc', label: 'Noto Serif TC 思源宋體 繁', family: '"Noto Serif TC", "Songti TC", serif' },
    { value: 'zcool-xiaowei', label: 'ZCOOL XiaoWei 小薇邏輯體 文藝', family: '"ZCOOL XiaoWei", "Noto Serif SC", serif' },
    { value: 'ma-shan-zheng', label: 'Ma Shan Zheng 馬善政楷 手寫', family: '"Ma Shan Zheng", "Kaiti SC", cursive' },
    { value: 'zcool-kuaile', label: 'ZCOOL KuaiLe 快樂體 可愛', family: '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif' },
    { value: 'long-cang', label: 'Long Cang 龍藏 書法', family: '"Long Cang", "KaiTi", cursive' },
    { value: 'kai', label: 'KaiTi 楷體 傳統', family: 'KaiTi, STKaiti, "Kaiti SC", serif' },
    { value: 'system-sans', label: 'System Sans 系統黑體', family: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif' },
    { value: 'system-serif', label: 'System Serif 系統宋體', family: 'SimSun, "Songti SC", serif' },
  ],
  en: [
    { value: 'poppins', label: 'Poppins Modern Friendly', family: 'Poppins, Inter, sans-serif' },
    { value: 'inter', label: 'Inter Clean Sans', family: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    { value: 'montserrat', label: 'Montserrat Elegant', family: 'Montserrat, sans-serif' },
    { value: 'playfair', label: 'Playfair Display Luxury Serif', family: '"Playfair Display", Georgia, serif' },
    { value: 'lora', label: 'Lora Soft Serif', family: 'Lora, Georgia, serif' },
    { value: 'system-sans', label: 'System Sans', family: 'ui-sans-serif, system-ui, sans-serif' },
    { value: 'rounded', label: 'Rounded Comfortable', family: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif' },
  ]
};
const getFontFamily = (lang, key) => fontFamilyOptions[lang]?.find(f=>f.value===key)?.family || fontFamilyOptions[lang]?.[0]?.family;

const colorsMap = {
  cs12rose: { primary: '212 165 165', dark: '181 131 131', light: '245 214 214', name: 'CS12 Rose / 乾燥玫瑰', secondary: '168 195 176', accent: '232 201 160' },
  emerald: { primary: '16 185 129', dark: '5 150 105', light: '209 250 229', name: 'Emerald / 翡翠綠', secondary: '110 231 183', accent: '252 211 77' },
  sakura: { primary: '244 114 182', dark: '219 39 119', light: '252 231 243', name: 'Sakura Pink / 櫻花粉', secondary: '251 207 232', accent: '253 224 71' },
  matcha: { primary: '132 204 2', dark: '101 163 13', light: '233 252 212', name: 'Matcha Green / 抹茶綠', secondary: '190 242 100', accent: '254 249 195' },
  indigo: { primary: '99 102 241', dark: '79 70 229', light: '224 231 255', name: 'Indigo / 靛青藍', secondary: '165 180 252', accent: '253 224 71' },
  violet: { primary: '139 92 246', dark: '124 58 237', light: '237 233 254', name: 'Violet / 羅蘭紫', secondary: '196 181 253', accent: '252 211 77' },
  amber: { primary: '245 158 11', dark: '217 119 6', light: '254 243 199', name: 'Amber / 琥珀黃', secondary: '252 211 77', accent: '110 231 183' },
  ocean: { primary: '6 182 212', dark: '8 145 178', light: '207 250 254', name: 'Ocean Blue / 海洋藍', secondary: '103 232 249', accent: '253 224 71' },
};

// Admin translation dictionary - fixes missing Chinese translation
const ADMIN_I18N = {
  zh: {
    adminPanel: "管理後台",
    dashboard: "儀表板",
    generalSettings: "通用設置",
    appearance: "外觀主題",
    banners: "首頁橫幅",
    categories: "分類管理",
    products: "產品管理",
    bundles: "套裝促銷",
    coupons: "優惠券",
    gwp: "滿贈禮遇",
    orders: "訂單管理",
    customers: "客戶CRM",
    membership: "會員積分",
    reviews: "評價管理",
    media: "媒體庫",
    backup: "備份同步",
    siteName: "網站名稱",
    logo: "Logo / 標誌",
    contact: "聯繫資訊",
    currency: "貨幣",
    shipping: "運費設置",
    theme: "主題配色",
    fonts: "字體設置",
    colorPresets: "預設配色",
    customColor: "自訂顏色",
    customPalette: "進階調色板",
    primary: "主色",
    secondary: "次色",
    accent: "強調色",
    background: "背景色",
    textColor: "文字色",
    textScale: "文字大小",
    zhFont: "中文字體",
    enFont: "英文字體",
    preview: "預覽",
    save: "保存",
    cancel: "取消",
    add: "新增",
    edit: "編輯",
    delete: "刪除",
    actions: "操作",
    active: "啟用",
    inactive: "停用",
    nameZh: "名稱 (中文)",
    nameEn: "Name (EN)",
    titleZh: "標題 (中文)",
    titleEn: "Title (EN)",
    descZh: "描述 (中文)",
    descEn: "Description (EN)",
    price: "價格",
    stock: "庫存",
    category: "分類",
    status: "狀態",
    search: "搜尋",
    noData: "暫無數據",
    totalProducts: "產品總數",
    totalOrders: "訂單總數",
    totalCustomers: "客戶總數",
    totalRevenue: "總營收",
    lowStock: "低庫存提醒",
    recentOrders: "最近訂單",
    topProducts: "熱銷產品",
    membershipTiers: "會員等級",
    points: "積分",
    gwpRules: "滿贈規則",
    couponCode: "優惠碼",
    discount: "折扣",
    minSpend: "最低消費",
    valid: "有效期",
    used: "已使用",
    customer: "客戶",
    tier: "等級",
    totalSpent: "累計消費",
    birthday: "生日",
    referral: "推薦碼",
    orderId: "訂單號",
    orderDate: "下單日期",
    payment: "付款",
    fulfillment: "發貨",
    confirmDelete: "確定要刪除嗎？",
    saved: "保存成功！",
    addProduct: "新增產品",
    addCategory: "新增分類",
    addBundle: "新增套裝",
    addCoupon: "新增優惠券",
    addGwp: "新增滿贈",
    uploadImage: "上傳圖片",
    images: "圖片",
    variants: "規格",
    sku: "SKU",
    comparePrice: "原價",
    tags: "標籤",
    featured: "精選",
    bestseller: "熱銷",
    isActive: "是否啟用",
    freeShippingThreshold: "免運門檻",
    flatRate: "固定運費",
    firstOrderDiscount: "首單優惠",
    newsletterEnabled: "啟用訂閱",
    pointsRate: "積分倍率",
    birthdayReward: "生日禮遇",
    referralBonus: "推薦獎勵",
    imageUrl: "圖片連結",
  },
  en: {
    adminPanel: "Admin Panel",
    dashboard: "Dashboard",
    generalSettings: "General Settings",
    appearance: "Appearance & Theme",
    banners: "Banners",
    categories: "Categories",
    products: "Products",
    bundles: "Bundles",
    coupons: "Coupons",
    gwp: "Gift w/ Purchase",
    orders: "Orders",
    customers: "Customers CRM",
    membership: "Membership & Points",
    reviews: "Reviews",
    media: "Media Library",
    backup: "Backup & Sync",
    siteName: "Site Name",
    logo: "Logo",
    contact: "Contact Info",
    currency: "Currency",
    shipping: "Shipping",
    theme: "Theme Colors",
    fonts: "Fonts",
    colorPresets: "Color Presets",
    customColor: "Custom Color",
    customPalette: "Advanced Palette",
    primary: "Primary",
    secondary: "Secondary",
    accent: "Accent",
    background: "Background",
    textColor: "Text",
    textScale: "Text Scale",
    zhFont: "Chinese Font",
    enFont: "English Font",
    preview: "Preview",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    nameZh: "Name (Chinese)",
    nameEn: "Name (EN)",
    titleZh: "Title (Chinese)",
    titleEn: "Title (EN)",
    descZh: "Description (Chinese)",
    descEn: "Description (EN)",
    price: "Price",
    stock: "Stock",
    category: "Category",
    status: "Status",
    search: "Search",
    noData: "No data",
    totalProducts: "Total Products",
    totalOrders: "Total Orders",
    totalCustomers: "Total Customers",
    totalRevenue: "Total Revenue",
    lowStock: "Low Stock Alert",
    recentOrders: "Recent Orders",
    topProducts: "Top Products",
    membershipTiers: "Membership Tiers",
    points: "Points",
    gwpRules: "GWP Rules",
    couponCode: "Coupon Code",
    discount: "Discount",
    minSpend: "Min Spend",
    valid: "Valid",
    used: "Used",
    customer: "Customer",
    tier: "Tier",
    totalSpent: "Total Spent",
    birthday: "Birthday",
    referral: "Referral Code",
    orderId: "Order ID",
    orderDate: "Order Date",
    payment: "Payment",
    fulfillment: "Fulfillment",
    confirmDelete: "Confirm delete?",
    saved: "Saved successfully!",
    addProduct: "Add Product",
    addCategory: "Add Category",
    addBundle: "Add Bundle",
    addCoupon: "Add Coupon",
    addGwp: "Add GWP Rule",
    uploadImage: "Upload Image",
    images: "Images",
    variants: "Variants",
    sku: "SKU",
    comparePrice: "Compare Price",
    tags: "Tags",
    featured: "Featured",
    bestseller: "Bestseller",
    isActive: "Active",
    freeShippingThreshold: "Free Shipping Threshold",
    flatRate: "Flat Rate",
    firstOrderDiscount: "First Order Discount",
    newsletterEnabled: "Newsletter Enabled",
    pointsRate: "Points Rate",
    birthdayReward: "Birthday Reward",
    referralBonus: "Referral Bonus",
    imageUrl: "Image URL",
  }
};

export default function App() {
  // --- Site data with e-commerce structure ---
  const [data, setData] = useState(initialData);
  const adminDraftLoadedRef = useRef(false);

  // Global UI state
  const [lang, setLang] = useState('zh');
  const [currency, setCurrency] = useState('HKD');
  const [activeTab, setActiveTab] = useState('home'); // home, shop, bundles, membership, reviews, account, admin, checkout
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategoryFilter, setShopCategoryFilter] = useState('all');
  const [shopSkinFilter, setShopSkinFilter] = useState('all');
  const [shopSeriesFilter, setShopSeriesFilter] = useState('all');
  const [shopSort, setShopSort] = useState('featured');
  const [shopPriceRange, setShopPriceRange] = useState([0, 2000]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Cart & Wishlist - persisted localStorage
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('cs12_cart'); return s?JSON.parse(s):[] } catch { return [] }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { const s = localStorage.getItem('cs12_wishlist'); return s?JSON.parse(s):[] } catch { return [] }
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // Customer Auth
  const [currentCustomer, setCurrentCustomer] = useState(() => {
    try {
      const id = localStorage.getItem('cs12_current_customer_id');
      if (!id) return null;
      // will be hydrated after data load
      return { id: parseInt(id) };
    } catch { return null }
  });
  const [authMode, setAuthMode] = useState('login'); // login / register
  const [authForm, setAuthForm] = useState({ email:'', password:'', name:'', birthday:'', referral:'', newsletter: true });
  const [authError, setAuthError] = useState('');
  const [accountTab, setAccountTab] = useState('overview'); // overview, orders, points, membership, referral, addresses
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState({ name:'', email:'', phone:'', address:'', city:'', notes:'', paymentMethod:'credit_card' });

  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminActiveSection, setAdminActiveSection] = useState('dashboard');
  const [adminSuccessMessage, setAdminSuccessMessage] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingBundle, setEditingBundle] = useState(null);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingGwp, setEditingGwp] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // GitHub autosave
  const [autoSaveToGithub, setAutoSaveToGithub] = useState(()=> {
    const s = localStorage.getItem('bmbcc_autosave_github');
    if (s!==null) return s==='true';
    try { const d = localStorage.getItem('bmbcc_site_data'); if(d){ const p=JSON.parse(d); if(p?.settings?.autoSaveToGithub!==undefined) return !!p.settings.autoSaveToGithub; } } catch {}
    return import.meta.env?.VITE_AUTO_SAVE_GITHUB==='true';
  });
  const [githubPat, setGithubPat] = useState(()=> localStorage.getItem('bmbcc_github_pat')||'');
  const [githubRepo, setGithubRepo] = useState(()=> {
    const s=localStorage.getItem('bmbcc_github_repo');
    if(s) return s;
    try{ const d=localStorage.getItem('bmbcc_site_data'); if(d){ const p=JSON.parse(d); if(p?.settings?.githubRepo) return p.settings.githubRepo; } }catch{}
    return GITHUB_REPO_DEFAULT;
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [backupReauthOpen, setBackupReauthOpen] = useState(false);
  const [backupAccessGranted, setBackupAccessGranted] = useState(false);
  const [backupPasswordInput, setBackupPasswordInput] = useState('');
  const [backupLoginError, setBackupLoginError] = useState('');

  const lastKnownShaRef = useRef(null);
  const isPushingRef = useRef(false);
  const autoSaveTimeoutRef = useRef(null);
  const latestDataRef = useRef(null);
  const pendingPushRef = useRef(null);

  // Cleanup timeout
  useEffect(()=>()=>{ if(autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); },[]);
  useEffect(()=>{
    const flush = ()=>{
      if(document.visibilityState==='hidden' && autoSaveTimeoutRef.current){
        clearTimeout(autoSaveTimeoutRef.current); autoSaveTimeoutRef.current=null;
        const pend=pendingPushRef.current; pendingPushRef.current=null; if(pend) pend();
      }
    };
    document.addEventListener('visibilitychange', flush);
    return ()=>document.removeEventListener('visibilitychange', flush);
  },[]);

  // Persist cart/wishlist
  useEffect(()=>{ localStorage.setItem('cs12_cart', JSON.stringify(cart)); },[cart]);
  useEffect(()=>{ localStorage.setItem('cs12_wishlist', JSON.stringify(wishlist)); },[wishlist]);
  useEffect(()=>{
    if(currentCustomer?.id) localStorage.setItem('cs12_current_customer_id', String(currentCustomer.id));
    else localStorage.removeItem('cs12_current_customer_id');
  },[currentCustomer]);

  // Auth check
  useEffect(()=>{
    const checkAuth = async ()=>{
      try{
        const res = await fetch(AUTH_ENDPOINT,{method:'GET',credentials:'include'});
        const d = await res.json();
        const isAdmin = d.isAdmin===true;
        setIsAdminLoggedIn(isAdmin);
        if(isAdmin){
          const saved=localStorage.getItem('bmbcc_site_data');
          if(saved){
            try{
              const draft = JSON.parse(saved);
              // only use if e-commerce structure exists, otherwise keep initial
              if(draft?.products && draft?.settings){
                adminDraftLoadedRef.current=true;
                setData({ ...initialData, ...draft, settings: { ...initialData.settings, ...(draft.settings||{}) } });
              }
            }catch(e){ console.error('parse draft',e); }
          }
        }
      }catch(err){ setIsAdminLoggedIn(false); }
    };
    checkAuth();
  },[]);

  // Load GitHub settings from KV
  const loadGithubSettingsFromCloud = async ()=>{
    try{
      const res = await fetch(GITHUB_SETTINGS_ENDPOINT,{method:'GET',credentials:'include'});
      if(!res.ok) return;
      const result=await res.json();
      if(result.ok && result.settings){
        const s=result.settings;
        if(s.pat!==undefined && s.pat!==''){ localStorage.setItem('bmbcc_github_pat',s.pat); setGithubPat(s.pat); }
        if(s.repo!==undefined && s.repo!==''){ localStorage.setItem('bmbcc_github_repo',s.repo); setGithubRepo(s.repo); setData(prev=>({...prev, settings:{...prev.settings, githubRepo:s.repo}})); }
        if(s.autoSave!==undefined){ localStorage.setItem('bmbcc_autosave_github',String(s.autoSave)); setAutoSaveToGithub(s.autoSave); setData(prev=>({...prev, settings:{...prev.settings, autoSaveToGithub:s.autoSave}})); }
      }
    }catch(err){ console.log('KV fallback',err?.message); }
  };
  const saveGithubSettingsToCloud = async (settings)=>{
    try{ await fetch(GITHUB_SETTINGS_ENDPOINT,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)}); }catch(err){ console.log('save KV fail',err?.message); }
  };
  useEffect(()=>{ if(isAdminLoggedIn) loadGithubSettingsFromCloud(); },[isAdminLoggedIn]);

  // Hydrate currentCustomer full object after data load
  useEffect(()=>{
    if(currentCustomer?.id && !currentCustomer?.email){
      const full = data.customers.find(c=>c.id===currentCustomer.id);
      if(full) setCurrentCustomer(full);
    }
  },[data.customers]);

  // Remote data loader (GitHub raw) - optional
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const url='https://raw.githubusercontent.com/'+GITHUB_REPO_DEFAULT+'/main/src/data/initialData.js';
        const res=await fetch(url,{cache:'no-cache'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const text=await res.text();
        const start=text.indexOf('{'); const end=text.lastIndexOf('}');
        if(start<0||end<=start) throw new Error('fmt');
        const remote=JSON.parse(text.slice(start,end+1));
        if(!remote||!remote.settings||!remote.products) throw new Error('invalid');
        if(cancelled||adminDraftLoadedRef.current) return;
        // Only overwrite if remote seems newer (check product count)
        const merged = { ...initialData, ...remote, settings: { ...initialData.settings, ...(remote.settings||{}) } };
        // Preserve arrays if missing
        if(!merged.products) merged.products = initialData.products;
        if(!merged.categories) merged.categories = initialData.categories;
        setData(prev=> JSON.stringify(prev)===JSON.stringify(merged) ? prev : merged);
      }catch(err){ console.warn('remote data unavailable',err?.message); }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  // Theme color + palette - flexible color tuner fixed
  useEffect(()=>{
    const settings = data.settings;
    let primaryRgb, darkRgb, lightRgb, secondaryRgb, accentRgb;
    if(settings.themeColor==='custom'){
      const customHex = settings.customPalette?.primary || settings.customThemeColor || '#d4a5a5';
      const primary = hexToRgb(customHex);
      if(primary){
        primaryRgb = primary;
        darkRgb = { r: Math.max(0, Math.round(primary.r*0.82)), g: Math.max(0, Math.round(primary.g*0.82)), b: Math.max(0, Math.round(primary.b*0.82)) };
        lightRgb = { r: Math.min(255, Math.round(primary.r+(255-primary.r)*0.78)), g: Math.min(255, Math.round(primary.g+(255-primary.g)*0.78)), b: Math.min(255, Math.round(primary.b+(255-primary.b)*0.78)) };
      }
      // secondary/accent from customPalette
      const secHex = settings.customPalette?.secondary;
      const accHex = settings.customPalette?.accent;
      const bgHex = settings.customPalette?.background;
      if(secHex){ const s = hexToRgb(secHex); if(s) secondaryRgb = s; }
      if(accHex){ const a = hexToRgb(accHex); if(a) accentRgb = a; }
      if(bgHex){ const bg = hexToRgb(bgHex); if(bg) document.documentElement.style.setProperty('--color-bg', rgbString(bg)); }
    } else {
      const sel = colorsMap[settings.themeColor] || colorsMap.cs12rose;
      const p = hexToRgb('#'+'' ) // not needed
      // sel contains rgb strings like '212 165 165'
      const parsePreset = str => {
        const [r,g,b] = str.split(' ').map(Number);
        return { r,g,b };
      };
      primaryRgb = parsePreset(sel.primary);
      darkRgb = parsePreset(sel.dark);
      lightRgb = parsePreset(sel.light);
      secondaryRgb = sel.secondary ? parsePreset(sel.secondary) : null;
      accentRgb = sel.accent ? parsePreset(sel.accent) : null;
    }
    if(primaryRgb){ document.documentElement.style.setProperty('--color-primary', rgbString(primaryRgb)); }
    if(darkRgb){ document.documentElement.style.setProperty('--color-primary-dark', rgbString(darkRgb)); }
    if(lightRgb){ document.documentElement.style.setProperty('--color-primary-light', rgbString(lightRgb)); }
    if(secondaryRgb){ document.documentElement.style.setProperty('--color-secondary', rgbString(secondaryRgb)); }
    if(accentRgb){ document.documentElement.style.setProperty('--color-accent', rgbString(accentRgb)); }
  },[data.settings.themeColor, data.settings.customThemeColor, data.settings.customPalette]);

  useEffect(()=>{
    const scale = Number(data.settings.textScale)||100;
    document.documentElement.style.fontSize = `${Math.min(140, Math.max(80, scale))}%`;
    return ()=>{ document.documentElement.style.fontSize=''; };
  },[data.settings.textScale]);

  useEffect(()=>{
    const zhKey = data.settings.fontFamilyZh;
    const enKey = data.settings.fontFamilyEn;
    const zhFamily = getFontFamily('zh', zhKey);
    const enFamily = getFontFamily('en', enKey);
    const currentLangFamily = lang==='zh' ? zhFamily : enFamily;
    document.documentElement.style.setProperty('--site-font-family', currentLangFamily);
    document.documentElement.style.setProperty('--site-font-family-zh', zhFamily);
    document.documentElement.style.setProperty('--site-font-family-en', enFamily);
    return ()=>{ document.documentElement.style.removeProperty('--site-font-family'); };
  },[lang, data.settings.fontFamilyZh, data.settings.fontFamilyEn]);

  useEffect(()=>{
    const icon=document.querySelector('link[rel="icon"]');
    if(icon) icon.href = data.settings.headerLogo || '/favicon.svg';
  },[data.settings.headerLogo]);

  // Carousel autoplay
  useEffect(()=>{
    if(activeTab!=='home') return;
    const iv=setInterval(()=> setCurrentSlide(prev=> (prev+1)%data.carousel.length), 6000);
    return ()=>clearInterval(iv);
  },[data.carousel.length, activeTab]);

  // URL admin detection
  useEffect(()=>{
    const openAdminFromUrl=()=>{
      const hash=window.location.hash.replace(/\/+$/,'').trim().toLowerCase();
      const pathname=window.location.pathname.replace(/\/+$/,'').toLowerCase();
      const searchParams=new URLSearchParams(window.location.search);
      const adminQuery=searchParams.has('admin')||searchParams.get('page')==='admin';
      if(hash==='#/admin'||hash==='#admin'||pathname.endsWith('/admin')||adminQuery){ setActiveTab('admin'); setMobileMenuOpen(false); window.scrollTo(0,0); }
    };
    openAdminFromUrl();
    window.addEventListener('hashchange', openAdminFromUrl);
    window.addEventListener('popstate', openAdminFromUrl);
    return ()=>{ window.removeEventListener('hashchange', openAdminFromUrl); window.removeEventListener('popstate', openAdminFromUrl); };
  },[]);

  // Mobile drawer scroll lock
  useEffect(()=>{
    if(mobileMenuOpen){
      const prevBody=document.body.style.overflow;
      const prevHtml=document.documentElement.style.overflow;
      const prevPad=document.body.style.paddingRight;
      document.body.style.overflow='hidden'; document.documentElement.style.overflow='hidden';
      const sw=window.innerWidth-document.documentElement.clientWidth;
      if(sw>0) document.body.style.paddingRight=`${sw}px`;
      const preventTouch= (e)=>{ const drawer=document.querySelector('[data-mobile-drawer]'); if(drawer&&drawer.contains(e.target)) return; e.preventDefault(); };
      const onKey=e=>{ if(e.key==='Escape') setMobileMenuOpen(false); };
      document.addEventListener('touchmove',preventTouch,{passive:false});
      document.addEventListener('keydown',onKey);
      return ()=>{ document.body.style.overflow=prevBody; document.documentElement.style.overflow=prevHtml; document.body.style.paddingRight=prevPad; document.removeEventListener('touchmove',preventTouch); document.removeEventListener('keydown',onKey); };
    }
  },[mobileMenuOpen]);

  // Translation helpers
  const t = (obj) => {
    if(!obj) return '';
    if(typeof obj==='string') return obj;
    if(obj[lang]) return obj[lang];
    if(obj.zh) return obj.zh;
    if(obj.en) return obj.en;
    return '';
  };
  const ta = (key) => {
    const dict = ADMIN_I18N[lang] || ADMIN_I18N.en;
    return dict[key] || ADMIN_I18N.en[key] || key;
  };

  const formatPrice = (amount) => {
    return fmtPriceUtil(amount, currency, data.settings.currencies?.exchangeRate||0.128, data.settings.currencies?.symbol||{HKD:'HK$', USD:'$'});
  };

  // Cart calculations
  const cartSubtotal = useMemo(()=> calcSubtotal(cart, data.products), [cart, data.products]);
  const cartCount = useMemo(()=> cart.reduce((s,i)=>s+i.qty,0), [cart]);
  const wishlistCount = wishlist.length;
  const gwpEligible = useMemo(()=> checkGWP(cartSubtotal, data.settings.gwp?.rules||[]), [cartSubtotal, data.settings.gwp]);
  const shippingCost = useMemo(()=>{
    if(cart.length===0) return 0;
    const freeThresh = data.settings.shipping?.freeThreshold || 800;
    if(cartSubtotal >= freeThresh) return 0;
    return data.settings.shipping?.flatRate || 50;
  },[cartSubtotal, cart, data.settings.shipping]);
  const discountAmount = useMemo(()=>{
    if(!appliedCoupon) return 0;
    const res = applyCoupon(cartSubtotal, appliedCoupon);
    return res.valid ? res.discount : 0;
  },[cartSubtotal, appliedCoupon]);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingCost);
  const pointsEarnedPreview = useMemo(()=>{
    const tier = currentCustomer ? (data.settings.membership?.tiers?.find(t=>t.id===currentCustomer.tier) || null) : null;
    const birthday = currentCustomer ? isBirthdayMonth(currentCustomer.birthday) : false;
    const limit = data.settings.membership?.points?.birthdayMonthLimit || 10000;
    return calcPoints(cartSubtotal - discountAmount, tier, birthday, limit);
  },[cartSubtotal, discountAmount, currentCustomer, data.settings.membership]);

  const fullCurrentCustomer = useMemo(()=>{
    if(!currentCustomer?.id) return null;
    const found = data.customers.find(c=>c.id===currentCustomer.id);
    return found ? { ...found, ...currentCustomer } : currentCustomer;
  },[currentCustomer, data.customers]);

  const customerTier = useMemo(()=>{
    if(!fullCurrentCustomer) return null;
    return data.settings.membership?.tiers?.find(t=>t.id===fullCurrentCustomer.tier) || getMembershipTier(data.settings.membership?.tiers||[], fullCurrentCustomer.totalSpent||0);
  },[fullCurrentCustomer, data.settings.membership]);

  // Save helper with GitHub autosave
  const saveAllData = (newData) => {
    const sanitized = stripSensitiveData(newData);
    setData(sanitized);
    localStorage.setItem('bmbcc_site_data', JSON.stringify(sanitized));
    triggerAdminSuccess(ta('saved'));

    if(autoSaveToGithub && githubPat && githubRepo){
      latestDataRef.current = sanitized;
      if(autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      setAutoSaveStatus('saving'); setAutoSaveMessage(lang==='zh'?'正在同步到 GitHub...':'Syncing to GitHub...');
      const triggerPushNow = ()=>{
        const doPush = async ()=>{
          const dataToPush = latestDataRef.current;
          if(!dataToPush) return;
          if(isPushingRef.current){
            autoSaveTimeoutRef.current=setTimeout(()=>{ setAutoSaveStatus('saving'); setAutoSaveMessage(lang==='zh'?'正在同步到 GitHub...':'Syncing to GitHub...'); doPush(); },3000);
            return;
          }
          isPushingRef.current=true;
          const filePath='src/data/initialData.js';
          const apiUrl='https://api.github.com/repos/'+githubRepo+'/contents/'+filePath;
          const jsContent='export const initialData = '+JSON.stringify(dataToPush,null,2)+';\n';
          const base64= btoa(unescape(encodeURIComponent(jsContent)));
          const pushWithRetry = async (maxRetries=3)=>{
            for(let attempt=0; attempt<=maxRetries; attempt++){
              try{
                let sha=lastKnownShaRef.current;
                if(!sha){
                  const shaRes=await fetch(apiUrl,{headers:{Authorization:'Bearer '+githubPat, Accept:'application/vnd.github.v3+json'}});
                  if(shaRes.ok){ const info=await shaRes.json(); sha=info.sha; }
                }
                const body={message:'Auto-save: update site data ['+new Date().toISOString().slice(0,19).replace('T',' ')+']', content: base64};
                if(sha) body.sha=sha;
                const pushRes=await fetch(apiUrl,{method:'PUT',headers:{Authorization:'Bearer '+githubPat, Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify(body)});
                const result=await pushRes.json().catch(()=>({}));
                if(pushRes.ok){ lastKnownShaRef.current=result.content?.sha||null; setAutoSaveStatus('success'); setAutoSaveMessage(lang==='zh'?'✅ 已自动同步到 GitHub！':'✅ Auto-saved to GitHub!'); return; }
                if((pushRes.status===409||pushRes.status===422)&& attempt<maxRetries){ lastKnownShaRef.current=null; await new Promise(r=>setTimeout(r,500*(attempt+1))); continue; }
                throw new Error(result.message||'HTTP '+pushRes.status);
              }catch(err){ if(attempt===maxRetries) throw err; await new Promise(r=>setTimeout(r,500*(attempt+1))); }
            }
          };
          pushWithRetry().catch(err=>{ console.error('auto-save fail',err); setAutoSaveStatus('error'); setAutoSaveMessage((lang==='zh'?'⚠️ GitHub 同步失败: ':'⚠️ GitHub sync failed: ')+err.message); }).finally(()=>{ isPushingRef.current=false; setTimeout(()=>{ setAutoSaveStatus(''); setAutoSaveMessage(''); },6000); });
        };
        doPush();
      };
      pendingPushRef.current=triggerPushNow;
      autoSaveTimeoutRef.current=setTimeout(()=>{ pendingPushRef.current=null; triggerPushNow(); },AUTO_SAVE_DEBOUNCE_MS);
    }
  };
  const triggerAdminSuccess = (msg)=>{ setAdminSuccessMessage(msg); setTimeout(()=>setAdminSuccessMessage(''),4000); };

  // Auth handlers
  const handleAdminLogin = async (e)=>{
    e.preventDefault();
    if(adminPasswordInput.length<8){ setAdminLoginError(lang==='zh'?'密码至少需要 8 位':'Password at least 8 chars'); return; }
    try{
      const res=await fetch(AUTH_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({password:adminPasswordInput})});
      const result=await res.json();
      if(result.ok){ setIsAdminLoggedIn(true); setAdminLoginError(''); setAdminPasswordInput(''); loadGithubSettingsFromCloud(); }
      else setAdminLoginError(result.error|| (lang==='zh'?'登录失败':'Login failed'));
    }catch(err){ setAdminLoginError(lang==='zh'?'网络错误':'Network error'); }
  };
  const handleAdminLogout = async ()=>{
    try{ await fetch(AUTH_ENDPOINT,{method:'DELETE',credentials:'include'}); }catch{}
    setIsAdminLoggedIn(false); setActiveTab('home'); setBackupAccessGranted(false); setBackupReauthOpen(false); setBackupPasswordInput(''); setBackupLoginError('');
    try{
      if(window.history&&window.history.pushState){
        let cleanPath=window.location.pathname;
        if(cleanPath.endsWith('/admin')||cleanPath.endsWith('/admin/')){ cleanPath=cleanPath.replace(/\/admin\/?$/,''); if(!cleanPath) cleanPath='/'; }
        const cleanUrl=new URL(window.location.href);
        cleanUrl.pathname=cleanPath;
        if(cleanUrl.hash==='#/admin'||cleanUrl.hash==='#admin') cleanUrl.hash='';
        cleanUrl.searchParams.delete('admin'); cleanUrl.searchParams.delete('page');
        window.history.pushState({},'',cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
      } else { if(window.location.hash==='#/admin'||window.location.hash==='#admin') window.location.hash=''; }
    }catch{}
    window.scrollTo(0,0);
  };
  const switchTab = (tabId)=>{
    setActiveTab(tabId); setMobileMenuOpen(false);
    if(tabId==='admin'){
      if(window.location.hash!=='#/admin' && window.location.hash!=='#admin' && !window.location.pathname.endsWith('/admin')){
        if(window.history&&window.history.pushState) window.history.pushState({},'','#/admin'); else window.location.hash='#/admin';
      }
    } else {
      if(window.location.hash==='#/admin'||window.location.hash==='#admin'){
        try{
          if(window.history&&window.history.pushState){ const cleanUrl=new URL(window.location.href); cleanUrl.hash=''; window.history.pushState({},'',cleanUrl.pathname+cleanUrl.search); }
          else window.location.hash='';
        }catch{ window.location.hash=''; }
      }
    }
    window.scrollTo(0,0);
  };

  // Cart actions
  const addToCart = (productId, variantId=null, qty=1)=>{
    const prod = data.products.find(p=>p.id===productId);
    if(!prod) return;
    let stock = prod.stock;
    if(variantId){ const v=prod.variants?.find(v=>v.id===variantId); if(v) stock=v.stock; }
    // check existing qty in cart
    const existing = cart.find(c=>c.productId===productId && c.variantId===variantId);
    const currentQty = existing ? existing.qty : 0;
    if(currentQty+qty > stock){ alert(lang==='zh'?`庫存不足，僅剩 ${stock} 件`:`Only ${stock} in stock`); return; }
    setCart(prev=>{
      const idx=prev.findIndex(c=>c.productId===productId && c.variantId===variantId);
      if(idx>=0){ const copy=[...prev]; copy[idx]={...copy[idx], qty: copy[idx].qty+qty}; return copy; }
      return [...prev, { productId, variantId, qty, addedAt: new Date().toISOString() }];
    });
    setShowCart(true);
  };
  const updateCartQty = (index, newQty)=>{
    if(newQty<=0){ setCart(prev=> prev.filter((_,i)=>i!==index)); return; }
    const item = cart[index];
    const prod = data.products.find(p=>p.id===item.productId);
    if(!prod) return;
    let stock = prod.stock;
    if(item.variantId){ const v=prod.variants?.find(v=>v.id===item.variantId); if(v) stock=v.stock; }
    if(newQty>stock){ alert(lang==='zh'?`庫存不足，僅剩 ${stock} 件`:`Only ${stock} in stock`); return; }
    setCart(prev=>{ const copy=[...prev]; copy[index]={...copy[index], qty:newQty}; return copy; });
  };
  const removeFromCart = (index)=> setCart(prev=> prev.filter((_,i)=>i!==index));
  const toggleWishlist = (productId)=>{
    setWishlist(prev=> prev.includes(productId) ? prev.filter(id=>id!==productId) : [...prev, productId]);
  };

  const handleApplyCoupon = ()=>{
    setCouponError('');
    if(!couponInput.trim()){ setCouponError(lang==='zh'?'請輸入優惠碼':'Enter coupon code'); return; }
    const coupon = data.coupons.find(c=> c.code.toLowerCase()===couponInput.trim().toLowerCase() && c.active);
    if(!coupon){ setCouponError(lang==='zh'?'優惠碼無效':'Invalid coupon'); return; }
    if(coupon.firstOrderOnly && fullCurrentCustomer && fullCurrentCustomer.ordersCount>0){ setCouponError(lang==='zh'?'此優惠碼僅限首單':'First order only'); return; }
    const res = applyCoupon(cartSubtotal, coupon);
    if(!res.valid){ setCouponError(res.reason||'Invalid'); return; }
    setAppliedCoupon(coupon);
    setCouponError('');
  };
  const clearCoupon = ()=>{ setAppliedCoupon(null); setCouponInput(''); setCouponError(''); };

  // Customer Auth
  const handleCustomerRegister = (e)=>{
    e.preventDefault();
    setAuthError('');
    const { email, password, name, birthday, referral, newsletter } = authForm;
    if(!email||!password||!name){ setAuthError(lang==='zh'?'請填寫必填項':'Fill required fields'); return; }
    if(password.length<6){ setAuthError(lang==='zh'?'密碼至少6位':'Password at least 6 chars'); return; }
    if(data.customers.find(c=>c.email.toLowerCase()===email.toLowerCase())){ setAuthError(lang==='zh'?'郵箱已註冊':'Email already registered'); return; }
    const newId = Math.max(...data.customers.map(c=>c.id),0)+1;
    let referredByCustomer = null;
    if(referral){
      referredByCustomer = data.customers.find(c=>c.referralCode===referral);
    }
    const newCustomer = {
      id: newId,
      email, name, password, birthday: birthday||null,
      phone: '',
      tier: null,
      points: 0,
      totalSpent: 0,
      referralCode: generateReferralCode(name),
      referredBy: referredByCustomer?.referralCode||null,
      avatar: `https://i.pravatar.cc/150?img=${newId%70}`,
      joinedAt: new Date().toISOString().slice(0,10),
      lastOrderAt: null,
      status: 'active',
      addresses: [],
      wishlist: [],
      ordersCount: 0,
      newsletter: !!newsletter
    };
    // Referral bonus to referrer
    const updated = { ...data };
    if(referredByCustomer){
      const tiers = updated.settings.membership?.tiers||[];
      const referrerTier = tiers.find(t=>t.id===referredByCustomer.tier);
      const bonus = referrerTier?.referralBonus || 50;
      // For signature referred logic
      if(referredByCustomer.tier==='classic' && newCustomer.tier===null){
        // classic refers classic gets 50, refers signature later will get 80 when upgraded – simplified to 50 now
      }
      updated.customers = updated.customers.map(c=> c.id===referredByCustomer.id ? { ...c, points: (c.points||0)+bonus } : c);
    }
    updated.customers = [...updated.customers, newCustomer];
    saveAllData(updated);
    setCurrentCustomer(newCustomer);
    setAuthForm({ email:'', password:'', name:'', birthday:'', referral:'', newsletter: true });
    setActiveTab('account');
    setAccountTab('overview');
  };
  const handleCustomerLogin = (e)=>{
    e.preventDefault();
    setAuthError('');
    const { email, password } = authForm;
    const found = data.customers.find(c=>c.email.toLowerCase()===email.toLowerCase() && c.password===password);
    if(!found){ setAuthError(lang==='zh'?'郵箱或密碼錯誤':'Invalid email or password'); return; }
    if(found.status==='inactive'){ setAuthError(lang==='zh'?'帳號已停用':'Account inactive'); return; }
    setCurrentCustomer(found);
    setActiveTab('account');
    setAccountTab('overview');
  };
  const handleCustomerLogout = ()=>{
    setCurrentCustomer(null);
    setActiveTab('home');
  };

  const handleCheckout = ()=>{
    if(cart.length===0) return;
    // Validate form
    const { name, email, phone, address, city } = checkoutForm;
    if(!name||!email||!phone||!address||!city){ alert(lang==='zh'?'請填寫完整收貨資訊':'Please fill shipping info'); setCheckoutStep(1); return; }
    // Create order
    const orderId = generateOrderId();
    const tier = fullCurrentCustomer ? (data.settings.membership?.tiers?.find(t=>t.id===fullCurrentCustomer.tier) || getMembershipTier(data.settings.membership?.tiers||[], fullCurrentCustomer.totalSpent||0)) : null;
    const isBday = fullCurrentCustomer ? isBirthdayMonth(fullCurrentCustomer.birthday) : false;
    const pointsEarned = calcPoints(cartSubtotal - discountAmount, tier, isBday, data.settings.membership?.points?.birthdayMonthLimit||10000);

    const order = {
      id: orderId,
      customerId: fullCurrentCustomer?.id || null,
      email: email,
      items: cart.map(ci=>{
        const prod = data.products.find(p=>p.id===ci.productId);
        let price = prod?.price||0;
        let title = prod?.title||{zh:'',en:''};
        if(ci.variantId){ const v=prod?.variants?.find(v=>v.id===ci.variantId); if(v) { price=v.price; if(v.name) title=v.name; } }
        return { productId: ci.productId, variantId: ci.variantId, qty: ci.qty, price, title };
      }),
      subtotal: cartSubtotal,
      discount: discountAmount,
      shipping: shippingCost,
      tax: 0,
      total: cartTotal,
      couponCode: appliedCoupon?.code||null,
      gwpEligible: !!gwpEligible,
      gwpDetail: gwpEligible,
      paymentMethod: checkoutForm.paymentMethod,
      paymentStatus: 'paid',
      fulfillmentStatus: 'processing',
      shippingAddress: { name, address, city, phone, email },
      pointsEarned,
      pointsUsed: 0,
      notes: checkoutForm.notes,
      createdAt: new Date().toISOString()
    };

    // Update stock, customers, orders
    const updated = { ...data };
    // Deduct stock
    updated.products = updated.products.map(p=>{
      const itemsForProduct = cart.filter(c=>c.productId===p.id);
      if(itemsForProduct.length===0) return p;
      let newProd = { ...p };
      // if has variants
      if(newProd.variants && newProd.variants.length>0){
        newProd.variants = newProd.variants.map(v=>{
          const match = itemsForProduct.find(c=>c.variantId===v.id);
          if(match) return { ...v, stock: Math.max(0, (v.stock||0)-match.qty) };
          return v;
        });
        // also reduce overall stock as sum? keep overall as max variant? simple reduce by total qty
        const totalQty = itemsForProduct.reduce((s,c)=>s+c.qty,0);
        newProd.stock = Math.max(0, (newProd.stock||0)-totalQty);
      } else {
        const totalQty = itemsForProduct.reduce((s,c)=>s+c.qty,0);
        newProd.stock = Math.max(0, (newProd.stock||0)-totalQty);
      }
      return newProd;
    });
    // Update customer if logged in
    if(fullCurrentCustomer){
      updated.customers = updated.customers.map(c=>{
        if(c.id!==fullCurrentCustomer.id) return c;
        const newTotal = (c.totalSpent||0)+cartTotal;
        let newTier = c.tier;
        if(!newTier && newTotal>=1500) newTier='classic';
        if(newTotal>=8000) newTier='signature';
        const newPoints = (c.points||0)+pointsEarned;
        return { ...c, totalSpent: newTotal, points: newPoints, lastOrderAt: new Date().toISOString().slice(0,10), ordersCount: (c.ordersCount||0)+1, tier: newTier };
      });
    }
    updated.orders = [order, ...(updated.orders||[])];
    // Update coupons used count
    if(appliedCoupon){
      updated.coupons = updated.coupons.map(cp=> cp.id===appliedCoupon.id ? { ...cp, usedCount: (cp.usedCount||0)+1 } : cp);
    }

    saveAllData(updated);
    // Update currentCustomer state
    if(fullCurrentCustomer){
      const updatedCust = updated.customers.find(c=>c.id===fullCurrentCustomer.id);
      if(updatedCust) setCurrentCustomer(updatedCust);
    }
    setCart([]);
    clearCoupon();
    setCheckoutForm({ name:'', email:'', phone:'', address:'', city:'', notes:'', paymentMethod:'credit_card' });
    setCheckoutStep(1);
    setActiveTab('account');
    setAccountTab('orders');
    // Show success
    setTimeout(()=> alert(lang==='zh'?`下單成功！訂單號 ${orderId} 已獲得 ${pointsEarned} 積分`:`Order placed! Order ${orderId} earned ${pointsEarned} points`),100);
  };

  // Admin CRUD helpers
  const handleMoveItem = (path, index, direction)=>{
    const updated={...data};
    const keys=path.split('.');
    let parent=updated;
    for(let i=0;i<keys.length-1;i++){ parent[keys[i]]={...parent[keys[i]]}; parent=parent[keys[i]]; }
    const lastKey=keys[keys.length-1];
    const arr=[...(parent[lastKey]||[])];
    if(direction==='up'&&index>0) [arr[index],arr[index-1]]=[arr[index-1],arr[index]];
    else if(direction==='down'&&index<arr.length-1) [arr[index],arr[index+1]]=[arr[index+1],arr[index]];
    else return;
    parent[lastKey]=arr;
    saveAllData(updated);
  };
  const handleSaveProduct = (prod)=>{
    const updated={...data};
    if(prod.id==='new'){ const newId=Math.max(...updated.products.map(p=>p.id),0)+1; updated.products.push({...prod, id:newId}); }
    else updated.products = updated.products.map(p=>p.id===prod.id?prod:p);
    saveAllData(updated); setEditingProduct(null);
  };
  const handleDeleteProduct = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.products=updated.products.filter(p=>p.id!==id); saveAllData(updated); } };
  const handleSaveCategory = (cat)=>{
    const updated={...data};
    if(cat.id==='new'){ const newId='cat-'+Date.now(); updated.categories.push({...cat, id:newId}); }
    else updated.categories=updated.categories.map(c=>c.id===cat.id?cat:c);
    saveAllData(updated); setEditingCategory(null);
  };
  const handleDeleteCategory = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.categories=updated.categories.filter(c=>c.id!==id); saveAllData(updated); } };
  const handleSaveBanner = (ban)=>{
    const updated={...data};
    if(ban.id==='new'){ const newId=Math.max(...updated.carousel.map(b=>b.id),0)+1; updated.carousel.push({...ban, id:newId}); }
    else updated.carousel=updated.carousel.map(b=>b.id===ban.id?ban:b);
    saveAllData(updated); setEditingBanner(null);
  };
  const handleDeleteBanner = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.carousel=updated.carousel.filter(b=>b.id!==id); saveAllData(updated); if(currentSlide>=updated.carousel.length) setCurrentSlide(0);} };
  const handleSaveBundle = (bundle)=>{
    const updated={...data};
    if(bundle.id==='new'){ const newId=Math.max(...updated.bundles.map(b=>b.id),0)+1; updated.bundles.push({...bundle, id:newId}); }
    else updated.bundles=updated.bundles.map(b=>b.id===bundle.id?bundle:b);
    saveAllData(updated); setEditingBundle(null);
  };
  const handleDeleteBundle = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.bundles=updated.bundles.filter(b=>b.id!==id); saveAllData(updated);} };
  const handleSaveCoupon = (cp)=>{
    const updated={...data};
    if(cp.id==='new'){ const newId=Math.max(...updated.coupons.map(c=>c.id),0)+1; updated.coupons.push({...cp, id:newId}); }
    else updated.coupons=updated.coupons.map(c=>c.id===cp.id?cp:c);
    saveAllData(updated); setEditingCoupon(null);
  };
  const handleDeleteCoupon = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.coupons=updated.coupons.filter(c=>c.id!==id); saveAllData(updated);} };
  const handleSaveGwp = (g)=>{
    const updated={...data};
    if(g.id==='new'){ const newId=Math.max(...(updated.settings.gwp?.rules||[]).map(r=>r.id),0)+1; const rules=[...(updated.settings.gwp?.rules||[]), {...g, id:newId}]; updated.settings={...updated.settings, gwp:{...(updated.settings.gwp||{}), rules}}; }
    else { const rules=(updated.settings.gwp?.rules||[]).map(r=>r.id===g.id?g:r); updated.settings={...updated.settings, gwp:{...(updated.settings.gwp||{}), rules}}; }
    saveAllData(updated); setEditingGwp(null);
  };
  const handleDeleteGwp = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; const rules=(updated.settings.gwp?.rules||[]).filter(r=>r.id!==id); updated.settings={...updated.settings, gwp:{...(updated.settings.gwp||{}), rules}}; saveAllData(updated);} };
  const handleSaveCustomer = (cust)=>{
    const updated={...data};
    updated.customers=updated.customers.map(c=>c.id===cust.id?cust:c);
    saveAllData(updated); setEditingCustomer(null);
  };
  const handleDeleteCustomer = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.customers=updated.customers.filter(c=>c.id!==id); saveAllData(updated);} };
  const handleSaveReview = (rev)=>{
    const updated={...data};
    if(rev.id==='new'){ const newId=Math.max(...updated.reviews.map(r=>r.id),0)+1; updated.reviews.push({...rev, id:newId}); }
    else updated.reviews=updated.reviews.map(r=>r.id===rev.id?rev:r);
    saveAllData(updated); setEditingReview(null);
  };
  const handleDeleteReview = (id)=>{ if(window.confirm(ta('confirmDelete'))){ const updated={...data}; updated.reviews=updated.reviews.filter(r=>r.id!==id); saveAllData(updated);} };
  const handleUpdateOrderStatus = (orderId, field, value)=>{
    const updated={...data};
    updated.orders=updated.orders.map(o=>o.id===orderId?{...o,[field]:value}:o);
    saveAllData(updated);
  };

  const updateSetting = (key, subKey, value)=>{
    const updated={...data};
    if(subKey){ updated.settings[key]={...(updated.settings[key]||{}), [subKey]:value}; }
    else updated.settings[key]=value;
    saveAllData(updated);
  };
  const updateNestedSetting = (path, value)=>{
    const keys=path.split('.');
    const updated={...data};
    let cur=updated.settings;
    for(let i=0;i<keys.length-1;i++){ if(!cur[keys[i]]) cur[keys[i]]={}; cur=cur[keys[i]]; }
    cur[keys[keys.length-1]]=value;
    saveAllData(updated);
  };

  // Filtering shop products
  const filteredProducts = useMemo(()=>{
    let list = [...(data.products||[])].filter(p=>p.active!==false);
    if(shopCategoryFilter!=='all') list=list.filter(p=>p.categoryIds?.includes(shopCategoryFilter));
    if(shopSkinFilter!=='all') list=list.filter(p=>p.categoryIds?.includes(shopSkinFilter));
    if(shopSeriesFilter!=='all') list=list.filter(p=>p.categoryIds?.includes(shopSeriesFilter));
    if(shopSearch.trim()){
      const q=shopSearch.toLowerCase();
      list=list.filter(p=> (t(p.title).toLowerCase().includes(q) || t(p.description).toLowerCase().includes(q) || p.tags?.join(' ').toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)));
    }
    // price range
    list=list.filter(p=> p.price>=shopPriceRange[0] && p.price<=shopPriceRange[1]);
    // sort
    if(shopSort==='price-low') list.sort((a,b)=>a.price-b.price);
    else if(shopSort==='price-high') list.sort((a,b)=>b.price-a.price);
    else if(shopSort==='rating') list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else if(shopSort==='bestseller') list.sort((a,b)=>(b.reviewCount||0)-(a.reviewCount||0));
    else if(shopSort==='newest') list.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0));
    // featured first for default
    else if(shopSort==='featured') list.sort((a,b)=> (b.isFeatured?1:0)-(a.isFeatured?1:0));
    return list;
  },[data.products, shopCategoryFilter, shopSkinFilter, shopSeriesFilter, shopSearch, shopSort, shopPriceRange, lang]);

  // Top nav categories grouping
  const navCategories = {
    series: data.categories.filter(c=>c.type==='series'&&c.active),
    faceCare: data.categories.filter(c=>c.type==='faceCare'&&c.active),
    skinType: data.categories.filter(c=>c.type==='skinType'&&c.active)
  };

  // Backup actions (same as old)
  const handleExportData = ()=>{
    const jsonStr=JSON.stringify(stripSensitiveData(data),null,2);
    const blob=new Blob([jsonStr],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a'); link.href=url; link.download=`cs12-data-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };
  const handleImportData = (e)=>{
    e.preventDefault();
    try{
      const parsed=JSON.parse(importJsonText);
      if(!parsed.settings||!parsed.products) throw new Error(lang==='zh'?'JSON结构不完整':'Incomplete JSON');
      saveAllData(parsed);
      setImportJsonText(''); setImportError(''); triggerAdminSuccess(ta('saved'));
    }catch(err){ setImportError((lang==='zh'?'导入失败: ':'Import failed: ')+err.message); }
  };
  const handleResetToDefault = ()=>{
    if(window.confirm(lang==='zh'?'確定重置為出廠默認？所有修改將清空！':'Reset to factory defaults? All edits cleared!')){
      saveAllData(initialData); triggerAdminSuccess(ta('saved'));
    }
  };
  const resetAdminEditors = ()=>{
    setEditingProduct(null); setEditingCategory(null); setEditingBanner(null); setEditingBundle(null); setEditingCoupon(null); setEditingGwp(null); setEditingCustomer(null); setEditingReview(null); setSelectedOrder(null);
  };
  const requestBackupAccess = ()=>{
    resetAdminEditors(); setBackupAccessGranted(false); setBackupPasswordInput(''); setBackupLoginError(''); setBackupReauthOpen(true);
  };
  const handleBackupReauth = async (e)=>{
    e.preventDefault();
    try{
      const res=await fetch(AUTH_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({password:backupPasswordInput})});
      const result=await res.json();
      if(result.ok){ setBackupAccessGranted(true); setBackupReauthOpen(false); setBackupLoginError(''); setBackupPasswordInput(''); setAdminActiveSection('backup'); }
      else setBackupLoginError(result.error|| (lang==='zh'?'密碼不正確':'Incorrect password'));
    }catch{ setBackupLoginError(lang==='zh'?'網絡錯誤':'Network error'); }
  };

  // Render helper for stars
  const Stars = ({rating=5})=> <div className="flex items-center gap-0.5">{[...Array(5)].map((_,i)=><Star key={i} size={12} className={`${i<Math.floor(rating)?'fill-amber-400 text-amber-400':'text-gray-300'}`} />)}<span className="text-[11px] text-gray-500 ml-1">{rating.toFixed(1)}</span></div>;

  return (
    <MediaUploadContext.Provider value={data.settings?.mediaUploadsEnabled===true}>
      <div className="min-h-screen flex flex-col font-sans" style={{ fontFamily: 'var(--site-font-family)' }}>
        {/* Admin active banner */}
        {isAdminLoggedIn && activeTab!=='admin' && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm z-50 shrink-0 sticky top-0">
            <div className="flex items-center gap-2"><Shield size={14} className="animate-pulse text-amber-100 shrink-0"/><span className="truncate max-w-[260px] sm:max-w-none">{lang==='zh'?'管理員已登入（預覽公開網站）':'Admin Session Active (Previewing Live Site)'}</span></div>
            <button onClick={()=>switchTab('admin')} className="bg-white/20 hover:bg-white/30 text-white px-3 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs"><span>{lang==='zh'?'返回後台 »':'Return to Admin »'}</span></button>
          </div>
        )}

        {/* Top promo bar */}
        <div className="bg-[#2d2a26] text-white/90 text-[11px] sm:text-xs py-2 px-4 text-center tracking-wide">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4">
            <span className="flex items-center gap-1.5"><Gift size={12} className="text-primary-light"/>{t(data.settings.firstOrder?.label) || (lang==='zh'?`首次購物 ${data.settings.firstOrder?.code} 享${data.settings.firstOrder?.discountValue}% OFF 滿$${data.settings.firstOrder?.minSpend}`:`First Order ${data.settings.firstOrder?.code} ${data.settings.firstOrder?.discountValue}% OFF over $${data.settings.firstOrder?.minSpend}`)}</span>
            <span className="hidden sm:inline text-white/20">|</span>
            <span className="flex items-center gap-1.5"><Truck size={12} className="text-primary-light"/>{t(data.settings.shipping?.freeShippingLabel) || (lang==='zh'?`滿 HK$${data.settings.shipping?.freeThreshold} 免運費`:`Free Shipping over HK$${data.settings.shipping?.freeThreshold}`)}</span>
          </div>
        </div>

        {/* Header */}
        <header className="bg-white/95 backdrop-blur sticky top-0 z-40 shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-[72px] items-center">
              <div className="flex items-center gap-6">
                {/* Logo */}
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>switchTab('home')}>
                  <img src={data.settings.headerLogo} alt="CS12" className="w-11 h-11 rounded-xl object-contain border border-gray-100 bg-white p-0.5 shadow-sm"/>
                  <div className="leading-tight">
                    <span className="font-black text-[18px] tracking-wide text-gray-900 block">{t(data.settings.siteName)}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{data.settings.siteAbbreviation} • {t(data.settings.slogan)}</span>
                  </div>
                </div>
                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                  <button onClick={()=>switchTab('home')} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${activeTab==='home'?'bg-primary/10 text-primary':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'首頁':'Home'}</button>
                  {/* Shop dropdown */}
                  <div className="relative group/nav">
                    <button onClick={()=>switchTab('shop')} className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${activeTab==='shop'?'bg-primary/10 text-primary':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'選購':'Shop'}<ChevronDown size={14} className="group-hover/nav:rotate-180 transition-transform"/></button>
                    <div className="absolute top-full left-0 mt-2 w-[680px] bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all z-50 p-5 grid grid-cols-3 gap-6">
                      <div><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">{lang==='zh'?'系列':'Series'}</h4><div className="space-y-1">{navCategories.series.map(c=><button key={c.id} onClick={()=>{setShopSeriesFilter(c.id);setShopCategoryFilter('all');switchTab('shop');}} className="w-full text-left text-sm text-gray-700 hover:text-primary py-1.5 flex items-center gap-2"><img src={c.image} className="w-6 h-6 rounded object-cover"/>{t(c.name)}</button>)}</div></div>
                      <div><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">{lang==='zh'?'面部護理':'Face Care'}</h4><div className="space-y-1">{navCategories.faceCare.map(c=><button key={c.id} onClick={()=>{setShopCategoryFilter(c.id);switchTab('shop');}} className="w-full text-left text-sm text-gray-700 hover:text-primary py-1.5">{t(c.name)}</button>)}</div></div>
                      <div><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">{lang==='zh'?'肌膚類別':'Skin Concerns'}</h4><div className="space-y-1">{navCategories.skinType.map(c=><button key={c.id} onClick={()=>{setShopSkinFilter(c.id);switchTab('shop');}} className="w-full text-left text-sm text-gray-700 hover:text-primary py-1.5">{t(c.name)}</button>)}</div><div className="mt-4 pt-3 border-t"><button onClick={()=>{setShopCategoryFilter('all');setShopSkinFilter('all');setShopSeriesFilter('all');switchTab('shop');}} className="text-xs font-bold text-primary hover:underline">{lang==='zh'?'查看全部產品 →':'View All Products →'}</button></div></div>
                    </div>
                  </div>
                  <button onClick={()=>{setActiveTab('bundles'); window.scrollTo(0,0);}} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${activeTab==='bundles'?'bg-primary/10 text-primary':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'官網限定':'Exclusive'}</button>
                  <button onClick={()=>switchTab('membership')} className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${activeTab==='membership'?'bg-primary/10 text-primary':'text-gray-600 hover:bg-gray-50'}`}><Crown size={14}/>{lang==='zh'?'Prestige會員':'Prestige'}</button>
                  <button onClick={()=>switchTab('reviews')} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${activeTab==='reviews'?'bg-primary/10 text-primary':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'真實分享':'Reviews'}</button>
                </nav>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Search desktop */}
                <div className="hidden md:flex items-center relative">
                  <input value={shopSearch} onChange={e=>{setShopSearch(e.target.value); if(activeTab!=='shop') switchTab('shop');}} placeholder={lang==='zh'?'搜尋產品...':'Search...'} className="w-48 lg:w-56 pl-8 pr-3 py-2 rounded-full bg-gray-100 border border-transparent focus:bg-white focus:border-primary/30 focus:ring-1 focus:ring-primary text-sm outline-none transition-all"/>
                  <Search size={14} className="absolute left-3 text-gray-400"/>
                </div>
                <button onClick={()=>{ setCurrency(currency==='HKD'?'USD':'HKD'); }} className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">{currency}</button>
                <button onClick={()=>setLang(lang==='zh'?'en':'zh')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-1"><Languages size={17}/><span className="hidden sm:inline text-xs font-bold uppercase">{lang==='zh'?'EN':'中文'}</span></button>
                <button onClick={()=>setShowWishlist(true)} className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-600"><Heart size={20}/>{wishlistCount>0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{wishlistCount}</span>}</button>
                <button onClick={()=>setShowCart(true)} className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-600"><ShoppingCart size={20}/>{cartCount>0 && <span className="absolute -top-0.5 -right-0.5 bg-gray-900 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}</button>
                <button onClick={()=>switchTab('account')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600"><User size={20}/></button>
                {isAdminLoggedIn && activeTab!=='admin' && <button onClick={()=>switchTab('admin')} className="hidden md:flex ml-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold items-center gap-1"><Shield size={14}/>{lang==='zh'?'後台':'Admin'}</button>}
                <button onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2.5 rounded-lg hover:bg-gray-100 text-gray-600"><Menu size={22}/></button>
              </div>
            </div>
          </div>
          {/* Mobile menu drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-[100] flex justify-end">
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={()=>setMobileMenuOpen(false)}/>
              <div data-mobile-drawer className="relative w-[86vw] max-w-[360px] bg-white h-[100dvh] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
                <div className="shrink-0 flex items-center justify-between px-5 h-[72px] border-b bg-white">
                  <span className="font-black text-base">{t(data.settings.siteName)}</span>
                  <button onClick={()=>setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-gray-100"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                  <button onClick={()=>switchTab('home')} className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium ${activeTab==='home'?'bg-primary/10 text-primary':'text-gray-700'}`}>{lang==='zh'?'首頁':'Home'}</button>
                  <button onClick={()=>switchTab('shop')} className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium ${activeTab==='shop'?'bg-primary/10 text-primary':'text-gray-700'}`}>{lang==='zh'?'選購全部':'Shop All'}</button>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{lang==='zh'?'系列':'Series'}</div>
                  {navCategories.series.map(c=><button key={c.id} onClick={()=>{setShopSeriesFilter(c.id);switchTab('shop');}} className="w-full text-left pl-8 pr-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">{t(c.name)}</button>)}
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{lang==='zh'?'肌膚類別':'Skin Type'}</div>
                  {navCategories.skinType.map(c=><button key={c.id} onClick={()=>{setShopSkinFilter(c.id);switchTab('shop');}} className="w-full text-left pl-8 pr-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">{t(c.name)}</button>)}
                  <button onClick={()=>switchTab('bundles')} className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50">{lang==='zh'?'官網限定套裝':'Exclusive Bundles'}</button>
                  <button onClick={()=>switchTab('membership')} className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Crown size={16}/>{lang==='zh'?'Prestige 會員制度':'Prestige Membership'}</button>
                  <button onClick={()=>switchTab('reviews')} className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50">{lang==='zh'?'用家分享':'Reviews'}</button>
                  <button onClick={()=>switchTab('account')} className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50">{lang==='zh'?'我的帳戶':'My Account'}</button>
                  {isAdminLoggedIn && <button onClick={()=>switchTab('admin')} className="w-full text-left px-4 py-3 rounded-xl text-base font-bold text-amber-700 bg-amber-50">{lang==='zh'?'後台管理':'Admin Panel'}</button>}
                  <div className="pt-4 mt-4 border-t space-y-3">
                    <div className="flex gap-2">
                      <button onClick={()=>setCurrency(currency==='HKD'?'USD':'HKD')} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-bold">{currency} {currency==='HKD'?'(港幣)':'(USD)'}</button>
                      <button onClick={()=>setLang(lang==='zh'?'en':'zh')} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-bold flex items-center justify-center gap-1"><Languages size={16}/>{lang==='zh'?'EN':'中文'}</button>
                    </div>
                    <div className="relative"><input value={shopSearch} onChange={e=>{setShopSearch(e.target.value); switchTab('shop');}} placeholder={lang==='zh'?'搜尋產品關鍵字...':'Search products...'} className="w-full pl-10 pr-3 py-3 rounded-xl bg-gray-100 border border-transparent focus:bg-white focus:border-primary/20 text-sm outline-none"/><Search size={16} className="absolute left-3.5 top-3.5 text-gray-400"/></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-grow bg-[#fdf8f5]/50">
          {/* HOME */}
          {activeTab==='home' && (
            <div className="animate-fade-in">
              {/* Hero Carousel */}
              <div className="relative h-[460px] sm:h-[520px] md:h-[600px] bg-gray-900 overflow-hidden group">
                {data.carousel.filter(c=>c.active!==false).map((slide, idx)=> (
                  <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ${idx===currentSlide?'opacity-100':'opacity-0 pointer-events-none'}`}>
                    <img src={slide.image} alt={t(slide.title)} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"/>
                    <div className="absolute inset-0 flex items-end sm:items-center">
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pb-10 sm:pb-0">
                        <div className="max-w-xl bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-white space-y-3">
                          <span className="inline-flex px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wider">{lang==='zh'?'官網限定':'Exclusive'}</span>
                          <h1 className="text-3xl sm:text-4xl font-black leading-tight">{t(slide.title)}</h1>
                          <p className="text-white/85 text-sm sm:text-base">{t(slide.subtitle)}</p>
                          <div className="flex gap-2 pt-2">
                            <button onClick={()=>{ if(slide.ctaLink==='shop') switchTab('shop'); else if(slide.ctaLink?.startsWith('product')){ const pid=parseInt(slide.ctaLink.split('-')[1]); const p=data.products.find(pp=>pp.id===pid); if(p) setSelectedProduct(p); } else switchTab('shop'); }} className="px-5 py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors flex items-center gap-1"><span>{t(slide.ctaText)|| (lang==='zh'?'立即選購':'Shop Now')}</span><ArrowRight size={16}/></button>
                            <button onClick={()=>switchTab('membership')} className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors">{lang==='zh'?'加入會員':'Join Prestige'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={()=>setCurrentSlide(prev=> (prev-1+data.carousel.length)%data.carousel.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur opacity-0 group-hover:opacity-100 transition-all"><ChevronLeft size={20}/></button>
                <button onClick={()=>setCurrentSlide(prev=> (prev+1)%data.carousel.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur opacity-0 group-hover:opacity-100 transition-all"><ChevronRight size={20}/></button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {data.carousel.filter(c=>c.active!==false).map((_,i)=><button key={i} onClick={()=>setCurrentSlide(i)} className={`h-2 rounded-full transition-all ${i===currentSlide?'w-8 bg-white':'w-2.5 bg-white/50'}`} />)}
                </div>
              </div>

              {/* USP strip */}
              <div className="bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {[
                    { icon: Percent, title: lang==='zh'?'首次購物 15% OFF':'15% OFF First Order', desc: lang==='zh'?`滿 HK$${data.settings.firstOrder?.minSpend} 輸入 ${data.settings.firstOrder?.code}`:`Over HK$${data.settings.firstOrder?.minSpend} code ${data.settings.firstOrder?.code}`, color: 'bg-primary/10 text-primary' },
                    { icon: Truck, title: lang==='zh'?`滿 HK$${data.settings.shipping?.freeThreshold} 免運費`:`Free shipping over HK$${data.settings.shipping?.freeThreshold}`, desc: lang==='zh'?'香港地區免運費':'Free shipping HK', color: 'bg-emerald-50 text-emerald-600' },
                    { icon: Sparkles, title: lang==='zh'?'官網限定禮遇':'Exclusive GWP', desc: lang==='zh'?`滿 $${data.settings.gwp?.rules?.[0]?.minSpend} 獲贈${data.settings.gwp?.rules?.[0]?.gifts?.length}件禮品`:`Spend $${data.settings.gwp?.rules?.[0]?.minSpend} get gifts`, color: 'bg-amber-50 text-amber-600' }
                  ].map((item,i)=><div key={i} className="flex items-center gap-4 p-5"><div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center shrink-0`}><item.icon size={20}/></div><div><p className="font-bold text-sm text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div></div>)}
                </div>
              </div>

              {/* Series */}
              <section className="py-14 px-4 max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-primary font-bold text-xs uppercase tracking-widest">{lang==='zh'?'精選修護系列':'Featured Collections'}</span>
                  <h2 className="text-3xl font-black text-gray-900 mt-2">{lang==='zh'?'為敏感肌而生的溫和醫研修護':'Gentle Clinical Repair for Sensitive Skin'}</h2>
                  <p className="text-gray-600 text-sm mt-3 font-light">{t(data.settings.description)}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {data.categories.filter(c=>c.type==='series'&&c.active).map(cat=>(
                    <div key={cat.id} onClick={()=>{setShopSeriesFilter(cat.id); switchTab('shop');}} className="group relative overflow-hidden rounded-3xl bg-white border border-gray-100 hover:shadow-xl transition-all cursor-pointer">
                      <div className="aspect-[4/3] overflow-hidden"><img src={cat.image} alt={t(cat.name)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/></div>
                      <div className="p-5 flex items-center justify-between"><div><h3 className="font-black text-lg">{t(cat.name)}</h3><p className="text-xs text-gray-500 mt-1">{t(cat.description)}</p></div><div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-primary transition-colors"><ArrowRight size={16}/></div></div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bestsellers */}
              <section className="py-14 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex items-end justify-between mb-8">
                    <div><span className="text-primary font-bold text-xs uppercase tracking-widest">{lang==='zh'?'熱賣產品':'Bestsellers'}</span><h2 className="text-3xl font-black text-gray-900 mt-1">{lang==='zh'?'暢銷修護':'Best Sellers'}</h2></div>
                    <button onClick={()=>switchTab('shop')} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50">{lang==='zh'?'查看全部':'View All'}</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {data.products.filter(p=>p.isBestseller&&p.active).slice(0,8).map(prod=>(
                      <div key={prod.id} className="group bg-gray-50/70 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col">
                        <div className="relative aspect-square overflow-hidden bg-white cursor-pointer" onClick={()=>setSelectedProduct(prod)}>
                          <img src={prod.images[0]} alt={t(prod.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                          {prod.compareAtPrice>prod.price && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">-{Math.round((1-prod.price/prod.compareAtPrice)*100)}%</span>}
                          <button onClick={(e)=>{e.stopPropagation(); toggleWishlist(prod.id);}} className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border transition-all ${wishlist.includes(prod.id)?'bg-primary text-white border-primary':'bg-white text-gray-400 border-gray-200 hover:text-primary'}`}><Heart size={14} className={wishlist.includes(prod.id)?'fill-white':''}/></button>
                          {prod.isBestseller && <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center gap-1"><Crown size={10}/>{lang==='zh'?'熱賣':'Bestseller'}</span>}
                        </div>
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <h4 className="font-bold text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary" onClick={()=>setSelectedProduct(prod)}>{t(prod.title)}</h4>
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{t(prod.subtitle)||t(prod.shortDesc)}</p>
                          <div className="mt-2"><Stars rating={prod.rating||5}/></div>
                          <div className="mt-3 flex items-center justify-between">
                            <div><span className="font-black text-[15px] text-gray-900">{formatPrice(prod.price)}</span>{prod.compareAtPrice>prod.price && <span className="ml-1.5 text-[11px] text-gray-400 line-through">{formatPrice(prod.compareAtPrice)}</span>}</div>
                            <button onClick={()=>addToCart(prod.id, prod.variants?.[0]?.id||null, 1)} className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-primary transition-colors"><ShoppingBag size={14}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Miracle Mask + SoCalm highlights */}
              <section className="py-14 px-4 max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
                {[
                  { img: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg", title: {zh:"獨家CalmEX療敏配方\n奇蹟面膜", en:"Exclusive CalmEX\nMiracle Mask"}, cta: "立即選購", productId:1 },
                  { img: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/1O1A7491-E-scaled.jpg", title: {zh:"強韌屏障3步曲\n#SOCALM", en:"Barrier 3 Steps\n#SOCALM"}, cta: "立即選購", cat:"series-socalm" }
                ].map((block,i)=>(
                  <div key={i} className="relative rounded-3xl overflow-hidden h-[420px] group cursor-pointer" onClick={()=>{ if(block.productId){ const p=data.products.find(pp=>pp.id===block.productId); if(p) setSelectedProduct(p); } else if(block.cat){ setShopSeriesFilter(block.cat); switchTab('shop'); } }}>
                    <img src={block.img} alt="highlight" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                    <div className="absolute bottom-0 p-8 text-white space-y-3">
                      <h3 className="text-2xl sm:text-3xl font-black leading-tight whitespace-pre-line">{t(block.title)}</h3>
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-colors">{block.cta} <ArrowRight size={14}/></button>
                    </div>
                  </div>
                ))}
              </section>

              {/* Reviews */}
              <section className="py-14 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center mb-10"><span className="text-primary font-bold text-xs uppercase tracking-widest">{lang==='zh'?'真實用家 如實分享':'Real Users Real Reviews'}</span><h2 className="text-3xl font-black mt-2">{lang==='zh'?'用家見證':'Customer Stories'}</h2></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.reviews.slice(0,4).map(r=>(
                      <div key={r.id} className="bg-[#fdf8f5] rounded-2xl p-5 border border-gray-100 space-y-3 hover:shadow-md transition-all">
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white"><img src={r.image} alt={r.customerName} className="w-full h-full object-cover"/></div>
                        <div className="flex items-center gap-2"><img src={r.avatar} alt={r.customerName} className="w-8 h-8 rounded-full"/><div><p className="font-bold text-sm">{r.customerName}</p><Stars rating={r.rating}/></div></div>
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{t(r.comment)}</p>
                        <p className="text-[11px] text-gray-500">{t(r.productTitle)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* GWP Banner */}
              <section className="py-12 px-4 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  {(data.settings.gwp?.rules||[]).filter(r=>r.active).map(rule=>(
                    <div key={rule.id} className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-white p-6 flex gap-4 items-center">
                      <img src={rule.image} alt="gift" className="w-24 h-24 object-contain rounded-xl bg-white border border-gray-100 p-2 shrink-0"/>
                      <div className="space-y-1 flex-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{lang==='zh'?'滿贈禮遇':'GWP'}</span>
                        <h4 className="font-black text-base">{t(rule.title)}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{t(rule.description)}</p>
                        <div className="pt-2"><button onClick={()=>switchTab('shop')} className="text-xs font-bold text-primary hover:underline">{lang==='zh'?'立即選購 →':'Shop Now →'}</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Newsletter */}
              <section className="bg-gray-900 text-white py-14 px-4">
                <div className="max-w-3xl mx-auto text-center space-y-4">
                  <h3 className="text-2xl sm:text-3xl font-black">{t(data.settings.newsletter?.title) || 'Subscribe PRESTIGE Newsletter'}</h3>
                  <p className="text-white/70 text-sm">{t(data.settings.newsletter?.description) || 'Get latest offers'}</p>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
                    <input placeholder={lang==='zh'?'輸入您的電郵':'Enter your email'} className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                    <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors">{lang==='zh'?'訂閱':'Subscribe'}</button>
                  </div>
                  <p className="text-[11px] text-white/40">{lang==='zh'?'*隨訂閱即表示您同意CS12隱私政策和服務條款':'*By subscribing you agree to privacy policy'}</p>
                </div>
              </section>
            </div>
          )}

          {/* SHOP */}
          {activeTab==='shop' && (
            <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar filters - desktop */}
                <aside className="hidden lg:block w-64 shrink-0 space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
                    <h4 className="font-black text-sm flex items-center gap-2"><Filter size={14}/>{lang==='zh'?'篩選':'Filters'}</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block">{lang==='zh'?'系列':'Series'}</label>
                      <div className="space-y-1.5">
                        <button onClick={()=>setShopSeriesFilter('all')} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopSeriesFilter==='all'?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'全部':'All'}</button>
                        {navCategories.series.map(c=><button key={c.id} onClick={()=>setShopSeriesFilter(c.id)} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopSeriesFilter===c.id?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{t(c.name)}</button>)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block">{lang==='zh'?'面部護理':'Face Care'}</label>
                      <div className="space-y-1.5">
                        <button onClick={()=>setShopCategoryFilter('all')} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopCategoryFilter==='all'?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'全部':'All'}</button>
                        {navCategories.faceCare.map(c=><button key={c.id} onClick={()=>setShopCategoryFilter(c.id)} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopCategoryFilter===c.id?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{t(c.name)}</button>)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block">{lang==='zh'?'肌膚類別':'Skin Type'}</label>
                      <div className="space-y-1.5">
                        <button onClick={()=>setShopSkinFilter('all')} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopSkinFilter==='all'?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{lang==='zh'?'全部':'All'}</button>
                        {navCategories.skinType.map(c=><button key={c.id} onClick={()=>setShopSkinFilter(c.id)} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg ${shopSkinFilter===c.id?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}>{t(c.name)}</button>)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block">{lang==='zh'?`價格範圍: ${formatPrice(shopPriceRange[0])} - ${formatPrice(shopPriceRange[1])}`:`Price: ${formatPrice(shopPriceRange[0])} - ${formatPrice(shopPriceRange[1])}`}</label>
                      <input type="range" min={0} max={2000} step={50} value={shopPriceRange[1]} onChange={e=>setShopPriceRange([0, parseInt(e.target.value)])} className="w-full accent-primary"/>
                    </div>
                    <button onClick={()=>{setShopCategoryFilter('all'); setShopSkinFilter('all'); setShopSeriesFilter('all'); setShopSearch(''); setShopPriceRange([0,2000]);}} className="w-full py-2 rounded-xl bg-gray-100 text-xs font-bold hover:bg-gray-200">{lang==='zh'?'清除篩選':'Clear Filters'}</button>
                  </div>
                </aside>

                {/* Main products */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setShowMobileFilter(true)} className="lg:hidden px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center gap-1"><Filter size={14}/>{lang==='zh'?'篩選':'Filter'}</button>
                      <span className="text-xs text-gray-500">{filteredProducts.length} {lang==='zh'?'件產品':'products'}</span>
                      {(shopCategoryFilter!=='all'||shopSeriesFilter!=='all'||shopSkinFilter!=='all') && (
                        <div className="flex gap-1.5 flex-wrap">
                          {shopCategoryFilter!=='all' && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1">{data.categories.find(c=>c.id===shopCategoryFilter)?.name?.zh||shopCategoryFilter}<button onClick={()=>setShopCategoryFilter('all')} className="hover:text-primary-dark"><X size={10}/></button></span>}
                          {shopSeriesFilter!=='all' && <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold flex items-center gap-1">{data.categories.find(c=>c.id===shopSeriesFilter)?.name?.zh||shopSeriesFilter}<button onClick={()=>setShopSeriesFilter('all')}><X size={10}/></button></span>}
                          {shopSkinFilter!=='all' && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold flex items-center gap-1">{data.categories.find(c=>c.id===shopSkinFilter)?.name?.zh||shopSkinFilter}<button onClick={()=>setShopSkinFilter('all')}><X size={10}/></button></span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative"><input value={shopSearch} onChange={e=>setShopSearch(e.target.value)} placeholder={lang==='zh'?'搜尋...':'Search...'} className="pl-8 pr-3 py-2 rounded-xl bg-gray-100 border border-transparent focus:bg-white focus:border-primary/20 text-xs outline-none w-36 sm:w-48"/><Search size={12} className="absolute left-2.5 top-2.5 text-gray-400"/></div>
                      <select value={shopSort} onChange={e=>setShopSort(e.target.value)} className="px-2.5 py-2 rounded-xl bg-gray-100 text-xs font-medium outline-none border border-transparent focus:bg-white focus:border-primary/20"><option value="featured">{lang==='zh'?'精選':'Featured'}</option><option value="bestseller">{lang==='zh'?'熱銷':'Bestseller'}</option><option value="newest">{lang==='zh'?'最新':'Newest'}</option><option value="price-low">{lang==='zh'?'價格低到高':'Price Low-High'}</option><option value="price-high">{lang==='zh'?'價格高到低':'Price High-Low'}</option><option value="rating">{lang==='zh'?'評分':'Rating'}</option></select>
                    </div>
                  </div>

                  {filteredProducts.length===0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-3"><Package size={36} className="mx-auto text-gray-300"/><p className="font-bold text-gray-700">{lang==='zh'?'未找到相關產品':'No products found'}</p><p className="text-xs text-gray-500">{lang==='zh'?'請嘗試調整篩選條件':'Try adjusting filters'}</p><button onClick={()=>{setShopSearch(''); setShopCategoryFilter('all'); setShopSkinFilter('all'); setShopSeriesFilter('all'); setShopPriceRange([0,2000]);}} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold">{lang==='zh'?'清除篩選':'Clear Filters'}</button></div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                      {filteredProducts.map(prod=>(
                        <div key={prod.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col">
                          <div className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer" onClick={()=>setSelectedProduct(prod)}>
                            <img src={prod.images[0]} alt={t(prod.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                            {prod.compareAtPrice>prod.price && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">-{Math.round((1-prod.price/prod.compareAtPrice)*100)}%</span>}
                            <button onClick={(e)=>{e.stopPropagation(); toggleWishlist(prod.id);}} className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow border transition-all ${wishlist.includes(prod.id)?'bg-primary text-white border-primary':'bg-white text-gray-400 border-gray-200 hover:text-primary'}`}><Heart size={14} className={wishlist.includes(prod.id)?'fill-white':''}/></button>
                            {prod.stock<=prod.lowStockThreshold && <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{lang==='zh'?'低庫存':'Low Stock'}</span>}
                          </div>
                          <div className="p-3 sm:p-4 flex-1 flex flex-col">
                            <h4 className="font-bold text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary" onClick={()=>setSelectedProduct(prod)}>{t(prod.title)}</h4>
                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{t(prod.subtitle)||t(prod.shortDesc)}</p>
                            <div className="mt-2 flex items-center gap-1"><Stars rating={prod.rating||5}/><span className="text-[10px] text-gray-400">({prod.reviewCount||0})</span></div>
                            <div className="mt-auto pt-3 flex items-center justify-between">
                              <div><span className="font-black text-[15px]">{formatPrice(prod.price)}</span>{prod.compareAtPrice>prod.price && <span className="ml-1.5 text-[11px] text-gray-400 line-through">{formatPrice(prod.compareAtPrice)}</span>}</div>
                              <button onClick={()=>addToCart(prod.id, prod.variants?.[0]?.id||null, 1)} className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-primary transition-colors"><ShoppingBag size={14}/></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile filter drawer */}
              {showMobileFilter && (
                <div className="fixed inset-0 z-[60] flex">
                  <div className="absolute inset-0 bg-black/40" onClick={()=>setShowMobileFilter(false)}/>
                  <div className="relative w-[82vw] max-w-[320px] bg-white h-full shadow-2xl overflow-y-auto p-5 space-y-5 animate-slide-in-right">
                    <div className="flex items-center justify-between"><h4 className="font-black text-sm">{lang==='zh'?'篩選':'Filters'}</h4><button onClick={()=>setShowMobileFilter(false)} className="p-2 rounded-xl bg-gray-100"><X size={16}/></button></div>
                    <div><p className="text-xs font-bold mb-2">{lang==='zh'?'系列':'Series'}</p><div className="space-y-1">{['all', ...navCategories.series.map(c=>c.id)].map(id=>{const c=data.categories.find(cc=>cc.id===id); const label=id==='all'?(lang==='zh'?'全部':'All'):t(c?.name); return <button key={id} onClick={()=>setShopSeriesFilter(id)} className={`w-full text-left text-xs px-3 py-2 rounded-xl ${shopSeriesFilter===id?'bg-primary/10 text-primary font-bold':'bg-gray-50 text-gray-600'}`}>{label}</button>;})}</div></div>
                    <div><p className="text-xs font-bold mb-2">{lang==='zh'?'肌膚類別':'Skin Type'}</p><div className="space-y-1">{['all', ...navCategories.skinType.map(c=>c.id)].map(id=>{const c=data.categories.find(cc=>cc.id===id); const label=id==='all'?(lang==='zh'?'全部':'All'):t(c?.name); return <button key={id} onClick={()=>setShopSkinFilter(id)} className={`w-full text-left text-xs px-3 py-2 rounded-xl ${shopSkinFilter===id?'bg-primary/10 text-primary font-bold':'bg-gray-50 text-gray-600'}`}>{label}</button>;})}</div></div>
                    <div><p className="text-xs font-bold mb-2">{lang==='zh'?'面部護理':'Face Care'}</p><div className="space-y-1">{['all', ...navCategories.faceCare.map(c=>c.id)].map(id=>{const c=data.categories.find(cc=>cc.id===id); const label=id==='all'?(lang==='zh'?'全部':'All'):t(c?.name); return <button key={id} onClick={()=>setShopCategoryFilter(id)} className={`w-full text-left text-xs px-3 py-2 rounded-xl ${shopCategoryFilter===id?'bg-primary/10 text-primary font-bold':'bg-gray-50 text-gray-600'}`}>{label}</button>;})}</div></div>
                    <div><label className="text-xs font-bold mb-2 block">{lang==='zh'?'最高價格':'Max Price'}: {formatPrice(shopPriceRange[1])}</label><input type="range" min={0} max={2000} step={50} value={shopPriceRange[1]} onChange={e=>setShopPriceRange([0, parseInt(e.target.value)])} className="w-full accent-primary"/></div>
                    <div className="flex gap-2 pt-2"><button onClick={()=>{setShopCategoryFilter('all'); setShopSkinFilter('all'); setShopSeriesFilter('all'); setShopPriceRange([0,2000]);}} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-xs font-bold">{lang==='zh'?'清除':'Clear'}</button><button onClick={()=>setShowMobileFilter(false)} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold">{lang==='zh'?'應用':'Apply'}</button></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BUNDLES */}
          {activeTab==='bundles' && (
            <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in space-y-10">
              <div className="text-center max-w-2xl mx-auto"><span className="text-primary font-bold text-xs uppercase tracking-widest">{lang==='zh'?'官網限定禮遇':'Exclusive Offers'}</span><h1 className="text-3xl font-black mt-2">{lang==='zh'?'限定修護套裝 低至 HK$1,198 起':'Exclusive Repair Sets from HK$1,198'}</h1><p className="text-sm text-gray-600 mt-3">{lang==='zh'?'購滿 $2000 獲贈6件療敏禮品，滿$3000 獲贈10件':'Spend $2000 get 6 gifts, $3000 get 10 gifts'}</p></div>
              <div className="grid md:grid-cols-2 gap-6">
                {data.bundles.filter(b=>b.active).map(bundle=>(
                  <div key={bundle.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all flex flex-col md:flex-row">
                    <div className="md:w-1/2 aspect-square md:aspect-auto relative bg-gray-50"><img src={bundle.image} alt={t(bundle.title)} className="absolute inset-0 w-full h-full object-cover"/><span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">{t(bundle.badge)||'Limited'}</span></div>
                    <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4">
                      <div><h3 className="font-black text-lg leading-tight">{t(bundle.title)}</h3><p className="text-xs text-gray-600 mt-2">{t(bundle.description)}</p><div className="flex items-center gap-2 mt-3"><span className="font-black text-xl">{formatPrice(bundle.price)}</span><span className="text-sm text-gray-400 line-through">{formatPrice(bundle.originalPrice)}</span><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold">-{Math.round((1-bundle.price/bundle.originalPrice)*100)}%</span></div><div className="mt-3 text-[11px] text-gray-500">{lang==='zh'?'有效期':'Valid'}: {bundle.validFrom} – {bundle.validTo}</div></div>
                      <div className="flex gap-2">
                        <button onClick={()=>{
                          // add all products in bundle to cart
                          bundle.productIds.forEach(pid=>addToCart(pid,null,1));
                        }} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-primary transition-colors flex items-center justify-center gap-1"><ShoppingBag size={14}/>{lang==='zh'?'加入套裝':'Add Bundle'}</button>
                        <button onClick={()=>{ setShopSearch(bundle.title.en||''); switchTab('shop'); }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50">{lang==='zh'?'查看詳情':'Details'}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* GWP detailed */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
                <h3 className="font-black text-lg flex items-center gap-2"><Gift size={18} className="text-primary"/>{lang==='zh'?'官網限定禮遇詳情':'GWP Details'}</h3>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {(data.settings.gwp?.rules||[]).map(r=>(
                    <div key={r.id} className="rounded-2xl border border-gray-100 p-5 bg-[#fdf8f5] space-y-3">
                      <div className="flex items-center gap-3"><img src={r.image} className="w-16 h-16 rounded-xl bg-white border p-1 object-contain"/><div><p className="font-bold text-sm">{t(r.title)}</p><p className="text-xs text-gray-500">{t(r.description)}</p></div></div>
                      <div className="flex flex-wrap gap-1.5">{r.gifts?.map((g,i)=><span key={i} className="px-2 py-1 rounded-full bg-white border text-[11px]">{t(g.name)} x{g.qty}</span>)}</div>
                      <div className="text-xs font-bold">Min {formatPrice(r.minSpend)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MEMBERSHIP */}
          {activeTab==='membership' && (
            <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in space-y-12">
              <div className="text-center max-w-3xl mx-auto space-y-3"><span className="text-primary font-bold text-xs uppercase tracking-widest">{lang==='zh'?'CS12 PRESTIGE':'CS12 PRESTIGE'}</span><h1 className="text-4xl font-black">PRESTIGE {lang==='zh'?'會員制度':'Membership'}</h1><p className="text-sm text-gray-600">{lang==='zh'?'累積消費，享專屬禮遇、積分、生日優惠及推薦獎勵':'Spend and enjoy exclusive gifts, points, birthday perks and referral rewards'}</p></div>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {(data.settings.membership?.tiers||[]).map(tier=>(
                  <div key={tier.id} className={`rounded-3xl border-2 p-6 space-y-4 ${tier.id==='signature'?'border-gray-900 bg-gray-900 text-white':'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between"><span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest ${tier.id==='signature'?'bg-white text-gray-900':'bg-gray-900 text-white'}`}>{tier.badge}</span>{tier.id==='signature'&&<Crown size={18} className="text-amber-300"/>}</div>
                    <h3 className="text-2xl font-black">{t(tier.name)}</h3>
                    <p className="text-sm opacity-80">{tier.id==='classic' ? (lang==='zh'?`單筆$${tier.minSpendToEnroll} 或 ${tier.accumulateMonths}個月內累積滿$${tier.minSpendToEnroll} 即可入會`:`Single $${tier.minSpendToEnroll} or accumulate within ${tier.accumulateMonths} months`) : (lang==='zh'?`單筆累積滿$${tier.minSpendToUpgrade} 升級尊尚`:`Accumulate $${tier.minSpendToUpgrade} to upgrade`)}</p>
                    <div className="space-y-2 pt-2">
                      {(t(tier.benefits)?.length ? t(tier.benefits) : tier.benefits?.en||[]).map?.((b,i)=>(
                        <div key={i} className="flex items-start gap-2 text-sm"><CheckCircle size={14} className={`mt-0.5 shrink-0 ${tier.id==='signature'?'text-amber-300':'text-primary'}`}/><span className="opacity-90">{typeof b==='string'?b:t(b)||b}</span></div>
                      )) || (tier.benefits?.[lang]||[]).map((b,i)=><div key={i} className="flex items-start gap-2 text-sm"><CheckCircle size={14} className={`mt-0.5 shrink-0 ${tier.id==='signature'?'text-amber-300':'text-primary'}`}/><span>{b}</span></div>)}
                    </div>
                    <div className="pt-4 border-t border-white/10 text-xs space-y-1 opacity-80">
                      <p>{lang==='zh'?'積分比率':'Points Rate'}: $1 = {tier.pointsRate} {lang==='zh'?'分':'Credit'}</p>
                      <p>{lang==='zh'?'推薦獎勵':'Referral'}: +{tier.referralBonus} {lang==='zh'?'分':'Credits'}</p>
                      <p>{lang==='zh'?'生日禮遇':'Birthday'}: HK${tier.birthdayCoupon} + {tier.birthdayMultiplier}x {lang==='zh'?'積分':''} {tier.birthdayGift?`+ ${lang==='zh'?'生日禮物':'Gift'}`:''}</p>
                    </div>
                    <button onClick={()=>switchTab('shop')} className={`w-full py-3 rounded-xl font-bold text-sm ${tier.id==='signature'?'bg-white text-gray-900 hover:bg-gray-100':'bg-gray-900 text-white hover:bg-black'}`}>{lang==='zh'?'立即選購':'Shop Now'}</button>
                  </div>
                ))}
              </div>

              <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-6">
                <h3 className="font-black text-lg">{lang==='zh'?'會員權益對比':'Benefits Comparison'}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-xs text-gray-500 uppercase"><th className="text-left py-3">{lang==='zh'?'權益':'Benefit'}</th><th className="text-center py-3">Classic</th><th className="text-center py-3">Signature</th></tr></thead>
                    <tbody className="divide-y">
                      <tr><td className="py-3 font-medium">{lang==='zh'?'入會門檻':'Enrollment'}</td><td className="text-center">HK$1500</td><td className="text-center">HK$6500</td></tr>
                      <tr><td className="py-3 font-medium">{lang==='zh'?'生日禮遇':'Birthday Reward'}</td><td className="text-center">HK$100 + 2x</td><td className="text-center">HK$100 + Gift + 3x</td></tr>
                      <tr><td className="py-3 font-medium">{lang==='zh'?'積分累積':'Points'}</td><td className="text-center">$1=1</td><td className="text-center">$1=1.5</td></tr>
                      <tr><td className="py-3 font-medium">{lang==='zh'?'推薦獎勵':'Referral'}</td><td className="text-center">+50</td><td className="text-center">+100 / +150</td></tr>
                      <tr><td className="py-3 font-medium">{lang==='zh'?'專屬禮遇':'Exclusive GWP'}</td><td className="text-center"><Check size={16} className="mx-auto text-green-500"/></td><td className="text-center"><Check size={16} className="mx-auto text-green-500"/></td></tr>
                      <tr><td className="py-3 font-medium">{lang==='zh'?'新品優先':'Insider'}</td><td className="text-center">{lang==='zh'?'有':'Yes'}</td><td className="text-center">{lang==='zh'?'優先':'First'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-[11px] text-gray-500 leading-relaxed space-y-1">
                  <p>{lang==='zh'?'*生日月份額外積分上限 HK$10,000，積分有效期12個月，每年1月及7月通知兌換':'*Extra birthday points capped at HK$10,000 purchase, points expire in 12 months, redemption notified Jan & July'}</p>
                  <p>{lang==='zh'?'*推薦獎勵需滿3個月會籍方可獲得，超過12個月無交易會籍將終止，生日當月入會不享當月生日禮遇':'*Referral requires 3 months membership, inactive 12 months membership terminated, birthday month join not entitled to birthday perks that month'}</p>
                </div>
              </div>

              {fullCurrentCustomer && (
                <div className="max-w-3xl mx-auto bg-gradient-to-br from-primary/10 to-white rounded-3xl border border-primary/20 p-6 flex items-center justify-between">
                  <div><p className="font-bold">{lang==='zh'?`您好，${fullCurrentCustomer.name}！`:`Hi, ${fullCurrentCustomer.name}!`}</p><p className="text-sm text-gray-600 mt-1">{lang==='zh'?`目前等級：${t(customerTier?.name) || customerTier?.id || '未入會'} | 積分：${fullCurrentCustomer.points} | 累積消費：${formatPrice(fullCurrentCustomer.totalSpent||0)}`:`Tier: ${customerTier?.id||'None'} | Points: ${fullCurrentCustomer.points} | Spent: ${formatPrice(fullCurrentCustomer.totalSpent||0)}`}</p></div>
                  <button onClick={()=>switchTab('account')} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">{lang==='zh'?'查看會員中心':'My Prestige'}</button>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS */}
          {activeTab==='reviews' && (
            <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in space-y-8">
              <div className="text-center"><h1 className="text-3xl font-black">{lang==='zh'?'真實用家 如實分享':'Real Users, Honest Reviews'}</h1><p className="text-sm text-gray-600 mt-2">{lang==='zh'?'敏感肌見證療敏奇蹟':'Sensitive skin witnessing miracle'}</p></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.reviews.map(r=>(
                  <div key={r.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                    <div className="aspect-[4/3] bg-gray-50"><img src={r.image} alt={r.customerName} className="w-full h-full object-cover"/></div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-3"><img src={r.avatar} className="w-10 h-10 rounded-full"/><div><p className="font-bold text-sm">{r.customerName}</p><Stars rating={r.rating}/></div>{r.verified && <span className="ml-auto px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold flex items-center gap-1"><CheckCircle size={10}/>{lang==='zh'?'已驗證':'Verified'}</span>}</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{t(r.comment)}</p>
                      <p className="text-xs text-gray-500">{t(r.productTitle)} • {r.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          {activeTab==='account' && (
            <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-in">
              {!fullCurrentCustomer || !fullCurrentCustomer.email ? (
                <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 p-8 space-y-6 shadow-sm">
                  <div className="text-center space-y-2"><div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><User size={20}/></div><h2 className="text-2xl font-black">{authMode==='login'?(lang==='zh'?'登入帳號':'Login'):(lang==='zh'?'註冊帳號':'Register')}</h2><p className="text-xs text-gray-500">{lang==='zh'?'登入享會員積分與生日禮遇':'Login for points & birthday perks'}</p></div>
                  <form onSubmit={authMode==='login'?handleCustomerLogin:handleCustomerRegister} className="space-y-4">
                    {authMode==='register' && <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'姓名 *':'Name *'}</label><input value={authForm.name} onChange={e=>setAuthForm({...authForm, name:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>}
                    <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'電郵 *':'Email *'}</label><input type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm, email:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                    <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'密碼 *':'Password *'}</label><input type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm, password:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                    {authMode==='register' && <>
                      <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'生日 (選填，享生日禮遇)':'Birthday (optional for birthday perks)'}</label><input type="date" value={authForm.birthday} onChange={e=>setAuthForm({...authForm, birthday:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'推薦碼 (選填)':'Referral Code (optional)'}</label><input value={authForm.referral} onChange={e=>setAuthForm({...authForm, referral:e.target.value})} placeholder="Y.A.N..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={authForm.newsletter} onChange={e=>setAuthForm({...authForm, newsletter:e.target.checked})} className="rounded"/><span>{lang==='zh'?'訂閱電子報獲取優惠':'Subscribe newsletter for offers'}</span></label>
                    </>}
                    {authError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{authError}</div>}
                    <button type="submit" className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors">{authMode==='login'?(lang==='zh'?'登入':'Login'):(lang==='zh'?'註冊':'Register')}</button>
                    <div className="text-center text-xs text-gray-500">{authMode==='login'?(lang==='zh'?'還沒有帳號？':'No account?'): (lang==='zh'?'已有帳號？':'Have account?')}<button type="button" onClick={()=>{setAuthMode(authMode==='login'?'register':'login'); setAuthError('');}} className="ml-1 font-bold text-primary hover:underline">{authMode==='login'?(lang==='zh'?'立即註冊':'Register'):(lang==='zh'?'登入':'Login')}</button></div>
                  </form>
                  <div className="pt-4 border-t text-center"><button onClick={()=>switchTab('home')} className="text-xs text-gray-500 hover:underline">{lang==='zh'?'← 返回首頁':'← Back to Home'}</button></div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-[240px_1fr] gap-8">
                  {/* Account sidebar */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
                      <img src={fullCurrentCustomer.avatar} className="w-12 h-12 rounded-full"/>
                      <div><p className="font-bold text-sm">{fullCurrentCustomer.name}</p><p className="text-xs text-gray-500">{fullCurrentCustomer.email}</p><span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${customerTier?.id==='signature'?'bg-gray-900 text-white':'bg-primary/10 text-primary'}`}>{customerTier? t(customerTier.name): (lang==='zh'?'未入會':'Not Member')}</span></div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-2">
                      {[
                        { id:'overview', label: lang==='zh'?'總覽':'Overview', icon: LayoutGrid },
                        { id:'orders', label: lang==='zh'?`訂單 (${fullCurrentCustomer.ordersCount||0})`:`Orders (${fullCurrentCustomer.ordersCount||0})`, icon: Package },
                        { id:'points', label: lang==='zh'?`積分 ${fullCurrentCustomer.points}`:`Points ${fullCurrentCustomer.points}`, icon: Award },
                        { id:'membership', label: lang==='zh'?'會員權益':'Membership', icon: Crown },
                        { id:'referral', label: lang==='zh'?'推薦獎勵':'Referral', icon: Users },
                        { id:'addresses', label: lang==='zh'?'地址':'Addresses', icon: MapPin },
                        { id:'wishlist', label: lang==='zh'?`收藏 ${wishlistCount}`:`Wishlist ${wishlistCount}`, icon: Heart },
                      ].map(item=><button key={item.id} onClick={()=>setAccountTab(item.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${accountTab===item.id?'bg-primary/10 text-primary font-bold':'text-gray-600 hover:bg-gray-50'}`}><item.icon size={16}/>{item.label}</button>)}
                      <div className="border-t mt-2 pt-2"><button onClick={handleCustomerLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={16}/>{lang==='zh'?'登出':'Logout'}</button></div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    {accountTab==='overview' && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs text-gray-500 uppercase font-bold">{lang==='zh'?'累積消費':'Total Spent'}</p><p className="text-2xl font-black mt-2">{formatPrice(fullCurrentCustomer.totalSpent||0)}</p><p className="text-xs text-gray-500 mt-1">{fullCurrentCustomer.ordersCount||0} {lang==='zh'?'筆訂單':'orders'}</p></div>
                          <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-xs text-gray-500 uppercase font-bold">{lang==='zh'?'可用積分':'Points'}</p><p className="text-2xl font-black mt-2">{fullCurrentCustomer.points||0}</p><p className="text-xs text-gray-500 mt-1">{lang==='zh'?'可兌換產品':'Redeem products'}</p></div>
                          <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-5"><p className="text-xs text-white/60 uppercase font-bold">{lang==='zh'?'會員等級':'Tier'}</p><p className="text-2xl font-black mt-2 flex items-center gap-2">{customerTier? t(customerTier.name): (lang==='zh'?'未入會':'Not Member')} {customerTier?.id==='signature' && <Crown size={18} className="text-amber-300"/>}</p><p className="text-xs text-white/60 mt-1">{isBirthdayMonth(fullCurrentCustomer.birthday) ? (lang==='zh'?'🎂 生日月份 享額外積分！':'🎂 Birthday month extra points!') : (fullCurrentCustomer.birthday ? `${lang==='zh'?'生日':'Birthday'}: ${fullCurrentCustomer.birthday}` : '')}</p></div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                          <h4 className="font-bold text-sm mb-4">{lang==='zh'?'最近訂單':'Recent Orders'}</h4>
                          {data.orders.filter(o=>o.customerId===fullCurrentCustomer.id).slice(0,3).map(order=>(
                            <div key={order.id} className="flex items-center justify-between py-3 border-b last:border-0 text-sm"><div><p className="font-bold">{order.id}</p><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()} • {formatPrice(order.total)}</p></div><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${order.fulfillmentStatus==='fulfilled'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{order.fulfillmentStatus}</span></div>
                          ))}
                          {data.orders.filter(o=>o.customerId===fullCurrentCustomer.id).length===0 && <p className="text-xs text-gray-500">{lang==='zh'?'暫無訂單':'No orders yet'}</p>}
                        </div>
                        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 flex items-center justify-between">
                          <div><p className="font-bold text-sm">{lang==='zh'?'您的推薦碼':'Your Referral Code'}</p><p className="text-2xl font-black tracking-widest mt-1">{fullCurrentCustomer.referralCode}</p><p className="text-xs text-gray-600 mt-1">{lang==='zh'?'分享給朋友，雙方獲積分獎勵':'Share with friends, both earn points'}</p></div>
                          <button onClick={()=>{navigator.clipboard.writeText(fullCurrentCustomer.referralCode); alert(lang==='zh'?'已複製':'Copied');}} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center gap-1"><Copy size={12}/>{lang==='zh'?'複製':'Copy'}</button>
                        </div>
                      </div>
                    )}
                    {accountTab==='orders' && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h4 className="font-bold">{lang==='zh'?'我的訂單':'My Orders'}</h4>
                        <div className="space-y-3">
                          {data.orders.filter(o=>o.customerId===fullCurrentCustomer.id).map(order=>(
                            <div key={order.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between"><span className="font-bold text-sm">{order.id}</span><span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span></div>
                              <div className="text-xs text-gray-600 space-y-1">{order.items.map((it,i)=><div key={i} className="flex justify-between"><span>{t(it.title)} x{it.qty}</span><span>{formatPrice(it.price*it.qty)}</span></div>)}</div>
                              <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total</span><span>{formatPrice(order.total)}</span></div>
                              <div className="flex gap-2 text-[11px]"><span className="px-2 py-0.5 rounded-full bg-gray-100">{order.paymentMethod}</span><span className={`px-2 py-0.5 rounded-full ${order.paymentStatus==='paid'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{order.paymentStatus}</span><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{order.fulfillmentStatus}</span></div>
                              {order.gwpEligible && <div className="text-xs text-primary font-bold flex items-center gap-1"><Gift size={12}/>{lang==='zh'?'已獲贈禮品':'GWP Eligible'}: {t(order.gwpDetail?.title)}</div>}
                            </div>
                          ))}
                          {data.orders.filter(o=>o.customerId===fullCurrentCustomer.id).length===0 && <p className="text-sm text-gray-500">{lang==='zh'?'暫無訂單，去選購吧！':'No orders, go shopping!'}</p>}
                        </div>
                      </div>
                    )}
                    {accountTab==='points' && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-6"><h4 className="font-bold">{lang==='zh'?'積分明細':'Points History'}</h4><p className="text-3xl font-black mt-3">{fullCurrentCustomer.points}</p><p className="text-xs text-gray-500 mt-1">{lang==='zh'?'積分有效期12個月':'Points expire in 12 months'}</p>
                          <div className="mt-6 space-y-2 text-sm">
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>{lang==='zh'?'類型':'Type'}</span><span>{lang==='zh'?'積分':'Points'}</span><span>{lang==='zh'?'日期':'Date'}</span></div>
                            {data.orders.filter(o=>o.customerId===fullCurrentCustomer.id).map(o=><div key={o.id} className="flex justify-between py-2 border-b last:border-0 text-xs"><span>{lang==='zh'?'購物獲得':'Purchase'} {o.id}</span><span className="text-green-600 font-bold">+{o.pointsEarned}</span><span className="text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</span></div>)}
                          </div>
                        </div>
                        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-sm"><p className="font-bold text-amber-800">{lang==='zh'?'積分兌換將於每年1月及7月通過電郵通知':'Redemption notified via email Jan & July'}</p><p className="text-xs text-amber-700/80 mt-1">{lang==='zh'?'同一商品最多同時兌換2件，數量有限先到先得':'Max 2 same items redeem at once, first come first serve'}</p></div>
                      </div>
                    )}
                    {accountTab==='membership' && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h4 className="font-bold flex items-center gap-2"><Crown size={16} className="text-amber-500"/>{lang==='zh'?'會員權益':'Membership Benefits'}</h4>
                        {customerTier ? (
                          <div className="space-y-3">
                            <p className="text-sm">{lang==='zh'?`您是尊貴的 ${t(customerTier.name)} 會員`:`You are a valued ${t(customerTier.name)} member`}</p>
                            <ul className="space-y-2">{(customerTier.benefits?.[lang]||customerTier.benefits?.en||[]).map((b,i)=><li key={i} className="flex gap-2 text-sm"><CheckCircle size={14} className="text-green-500 mt-0.5"/>{b}</li>)}</ul>
                            <div className="pt-4 border-t">
                              <p className="text-xs font-bold uppercase text-gray-500">{lang==='zh'?'升級進度':'Upgrade Progress'}</p>
                              {customerTier.id==='classic' ? (
                                <div className="mt-2"><div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gray-900" style={{width:`${Math.min(100, ((fullCurrentCustomer.totalSpent||0)/8000)*100)}%`}}></div></div><p className="text-xs text-gray-600 mt-1">{formatPrice(fullCurrentCustomer.totalSpent||0)} / {formatPrice(8000)} {lang==='zh'?'升級至尊尚':'to Signature'}</p></div>
                              ) : <p className="text-sm text-gray-600 mt-2">{lang==='zh'?'您已是最高等級會員，感謝支持！':'You are at highest tier, thank you!'}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-3"><p className="text-sm text-gray-600">{lang==='zh'?`累積消費滿 $${data.settings.membership?.tiers?.[0]?.minSpendToEnroll} 即可成為經典會員`:`Spend $${data.settings.membership?.tiers?.[0]?.minSpendToEnroll} to become Classic member`}</p><button onClick={()=>switchTab('shop')} className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm">{lang==='zh'?'去購物':'Go Shopping'}</button></div>
                        )}
                      </div>
                    )}
                    {accountTab==='referral' && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h4 className="font-bold">{lang==='zh'?'推薦獎勵':'Referral Rewards'}</h4>
                        <div className="rounded-2xl bg-gray-900 text-white p-5 flex items-center justify-between"><div><p className="text-xs text-white/60 uppercase font-bold">Your Code</p><p className="text-2xl font-black tracking-widest mt-1">{fullCurrentCustomer.referralCode}</p></div><button onClick={()=>{navigator.clipboard.writeText(fullCurrentCustomer.referralCode); alert('Copied');}} className="px-4 py-2 rounded-xl bg-white text-gray-900 text-xs font-bold"><Copy size={12} className="inline mr-1"/>{lang==='zh'?'複製':'Copy'}</button></div>
                        <div className="text-sm space-y-2">
                          <p>{lang==='zh'?'分享您的推薦碼給朋友：':'Share your referral code:'}</p>
                          <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1"><li>{lang==='zh'?'經典會員推薦新經典會員 +50分，推薦新尊尚 +80分':'Classic refers Classic +50, Signature +80'}</li><li>{lang==='zh'?'尊尚會員推薦新經典 +100分，推薦新尊尚 +150分':'Signature refers Classic +100, Signature +150'}</li><li>{lang==='zh'?'需滿3個月會籍方可獲得推薦獎勵':'Requires 3 months membership for bonus'}</li></ul>
                          <p className="pt-3 font-bold">{lang==='zh'?'您推薦的朋友：':'Friends you referred:'}</p>
                          <div className="space-y-2">{data.customers.filter(c=>c.referredBy===fullCurrentCustomer.referralCode).map(c=><div key={c.id} className="flex items-center justify-between text-xs border rounded-xl p-3"><span>{c.name} ({c.email}) - {t(data.settings.membership?.tiers?.find(t=>t.id===c.tier)?.name)||c.tier||'None'}</span><span className="text-gray-500">{c.joinedAt}</span></div>)}{data.customers.filter(c=>c.referredBy===fullCurrentCustomer.referralCode).length===0 && <p className="text-xs text-gray-500">{lang==='zh'?'暫無推薦':'No referrals yet'}</p>}</div>
                        </div>
                      </div>
                    )}
                    {accountTab==='addresses' && <div className="bg-white rounded-2xl border border-gray-100 p-6"><h4 className="font-bold mb-4">{lang==='zh'?'收貨地址':'Addresses'}</h4><p className="text-xs text-gray-500">{lang==='zh'?'功能開發中，下單時填寫地址即可保存':'Feature in development, address saved at checkout'}</p></div>}
                    {accountTab==='wishlist' && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <h4 className="font-bold mb-4">{lang==='zh'?'我的收藏':'My Wishlist'} ({wishlistCount})</h4>
                        {wishlist.length===0 ? <p className="text-sm text-gray-500">{lang==='zh'?'暫無收藏':'No wishlist'}</p> : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{wishlist.map(pid=>{const p=data.products.find(pp=>pp.id===pid); if(!p) return null; return <div key={pid} className="border rounded-xl p-3 flex flex-col"><img src={p.images[0]} className="aspect-square object-cover rounded-lg"/><p className="font-bold text-sm mt-2 line-clamp-1">{t(p.title)}</p><p className="text-xs text-gray-500">{formatPrice(p.price)}</p><div className="mt-2 flex gap-1.5"><button onClick={()=>addToCart(p.id,null,1)} className="flex-1 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold">{lang==='zh'?'加入購物車':'Add to Cart'}</button><button onClick={()=>toggleWishlist(pid)} className="px-2 py-1.5 rounded-lg border text-xs"><Trash2 size={12}/></button></div></div>;})}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHECKOUT */}
          {activeTab==='checkout' && (
            <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in grid lg:grid-cols-[1fr_380px] gap-8">
              <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-6">
                <h2 className="text-2xl font-black flex items-center gap-2"><ShoppingBag size={20}/>{lang==='zh'?'結帳':'Checkout'}</h2>
                <div className="flex items-center gap-2 text-xs">
                  {[1,2,3].map(step=><div key={step} className="flex items-center gap-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${checkoutStep>=step?'bg-gray-900 text-white':'bg-gray-100 text-gray-400'}`}>{step}</div>{step<3 && <div className={`w-8 h-0.5 ${checkoutStep>step?'bg-gray-900':'bg-gray-200'}`}></div>}</div>)}
                  <span className="ml-2 text-gray-500">{checkoutStep===1?(lang==='zh'?'收貨資訊':'Shipping') : checkoutStep===2?(lang==='zh'?'配送與付款':'Delivery & Payment') : (lang==='zh'?'確認訂單':'Review')}</span>
                </div>

                {checkoutStep===1 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'收件人 *':'Name *'}</label><input value={checkoutForm.name} onChange={e=>setCheckoutForm({...checkoutForm, name:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'電話 *':'Phone *'}</label><input value={checkoutForm.phone} onChange={e=>setCheckoutForm({...checkoutForm, phone:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">Email *</label><input value={checkoutForm.email} onChange={e=>setCheckoutForm({...checkoutForm, email:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">{lang==='zh'?'地址 *':'Address *'}</label><input value={checkoutForm.address} onChange={e=>setCheckoutForm({...checkoutForm, address:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'城市 *':'City *'}</label><input value={checkoutForm.city} onChange={e=>setCheckoutForm({...checkoutForm, city:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                      <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'備註':'Notes'}</label><input value={checkoutForm.notes} onChange={e=>setCheckoutForm({...checkoutForm, notes:e.target.value})} placeholder={lang==='zh'?'選填':'Optional'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                    </div>
                    <button onClick={()=>setCheckoutStep(2)} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm">{lang==='zh'?'下一步 配送與付款':'Next: Delivery & Payment'} <ArrowRight size={14} className="inline ml-1"/></button>
                  </div>
                )}
                {checkoutStep===2 && (
                  <div className="space-y-6">
                    <div><h4 className="font-bold text-sm mb-3">{lang==='zh'?'配送方式':'Shipping Method'}</h4><div className="space-y-2"><label className="flex items-center justify-between p-3 rounded-xl border border-primary bg-primary/5 cursor-pointer"><span className="flex items-center gap-2"><Truck size={16}/><span className="text-sm font-medium">{shippingCost===0?(lang==='zh'?'免運費 (已達門檻)':'Free Shipping (threshold met)'):(lang==='zh'?`標準配送 HK$${shippingCost}`:`Standard Shipping HK$${shippingCost}`)}</span></span><input type="radio" checked readOnly className="accent-primary"/></label><p className="text-xs text-gray-500">{lang==='zh'?`滿 HK$${data.settings.shipping?.freeThreshold} 免運費`:`Free shipping over HK$${data.settings.shipping?.freeThreshold}`}</p></div></div>
                    <div><h4 className="font-bold text-sm mb-3">{lang==='zh'?'付款方式':'Payment Method'}</h4><div className="space-y-2">
                      {[
                        {id:'credit_card', label: lang==='zh'?'信用卡':'Credit Card', icon: CreditCard},
                        {id:'paypal', label:'PayPal', icon: Globe},
                        {id:'fps', label: lang==='zh'?'轉數快 FPS':'FPS', icon: Zap},
                      ].map(m=><label key={m.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${checkoutForm.paymentMethod===m.id?'border-primary bg-primary/5':'border-gray-200 bg-white'}`}><span className="flex items-center gap-2"><m.icon size={16}/><span className="text-sm font-medium">{m.label}</span></span><input type="radio" name="payment" checked={checkoutForm.paymentMethod===m.id} onChange={()=>setCheckoutForm({...checkoutForm, paymentMethod:m.id})} className="accent-primary"/></label>)}
                    </div></div>
                    <div className="flex gap-2"><button onClick={()=>setCheckoutStep(1)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm">{lang==='zh'?'上一步':'Back'}</button><button onClick={()=>setCheckoutStep(3)} className="flex-[2] py-3 rounded-xl bg-gray-900 text-white font-bold text-sm">{lang==='zh'?'下一步 確認訂單':'Next: Review Order'}</button></div>
                  </div>
                )}
                {checkoutStep===3 && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm">{lang==='zh'?'確認訂單資訊':'Review Order'}</h4>
                    <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-1"><p><span className="font-bold">{lang==='zh'?'收件人':'Name'}:</span> {checkoutForm.name} | {checkoutForm.phone}</p><p><span className="font-bold">{lang==='zh'?'地址':'Address'}:</span> {checkoutForm.address}, {checkoutForm.city}</p><p><span className="font-bold">Email:</span> {checkoutForm.email}</p><p><span className="font-bold">{lang==='zh'?'付款':'Payment'}:</span> {checkoutForm.paymentMethod}</p></div>
                    <div className="flex gap-2"><button onClick={()=>setCheckoutStep(2)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm">{lang==='zh'?'上一步':'Back'}</button><button onClick={handleCheckout} className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"><CheckCircle size={16}/>{lang==='zh'?'確認下單':'Place Order'}</button></div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 p-6 h-fit space-y-4">
                <h4 className="font-bold text-sm">{lang==='zh'?'訂單摘要':'Order Summary'} ({cartCount})</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((ci, idx)=>{
                    const prod=data.products.find(p=>p.id===ci.productId);
                    if(!prod) return null;
                    let price=prod.price; let title=t(prod.title);
                    if(ci.variantId){ const v=prod.variants?.find(v=>v.id===ci.variantId); if(v){ price=v.price; title=`${t(prod.title)} - ${t(v.name)}`; } }
                    return <div key={idx} className="flex gap-3 text-xs"><img src={prod.images[0]} className="w-12 h-12 rounded-lg object-cover border"/><div className="flex-1"><p className="font-bold line-clamp-1">{title}</p><p className="text-gray-500">x{ci.qty} • {formatPrice(price)}</p></div><span className="font-bold">{formatPrice(price*ci.qty)}</span></div>;
                  })}
                </div>
                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{lang==='zh'?'小計':'Subtotal'}</span><span className="font-bold">{formatPrice(cartSubtotal)}</span></div>
                  {appliedCoupon && <div className="flex justify-between text-green-600"><span className="flex items-center gap-1"><Tag size={12}/>{appliedCoupon.code}</span><span>-{formatPrice(discountAmount)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">{lang==='zh'?'運費':'Shipping'}</span><span className={shippingCost===0?'text-green-600 font-bold':''}>{shippingCost===0?(lang==='zh'?'免運費':'Free'):formatPrice(shippingCost)}</span></div>
                  <div className="flex justify-between font-black text-base pt-2 border-t"><span>Total</span><span>{formatPrice(cartTotal)}</span></div>
                  {gwpEligible && <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 text-xs flex gap-2"><Gift size={14} className="text-primary shrink-0 mt-0.5"/><div><p className="font-bold text-primary">{lang==='zh'?'已符合滿贈禮遇！':'GWP Eligible!'}</p><p className="text-gray-700">{t(gwpEligible.title)}</p></div></div>}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs flex gap-2"><Award size={14} className="text-amber-600 shrink-0 mt-0.5"/><div><p className="font-bold text-amber-800">{lang==='zh'?`此單可獲 ${pointsEarnedPreview} 積分`:`Earn ${pointsEarnedPreview} points`}</p><p className="text-amber-700/80">{fullCurrentCustomer ? (isBirthdayMonth(fullCurrentCustomer.birthday)? (lang==='zh'?'🎂 生日月份享額外積分！':'🎂 Birthday month extra points!') : '') : (lang==='zh'?'登入會員享積分獎勵':'Login to earn points')}</p></div></div>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN */}
          {activeTab==='admin' && (
            <div className="min-h-[70vh] max-w-[1600px] mx-auto px-2 sm:px-4 py-6">
              {!isAdminLoggedIn ? (
                <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 p-8 space-y-6 shadow-sm mt-10">
                  <div className="text-center space-y-2"><div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto"><Shield size={28}/></div><h2 className="text-2xl font-black">{lang==='zh'?'管理員登入':'Admin Login'}</h2><p className="text-xs text-gray-500">{lang==='zh'?'請輸入管理密碼以進入後台':'Enter admin password'}</p></div>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'管理密碼':'Admin Password'}</label><input type="password" value={adminPasswordInput} onChange={e=>setAdminPasswordInput(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="••••••••"/></div>
                    {adminLoginError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{adminLoginError}</div>}
                    <button type="submit" className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors">{lang==='zh'?'登入後台':'Login to Admin'}</button>
                  </form>
                </div>
              ) : (
                <div className="grid lg:grid-cols-[220px_1fr] gap-4">
                  {/* Admin sidebar */}
                  <aside className="bg-white rounded-2xl border border-gray-200 p-2 h-fit lg:sticky lg:top-[88px] space-y-1">
                    <div className="px-3 py-2 flex items-center justify-between"><span className="font-black text-sm">{ta('adminPanel')}</span><button onClick={handleAdminLogout} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"><LogOut size={14}/></button></div>
                    {[
                      { id:'dashboard', icon: LayoutGrid, label: ta('dashboard') },
                      { id:'appearance', icon: SettingsIcon, label: ta('appearance') },
                      { id:'settings', icon: SettingsIcon, label: ta('generalSettings') },
                      { id:'banners', icon: ImageIcon, label: ta('banners') },
                      { id:'categories', icon: Layers, label: ta('categories') },
                      { id:'products', icon: Package, label: ta('products') },
                      { id:'bundles', icon: Gift, label: ta('bundles') },
                      { id:'coupons', icon: Tag, label: ta('coupons') },
                      { id:'gwp', icon: Gift, label: ta('gwp') },
                      { id:'orders', icon: ShoppingBag, label: ta('orders') },
                      { id:'customers', icon: Users, label: ta('customers') },
                      { id:'membership', icon: Crown, label: ta('membership') },
                      { id:'reviews', icon: Star, label: ta('reviews') },
                      { id:'media', icon: Camera, label: ta('media') },
                      { id:'backup', icon: Download, label: ta('backup') },
                    ].map(item=>(
                      <button key={item.id} onClick={()=>{ setAdminActiveSection(item.id); if(item.id==='backup') requestBackupAccess(); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${adminActiveSection===item.id?'bg-gray-900 text-white font-bold':'text-gray-600 hover:bg-gray-50'}`}><item.icon size={14}/>{item.label}</button>
                    ))}
                    {adminSuccessMessage && <div className="mt-3 p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold flex items-center gap-1.5"><CheckCircle size={12}/>{adminSuccessMessage}</div>}
                    {autoSaveStatus && <div className={`mt-2 p-2 rounded-lg text-[11px] ${autoSaveStatus==='saving'?'bg-blue-50 text-blue-700 border border-blue-200':autoSaveStatus==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{autoSaveMessage}</div>}
                  </aside>

                  {/* Admin content */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-6 min-h-[70vh]">
                    {/* Dashboard */}
                    {adminActiveSection==='dashboard' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{ta('dashboard')}</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: ta('totalProducts'), value: data.products.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
                            { label: ta('totalOrders'), value: data.orders.length, icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600' },
                            { label: ta('totalCustomers'), value: data.customers.length, icon: Users, color: 'bg-violet-50 text-violet-600' },
                            { label: ta('totalRevenue'), value: formatPrice(data.orders.reduce((s,o)=>s+o.total,0)), icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
                          ].map((k,i)=><div key={i} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${k.color} flex items-center justify-center`}><k.icon size={18}/></div><div><p className="text-[11px] text-gray-500 uppercase font-bold">{k.label}</p><p className="font-black text-lg">{k.value}</p></div></div>)}
                        </div>
                        <div className="grid lg:grid-cols-2 gap-6">
                          <div className="rounded-2xl border border-gray-100 p-4"><h4 className="font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500"/>{ta('lowStock')}</h4><div className="space-y-2">{data.products.filter(p=>p.stock<=p.lowStockThreshold).slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between text-xs border-b last:border-0 py-2"><span>{t(p.title)} ({p.sku})</span><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold">{p.stock} left</span></div>)}{data.products.filter(p=>p.stock<=p.lowStockThreshold).length===0 && <p className="text-xs text-gray-500">{lang==='zh'?'暫無低庫存':'No low stock'}</p>}</div></div>
                          <div className="rounded-2xl border border-gray-100 p-4"><h4 className="font-bold text-sm mb-3">{ta('recentOrders')}</h4><div className="space-y-2">{data.orders.slice(0,5).map(o=><div key={o.id} className="flex items-center justify-between text-xs border-b last:border-0 py-2"><div><p className="font-bold">{o.id}</p><p className="text-gray-500">{new Date(o.createdAt).toLocaleDateString()} • {formatPrice(o.total)}</p></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.fulfillmentStatus==='fulfilled'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{o.fulfillmentStatus}</span></div>)}</div></div>
                        </div>
                      </div>
                    )}

                    {/* Appearance - Fixed Chinese font & color palette */}
                    {adminActiveSection==='appearance' && (
                      <div className="space-y-8">
                        <div><h2 className="text-xl font-black">{ta('appearance')}</h2><p className="text-xs text-gray-500 mt-1">{lang==='zh'?'自訂品牌配色、字體、文字大小 - 修復中文字體與調色板靈活性':'Customize brand colors, fonts, text scale - Fixed Chinese fonts & palette flexibility'}</p></div>

                        {/* Theme Colors - Flexible palette */}
                        <div className="space-y-4 border-b pb-8">
                          <h3 className="font-bold text-sm flex items-center gap-2"><SettingsIcon size={14}/>{ta('theme')}</h3>
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-2 block">{ta('colorPresets')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Object.entries(colorsMap).map(([key, col])=>(
                                <button key={key} onClick={()=>updateSetting('themeColor',null,key)} className={`p-3 rounded-xl border text-left transition-all ${data.settings.themeColor===key?'border-gray-900 bg-gray-900 text-white':'border-gray-200 bg-white hover:border-gray-300'}`}>
                                  <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{backgroundColor:`rgb(${col.primary})`}}></div><span className="text-xs font-bold">{col.name}</span></div>
                                  <div className="mt-2 flex gap-1">{[col.primary, col.secondary||col.primary, col.accent||col.primary].map((c,i)=><div key={i} className="w-4 h-4 rounded-full border border-white/50" style={{backgroundColor:`rgb(${c})`}}></div>)}</div>
                                </button>
                              ))}
                              <button onClick={()=>updateSetting('themeColor',null,'custom')} className={`p-3 rounded-xl border-2 border-dashed text-left ${data.settings.themeColor==='custom'?'border-gray-900 bg-gray-900 text-white':'border-gray-300 bg-white hover:border-gray-400'}`}><span className="text-xs font-bold">{lang==='zh'?'自訂顏色 🎨':'Custom 🎨'}</span><p className="text-[10px] mt-1 opacity-70">{lang==='zh'?'使用調色板自由選擇':'Use palette picker'}</p></button>
                            </div>
                          </div>

                          {data.settings.themeColor==='custom' && (
                            <div className="space-y-4 bg-gray-50 rounded-2xl p-5 border">
                              <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2"><span>{ta('customPalette')}</span><span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">{lang==='zh'?'靈活取色':'Flexible'}</span></h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                  { key:'primary', label: ta('primary'), desc: lang==='zh'?'主按鈕、連結':'Main buttons & links' },
                                  { key:'secondary', label: ta('secondary'), desc: lang==='zh'?'次要元素':'Secondary elements' },
                                  { key:'accent', label: ta('accent'), desc: lang==='zh'?'強調、標籤':'Highlights & badges' },
                                  { key:'background', label: ta('background'), desc: lang==='zh'?'頁面背景':'Page background' },
                                ].map(field=>(
                                  <div key={field.key} className="bg-white rounded-xl border p-3 space-y-2">
                                    <div className="flex items-center justify-between"><div><p className="text-xs font-bold">{field.label}</p><p className="text-[10px] text-gray-500">{field.desc}</p></div><span className="text-[10px] font-mono text-gray-500">{data.settings.customPalette?.[field.key]||''}</span></div>
                                    <div className="flex items-center gap-2">
                                      <input type="color" value={data.settings.customPalette?.[field.key]||'#d4a5a5'} onChange={e=>{ const updated={...data}; if(!updated.settings.customPalette) updated.settings.customPalette={}; updated.settings.customPalette[field.key]=e.target.value; saveAllData(updated); }} />
                                      <input type="text" value={data.settings.customPalette?.[field.key]||'#d4a5a5'} onChange={e=>{ const updated={...data}; if(!updated.settings.customPalette) updated.settings.customPalette={}; updated.settings.customPalette[field.key]=e.target.value; saveAllData(updated); }} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono" placeholder="#d4a5a5"/>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <div className="flex gap-1">{Object.entries(data.settings.customPalette||{}).map(([k,v])=><div key={k} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{backgroundColor:v}} title={`${k}: ${v}`}></div>)}</div>
                                <span className="text-xs text-gray-500">{lang==='zh'?'即時預覽生效':'Live preview active'}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">{lang==='zh'?'自訂主色 Hex':'Custom Primary Hex'}</label><div className="flex gap-2"><input type="color" value={data.settings.customThemeColor||'#d4a5a5'} onChange={e=>updateSetting('customThemeColor',null,e.target.value)}/><input type="text" value={data.settings.customThemeColor||'#d4a5a5'} onChange={e=>updateSetting('customThemeColor',null,e.target.value)} className="flex-1 px-2 py-1.5 rounded border text-xs font-mono"/></div></div>
                                <div><label className="text-[11px] font-bold text-gray-700 mb-1 block">{lang==='zh'?'快速選色':'Quick Colors'}</label><div className="flex gap-1 flex-wrap">{['#d4a5a5','#a8c3b0','#e8c9a0','#3c70b4','#f472b6','#84cc16','#06b6d4','#f59e0b'].map(hex=><button key={hex} onClick={()=>{ const u={...data}; if(!u.settings.customPalette) u.settings.customPalette={}; u.settings.customPalette.primary=hex; u.settings.customThemeColor=hex; saveAllData(u); }} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{backgroundColor:hex}}></button>)}</div></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text scale */}
                        <div className="space-y-3 border-b pb-8">
                          <label className="font-bold text-sm flex items-center justify-between"><span>{ta('textScale')}</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{data.settings.textScale}%</span></label>
                          <input type="range" min={80} max={140} step={5} value={data.settings.textScale} onChange={e=>updateSetting('textScale',null, parseInt(e.target.value))} className="w-full accent-primary"/>
                          <div className="flex justify-between text-[10px] text-gray-400"><span>80% Small</span><span>100% Default</span><span>140% Large</span></div>
                        </div>

                        {/* Fonts - Fixed Chinese fonts */}
                        <div className="space-y-6">
                          <h3 className="font-bold text-sm flex items-center gap-2"><Globe size={14}/>{ta('fonts')} <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{lang==='zh'?'已修復中文字體':'Fixed Chinese Fonts'}</span></h3>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">{ta('zhFont')} <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{fontFamilyOptions.zh.length} {lang==='zh'?'種':'fonts'}</span></label>
                              <select value={data.settings.fontFamilyZh} onChange={e=>updateSetting('fontFamilyZh',null,e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-primary outline-none">
                                {fontFamilyOptions.zh.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                              </select>
                              <div className="bg-gray-50 rounded-xl p-3 border">
                                <p className="text-[11px] text-gray-500 mb-1">{lang==='zh'?'預覽':'Preview'}:</p>
                                <p style={{fontFamily: getFontFamily('zh', data.settings.fontFamilyZh)}} className="text-sm font-medium">為敏感肌而生的溫和醫研修護 CS12 奇蹟面膜 123 ABC</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">{ta('enFont')} <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full">{fontFamilyOptions.en.length} fonts</span></label>
                              <select value={data.settings.fontFamilyEn} onChange={e=>updateSetting('fontFamilyEn',null,e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-primary outline-none">
                                {fontFamilyOptions.en.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                              </select>
                              <div className="bg-gray-50 rounded-xl p-3 border">
                                <p className="text-[11px] text-gray-500 mb-1">Preview:</p>
                                <p style={{fontFamily: getFontFamily('en', data.settings.fontFamilyEn)}} className="text-sm font-medium">Gentle Clinical Repair for Sensitive Skin CS12 Miracle Mask 123</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                            <p className="font-bold flex items-center gap-1"><Info size={12}/>{lang==='zh'?'字體修復說明':'Font Fix Notes'}</p>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                              <li>{lang==='zh'?'已新增 11 種中文字體，包括思源黑體繁/簡、思源宋體、手寫、文藝、書法等':'Added 11 Chinese fonts including Noto Sans/Serif TC/SC, handwriting, artistic, calligraphy'}</li>
                              <li>{lang==='zh'?'中英文可獨立設置，自動根據語言切換顯示':'Chinese and English can be set independently, auto-switch by language'}</li>
                              <li>{lang==='zh'?'所有字體來自 Google Fonts，支援繁簡中文與英文':'All fonts from Google Fonts, support Traditional/Simplified Chinese & English'}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Settings */}
                    {adminActiveSection==='settings' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{ta('generalSettings')}</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{ta('siteName')} (中文)</label><input value={data.settings.siteName?.zh||''} onChange={e=>updateNestedSetting('siteName.zh', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{ta('siteName')} (EN)</label><input value={data.settings.siteName?.en||''} onChange={e=>updateNestedSetting('siteName.en', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div className="md:col-span-2"><label className="text-xs font-bold text-gray-700 mb-1 block">{ta('logo')} URL</label><MediaUrlField value={data.settings.headerLogo} onChange={v=>updateSetting('headerLogo',null,v)} label={ta('imageUrl')}/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'聯繫電話':'Phone'}</label><input value={data.settings.contactPhone||''} onChange={e=>updateSetting('contactPhone',null,e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">Email</label><input value={data.settings.contactEmail||''} onChange={e=>updateSetting('contactEmail',null,e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{ta('freeShippingThreshold')}</label><input type="number" value={data.settings.shipping?.freeThreshold||0} onChange={e=>updateNestedSetting('shipping.freeThreshold', parseInt(e.target.value)||0)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{ta('flatRate')}</label><input type="number" value={data.settings.shipping?.flatRate||0} onChange={e=>updateNestedSetting('shipping.flatRate', parseInt(e.target.value)||0)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'貨幣匯率 HKD→USD':'Exchange Rate HKD→USD'}</label><input type="number" step="0.001" value={data.settings.currencies?.exchangeRate||0.128} onChange={e=>updateNestedSetting('currencies.exchangeRate', parseFloat(e.target.value)||0.128)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-primary outline-none"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'首單優惠碼':'First Order Code'}</label><input value={data.settings.firstOrder?.code||''} onChange={e=>updateNestedSetting('firstOrder.code', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'首單折扣%':'First Order Discount %'}</label><input type="number" value={data.settings.firstOrder?.discountValue||0} onChange={e=>updateNestedSetting('firstOrder.discountValue', parseInt(e.target.value)||0)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"/></div>
                          <div><label className="text-xs font-bold text-gray-700 mb-1 block">{lang==='zh'?'首單最低消費':'First Order Min Spend'}</label><input type="number" value={data.settings.firstOrder?.minSpend||0} onChange={e=>updateNestedSetting('firstOrder.minSpend', parseInt(e.target.value)||0)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"/></div>
                        </div>
                      </div>
                    )}

                    {/* Banners */}
                    {adminActiveSection==='banners' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('banners')}</h2><button onClick={()=>setEditingBanner({id:'new', image:'', title:{zh:'新橫幅',en:'New Banner'}, subtitle:{zh:'副標題',en:'Subtitle'}, ctaText:{zh:'立即選購',en:'Shop Now'}, ctaLink:'shop', active:true})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('add')}</button></div>
                        {editingBanner ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <h4 className="font-bold text-xs uppercase">{editingBanner.id==='new'?ta('add'):ta('edit')} Banner</h4>
                            <MediaUrlField value={editingBanner.image} onChange={v=>setEditingBanner({...editingBanner, image:v})} label={ta('imageUrl')}/>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleZh')}</label><input value={editingBanner.title.zh} onChange={e=>setEditingBanner({...editingBanner, title:{...editingBanner.title, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleEn')}</label><input value={editingBanner.title.en} onChange={e=>setEditingBanner({...editingBanner, title:{...editingBanner.title, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('descZh')}</label><input value={editingBanner.subtitle.zh} onChange={e=>setEditingBanner({...editingBanner, subtitle:{...editingBanner.subtitle, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('descEn')}</label><input value={editingBanner.subtitle.en} onChange={e=>setEditingBanner({...editingBanner, subtitle:{...editingBanner.subtitle, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">CTA Link (shop / product-1)</label><input value={editingBanner.ctaLink} onChange={e=>setEditingBanner({...editingBanner, ctaLink:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="flex items-center gap-2 pt-5"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingBanner.active} onChange={e=>setEditingBanner({...editingBanner, active:e.target.checked})}/>{ta('active')}</label></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingBanner(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveBanner(editingBanner)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-3">{data.carousel.map((b, idx)=><div key={b.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><img src={b.image} className="w-20 h-12 object-cover rounded-lg"/><div className="flex-1"><p className="font-bold text-xs">{t(b.title)}</p><p className="text-[11px] text-gray-500">{t(b.subtitle)}</p></div><div className="flex gap-1"><button onClick={()=>handleMoveItem('carousel', idx, 'up')} disabled={idx===0} className="p-1.5 rounded border disabled:opacity-30"><ArrowUp size={12}/></button><button onClick={()=>handleMoveItem('carousel', idx, 'down')} disabled={idx===data.carousel.length-1} className="p-1.5 rounded border disabled:opacity-30"><ArrowDown size={12}/></button><button onClick={()=>setEditingBanner(b)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteBanner(b.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {/* Categories */}
                    {adminActiveSection==='categories' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('categories')}</h2><button onClick={()=>setEditingCategory({id:'new', name:{zh:'新分類',en:'New Category'}, slug:'new-cat', type:'series', description:{zh:'描述',en:'Description'}, image:'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80', sortOrder:99, active:true})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('addCategory')}</button></div>
                        {editingCategory ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('nameZh')}</label><input value={editingCategory.name.zh} onChange={e=>setEditingCategory({...editingCategory, name:{...editingCategory.name, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('nameEn')}</label><input value={editingCategory.name.en} onChange={e=>setEditingCategory({...editingCategory, name:{...editingCategory.name, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">Slug</label><input value={editingCategory.slug} onChange={e=>setEditingCategory({...editingCategory, slug:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">Type (series/faceCare/skinType)</label><select value={editingCategory.type} onChange={e=>setEditingCategory({...editingCategory, type:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"><option value="series">series</option><option value="faceCare">faceCare</option><option value="skinType">skinType</option></select></div>
                              <div className="md:col-span-2"><MediaUrlField value={editingCategory.image} onChange={v=>setEditingCategory({...editingCategory, image:v})} label={ta('imageUrl')}/></div>
                              <div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingCategory.active} onChange={e=>setEditingCategory({...editingCategory, active:e.target.checked})}/>{ta('active')}</label></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingCategory(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveCategory(editingCategory)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2">{data.categories.map((c,i)=><div key={c.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><img src={c.image} className="w-12 h-12 rounded-lg object-cover"/><div className="flex-1"><p className="font-bold text-xs">{t(c.name)} • <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-full">{c.type}</span></p><p className="text-[11px] text-gray-500">{c.slug}</p></div><div className="flex gap-1"><button onClick={()=>handleMoveItem('categories', i, 'up')} disabled={i===0} className="p-1.5 rounded border disabled:opacity-30"><ArrowUp size={12}/></button><button onClick={()=>handleMoveItem('categories', i, 'down')} disabled={i===data.categories.length-1} className="p-1.5 rounded border disabled:opacity-30"><ArrowDown size={12}/></button><button onClick={()=>setEditingCategory(c)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteCategory(c.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {/* Products */}
                    {adminActiveSection==='products' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">{ta('products')}</h2><p className="text-xs text-gray-500">{data.products.length} products, {data.products.filter(p=>p.stock<=p.lowStockThreshold).length} low stock</p></div><button onClick={()=>setEditingProduct({id:'new', sku:'NEW-SKU', title:{zh:'新產品',en:'New Product'}, subtitle:{zh:'',en:''}, description:{zh:'描述',en:'Description'}, shortDesc:{zh:'',en:''}, categoryIds:[], tags:[], price:99, compareAtPrice:129, cost:30, stock:100, lowStockThreshold:10, images:['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80'], ingredients:{zh:'',en:''}, howToUse:{zh:'',en:''}, benefits:{zh:[],en:[]}, isBestseller:false, isFeatured:false, rating:5, reviewCount:0, variants:[], active:true, createdAt:new Date().toISOString().slice(0,10)})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('addProduct')}</button></div>

                        <div className="flex gap-2"><input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder={ta('search')+' SKU, title...'} className="flex-1 px-3 py-2 rounded-xl border text-xs"/><select className="px-3 py-2 rounded-xl border text-xs"><option>All</option></select></div>

                        {editingProduct ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4 max-h-[80vh] overflow-y-auto">
                            <h4 className="font-bold text-xs uppercase">{editingProduct.id==='new'?ta('addProduct'):ta('edit')} - {editingProduct.sku}</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleZh')}</label><input value={editingProduct.title.zh} onChange={e=>setEditingProduct({...editingProduct, title:{...editingProduct.title, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleEn')}</label><input value={editingProduct.title.en} onChange={e=>setEditingProduct({...editingProduct, title:{...editingProduct.title, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">SKU</label><input value={editingProduct.sku} onChange={e=>setEditingProduct({...editingProduct, sku:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('price')} / {ta('comparePrice')}</label><div className="flex gap-2"><input type="number" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price:parseFloat(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/><input type="number" value={editingProduct.compareAtPrice} onChange={e=>setEditingProduct({...editingProduct, compareAtPrice:parseFloat(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/></div></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('stock')} / Low Threshold</label><div className="flex gap-2"><input type="number" value={editingProduct.stock} onChange={e=>setEditingProduct({...editingProduct, stock:parseInt(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/><input type="number" value={editingProduct.lowStockThreshold} onChange={e=>setEditingProduct({...editingProduct, lowStockThreshold:parseInt(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/></div></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('category')} (comma separated IDs)</label><input value={(editingProduct.categoryIds||[]).join(',')} onChange={e=>setEditingProduct({...editingProduct, categoryIds:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full px-3 py-2 rounded-xl border text-xs" placeholder="series-calmmex, face-mask"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('tags')} (comma)</label><input value={(editingProduct.tags||[]).join(',')} onChange={e=>setEditingProduct({...editingProduct, tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">{ta('images')} (first is main) - paste URLs or upload</label>{(editingProduct.images||[]).map((img, idx)=><div key={idx} className="flex gap-2 mb-2"><MediaUrlField value={img} onChange={v=>{ const arr=[...editingProduct.images]; arr[idx]=v; setEditingProduct({...editingProduct, images:arr}); }} label={`Image ${idx+1}`}/><button onClick={()=>{ const arr=editingProduct.images.filter((_,i)=>i!==idx); setEditingProduct({...editingProduct, images:arr}); }} className="p-2 rounded-xl border border-red-200 text-red-600"><Trash2 size={12}/></button></div>)}<button onClick={()=>setEditingProduct({...editingProduct, images:[...editingProduct.images, '']})} className="px-3 py-1.5 rounded-xl border text-xs">+ Add Image</button></div>
                              <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">{ta('descZh')}</label><textarea value={editingProduct.description.zh} onChange={e=>setEditingProduct({...editingProduct, description:{...editingProduct.description, zh:e.target.value}})} rows={3} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">{ta('descEn')}</label><textarea value={editingProduct.description.en} onChange={e=>setEditingProduct({...editingProduct, description:{...editingProduct.description, en:e.target.value}})} rows={3} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="flex gap-3"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingProduct.isBestseller} onChange={e=>setEditingProduct({...editingProduct, isBestseller:e.target.checked})}/>{ta('bestseller')}</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingProduct.isFeatured} onChange={e=>setEditingProduct({...editingProduct, isFeatured:e.target.checked})}/>{ta('featured')}</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingProduct.active} onChange={e=>setEditingProduct({...editingProduct, active:e.target.checked})}/>{ta('active')}</label></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingProduct(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveProduct(editingProduct)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                            {(adminSearch? data.products.filter(p=> (t(p.title).toLowerCase().includes(adminSearch.toLowerCase()) || p.sku.toLowerCase().includes(adminSearch.toLowerCase()))): data.products).map((p,i)=><div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50 hover:bg-white transition-colors"><img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover border"/><div className="flex-1 min-w-0"><p className="font-bold text-xs truncate">{t(p.title)} <span className="text-[10px] text-gray-400">({p.sku})</span></p><p className="text-[11px] text-gray-500">{formatPrice(p.price)} • Stock {p.stock} {p.stock<=p.lowStockThreshold && <span className="text-red-600 font-bold">Low!</span>} • {p.isBestseller?'Bestseller':''} {p.isFeatured?'Featured':''}</p></div><div className="flex gap-1"><button onClick={()=>handleMoveItem('products', i, 'up')} disabled={i===0} className="p-1.5 rounded border disabled:opacity-30"><ArrowUp size={12}/></button><button onClick={()=>handleMoveItem('products', i, 'down')} disabled={i===data.products.length-1} className="p-1.5 rounded border disabled:opacity-30"><ArrowDown size={12}/></button><button onClick={()=>setEditingProduct(p)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteProduct(p.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bundles */}
                    {adminActiveSection==='bundles' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('bundles')}</h2><button onClick={()=>setEditingBundle({id:'new', title:{zh:'新套裝',en:'New Bundle'}, description:{zh:'描述',en:'Desc'}, productIds:[], discountType:'percentage', discountValue:20, price:999, originalPrice:1299, image:data.products[0]?.images[0]||'', validFrom:new Date().toISOString().slice(0,10), validTo:'2026-12-31', active:true, badge:{zh:'限定',en:'Limited'}})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('addBundle')}</button></div>
                        {editingBundle ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleZh')}</label><input value={editingBundle.title.zh} onChange={e=>setEditingBundle({...editingBundle, title:{...editingBundle.title, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleEn')}</label><input value={editingBundle.title.en} onChange={e=>setEditingBundle({...editingBundle, title:{...editingBundle.title, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'套裝價 / 原價':'Bundle / Original Price'}</label><div className="flex gap-2"><input type="number" value={editingBundle.price} onChange={e=>setEditingBundle({...editingBundle, price:parseFloat(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/><input type="number" value={editingBundle.originalPrice} onChange={e=>setEditingBundle({...editingBundle, originalPrice:parseFloat(e.target.value)||0})} className="w-1/2 px-3 py-2 rounded-xl border text-xs"/></div></div>
                              <div><label className="text-xs font-bold mb-1 block">Product IDs (comma)</label><input value={(editingBundle.productIds||[]).join(',')} onChange={e=>setEditingBundle({...editingBundle, productIds:e.target.value.split(',').map(v=>parseInt(v.trim())).filter(v=>!isNaN(v))})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="md:col-span-2"><MediaUrlField value={editingBundle.image} onChange={v=>setEditingBundle({...editingBundle, image:v})} label={ta('imageUrl')}/></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingBundle(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveBundle(editingBundle)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2">{data.bundles.map((b,i)=><div key={b.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><img src={b.image} className="w-12 h-12 rounded-lg object-cover"/><div className="flex-1"><p className="font-bold text-xs">{t(b.title)}</p><p className="text-[11px] text-gray-500">{formatPrice(b.price)} / {formatPrice(b.originalPrice)} • {b.productIds?.length} products</p></div><div className="flex gap-1"><button onClick={()=>setEditingBundle(b)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteBundle(b.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {/* Coupons */}
                    {adminActiveSection==='coupons' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('coupons')}</h2><button onClick={()=>setEditingCoupon({id:'new', code:'NEWCODE', title:{zh:'新優惠券',en:'New Coupon'}, description:{zh:'描述',en:'Desc'}, discountType:'percentage', discountValue:10, minSpend:500, maxDiscount:null, usageLimit:100, usedCount:0, validFrom:new Date().toISOString().slice(0,10), validTo:'2026-12-31', firstOrderOnly:false, active:true, applicableProducts:[], applicableCategories:[]})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('addCoupon')}</button></div>
                        {editingCoupon ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('couponCode')}</label><input value={editingCoupon.code} onChange={e=>setEditingCoupon({...editingCoupon, code:e.target.value.toUpperCase()})} className="w-full px-3 py-2 rounded-xl border text-xs font-mono"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('discount')} (%) or fixed</label><div className="flex gap-2"><select value={editingCoupon.discountType} onChange={e=>setEditingCoupon({...editingCoupon, discountType:e.target.value})} className="px-2 py-2 rounded-xl border text-xs"><option value="percentage">% Percentage</option><option value="fixed">Fixed HK$</option></select><input type="number" value={editingCoupon.discountValue} onChange={e=>setEditingCoupon({...editingCoupon, discountValue:parseFloat(e.target.value)||0})} className="flex-1 px-3 py-2 rounded-xl border text-xs"/></div></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('minSpend')}</label><input type="number" value={editingCoupon.minSpend} onChange={e=>setEditingCoupon({...editingCoupon, minSpend:parseInt(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{lang==='zh'?'有效期':'Valid From-To'}</label><div className="flex gap-2"><input type="date" value={editingCoupon.validFrom} onChange={e=>setEditingCoupon({...editingCoupon, validFrom:e.target.value})} className="w-1/2 px-2 py-2 rounded-xl border text-xs"/><input type="date" value={editingCoupon.validTo} onChange={e=>setEditingCoupon({...editingCoupon, validTo:e.target.value})} className="w-1/2 px-2 py-2 rounded-xl border text-xs"/></div></div>
                              <div className="flex gap-3 items-center"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingCoupon.firstOrderOnly} onChange={e=>setEditingCoupon({...editingCoupon, firstOrderOnly:e.target.checked})}/>{lang==='zh'?'僅限首單':'First Order Only'}</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingCoupon.active} onChange={e=>setEditingCoupon({...editingCoupon, active:e.target.checked})}/>{ta('active')}</label></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingCoupon(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveCoupon(editingCoupon)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2">{data.coupons.map(c=><div key={c.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><div className="w-12 h-12 rounded-lg bg-gray-900 text-white flex flex-col items-center justify-center font-black text-[10px]"><Tag size={14}/>{c.code.slice(0,6)}</div><div className="flex-1"><p className="font-bold text-xs">{c.code} - {t(c.title)} • {c.discountType==='percentage'?`${c.discountValue}%`:`HK$${c.discountValue}`} {c.minSpend?`min ${formatPrice(c.minSpend)}`:''}</p><p className="text-[11px] text-gray-500">{c.usedCount||0}/{c.usageLimit||'∞'} used • {c.validFrom}→{c.validTo} {c.firstOrderOnly?`• ${lang==='zh'?'首單':''}`:''}</p></div><div className="flex gap-1"><button onClick={()=>setEditingCoupon(c)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteCoupon(c.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {/* GWP */}
                    {adminActiveSection==='gwp' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('gwpRules')}</h2><button onClick={()=>setEditingGwp({id:'new', minSpend:2000, title:{zh:'滿 $X 獲贈',en:'Spend $X Get Gift'}, description:{zh:'禮品描述',en:'Gift desc'}, gifts:[{name:{zh:'禮品',en:'Gift'}, qty:1}], image:'', active:true})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('addGwp')}</button></div>
                        {editingGwp ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">{ta('minSpend')}</label><input type="number" value={editingGwp.minSpend} onChange={e=>setEditingGwp({...editingGwp, minSpend:parseInt(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleZh')}</label><input value={editingGwp.title.zh} onChange={e=>setEditingGwp({...editingGwp, title:{...editingGwp.title, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('titleEn')}</label><input value={editingGwp.title.en} onChange={e=>setEditingGwp({...editingGwp, title:{...editingGwp.title, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="md:col-span-2"><MediaUrlField value={editingGwp.image} onChange={v=>setEditingGwp({...editingGwp, image:v})} label={ta('imageUrl')}/></div>
                              <div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={editingGwp.active} onChange={e=>setEditingGwp({...editingGwp, active:e.target.checked})}/>{ta('active')}</label></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingGwp(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveGwp(editingGwp)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2">{(data.settings.gwp?.rules||[]).map(r=><div key={r.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><img src={r.image} className="w-12 h-12 rounded-lg object-contain bg-white border p-1"/><div className="flex-1"><p className="font-bold text-xs">{t(r.title)} • Min {formatPrice(r.minSpend)}</p><p className="text-[11px] text-gray-500">{t(r.description)}</p></div><div className="flex gap-1"><button onClick={()=>setEditingGwp(r)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteGwp(r.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {/* Orders */}
                    {adminActiveSection==='orders' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{ta('orders')} ({data.orders.length})</h2>
                        <div className="overflow-x-auto rounded-2xl border">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-gray-50 border-b text-[11px] uppercase font-bold text-gray-500"><th className="text-left p-3">{ta('orderId')}</th><th className="text-left p-3">{ta('customer')}</th><th className="text-left p-3">Total</th><th className="text-left p-3">{ta('payment')}</th><th className="text-left p-3">{ta('status')}</th><th className="text-right p-3">{ta('actions')}</th></tr></thead>
                            <tbody>{data.orders.map(o=><tr key={o.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3 font-mono font-bold">{o.id}</td><td className="p-3">{o.email}</td><td className="p-3 font-bold">{formatPrice(o.total)}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${o.paymentStatus==='paid'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{o.paymentStatus}</span> {o.paymentMethod}</td><td className="p-3"><select value={o.fulfillmentStatus} onChange={e=>handleUpdateOrderStatus(o.id,'fulfillmentStatus', e.target.value)} className="px-2 py-1 rounded-lg border text-xs"><option value="processing">processing</option><option value="fulfilled">fulfilled</option><option value="cancelled">cancelled</option><option value="refunded">refunded</option></select></td><td className="p-3 text-right"><button onClick={()=>setSelectedOrder(o)} className="p-1.5 rounded border"><Eye size={12}/></button></td></tr>)}</tbody>
                          </table>
                        </div>
                        {selectedOrder && (
                          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-2xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"><div className="flex items-center justify-between"><h3 className="font-black">{selectedOrder.id}</h3><button onClick={()=>setSelectedOrder(null)} className="p-2 rounded-xl bg-gray-100"><X size={16}/></button></div><div className="text-xs space-y-2"><p><span className="font-bold">Email:</span> {selectedOrder.email}</p><p><span className="font-bold">Address:</span> {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.city}</p><div className="border-t pt-2">{selectedOrder.items.map((it,i)=><div key={i} className="flex justify-between py-1"><span>{t(it.title)} x{it.qty}</span><span>{formatPrice(it.price*it.qty)}</span></div>)}<div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{formatPrice(selectedOrder.total)}</span></div><div className="text-gray-500">Subtotal {formatPrice(selectedOrder.subtotal)} | Discount -{formatPrice(selectedOrder.discount)} | Shipping {formatPrice(selectedOrder.shipping)} | Points +{selectedOrder.pointsEarned}</div></div></div><button onClick={()=>setSelectedOrder(null)} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold">{ta('cancel')}</button></div></div>
                        )}
                      </div>
                    )}

                    {/* Customers CRM */}
                    {adminActiveSection==='customers' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{ta('customers')} (CRM) - {data.customers.length}</h2>
                        <div className="flex gap-2"><input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder={ta('search')+' email, name, referral...'} className="flex-1 px-3 py-2 rounded-xl border text-xs"/><button onClick={()=>{ const csv = ['email,name,tier,points,totalSpent,birthday,referralCode,referredBy,joinedAt,ordersCount,status'].concat(data.customers.map(c=>`${c.email},${c.name},${c.tier||''},${c.points||0},${c.totalSpent||0},${c.birthday||''},${c.referralCode||''},${c.referredBy||''},${c.joinedAt||''},${c.ordersCount||0},${c.status}`)).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='customers.csv'; a.click(); URL.revokeObjectURL(url); }} className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1"><Download size={12}/>CSV</button></div>
                        {editingCustomer ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">Name</label><input value={editingCustomer.name} onChange={e=>setEditingCustomer({...editingCustomer, name:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">Email</label><input value={editingCustomer.email} onChange={e=>setEditingCustomer({...editingCustomer, email:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('tier')}</label><select value={editingCustomer.tier||''} onChange={e=>setEditingCustomer({...editingCustomer, tier:e.target.value||null})} className="w-full px-3 py-2 rounded-xl border text-xs"><option value="">{lang==='zh'?'未入會':'None'}</option><option value="classic">Classic</option><option value="signature">Signature</option></select></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('points')}</label><input type="number" value={editingCustomer.points} onChange={e=>setEditingCustomer({...editingCustomer, points:parseInt(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('totalSpent')}</label><input type="number" value={editingCustomer.totalSpent} onChange={e=>setEditingCustomer({...editingCustomer, totalSpent:parseInt(e.target.value)||0})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('birthday')}</label><input type="date" value={editingCustomer.birthday||''} onChange={e=>setEditingCustomer({...editingCustomer, birthday:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('referral')}</label><input value={editingCustomer.referralCode} onChange={e=>setEditingCustomer({...editingCustomer, referralCode:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs font-mono"/></div>
                              <div><label className="text-xs font-bold mb-1 block">Status</label><select value={editingCustomer.status} onChange={e=>setEditingCustomer({...editingCustomer, status:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"><option value="active">active</option><option value="inactive">inactive</option></select></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingCustomer(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveCustomer(editingCustomer)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border"><table className="w-full text-xs"><thead><tr className="bg-gray-50 border-b text-[11px] uppercase font-bold text-gray-500"><th className="text-left p-3">{ta('customer')}</th><th className="text-left p-3">{ta('tier')}</th><th className="text-left p-3">{ta('points')}</th><th className="text-left p-3">{ta('totalSpent')}</th><th className="text-left p-3">{ta('referral')}</th><th className="text-right p-3">{ta('actions')}</th></tr></thead><tbody>{(adminSearch? data.customers.filter(c=> c.email.toLowerCase().includes(adminSearch.toLowerCase()) || c.name.toLowerCase().includes(adminSearch.toLowerCase()) || c.referralCode?.toLowerCase().includes(adminSearch.toLowerCase())): data.customers).map(c=><tr key={c.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3"><div className="flex items-center gap-2"><img src={c.avatar} className="w-6 h-6 rounded-full"/><div><p className="font-bold">{c.name}</p><p className="text-[11px] text-gray-500">{c.email}</p></div></div></td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.tier==='signature'?'bg-gray-900 text-white':'bg-primary/10 text-primary'}`}>{c.tier||'None'}</span></td><td className="p-3 font-bold">{c.points}</td><td className="p-3">{formatPrice(c.totalSpent||0)}</td><td className="p-3 font-mono text-[11px]">{c.referralCode} {c.referredBy && <span className="text-gray-400">←{c.referredBy}</span>}</td><td className="p-3 text-right flex justify-end gap-1"><button onClick={()=>setEditingCustomer(c)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteCustomer(c.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></td></tr>)}</tbody></table></div>
                        )}
                      </div>
                    )}

                    {/* Membership */}
                    {adminActiveSection==='membership' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{ta('membershipTiers')}</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          {(data.settings.membership?.tiers||[]).map((tier, idx)=>(
                            <div key={tier.id} className="rounded-2xl border p-5 space-y-3 bg-gray-50">
                              <h4 className="font-black text-sm flex items-center gap-2"><Crown size={14}/>{tier.id} - {t(tier.name)}</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[11px] font-bold">{ta('pointsRate')} ($1=)</label><input type="number" step="0.1" value={tier.pointsRate} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].pointsRate=parseFloat(e.target.value)||1; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div><label className="text-[11px] font-bold">{ta('referralBonus')}</label><input type="number" value={tier.referralBonus} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].referralBonus=parseInt(e.target.value)||0; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div><label className="text-[11px] font-bold">{ta('birthdayReward')} Coupon HK$</label><input type="number" value={tier.birthdayCoupon} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].birthdayCoupon=parseInt(e.target.value)||0; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div><label className="text-[11px] font-bold">Birthday Multiplier x</label><input type="number" step="0.1" value={tier.birthdayMultiplier} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].birthdayMultiplier=parseFloat(e.target.value)||1; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div><label className="text-[11px] font-bold">Min Enroll $</label><input type="number" value={tier.minSpendToEnroll} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].minSpendToEnroll=parseInt(e.target.value)||0; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div><label className="text-[11px] font-bold">Upgrade to Next $</label><input type="number" value={tier.minSpendToUpgrade} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].minSpendToUpgrade=parseInt(e.target.value)||0; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div className="col-span-2"><label className="text-[11px] font-bold">Benefits (ZH comma)</label><input value={(tier.benefits?.zh||[]).join(', ')} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].benefits={...(updated.settings.membership.tiers[idx].benefits||{}), zh: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                                <div className="col-span-2"><label className="text-[11px] font-bold">Benefits (EN comma)</label><input value={(tier.benefits?.en||[]).join(', ')} onChange={e=>{ const updated={...data}; updated.settings.membership.tiers[idx].benefits={...(updated.settings.membership.tiers[idx].benefits||{}), en: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}; saveAllData(updated); }} className="w-full px-2 py-1.5 rounded-lg border text-xs"/></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-2xl border p-5 bg-amber-50 space-y-2">
                          <h4 className="font-bold text-sm">{lang==='zh'?'積分規則':'Points Rules'}</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><label className="font-bold">Expiration Months</label><input type="number" value={data.settings.membership?.points?.expirationMonths||12} onChange={e=>updateNestedSetting('membership.points.expirationMonths', parseInt(e.target.value)||12)} className="w-full px-2 py-1.5 rounded-lg border"/></div>
                            <div><label className="font-bold">Birthday Limit $</label><input type="number" value={data.settings.membership?.points?.birthdayMonthLimit||10000} onChange={e=>updateNestedSetting('membership.points.birthdayMonthLimit', parseInt(e.target.value)||10000)} className="w-full px-2 py-1.5 rounded-lg border"/></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reviews */}
                    {adminActiveSection==='reviews' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{ta('reviews')}</h2><button onClick={()=>setEditingReview({id:'new', customerName:'新用家', avatar:'https://i.pravatar.cc/150?img=1', rating:5, comment:{zh:'很滿意！',en:'Great!'}, productId:data.products[0]?.id||1, productTitle:data.products[0]?.title||{zh:'產品',en:'Product'}, image:data.products[0]?.images[0]||'', date:new Date().toISOString().slice(0,10), verified:true})} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Plus size={14}/>{ta('add')}</button></div>
                        {editingReview ? (
                          <div className="bg-gray-50 rounded-2xl p-5 border space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold mb-1 block">Customer Name</label><input value={editingReview.customerName} onChange={e=>setEditingReview({...editingReview, customerName:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div><label className="text-xs font-bold mb-1 block">Rating</label><input type="number" min={1} max={5} value={editingReview.rating} onChange={e=>setEditingReview({...editingReview, rating:parseInt(e.target.value)||5})} className="w-full px-3 py-2 rounded-xl border text-xs"/></div>
                              <div className="md:col-span-2"><MediaUrlField value={editingReview.image} onChange={v=>setEditingReview({...editingReview, image:v})} label={ta('imageUrl')}/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('descZh')}</label><textarea value={editingReview.comment.zh} onChange={e=>setEditingReview({...editingReview, comment:{...editingReview.comment, zh:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs" rows={2}/></div>
                              <div><label className="text-xs font-bold mb-1 block">{ta('descEn')}</label><textarea value={editingReview.comment.en} onChange={e=>setEditingReview({...editingReview, comment:{...editingReview.comment, en:e.target.value}})} className="w-full px-3 py-2 rounded-xl border text-xs" rows={2}/></div>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={()=>setEditingReview(null)} className="px-4 py-2 rounded-xl border text-xs font-bold">{ta('cancel')}</button><button onClick={()=>handleSaveReview(editingReview)} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1"><Save size={12}/>{ta('save')}</button></div>
                          </div>
                        ) : (
                          <div className="space-y-2">{data.reviews.map(r=><div key={r.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50"><img src={r.image} className="w-12 h-12 rounded-lg object-cover"/><div className="flex-1"><p className="font-bold text-xs">{r.customerName} • {r.rating}★</p><p className="text-[11px] text-gray-500 line-clamp-1">{t(r.comment)}</p></div><div className="flex gap-1"><button onClick={()=>setEditingReview(r)} className="p-1.5 rounded border border-blue-200 text-blue-600"><Edit3 size={12}/></button><button onClick={()=>handleDeleteReview(r.id)} className="p-1.5 rounded border border-red-200 text-red-600"><Trash2 size={12}/></button></div></div>)}</div>
                        )}
                      </div>
                    )}

                    {adminActiveSection==='media' && (
                      <MediaStorageManager siteData={data} lang={lang} uploadsEnabled={data.settings?.mediaUploadsEnabled===true} onUploadsEnabledChange={enabled=>saveAllData({...data, settings:{...data.settings, mediaUploadsEnabled: enabled}})} />
                    )}

                    {adminActiveSection==='backup' && backupAccessGranted && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-black">{lang==='zh'?'數據備份、本地恢復與重置':'Backup, Import & Factory Reset'}</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-xl p-5 border space-y-3">
                            <h3 className="font-bold text-xs uppercase flex items-center gap-2"><Download size={14} className="text-primary"/>{lang==='zh'?'自動保存到 GitHub':'Auto-Save to GitHub'}</h3>
                            <div className="flex items-center justify-between"><div><label className="text-xs font-bold">{lang==='zh'?'啟用自動同步':'Enable Auto-Sync'}</label><p className="text-[10px] text-gray-400">{lang==='zh'?'保存後自動推送':'Auto-push after save'}</p></div><button onClick={()=>{ const next=!autoSaveToGithub; setAutoSaveToGithub(next); localStorage.setItem('bmbcc_autosave_github', String(next)); setData(prev=>{ const u={...prev, settings:{...prev.settings, autoSaveToGithub: next}}; localStorage.setItem('bmbcc_site_data', JSON.stringify(stripSensitiveData(u))); return u; }); saveGithubSettingsToCloud({autoSave:next}); }} className={`relative w-11 h-6 rounded-full transition-colors ${autoSaveToGithub?'bg-primary':'bg-gray-300'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoSaveToGithub?'translate-x-5':''}`}/></button></div>
                            <div className={autoSaveToGithub?'':'opacity-60'}><label className="block text-xs font-bold mb-1">GitHub PAT</label><input type="password" value={githubPat} onChange={e=>{ setGithubPat(e.target.value); localStorage.setItem('bmbcc_github_pat', e.target.value); saveGithubSettingsToCloud({pat:e.target.value}); }} placeholder="ghp_xxx" className="w-full px-3 py-2 rounded border text-xs font-mono"/><label className="block text-xs font-bold mb-1 mt-3">GitHub Repo</label><input type="text" value={githubRepo} onChange={e=>{ setGithubRepo(e.target.value); localStorage.setItem('bmbcc_github_repo', e.target.value); setData(prev=>{ const u={...prev, settings:{...prev.settings, githubRepo:e.target.value}}; localStorage.setItem('bmbcc_site_data', JSON.stringify(stripSensitiveData(u))); return u; }); saveGithubSettingsToCloud({repo:e.target.value}); }} placeholder="user/repo" className="w-full px-3 py-2 rounded border text-xs font-mono"/></div>
                            {autoSaveStatus && <div className={`text-xs p-2.5 rounded-lg ${autoSaveStatus==='saving'?'bg-blue-50 text-blue-700 border border-blue-200':autoSaveStatus==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{autoSaveMessage}</div>}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-5 border space-y-3"><h3 className="font-bold text-xs uppercase flex items-center gap-2"><Download size={14}/>{lang==='zh'?'備份：導出數據文件':'Export JSON'}</h3><p className="text-xs text-gray-500">{lang==='zh'?'下載所有網站數據為JSON備份文件':'Download all site data as JSON backup'}</p><button onClick={handleExportData} className="px-4 py-2.5 rounded-lg bg-primary text-white font-bold text-xs flex items-center gap-1.5"><Download size={14}/>{lang==='zh'?'導出並下載 JSON':'Download JSON'}</button></div>
                          <div className="bg-red-50/50 rounded-xl p-5 border border-red-200 space-y-3"><h3 className="font-bold text-xs uppercase flex items-center gap-2 text-red-600"><AlertTriangle size={14}/>{lang==='zh'?'重置：清空並恢復出廠默認':'Factory Reset'}</h3><p className="text-xs text-gray-500">{lang==='zh'?'重置後所有本地修改將被清空':'All local modifications will be cleared'}</p><button onClick={handleResetToDefault} className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center gap-1.5"><Trash2 size={14}/>{lang==='zh'?'強力重置回默認':'Force Factory Reset'}</button></div>
                          <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border space-y-3"><h3 className="font-bold text-xs uppercase flex items-center gap-2 text-blue-600"><Upload size={14}/>{lang==='zh'?'恢復：導入備份數據':'Restore / Import JSON'}</h3><form onSubmit={handleImportData} className="space-y-3"><textarea rows={6} value={importJsonText} onChange={e=>setImportJsonText(e.target.value)} placeholder='{"settings":{...},"products":[...]}' required className="w-full p-3 font-mono text-[11px] bg-white border rounded focus:outline-none focus:ring-1 focus:ring-primary"/><button type="submit" className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"><Upload size={14}/>{lang==='zh'?'驗證並導入':'Verify & Import'}</button></form>{importError && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100">{importError}</div>}</div>
                        </div>
                      </div>
                    )}
                    {adminActiveSection==='backup' && !backupAccessGranted && (
                      <div className="text-center py-12 space-y-3"><Shield size={32} className="mx-auto text-gray-300"/><p className="text-sm font-bold">{lang==='zh'?'需要重新驗證才能訪問備份區':'Re-auth required for backup'}</p><button onClick={requestBackupAccess} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">{lang==='zh'?'前往驗證':'Verify'}</button></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-[#1a1a1a] text-white/60 py-12 px-4">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 text-xs">
            <div className="space-y-3"><div className="flex items-center gap-2 text-white"><img src={data.settings.headerLogo} className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain"/><span className="font-black text-base">{t(data.settings.siteName)}</span></div><p className="leading-relaxed">{t(data.settings.description)}</p><div className="flex items-center gap-2 pt-2"><Phone size={14} className="text-primary-light"/><span>{data.settings.contactPhone}</span></div><div className="flex items-center gap-2"><Mail size={14} className="text-primary-light"/><span className="break-all">{data.settings.contactEmail}</span></div></div>
            <div className="space-y-3"><h4 className="text-white font-bold uppercase tracking-wider">{lang==='zh'?'選購':'Shop'}</h4><div className="space-y-1.5"><button onClick={()=>switchTab('shop')} className="block hover:text-white hover:underline">{lang==='zh'?'全部產品':'All Products'}</button>{navCategories.series.map(c=><button key={c.id} onClick={()=>{setShopSeriesFilter(c.id); switchTab('shop');}} className="block hover:text-white hover:underline">{t(c.name)}</button>)}{navCategories.faceCare.map(c=><button key={c.id} onClick={()=>{setShopCategoryFilter(c.id); switchTab('shop');}} className="block hover:text-white hover:underline">{t(c.name)}</button>)}</div></div>
            <div className="space-y-3"><h4 className="text-white font-bold uppercase tracking-wider">{lang==='zh'?'肌膚類別':'Skin Concerns'}</h4><div className="space-y-1.5">{navCategories.skinType.map(c=><button key={c.id} onClick={()=>{setShopSkinFilter(c.id); switchTab('shop');}} className="block hover:text-white hover:underline">{t(c.name)}</button>)}<button onClick={()=>switchTab('membership')} className="block hover:text-white hover:underline">{lang==='zh'?'會員制度':'Prestige Membership'}</button><button onClick={()=>switchTab('reviews')} className="block hover:text-white hover:underline">{lang==='zh'?'用家分享':'Reviews'}</button></div></div>
            <div className="space-y-3"><h4 className="text-white font-bold uppercase tracking-wider">{lang==='zh'?'關注我們':'Follow Us'}</h4><p className="text-white/40">{t(data.settings.footerTagline)}</p><div className="flex gap-2"><button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Globe size={14}/></button><button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Heart size={14}/></button><button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Camera size={14}/></button></div><div className="pt-3"><p className="text-[11px] text-white/30">© {new Date().getFullYear()} {t(data.settings.siteName)}. {t(data.settings.footerCopyright)}</p></div></div>
          </div>
        </footer>

        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e=>{ if(e.target===e.currentTarget) setSelectedProduct(null); }}>
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-scale-in">
              <button onClick={()=>setSelectedProduct(null)} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"><X size={18}/></button>
              <div className="md:w-1/2 bg-gray-50 relative aspect-square md:aspect-auto">
                <img src={selectedProduct.images[0]} alt={t(selectedProduct.title)} className="absolute inset-0 w-full h-full object-cover"/>
                {selectedProduct.compareAtPrice>selectedProduct.price && <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">-{Math.round((1-selectedProduct.price/selectedProduct.compareAtPrice)*100)}% OFF</span>}
                <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto">{selectedProduct.images.map((img,i)=><img key={i} src={img} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm cursor-pointer hover:border-primary" onClick={()=>{ const sp={...selectedProduct}; const arr=[img, ...sp.images.filter((_,idx)=>idx!==i)]; sp.images=arr; setSelectedProduct(sp); }}/>)}</div>
              </div>
              <div className="md:w-1/2 p-6 sm:p-8 overflow-y-auto space-y-4">
                <div><span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">{selectedProduct.tags?.[0]||'CS12'}</span><h2 className="text-2xl font-black mt-2 leading-tight">{t(selectedProduct.title)}</h2><p className="text-sm text-gray-500 mt-1">{t(selectedProduct.subtitle)||t(selectedProduct.shortDesc)}</p><div className="mt-2 flex items-center gap-2"><Stars rating={selectedProduct.rating||5}/><span className="text-xs text-gray-500">({selectedProduct.reviewCount} {lang==='zh'?'評價':'reviews'})</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedProduct.stock>20?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{selectedProduct.stock>0?(lang==='zh'?`庫存 ${selectedProduct.stock}`:`Stock ${selectedProduct.stock}`):(lang==='zh'?'缺貨':'Out of Stock')}</span></div></div>

                <div className="flex items-baseline gap-3"><span className="text-2xl font-black">{formatPrice(selectedProduct.price)}</span>{selectedProduct.compareAtPrice>selectedProduct.price && <span className="text-sm text-gray-400 line-through">{formatPrice(selectedProduct.compareAtPrice)}</span>}</div>

                {selectedProduct.variants && selectedProduct.variants.length>0 && (
                  <div><p className="text-xs font-bold mb-2">{lang==='zh'?'規格':'Variants'}</p><div className="flex flex-wrap gap-2">{selectedProduct.variants.map(v=><button key={v.id} onClick={()=>{ /* variant selection logic */ }} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold hover:border-primary hover:text-primary flex flex-col items-start"><span>{t(v.name)}</span><span className="text-[11px] text-gray-500">{formatPrice(v.price)} • {v.stock} left</span></button>)}</div></div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-gray-200"><button onClick={()=>{}} className="p-2.5 hover:bg-gray-50"><Minus size={14}/></button><span className="px-3 text-sm font-bold">1</span><button className="p-2.5 hover:bg-gray-50"><Plus size={14}/></button></div>
                  <button onClick={()=>{addToCart(selectedProduct.id, selectedProduct.variants?.[0]?.id||null,1); setSelectedProduct(null);}} className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black flex items-center justify-center gap-2"><ShoppingBag size={16}/>{lang==='zh'?'加入購物車':'Add to Cart'}</button>
                  <button onClick={()=>toggleWishlist(selectedProduct.id)} className={`w-11 h-11 rounded-xl border flex items-center justify-center ${wishlist.includes(selectedProduct.id)?'bg-primary text-white border-primary':'bg-white text-gray-400 border-gray-200 hover:text-primary'}`}><Heart size={18} className={wishlist.includes(selectedProduct.id)?'fill-white':''}/></button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]"><div className="bg-gray-50 rounded-xl p-2.5 text-center"><Truck size={14} className="mx-auto mb-1 text-primary"/><p className="font-bold">{lang==='zh'?'滿 $800 免運':'Free over $800'}</p></div><div className="bg-gray-50 rounded-xl p-2.5 text-center"><Award size={14} className="mx-auto mb-1 text-primary"/><p className="font-bold">{lang==='zh'?'會員積分':'Points'}</p><p className="text-gray-500">$1={customerTier?.pointsRate||1}</p></div><div className="bg-gray-50 rounded-xl p-2.5 text-center"><Gift size={14} className="mx-auto mb-1 text-primary"/><p className="font-bold">{lang==='zh'?'滿贈禮遇':'GWP'}</p><p className="text-gray-500">{formatPrice(data.settings.gwp?.rules?.[0]?.minSpend||2000)}+</p></div></div>

                <div className="space-y-4 pt-4 border-t">
                  <div><h4 className="font-bold text-sm">{lang==='zh'?'產品詳情':'Description'}</h4><p className="text-sm text-gray-600 leading-relaxed mt-2 whitespace-pre-line">{t(selectedProduct.description)}</p></div>
                  <div><h4 className="font-bold text-sm">{lang==='zh'?'主要成份':'Ingredients'}</h4><p className="text-xs text-gray-600 mt-1">{t(selectedProduct.ingredients)}</p></div>
                  <div><h4 className="font-bold text-sm">{lang==='zh'?'使用方法':'How to Use'}</h4><p className="text-xs text-gray-600 mt-1">{t(selectedProduct.howToUse)}</p></div>
                  <div><h4 className="font-bold text-sm">{lang==='zh'?'功效':'Benefits'}</h4><div className="flex flex-wrap gap-1.5 mt-2">{(t(selectedProduct.benefits)?.length? t(selectedProduct.benefits): (selectedProduct.benefits?.[lang]||[])).map?.((b,i)=><span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{b}</span>) || (selectedProduct.benefits?.zh||[]).map((b,i)=><span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">{b}</span>)}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer */}
        {showCart && (
          <div className="fixed inset-0 z-[80] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={()=>setShowCart(false)}/>
            <div className="relative w-[92vw] max-w-[440px] bg-white h-[100dvh] shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b flex items-center justify-between"><h3 className="font-black text-base flex items-center gap-2"><ShoppingCart size={18}/>{lang==='zh'?'購物車':'Cart'} ({cartCount})</h3><button onClick={()=>setShowCart(false)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"><X size={16}/></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length===0 ? (
                  <div className="text-center py-16 space-y-3"><ShoppingBag size={40} className="mx-auto text-gray-300"/><p className="font-bold text-gray-700">{lang==='zh'?'購物車是空的':'Your cart is empty'}</p><button onClick={()=>{setShowCart(false); switchTab('shop');}} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">{lang==='zh'?'去選購':'Go Shopping'}</button></div>
                ) : (
                  <>
                    {cart.map((ci, idx)=>{
                      const prod=data.products.find(p=>p.id===ci.productId);
                      if(!prod) return null;
                      let price=prod.price; let title=t(prod.title); let img=prod.images[0];
                      if(ci.variantId){ const v=prod.variants?.find(v=>v.id===ci.variantId); if(v){ price=v.price; title=`${t(prod.title)} - ${t(v.name)}`; if(v.image) img=v.image; } }
                      return <div key={idx} className="flex gap-3 border border-gray-100 rounded-2xl p-3"><img src={img} className="w-16 h-16 rounded-xl object-cover border"/><div className="flex-1 min-w-0"><p className="font-bold text-xs line-clamp-2">{title}</p><p className="text-xs text-gray-500">{formatPrice(price)}</p><div className="flex items-center gap-2 mt-2"><button onClick={()=>updateCartQty(idx, ci.qty-1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-50"><Minus size={10}/></button><span className="text-xs font-bold w-6 text-center">{ci.qty}</span><button onClick={()=>updateCartQty(idx, ci.qty+1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-50"><Plus size={10}/></button><button onClick={()=>removeFromCart(idx)} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 size={14}/></button></div></div><span className="font-bold text-xs">{formatPrice(price*ci.qty)}</span></div>;
                    })}
                    {/* GWP progress */}
                    <div className="rounded-2xl bg-[#fdf8f5] border border-primary/20 p-3 space-y-2">
                      <p className="text-xs font-bold flex items-center gap-1"><Gift size={12} className="text-primary"/>{lang==='zh'?'滿贈進度':'GWP Progress'}</p>
                      {(data.settings.gwp?.rules||[]).filter(r=>r.active).sort((a,b)=>a.minSpend-b.minSpend).map(rule=>{
                        const reached = cartSubtotal>=rule.minSpend;
                        const remaining = Math.max(0, rule.minSpend-cartSubtotal);
                        return <div key={rule.id} className="text-[11px]"><div className="flex justify-between"><span className={reached?'text-green-600 font-bold':''}>{t(rule.title)} ({formatPrice(rule.minSpend)})</span><span>{reached?(lang==='zh'?'已達成':'Reached'): `${lang==='zh'?'差':'Need'} ${formatPrice(remaining)}`}</span></div><div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1"><div className="h-full bg-primary transition-all" style={{width:`${Math.min(100, (cartSubtotal/rule.minSpend)*100)}%`}}></div></div></div>;
                      })}
                    </div>
                    {/* Free shipping */}
                    <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-[11px]"><div className="flex justify-between font-bold"><span className="flex items-center gap-1"><Truck size={12}/>{lang==='zh'?'免運費進度':'Free Shipping'}</span><span>{cartSubtotal>= (data.settings.shipping?.freeThreshold||800) ? (lang==='zh'?'已免運！':'Free!') : `${lang==='zh'?'差':''} ${formatPrice((data.settings.shipping?.freeThreshold||800)-cartSubtotal)}`}</span></div><div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-blue-500 transition-all" style={{width:`${Math.min(100, (cartSubtotal/(data.settings.shipping?.freeThreshold||800))*100)}%`}}></div></div></div>
                    {/* Coupon */}
                    <div className="space-y-2"><div className="flex gap-2"><input value={couponInput} onChange={e=>setCouponInput(e.target.value)} placeholder={lang==='zh'?'輸入優惠碼':'Coupon code'} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-primary outline-none"/><button onClick={handleApplyCoupon} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">{lang==='zh'?'套用':'Apply'}</button></div>{appliedCoupon && <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-2.5 text-xs"><span className="flex items-center gap-1 font-bold text-green-700"><Tag size={12}/>{appliedCoupon.code} -{appliedCoupon.discountType==='percentage'?`${appliedCoupon.discountValue}%`:`HK$${appliedCoupon.discountValue}`} • -{formatPrice(discountAmount)}</span><button onClick={clearCoupon} className="text-gray-500 hover:text-red-500"><X size={12}/></button></div>}{couponError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{couponError}</p>}</div>
                  </>
                )}
              </div>
              {cart.length>0 && (
                <div className="p-5 border-t bg-gray-50 space-y-3">
                  <div className="space-y-1.5 text-sm"><div className="flex justify-between"><span className="text-gray-500">{lang==='zh'?'小計':'Subtotal'}</span><span className="font-bold">{formatPrice(cartSubtotal)}</span></div>{discountAmount>0 && <div className="flex justify-between text-green-600"><span>{lang==='zh'?'優惠':'Discount'}</span><span>-{formatPrice(discountAmount)}</span></div>}<div className="flex justify-between"><span className="text-gray-500">{lang==='zh'?'運費':'Shipping'}</span><span className={shippingCost===0?'text-green-600 font-bold':''}>{shippingCost===0?(lang==='zh'?'免運費':'Free'):formatPrice(shippingCost)}</span></div><div className="flex justify-between font-black text-base border-t pt-2"><span>{lang==='zh'?'總計':'Total'}</span><span>{formatPrice(cartTotal)}</span></div><p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1"><Award size={12}/>{lang==='zh'?`此單可獲 ${pointsEarnedPreview} 積分`:`Earn ${pointsEarnedPreview} points`}</p></div>
                  <button onClick={()=>{setShowCart(false); setActiveTab('checkout'); setCheckoutStep(1);}} className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"><CreditCard size={16}/>{lang==='zh'?'去結帳':'Checkout'} • {formatPrice(cartTotal)}</button>
                  <button onClick={()=>{setShowCart(false); switchTab('shop');}} className="w-full py-2.5 rounded-xl border border-gray-200 font-bold text-sm hover:bg-white">{lang==='zh'?'繼續購物':'Continue Shopping'}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wishlist Drawer */}
        {showWishlist && (
          <div className="fixed inset-0 z-[80] flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowWishlist(false)}/>
            <div className="relative w-[92vw] max-w-[380px] bg-white h-[100dvh] shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b flex items-center justify-between"><h3 className="font-black text-base flex items-center gap-2"><Heart size={18} className="text-primary"/>{lang==='zh'?'我的收藏':'Wishlist'} ({wishlistCount})</h3><button onClick={()=>setShowWishlist(false)} className="p-2 rounded-xl bg-gray-100"><X size={16}/></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {wishlist.length===0 ? <div className="text-center py-16 space-y-3"><Heart size={36} className="mx-auto text-gray-300"/><p className="text-sm text-gray-500">{lang==='zh'?'暫無收藏':'No wishlist'}</p></div> :
                  wishlist.map(pid=>{ const p=data.products.find(pp=>pp.id===pid); if(!p) return null; return <div key={pid} className="flex gap-3 border rounded-2xl p-3"><img src={p.images[0]} className="w-16 h-16 rounded-xl object-cover"/><div className="flex-1"><p className="font-bold text-xs line-clamp-1">{t(p.title)}</p><p className="text-xs text-gray-500">{formatPrice(p.price)}</p><div className="flex gap-1.5 mt-2"><button onClick={()=>addToCart(p.id,null,1)} className="flex-1 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold">{lang==='zh'?'加入購物車':'Add to Cart'}</button><button onClick={()=>toggleWishlist(pid)} className="px-2 py-1.5 rounded-lg border"><Trash2 size={12}/></button></div></div></div>; })
                }
              </div>
            </div>
          </div>
        )}

        {/* Backup reauth modal */}
        {backupReauthOpen && (
          <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleBackupReauth} className="bg-white rounded-2xl border max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-black text-sm flex items-center gap-2"><Shield size={16}/>{lang==='zh'?'重新驗證才能訪問備份區':'Re-auth required for backup'}</h3>
              <input type="password" value={backupPasswordInput} onChange={e=>setBackupPasswordInput(e.target.value)} placeholder={lang==='zh'?'輸入管理密碼':'Admin password'} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-1 focus:ring-primary outline-none"/>
              {backupLoginError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{backupLoginError}</div>}
              <div className="flex gap-2"><button type="button" onClick={()=>setBackupReauthOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold">{lang==='zh'?'取消':'Cancel'}</button><button type="submit" className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold">{lang==='zh'?'驗證':'Verify'}</button></div>
            </form>
          </div>
        )}
      </div>
    </MediaUploadContext.Provider>
  );
}
