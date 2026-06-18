// Indian seed data for VoiceAgent platform
import type {
  Agent, CallLog, KnowledgeDocument, NotificationItem, AnalyticsSummary
} from './types';

const now = new Date();
const d = (daysAgo: number, hoursAgo = 0) =>
  new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

// ── Agents ───────────────────────────────────────────────────────────────────

export const SEED_AGENTS: Agent[] = [
  {
    id: 'a1',
    name: 'Priya',
    description: 'Customer support agent – handles billing, refunds & account queries in Hindi/English',
    greetingMessage: 'Namaste! Main Priya hun. Aaj main aapki kaise madad kar sakti hun?',
    personality: 'empathetic',
    language: 'hi',
    temperature: 0.7,
    voiceId: 'v1',
    voiceName: 'Priya Pro',
    responseStyle: 'conversational',
    status: 'active',
    totalCalls: 1842,
    successRate: 94.7,
    avgResponseTime: 780,
    createdAt: d(45),
    updatedAt: d(1),
    promptTemplate:
      'You are Priya, a friendly and empathetic customer support agent for an Indian SaaS platform. Respond in Hinglish (mix of Hindi and English) unless the customer speaks only English. Be concise, warm, and resolve issues efficiently.',
  },
  {
    id: 'a2',
    name: 'Rohan',
    description: 'Sales qualifier – qualifies leads and books demo calls for enterprise prospects',
    greetingMessage: 'Hello! Main Rohan hun. Aapka swagat hai. Kya main aapke liye sahi solution dhundne mein help kar sakta hun?',
    personality: 'assertive',
    language: 'hi',
    temperature: 0.8,
    voiceId: 'v2',
    voiceName: 'Rohan Sales',
    responseStyle: 'concise',
    status: 'active',
    totalCalls: 934,
    successRate: 88.2,
    avgResponseTime: 920,
    createdAt: d(30),
    updatedAt: d(2),
    promptTemplate:
      'You are Rohan, a confident sales qualifier. Your goal is to understand the prospect\'s business needs, team size, and budget, then book a demo. Be enthusiastic but not pushy.',
  },
  {
    id: 'a3',
    name: 'Kavya',
    description: 'Technical support agent – resolves API integration and product issues in Tamil/English',
    greetingMessage: 'Hello! I am Kavya from technical support. How can I help you today?',
    personality: 'professional',
    language: 'en',
    temperature: 0.6,
    voiceId: 'v3',
    voiceName: 'Kavya Tech',
    responseStyle: 'detailed',
    status: 'inactive',
    totalCalls: 521,
    successRate: 91.8,
    avgResponseTime: 1050,
    createdAt: d(25),
    updatedAt: d(5),
    promptTemplate:
      'You are Kavya, a technical support specialist. Provide step-by-step solutions, confirm understanding, and escalate only if absolutely necessary.',
  },
  {
    id: 'a4',
    name: 'Arjun',
    description: 'Appointment booking agent – schedules doctor/clinic appointments in multiple Indian languages',
    greetingMessage: 'Namaskar! Main Arjun hun aapki appointment booking ke liye.',
    personality: 'friendly',
    language: 'hi',
    temperature: 0.65,
    voiceId: 'v4',
    voiceName: 'Arjun Warm',
    responseStyle: 'conversational',
    status: 'training',
    totalCalls: 0,
    successRate: 0,
    avgResponseTime: 0,
    createdAt: d(3),
    updatedAt: d(0),
  },
];

// ── Call Logs ────────────────────────────────────────────────────────────────

export const SEED_CALLS: CallLog[] = [
  {
    id: 'c1',
    agentId: 'a1',
    agentName: 'Priya',
    callerName: 'Rahul Sharma',
    callerNumber: '+91 98765 43210',
    direction: 'incoming',
    status: 'answered',
    startTime: d(0, 2),
    endTime: d(0, 1.9),
    durationSeconds: 243,
    sentiment: 'positive',
    aiResponseAccuracy: 96.4,
    summary: 'Customer ne annual plan mein upgrade karne ki request ki. Successfully switched to ₹4,999/year plan.',
    transcript: [
      { id: 't1', speaker: 'ai', text: 'Namaste! Main Priya hun. Aaj main aapki kaise madad kar sakti hun?', timestamp: d(0, 2), confidence: 1 },
      { id: 't2', speaker: 'customer', text: 'Mujhe apna plan annual mein upgrade karna hai.', timestamp: d(0, 2), confidence: 0.97 },
      { id: 't3', speaker: 'ai', text: 'Zaroor! Annual plan mein switch karne se aapko 20% discount milega – ₹4,999 per year. Kya main aage badhu?', timestamp: d(0, 2), confidence: 1, latencyMs: 790 },
      { id: 't4', speaker: 'customer', text: 'Haan, please kar dijiye. UPI se payment kar sakta hun?', timestamp: d(0, 2), confidence: 0.98 },
      { id: 't5', speaker: 'ai', text: 'Bilkul! UPI, net banking, aur credit card – sabhi supported hain. Main payment link abhi bhej rahi hun. Kya aur kuch chahiye?', timestamp: d(0, 2), confidence: 1, latencyMs: 760 },
      { id: 't6', speaker: 'customer', text: 'Nahi, bas yahi tha. Thank you Priya!', timestamp: d(0, 2), confidence: 0.99 },
      { id: 't7', speaker: 'ai', text: 'Aapka bahut shukriya Rahul ji! Aapka din shubh ho. 😊', timestamp: d(0, 2), confidence: 1, latencyMs: 710 },
    ],
  },
  {
    id: 'c2',
    agentId: 'a2',
    agentName: 'Rohan',
    callerName: 'Priya Patel',
    callerNumber: '+91 91234 56789',
    direction: 'incoming',
    status: 'answered',
    startTime: d(0, 5),
    endTime: d(0, 4.8),
    durationSeconds: 412,
    sentiment: 'positive',
    aiResponseAccuracy: 90.1,
    summary: 'Enterprise lead qualified – 200 seat requirement. Demo booked for Friday 3 PM IST.',
    transcript: [
      { id: 't8', speaker: 'ai', text: 'Hello! Main Rohan hun. Aapka swagat hai. Main aapke liye kya kar sakta hun?', timestamp: d(0, 5), confidence: 1 },
      { id: 't9', speaker: 'customer', text: 'We are looking for an AI calling solution for our 200 member sales team in Ahmedabad.', timestamp: d(0, 5), confidence: 0.96 },
      { id: 't10', speaker: 'ai', text: 'That\'s a great fit for us! We\'ve powered enterprise call centers across Gujarat and Maharashtra. What is your current outreach volume per day?', timestamp: d(0, 5), confidence: 1, latencyMs: 940 },
      { id: 't11', speaker: 'customer', text: 'Around 5000 calls per day. We need Hindi and Gujarati support.', timestamp: d(0, 5), confidence: 0.97 },
      { id: 't12', speaker: 'ai', text: 'Perfect – our platform supports 12 Indian languages including Gujarati. I\'d love to book a demo for you. Are you free this Friday at 3 PM IST?', timestamp: d(0, 5), confidence: 1, latencyMs: 880 },
    ],
  },
  {
    id: 'c3',
    agentId: 'a1',
    agentName: 'Priya',
    callerName: 'Amit Kumar',
    callerNumber: '+91 99887 66554',
    direction: 'incoming',
    status: 'missed',
    startTime: d(1, 3),
    durationSeconds: 0,
    sentiment: 'neutral',
    transcript: [],
  },
  {
    id: 'c4',
    agentId: 'a1',
    agentName: 'Priya',
    callerName: 'Neha Singh',
    callerNumber: '+91 88776 55443',
    direction: 'incoming',
    status: 'answered',
    startTime: d(1, 8),
    endTime: d(1, 7.9),
    durationSeconds: 178,
    sentiment: 'negative',
    aiResponseAccuracy: 81.2,
    summary: 'Customer ne service outage ki complaint ki – 4 ghante downtime. Engineering team ko escalate kiya gaya.',
    transcript: [
      { id: 't13', speaker: 'ai', text: 'Namaste! Main Priya hun. Aaj main aapki kaise madad kar sakti hun?', timestamp: d(1, 8), confidence: 1 },
      { id: 't14', speaker: 'customer', text: 'Yeh kya chal raha hai! Mera account 4 ghante se band hai aur mera business ruk gaya hai!', timestamp: d(1, 8), confidence: 0.94 },
      { id: 't15', speaker: 'ai', text: 'Main bahut maafi chahti hun Neha ji. Yeh bilkul sahi nahi hai. Main abhi aapka account dekh rahi hun aur engineering team ko immediately escalate kar rahi hun.', timestamp: d(1, 8), confidence: 1, latencyMs: 820 },
      { id: 't16', speaker: 'customer', text: 'Sirf sorry se kaam nahi chalega. Mujhe compensation chahiye.', timestamp: d(1, 8), confidence: 0.96 },
      { id: 't17', speaker: 'ai', text: 'Bilkul samajh sakti hun. Main aapko 7 din ka free extension de rahi hun. Aur ek senior engineer 30 minute mein call karenge. Kya yeh theek rahega?', timestamp: d(1, 8), confidence: 1, latencyMs: 870 },
    ],
  },
  {
    id: 'c5',
    agentId: 'a3',
    agentName: 'Kavya',
    callerName: 'Vikram Gupta',
    callerNumber: '+91 77665 44332',
    direction: 'outgoing',
    status: 'answered',
    startTime: d(2, 4),
    endTime: d(2, 3.8),
    durationSeconds: 534,
    sentiment: 'positive',
    aiResponseAccuracy: 93.5,
    summary: 'Resolved API integration issue with webhook authentication. Customer successfully connected.',
    transcript: [
      { id: 't18', speaker: 'ai', text: 'Hello Vikram! I am Kavya from technical support. I am calling regarding your API integration ticket #INC-4421.', timestamp: d(2, 4), confidence: 1 },
      { id: 't19', speaker: 'customer', text: 'Yes! I\'ve been struggling with the webhook signature validation. It keeps returning 401.', timestamp: d(2, 4), confidence: 0.97 },
      { id: 't20', speaker: 'ai', text: 'I see the issue. Your HMAC signature needs to use UTF-8 encoding for the payload string before hashing. Let me walk you through the fix step by step.', timestamp: d(2, 4), confidence: 1, latencyMs: 1020 },
    ],
  },
  {
    id: 'c6',
    agentId: 'a1',
    agentName: 'Priya',
    callerName: 'Sunita Joshi',
    callerNumber: '+91 66554 33221',
    direction: 'incoming',
    status: 'answered',
    startTime: d(2, 10),
    endTime: d(2, 9.9),
    durationSeconds: 142,
    sentiment: 'neutral',
    aiResponseAccuracy: 88.9,
    summary: 'Password reset assistance provided. Customer logged in successfully.',
    transcript: [
      { id: 't21', speaker: 'ai', text: 'Namaste! Main Priya hun. Aaj main aapki kaise madad kar sakti hun?', timestamp: d(2, 10), confidence: 1 },
      { id: 't22', speaker: 'customer', text: 'Password bhul gayi hun. Reset karna hai.', timestamp: d(2, 10), confidence: 0.98 },
      { id: 't23', speaker: 'ai', text: 'Koi baat nahi! Main abhi reset link bhej rahi hun aapke registered email pe. Ek minute mein aa jayega.', timestamp: d(2, 10), confidence: 1, latencyMs: 740 },
    ],
  },
  {
    id: 'c7',
    agentId: 'a2',
    agentName: 'Rohan',
    callerName: 'Kiran Desai',
    callerNumber: '+91 87654 32109',
    direction: 'incoming',
    status: 'answered',
    startTime: d(3, 2),
    endTime: d(3, 1.8),
    durationSeconds: 287,
    sentiment: 'positive',
    aiResponseAccuracy: 92.3,
    summary: 'SMB lead from Pune. 25 seat requirement. Trial signup completed.',
    transcript: [],
  },
  {
    id: 'c8',
    agentId: 'a1',
    agentName: 'Priya',
    callerName: 'Deepak Verma',
    callerNumber: '+91 76543 21098',
    direction: 'incoming',
    status: 'missed',
    startTime: d(3, 6),
    durationSeconds: 0,
    sentiment: 'neutral',
    transcript: [],
  },
  {
    id: 'c9',
    agentId: 'a3',
    agentName: 'Kavya',
    callerName: 'Meena Krishnan',
    callerNumber: '+91 65432 10987',
    direction: 'incoming',
    status: 'answered',
    startTime: d(4, 3),
    endTime: d(4, 2.8),
    durationSeconds: 398,
    sentiment: 'positive',
    aiResponseAccuracy: 95.1,
    summary: 'Resolved custom TTS voice training issue. Voice profile now active.',
    transcript: [],
  },
  {
    id: 'c10',
    agentId: 'a2',
    agentName: 'Rohan',
    callerName: 'Suresh Reddy',
    callerNumber: '+91 54321 09876',
    direction: 'outgoing',
    status: 'answered',
    startTime: d(5, 7),
    endTime: d(5, 6.7),
    durationSeconds: 456,
    sentiment: 'positive',
    aiResponseAccuracy: 89.6,
    summary: 'Follow-up with Hyderabad enterprise client. Contract sent for review.',
    transcript: [],
  },
];

// ── Knowledge Base ───────────────────────────────────────────────────────────

export const SEED_KNOWLEDGE: KnowledgeDocument[] = [
  {
    id: 'k1', title: 'Product Documentation v3.2',
    type: 'pdf', status: 'indexed', sizeKB: 3412,
    chunkCount: 178, embeddingCount: 178,
    uploadedAt: d(20), agentIds: ['a1', 'a3'],
  },
  {
    id: 'k2', title: 'Sales Playbook India Q1 2026',
    type: 'docx', status: 'indexed', sizeKB: 1156,
    chunkCount: 74, embeddingCount: 74,
    uploadedAt: d(12), agentIds: ['a2'],
  },
  {
    id: 'k3', title: 'FAQ — Billing, UPI & Payments',
    type: 'faq', status: 'indexed', sizeKB: 428,
    chunkCount: 56, embeddingCount: 56,
    uploadedAt: d(8), agentIds: ['a1'],
  },
  {
    id: 'k4', title: 'Hindi & Regional Language Phrases',
    type: 'txt', status: 'indexed', sizeKB: 245,
    chunkCount: 34, embeddingCount: 34,
    uploadedAt: d(6), agentIds: ['a1', 'a4'],
  },
  {
    id: 'k5', title: 'API Reference Guide',
    type: 'txt', status: 'indexed', sizeKB: 892,
    chunkCount: 103, embeddingCount: 103,
    uploadedAt: d(4), agentIds: ['a3'],
  },
  {
    id: 'k6', title: 'dooper.in/support',
    type: 'url', status: 'processing', sizeKB: 0,
    url: 'https://dooper.in/support',
    uploadedAt: d(1), agentIds: ['a1', 'a3'],
  },
];

// ── Notifications ────────────────────────────────────────────────────────────

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1', type: 'incoming_call', title: 'Incoming Call',
    body: 'Rahul Sharma (+91 98765 43210) is calling via Priya agent',
    read: false, timestamp: d(0, 2),
  },
  {
    id: 'n2', type: 'missed_call', title: 'Missed Call',
    body: 'Amit Kumar called but was not answered',
    read: false, timestamp: d(1, 3),
  },
  {
    id: 'n3', type: 'transcript', title: 'Call Transcript Ready',
    body: 'Transcript for Priya Patel\'s 7-minute sales call is now available',
    read: true, timestamp: d(0, 5),
  },
  {
    id: 'n4', type: 'agent_status', title: 'Agent Status Changed',
    body: 'Kavya (Tech Support) has been paused',
    read: true, timestamp: d(2),
  },
  {
    id: 'n5', type: 'transcript', title: 'AI Summary Ready',
    body: 'AI summary generated for Neha Singh\'s escalation call',
    read: false, timestamp: d(1, 8),
  },
];

// ── Analytics (computed from seed calls) ────────────────────────────────────

export function computeAnalytics(calls: CallLog[]): AnalyticsSummary {
  const answered = calls.filter(c => c.status === 'answered');
  const missed = calls.filter(c => c.status === 'missed');

  const totalDuration = answered.reduce((sum, c) => sum + c.durationSeconds, 0);
  const avgDuration = answered.length > 0 ? totalDuration / answered.length : 0;

  const responseTimes = answered
    .flatMap(c => c.transcript.filter(t => t.latencyMs).map(t => t.latencyMs!));
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 850;

  const accuracyScores = answered
    .filter(c => c.aiResponseAccuracy != null).map(c => c.aiResponseAccuracy!);
  const aiAccuracy = accuracyScores.length > 0
    ? accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length
    : 0;

  const positive = calls.filter(c => c.sentiment === 'positive').length;
  const neutral = calls.filter(c => c.sentiment === 'neutral').length;
  const negative = calls.filter(c => c.sentiment === 'negative').length;
  const total = calls.length || 1;

  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const dayCalls = calls.filter(c => new Date(c.startTime).toDateString() === dateStr);
    const dayAnswered = dayCalls.filter(c => c.status === 'answered');
    const dayMissed = dayCalls.filter(c => c.status === 'missed');
    const dayDuration = dayAnswered.reduce((s, c) => s + c.durationSeconds, 0);
    daily.push({
      date: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      totalCalls: dayCalls.length,
      answeredCalls: dayAnswered.length,
      missedCalls: dayMissed.length,
      avgDurationSeconds: dayAnswered.length > 0 ? dayDuration / dayAnswered.length : 0,
    });
  }

  return {
    totalCalls: calls.length,
    answeredCalls: answered.length,
    missedCalls: missed.length,
    avgDurationSeconds: avgDuration,
    avgResponseTimeMs: avgResponseTime,
    aiAccuracy,
    positiveSentiment: Math.round((positive / total) * 100),
    neutralSentiment: Math.round((neutral / total) * 100),
    negativeSentiment: Math.round((negative / total) * 100),
    daily,
    topFAQs: [
      { question: 'UPI se payment kaise karu?', count: 52 },
      { question: 'Subscription cancel karne ka process kya hai?', count: 41 },
      { question: 'Hindi mein baat kar sakte hain?', count: 37 },
      { question: 'EMI aur installment options kya hain?', count: 29 },
      { question: 'Free trial kab tak milega?', count: 22 },
    ],
    totalMinutesTalked: Math.round(totalDuration / 60),
  };
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function filterCallsByTime(calls: CallLog[], filter: 'today' | 'week' | 'month'): CallLog[] {
  const now = new Date();
  return calls.filter(c => {
    const callDate = new Date(c.startTime);
    if (filter === 'today') {
      return callDate.toDateString() === now.toDateString();
    } else if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return callDate >= weekAgo;
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      return callDate >= monthAgo;
    }
  });
}
