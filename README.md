![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)
![Hardhat](https://img.shields.io/badge/Hardhat-Blockchain-yellow)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![IPFS](https://img.shields.io/badge/IPFS-DecentralizedStorage-green)
![License](https://img.shields.io/badge/License-Academic-red)

# SkillChainMY – Decentralized Student Credential Portfolio

A full-stack Web3 application that enables educational institutions to issue, manage, and verify academic and extracurricular credentials using Ethereum Smart Contracts, Soulbound Tokens (SBTs), and IPFS.

SkillChainMY provides a secure, tamper-resistant, and decentralized platform for storing student achievements while allowing employers and recruiters to verify credentials without relying on centralized databases.

---

## 📌 Features

### 👨‍💼 Admin

* Manage authorized credential issuers
* Grant and revoke issuer roles
* Monitor credential ecosystem

### 🏫 Issuer

* Issue blockchain-based credentials
* Upload credential metadata to IPFS
* Mint Soulbound Tokens (non-transferable NFTs)

### 🎓 Student

* View credential portfolio
* Store achievements permanently on-chain
* Generate recruiter verification access codes

### 🔍 Recruiter

* Verify credentials without a wallet
* Access student portfolios using secure passcodes
* Validate authenticity directly from the blockchain

---

## 🏗️ Technology Stack

### Blockchain

* Solidity
* Hardhat
* OpenZeppelin Contracts
* Ethereum Sepolia Testnet

### Frontend

* React
* Vite
* Ethers.js
* MetaMask

### Storage

* IPFS
* Pinata

---

# 🛠 Prerequisites

Before running the project, ensure you have:

1. Node.js (v18+ recommended)
2. MetaMask Browser Extension
3. Alchemy Account
4. Pinata Account
5. Etherscan Account (for contract verification)

---

# ⚙️ Backend Setup (Hardhat)

Navigate to the blockchain project root directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend root directory:

```env
# Sepolia Network
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# MetaMask Private Key
# Use a TEST wallet only
PRIVATE_KEY=0xYourPrivateKey

# Etherscan API Key
ETHERSCAN_API_KEY=YourEtherscanApiKey
```

Compile contracts:

```bash
npx hardhat compile
```

---

# 🚀 Deploying Smart Contracts

## Option 1: Deploy to Local Hardhat Network

Start a local blockchain:

```bash
npx hardhat node
```

In another terminal:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

The deployed contract address will be displayed in the terminal.

---

## Option 2: Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment, copy the generated contract address:

```text
0x1234567890abcdef...
```

You will need this address for frontend configuration.

---

# 💻 Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the frontend folder:

```env
# Pinata Configuration
VITE_PINATA_API_KEY=
VITE_PINATA_SECRET_KEY=""
VITE_PINATA_GATEWAY_URL=""

# Network Mode
# Change between:
# local = Hardhat Local Network
# live  = Sepolia Testnet
VITE_APP_ENV="live"

# Sepolia RPC
VITE_SEPOLIA_RPC=
```

---

# 🔄 Switching Between Local and Sepolia

SkillChainMY supports both local development and live Sepolia deployment.

Simply change:

```env
VITE_APP_ENV="local"
```

or

```env
VITE_APP_ENV="live"
```

No code changes are required.

| Mode  | Description                          |
| ----- | ------------------------------------ |
| local | Connects to local Hardhat blockchain |
| live  | Connects to Sepolia Testnet          |

---

# 🔗 Update Contract Address

Open:

```javascript
frontend/src/utils/config.js
```

Replace the contract address:

```javascript
export const CONTRACT_ADDRESS =
  "0xYourDeployedContractAddress";
```

Use:

* Local deployment address when running locally
* Sepolia deployment address when running on Sepolia

---

# 📄 Update Contract ABI

After each deployment or contract update:

Copy:

```text
artifacts/contracts/SkillChainMY.sol/SkillChainMY.json
```

Paste into:

```text
frontend/src/contracts/SkillChainMY.json
```

This ensures the frontend interacts with the latest smart contract interface.

---

# ▶️ Running the Application

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 🧪 Demonstration Guide

## 1. Admin

Connect using the wallet that deployed the contract.

Capabilities:

* Access Admin Panel
* Add Issuers
* Revoke Issuers

---

## 2. Issuer

Switch MetaMask to a second account.

Admin grants this account the Issuer Role.

Capabilities:

* Issue Credentials
* Upload Metadata to IPFS
* Mint Soulbound Tokens

---

## 3. Student

Switch MetaMask to a third account.

Issuer sends credentials to this address.

Capabilities:

* View Portfolio
* Manage Credentials
* Generate Recruiter Access Codes

---

## 4. Recruiter

Disconnect MetaMask or open an Incognito Window.

Navigate to:

```text
Recruiter Verify
```

Enter:

* Student Wallet Address
* Recruiter Passcode

Capabilities:

* Verify Credentials
* View Student Portfolio
* Confirm Authenticity Without Wallet Access

---

# 📁 Project Structure

```text
SkillChainMY
│
├── backend
│   ├── contracts
│   ├── scripts
│   ├── test
│   ├── hardhat.config.ts
│   └── .env
│
├── frontend
│   ├── src
│   │   ├── contracts
│   │   ├── context
│   │   └── utils
│   │
│   └── .env
│
└── README.md
```

---

# 🔒 Security Features

* Soulbound Tokens (Non-transferable NFTs)
* Role-Based Access Control
* Credential Revocation Support
* IPFS Decentralized Storage
* Recruiter Verification Access Control
* OpenZeppelin Security Libraries
* Reentrancy Protection

---

# 📚 Academic Project

Developed for:

**CCS6354 – Blockchain and Smart Contract Assignment**

Multimedia University (MMU)

---

# 📜 License

This project is developed for educational and academic purposes.
