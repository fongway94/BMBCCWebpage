export const initialData = {
  settings: {
    siteName: { zh: "CS12 敏感肌專家", en: "CS12 Skincare" },
    siteAbbreviation: "CS12",
    slogan: { zh: "為敏感肌而生的溫和醫研修護", en: "Gentle Clinical Repair Born for Sensitive Skin" },
    description: {
      zh: "有效療癒敏感肌、濕疹、玫瑰痤瘡等各種肌膚不適。獨家CalmEX療敏配方，專為亞洲敏感肌研發。",
      en: "Effectively heals sensitive skin, eczema, rosacea and various discomforts. Exclusive CalmEX formula developed for Asian sensitive skin."
    },
    // Theme
    themeColor: "custom",
    customThemeColor: "#d4a5a5",
    customPalette: {
      primary: "#d4a5a5",
      primaryDark: "#b58383",
      primaryLight: "#f5d6d6",
      secondary: "#a8c3b0",
      accent: "#e8c9a0",
      background: "#fdf8f5",
      text: "#2d2a26"
    },
    textScale: 100,
    fontFamilyZh: "noto-sans-sc",
    fontFamilyEn: "poppins",
    // Header logo - use CS12 logo placeholder
    headerLogo: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12-LOGO_White-Background-800x800_t.png",
    // Contact
    contactPhone: "+852 1234 5678",
    contactEmail: "hello@cs12skincare.com.hk",
    contactAddress: { zh: "香港中環", en: "Central, Hong Kong" },
    // E-commerce core
    currencies: {
      primary: "HKD",
      secondary: "USD",
      exchangeRate: 0.128, // 1 HKD = 0.128 USD approx
      symbol: { HKD: "HK$", USD: "$" }
    },
    shipping: {
      freeThreshold: 800,
      flatRate: 50,
      freeShippingLabel: { zh: "滿 HK$800 免運費", en: "Free Shipping over HK$800" }
    },
    taxRate: 0,
    // Promotions
    firstOrder: {
      enabled: true,
      code: "NEWCS12",
      discountType: "percentage",
      discountValue: 15,
      minSpend: 1500,
      label: { zh: "首次購物優惠 滿$1500享15% OFF", en: "First Order 15% OFF over $1500" }
    },
    newsletter: {
      enabled: true,
      title: { zh: "訂閱 PRESTIGE Newsletter", en: "Subscribe PRESTIGE Newsletter" },
      description: { zh: "獲取CS12最新優惠資訊", en: "Get latest CS12 offers" }
    },
    // UI texts
    footerCopyright: { zh: "2026 CS12 Skincare. 保留所有權利。", en: "2026 CS12 Skincare. All rights reserved." },
    footerTagline: { zh: "敏感肌修復專家 #SOCALM", en: "Sensitive Skin Expert #SOCALM" },
    // Feature toggles
    showLoginButton: true,
    eventPopupEnabled: true,
    mediaUploadsEnabled: false,
    // Points & Membership config in settings.membership
    membership: {
      tiers: [
        {
          id: "classic",
          name: { zh: "經典會員", en: "Classic" },
          nameEn: "Classic",
          minSpendToEnroll: 1500, // single tx or accumulate 3 months
          accumulateMonths: 3,
          minSpendToUpgrade: 8000, // to next tier
          pointsRate: 1, // $1 = 1 credit
          referralBonus: 50,
          birthdayCoupon: 100,
          birthdayMultiplier: 2,
          birthdayGift: false,
          benefits: {
            zh: ["生日券 HK$100 + 2倍積分", "買一送一積分 $1=1分", "推薦獎勵 +50分", "會員專屬神秘禮遇", "新品優先體驗"],
            en: ["HK$100 coupon + 2x points on birthday", "HK$1=1 Credit", "Referral +50 Credits", "Members exclusive GWP", "Prestige Insider"]
          },
          color: "#c9a8a8",
          badge: "CLASSIC"
        },
        {
          id: "signature",
          name: { zh: "尊尚會員", en: "Signature" },
          nameEn: "Signature",
          minSpendToEnroll: 6500,
          minSpendToUpgrade: 8000, // upgrade from classic if spend 8000 in calendar year
          pointsRate: 1.5,
          referralBonus: 100,
          referredBonusMap: { classic: 100, signature: 150 },
          birthdayCoupon: 100,
          birthdayGift: true,
          birthdayMultiplier: 3,
          benefits: {
            zh: ["生日券 HK$100 + 生日禮物 + 3倍積分", "積分 $1=1.5分", "推薦獎勵 +100分 (經典) / +150分 (尊尚)", "專屬禮遇", "新品優先搶購"],
            en: ["HK$100 + Gift + 3x Credit on birthday", "HK$1=1.5 Credit", "Referral +100 / +150", "Exclusive GWP", "First Access to Launches"]
          },
          color: "#1a1a1a",
          badge: "SIGNATURE"
        }
      ],
      points: {
        expirationMonths: 12,
        redemptionNotifyMonths: [1, 7], // Jan & July
        maxSameItemRedeem: 2,
        referralMinMembershipMonths: 3,
        birthdayMonthLimit: 10000 // max purchase for extra points in birthday month
      }
    },
    // GWP Rules
    gwp: {
      enabled: true,
      rules: [
        {
          id: 1,
          minSpend: 2000,
          title: { zh: "滿 $2000 獲贈6件療敏禮品", en: "Spend $2000 Get 6pcs Gift" },
          description: { zh: "包括：奇蹟面膜3片、抗敏安瓶5ml、#SOCALM 1 awaken 5ml、水潤防曬96號色 6ml", en: "Includes: Miracle Mask x3, Soothing Ampoule 5ml, #SOCALM 1 awaken 5ml, Sunscreen 6ml" },
          gifts: [
            { name: { zh: "奇蹟面膜", en: "Miracle Mask" }, qty: 3 },
            { name: { zh: "抗敏安瓶 5ml", en: "Ampoule 5ml" }, qty: 1 },
            { name: { zh: "#SOCALM 1 awaken 5ml", en: "#SOCALM 1 awaken 5ml" }, qty: 1 },
            { name: { zh: "水潤防曬96號色 6ml", en: "Sunscreen 96 6ml" }, qty: 1 }
          ],
          image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/1.png",
          active: true
        },
        {
          id: 2,
          minSpend: 3000,
          title: { zh: "滿 $3000 獲贈10件療敏禮品", en: "Spend $3000 Get 10pcs Gift" },
          description: { zh: "包括：奇蹟面膜6片、抗敏安瓶5mlx2粒、#SOCALM 1 awaken 5ml、水潤防曬96號色 6ml", en: "Includes: Miracle Mask x6, Ampoule 5ml x2, #SOCALM 1 awaken 5ml, Sunscreen 96 6ml" },
          gifts: [
            { name: { zh: "奇蹟面膜", en: "Miracle Mask" }, qty: 6 },
            { name: { zh: "抗敏安瓶 5ml", en: "Ampoule 5ml" }, qty: 2 },
            { name: { zh: "#SOCALM 1 awaken 5ml", en: "#SOCALM 1 awaken 5ml" }, qty: 1 },
            { name: { zh: "水潤防曬96號色 6ml", en: "Sunscreen 96 6ml" }, qty: 1 }
          ],
          image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/2.png",
          active: true
        }
      ]
    }
  },
  carousel: [
    {
      id: 1,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png",
      title: { zh: "開啟冰涼盛夏護膚之旅", en: "Cool Summer Skincare Journey" },
      subtitle: { zh: "7.7 – 7.31 官網限定修護套裝低至 HK$1,198 起", en: "7.7-7.31 Exclusive Repair Sets from HK$1,198" },
      ctaText: { zh: "立即選購", en: "Shop Now" },
      ctaLink: "shop",
      active: true
    },
    {
      id: 2,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2025/03/March-2025-Banner-1400x788.jpg",
      title: { zh: "敏感肌轉季必備", en: "Must-Have for Sensitive Season Change" },
      subtitle: { zh: "獨家CalmEX療敏配方，溫和修復", en: "Exclusive CalmEX formula, gentle repair" },
      ctaText: { zh: "了解更多", en: "Learn More" },
      ctaLink: "shop",
      active: true
    },
    {
      id: 3,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg",
      title: { zh: "奇蹟面膜 熱賣no.1", en: "Miracle Mask Bestseller" },
      subtitle: { zh: "為敏感肌而生的冰涼急救面膜", en: "Cooling SOS mask born for sensitive skin" },
      ctaText: { zh: "立即搶購", en: "Shop Miracle Mask" },
      ctaLink: "product-1",
      active: true
    }
  ],
  categories: [
    {
      id: "series-calmmex",
      name: { zh: "#CalmEX 療敏系列", en: "#CalmEX" },
      slug: "calm-ex",
      type: "series",
      description: { zh: "獨家療敏配方，針對敏感根源", en: "Exclusive anti-sensitivity formula" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CalmEX1200-1-1200x1200.png",
      sortOrder: 1,
      active: true
    },
    {
      id: "series-socalm",
      name: { zh: "#SoCalm 強韌屏障3步曲", en: "#SoCalm Barrier 3 Steps" },
      slug: "so-calm",
      type: "series",
      description: { zh: "強化肌膚屏障，持久保濕", en: "Strengthen barrier, lasting hydration" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/SoClam1200-1200x1200.png",
      sortOrder: 2,
      active: true
    },
    {
      id: "series-cellrevex",
      name: { zh: "#CellRevEX 細胞修復", en: "#CellRevEX Cell Repair" },
      slug: "cell-rev-ex",
      type: "series",
      description: { zh: "細胞級抗老修復", en: "Cellular anti-aging repair" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2025/01/CNY-banner-1-1-scaled.jpg",
      sortOrder: 3,
      active: true
    },
    {
      id: "face-mask",
      name: { zh: "面膜", en: "Masks" },
      slug: "masks",
      type: "faceCare",
      description: { zh: "急救修復面膜", en: "SOS Repair Masks" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg",
      sortOrder: 10,
      active: true
    },
    {
      id: "face-ampoule",
      name: { zh: "安瓶", en: "Ampoules" },
      slug: "ampoules",
      type: "faceCare",
      description: { zh: "高濃度精華安瓶", en: "High-potency ampoules" },
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80",
      sortOrder: 11,
      active: true
    },
    {
      id: "face-essence",
      name: { zh: "精華", en: "Essence" },
      slug: "essence",
      type: "faceCare",
      description: { zh: "保濕修復精華", en: "Hydrating repair essence" },
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80",
      sortOrder: 12,
      active: true
    },
    {
      id: "face-cream",
      name: { zh: "面霜", en: "Cream" },
      slug: "cream",
      type: "faceCare",
      description: { zh: "屏障修復面霜", en: "Barrier repair cream" },
      image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=400&q=80",
      sortOrder: 13,
      active: true
    },
    {
      id: "face-sunscreen",
      name: { zh: "防曬", en: "Sunscreen" },
      slug: "sunscreen",
      type: "faceCare",
      description: { zh: "溫和物理防曬", en: "Gentle mineral sunscreen" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2024/03/CS12-SUN-CUSHION-IVORY-PINK-7-SAND-BEIGE-9-scaled.jpg",
      sortOrder: 14,
      active: true
    },
    {
      id: "skin-sensitive",
      name: { zh: "敏感肌", en: "Sensitive" },
      slug: "sensitive",
      type: "skinType",
      description: { zh: "敏感肌專用", en: "For sensitive skin" },
      image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
      sortOrder: 20,
      active: true
    },
    {
      id: "skin-redness",
      name: { zh: "泛紅/玫瑰痤瘡", en: "Redness / Rosacea" },
      slug: "redness-rosacea",
      type: "skinType",
      description: { zh: "鎮靜退紅", en: "Calm redness" },
      image: "https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?auto=format&fit=crop&w=400&q=80",
      sortOrder: 21,
      active: true
    },
    {
      id: "skin-dry",
      name: { zh: "乾性肌", en: "Dry Skin" },
      slug: "dry",
      type: "skinType",
      description: { zh: "深層保濕", en: "Deep hydration" },
      image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80",
      sortOrder: 22,
      active: true
    },
    {
      id: "skin-oily",
      name: { zh: "油性/痘痘/暗瘡", en: "Oily / Acne" },
      slug: "oily-acne",
      type: "skinType",
      description: { zh: "控油抗痘", en: "Oil control anti-acne" },
      image: "https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&w=400&q=80",
      sortOrder: 23,
      active: true
    }
  ],
  products: [
    {
      id: 1,
      sku: "CS12-MM-001",
      title: { zh: "奇蹟面膜 Miracle Mask", en: "Miracle Mask" },
      subtitle: { zh: "冰涼急救 · 瞬間鎮靜退紅", en: "Cooling SOS · Instant Calm" },
      description: {
        zh: "CS12皇牌奇蹟面膜，獨家CalmEX療敏配方，專為敏感肌研發。冰涼質地瞬間降溫，鎮靜退紅、止痕補水，連眼周細紋都能修復。一片感受肌膚光澤細緻回歸。",
        en: "CS12's signature Miracle Mask with exclusive CalmEX formula for sensitive skin. Cooling texture instantly lowers temperature, calms redness, relieves itch and hydrates. Even fine lines around eyes improved. One sheet reveals radiant skin."
      },
      shortDesc: { zh: "敏感肌急救必備，曬傷退紅神器", en: "SOS essential for sensitive skin" },
      categoryIds: ["series-calmmex", "face-mask", "skin-sensitive", "skin-redness"],
      tags: ["bestseller", "new", "miracle"],
      price: 320,
      compareAtPrice: 380,
      cost: 120,
      stock: 150,
      lowStockThreshold: 20,
      images: [
        "https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg",
        "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CalmEX1200-1-1200x1200.png"
      ],
      ingredients: { zh: "CalmEX™ 複合因子、積雪草、神經酰胺", en: "CalmEX™ complex, Centella, Ceramide" },
      howToUse: { zh: "潔面後敷15-20分鐘，無需過水", en: "After cleansing, apply 15-20 mins, no rinse needed" },
      benefits: { zh: ["瞬間降溫", "鎮靜退紅", "止痕補水", "修復屏障"], en: ["Instant cooling", "Calm redness", "Hydrate", "Repair barrier"] },
      isBestseller: true,
      isNew: false,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 1243,
      variants: [
        { id: "v1", name: { zh: "5片裝", en: "5 Sheets" }, price: 320, compareAtPrice: 380, stock: 150, sku: "CS12-MM-5" },
        { id: "v2", name: { zh: "10片裝 (超值)", en: "10 Sheets (Value)" }, price: 580, compareAtPrice: 760, stock: 80, sku: "CS12-MM-10" }
      ],
      active: true,
      createdAt: "2025-01-01"
    },
    {
      id: 2,
      sku: "CS12-SC-001",
      title: { zh: "#SoCalm 1 Awaken 微精華", en: "#SoCalm 1 Awaken Micro Essence" },
      subtitle: { zh: "強韌屏障第一步", en: "Barrier Step 1" },
      description: {
        zh: "水感微精華，喚醒肌膚吸收力，為後續護膚打底。低刺激配方，敏感肌適用。",
        en: "Watery micro essence that awakens skin absorption, preps for following steps. Low irritation for sensitive skin."
      },
      shortDesc: { zh: "喚醒吸收力", en: "Awaken absorption" },
      categoryIds: ["series-socalm", "face-essence", "skin-sensitive"],
      tags: ["socalm", "essence"],
      price: 420,
      compareAtPrice: 480,
      cost: 160,
      stock: 120,
      lowStockThreshold: 15,
      images: ["https://cs12skincare.com.hk/wp-content/uploads/2026/03/SoClam1200-1200x1200.png"],
      ingredients: { zh: "CalmEX、益生元", en: "CalmEX, Prebiotics" },
      howToUse: { zh: "潔面後取適量輕拍全臉", en: "After cleansing, pat onto face" },
      benefits: { zh: ["強韌屏障", "提升吸收"], en: ["Strengthen barrier", "Boost absorption"] },
      isBestseller: true,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 876,
      variants: [],
      active: true,
      createdAt: "2025-02-01"
    },
    {
      id: 3,
      sku: "CS12-SC-002",
      title: { zh: "#SoCalm 2 Calm 安瓶", en: "#SoCalm 2 Calm Ampoule" },
      subtitle: { zh: "高濃度抗敏安瓶", en: "High-potency soothing ampoule" },
      description: {
        zh: "高濃度CalmEX安瓶，針對性舒緩敏感、泛紅、痕癢。7天感受肌膚穩定。",
        en: "High concentration CalmEX ampoule, targets sensitivity, redness, itch. Feel stability in 7 days."
      },
      shortDesc: { zh: "抗敏安瓶 5ml x 6", en: "Soothing Ampoule 5ml x6" },
      categoryIds: ["series-socalm", "face-ampoule", "skin-sensitive", "skin-redness"],
      tags: ["ampoule", "socalm"],
      price: 580,
      compareAtPrice: 650,
      cost: 200,
      stock: 90,
      lowStockThreshold: 10,
      images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80"],
      ingredients: { zh: "CalmEX 15%、積雪草苷", en: "CalmEX 15%, Madecassoside" },
      howToUse: { zh: "早晚各一支，輕拍吸收", en: "One ampoule morning and night" },
      benefits: { zh: ["抗敏", "退紅"], en: ["Anti-sensitive", "Reduce redness"] },
      isBestseller: true,
      isFeatured: false,
      rating: 4.9,
      reviewCount: 654,
      variants: [],
      active: true,
      createdAt: "2025-02-15"
    },
    {
      id: 4,
      sku: "CS12-CE-001",
      title: { zh: "#CellRevEX 修復面霜", en: "#CellRevEX Repair Cream" },
      subtitle: { zh: "細胞級修護緊緻", en: "Cellular Repair & Firming" },
      description: { zh: "結合細胞修復因子，緊緻拉提，改善鬆弛，重建膠原。適合成熟肌。", en: "With cell repair factors, firms, lifts, improves sagging, rebuilds collagen. For mature skin." },
      shortDesc: { zh: "抗老緊緻面霜", en: "Anti-aging firming cream" },
      categoryIds: ["series-cellrevex", "face-cream", "skin-dry"],
      tags: ["cellrevex", "cream", "anti-aging"],
      price: 680,
      compareAtPrice: 780,
      cost: 250,
      stock: 70,
      lowStockThreshold: 10,
      images: ["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=600&q=80"],
      ingredients: { zh: "CellRevEX因子、肽", en: "CellRevEX factor, Peptides" },
      howToUse: { zh: "早晚取珍珠大小按摩全臉", en: "Pearl size morning/evening" },
      benefits: { zh: ["緊緻", "抗老"], en: ["Firm", "Anti-aging"] },
      isBestseller: false,
      isFeatured: true,
      rating: 4.7,
      reviewCount: 432,
      variants: [],
      active: true,
      createdAt: "2025-03-01"
    },
    {
      id: 5,
      sku: "CS12-SS-001",
      title: { zh: "水潤防曬氣墊 SPF50+ PA++++", en: "Hydra Sunscreen Cushion SPF50+ PA++++" },
      subtitle: { zh: "敏感肌專用防曬 不含香料", en: "Sensitive-safe sunscreen fragrance-free" },
      description: { zh: "物理防曬氣墊，輕透不黏膩，不泛白，敏感肌可用的防曬，96號色自然提亮。", en: "Mineral cushion, lightweight non-sticky, no white cast, for sensitive skin, shade 96 brightening." },
      shortDesc: { zh: "氣墊防曬 3色可選", en: "Cushion 3 shades" },
      categoryIds: ["face-sunscreen", "skin-sensitive"],
      tags: ["sunscreen", "cushion"],
      price: 380,
      compareAtPrice: 420,
      cost: 140,
      stock: 110,
      lowStockThreshold: 15,
      images: ["https://cs12skincare.com.hk/wp-content/uploads/2024/03/CS12-SUN-CUSHION-IVORY-PINK-7-SAND-BEIGE-9-scaled.jpg"],
      ingredients: { zh: "氧化鋅、二氧化鈦", en: "Zinc Oxide, Titanium Dioxide" },
      howToUse: { zh: "日間最後一步，輕拍上妝", en: "Last step daytime, pat" },
      benefits: { zh: ["防曬", "提亮"], en: ["Sun protection", "Brightening"] },
      isBestseller: true,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 987,
      variants: [
        { id: "v1", name: { zh: "象牙白", en: "Ivory" }, price: 380, stock: 40, sku: "SS-IVORY" },
        { id: "v2", name: { zh: "96號 自然色", en: "#96 Natural" }, price: 380, stock: 50, sku: "SS-96" },
        { id: "v3", name: { zh: "沙米色", en: "Sand Beige" }, price: 380, stock: 30, sku: "SS-SAND" }
      ],
      active: true,
      createdAt: "2025-03-10"
    },
    {
      id: 6,
      sku: "CS12-CX-001",
      title: { zh: "CalmEX 精華 SOS急救精華", en: "CalmEX SOS Serum" },
      subtitle: { zh: "泛紅玫瑰痤瘡急救", en: "Redness Rosacea SOS" },
      description: { zh: "針對玫瑰痤瘡、濕疹反复發作的SOS精華，24小時內退紅。", en: "For rosacea, eczema flare SOS serum, redness reduced in 24h." },
      shortDesc: { zh: "玫瑰痤瘡急救", en: "Rosacea SOS" },
      categoryIds: ["series-calmmex", "face-essence", "skin-redness"],
      tags: ["calmex", "serum"],
      price: 520,
      compareAtPrice: 600,
      cost: 180,
      stock: 85,
      lowStockThreshold: 10,
      images: ["https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80"],
      ingredients: { zh: "CalmEX、甘草酸", en: "CalmEX, Glycyrrhizic acid" },
      howToUse: { zh: "重點塗抹泛紅處", en: "Apply on redness" },
      benefits: { zh: ["退紅", "抗炎"], en: ["Redness reduction", "Anti-inflammatory"] },
      isBestseller: false,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 512,
      variants: [],
      active: true,
      createdAt: "2025-04-01"
    },
    {
      id: 7,
      sku: "CS12-TRIAL-001",
      title: { zh: "CS12 體驗裝 (7日療敏)", en: "CS12 Trial Kit 7-Day" },
      subtitle: { zh: "第一次接觸CS12？", en: "First time with CS12?" },
      description: { zh: "包含奇蹟面膜2片、SoCalm 1、安瓶等，7天感受療敏奇蹟。", en: "Includes Miracle Mask x2, SoCalm 1, ampoule, experience miracle in 7 days." },
      shortDesc: { zh: "7日體驗", en: "7-day trial" },
      categoryIds: ["face-mask"],
      tags: ["trial", "kit"],
      price: 250,
      compareAtPrice: 400,
      cost: 90,
      stock: 200,
      lowStockThreshold: 30,
      images: ["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80"],
      ingredients: { zh: "精選配方", en: "Selected formulas" },
      howToUse: { zh: "按說明使用", en: "Follow instructions" },
      benefits: { zh: ["試用"], en: ["Trial"] },
      isBestseller: false,
      isFeatured: false,
      rating: 4.8,
      reviewCount: 2100,
      variants: [],
      active: true,
      createdAt: "2025-01-15"
    },
    {
      id: 8,
      sku: "CS12-BUNDLE-SUMMER",
      title: { zh: "盛夏冰涼修護套裝", en: "Summer Cooling Repair Set" },
      subtitle: { zh: "官網限定 低至HK$1198", en: "Online Exclusive from HK$1198" },
      description: { zh: "盛夏限定套裝，包含奇蹟面膜10片+SoCalm全套+防曬，冰涼修護一整夏。", en: "Summer exclusive set includes Miracle Mask x10 + SoCalm full + sunscreen, cool repair all summer." },
      shortDesc: { zh: "盛夏套裝", en: "Summer Set" },
      categoryIds: ["series-calmmex", "series-socalm"],
      tags: ["bundle", "summer"],
      price: 1198,
      compareAtPrice: 2000,
      cost: 500,
      stock: 50,
      lowStockThreshold: 5,
      images: ["https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png"],
      ingredients: { zh: "套裝組合", en: "Bundle combination" },
      howToUse: { zh: "按步驟護理", en: "Follow routine" },
      benefits: { zh: ["全套修護", "超值優惠"], en: ["Full repair", "Value"] },
      isBestseller: true,
      isFeatured: true,
      rating: 5.0,
      reviewCount: 342,
      variants: [],
      isBundle: true,
      bundleItems: [1, 2, 3, 5],
      active: true,
      createdAt: "2026-07-01"
    }
  ],
  bundles: [
    {
      id: 1,
      title: { zh: "冰涼盛夏護膚套裝 A", en: "Cool Summer Set A" },
      description: { zh: "奇蹟面膜5片+SoCalm 1+安瓶x2", en: "Miracle Mask 5 + SoCalm1 + Ampoule x2" },
      productIds: [1, 2, 3],
      discountType: "fixed_amount",
      discountValue: 300,
      price: 1198,
      originalPrice: 1498,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png",
      validFrom: "2026-07-07",
      validTo: "2026-07-31",
      active: true,
      badge: { zh: "限定優惠", en: "Limited" }
    },
    {
      id: 2,
      title: { zh: "敏感肌入門3步曲", en: "Sensitive Starter 3-Step" },
      description: { zh: "#SoCalm 1+2+CalmEX面霜", en: "#SoCalm 1+2+CalmEX Cream" },
      productIds: [2, 3, 4],
      discountType: "percentage",
      discountValue: 20,
      price: 1280,
      originalPrice: 1680,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/SoClam1200-1200x1200.png",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      active: true,
      badge: { zh: "熱賣", en: "Hot" }
    }
  ],
  coupons: [
    {
      id: 1,
      code: "NEWCS12",
      title: { zh: "首次購物15% OFF", en: "First Order 15% OFF" },
      description: { zh: "滿$1500享15% OFF 新客限定", en: "15% OFF over $1500 for new customers" },
      discountType: "percentage",
      discountValue: 15,
      minSpend: 1500,
      maxDiscount: null,
      usageLimit: 1000,
      usedCount: 234,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      firstOrderOnly: true,
      active: true,
      applicableProducts: [],
      applicableCategories: []
    },
    {
      id: 2,
      code: "PRESTIGE100",
      title: { zh: "會員生日 $100 優惠", en: "Birthday $100 Off" },
      description: { zh: "生日月份專用", en: "Birthday month only" },
      discountType: "fixed",
      discountValue: 100,
      minSpend: 500,
      usageLimit: null,
      usedCount: 89,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      firstOrderOnly: false,
      active: true,
      isBirthdayCoupon: true
    }
  ],
  customers: [
    {
      id: 1,
      email: "vip@test.com",
      name: "Yan Wong",
      phone: "91234567",
      password: "test1234", // demo only, plain text for mock
      tier: "signature",
      points: 12500,
      totalSpent: 12500,
      birthday: "1995-06-15",
      referralCode: "YAN2025",
      referredBy: null,
      avatar: "https://i.pravatar.cc/150?img=1",
      joinedAt: "2024-03-10",
      lastOrderAt: "2026-07-10",
      status: "active",
      addresses: [
        { id: 1, label: "Home", address: "Flat A, 10/F, Central", city: "Hong Kong", phone: "91234567", isDefault: true }
      ],
      wishlist: [1, 2],
      ordersCount: 8
    },
    {
      id: 2,
      email: "classic@test.com",
      name: "Vince Lee",
      phone: "92345678",
      password: "test1234",
      tier: "classic",
      points: 3200,
      totalSpent: 3200,
      birthday: "1990-11-20",
      referralCode: "VINCE50",
      referredBy: "YAN2025",
      avatar: "https://i.pravatar.cc/150?img=2",
      joinedAt: "2025-05-20",
      lastOrderAt: "2026-06-20",
      status: "active",
      addresses: [],
      wishlist: [],
      ordersCount: 3
    }
  ],
  orders: [
    {
      id: "ORD-20260710-001",
      customerId: 1,
      email: "vip@test.com",
      items: [
        { productId: 1, variantId: "v1", qty: 2, price: 320, title: { zh: "奇蹟面膜", en: "Miracle Mask" } },
        { productId: 2, variantId: null, qty: 1, price: 420, title: { zh: "#SoCalm 1", en: "#SoCalm 1" } }
      ],
      subtotal: 1060,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 1060,
      couponCode: null,
      gwpEligible: false,
      paymentMethod: "credit_card",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
      shippingAddress: { address: "Flat A, Central", city: "HK" },
      pointsEarned: 1590,
      pointsUsed: 0,
      createdAt: "2026-07-10T10:00:00Z"
    }
  ],
  reviews: [
    {
      id: 1,
      customerName: "Vince",
      avatar: "https://i.pravatar.cc/150?img=3",
      rating: 5,
      comment: { zh: "曬傷、起敏感時必備！鍾意每次敷上臉的冰涼感，真的feel到瞬間降溫，鎮靜退紅的效果真的很好！", en: "Must-have for sunburn & sensitivity! Love the cooling feel, instant temperature drop, great calming effect!" },
      productId: 1,
      productTitle: { zh: "奇蹟面膜 Miracle Mask", en: "Miracle Mask" },
      beforeAfter: null,
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Miracle-Mask_%E5%AE%A2%E4%BA%BAA%E5%B0%8F%E5%A7%90.jpg",
      date: "2026-03-10",
      verified: true
    },
    {
      id: 2,
      customerName: "Sabrina",
      avatar: "https://i.pravatar.cc/150?img=5",
      rating: 5,
      comment: { zh: "消除紅腫、鎮靜敏感、止痕", en: "Eliminates redness, calms sensitivity, stops itch" },
      productId: 1,
      productTitle: { zh: "奇蹟面膜 Miracle Mask", en: "Miracle Mask" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12-Before-After_2021-Salon-Customer-Sabrina.png",
      date: "2026-03-12",
      verified: true
    },
    {
      id: 3,
      customerName: "Yan",
      avatar: "https://i.pravatar.cc/150?img=9",
      rating: 5,
      comment: { zh: "每個月經期時肌膚都會突發乾燥、痕癢，奇蹟面膜可以成功止痕，同埋好補水！連之前抓傷的凹凸洞也修復到，現在的肌膚變得更有光澤", en: "During period skin gets dry & itchy, Miracle Mask stops itch and hydrates! Even scars repaired, skin more radiant now" },
      productId: 1,
      productTitle: { zh: "奇蹟面膜 Miracle Mask", en: "Miracle Mask" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Miracle-Mask_Pansy.jpg",
      date: "2026-02-20",
      verified: true
    },
    {
      id: 4,
      customerName: "Ting Ting",
      avatar: "https://i.pravatar.cc/150?img=10",
      rating: 5,
      comment: { zh: "沙漠肌終於得到滋潤，更有光澤，毛孔也細咗，面膜cutting好好，連眼周的細紋都修復到", en: "Desert skin finally hydrated, more radiant, pores smaller, great cutting, even eye fine lines repaired" },
      productId: 1,
      productTitle: { zh: "奇蹟面膜 Miracle Mask", en: "Miracle Mask" },
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Ting-Ting-1.jpg",
      date: "2026-01-15",
      verified: true
    }
  ],
  pageVisibility: {
    shop: true,
    bundles: true,
    membership: true,
    reviews: true
  }
};
