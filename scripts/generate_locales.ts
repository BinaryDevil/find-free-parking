import fs from "fs";
import path from "path";

const keys = {
  HomePage: {
    title: "Find Free Parking",
    searchPlaceholder: "Search for an address or place",
    useMyLoc: "Use current location",
    startParking: "Start parking",
    now: "now",
    free: "Free",
    paid: "Paid",
    noneFound: "None found",
    freeParkingCount: "Free parking: {count}",
    paidParkingCount: "Paid parking: {count}",
    regionNotSupported: "Region not supported",
    regionNotSupportedDesc: "We currently only support specific cities.",
    requestCity: "Request City",
    helpTitle: "How to use",
    legendTitle: "Map Legend",
    unrestricted: "Unrestricted",
    restricted: "Restricted / Paid",
    freeLimited: "Free (Time Limited)",
    permit: "Permit Only",
    mixed: "Mixed Rules",
    unknown: "Unknown Status",
    reports: "Community Reports",
    verifiedFree: "Verified Free",
    reportedPaid: "Reported as Paid",
    getDirections: "Get Directions",
    updateStatus: "Update Status",
    walkEstimates: "{minutes} min walk ({distance}m)",
    toDestination: "To Destination:",
    timeLimit: "{minutes} min limit",
    checkSigns: "Check local signs.",
    verificationRequired: "Verification required. Check local signs.",
    loading: "Loading...",
    freeParking: "Free parking",
    paidParking: "Paid parking",
    spots: "{count} spots",
    blocks: "{count} blocks",
    lots: "{count} lots",
    metaDescription:
      "Find free parking, street parking rules, and meter rates in your city. Real-time map with verified spots.",
    metaKeywords:
      "free parking, street parking, parking map, parking meters, parking rules, cheap parking",
  },
  ReportModal: {
    title: "Update Status",
    thankYou: "Thank you for your report!",
    statusCorrect: "Status is Correct",
    statusIncorrect: "Status is Incorrect",
    comments: "Comments (optional)",
    submit: "Submit Report",
    cancel: "Cancel",
    other: "Other",
  },
  HelpModal: {
    title: "How to convert to free parking",
    desc: "Green lines represent likely free street parking.",
    greenTitle: "Green is Free",
    redLines: "Red lines are paid or restricted.",
    realTimeUpdates: "Real-time Updates",
    realTimeDesc: "We check regulations instantly so you don't have to guess.",
    doubleCheck: "Double Check Signs",
    doubleCheckDesc:
      "Data can be imperfect. Always verify local signs before leaving your car.",
    betaTitle: "Beta Version:",
    betaDesc:
      "This app is under active development. Please expect occasional issues.",
    startParking: "Start Parking",
    dontShowAgain: "Don't show this again",
  },
};

const translations: Record<string, any> = {
  zh: {
    HomePage: {
      title: "寻找免费停车",
      searchPlaceholder: "搜索地址或地点",
      useMyLoc: "使用当前位置",
      startParking: "开始停车",
      now: "现在",
      free: "免费",
      paid: "付费",
      noneFound: "未找到",
      regionNotSupported: "不支持该区域",
      requestCity: "请求开通城市",
      helpTitle: "如何使用",
      getDirections: "获取路线",
      updateStatus: "更新状态",
      walkEstimates: "步行 {minutes} 分钟 ({distance}米)",
      toDestination: "前往目的地:",
      timeLimit: "限时 {minutes} 分钟",
      checkSigns: "请检查路牌。",
      verificationRequired: "需验证。请检查路牌。",
      loading: "加载中...",
      freeParking: "免费停车",
      paidParking: "付费停车",
      spots: "{count} 个车位",
      blocks: "{count} 个街区",
      lots: "{count} 个停车场",
      metaDescription:
        "查找您所在城市的免费停车位、路边停车规则和咪表费率。带有经过验证的停车位的实时地图。",
      metaKeywords:
        "免费停车, 路边停车, 停车地图, 停车咪表, 停车规则, 便宜停车",
    },
    ReportModal: {
      title: "更新状态",
      submit: "提交报告",
      cancel: "取消",
      other: "其他",
    },
    HelpModal: {
      title: "如何寻找免费停车",
      desc: "绿线表示可能免费的路边停车。",
      greenTitle: "绿色即免费",
      redLines: "红线表示付费或受限。",
      realTimeUpdates: "实时更新",
      realTimeDesc: "我们即时检查法规，无需猜测。",
      doubleCheck: "复核路牌",
      doubleCheckDesc: "数据可能不完美。离开车辆前请务必确认当地路牌。",
      betaTitle: "测试版:",
      betaDesc: "此应用正在积极开发中。请谅解偶尔出现的问题。",
      startParking: "开始停车",
      dontShowAgain: "不再显示",
    },
  },
  es: {
    HomePage: {
      title: "Encontrar Estacionamiento Gratis",
      searchPlaceholder: "Buscar dirección o lugar",
      useMyLoc: "Usar ubicación actual",
      startParking: "Empezar aparcamiento",
      now: "ahora",
      free: "Gratis",
      paid: "Pago",
      noneFound: "No encontrado",
      regionNotSupported: "Región no soportada",
      requestCity: "Solicitar Ciudad",
      helpTitle: "Cómo usar",
      getDirections: "Cómo llegar",
      updateStatus: "Actualizar Estado",
      walkEstimates: "{minutes} min caminando ({distance}m)",
      toDestination: "Al Destino:",
      timeLimit: "límite {minutes} min",
      checkSigns: "Verifique las señales.",
      verificationRequired: "Verificación requerida. Verifique señales.",
      loading: "Cargando...",
      freeParking: "Estacionamiento gratis",
      paidParking: "Estacionamiento de pago",
      spots: "{count} espacios",
      blocks: "{count} cuadras",
      lots: "{count} lotes",
      metaDescription:
        "Encuentra estacionamiento gratuito, reglas de estacionamiento en la calle y tarifas de parquímetros en tu ciudad. Mapa en tiempo real con lugares verificados.",
      metaKeywords:
        "estacionamiento gratis, estacionamiento en la calle, mapa de estacionamiento, parquímetros, reglas de estacionamiento, estacionamiento barato",
    },
    ReportModal: {
      title: "Actualizar Estado",
      submit: "Enviar Informe",
      cancel: "Cancelar",
      other: "Otro",
    },
    HelpModal: {
      title: "Cómo encontrar estacionamiento gratis",
      desc: "Las líneas verdes indican estacionamiento probablemente gratis.",
      greenTitle: "Verde es Gratis",
      redLines: "Las líneas rojas son de pago o restringidas.",
      realTimeUpdates: "Actualizaciones en tiempo real",
      realTimeDesc:
        "Verificamos las regulaciones al instante para que no tenga que adivinar.",
      doubleCheck: "Verificar señales",
      doubleCheckDesc:
        "Los datos pueden ser imperfectos. Siempre verifique las señales locales.",
      betaTitle: "Versión Beta:",
      betaDesc:
        "Esta aplicación está en desarrollo activo. Espere problemas ocasionales.",
      startParking: "Estacionar",
      dontShowAgain: "No volver a mostrar",
    },
  },
  fr: {
    HomePage: {
      title: "Trouver Parking Gratuit",
      searchPlaceholder: "Rechercher une adresse",
      useMyLoc: "Ma position",
      startParking: "Début stationnement",
      now: "maintenant",
      free: "Gratuit",
      paid: "Payant",
      noneFound: "Aucun résultat",
      regionNotSupported: "Région non prise en charge",
      requestCity: "Demander Ville",
      helpTitle: "Comment utiliser",
      getDirections: "Itinéraire",
      updateStatus: "Mettre à jour",
      walkEstimates: "{minutes} min à pied ({distance}m)",
      toDestination: "Vers destination:",
      timeLimit: "limite {minutes} min",
      checkSigns: "Vérifiez les panneaux.",
      verificationRequired: "Vérification requise.",
      loading: "Chargement...",
      freeParking: "Parking gratuit",
      paidParking: "Parking payant",
      spots: "{count} places",
      blocks: "{count} rues",
      lots: "{count} parkings",
      metaDescription:
        "Trouvez un parking gratuit, les règles de stationnement dans la rue et les tarifs des parcmètres dans votre ville. Carte en temps réel avec des places vérifiées.",
      metaKeywords:
        "parking gratuit, stationnement dans la rue, carte de stationnement, parcmètres, règles de stationnement, parking pas cher",
    },
    ReportModal: {
      title: "Mettre à jour",
      submit: "Envoyer",
      cancel: "Annuler",
      other: "Autre",
    },
    HelpModal: {
      title: "Comment trouver un parking gratuit",
      desc: "Les lignes vertes indiquent un stationnement probablement gratuit.",
      greenTitle: "Vert c'est Gratuit",
      redLines: "Les lignes rouges sont payantes ou restreintes.",
      realTimeUpdates: "Mises à jour en temps réel",
      realTimeDesc: "Nous vérifions les règlements instantanément pour vous.",
      doubleCheck: "Vérifiez les panneaux",
      doubleCheckDesc:
        "Les données peuvent être imparfaites. Vérifiez toujours les panneaux locaux.",
      betaTitle: "Version Bêta :",
      betaDesc:
        "Cette application est en développement actif. Attendez-vous à des problèmes occasionnels.",
      startParking: "Commencer",
      dontShowAgain: "Ne plus afficher",
    },
  },
  hi: {
    HomePage: {
      title: "मुफ्त पार्किंग खोजें",
      searchPlaceholder: "पता या जगह खोजें",
      useMyLoc: "वर्तमान स्थान का उपयोग करें",
      startParking: "पार्किंग शुरू करें",
      now: "अभी",
      free: "मुफ्त",
      paid: "भुगतान",
      noneFound: "कुछ नहीं मिला",
      regionNotSupported: "क्षेत्र समर्थित नहीं है",
      requestCity: "शहर का अनुरोध करें",
      helpTitle: "कैसे उपयोग करें",
      getDirections: "दिशा - निर्देश",
      updateStatus: "स्थिति अपडेट करें",
      walkEstimates: "{minutes} मिनट पैदल ({distance}m)",
      toDestination: "गंतव्य की ओर:",
      timeLimit: "{minutes} मिनट सीमा",
      checkSigns: "कृपया संकेत देखें।",
      verificationRequired: "सत्यापन आवश्यक है।",
      loading: "लोड हो रहा है...",
      freeParking: "मुफ्त पार्किंग",
      paidParking: "सशुल्क पार्किंग",
      spots: "{count} जगहें",
      blocks: "{count} ब्लॉक",
      lots: "{count} लॉट",
      metaDescription:
        "अपने शहर में मुफ्त पार्किंग, स्ट्रीट पार्किंग नियम और मीटर की दरें खोजें। सत्यापित स्थानों के साथ रीयल-टाइम मानचित्र।",
      metaKeywords:
        "मुफ्त पार्किंग, स्ट्रीट पार्किंग, पार्किंग मानचित्र, पार्किंग मीटर, पार्किंग नियम, सस्ती पार्किंग",
    },
    ReportModal: {
      title: "स्थिति अपडेट करें",
      submit: "रिपोर्ट भेजें",
      cancel: "रद्द करें",
      other: "अन्य",
    },
    HelpModal: {
      title: "मुफ्त पार्किंग कैसे खोजें",
      desc: "हरी रेखाएं संभावित मुफ्त पार्किंग दर्शाती हैं।",
      greenTitle: "हरा मतलब मुफ्त",
      redLines: "लाल रेखाएं भुगतान या प्रतिबंधित हैं।",
      realTimeUpdates: "वास्तविक समय अपडेट",
      realTimeDesc:
        "हम तुरंत नियमों की जाँच करते हैं ताकि आपको अनुमान न लगाना पड़े।",
      doubleCheck: "संकेतों की दोबारा जाँच करें",
      doubleCheckDesc:
        "डेटा अपूर्ण हो सकता है। हमेशा स्थानीय संकेतों की पुष्टि करें।",
      betaTitle: "बीटा संस्करण:",
      betaDesc:
        "यह ऐप सक्रिय विकास के अधीन है। कृपया कभी-कभी समस्याओं की अपेक्षा करें।",
      startParking: "पार्किंग शुरू करें",
      dontShowAgain: "इसे फिर से न दिखाएं",
    },
  },
  ar: {
    HomePage: {
      title: "البحث عن مواقف مجانية",
      searchPlaceholder: "ابحث عن عنوان أو مكان",
      useMyLoc: "استخدام الموقع الحالي",
      startParking: "بدء الوقوف",
      now: "الآن",
      free: "مجاني",
      paid: "مدفوع",
      noneFound: "لم يتم العثور على شيء",
      regionNotSupported: "المنطقة غير مدعومة",
      requestCity: "طلب مدينة",
      helpTitle: "كيف تستعمل",
      getDirections: "الحصول على الاتجاهات",
      updateStatus: "تحديث الحالة",
      walkEstimates: "{minutes} دقيقة مشي ({distance}م)",
      toDestination: "إلى الوجهة:",
      timeLimit: "حد {minutes} دقيقة",
      checkSigns: "تحقق من اللافتات.",
      verificationRequired: "التحقق مطلوب.",
      loading: "جار التحميل...",
      freeParking: "مواقف مجانية",
      paidParking: "مواقف مدفوعة",
      spots: "{count} مكان",
      blocks: "{count} مجمعات",
      lots: "{count} مواقف",
      metaDescription:
        "ابحث عن مواقف مجانية للسيارات وقواعد وقوف السيارات في الشارع وأسعار العدادات في مدينتك. خريطة في الوقت الحقيقي مع مواقع تم التحقق منها.",
      metaKeywords:
        "مواقف مجانية, وقوف السيارات في الشارع, خريطة وقوف السيارات, عدادات وقوف السيارات, قواعد وقوف السيارات, مواقف رخيصة",
    },
    ReportModal: {
      title: "تحديث الحالة",
      submit: "إرسال تقرير",
      cancel: "إلغاء",
      other: "آخر",
    },
    HelpModal: {
      title: "كيف تجد مواقف مجانية",
      desc: "الخطوط الخضراء تمثل مواقف مجانية محتملة.",
      greenTitle: "الأخضر يعني مجاني",
      redLines: "الخطوط الحمراء مدفوعة أو مقيدة.",
      realTimeUpdates: "تحديثات في الوقت الحقيقي",
      realTimeDesc: "نحن نتحقق من اللوائح على الفور حتى لا تضطر للتخمين.",
      doubleCheck: "تحقق من العلامات مرتين",
      doubleCheckDesc:
        "قد تكون البيانات غير كاملة. تحقق دائمًا من العلامات المحلية.",
      betaTitle: "نسخة تجريبية:",
      betaDesc: "هذا التطبيق قيد التطوير النشط. يرجى توقع مشاكل عرضية.",
      startParking: "ابدأ الوقوف",
      dontShowAgain: "لا تظهر هذا مرة أخرى",
    },
  },
  bn: {
    HomePage: {
      title: "বিনামূল্যে পার্কিং খুঁজুন",
      searchPlaceholder: "ঠিকানা বা স্থান অনুসন্ধান করুন",
      useMyLoc: "বর্তমান অবস্থান ব্যবহার করুন",
      startParking: "পার্কিং শুরু করুন",
      now: "এখন",
      free: "ফ্রি",
      paid: "পেইড",
      noneFound: "কিছু পাওয়া যায়নি",
      regionNotSupported: "অঞ্চল সমর্থিত নয়",
      requestCity: "শহরের অনুরোধ করুন",
      helpTitle: "কীভাবে ব্যবহার করবেন",
      getDirections: "দিকনির্দেশ পান",
      updateStatus: "স্থিতি আপডেট করুন",
      walkEstimates: "{minutes} মিনিট হাঁটা ({distance}m)",
      toDestination: "গন্তব্যে:",
      timeLimit: "{minutes} মিনিট সীমা",
      checkSigns: "চিহ্ন চেক করুন।",
      verificationRequired: "যাচাইকরণ প্রয়োজন।",
      loading: "লোড হচ্ছে...",
      freeParking: "ফ্রি পার্কিং",
      paidParking: "পেইড পার্কিং",
      spots: "{count} টি স্পট",
      blocks: "{count} টি ব্লক",
      lots: "{count} টি লট",
      metaDescription:
        "আপনার শহরে বিনামূল্যে পার্কিং, রাস্তার পার্কিং নিয়ম এবং মিটারের হার খুঁজুন। যাচাইকৃত স্পট সহ রিয়েল-টাইম ম্যাপ।",
      metaKeywords:
        "ফ্রি পার্কিং, স্ট্রিট পার্কিং, পার্কিং ম্যাপ, পার্কিং মিটার, পার্কিং নিয়ম, সস্তা পার্কিং",
    },
    ReportModal: {
      title: "স্থিতি আপডেট করুন",
      submit: "রিপোর্ট জমা দিন",
      cancel: "বাতিল",
      other: "অন্যান্য",
    },
    HelpModal: {
      title: "কিভাবে বিনামূল্যে পার্কিং পাবেন",
      desc: "সবুজ লাইন সম্ভাব্য বিনামূল্যে পার্কিং নির্দেশ করে।",
      greenTitle: "সবুজ মানে ফ্রি",
      redLines: "লাল লাইন পেইড বা সীমাবদ্ধ।",
      realTimeUpdates: "রিয়েল-টাইম আপডেট",
      realTimeDesc:
        "আমরা অবিলম্বে নিয়মকানুন যাচাই করি যাতে আপনাকে অনুমান করতে না হয়।",
      doubleCheck: "চিহ্নগুলি দুবার পরীক্ষা করুন",
      doubleCheckDesc:
        "ডেটা অসম্পূর্ণ হতে পারে। সর্বদা স্থানীয় চিহ্ন যাচাই করুন।",
      betaTitle: "বিটা সংস্করণ:",
      betaDesc:
        "এই অ্যাপটি সক্রিয় বিকাশের অধীনে রয়েছে। মাঝে মাঝে সমস্যার আশা করুন।",
      startParking: "পার্কিং শুরু করুন",
      dontShowAgain: "এটি আর দেখাবেন না",
    },
  },
  pt: {
    HomePage: {
      title: "Encontrar Estacionamento Grátis",
      searchPlaceholder: "Buscar endereço ou local",
      useMyLoc: "Usar localização atual",
      startParking: "Iniciar estacionamento",
      now: "agora",
      free: "Grátis",
      paid: "Pago",
      noneFound: "Nada encontrado",
      regionNotSupported: "Região não suportada",
      requestCity: "Solicitar Cidade",
      helpTitle: "Como usar",
      getDirections: "Direções",
      updateStatus: "Atualizar Status",
      walkEstimates: "{minutes} min a pé ({distance}m)",
      toDestination: "Para o Destino:",
      timeLimit: "limite {minutes} min",
      checkSigns: "Verifique os sinais.",
      verificationRequired: "Verificação necessária.",
      loading: "Carregando...",
      freeParking: "Estacionamento grátis",
      paidParking: "Estacionamento pago",
      spots: "{count} vagas",
      blocks: "{count} quarteirões",
      lots: "{count} lotes",
      metaDescription:
        "Encontre estacionamento grátis, regras de estacionamento na rua e tarifas de parquímetros em sua cidade. Mapa em tempo real com vagas verificadas.",
      metaKeywords:
        "estacionamento grátis, estacionamento na rua, mapa de estacionamento, parquímetros, regras de estacionamento, estacionamento barato",
    },
    ReportModal: {
      title: "Atualizar Status",
      submit: "Enviar Relatório",
      cancel: "Cancelar",
      other: "Outro",
    },
    HelpModal: {
      title: "Como encontrar estacionamento grátis",
      desc: "Linhas verdes representam estacionamento provavelmente grátis.",
      greenTitle: "Verde é Grátis",
      redLines: "Linhas vermelhas são pagas ou restritas.",
      realTimeUpdates: "Atualizações em tempo real",
      realTimeDesc:
        "Verificamos os regulamentos instantaneamente para que você não precise adivinhar.",
      doubleCheck: "Verifique os sinais",
      doubleCheckDesc:
        "Os dados podem ser imperfeitos. Sempre verifique os sinais locais.",
      betaTitle: "Versão Beta:",
      betaDesc:
        "Este aplicativo está em desenvolvimento ativo. Espere problemas ocasionais.",
      startParking: "Estacionar",
      dontShowAgain: "Não mostrar novamente",
    },
  },
};

const outputDir = path.join(process.cwd(), "messages");

// Write en.json matches existing structure (we skip overwriting en.json or merge?)
// We already have en.json, so let's rely on that or use the one defined in keys if we want to sync.
// We'll write other languages.

async function main() {
  for (const [lang, trans] of Object.entries(translations)) {
    // Merge with English keys to ensure no missing keys (fallback to English if missing)
    // Deep merge not implemented, just top level
    const content = { ...keys, ...trans };
    // Wait, content needs to be structure: { HomePage: { ... }, ... }
    // My trans object has that structure.

    // Merge helper
    const merged = JSON.parse(JSON.stringify(keys)); // Start with English
    for (const section in trans) {
      if (!merged[section]) merged[section] = {};
      for (const key in trans[section]) {
        merged[section][key] = trans[section][key];
      }
    }

    fs.writeFileSync(
      path.join(outputDir, `${lang}.json`),
      JSON.stringify(merged, null, 2)
    );
    console.log(`Generated ${lang}.json`);
  }
}

main();
