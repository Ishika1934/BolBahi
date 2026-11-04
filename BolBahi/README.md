# बोलबही (BolBahi)

> **"Bol do, bahi ban jayegi."** *(Speak, and your ledger writes itself.)*

BolBahi is a voice-first khata (digital credit ledger) web application built for Indian kirana shopkeepers. It allows shop owners to speak naturally in Hindi, Hinglish, or English while managing transactions hands-free during busy store hours.

---

## 🚀 Key Highlights & Hackathon Features

1. **Multi-Intent Natural Language Engine**:
   - One spoken sentence extracts up to 4+ actions in sequence:
     > *"Ramesh ne 500 udhaar liya, Sharma ji ne 200 wapas diye, aur atta 10 kilo kam hai, kal Ramesh ko yaad dila dena."*
   - Returns 4 distinct action cards, executes ledger entries, updates inventory, schedules reminders, and speaks back a natural summary.
2. **Glassmorphic Orbital Tile Carousel (Section 4.8)**:
   - Zero tabs. Mobile-first elliptical orbit carousel with smooth snap physics, swipe gesture support, and keyboard arrows (`←`, `→`, `Home`, `Space`).
   - 8 live tiles: **Mic (Bolo)**, **Money Records (Paise ka Khata)**, **Customers (Grahak Khata)**, **Commands History (Awaaz History)**, **Today's Hisaab**, **Stock Alert**, **Reminders**, and **Settings**.
   - Live badges updated via **Server-Sent Events (SSE)**.
3. **Conversational Clarification Loop (Section 2.7.2 & 3.7)**:
   - When encountering ambiguous names (e.g., *"Suresh ne 300 liye"* when both *Suresh Gupta* and *Suresh Yadav* exist), the system asks: *"Kaunsa Suresh? Suresh Gupta ya Suresh Yadav?"* and stores a 60-second pending state per session. Answering *"Gupta"* immediately resolves and commits the transaction.
4. **Voice Undo & Audit History (Section 3.15)**:
   - Saying *"Last wala hata do"* or tapping delete in Commands History triggers a full soft-delete rollback by `groupId` and recomputes all customer balances cleanly.
5. **Multi-Tenant Shop Isolation (Section 3.14)**:
   - Every model has a required `shopId`. Mongoose `tenantGuard` plugin blocks any query missing `shopId` in dev/test. Shops never see each other's data.
6. **Bilingual Audio & Text (Hinglish / Devanagari TTS)**:
   - Displays clean Hinglish on-screen while speaking Devanagari Hindi via browser SpeechSynthesis for natural voice prosody.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Express + TypeScript on Node 20+, Mongoose (MongoDB Atlas / Local), Zod, Fuse.js, Node-Cron, Express-Rate-Limit, Resend
- **STT & TTS**: Browser Web Speech API (`hi-IN` / `en-IN`) + SpeechSynthesis with automatic voice selection
- **Realtime**: Server-Sent Events (SSE) at `GET /api/events`

---

## ⚙️ Quick Start

### 1. Install Dependencies
```bash
# Install backend and frontend dependencies
npm --prefix apps/api install
npm --prefix apps/web install
```

### 2. Configure Environment (`.env`)
Both root `.env` and `apps/api/.env` are pre-configured:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/bolbahi
PORT=4000
WEB_ORIGIN=http://localhost:3000
JWT_SECRET=bolbahi-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
RESEND_API_KEY=re_dummy_resend_api_key
MAIL_FROM=BolBahi <onboarding@resend.dev>
DEMO_EMAIL=demo@bolbahi.app
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run Development Servers
```bash
# Terminal 1: Start Express API
npm run dev:api

# Terminal 2: Start Next.js Web App
npm run dev:web
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- API Health Check: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🧪 Verification & Test Scripts

### 1. 7-Step Hackathon Verification (TRD 3.12)
Runs all 7 test cases specified in the build pack:
```bash
npm run test:demo --prefix apps/api
```
Tests:
1. `"Ramesh ne 500 udhaar liya"` -> Ramesh balance +500
2. `"Sharma ji ne 200 wapas diye"` -> Sharma balance -200
3. Multi-intent sentence -> 4 action cards extracted & executed
4. `"Ramesh ka kitna baaki hai?"` -> Spoken answer, read-only 0 writes
5. `"Suresh ne 300 liye"` -> Spoken clarification question & resolution
6. `"Last wala hata do"` -> Undo soft-delete & balance rollback
7. `"Aaj ka hisaab"` -> Spoken daily summary

### 2. Multi-Shop Isolation Test (TRD 3.14.5)
```bash
npm run test:isolation --prefix apps/api
```
Verifies Shop A and Shop B cannot access, read, or modify each other's customers or ledgers.

---

## 🎙 3-Minute Hackathon Demo Script

1. **Sign In**: Log in as `raju@kirana.test` / `password123` or register a new shop.
2. **Seed Data**: Open Settings tile → tap **"Demo data bharein"** (populates 10 Indian customers, balances, and low stock items).
3. **Multi-Intent Magic**:
   - Hold the 72px center Mic button (or tap the demo sentence chip):
     > *"Ramesh ne 500 udhaar liya, Sharma ji ne 200 wapas diye, aur atta 10 kilo kam hai, kal Ramesh ko yaad dila dena."*
   - Watch 4 colored action cards appear instantly, hear the spoken summary, and see the live badges count up.
4. **Clarification**:
   - Say: *"Suresh ne 300 liye"*
   - System asks: *"Kaunsa Suresh? Suresh Gupta ya Suresh Yadav?"*
   - Say: *"Suresh Gupta"*
   - System confirms: *"Ho gaya. Suresh Gupta ka 300 udhaar likha. Total baaki ₹ 1,100."*
5. **Voice Undo & Summary**:
   - Say: *"Last wala hata do"* (reverts Suresh Gupta's balance).
   - Say: *"Aaj ka hisaab"* (speaks today's credit and collections summary).

