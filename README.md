# ChainHire 2.0 🌐🔗

**ChainHire 2.0** is an enterprise-grade, decentralized employment verification and Web3 recruitment platform. It connects talent with leading decentralized protocols, allowing candidates to cryptographically verify their work experience on the Ethereum blockchain via Solidity smart contracts, while recruiters post jobs and manage verified applicants with zero fraud.

---

## ⚡ Tech Stack

- **Frontend**: HTML5 + Tailwind CSS + Vanilla JavaScript (ES6+ modular, NO React, NO Vue, zero framework dependencies)
- **Backend**: Node.js + Express.js
- **Database**: MySQL (Connection pooling, auto-schema generation, foreign keys)
- **Authentication**: JWT (JSON Web Tokens) + bcrypt password hashing
- **File Upload**: Multer (Resumes/CVs & Avatars)
- **Blockchain**: Solidity 0.8.20 + Hardhat + Ethers.js v6
- **Smart Contract Network**: Hardhat Localhost (`http://127.0.0.1:8545`) / Ethereum Sepolia Testnet

---

## 🎨 Design System

- **Primary Color**: `#0F172A` (Dark Navy)
- **Accent Color**: `#10B981` (Emerald Green)
- **Background**: `#F8FAFC` (Soft Off-White)
- **Cards**: Pure `#FFFFFF` with soft shadows and delicate borders
- **Font Family**: Inter / system-ui
- **Border Radius**: `8px`–`12px`
- **Status Badges**:
  - **Verified**: Green (`#10B981` with check icon)
  - **Pending**: Amber / Blue (`#F59E0B` / `#3B82F6` with clock icon)
  - **Rejected**: Red (`#EF4444` with cross icon)
- **Sidebar**: Dark Navy background with emerald active left indicator border

---

## 📂 Project Structure

```
chainhire-v2/
├── backend/
│   ├── config/
│   │   ├── db.js                     # MySQL pool & auto-table migration
│   │   ├── blockchain.js             # Ethers.js provider and contract ABI bindings
│   │   └── contractData.json         # Deployed contract metadata
│   ├── controllers/
│   │   ├── authController.js         # Register, Login, Profile & Wallet
│   │   ├── experienceController.js   # Seeker experiences CRUD
│   │   ├── verificationController.js # Verification request, inbox & on-chain approval
│   │   ├── jobController.js          # Job postings & applications
│   │   ├── adminController.js        # Analytics & user moderation
│   │   └── chatController.js         # Real-time messages & notifications
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification
│   │   ├── role.js                   # Role-based access control
│   │   └── upload.js                 # Multer storage
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── experienceRoutes.js
│   │   ├── verificationRoutes.js
│   │   ├── jobRoutes.js
│   │   ├── adminRoutes.js
│   │   └── chatRoutes.js
│   ├── contracts/
│   │   └── EmploymentVerification.sol # Solidity 0.8.20 registry contract
│   ├── scripts/
│   │   └── deploy.js                 # Deployment script
│   ├── hardhat.config.js
│   ├── server.js                     # Express API server
│   ├── seed.js                       # Test data seeder
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── styles.css                # Tailwind & custom design tokens
│   ├── js/
│   │   ├── config.js                 # API endpoints & ABI
│   │   ├── api.js                    # Fetch client & Toast notifications
│   │   ├── auth.js                   # Auth state & navigation renderer
│   │   ├── web3.js                   # Ethers.js v6 MetaMask manager
│   │   ├── seeker.js                 # Seeker experiences & stats
│   │   ├── recruiter.js              # Verification inbox & on-chain approval
│   │   ├── admin.js                  # Platform metrics & user toggles
│   │   ├── jobs.js                   # Job discovery & applications
│   │   └── chat.js                   # Messages interface
│   ├── pages/
│   │   ├── index.html                # Landing page
│   │   ├── login.html                # Login with 1-click test credentials
│   │   ├── register.html             # Role-based registration
│   │   ├── seeker-dashboard.html     # Seeker dashboard
│   │   ├── recruiter-dashboard.html  # Recruiter hub
│   │   ├── admin-dashboard.html      # Admin overview (Screenshot 3)
│   │   ├── profile.html              # Alex Morgan profile (Screenshot 1)
│   │   ├── settings.html             # Account & Wallet settings (Screenshot 2)
│   │   ├── jobs.html                 # Job opportunities grid (Screenshot 4)
│   │   ├── applications.html         # Job applications table (Screenshot 5)
│   │   ├── messages.html             # Direct messaging
│   │   └── contracts.html            # On-chain credentials ledger
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MySQL Server**: Running on `localhost:3306` (e.g., via XAMPP or native MySQL)
- **Browser**: Modern web browser with optional **MetaMask** extension installed

---

### 2. Backend Setup

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd chainhire-v2/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure your `.env` file exists and reflects your database configuration:
   ```env
   PORT=5000
   NODE_ENV=development

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=chainhire_db

   JWT_SECRET=chainhire_super_secure_secret_jwt_key_2026_x89f
   JWT_EXPIRES_IN=7d

   HARDHAT_RPC_URL=http://127.0.0.1:8545
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

4. Populate realistic sample data (users, experiences, jobs, applications, notifications):
   ```bash
   npm run seed
   ```

---

### 3. Smart Contract Deployment

1. Compile the Solidity 0.8.20 contract:
   ```bash
   npm run compile
   ```

2. Deploy locally to Hardhat or Sepolia:
   ```bash
   # For local hardhat testing:
   npm run deploy:local

   # Or for Sepolia testnet (ensure private key and RPC are in .env):
   npm run deploy:sepolia
   ```

---

### 4. Running the Platform

1. Start the Express API server:
   ```bash
   npm start
   ```
   The backend server automatically initializes MySQL tables and serves both the API endpoints and frontend assets at:
   👉 **`http://localhost:5000`**

2. Access any page directly in your browser:
   - **Landing Page**: [http://localhost:5000/pages/index.html](http://localhost:5000/pages/index.html)
   - **Login**: [http://localhost:5000/pages/login.html](http://localhost:5000/pages/login.html)
   - **Seeker Profile**: [http://localhost:5000/pages/profile.html](http://localhost:5000/pages/profile.html)
   - **Browse Jobs**: [http://localhost:5000/pages/jobs.html](http://localhost:5000/pages/jobs.html)
   - **Applications**: [http://localhost:5000/pages/applications.html](http://localhost:5000/pages/applications.html)
   - **Settings**: [http://localhost:5000/pages/settings.html](http://localhost:5000/pages/settings.html)
   - **Recruiter Dashboard**: [http://localhost:5000/pages/recruiter-dashboard.html](http://localhost:5000/pages/recruiter-dashboard.html)
   - **Admin Overview**: [http://localhost:5000/pages/admin-dashboard.html](http://localhost:5000/pages/admin-dashboard.html)

---

## 🔑 Pre-Configured Demo Accounts

For effortless testing, the Login page (`pages/login.html`) includes **1-Click Demo Buttons**:

| Role | Email | Password | What You Can Do |
| :--- | :--- | :--- | :--- |
| **Job Seeker** (Alex Morgan) | `alex.morgan@example.com` | `password123` | View experiences, request verification, apply to jobs, manage profile & wallet |
| **Recruiter** (Sophia Lee) | `sophia.lee@chainhire.io` | `password123` | Verification inbox, approve on-chain via MetaMask, post jobs, review applicants |
| **Recruiter / Verifier** (James Patel) | `james.patel@chainhire.io` | `password123` | Sign on-chain verifications for DeFi Labs credentials |
| **Admin** | `admin@chainhire.io` | `password123` | Platform analytics (total users, verified credentials, jobs), block/unblock accounts |

---

## 🔗 Blockchain Verification Flow

1. **Job Seeker** creates an employment experience (e.g. *Blockchain Developer at DeFi Labs*) and clicks **Verify**.
2. A verification request is routed to the **Recruiter's Inbox** (`recruiter-dashboard.html`).
3. The recruiter reviews the tenure and clicks **Approve (On-Chain)**.
4. **MetaMask** prompts the recruiter to sign the transaction calling `EmploymentVerification.approveVerification(...)`.
5. Once mined on the blockchain, the receipt `txHash` is transmitted to the backend, the database records the hash and marks the credential as **Verified**.
6. The candidate's badge immediately updates to **Verified**, showing a direct clickable link to **View on Etherscan**.

---

## 🛡️ License

MIT License © 2026 ChainHire 2.0. Built for Web3 excellence.
