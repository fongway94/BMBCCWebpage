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
        zh: "‘要孝敬父母，使你得福，在世长寿。’ 这是第一条带应许的诫命。我们诚心欢迎大家携同父母及家人前来参加崇拜，齐心向神感恩。会后将备有丰盛的爱宴以及送给父母的精美伴手礼，让我们在温情和笑声中团聚！",
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
        zh: "黄传道专责社区关怀和‘五饼二鱼’事工，以温和而坚韧的爱心，长年穿梭在社区各角落，探望长者与贫寒家庭，用生命见证耶稣的恩典之光。",
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
  ]
};
