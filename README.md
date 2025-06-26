# 📄 RWA Invoice Financing Protocol - INVOx

A decentralized protocol to finance real-world invoices using tokenized assets and onchain logic. It allows **suppliers** to tokenize invoices, **investors** to fund them in exchange for yield, and **buyers** to repay at maturity. Powered by **Chainlink Functions**, **Automation** and **Feeds**.

---

## 🤔 How It Works

### The Problem We Solve
Traditional invoice financing is slow, expensive, and requires intermediaries. Small suppliers often wait 30-90 days to get paid, creating cash flow problems. Our dApp creates a decentralized marketplace where suppliers can get instant liquidity by tokenizing their invoices.

### Simple 3-Step Process

#### 🏭 **Step 1: Supplier Creates Invoice Token**
<img width="889" alt="image" src="https://github.com/user-attachments/assets/dc1fc784-6f16-493d-bcbf-7c57d54d9ea6" />

1. **Upload Invoice**: Supplier connects their wallet and uploads invoice details (amount, buyer info, due date)
2. **Smart Verification**: Chainlink Functions automatically verifies the invoice through ERP systems
3. **Token Creation**: Protocol mints ERC-20 tokens representing the invoice value (1 token = $1 USD)
4. **List for Funding**: Invoice tokens become available for investors to purchase

#### 💰 **Step 2: Investors Fund the Invoice**
<img width="888" alt="image" src="https://github.com/user-attachments/assets/4824950c-8b9e-4108-81e1-e75f7d8d850e" />

1. **Browse Opportunities**: Investors see available invoices with expected returns and risk ratings
2. **Purchase Tokens**: Investors buy invoice tokens using ETH (converted via Chainlink Price Feeds)
3. **Instant Payout**: Once minimum funding is reached, supplier receives immediate payment
4. **Wait for Returns**: Investors hold tokens until the buyer pays the invoice

#### 🏢 **Step 3: Buyer Repays & Investors Get Paid**
<img width="889" alt="image" src="https://github.com/user-attachments/assets/9bf937c9-0fbd-4523-84d1-294697e0b733" />

1. **Payment Due**: Chainlink Automation monitors due dates and notifies the buyer
2. **Buyer Pays**: Buyer logs in and pays the invoice amount (also handles the payment delay penalty with two days grace period + 4% penalty with each passing day)
4. **Automatic Distribution**: Smart contract automatically distributes returns to investors based on their token holdings
5. **Profit Realized**: Investors receive their principal + yield, tokens are burned

### Real-World Example

**Scenario**: ABC Manufacturing has a $10,000 invoice from XYZ Corp, due in 60 days.

1. **ABC (Supplier)** uploads the invoice → Protocol mints 10,000 - 5%*10000 tokens = 95,000
2. **Investors** buy all 9,500 tokens with 1 token = 1$
3. **ABC** receives $9,500 immediately (instead of waiting 60 days)
4. **XYZ Corp (Buyer)** pays $10,000 after 60 days
5. **Investors** receive $10,000 total ($9600 + $500)

## 🚀 Features

- 🔐 **Tokenized Invoices**: Invoices are represented as ERC-20 tokens (1 token = $1)
- 🤝 **Supplier-Investor Matching**: Investors fund invoices upfront, suppliers get early liquidity
- ⛓️ **Onchain Payment Tracking**: Buyer payments are tracked onchain using Chainlink Automation
- ⚙️ **ERP Verification**: Invoice metadata is verified via Chainlink Functions through external ERP APIs
- 💸 **Yield Distribution**: Investors receive returns proportional to their token holdings when the buyer pays

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
- `src/contract/InvoiceToken.sol` - ERC-20 token unique for each Approved Inovice (chainlink PriceFeeds)
- `src/contract/Main.sol` - Core cogic with Chainlink Functions and Chainlink automation logic

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
