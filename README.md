# 📄 RWA Invoice Financing Protocol

A decentralized protocol to finance real-world invoices using tokenized assets and onchain logic. It allows **suppliers** to tokenize invoices, **investors** to fund them in exchange for yield, and **buyers** to repay at maturity. Powered by **Chainlink Functions** , **Automation** and **Feeds**.

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
