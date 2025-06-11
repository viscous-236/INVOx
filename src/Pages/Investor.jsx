import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const Investor = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [scrollY, setScrollY] = useState(0);
  const [showPayments, setShowPayments] = useState(false);
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => setScrollY(window.scrollY);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    getConnectedAccount();
  }, []);

  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        console.log("Account: Disconnected");
        setAccount(null);
        navigate("/");
      } else {
        const newAccount = accounts[0];
        if (newAccount !== account) {
          console.log("Account changed:", newAccount);
          setAccount(newAccount);
          navigate("/");
        }
      }
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [account, navigate]);

  const getConnectedAccount = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          console.log("Retrieved connected account:", accounts[0]);
        } else {
          console.log("No connected accounts found");
          navigate("/");
        }
      } catch (error) {
        console.error('Error getting connected account:', error);
        navigate("/");
      }
    } else {
      alert('Please install MetaMask to connect your wallet.');
      navigate("/");
    }
  };

  // Mock payment history data
  const [paymentHistory] = useState([
    {
      id: 1,
      invoice: '#16304',
      amount: 1598,
      timestamp: '11:37:09 PM',
      date: '2025-06-09',
      source: 'Chainlink Automation',
      status: 'Completed'
    },
    {
      id: 2,
      invoice: '#11549',
      amount: 1178,
      timestamp: '11:36:57 PM',
      date: '2025-06-09',
      source: 'Chainlink Automation',
      status: 'Completed'
    },
    {
      id: 3,
      invoice: '#14782',
      amount: 1550,
      timestamp: '11:36:45 PM',
      date: '2025-06-09',
      source: 'Chainlink Automation',
      status: 'Completed'
    },
    {
      id: 4,
      invoice: '#10561',
      amount: 2821,
      timestamp: '11:36:33 PM',
      date: '2025-06-09',
      source: 'Chainlink Automation',
      status: 'Completed'
    },
    {
      id: 5,
      invoice: '#12847',
      amount: 950,
      timestamp: '10:22:15 PM',
      date: '2025-06-08',
      source: 'Chainlink Automation',
      status: 'Completed'
    }
  ]);

  // Available invoices for investment
  const [availableInvoices] = useState([
    {
      id: 12344,
      supplier: 'TechCorp Ltd',
      buyer: 'Global Industries',
      amount: 25000,
      dueDate: '2025-07-15',
      status: 'Open',
      fundedAmount: 0,
      daysToPayment: 35,
      description: 'Software Development Services'
    },
    {
      id: 12345,
      supplier: 'Manufacturing Inc',
      buyer: 'AutoTech Corp',
      amount: 35000,
      dueDate: '2025-06-20',
      status: 'Funding',
      fundedAmount: 18500,
      daysToPayment: 10,
      description: 'Industrial Equipment Supply'
    },
    {
      id: 12346,
      supplier: 'Global Logistics',
      buyer: 'Retail Chain Ltd',
      amount: 18000,
      dueDate: '2025-07-01',
      status: 'Funded',
      fundedAmount: 18000,
      daysToPayment: 21,
      description: 'Shipping & Transportation'
    },
    {
      id: 12347,
      supplier: 'Design Studio Pro',
      buyer: 'Fashion Brands Co',
      amount: 12500,
      dueDate: '2025-06-25',
      status: 'Open',
      fundedAmount: 0,
      daysToPayment: 15,
      description: 'Brand Identity & Marketing'
    },
    {
      id: 12348,
      supplier: 'Cloud Services Co',
      buyer: 'StartupHub Inc',
      amount: 8500,
      dueDate: '2025-07-10',
      status: 'Funding',
      fundedAmount: 3200,
      daysToPayment: 30,
      description: 'Infrastructure Services'
    },
    {
      id: 12349,
      supplier: 'Legal Associates',
      buyer: 'Corporate Group',
      amount: 15000,
      dueDate: '2025-06-15',
      status: 'Paid',
      fundedAmount: 15000,
      daysToPayment: 0,
      description: 'Legal Services'
    },
    {
      id: 12350,
      supplier: 'Healthcare Solutions',
      buyer: 'Medical Centers Inc',
      amount: 42000,
      dueDate: '2025-07-20',
      status: 'Funded',
      fundedAmount: 42000,
      daysToPayment: 40,
      description: 'Medical Equipment'
    },
    {
      id: 12351,
      supplier: 'Green Energy Co',
      buyer: 'City Infrastructure',
      amount: 67000,
      dueDate: '2025-08-01',
      status: 'Funding',
      fundedAmount: 23500,
      daysToPayment: 52,
      description: 'Solar Panel Installation'
    }
  ]);

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return availableInvoices;
    return availableInvoices.filter(invoice => invoice.status.toLowerCase() === filterStatus);
  }, [availableInvoices, filterStatus]);

  const stats = useMemo(() => {
    const totalValue = availableInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const openInvoices = availableInvoices.filter(inv => inv.status === 'Open').length;
    const fundingInvoices = availableInvoices.filter(inv => inv.status === 'Funding').length;
    const activeInvoices = availableInvoices.filter(inv => inv.status === 'Funded').length;

    return {
      totalInvoices: availableInvoices.length,
      totalValue,
      openInvoices,
      fundingInvoices,
      activeInvoices
    };
  }, [availableInvoices]);

  const handleInvest = (invoice) => {
    if (invoice.status === 'Open' || invoice.status === 'Funding') {
      setSelectedInvoice(invoice);
      setInvestmentAmount('1000');
    }
  };

  const processInvestment = async () => {
    if (!selectedInvoice || !investmentAmount) return;

    console.log(`Processing investment of ${investmentAmount} for Invoice #${selectedInvoice.id}`);
    alert(`Investment of ${parseFloat(investmentAmount).toLocaleString()} processed successfully!\n\nChainlink Automation will handle payment distribution when the invoice is paid.`);
    setSelectedInvoice(null);
    setInvestmentAmount('');
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Open': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'Funding': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      'Funded': 'bg-green-500/20 text-green-400 border-green-500/40',
      'Paid': 'bg-purple-500/20 text-purple-400 border-purple-500/40'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const getFundingProgress = (funded, total) => {
    const percentage = (funded / total) * 100;
    return Math.min(percentage, 100);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background Pattern */}
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
            <div className="hidden lg:block px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-300 font-medium">
              INVESTOR
            </div>
          </div>

          {/* Center - View Payments Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setShowPayments(true)}
              className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 hover:bg-green-500/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300 text-sm font-bold">View Payments</span>
              <span className="text-green-200 text-xs bg-green-500/30 px-2 py-1 rounded-full cursor-pointer">
                {paymentHistory.length}
              </span>
            </button>
          </div>

          {/* Right side - Chainlink Status and Wallet */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <span className="text-orange-300 text-xs font-bold">CHAINLINK ACTIVE</span>
            </div>
            <div className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">{account}</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Invoice Marketplace
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Invest in verified invoices and receive automatic payments via Chainlink Automation
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              value: stats.totalInvoices,
              label: "Total Invoices",
              change: "Available",
              icon: "📄",
              gradient: "from-cyan-200/1 to-blue-700/15",
              border: "border-cyan-500/40"
            },
            {
              value: `${(stats.totalValue / 1000).toFixed(0)}K`,
              label: "Total Value",
              change: "Pool size",
              icon: "💰",
              gradient: "from-emerald-200/1 to-green-700/20",
              border: "border-emerald-500/40"
            },
            {
              value: stats.openInvoices,
              label: "Open",
              change: "Ready to fund",
              icon: "🟢",
              gradient: "from-purple-200/1 to-purple-700/20",
              border: "border-purple-500/40"
            },
            {
              value: stats.activeInvoices,
              label: "Active",
              change: "Earning returns",
              icon: "⚡",
              gradient: "from-orange-200/1 to-orange-700/20",
              border: "border-orange-500/40"
            }
          ].map((stat, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${stat.gradient} backdrop-blur-2xl border ${stat.border} rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300 text-sm font-medium">{stat.label}</span>
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{stat.icon}</span>
                </div>
                <div className="text-2xl font-black text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-xs font-semibold">
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          {[
            { key: 'all', label: 'All Invoices', count: availableInvoices.length },
            { key: 'open', label: 'Open', count: availableInvoices.filter(inv => inv.status === 'Open').length },
            { key: 'funding', label: 'Funding', count: availableInvoices.filter(inv => inv.status === 'Funding').length },
            { key: 'funded', label: 'Funded', count: availableInvoices.filter(inv => inv.status === 'Funded').length },
            { key: 'paid', label: 'Paid by Buyer', count: availableInvoices.filter(inv => inv.status === 'Paid').length }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${filterStatus === filter.key
                ? 'bg-gradient-to-r from-black-600/60 to-grey-600/60 text-white border border-purple-400/50 shadow-lg shadow-purple-500/30 cursor-pointer'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/50 hover:bg-gray-700/40 hover:text-gray-300 backdrop-blur-xl cursor-pointer'
                }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Invoice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="relative backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden bg-gradient-to-br from-gray-800/40 to-gray-700/40 hover:border-gray-600/70 hover:shadow-xl hover:shadow-purple-500/20"
            >
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-black text-white">#{invoice.id}</div>
                  {getStatusBadge(invoice.status)}
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <div className="text-3xl font-black text-white mb-1">
                    ${invoice.amount.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {invoice.status === 'Paid' ? 'Paid by buyer' : `Due in ${invoice.daysToPayment} days`}
                  </div>
                </div>

                {/* Funding Progress */}
                {invoice.status === 'Funding' && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-xs font-medium">FUNDING PROGRESS</span>
                      <span className="text-white text-xs font-bold">
                        {getFundingProgress(invoice.fundedAmount, invoice.amount).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getFundingProgress(invoice.fundedAmount, invoice.amount)}%` }}
                      />
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      ${invoice.fundedAmount.toLocaleString()} / ${invoice.amount.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Invoice Details */}
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs font-medium">SUPPLIER</span>
                    <span className="text-white font-medium text-sm">{invoice.supplier}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs font-medium">BUYER</span>
                    <span className="text-white font-medium text-sm">{invoice.buyer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-medium">DUE DATE</span>
                    <span className="text-white font-medium text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <div className="text-gray-400 text-xs font-medium mb-1">DESCRIPTION</div>
                  <div className="text-gray-300 text-sm">{invoice.description}</div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleInvest(invoice)}
                  disabled={invoice.status === 'Paid'}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg overflow-hidden border group ${invoice.status === 'Open' || invoice.status === 'Funding'
                    ? "w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
                    : invoice.status === 'Paid'
                      ? 'bg-gray-700/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                      : 'bg-green-600/50 text-green-300 border-green-500/30 cursor-default'
                    }`}
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>
                      {invoice.status === 'Open' ? '💎 Invest Now' :
                        invoice.status === 'Funding' ? '⚡ Add Investment' :
                          invoice.status === 'Funded' ? '✅ Fully Funded' :
                            '✨ Paid by Buyer'}
                    </span>
                  </span>
                  {(invoice.status === 'Open' || invoice.status === 'Funding') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Payments Modal */}
      {showPayments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-purple-500/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <h3 className="text-2xl font-black text-white">Payment History</h3>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-bold">
                  {paymentHistory.length} Payments
                </span>
              </div>
              <button
                onClick={() => setShowPayments(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl hover:bg-gray-700/50 rounded-lg p-2"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-orange-300 text-sm font-bold">CHAINLINK AUTOMATION</span>
              </div>
              <p className="text-gray-300 text-sm">
                All payments are automatically processed and distributed via Chainlink Automation when invoices are paid by buyers.
              </p>
            </div>

            <div className="overflow-y-auto max-h-96">
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-xl p-4 hover:border-gray-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center">
                          <span className="text-green-400 text-lg">💰</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">
                            ${payment.amount.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Invoice {payment.invoice} • {payment.date} at {payment.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-green-500/20 text-green-400 border border-green-500/40 px-3 py-1 rounded-full text-xs font-bold mb-2">
                          {payment.status}
                        </div>
                        <div className="text-gray-400 text-xs">
                          via {payment.source}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex justify-between items-center">
                <div className="text-gray-400 text-sm">
                  Total received from {paymentHistory.length} payments
                </div>
                <div className="text-2xl font-black text-white">
                  ${paymentHistory.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">Invest in Invoice</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium">Invoice #</span>
                <span className="text-white font-bold">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium">Supplier</span>
                <span className="text-white font-bold">{selectedInvoice.supplier}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium">Amount</span>
                <span className="text-white font-bold">${selectedInvoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium">Days to Payment</span>
                <span className="text-white font-bold">{selectedInvoice.daysToPayment} days</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Investment Amount
              </label>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full bg-white/10 border border-gray-600/50 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all duration-300"
                placeholder="Enter amount"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-3 bg-gray-700/50 text-gray-300 rounded-xl font-bold hover:bg-gray-600/50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={processInvestment}
                className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
              >
                Invest Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investor;