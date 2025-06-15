import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../WalletContext';


const BuyerMarketplace = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  // Invoice status enum mapping
  const INVOICE_STATUS = {
    0: 'Pending',
    1: 'Approved',
    2: 'Verified',
    3: 'Funded',
    4: 'Paid',
    5: 'Overdue'
  };

  const USER_ROLE = {
    0: 'None',
    1: 'Supplier',
    2: 'Buyer',
    3: 'Investor'
  };


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

  const { account, address, isConnected, contract } = useWallet();

  // Sample invoice data
  const [invoices] = useState([
    {
      id: 12344,
      supplier: 'TechCorp Ltd',
      amount: 25000,
      dueDate: '2025-07-15',
      status: 'Approved',
      penalty: 0,
      totalDue: 25000,
      description: 'Software Development Services Q2'
    },
    {
      id: 12345,
      supplier: 'Manufacturing Inc',
      amount: 35000,
      dueDate: '2025-06-20',
      status: 'Overdue',
      penalty: 1400,
      totalDue: 36400,
      description: 'Industrial Equipment Supply'
    },
    {
      id: 12346,
      supplier: 'Global Logistics',
      amount: 18000,
      dueDate: '2025-07-01',
      status: 'Approved',
      penalty: 0,
      totalDue: 18000,
      description: 'Shipping & Transportation Services'
    },
    {
      id: 12347,
      supplier: 'Design Studio Pro',
      amount: 12500,
      dueDate: '2025-06-25',
      status: 'Overdue',
      penalty: 500,
      totalDue: 13000,
      description: 'Brand Identity & Marketing Materials'
    },
    {
      id: 12348,
      supplier: 'Cloud Services Co',
      amount: 8500,
      dueDate: '2025-07-10',
      status: 'Approved',
      penalty: 0,
      totalDue: 8500,
      description: 'Monthly Infrastructure Costs'
    },
    {
      id: 12349,
      supplier: 'Legal Associates',
      amount: 15000,
      dueDate: '2025-06-15',
      status: 'Overdue',
      penalty: 750,
      totalDue: 15750,
      description: 'Corporate Legal Services'
    }
  ]);

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter(invoice => invoice.status.toLowerCase() === filterStatus);
  }, [invoices, filterStatus]);

  const stats = useMemo(() => {
    const overdue = invoices.filter(inv => inv.status === 'Overdue');
    const approved = invoices.filter(inv => inv.status === 'Approved');
    const totalPending = invoices.reduce((sum, inv) => sum + inv.totalDue, 0);
    const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty, 0);

    return {
      overdueCount: overdue.length,
      approvedCount: approved.length,
      totalPending,
      totalPenalties
    };
  }, [invoices]);

  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.totalDue.toString());
  };

  const processPayment = async () => {
    if (!selectedInvoice) return;

    // Simulate payment processing
    console.log(`Processing payment of ${paymentAmount} for Invoice #${selectedInvoice.id}`);

    // Show success message and close modal
    alert(`Payment of ${parseFloat(paymentAmount).toLocaleString()} processed successfully!`);
    setSelectedInvoice(null);
    setPaymentAmount('');
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Overdue': 'bg-red-500/20 text-red-400 border-red-500/40',
      'Paid': 'bg-blue-500/20 text-blue-400 border-blue-500/40'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const getDaysOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* New Background Pattern - matching Home.jsx */}
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
              BUYER
            </div>
          </div>


          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">{account}</span>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-12">

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4zl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Settlement Dashboard
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Manage and pay your outstanding invoices with automated smart contract execution
          </p>
        </div>

        {/* Stats Cards - Demo Cards Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              value: stats.overdueCount,
              label: "Overdue",
              change: "Requires attention",
              icon: "⚠️",
              gradient: "from-red-200/1 to-orange-700/20",
              border: "border-red-500/40",
              hoverBorder: "hover:border-red-400/70",
              accent: "red"
            },
            {
              value: stats.approvedCount,
              label: "Approved",
              change: "Ready to pay",
              icon: "✅",
              gradient: "from-emerald-200/1 to-green-700/20",
              border: "border-emerald-500/40",
              hoverBorder: "hover:border-emerald-400/70",
              accent: "emerald"
            },
            {
              value: `$${stats.totalPending.toLocaleString()}`,
              label: "Total Due",
              change: "Outstanding amount",
              icon: "💰",
              gradient: "from-cyan-200/1 to-blue-700/15",
              border: "border-cyan-500/40",
              hoverBorder: "hover:border-cyan-400/70",
              accent: "cyan"
            },
            {
              value: `$${stats.totalPenalties.toLocaleString()}`,
              label: "Penalties",
              change: "Late fees",
              icon: "📈",
              gradient: "from-orange-200/1 to-orange-700/20",
              border: "border-orange-500/40",
              hoverBorder: "hover:border-orange-400/70",
              accent: "orange"
            }
          ].map((stat, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${stat.gradient} backdrop-blur-2xl border ${stat.border} ${stat.hoverBorder} rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden`}
            >
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300 text-sm font-medium">{stat.label}</span>
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{stat.icon}</span>
                </div>
                <div className="text-2xl font-black text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                  {stat.value}
                </div>
                <div className={`text-${stat.accent}-400 text-xs font-semibold`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8 justify-center">
          {[
            { key: 'all', label: 'All Invoices', count: invoices.length },
            { key: 'overdue', label: 'Overdue', count: stats.overdueCount },
            { key: 'approved', label: 'Approved', count: stats.approvedCount }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${filterStatus === filter.key
                ? 'bg-gradient-to-r from-black-600/60 to-grey-600/60 text-white border border-purple-400/50 shadow-lg shadow-purple-500/30 cursor-pointer'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/50 hover:bg-gray-700/40 hover:text-gray-300 backdrop-blur-xl cursor-pointer'
                }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Invoice Grid - Horizontal Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`relative backdrop-blur-2xl border rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden ${invoice.status === 'Overdue'
                ? 'bg-gradient-to-br from-red-100/1 to-orange-700/15 border-red-500/40 hover:border-red-400/70 hover:shadow-xl hover:shadow-red-500/30'
                : 'bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-700/50 hover:border-gray-600/70 hover:shadow-xl hover:shadow-purple-500/20'
                }`}
            >
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-black text-white">#{invoice.id}</div>
                  {getStatusBadge(invoice.status)}
                </div>

                {/* Supplier */}
                <div className="mb-4">
                  <div className="text-gray-400 text-xs font-medium mb-1">SUPPLIER</div>
                  <div className="text-white font-bold text-sm truncate">{invoice.supplier}</div>
                </div>

                {/* Amount Display */}
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-xs font-medium">AMOUNT</span>
                    <span className="text-white font-bold">${invoice.amount.toLocaleString()}</span>
                  </div>
                  {invoice.penalty > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-400 text-xs font-medium">PENALTY</span>
                      <span className="text-red-400 font-bold">+${invoice.penalty.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-600/50 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-400 text-sm font-bold">TOTAL DUE</span>
                      <span className="text-cyan-400 font-black text-lg">${invoice.totalDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Due Date & Status */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-gray-400 text-xs font-medium">DUE DATE</div>
                    <div className="text-white text-sm font-bold">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                  </div>
                  {invoice.status === 'Overdue' && (
                    <div className="text-right">
                      <div className="text-red-400 text-xs font-bold bg-red-500/20 px-2 py-1 rounded-full">
                        {getDaysOverdue(invoice.dueDate)} days late
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <div className="text-gray-400 text-xs font-medium mb-1">DESCRIPTION</div>
                  <div className="text-gray-300 text-sm leading-relaxed line-clamp-2">{invoice.description}</div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handlePayInvoice(invoice)}
                  className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>💳</span>
                    <span>Pay ${invoice.totalDue.toLocaleString()}</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-white">Payment Confirmation</h3>
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
                <span className="text-gray-400 font-medium">Original Amount</span>
                <span className="text-white font-bold">${selectedInvoice.amount.toLocaleString()}</span>
              </div>
              {selectedInvoice.penalty > 0 && (
                <div className="flex justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <span className="text-red-400 font-medium">Penalty</span>
                  <span className="text-red-400 font-bold">${selectedInvoice.penalty.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black border-t pt-4 p-3 bg-cyan-500/10 border-cyan-500/30 rounded-lg">
                <span className="text-white">Total Due</span>
                <span className="text-cyan-400">${selectedInvoice.totalDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="block text-gray-400 text-sm mb-2 font-medium">Payment Amount (USD)</div>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none font-bold text-lg"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 bg-gray-700/50 text-gray-300 py-3 rounded-xl hover:bg-gray-600/50 transition-all duration-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerMarketplace;