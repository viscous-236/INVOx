# 📄 RWA Invoice Financing Protocol

A decentralized protocol to finance real-world invoices using tokenized assets and onchain logic. It allows **suppliers** to tokenize invoices, **investors** to fund them in exchange for yield, and **buyers** to repay at maturity. Powered by **Chainlink Functions**, **Automation** and **Feeds**.

---

## 🤔 How It Works

### The Problem We Solve
Traditional invoice financing is slow, expensive, and requires intermediaries. Small suppliers often wait 30-90 days to get paid, creating cash flow problems. Our dApp creates a decentralized marketplace where suppliers can get instant liquidity by tokenizing their invoices.

### Simple 3-Step Process

#### 🏭 **Step 1: Supplier Creates Invoice Token**
1. **Upload Invoice**: Supplier connects their wallet and uploads invoice details (amount, buyer info, due date)
2. **Smart Verification**: Chainlink Functions automatically verifies the invoice through ERP systems
3. **Token Creation**: Protocol mints ERC-20 tokens representing the invoice value (1 token = $1 USD)
4. **List for Funding**: Invoice tokens become available for investors to purchase

#### 💰 **Step 2: Investors Fund the Invoice**
1. **Browse Opportunities**: Investors see available invoices with expected returns and risk ratings
2. **Purchase Tokens**: Investors buy invoice tokens using ETH (converted via Chainlink Price Feeds)
3. **Instant Payout**: Once minimum funding is reached, supplier receives immediate payment
4. **Wait for Returns**: Investors hold tokens until the buyer pays the invoice

#### 🏢 **Step 3: Buyer Repays & Investors Get Paid**
1. **Payment Due**: Chainlink Automation monitors due dates and notifies the buyer
2. **Buyer Pays**: Buyer logs in and repays the invoice amount + agreed interest
3. **Automatic Distribution**: Smart contract automatically distributes returns to investors based on their token holdings
4. **Profit Realized**: Investors receive their principal + yield, tokens are burned

### Real-World Example

**Scenario**: ABC Manufacturing has a $10,000 invoice from XYZ Corp, due in 60 days.

1. **ABC (Supplier)** uploads the invoice → Protocol mints 10,000 tokens
2. **Investors** buy all 10,000 tokens for $9,500 ETH (5% discount for 60-day wait)
3. **ABC** receives $9,500 immediately (instead of waiting 60 days)
4. **XYZ Corp (Buyer)** pays $10,000 after 60 days
5. **Investors** receive $10,000 total (5.26% return on their $9,500 investment)

### Key Benefits

**For Suppliers:**
- ⚡ Instant liquidity instead of waiting months for payment
- 🔍 Transparent, automated process with no middlemen
- 💸 Access to global investor pool

**For Investors:**
- 📈 Earn yield on real-world assets backed by verified invoices
- 🛡️ Reduced risk through ERP verification and blockchain transparency
- 🌍 Diversify across multiple invoices and industries

**For Buyers:**
- ⏰ Clear payment tracking and automated reminders
- 🤝 Support supplier cash flow without changing payment terms
- 📊 Transparent payment history on blockchain

### Security & Trust Features

- **ERP Verification**: Chainlink Functions verify invoices are real through external business systems
- **Automated Monitoring**: Chainlink Automation tracks payment deadlines and triggers actions
- **Transparent Tracking**: All transactions recorded on blockchain for full audit trail
- **Smart Contract Logic**: No human intervention needed - payments distributed automatically

---

## 🚀 Features

- 🔐 **Tokenized Invoices**: Invoices are represented as ERC-20 tokens (1 token = $1)
- 🤝 **Supplier-Investor Matching**: Investors fund invoices upfront, suppliers get early liquidity
- ⛓️ **Onchain Payment Tracking**: Buyer payments are tracked onchain using Chainlink Automation
- ⚙️ **ERP Verification**: Invoice metadata is verified via Chainlink Functions through external ERP APIs
- 💸 **Yield Distribution**: Investors receive returns proportional to their token holdings when the buyer pays

---

## 🔄 Protocol Workflow

### 1. Supplier Flow
- Uploads invoice metadata (value, buyer/supplier address, due date)
- Chainlink Functions verifies invoice validity via ERP
- Protocol mints ERC-20 tokens representing the invoice value

### 2. Investor Flow
- Investors buys the available tokens
- Funds are transferred to supplier once minimum required capital is raised

### 3. Buyer Flow
- Buyer logs in and views pending invoices
- On due date, makes repayment to the contract
- Investors receive repayment + yield based on their token share

---

## 📦 Tech Stack

- **Solidity** – Smart contracts (ERC-20, invoice logic)
- **Chainlink Functions** – External API integration for ERP invoice verification
- **Chainlink Automation** – Scheduled payment tracking and resolution
- **Chainlink Feeds** - Fetch the realtime value of one dollar in ETH
- **Foundry** – Smart contract development & testing
- **React + Ethers.js** – Frontend interface for all actors

---

## 🏗️ Architecture

### Core Contracts
- `InvoiceToken.sol` - ERC-20 token representing invoice value
- 'Main.sol' - Core logic

### Chainlink Integration
- **Functions**: Verify invoice authenticity through ERP APIs
- **Automation**: Monitor payment deadlines and trigger settlements
- **Price Feeds**: USD/ETH conversion for stable pricing

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rwa-invoice-finance.git
cd rwa-invoice-finance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Compile contracts
forge build

# Run tests
forge test

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Building the future of invoice financing with blockchain technology* 🚀
