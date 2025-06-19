import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../WalletContext';

const Buyer = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [scrollY, setScrollY] = useState(0);
  
  // Web3 state
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState('');
  
  const { address, contract, isConnected, connectWallet } = useWallet();

  // Contract enums - Updated to match supplier dashboard
  const INVOICE_STATUS = {
    0: 'Pending',
    1: 'Verification In Progress', 
    2: 'Approved',
    3: 'Rejected',
    4: 'Paid'
  };

  const USER_ROLE = {
    0: 'Supplier',
    1: 'Buyer', 
    2: 'Investor'
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

  useEffect(() => {
    if (contract && address && isConnected) {
      checkUserRole();
    }
  }, [contract, address, isConnected]);

  useEffect(() => {
    if (contract && address && isConnected && userRole === 1) {
      loadBuyerInvoices();
    }
  }, [contract, address, isConnected, userRole]);


  const checkUserRole = async () => {
    if (!contract || !address) return;

    try {
      setLoading(true);
      const role = await contract.getUserRole(address);
      const roleNumber = Number(role);
      setUserRole(roleNumber);
      
      // If user is not a buyer (role 1), prompt them to choose buyer role
      if (roleNumber !== 1) {
        const shouldChooseRole = window.confirm('You need to register as a Buyer to access this page. Would you like to register now?');
        if (shouldChooseRole) {
          await chooseRole(1); // 1 = Buyer
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // If the user hasn't chosen any role, prompt them
      const shouldChooseRole = window.confirm('You need to register as a Buyer to access this page. Would you like to register now?');
      if (shouldChooseRole) {
        await chooseRole(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const chooseRole = async (role) => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.chooseRole(role);
      await tx.wait();
      setUserRole(role);
      alert('Role selected successfully! You are now registered as a Buyer.');
    } catch (error) {
      console.error('Error choosing role:', error);
      alert('Error choosing role: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadBuyerInvoices = async () => {
    if (!contract || !address) return;

    setError('');
    try {
      setLoading(true);
      
      // Get buyer's invoice IDs
      const invoiceIds = await contract.getBuyerInvoiceIds(address);
      console.log('Buyer Invoice IDs:', invoiceIds);
      
      if (invoiceIds.length === 0) {
        setInvoices([]);
        return;
      }

      // Fetch details for each invoice
      const invoicePromises = invoiceIds.map(async (id) => {
        try {
          const details = await contract.getInvoiceDetails(id);
          const dueDate = new Date(Number(details[6]) * 1000);
          const today = new Date();
          const isOverdue = dueDate < today && Number(details[5]) !== 4; // Not paid and overdue
          const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
          
          // Calculate penalty (assuming 1% per day overdue, max 10%)
          const penalty = isOverdue ? Math.min(Number(ethers.formatEther(details[3])) * 0.01 * daysOverdue, Number(ethers.formatEther(details[3])) * 0.1) : 0;
          const totalDue = Number(ethers.formatEther(details[3])) + penalty;

          return {
            id: Number(details[0]),
            supplier: details[1],
            buyer: details[2],
            amount: Number(ethers.formatEther(details[3])),
            investors: details[4],
            status: INVOICE_STATUS[Number(details[5])] || 'Unknown',
            statusCode: Number(details[5]),
            dueDate: dueDate.toISOString().split('T')[0],
            totalInvestment: Number(ethers.formatEther(details[7])),
            isPaid: details[8],
            isOverdue,
            daysOverdue,
            penalty,
            totalDue,
            description: `Invoice #${Number(details[0])} from ${formatAddress(details[1])}`
          };
        } catch (err) {
          console.error(`Error loading invoice ${id}:`, err);
          return null;
        }
      });

      const loadedInvoices = (await Promise.all(invoicePromises)).filter(Boolean);
      setInvoices(loadedInvoices);
      console.log('Loaded invoices:', loadedInvoices);

    } catch (error) {
      console.error('Error loading buyer invoices:', error);
      setError('Failed to load invoices: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter(invoice => {
      if (filterStatus === 'overdue') return invoice.isOverdue;
      return invoice.status.toLowerCase().includes(filterStatus.toLowerCase());
    });
  }, [invoices, filterStatus]);

  const stats = useMemo(() => {
    const overdue = invoices.filter(inv => inv.isOverdue);
    const approved = invoices.filter(inv => inv.statusCode === 2);
    const paid = invoices.filter(inv => inv.statusCode === 4);
    const pending = invoices.filter(inv => inv.statusCode === 0);
    const totalPending = invoices.reduce((sum, inv) => sum + (inv.statusCode !== 4 ? inv.totalDue : 0), 0);
    const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty, 0);

    return {
      totalInvoices: invoices.length,
      overdueCount: overdue.length,
      approvedCount: approved.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      totalPending,
      totalPenalties
    };
  }, [invoices]);

  const handlePayInvoice = (invoice) => {
    if (invoice.statusCode !== 2) { // Not approved
      alert('Invoice must be approved before payment');
      return;
    }
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.totalDue.toString());
  };

  const processPayment = async () => {
    if (!selectedInvoice || !contract) return;

    try {
      setLoading(true);
      const paymentAmountWei = ethers.parseEther(paymentAmount);
      
      console.log('Processing payment:', {
        invoiceId: selectedInvoice.id,
        amount: paymentAmount,
        amountWei: paymentAmountWei.toString()
      });
      
      const tx = await contract.buyerPayment(selectedInvoice.id, {
        value: paymentAmountWei
      });
      
      console.log('Payment transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Payment transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        alert(`Payment of ${paymentAmount} ETH processed successfully!`);
        setSelectedInvoice(null);
        setPaymentAmount('');
        
        // Reload invoices
        await loadBuyerInvoices();
      } else {
        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      if (error.message.includes('Main__InvoiceStatusMustBeApproved')) {
        alert('Invoice must be approved before payment');
      } else if (error.message.includes('Main__InsufficientPayment')) {
        alert('Insufficient payment amount');
      } else if (error.message.includes('user rejected')) {
        alert('Transaction was rejected by user');
      } else {
        alert('Error processing payment: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Paid': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      'Verification In Progress': 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      'Rejected': 'bg-red-500/20 text-red-400 border-red-500/40'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
        {status}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending': '⏳',
      'Verification In Progress': '🔍',
      'Approved': '✅',
      'Paid': '🏦',
      'Rejected': '❌'
    };
    return icons[status] || '📄';
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
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
            <div className="hidden lg:block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium">
              {userRole !== null ? USER_ROLE[userRole] : 'BUYER'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-2 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 font-bold"
              >
                Connect Wallet
              </button>
            ) : (
              <>
                <div className="text-gray-400 text-sm">
                  <span className="text-gray-300 font-medium">
                    {formatAddress(address)}
                  </span>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Enhanced Loading Screen */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Clean Gradient Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-purple-700/5 to-cyan-600/50 backdrop-blur-md animate-in fade-in duration-300"></div>
          <div className="absolute inset-0 bg-black/70"></div>

          {/* Loading Content */}
          <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 w-96 h-96 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] opacity-20"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-gradient-to-r from-purple-900/10 via-purple-700/10 to-cyan-600/20 blur-3xl"></div>
            </div>

            {/* Clean Spinner */}
            <div className="relative mb-8">
              <div className="w-12 h-12 rounded-full border-2 border-gray-700/30 border-t-transparent bg-gradient-to-r from-purple-900/20 via-purple-700/20 to-cyan-600/40 animate-spin"></div>
              <div className="absolute inset-1 w-10 h-10 rounded-full border-2 border-transparent border-t-white/80 animate-spin" style={{ animationDuration: '1.5s' }}></div>
            </div>

            {/* Professional Text */}
            <div className="text-center">
              <h2 className="text-xl font-medium text-white mb-2">
                Loading Dashboard
              </h2>
              <p className="text-gray-400 text-sm">Fetching your invoices...</p>
            </div>

            {/* Minimal Progress Indicator */}
            <div className="mt-6 w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-900/50 via-purple-700/50 to-cyan-600/80 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Connect Your Wallet
            </div>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              Please connect your MetaMask wallet to access the buyer marketplace
            </p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-8 py-4 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 font-bold text-lg"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Settlement Dashboard
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Manage and pay your outstanding invoices with automated smart contract execution
              </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Stats Cards */}
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
                  value: `${stats.totalPending} USD`,
                  label: "Total Due",
                  change: "Outstanding amount",
                  icon: "💰",
                  gradient: "from-cyan-200/1 to-blue-700/15",
                  border: "border-cyan-500/40",
                  hoverBorder: "hover:border-cyan-400/70",
                  accent: "cyan"
                },
                {
                  value: `${stats.totalPenalties} USD`,
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
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              {[
                { key: 'all', label: 'All Invoices', count: invoices.length },
                { key: 'approved', label: 'Approved', count: stats.approvedCount },
                { key: 'paid', label: 'Paid', count: stats.paidCount },
                { key: 'overdue', label: 'Overdue', count: stats.overdueCount }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 cursor-pointer ${filterStatus === filter.key
                    ? 'bg-gradient-to-r from-purple-600/60 to-cyan-600/60 text-white border border-purple-400/50 shadow-lg shadow-purple-500/30'
                    : 'bg-gray-800/40 text-gray-400 border border-gray-700/50 hover:bg-gray-700/40 hover:text-gray-300 backdrop-blur-xl'
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
                  className={`relative backdrop-blur-2xl border rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden ${invoice.isOverdue
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
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getStatusIcon(invoice.status)}</span>
                        <div className="text-lg font-black text-white">#{invoice.id}</div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    {/* Supplier */}
                    <div className="mb-4">
                      <div className="text-gray-400 text-xs font-medium mb-1">SUPPLIER</div>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {invoice.supplier.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="text-white font-bold text-sm truncate">
                          {formatAddress(invoice.supplier)}
                        </div>
                      </div>
                    </div>

                    {/* Amount Display */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs font-medium">AMOUNT</span>
                        <span className="text-white font-bold">{invoice.amount} USD</span>
                      </div>
                      {invoice.penalty > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-red-400 text-xs font-medium">PENALTY</span>
                          <span className="text-red-400 font-bold">+{invoice.penalty} USD</span>
                        </div>
                      )}
                      <div className="border-t border-gray-600/50 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-400 text-sm font-bold">TOTAL DUE</span>
                          <span className="text-cyan-400 font-black text-lg">{invoice.totalDue} USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Due Date & Status */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-gray-400 text-xs font-medium">DUE DATE</div>
                        <div className="text-white text-sm font-bold">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                          invoice.isOverdue 
                            ? 'text-red-400 bg-red-500/20' 
                            : 'text-green-400 bg-green-500/20'
                        }`}>
                          {formatDate(invoice.dueDate)}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handlePayInvoice(invoice)}
                      disabled={invoice.status === 'Paid' || invoice.status !== 'Approved'}
                      className={`w-full relative py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-bold text-sm overflow-hidden cursor-pointer border group ${
                        invoice.status === 'Paid' 
                          ? 'bg-gray-600/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                          : invoice.status === 'Approved'
                          ? 'bg-gradient-to-r from-purple-600/50 via-purple-700/50 to-cyan-600/50 text-white hover:from-purple-500 hover:via-purple-600 hover:to-cyan-500 shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 border-purple-400/30 hover:border-purple-300/60'
                          : 'bg-gray-700/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        <span>{invoice.status === 'Paid' ? '✅' : '💳'}</span>
                        <span>
                          {invoice.status === 'Paid' 
                            ? 'Paid' 
                            : invoice.status === 'Approved'
                            ? `Pay ${invoice.totalDue} USD`
                            : `${invoice.status}`
                          }
                        </span>
                      </span>
                      {invoice.status === 'Approved' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {!loading && invoices.length === 0 && (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-full flex items-center justify-center border border-gray-600/50">
                  <span className="text-4xl">📄</span>
                </div>
                <div className="text-2xl font-bold text-gray-300 mb-4">No Invoices Found</div>
                <div className="text-gray-500 max-w-md mx-auto">
                  You don't have any invoices yet. Once suppliers create invoices for your company, they will appear here.
                </div>
              </div>
            )}
          </>
        )}
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
                <span className="text-white font-bold text-sm">{formatAddress(selectedInvoice.supplier)}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium">Original Amount</span>
                <span className="text-white font-bold">{selectedInvoice.amount} USD</span>
              </div>
              {selectedInvoice.penalty > 0 && (
                <div className="flex justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <span className="text-red-400 font-medium">Penalty</span>
                  <span className="text-red-400 font-bold">{selectedInvoice.penalty} USD</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black border-t pt-4 p-3 bg-cyan-500/10 border-cyan-500/30 rounded-lg">
                <span className="text-white">Total Due</span>
                <span className="text-cyan-400">{selectedInvoice.totalDue} USD</span>
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
                  className="flex-1 bg-gray-700/50 text-gray-300 py-3 rounded-xl hover:bg-gray-600/50 transition-all duration-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 cursor-pointer"
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

export default Buyer;