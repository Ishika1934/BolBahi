export type AppLanguage = 'hi-IN' | 'en-IN';

export const TRANSLATIONS = {
  'hi-IN': {
    appName: 'बोलबही',
    tagline: 'बोल दो, बही बन जाएगी',
    shopOwner: 'मालिक',
    language: 'भाषा',
    english: 'English',
    hindi: 'हिंदी',
    settings: 'सेटिंग्स',
    logout: 'लॉग आउट',
    prev: 'पिछला',
    next: 'अगला',
    trySaying: 'बोलकर देखें:',
    holdToSpeak: 'दबाकर बोलें',
    listening: 'सुन रहा हूँ...',
    thinking: 'सोच रहा हूँ...',
    voiceResult: 'आवाज का परिणाम',
    heard: 'आपने कहा',
    reply: 'जवाब',
    recordedActions: 'दर्ज किए गए कार्य',
    cards: 'कार्ड',
    undoToast: 'अंतिम प्रविष्टि दर्ज हो गई',
    undoButton: 'वापस लें',
    undoneNotice: 'पिछली प्रविष्टि हटा दी गई',
    openPanel: 'खाता खोलें',
    tapToSelect: 'चुनने के लिए टैप करें',
    latest: 'हालिया:',
    todayNet: 'आज का शुद्ध हिसाब',
    totalOutstanding: 'कुल बाकी उधारी',
    lowStockNotice: 'कम स्टॉक वाली वस्तुएं',
    pendingCount: 'बाकी तगादे',

    // Hero Section Typography & Details
    heroBadge: 'आवाज आधारित किराना खाता',
    heroTitle: 'बोलिए और हिसाब लिखिए',
    heroSubtitle: 'उधारी, नकद वसूली, स्टॉक और तगादा — सिर्फ बोलकर संभालें।',
    quickVoiceTitle: 'त्वरित आवाज आदेश:',
    quickChips: [
      { text: 'रमेश ने 500 रुपये उधार लिए', tag: 'उधारी', color: '#C23B22' },
      { text: 'सुरेश से 300 रुपये नकद मिले', tag: 'जमा', color: '#1F7A4D' },
      { text: 'स्टॉक अलर्ट दिखाओ', tag: 'स्टॉक', color: '#B7791F' },
      { text: 'कल रमेश को याद दिला देना', tag: 'तगादा', color: '#2B6CB0' },
      { text: 'आज का कुल हिसाब बताओ', tag: 'हिसाब', color: '#E8731A' },
      { text: 'सभी ग्राहक खाते दिखाओ', tag: 'खाते', color: '#4F46E5' },
    ],

    // Metric Summary Bar
    statOutstandingLabel: 'कुल उधारी',
    statTodayInLabel: 'आज की जमा',
    statAlertsLabel: 'सूचनाएं व अलर्ट',

    // Tiles
    tiles: {
      mic: {
        label: 'आवाज खाता',
        badge: 'माइक शुरू',
        hint: 'माइक दबाकर बोलें',
      },
      records: {
        label: 'खाता प्रविष्टियां',
        badgeSuffix: 'शुद्ध हिसाब',
        hint: 'दुकान का दैनिक लेन-देन देखें',
      },
      customers: {
        label: 'ग्राहक खाते',
        badgeSuffix: 'कुल उधारी',
        hint: 'सभी ग्राहकों का खाता और बाकी रकम',
      },
      commands: {
        label: 'आवाज इतिहास',
        badge: 'हालिया आदेश',
        hint: 'सुने गए आदेश और प्रविष्टियां',
      },
      hisaab: {
        label: 'दैनिक हिसाब',
        badgeSuffix: 'आज का खाता',
        hint: 'दिन भर की कुल उधारी व नकद वसूली',
      },
      stock: {
        label: 'स्टॉक अलर्ट',
        badgeSuffix: 'सामान कम',
        hint: 'दुकान में खत्म होने वाला राशन',
      },
      reminders: {
        label: 'तगादा रिमाइंडर',
        badgeSuffix: 'तगादे बाकी',
        hint: 'ग्राहकों को भेजे जाने वाले रिमाइंडर',
      },
    },

    // Example suggestions
    examples: [
      'रमेश ने 500 रुपये उधार लिए',
      'सुरेश जी ने 200 रुपये जमा किए',
      'रमेश का कितना उधार बाकी है?',
      'चीनी 10 किलो बची है',
      'कल शाम 5 बजे महेश को याद दिलाना',
      'आज का कुल हिसाब बताओ',
    ],
  },
  'en-IN': {
    appName: 'BolBahi',
    tagline: 'Speak your ledger into existence',
    shopOwner: 'Owner',
    language: 'Language',
    english: 'English',
    hindi: 'हिंदी',
    settings: 'Settings',
    logout: 'Logout',
    prev: 'Previous',
    next: 'Next',
    trySaying: 'Try saying:',
    holdToSpeak: 'Hold to speak',
    listening: 'Listening...',
    thinking: 'Thinking...',
    voiceResult: 'Voice Result',
    heard: 'You said',
    reply: 'Response',
    recordedActions: 'Recorded Actions',
    cards: 'cards',
    undoToast: 'Last entry saved',
    undoButton: 'Undo',
    undoneNotice: 'Previous entry was undone',
    openPanel: 'Open details',
    tapToSelect: 'Tap to open',
    latest: 'Latest:',
    todayNet: "Today's Net Cash",
    totalOutstanding: 'Total Outstanding Credit',
    lowStockNotice: 'Low Stock Alerts',
    pendingCount: 'Pending Reminders',

    // Hero Section Typography & Details
    heroBadge: 'Voice-First Kirana Ledger',
    heroTitle: 'Speak your ledger into existence',
    heroSubtitle: 'Manage credit, cash receipts, stock alerts, and payment reminders with simple voice commands.',
    quickVoiceTitle: 'Quick Voice Commands:',
    quickChips: [
      { text: 'Ramesh took 500 rupees credit', tag: 'Credit', color: '#C23B22' },
      { text: 'Received 300 cash from Suresh', tag: 'Cash', color: '#1F7A4D' },
      { text: 'Show stock alerts', tag: 'Stock', color: '#B7791F' },
      { text: 'Remind Ramesh tomorrow', tag: 'Reminder', color: '#2B6CB0' },
      { text: "What is today's total ledger", tag: 'Summary', color: '#E8731A' },
      { text: 'Show customer accounts', tag: 'Accounts', color: '#4F46E5' },
    ],

    // Metric Summary Bar
    statOutstandingLabel: 'Total Outstanding',
    statTodayInLabel: 'Cash Received Today',
    statAlertsLabel: 'Stock & Reminders',

    // Tiles
    tiles: {
      mic: {
        label: 'Voice Entry',
        badge: 'Tap to speak',
        hint: 'Hold mic or tap to speak',
      },
      records: {
        label: 'Ledger Records',
        badgeSuffix: 'net cash',
        hint: 'View daily shop cash flow',
      },
      customers: {
        label: 'Customer Khatas',
        badgeSuffix: 'outstanding',
        hint: 'Inspect all customer balances',
      },
      commands: {
        label: 'Voice History',
        badge: 'recent commands',
        hint: 'Review heard voice commands and undo',
      },
      hisaab: {
        label: 'Daily Hisaab',
        badgeSuffix: 'today',
        hint: 'Complete cash in vs credit out',
      },
      stock: {
        label: 'Stock Alerts',
        badgeSuffix: 'low stock items',
        hint: 'Items running low on store shelves',
      },
      reminders: {
        label: 'Payment Reminders',
        badgeSuffix: 'pending',
        hint: 'Automated email and message reminders',
      },
    },

    examples: [
      'Ramesh took 500 rupees credit',
      'Received 200 rupees from Suresh',
      'How much does Ramesh owe?',
      'Only 10 kg sugar left in stock',
      'Remind Mahesh tomorrow at 5 PM',
      "Show today's total summary",
    ],
  },
} as const;
