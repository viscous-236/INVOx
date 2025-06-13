import React, { useState, useEffect, use } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContract } from '../contract/Main';
import { useWallet } from '../WalletContext';
import { getReadOnlyContract } from '../contract/Main';

const Home = () => {
  const [activeRole, setActiveRole] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  const { address, contract, isConnected, isConnecting, connectWallet } = useWallet();


  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleRoleSelection = async (role) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const hasChosenRole = await contract.hasChosenRole(address);
      console.log("Has chosen role:", hasChosenRole);

      if (!hasChosenRole) {
        const roleMapping = {
          'supplier': 0,
          'buyer': 1,
          'investor': 2
        };

        await contract.chooseRole(roleMapping[role]);
        console.log(`Role chosen: ${role}`);
        setActiveRole(role);
        alert(`You have chosen the role: ${role.charAt(0).toUpperCase() + role.slice(1)}`);
        navigate(`/${role}`);
      } else {
        const userRoleIndex = await contract.getUserRole(address);
        console.log("User role index from contract:", userRoleIndex);

        const roleIndexMapping = {
          0: 'supplier',
          1: 'buyer',
          2: 'investor'
        };

        const existingRole = roleIndexMapping[parseInt(userRoleIndex)];
        console.log("Existing role:", existingRole);

        if (existingRole === role) {
          setActiveRole(role);
          navigate(`/${role}`);
        } else {
          alert(`You have already chosen the role: ${existingRole.charAt(0).toUpperCase() + existingRole.slice(1)}. You cannot change your role.`);
          setActiveRole(existingRole);
          navigate(`/${existingRole}`);
        }
      }
    } catch (error) {
      console.error("Error in role selection:", error);
      alert("Failed to process role selection. Please try again.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* New Background Pattern */}
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)] mx-auto"></div>

      {/* Dynamic cursor effect */}
      <div
        className="fixed w-96 h-96 pointer-events-none z-0 opacity-20 transition-all duration-1000 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)',
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
        }}
      />

      {/* Header */}
      <header className="relative z-20">
        <nav
          className="flex items-center justify-between px-8 py-6 backdrop-blur-2xl bg-black/60 border-b border-gray-700/30 transition-all duration-300"
          style={{
            backdropFilter: `blur(${Math.min(scrollY / 8, 20)}px)`,
            background: `rgba(0, 0, 0, ${Math.min(0.6 + scrollY / 1000, 0.9)})`
          }}
        >
          {/* Logo */}
          <div className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300">
                <span className="text-white font-black text-xl">IF</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75" />
            </div>
            <div className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              InvoiceFinance
            </div>
            <div className="hidden lg:block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium">
              BETA
            </div>
          </div>

          {/* Navigation */}
          <div className="hidden xl:flex items-center space-x-8">
            {['How it Works', 'Marketplace', 'Analytics', 'Security'].map((item, index) => (
              <div key={item} className="relative group cursor-pointer">
                <a
                  href=""
                  className="text-gray-300 hover:text-white transition-all duration-300 font-medium relative py-2 px-4 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-500/10"
                >
                  {item}
                  <span className="absolute -bottom-2 left-4 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300 group-hover:w-[calc(100%-2rem)]" />
                </a>
                {index === 1 && (
                  <div className="absolute -top-2 -right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={connectWallet}
              className="relative bg-gradient-to-r from-black via-purple-900/45 to-cyan-600/30 text-white px-8 py-3 rounded-xl hover:from-purple-900/45 hover:via-black hover:to-cyan-600/30 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 font-bold group overflow-hidden cursor-pointer border border-purple-500/30 hover:border-purple-400/50">

              <span className="relative z-10 flex items-center space-x-2">
                <span className="text-sm">🔗 {isConnected ? address.slice(0, 6) + '...' + address.slice(-4) : 'Connect Wallet'}</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-pink-400/0 to-cyan-400/0 group-hover:from-purple-400/20 group-hover:via-black-400/20 group-hover:to-cyan-400/20 rounded-xl transition-all duration-500" />
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="px-8 py-20 text-center">
          <div className="max-w-6xl mx-auto">
            {/* Status indicator */}
            <div className="inline-flex items-center bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl border border-purple-500/40 rounded-full px-6 py-3 mb-12 group hover:border-purple-400/60 transition-all duration-500 shadow-lg shadow-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-purple-300 font-medium">⚡ Powered by Chainlink</span>
              </div>
            </div>

            {/* Main Hero Text */}
            <div className="mb-16 space-y-6">
              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter">
                <div className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent mb-2">
                  Transform Invoices
                </div>
                <div className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%] animate-pulse">
                  into Liquid Assets
                </div>
              </h1>

              <div className="space-y-4 max-w-4xl mx-auto">
                <p className="text-2xl md:text-3xl text-gray-200 font-light leading-relaxed">
                  Next-Generation Decentralized Invoice Financing
                </p>
                <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mx-auto">
                  Unlock instant liquidity from your invoices with AI-powered verification,
                  institutional-grade security, and automated smart contract execution
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-center mb-16">
              <button className="relative group bg-gradient-to-r from-black via-purple-900/45 to-cyan-600/30 text-white px-12 py-4 rounded-xl hover:from-black hover:via-black hover:to-black transition-all duration-300 transform hover:scale-105 shadow-xl shadow-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/70 font-bold text-lg overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60">
                <span className="relative z-10 flex items-center space-x-2">
                  <span>🚀 Start Investing Now</span>
                  <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse group-hover:animate-ping" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-pink-400/0 to-cyan-400/0 group-hover:from-purple-400/30 group-hover:via-pink-700/5 group-hover:to-cyan-400/30 rounded-xl transition-all duration-500" />
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 via-black-600 to-cyan-800/5 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500 -z-10" />
              </button>

              <button className="group bg-gray-800/60 backdrop-blur-xl border border-gray-600/50 text-white px-12 py-4 rounded-xl hover:bg-gray-700/60 hover:border-gray-500/60 transition-all duration-300 font-bold text-lg flex items-center space-x-3 cursor-pointer hover:shadow-lg hover:shadow-gray-500/20 relative overflow-hidden">
                <span>🔍 Join Platform</span>
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                  <span className="text-xs">→</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-600/0 to-gray-400/0 group-hover:from-gray-600/10 group-hover:to-gray-400/10 rounded-xl transition-all duration-300" />
              </button>
            </div>

            {/* Live stats */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { value: "$47.2M", label: "Total Volume", change: "+12.5%", icon: "📈" },
                  { value: "8,420", label: "Active Invoices", change: "+8.2%", icon: "📋" },
                  { value: "99.7%", label: "Success Rate", change: "+0.1%", icon: "✅" },
                  { value: "23.8%", label: "Avg APY", change: "+2.1%", icon: "💎" }
                ].map((stat, index) => (
                  <div key={index} className="text-center group cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-500/10 rounded-xl p-4 transition-all duration-300">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-black text-white mb-1 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {stat.value}
                    </div>
                    <div className="text-gray-400 font-medium text-sm mb-1">
                      {stat.label}
                    </div>
                    <div className="text-green-400 text-xs font-semibold group-hover:text-green-300 transition-colors duration-300">
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="px-8 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-900/40 via-cyan-900/40 to-emerald-900/40 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-8 group hover:border-emerald-400/60 transition-all duration-500 shadow-xl shadow-emerald-500/20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 font-bold text-lg">🔗 Connected to InvoiceFinance</span>
                </div>
                <div className="bg-gray-800/60 px-4 py-2 rounded-lg border border-gray-600/50">
                  <span className="text-gray-300 font-mono text-sm">{isConnected ? address.slice(0, 6) + '...' + address.slice(-4) : 'Connect Wallet'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-gray-400 font-medium mb-2">Your Invoices</div>
                  <div className="text-white font-black text-3xl">47</div>
                  <div className="text-gray-400">Active & Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 font-medium mb-2">Total Value</div>
                  <div className="text-cyan-400 font-black text-3xl">$284K</div>
                  <div className="text-cyan-400">Invoice Volume</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 font-medium mb-2">Platform Fees</div>
                  <div className="text-green-400 font-black text-3xl">$127</div>
                  <div className="text-green-400">Total Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 font-medium mb-2">Account Status</div>
                  <div className="text-emerald-400 font-black text-3xl">✓ Active</div>
                  <div className="text-emerald-400">Verified User</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Role Selection */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Choose Your Journey
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Select your role and unlock the power of decentralized invoice financing
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {[
                {
                  icon: "📋",
                  title: "Supplier",
                  subtitle: "For Businesses",
                  description: "Transform your outstanding invoices into immediate working capital",
                  features: [
                    "Instant liquidity access",
                    "Real-time ERP integration",
                    "Automated smart contracts",
                    "Multi-currency support"
                  ],
                  gradient: "from-blue-600/30 to-cyan-600/30",
                  border: "border-blue-500/40",
                  hoverBorder: "hover:border-blue-400/70",
                  role: "supplier",
                  accent: "blue",
                  cta: "Start Financing"
                },
                {
                  icon: "💳",
                  title: "Buyer",
                  subtitle: "For Enterprises",
                  description: "Manage invoice payments with advanced automation and tracking",
                  features: [
                    "Payment automation",
                    "Transaction tracking",
                    "Dispute resolution",
                    "Analytics dashboard"
                  ],
                  gradient: "from-emerald-600/30 to-green-600/30",
                  border: "border-emerald-500/40",
                  hoverBorder: "hover:border-emerald-400/70",
                  role: "buyer",
                  accent: "emerald",
                  cta: "Manage Payments"
                },
                {
                  icon: "💰",
                  title: "Investor",
                  subtitle: "For Capital",
                  description: "Earn yields by investing in tokenized invoice assets",
                  features: [
                    "High-yield investments",
                    "Portfolio diversification",
                    "Risk assessment tools",
                    "Real-time analytics"
                  ],
                  gradient: "from-purple-600/30 to-pink-600/30",
                  border: "border-purple-500/40",
                  hoverBorder: "hover:border-purple-400/70",
                  role: "investor",
                  accent: "purple",
                  cta: "Start Investing"
                }
              ].map((role, index) => (
                <div
                  key={index}
                  className={`relative bg-gradient-to-br ${role.gradient} backdrop-blur-2xl border ${role.border} ${role.hoverBorder} rounded-3xl p-8 hover:transform hover:scale-[1.02] transition-all duration-500 cursor-pointer group ${activeRole === role.role ? 'ring-2 ring-white/60 scale-[1.02]' : ''} overflow-hidden`}

                >
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
                  </div>

                  <div className="relative z-10">
                    <div className="text-center mb-8">
                      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        {role.icon}
                      </div>
                      <h3 className="text-3xl font-black text-white mb-2">{role.title}</h3>
                      <p className={`text-${role.accent}-400 font-semibold`}>{role.subtitle}</p>
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 text-center">
                      {role.description}
                    </p>

                    <div className="space-y-3 mb-8">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-gray-300 font-medium">
                          <div className={`w-2 h-2 bg-${role.accent}-400 rounded-full mr-3 opacity-80`} />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        handleRoleSelection(role.role);
                      }}
                      className={`w-full bg-gradient-to-r from-${role.accent}-600/60 to-${role.accent}-500/60 backdrop-blur-sm text-white border border-${role.accent}-400/40 rounded-xl py-4 hover:from-${role.accent}-500/70 hover:to-${role.accent}-400/70 hover:border-${role.accent}-300/60 transition-all duration-300 font-bold group-hover:shadow-xl group-hover:shadow-${role.accent}-500/30 relative overflow-hidden cursor-pointer hover:scale-[1.02]`}>
                      <span className="relative z-10">{role.cta}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <div className={`absolute -inset-1 bg-gradient-to-r from-${role.accent}-500 to-${role.accent}-400 rounded-xl blur opacity-0 group-hover:opacity-20 transition-all duration-500 -z-10`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                How It Works
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Four seamless steps to transform invoices into tradeable digital assets
              </p>
            </div>

            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-cyan-500/50 to-purple-500/50 transform -translate-y-1/2" />

              <div className="grid lg:grid-cols-4 gap-8">
                {[
                  {
                    number: "01",
                    title: "Create & Submit",
                    description: "Upload invoices with automated ERP integration and AI-powered validation",
                    icon: "📝",
                    color: "from-blue-500 to-cyan-500"
                  },
                  {
                    number: "02",
                    title: "Verify & Tokenize",
                    description: "Smart contracts verify authenticity and convert invoices into tradeable tokens",
                    icon: "🔍",
                    color: "from-emerald-500 to-green-500"
                  },
                  {
                    number: "03",
                    title: "Trade & Invest",
                    description: "Investors purchase token shares with real-time pricing and instant settlement",
                    icon: "📊",
                    color: "from-purple-500 to-pink-500"
                  },
                  {
                    number: "04",
                    title: "Collect & Distribute",
                    description: "Automated systems collect payments and distribute returns to all stakeholders",
                    icon: "💎",
                    color: "from-orange-500 to-red-500"
                  }
                ].map((step, index) => (
                  <div key={index} className="relative group">
                    <div className="bg-gray-800/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-8 hover:bg-gray-700/40 hover:border-gray-600/70 transition-all duration-500 group-hover:transform group-hover:scale-105">
                      <div className="text-5xl mb-6 text-center group-hover:scale-110 transition-transform duration-300">
                        {step.icon}
                      </div>

                      <div className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-xl flex items-center justify-center text-lg font-black text-white mx-auto mb-6 group-hover:shadow-lg transition-all duration-300`}>
                        {step.number}
                      </div>

                      <h4 className="text-xl font-black text-white mb-4 text-center">{step.title}</h4>
                      <p className="text-gray-400 leading-relaxed font-medium text-center text-sm">{step.description}</p>
                    </div>

                    <div className="hidden lg:block absolute top-1/2 -right-4 w-4 h-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transform -translate-y-1/2 z-10 shadow-lg shadow-purple-500/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-gray-700/30 bg-gray-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Main content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

            {/* Brand */}
            <div>
              <h3 className="text-xl font-bold text-white mb-3">InvoiceFinance Protocol</h3>
              <p className="text-gray-400 text-sm">Revolutionizing DeFi Infrastructure</p>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-white font-medium mb-4">Features</h4>
              <div className="space-y-2.5">
                <div className="text-gray-400 text-sm">Invoice Factoring</div>
                <div className="text-gray-400 text-sm">Liquidity Pools</div>
                <div className="text-gray-400 text-sm">Risk Assessment</div>
              </div>
            </div>

            {/* Tech stack */}
            <div>
              <h4 className="text-white font-medium mb-4">Built With</h4>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">Ethereum</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 text-sm">Chainlink</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-gray-700/30 text-center">
            <div className="text-gray-400 font-medium mb-2">
              © 2024 InvoiceFinance Protocol
            </div>
            <div className="text-gray-500 text-sm">
              Building the Future of Decentralized Finance
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;