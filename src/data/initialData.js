export const initialData = {
  settings: {
    churchName: {
      zh: "大山脚浸信教会",
      en: "Bukit Mertajam Baptist Chinese Church"
    },
    churchAbbreviation: "BMBCC",
    slogan: {
      zh: "一个充满爱的家",
      en: "A Home Full of Love"
    },
    description: {
      zh: "在百利镇附近的家人们赶快来加入我们大山脚浸信教会的大家庭哦~！",
      en: "To our neighbors around Taman Bukit Minyak / Bukit Mertajam, come and join the big family of Bukit Mertajam Baptist Chinese Church~!"
    },
    themeYear: {
      zh: "2026年异象：走入社区，宣扬主爱",
      en: "2026 Vision: Enter the Community, Proclaim Lord's Love"
    },
    themeColor: "emerald", // 'emerald', 'indigo', 'blue', 'violet', 'amber'
    contactPhone: "+60 12-722 1808",
    contactEmail: "info@bmbcc.org",
    contactAddress: "Taman Bukit Minyak, 14000 Bukit Mertajam, Penang, Malaysia",
    aboutIntro: {
      zh: "大山脚浸信教会（BMBCC）是一个立足于社区、充满爱心与活力的大家庭。我们坚信圣经的真理，并以此为我们行事的准则。作为走入社区的教会，我们在社区关怀的事工上有很大的负担，渴望将神满满的恩典和爱分享给身边的每一个人。",
      en: "Bukit Mertajam Baptist Chinese Church (BMBCC) is a community-based, loving, and vibrant family. We firmly believe in the truth of the Bible and use it as our guide. As a church that reaches out, we have a heavy burden for community care ministries, yearning to share God's abundant grace and love with everyone around us."
    },
    aboutVision: {
      zh: "成为一个健康、充满主爱、积极宣教并服侍社区的门徒教会。",
      en: "To be a healthy, Christ-loving, active mission-oriented, and community-serving disciple church."
    },
    aboutMission: {
      zh: "走入百利镇及大山脚社区，广传耶稣基督的救恩福音，关怀弱势群体，并栽培生命成熟、热心服侍的门徒。",
      en: "Step into the communities of Taman Bukit Minyak and Bukit Mertajam, spread the gospel of salvation of Jesus Christ, care for the vulnerable, and nurture mature, service-oriented disciples."
    },
    adminPassword: "bmbccadmin123" // Simple default password, can be changed in settings
  },
  carousel: [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=1600&q=80",
      title: {
        zh: "展翅高飞，广传福音",
        en: "Soar High, Spread the Gospel"
      },
      subtitle: {
        zh: "神爱世人，甚至把他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。—— 約翰福音 3:16",
        en: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life. —— John 3:16"
      }
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80",
      title: {
        zh: "一个充满爱的大家庭",
        en: "A Big Family Filled with Love"
      },
      subtitle: {
        zh: "在百利镇附近的家人们赶快来加入我们，共享主爱里的温馨生活与喜乐。",
        en: "To our friends and neighbors nearby, come and join us to share the warmth, joy, and life in Christ."
      }
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&w=1600&q=80",
      title: {
        zh: "走入社区，宣扬主爱",
        en: "Enter the Community, Proclaim Lord's Love"
      },
      subtitle: {
        zh: "神满满的恩典浇灌并为我们在百利镇社区的事工大大地开路。哈利路亚！",
        en: "God's abundant grace is poured out, paving the way for our community work in Taman Bukit Minyak. Hallelujah!"
      }
    }
  ],
  timetable: [
    {
      id: 1,
      name: {
        zh: "主日联合崇拜",
        en: "Sunday Combined Service"
      },
      day: {
        zh: "星期日",
        en: "Sunday"
      },
      time: "10:00 AM - 11:30 AM",
      location: {
        zh: "教会主堂 / 线上直播",
        en: "Church Sanctuary / Online Live"
      },
      language: {
        zh: "华语 (备有英文同声传译)",
        en: "Chinese (English translation available)"
      }
    },
    {
      id: 2,
      name: {
        zh: "青年团契",
        en: "Youth Fellowship"
      },
      day: {
        zh: "星期六",
        en: "Saturday"
      },
      time: "7:30 PM - 9:30 PM",
      location: {
        zh: "二楼副堂",
        en: "2nd Floor Hall"
      },
      language: {
        zh: "华语 / 英语 (双语)",
        en: "Chinese / English (Bilingual)"
      }
    },
    {
      id: 3,
      name: {
        zh: "儿童主日学",
        en: "Children Sunday School"
      },
      day: {
        zh: "星期日",
        en: "Sunday"
      },
      time: "10:00 AM - 11:30 AM",
      location: {
        zh: "主日学教室 A & B",
        en: "Sunday School Classrooms A & B"
      },
      language: {
        zh: "华语 / 英语",
        en: "Chinese / English"
      }
    },
    {
      id: 4,
      name: {
        zh: "教会周二祷告会",
        en: "Tuesday Church Prayer Meeting"
      },
      day: {
        zh: "星期二",
        en: "Tuesday"
      },
      time: "8:00 PM - 9:15 PM",
      location: {
        zh: "Zoom 线上会议",
        en: "Zoom Online Meeting"
      },
      language: {
        zh: "华语",
        en: "Chinese"
      }
    },
    {
      id: 5,
      name: {
        zh: "姐妹团契",
        en: "Sisters Fellowship"
      },
      day: {
        zh: "每双周四",
        en: "Alternate Thursdays"
      },
      time: "2:30 PM - 4:00 PM",
      location: {
        zh: "教会会议室",
        en: "Church Meeting Room"
      },
      language: {
        zh: "华语",
        en: "Chinese"
      }
    }
  ],
  ministries: [
    {
      id: 1,
      name: {
        zh: "爱邻社区关怀 ❤",
        en: "Neighborly Community Care ❤"
      },
      image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "大山脚浸信教会是走入社区的教会，在于社区关怀的事工有很大的负担。爱邻社区关怀包括一系列的社区服务与关怀，包括家庭探访、辅导支持、节日慰问及物资援助，把基督的温暖和实际的援助送到每一户有需要的家庭中。",
        en: "Bukit Mertajam Baptist Chinese Church is a church that steps into the community, carrying a strong commitment to local welfare. Neighborly Community Care includes home visitation, counselling support, seasonal greetings, and food aid, delivering Christ's warmth and practical relief to vulnerable families."
      }
    },
    {
      id: 2,
      name: {
        zh: "五饼二鱼 🐟",
        en: "Five Loaves & Two Fishes 🐟"
      },
      image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "由教会同工与义工团队爱心筹备，为百利镇社区里处于贫困、残疾、孤寡或行动不便的弱势群体，提供每日/每周的营养爱心便当派送服务。透过这份看似微薄的便当，传递神无限的顾念与无限的供给。",
        en: "Lovingly prepared by our staff and volunteer teams, this ministry provides nutritious bento meal deliveries to low-income, disabled, solitary elderly, or mobility-impaired individuals. Through these simple boxes of meals, we convey God's unlimited care and provision."
      }
    },
    {
      id: 3,
      name: {
        zh: "恩典之泉老人中心",
        en: "Spring of Grace Elderly Care Centre"
      },
      image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "一所基督信仰背景的老人日间照顾与福音中心。在这里，年长者不仅能在舒适、安全的硬件设施中获得生活起居上的贴心陪伴，更能通过赞美操、手工、团契歌唱和圣经分享，让身心灵得着饱足，拥有喜乐丰盛的晚年。",
        en: "A faith-centered day care and gospel outreach centre for the elderly. Here, seniors enjoy warm companionship in a safe, comfortable facility. They keep active with physical praise exercises, crafts, singing, and Bible sharing, nurturing their mind, body, and spirit in their golden years."
      }
    }
  ],
  events: [
    {
      id: 1,
      title: {
        zh: "双亲节联合感恩崇拜",
        en: "Parents' Day Thanksgiving Service"
      },
      date: "2026-06-21",
      time: "10:00 AM - 12:30 PM",
      location: {
        zh: "教会主堂",
        en: "Church Sanctuary"
      },
      image: "https://images.unsplash.com/photo-1545232979-8bf34eb9757b?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "'要孝敬父母，使你得福，在世长寿。' 这是第一条带应许的诫命。我们诚心欢迎大家携同父母及家人前来参加崇拜，齐心向神感恩。会后将备有丰盛的爱宴以及送给父母的精美伴手礼，让我们在温情和笑声中团聚！",
        en: "'Honor your father and mother'—which is the first commandment with a promise. We warmly welcome everyone to bring parents and families for a morning of worship and gratitude. Following the service, we will share a loving feast and hand out special gifts to parents. Let's gather in love!"
      }
    },
    {
      id: 2,
      title: {
        zh: "社区健康日与免费义诊",
        en: "Community Health Day & Free Clinic"
      },
      date: "2026-08-15",
      time: "9:00 AM - 1:00 PM",
      location: {
        zh: "教会多元化中心",
        en: "Church Multipurpose Centre"
      },
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "关爱社区，从健康开始。本次活动由教会联合本地医疗团队举办，免费提供血压、血糖测量、眼科基础筛查、中医针灸诊疗与专业健康饮食咨询。欢迎社区居民男女老幼一同来关心身体健康。现场亦设趣味益智儿童角！",
        en: "Caring for our community starts with health. Co-organized with local medical professionals, this event offers free blood pressure, blood glucose tests, basic eye screenings, traditional Chinese medicine consultations, and dietary advice. We welcome neighbors of all ages. A fun children's corner is also available!"
      }
    },
    {
      id: 3,
      title: {
        zh: "2026 青年营会：《点燃》",
        en: "Youth Camp 2026: 'Ignite'"
      },
      date: "2026-12-10",
      time: "3 Days 2 Nights",
      location: {
        zh: "大山脚营地 / 户外基地",
        en: "Bukit Mertajam Campsite"
      },
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80",
      description: {
        zh: "呼召大山脚与全马各地青年在主爱里集结！在营会中，我们一起打破藩篱，通过充满活力的现代赞美、点燃生命的先知讲道、激动人心的户外拓展，探索生命的价值和崇高使命。期待你的到来，让圣灵之火在心中彻底燃烧！",
        en: "Calling all youths from Bukit Mertajam and beyond to unite! Break barriers as we explore life's value and purpose. Through modern praise & worship, inspiring messages, and adventurous outdoor teambuilding, prepare to be ignited by the Holy Spirit. See you there!"
      }
    }
  ],
  leadership: [
    {
      id: 1,
      name: {
        zh: "陈福林 牧师",
        en: "Pastor Tan Hock Lim"
      },
      role: {
        zh: "主任牧师",
        en: "Lead Pastor"
      },
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
      bio: {
        zh: "陈福林牧师神学硕士毕业，忠心服侍主已逾十五年。他胸怀社区宣教异象，对百利镇及大山脚社区的灵魂有着深沉的爱，致力带领教会走出四墙、宣扬主爱。",
        en: "Pastor Tan graduated with a Master of Divinity and has faithfully served for over 15 years. With a strong vision for community outreach, he carries a deep burden for Bukit Mertajam, leading the church to go beyond walls."
      }
    },
    {
      id: 2,
      name: {
        zh: "黄淑珍 传道",
        en: "Evangelist Ooi Sock Chin"
      },
      role: {
        zh: "社区事工及关怀负责人",
        en: "Community & Care Minister"
      },
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      bio: {
        zh: "黄传道专责社区关怀和'五饼二鱼'事工，以温和而坚韧的爱心，长年穿梭在社区各角落，探望长者与贫寒家庭，用生命见证耶稣的恩典之光。",
        en: "Evangelist Ooi is in charge of community care and 'Five Loaves & Two Fishes'. With gentle but steadfast love, she visits elderly and vulnerable families, bearing witness to Jesus' grace."
      }
    },
    {
      id: 3,
      name: {
        zh: "李佳明 长老",
        en: "Elder Lee Jia Ming"
      },
      role: {
        zh: "成人与门徒培育负责人",
        en: "Adult & Discipleship Director"
      },
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
      bio: {
        zh: "李长老致力培育基督门徒。多年来他深耕教会主日学和成人神学课程，致力于巩固弟兄姐妹的真理根基，使其行在神喜悦的诫命之中。",
        en: "Elder Lee is dedicated to nurturing disciples. For years he has developed the church Sunday school and adult discipleship courses, seeking to build deep biblical foundations for members."
      }
    }
  ],
  // ===== NEW: OFFERINGS DATA =====
  offerings: {
    intro: {
      zh: "感恩您愿意以奉献来支持神在大山脚浸信教会的事工。您的每一份奉献都将被善用于教会运营、社区关怀、宣教扩展等神圣使命。我们承诺透明、忠心地管理每一分善款。",
      en: "Thank you for your willingness to support BMBCC's ministry through your tithes and offerings. Every contribution is faithfully used for church operations, community care, missions, and other holy endeavors. We promise transparent and faithful stewardship of every donation."
    },
    scripture: {
      zh: "「你们要将当纳的十分之一全部送入仓库，使我家有粮。以此试试我，是否为你们敞开天上的窗户，倾福与你们，甚至无处可容。」—— 玛拉基书 3:10",
      en: "\"Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the Lord Almighty, and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.\" —— Malachi 3:10"
    },
    methods: [
      {
        id: 1,
        title: {
          zh: "主日崇拜现场奉献",
          en: "In-Person Sunday Offering"
        },
        description: {
          zh: "欢迎在主日崇拜期间将奉献投入教会门口的奉献箱，或使用实体二维码（QR Code）进行电子奉献。",
          en: "You may place your offering in the collection boxes at the church entrance during Sunday worship, or use our physical QR Code for e-giving."
        },
        icon: "heart",
        details: {
          zh: "教会大厅门口设有多个奉献箱，亦可使用 Touch 'n Go eWallet、DuitNow QR 等电子支付方式。",
          en: "Collection boxes are available at the sanctuary entrance. We also accept Touch 'n Go eWallet, DuitNow QR, and other e-payment methods."
        }
      },
      {
        id: 2,
        title: {
          zh: "银行转账",
          en: "Bank Transfer"
        },
        description: {
          zh: "您可通过银行转账将奉献汇入以下教会官方账户：",
          en: "You may transfer your offering directly to the church's official bank account:"
        },
        icon: "building",
        details: {
          zh: "银行名称：Maybank (马来亚银行)\n户名：Bukit Mertajam Baptist Chinese Church\n账号：1234-5678-9012\n（转账后请截图或WhatsApp联系教会同工确认）",
          en: "Bank Name: Maybank\nAccount Name: Bukit Mertajam Baptist Chinese Church\nAccount No: 1234-5678-9012\n(Please screenshot or WhatsApp our staff after transfer for confirmation)"
        }
      },
      {
        id: 3,
        title: {
          zh: "线上电子奉献",
          en: "Online E-Giving"
        },
        description: {
          zh: "使用以下二维码直接扫码奉献，安全又方便：",
          en: "Simply scan the QR code below to give conveniently and securely:"
        },
        icon: "smartphone",
        details: {
          zh: "支持 DuitNow QR / Touch 'n Go / GrabPay / Boost 等主流电子钱包。请在转账备注中注明姓名与奉献用途（如：十一奉献 / 感恩奉献 / 建堂基金等）。",
          en: "Supports DuitNow QR / Touch 'n Go / GrabPay / Boost and other major e-wallets. Please include your name and purpose (e.g., Tithe / Thank Offering / Building Fund) in the transfer note."
        }
      }
    ],
    contactNote: {
      zh: "如有任何关于奉献的疑问，请联系教会办公室或WhatsApp：+60 12-722 1808",
      en: "For any questions regarding offerings, please contact the church office or WhatsApp: +60 12-722 1808"
    }
  },
  // ===== NEW: BULLETINS DATA =====
  bulletins: [
    {
      id: 1,
      title: {
        zh: "2026年7月13日 主日周报",
        en: "July 13, 2026 Sunday Bulletin"
      },
      date: "2026-07-13",
      category: {
        zh: "周报",
        en: "Weekly Bulletin"
      },
      fileUrl: "#",
      summary: {
        zh: "本周主日信息摘要、代祷事项、小组聚会通知及下周日程预告。欢迎下载完整周报了解教会最新动态。",
        en: "This week's Sunday message summary, prayer requests, small group meeting notices, and upcoming schedule preview. Download the full bulletin for the latest church updates."
      },
      highlights: {
        zh: "• 主日信息：「行走在光中」\n• 本周祷告重点：社区健康日筹备\n• 下周六青年团契特别活动预告",
        en: "• Sunday Message: 'Walking in the Light'\n• Prayer Focus: Community Health Day Preparation\n• Next Saturday Youth Fellowship Special Event Preview"
      }
    },
    {
      id: 2,
      title: {
        zh: "2026年7月6日 主日周报",
        en: "July 6, 2026 Sunday Bulletin"
      },
      date: "2026-07-06",
      category: {
        zh: "周报",
        en: "Weekly Bulletin"
      },
      fileUrl: "#",
      summary: {
        zh: "双亲节感恩崇拜回顾、爱邻社区关怀最新探访报告及七月份教会活动总览。",
        en: "Parents' Day Thanksgiving Service recap, Neighborly Community Care visitation report, and July church activities overview."
      },
      highlights: {
        zh: "• 双亲节崇拜回顾照片\n• 爱邻社区探访报告\n• 七月份生日名单及祝福",
        en: "• Parents' Day Service Photo Recap\n• Neighborly Care Visitation Report\n• July Birthday List & Blessings"
      }
    },
    {
      id: 3,
      title: {
        zh: "2026年6月教会月刊",
        en: "June 2026 Church Monthly Newsletter"
      },
      date: "2026-06-30",
      category: {
        zh: "月刊",
        en: "Monthly Newsletter"
      },
      fileUrl: "#",
      summary: {
        zh: "六月份教会大事记：五饼二鱼事工扩展、恩典之泉老人中心新课程、青年营会报名启动等精彩内容。",
        en: "June highlights: Five Loaves & Two Fishes ministry expansion, Spring of Grace new programs, Youth Camp registration launch, and more."
      },
      highlights: {
        zh: "• 五饼二鱼新增10户派送家庭\n• 恩典之泉新增赞美操课程\n• 青年营会《点燃》正式开放报名\n• 上半年财务透明报告",
        en: "• Five Loaves adds 10 new delivery families\n• Spring of Grace launches praise exercise class\n• Youth Camp 'Ignite' registration open\n• First-half financial transparency report"
      }
    }
  ],
  // ===== NEW: CELL GROUPS DATA =====
  cellGroups: [
    {
      id: 1,
      name: {
        zh: "以马忤斯小组 (Emmanuel)",
        en: "Emmaus Cell Group"
      },
      leader: {
        zh: "张伟明 弟兄 & 王美玲 姐妹",
        en: "Bro. Teo Wei Ming & Sis. Wong Mei Ling"
      },
      schedule: {
        zh: "每周五晚上 8:00 PM",
        en: "Every Friday 8:00 PM"
      },
      location: {
        zh: "Taman Bukit Minyak 第5区 (伟明兄家)",
        en: "Taman Bukit Minyak Zone 5 (Bro. Teo's home)"
      },
      target: {
        zh: "已婚青年夫妇 (25-40岁)",
        en: "Married Young Couples (25-40 years old)"
      },
      description: {
        zh: "以马忤斯小组专注于青年夫妇的属灵成长与家庭关系建立。我们通过查经分享、彼此代祷和生活互助，在主爱中一同成长。欢迎年轻家庭加入我们温馨的小组聚会！",
        en: "Emmaus Cell Group focuses on the spiritual growth and relationship building of young married couples. Through Bible study, mutual prayer, and life sharing, we grow together in the Lord's love. Young families are welcome to join our warm gatherings!"
      },
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b8f2?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 2,
      name: {
        zh: "活水小组 (Living Water)",
        en: "Living Water Cell Group"
      },
      leader: {
        zh: "陈家豪 弟兄",
        en: "Bro. Chen Jia Hao"
      },
      schedule: {
        zh: "每周四晚上 7:30 PM",
        en: "Every Thursday 7:30 PM"
      },
      location: {
        zh: "Alma Selatan 社区活动中心",
        en: "Alma Selatan Community Hall"
      },
      target: {
        zh: "单身青年 (18-30岁)",
        en: "Single Youth (18-30 years old)"
      },
      description: {
        zh: "活水小组是一个充满活力的青年群体，专注于信仰探索、职场见证和彼此激励。我们结合圣经教导与现实生活议题，帮助青年在职场和生活中活出信仰。",
        en: "Living Water is a vibrant youth community focused on faith exploration, workplace testimony, and mutual encouragement. We combine biblical teaching with real-life issues, helping youth live out their faith in career and daily life."
      },
      image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 3,
      name: {
        zh: "恩典小组 (Grace)",
        en: "Grace Cell Group"
      },
      leader: {
        zh: "林淑芬 姐妹",
        en: "Sis. Lim Shuk Fern"
      },
      schedule: {
        zh: "每周六下午 3:00 PM",
        en: "Every Saturday 3:00 PM"
      },
      location: {
        zh: "Taman Cengal 第3区 (淑芬姐家)",
        en: "Taman Cengal Zone 3 (Sis. Lim's home)"
      },
      target: {
        zh: "中年及以上弟兄姐妹 (40岁以上)",
        en: "Middle-aged & Senior Members (40+ years old)"
      },
      description: {
        zh: "恩典小组由一群热爱主的中老年弟兄姐妹组成。我们通过深度查经、生命分享和户外灵修，在主里彼此建立、互相扶持。聚会后通常有丰富茶点， fellowship 气氛温馨。",
        en: "Grace Cell Group is composed of middle-aged and senior members who love the Lord. Through in-depth Bible study, life sharing, and outdoor devotionals, we build each other up. Fellowship tea time after each meeting adds warmth to our gatherings."
      },
      image: "https://images.unsplash.com/photo-1544027993-37db34262766?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 4,
      name: {
        zh: "芥菜种小组 (Mustard Seed)",
        en: "Mustard Seed Cell Group"
      },
      leader: {
        zh: "李志文 弟兄 & 李太太",
        en: "Bro. Lee Zhi Wen & Mrs. Lee"
      },
      schedule: {
        zh: "每周三晚上 8:00 PM",
        en: "Every Wednesday 8:00 PM"
      },
      location: {
        zh: "Permatang Rawa 区域 (线上 Zoom 同步)",
        en: "Permatang Rawa Area (with Zoom option)"
      },
      target: {
        zh: "家庭小组 (欢迎所有年龄段)",
        en: "Family Group (All ages welcome)"
      },
      description: {
        zh: "芥菜种小组欢迎整个家庭一起加入！我们相信信仰传承从家庭开始，大人和孩子们一起在神的话语中成长。小组提供儿童看顾服务，让父母安心参与查经。",
        en: "Mustard Seed Cell Group welcomes entire families! We believe faith传承 starts at home, with adults and children growing together in God's Word. Childcare is provided so parents can fully engage in Bible study."
      },
      image: "https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=600&q=80"
    }
  ],
  // ===== NEW: NEW FRIEND GUIDE DATA =====
  newFriendGuide: {
    welcome: {
      zh: "亲爱的新朋友，欢迎您来到大山脚浸信教会！我们为您准备了以下指南，帮助您了解教会的方方面面，让您更快融入这个充满爱的大家庭。",
      en: "Dear new friend, welcome to Bukit Mertajam Baptist Chinese Church! We have prepared this guide to help you understand our church and settle into this loving family more quickly."
    },
    sections: [
      {
        id: 1,
        title: {
          zh: "🕐 主日崇拜流程",
          en: "🕐 Sunday Service Flow"
        },
        content: {
          zh: "我们的主日崇拜于每周日上午10:00准时开始，约于11:30结束。崇拜流程包括：\n\n• 9:45 AM - 入座与诗歌预热\n• 10:00 AM - 开始祷告与赞美敬拜\n• 10:30 AM - 牧师证道/讲道\n• 11:15 AM - 回应祷告与奉献\n• 11:30 AM - 祝福与散会\n\n崇拜后欢迎到一楼大厅参加茶点时间，与弟兄姐妹交流认识。",
          en: "Our Sunday worship begins at 10:00 AM and ends around 11:30 AM. The service flow includes:\n\n• 9:45 AM - Seating & Prelude Songs\n• 10:00 AM - Opening Prayer & Praise/Worship\n• 10:30 AM - Pastoral Sermon/Message\n• 11:15 AM - Response Prayer & Offering\n• 11:30 AM - Benediction & Dismissal\n\nAfter the service, please join us for tea time at the 1st Floor Hall to meet fellow members."
        }
      },
      {
        id: 2,
        title: {
          zh: "👶 儿童主日学",
          en: "👶 Children's Sunday School"
        },
        content: {
          zh: "如果您带着孩子来教会，不用担心！我们在主日崇拜同时段（10:00 AM - 11:30 AM）设有儿童主日学，分为：\n\n• 幼儿班 (3-5岁)：通过故事、手工、歌唱认识耶稣\n• 儿童班 (6-12岁)：系统化的圣经课程、小组讨论和趣味活动\n\n主日学教室位于主堂旁边，由专业的儿童事工老师带领。您的孩子将在安全、快乐的环境中学习神的真理！",
          en: "If you bring children, don't worry! We run Children's Sunday School concurrently (10:00 AM - 11:30 AM), divided into:\n\n• Toddlers (3-5): Learning about Jesus through stories, crafts, and songs\n• Children (6-12): Systematic Bible curriculum, small group discussions, and fun activities\n\nSunday School classrooms are next to the main sanctuary, led by trained children's ministry teachers. Your kids will learn God's truth in a safe, joyful environment!"
        }
      },
      {
        id: 3,
        title: {
          zh: "🤝 如何加入小组/团契",
          en: "🤝 How to Join a Cell Group"
        },
        content: {
          zh: "小组（Cell Group）是我们教会最重要的团契生活单元。每个小组由10-20位弟兄姐妹组成，定期在家中聚会查经、祷告和分享生命。\n\n如何加入？\n1. 查看「小组」页面了解各小组详情\n2. 选择适合您的时间/地点/年龄层的小组\n3. 崇拜后联系接待同工或直接在小组页面填写联系表\n4. 小组负责人将主动联系您并邀请您参加！\n\n我们鼓励每位弟兄姐妹加入一个小组，因为属灵的成长需要在群体中彼此扶持。",
          en: "Cell Groups are the most important unit of fellowship life in our church. Each group of 10-20 members meets regularly in homes for Bible study, prayer, and life sharing.\n\nHow to join:\n1. Visit our 'Cell Groups' page to see group details\n2. Choose a group that fits your schedule/location/age range\n3. After worship, contact our welcome team or use the contact form on the group page\n4. The group leader will reach out and invite you!\n\nWe encourage every member to join a cell group, as spiritual growth thrives in community."
        }
      },
      {
        id: 4,
        title: {
          zh: "💰 关于奉献",
          en: "💰 About Giving"
        },
        content: {
          zh: "奉献是回应神恩典的具体行动。我们欢迎所有愿意以财务支持教会事工的朋友。\n\n奉献方式：\n• 主日崇拜现场奉献箱\n• 银行转账 (Maybank)\n• 电子钱包扫码 (DuitNow QR / Touch 'n Go / GrabPay)\n\n请注意：奉献完全是自愿的，不加入教会也可以奉献。如果您是首次到访，无需感到压力，先认识我们的信仰和社区。详情请查看「奉献」页面。",
          en: "Giving is a tangible response to God's grace. We welcome all who wish to support the church financially.\n\nGiving methods:\n• In-person offering boxes during Sunday worship\n• Bank transfer (Maybank)\n• E-wallet QR scan (DuitNow QR / Touch 'n Go / GrabPay)\n\nNote: Giving is completely voluntary. You don't need to be a member to give. As a first-time visitor, there is no pressure—get to know our faith and community first. See the 'Offerings' page for details."
        }
      },
      {
        id: 5,
          title: {
            zh: "📍 第一次来访指南",
            en: "📍 First Visit Guide"
          },
          content: {
            zh: "欢迎您第一次来到大山脚浸信教会！\n\n• 停车：教会前方及后方均设有免费停车场\n• 报到：进入大厅后，接待同工将在门口热情迎接您\n• 座位：欢迎自由选择座位，前排更佳体验\n• 儿童：如需儿童主日学服务，请在签到时告知\n• 茶点：崇拜后一楼大厅提供免费茶点，欢迎留下与弟兄姐妹交流\n• 新朋友礼：首次到访的朋友将获得精美小礼品和教会手册！\n\n如需任何帮助，请随时联系接待处的同工，他们很乐意为您服务。",
            en: "Welcome to your first visit to BMBCC!\n\n• Parking: Free parking available at the front and rear of the church\n• Check-in: Our welcome team will greet you warmly at the entrance\n• Seating: Feel free to choose any seat—front rows for a better experience\n• Children: If you need Sunday School, please let us know at check-in\n• Refreshments: Free refreshments after service at the 1st Floor Hall\n• New Friend Gift: First-time visitors receive a welcome gift pack and church brochure!\n\nFor any assistance, please approach our welcome team—they're happy to serve you."
          }
      }
    ]
  },
  // ===== NEW: MAPS DATA =====
  maps: {
    googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.0!2d100.4!3d5.37!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zQnVraXQgTWVydGFqYW0!5e0!3m2!1sen!2smy!4v1",
    address: {
      zh: "大山脚浸信教会\nTaman Bukit Minyak, 14000 Bukit Mertajam, Pulau Pinang, Malaysia",
      en: "Bukit Mertajam Baptist Chinese Church\nTaman Bukit Minyak, 14000 Bukit Mertajam, Penang, Malaysia"
    },
    directions: {
      zh: "如何到达：\n\n🚗 自驾车：\n从南北大道（PLUS Highway）大山脚出口下，沿Jalan Bukit Minyak行驶约3公里即可到达。教会建筑位于道路右侧，设有明显十字架标志。\n\n🚌 公共交通：\n可搭乘 Rapid Penang 巴士 701/702 号至 Taman Bukit Minyak 站下车，步行约5分钟即到。\n\n🅿️ 停车：\n教会前方及后方均设有免费停车场，可容纳约50辆车。",
      en: "How to get here:\n\n🚗 By Car:\nTake the Bukit Mertajam exit from PLUS Highway, drive along Jalan Bukit Minyak for about 3km. The church building is on the right side with a prominent cross sign.\n\n🚌 Public Transport:\nTake Rapid Penang Bus 701/702 to Taman Bukit Minyak stop, a 5-minute walk to the church.\n\n🅿️ Parking:\nFree parking available at the front and rear of the church, accommodating approximately 50 vehicles."
    },
    landmarks: {
      zh: "附近地标：\n• Bukit Minyak 商业中心 (500米)\n• AEON Mall Bukit Mertajam (2公里)\n• SMK Bukit Minyak 学校 (300米)",
      en: "Nearby Landmarks:\n• Bukit Minyak Commercial Centre (500m)\n• AEON Mall Bukit Mertajam (2km)\n• SMK Bukit Minyak School (300m)"
    }
  }
};
