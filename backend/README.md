# 🛠️ LocalFix Django REST Backend

Production-ready Django REST Framework backend for the **LocalFix** Hyperlocal Trade, Escrow & Mediation Platform.

---

## 🚀 Quickstart (Run in 1 Minute)

### Option A: Standard Python (Windows / macOS / Linux)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Activate virtual environment
venv\Scripts\activate       # Windows PowerShell / CMD
# source venv/bin/activate  # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run database migrations
python manage.py migrate

# 5. Populate seed data (Artisans, categories, escrow vault, forensic audit, marketplace, feed, chat)
python manage.py seed_data

# 6. Start the development server
python manage.py runserver
```

### Option B: Using `uv` (Ultra-fast)

```bash
cd backend
uv run python manage.py migrate
uv run python manage.py seed_data
uv run python manage.py runserver
```

The API will now be running on **`http://127.0.0.1:8000/`**!

---

## 🔑 Seed User Accounts

Once you run `python manage.py seed_data`, the following test accounts are ready:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Superuser / Admin** | `admin@localfix.ng` | `admin123` | Full access to Django Admin Dashboard |
| **Resident Customer** | `babatunde.o@gmail.com` | `password123` | Babatunde Ogundimu (Tier 3 Gold Resident, Ikeja GRA) |
| **Master Artisan** | `tunde.adewale@localfix.ng` | `password123` | Tunde Adewale (COREN Solar & Inverter Tech) |
| **HVAC Artisan** | `ngozi.chukwu@localfix.ng` | `password123` | Ngozi Chukwu (Dual Inverter AC Specialist) |
| **Plumber** | `ibrahim.musa@localfix.ng` | `password123` | Ibrahim Musa (Borehole & Hydrojetting) |
| **Carpenter** | `emeka.okafor@localfix.ng` | `password123` | Emeka Okafor (Custom Cabinetry & Locks) |
| **Arbitrator** | `arbitrator@localfix.ng` | `password123` | Engr. Kehinde Balogun (Lead Dispute Arbitrator) |
| **Arbitrator (Mediation Room)** | `amina.bello@localfix.ng` | `password123` | Amina Bello (Presiding Arbitrator Sector #04) |

---

## 🏛️ Django Admin Dashboard

Open **`http://127.0.0.1:8000/admin/`** in your browser and log in with:
- **Email:** `admin@localfix.ng`
- **Password:** `admin123`

From the Django Admin you can:
- Review & manage **Escrow Vaults** and inspect cryptographic transaction hashes.
- Review **Forensic Technical Inspection** reports and arbitration cases.
- Approve or reject artisan **COREN & NIN** verification badges.
- Manage marketplace listings, video posts, and direct message threads.

---

## 💼 Escrow Financial Business Logic

This backend implements LocalFix's exact transaction rules under `transaction.atomic()` with `select_for_update()` database locks:

1. **Successful Job Fulfillment (2.5% Platform Fee):**
   - When a customer inputs their 4-digit security OTP to sign off on a completed job:
   - LocalFix retains a **2.5% platform transaction fee**.
   - The remaining **97.5% net payout** is transferred directly to the artisan's registered NUBAN account.
2. **Service Unavailable / Cancellation (1% Fee, 99% Client Refund):**
   - If an artisan fails to attend or the booking is cancelled:
   - LocalFix deducts a **1.0% administrative processing fee**.
   - The remaining **99.0% balance** is immediately refunded to the client's bank account or wallet.

---

## 📡 Complete REST API Endpoints

### 1. Authentication (`/api/auth/`)
- `POST /api/auth/register/` — Create new customer or artisan account
- `POST /api/auth/login/` — Obtain JWT access & refresh tokens
- `POST /api/auth/token/refresh/` — Refresh expired access token
- `GET/PUT /api/auth/profile/` — Fetch & update profile, picture, phone, and neighborhood
- `GET /api/auth/users/<uuid:id>/` — View public user profile

### 2. Services & Artisans (`/api/services/`)
- `GET /api/services/categories/` — List 8 core trade categories
- `GET /api/services/workers/` — List all verified artisans (supports `?category=electrician&search=inverter&verified=true`)
- `GET /api/services/workers/<uuid:id>/` — Full artisan profile with portfolios and customer reviews

### 3. Service Bookings (`/api/bookings/`)
- `GET /api/bookings/` — List authenticated user's customer/worker bookings
- `POST /api/bookings/` — Book a verified artisan (with service type, preferred date, address, agreed amount)
- `GET /api/bookings/<booking_code>/` — Booking details, worker info, and event audit log
- `POST /api/bookings/<booking_code>/status/` — Update status (`in_progress`, `completed`, `cancelled`, etc.)

### 4. Escrow Custody & Wallet (`/api/escrow/`)
- `GET /api/escrow/vaults/` — List user's active escrow vaults
- `POST /api/escrow/vaults/fund/` — Fund an escrow vault for a job (creates cryptographic ledger hash)
- `GET /api/escrow/vaults/<ref>/` — Detailed escrow breakdown and ledger audit trail
- `POST /api/escrow/vaults/<ref>/release/` — Release escrow upon OTP confirmation (2.5% fee applied)
- `POST /api/escrow/vaults/<ref>/cancel/` — Cancel booking and initiate 99% client refund
- `GET /api/escrow/wallet/` — Balance in escrow custody, refunds, artisan earnings, and ledger statements

### 5. Disputes & Mediation (`/api/disputes/`)
- `GET /api/disputes/` — List active dispute cases
- `POST /api/disputes/` — Open a dispute and freeze escrow custody
- `GET /api/disputes/<case_number>/` — View tri-party mediation dossier
- `GET /api/disputes/<case_number>/room/` — Live 3-way mediation room metadata, telemetry, and live statements
- `GET /api/disputes/<case_number>/audit/` — Independent forensic bench test report (Megger, Hipot, THD)
- `POST /api/disputes/<case_number>/messages/` — Send tamper-proof mediation statement
- `POST /api/disputes/<case_number>/restitution/` — Execute 100% escrow restitution to homeowner wallet

### 6. P2P Hardware Marketplace (`/api/marketplace/`)
- `GET /api/marketplace/items/` — Filter by `category`, `condition`, `search`, `min_price`, `max_price`
- `POST /api/marketplace/items/` — Create new hardware/tool listing
- `GET /api/marketplace/items/<uuid:id>/` — Listing details and seller verification
- `PATCH /api/marketplace/items/<uuid:id>/` — Update listing
- `DELETE /api/marketplace/items/<uuid:id>/` — Delete listing
- `POST /api/marketplace/items/<uuid:id>/toggle-save/` — Bookmark/save item
- `GET /api/marketplace/saved/` — User's saved items
- `GET /api/marketplace/categories/` — Categories with live listing counts

### 7. Video DIY / Trade Reels (`/api/feed/`)
- `GET /api/feed/videos/` — Video stream with tabs (`for_you`, `trending`, `nearby`, `official`) & category filter
- `POST /api/feed/videos/` — Upload trade video clip
- `GET /api/feed/videos/<uuid:id>/` — View clip (increments view count)
- `POST /api/feed/videos/<uuid:id>/like/` — Toggle like
- `POST /api/feed/videos/<uuid:id>/save/` — Bookmark video
- `GET /api/feed/videos/<uuid:id>/comments/` — Comment thread with nested creator replies
- `POST /api/feed/videos/<uuid:id>/comments/` — Add comment or reply

### 8. Direct Messaging & Chat (`/api/chat/`)
- `GET /api/chat/conversations/` — Active chat threads with unread counts and last message
- `POST /api/chat/conversations/` — Start or retrieve direct message thread with artisan or customer
- `GET /api/chat/conversations/<uuid:id>/` — Conversation details
- `GET /api/chat/conversations/<uuid:id>/messages/` — Message history
- `POST /api/chat/conversations/<uuid:id>/messages/` — Send real-time chat message
- `POST /api/chat/conversations/<uuid:id>/read/` — Mark thread as read

### 9. AI Diagnostic & Triage Assistant (`/api/assistant/`)
- `POST /api/assistant/chat/` — Triage repair query (analyzes technical causes, matches trade category, recommends vetted artisans, provides NGN price estimate, suggests diagnostic checks)
- `GET /api/assistant/prompts/` — Suggested starter prompts for quick troubleshooting

---

## 🧪 Automated Test Suite

Run the full automated test suite covering all 9 subsystems:

```bash
python manage.py test test_suite
```

Output:
```
Ran 10 tests in 33.056s

OK
```

---

## 🔌 Connecting to the Vite Frontend

In your `frontend` project, API calls point to:
`http://127.0.0.1:8000/api/`

CORS is pre-configured in `localfix_backend/settings.py` to accept requests from `http://localhost:5173` and `http://127.0.0.1:5173`.
