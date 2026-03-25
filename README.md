<div align="center">
  <img src="./logo.svg" alt="GolfPools Logo" width="64" />

  #  <img src="./logo.svg" alt="GolfPools Logo" width="64" />
 GolfPools — Charity Subscription Platform

  *A high-end, glassmorphic full-stack platform where golfers enter their Stableford scores, participate in monthly prize draws, and donate directly to their chosen charity.*

  <br />

  ### 📸 Platform Previews
  <!-- 🛑 Replace the links below with your uploaded images via GitHub Editor -->
  <table>
    <tr>
      <td align="center"><b>Admin Dashboard</b></td>
      <td align="center"><b>Player Registration</b></td>
      <td align="center"><b>Live Draw Mechanics</b></td>
    </tr>
    <tr>
      <td align="center"><br/><i>[Drag & Drop Admin Image Here]</i><br/><br/></td>
      <td align="center"><br/><i>[Drag & Drop Register Image Here]</i><br/><br/></td>
      <td align="center"><br/><i>[Drag & Drop Draws Image Here]</i><br/><br/></td>
    </tr>
  </table>

  <br />
</div>

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Payments | **Razorpay** |
| Auth | JWT (access + refresh tokens) |
| Email | Nodemailer (SMTP) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📁 Project Structure

```
golf-charity-platform/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── pages/     # Routes (index, login, register, dashboard/*, admin/*)
│   │   ├── components/# Shared UI components
│   │   ├── context/   # Zustand auth store
│   │   ├── utils/     # API client (Razorpay + all endpoints)
│   │   └── styles/    # Global CSS + design system
│   └── .env.example
└── backend/           # Express API
    ├── src/
    │   ├── routes/    # auth, users, scores, draws, payments, charities, winners, admin
    │   ├── services/  # drawService, emailService, cronService
    │   ├── middleware/# authenticate, requireAdmin, requireActiveSubscription
    │   ├── config/    # Supabase client
    │   └── database/  # schema.sql + seed data
    └── .env.example
```

---

## 🚀 Local Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd golf-charity-platform

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run `backend/src/database/schema.sql`
3. Copy your project URL, anon key, and service role key

### 3. Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys → Generate Test Key
3. Copy your `key_id` and `key_secret`

### 4. Configure Environment Variables

**Backend** — copy `.env.example` to `.env`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your-very-long-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=another-very-long-refresh-secret

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@golfcharity.com
```

**Frontend** — copy `.env.example` to `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_xxxxxxxxxx
```

### 5. Run Locally

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Visit: http://localhost:3000

---

## 💳 Razorpay Payment Flow

```
User clicks "Pay via Razorpay"
       │
       ▼
POST /api/payments/create-order
  → Creates Razorpay order (rzp.orders.create)
  → Creates pending subscription in DB
  → Returns order_id + key
       │
       ▼
Frontend opens Razorpay Checkout modal
  → User pays via UPI / card / netbanking
  → Razorpay calls handler(response)
       │
       ▼
POST /api/payments/verify
  → Verifies HMAC-SHA256 signature
  → Creates payment record in DB
  → Activates subscription
  → Sends confirmation email
  → Redirects to dashboard
```

### Plan Pricing (INR)
| Plan | Price | Charity (10%) | Prize Pool (75%) | Platform (15%) |
|---|---|---|---|---|
| Monthly | ₹999 | ₹99.90 | ₹749.25 | ₹149.85 |
| Yearly | ₹9,999 | ₹999.90 | ₹7,499.25 | ₹1,499.85 |

---

## 🎰 Draw System

### How Draws Work
1. Admin creates a draw for a month (or cron auto-creates on last day)
2. Subscribed users with scores enter the draw (their 5 latest scores = their numbers)
3. Admin executes the draw (or cron auto-executes)
4. 5 winning numbers (1–45) are generated (random or algorithm-weighted)
5. All entries are matched; winners notified by email + in-app

### Prize Distribution
- **5-match (40%)** — Jackpot; rolls over if no winner
- **4-match (35%)** — Split among all 4-match winners
- **3-match (25%)** — Split among all 3-match winners

### Winner Flow
```
Draw executed → Winner notified → Winner uploads proof
→ Admin reviews → Admin approves → Admin marks paid
```

---

## 🔐 Authentication

- JWT access token (7 days) + refresh token (30 days)
- Auto-refresh on 401 TOKEN_EXPIRED
- Role-based: `user` | `admin`
- Rate limiting on auth endpoints (10 req / 15 min)

---

## 📧 Email Notifications

- Welcome email on registration
- Password reset
- Subscription confirmation
- Draw winner notification (prize amount + claim link)

---

## 🌐 Deployment

### Production + Local Together
Local stays on `http://localhost:3000` and `http://localhost:5000` by default.
For production, Vercel uses `NEXT_PUBLIC_API_URL` and Render uses `FRONTEND_URL`.
This lets you run localhost and live URLs in parallel without changing code.

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
# Set env vars in Vercel dashboard
```

### Backend → Render
1. Connect GitHub repo to Render
2. Use `render.yaml` at repo root
3. Set all env vars in Render dashboard

---

## 🗓️ Cron Jobs (Auto-scheduled)

| Schedule | Action |
|---|---|
| Last day of month 8 PM | Auto-execute monthly draw |
| Daily 2 AM | Expire overdue subscriptions + notify |

---

## 📊 Admin Panel Routes

| Route | Description |
|---|---|
| `/admin` | Dashboard with stats + revenue charts |
| `/admin/users` | User list, search, activate/deactivate |
| `/admin/draws` | Create, simulate, execute draws |
| `/admin/winners` | Verify proof, approve/reject, mark paid |
| `/admin/charities` | CRUD charity listings |
| `/admin/analytics` | Revenue, subscription breakdown, pie charts |

---

## 🧪 Test Razorpay Credentials

Use these for testing (no real money):
- **Card**: 4111 1111 1111 1111, CVV: any 3 digits, Expiry: any future date
- **UPI**: success@razorpay
- **Net Banking**: any bank, any credentials

---

## 📄 License

MIT © Golf Charity Platform
