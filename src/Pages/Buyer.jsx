import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState('');

  const { address, contract, isConnected } = useWallet();
  const navigate = useNavigate();

  // Contract enums - Updated to match supplier dashboard
  const INVOICE_STATUS = {
    0: 'Pending',
    1: 'Verification In Progress',
    2: 'Approved',
    3: 'Rejected',
    4: 'Paid'
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

  // Load buyer's invoices when contract is available
  useEffect(() => {
    if (contract && address && isConnected) {
      loadBuyerInvoices();
    }
  }, [contract, address, isConnected]);

  // Check user role and permissions
  useEffect(() => {
    const checkUserRole = async () => {
      if (contract && address) {
        try {
          const role = await contract.getUserRole(address);
          const roleInNum = Number(role);

          if (roleInNum !== 1) {
            alert('You do not have permission to access this dashboard. Only Buyers can view this page.');
            navigate('/');
            return;
          }

          await loadBuyerInvoices();
        } catch (err) {
          console.error('Error checking user role:', err);
          alert('Error checking user permissions. Please try again.');
          navigate('/');
        }
      } else {
        alert('Please connect your wallet to access the Buyer dashboard.');
        navigate('/');
      }
    };

    if (isConnected) {
      checkUserRole();
    }
  }, [contract, address, isConnected, navigate]);

  const getTotalDebtAmount = async (invoiceId) => {
    if (!contract) return 0;

    try {
      const totalDebtBN = await contract._getTotalDebtAmount(invoiceId);
      return Number(ethers.formatEther(totalDebtBN));
    } catch (error) {
      console.error(`Error getting total debt for invoice ${invoiceId}:`, error);
      return 0;
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
      // Fetch details for each invoice
      const invoicePromises = invoiceIds.map(async (id) => {
        try {
          const details = await contract.getInvoiceDetails(id);

          // Correct mapping based on Solidity function signature:
          // [0] id, [1] supplier, [2] buyer, [3] amount, [4] investors, 
          // [5] status, [6] dueDate, [7] totalInvestment, [8] isPaid

          const dueDate = new Date(Number(details[6]) * 1000);
          const today = new Date();
          const isOverdue = dueDate < today && Number(details[5]) !== 4; // Not paid and overdue
          const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

          // Calculate penalty (assuming 1% per day overdue, max 10%)
          const baseAmount = Number(ethers.formatEther(details[3]));
          const totalDebtAmount = await getTotalDebtAmount(Number(details[0]));
          const penaltyAmount = totalDebtAmount - baseAmount;


          return {
            id: Number(details[0]),
            supplier: details[1],
            buyer: details[2],
            amount: baseAmount,
            investors: details[4],
            status: isOverdue ? 'Overdue' : INVOICE_STATUS[Number(details[5])] || 'Unknown',
            statusCode: Number(details[5]),
            dueDate: dueDate.toISOString().split('T')[0],
            totalInvestment: Number(ethers.formatEther(details[7])),
            isOverdue,
            daysOverdue,
            penalty: Math.max(0, penaltyAmount),
            totalDue: totalDebtAmount,
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
    const approved = invoices.filter(inv => inv.statusCode === 2 && !inv.isOverdue);
    const paid = invoices.filter(inv => inv.statusCode === 4);
    const pending = invoices.filter(inv => inv.statusCode === 0);
    const totalPending = invoices.reduce((sum, inv) => sum + (inv.statusCode === 2 ? inv.amount : 0), 0);
    const totalPenalties = invoices.reduce((sum, inv) => sum + (inv.penalty || 0), 0);

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
    // Validate invoice status
    if (invoice.statusCode !== 2) { // Not approved
      alert('❌ Invoice must be approved before payment');
      return;
    }

    // Check if already paid
    if (invoice.isPaid || invoice.statusCode === 4) {
      alert('❌ Invoice has already been paid');
      return;
    }

    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.totalDue.toString());
  };
  const processPayment = async () => {
    if (!selectedInvoice || !contract) return;

    try {
      setLoading(true);

      // Get the invoice details
      const invoice = await contract.getInvoice(selectedInvoice.id);
      const totalDebtAmount = await contract._getTotalDebtAmount(selectedInvoice.id);

      const ethPerDollar = await contract.getPriceOfTokenInEth(selectedInvoice.id);
      const totalPaymentInWei = (totalDebtAmount * ethPerDollar) / ethers.parseEther("1");

      console.log('Payment calculation with penalties:', {
        invoiceId: selectedInvoice.id,
        baseAmountUSD: ethers.formatEther(invoice.amount),
        totalDebtAmountUSD: ethers.formatEther(totalDebtAmount),
        ethPerDollar: ethers.formatEther(ethPerDollar),
        totalPaymentETH: ethers.formatEther(totalPaymentInWei),
        penaltyUSD: ethers.formatEther(totalDebtAmount - invoice.amount)
      });

      // ✅ Add validation to prevent sending 0 or negative amounts
      if (totalPaymentInWei <= 0n) {
        alert('❌ Error: Invalid payment amount calculated. Please check the price feed.');
        return;
      }
      const baseAmount = ethers.formatEther(invoice.amount);
      const totalDebt = ethers.formatEther(totalDebtAmount);
      const penalty = ethers.formatEther(totalDebtAmount - invoice.amount);

      const confirmMessage = ` 
Invoice Amount: ${baseAmount} USD
${Number(penalty) > 0 ? `Penalty: ${penalty} USD\n` : ''}Total Due: ${totalDebt} USD
Payment in ETH: ${ethers.formatEther(totalPaymentInWei)} ETH

Proceed with payment?
      `;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // ✅ Add balance check before sending transaction
      const signer = await contract.runner;
      const balance = await signer.provider.getBalance(signer.address);

      if (balance < totalPaymentInWei) {
        alert(`❌ Insufficient balance. Required: ${ethers.formatEther(totalPaymentInWei)} ETH, Available: ${ethers.formatEther(balance)} ETH`);
        return;
      }

      // Execute payment
      const tx = await contract.buyerPayment(selectedInvoice.id, {
        value: totalPaymentInWei,
        gasLimit: 500000 // Set reasonable gas limit
      });

      console.log('Payment transaction sent:', tx.hash);

      // Show transaction pending
      alert(`Payment transaction submitted! Hash: ${tx.hash}\nWaiting for confirmation...`);

      const receipt = await tx.wait();
      console.log('Payment transaction confirmed:', receipt);

      if (receipt.status === 1) {
        alert(`✅ Payment successful!\nAmount: ${ethers.formatEther(totalPaymentInWei)} ETH\nTransaction: ${tx.hash}`);
        setSelectedInvoice(null);
        setPaymentAmount('');

        // Reload invoices to reflect updated status
        await loadBuyerInvoices();
      } else {
        alert('❌ Payment transaction failed. Please try again.');
      }

    } catch (error) {
      console.error('Error processing payment:', error);

      // Handle specific contract errors
      if (error.message.includes('Main__InvoiceMustBeApproved')) {
        alert('❌ Error: Invoice must be approved before payment');
      } else if (error.message.includes('Main__InsufficientPayment')) {
        alert('❌ Error: Insufficient payment amount. Please check the required amount.');
      } else if (error.message.includes('Main__InvoiceAlreadyPaid')) {
        alert('❌ Error: Invoice has already been paid');
      } else if (error.message.includes('Main__MustBeBuyerOfTheInvoice')) {
        alert('❌ Error: You are not the buyer of this invoice');
      } else if (error.message.includes('Main__CallerMustBeBuyer')) {
        alert('❌ Error: You must be registered as a buyer');
      } else if (error.message.includes('Main__InvoiceNotExist')) {
        alert('❌ Error: Invoice does not exist');
      } else if (error.message.includes('user rejected')) {
        // User cancelled transaction
        console.log('User cancelled transaction');
      } else if (error.message.includes('insufficient funds')) {
        alert('❌ Error: Insufficient ETH balance in your wallet');
      } else {
        alert('❌ Error processing payment: ' + (error.reason || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Overdue': 'bg-red-500/20 text-red-400 border-red-500/40',
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
          className="flex items-center justify-between px-8 py-4 backdrop-blur-2xl bg-black/60 border-b border-gray-700/30 transition-all duration-300"
          style={{
            backdropFilter: `blur(${Math.min(scrollY / 8, 20)}px)`,
            background: `rgba(0, 0, 0, ${Math.min(0.6 + scrollY / 1000, 0.9)})`
          }}
        >
          {/* Logo */}
          <div className="flex items-center space-x-4 group">
            <button onClick={() => navigate('/')} className='hover: cursor-pointer'>
              <div className="flex items-center space-x-1">
                <img src="/logo2.jpeg" alt="Logo" className="w-20 h-18" />
                <div className="bg-gradient-to-r text-4xl font-black from-white via-purple-200 to-white bg-clip-text text-transparent mb-2">
                  INVOx
                </div>
              </div>
            </button>
            <div className="hidden lg:block px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-300 font-medium">
              SUPPLIER
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <span className="text-orange-300 text-xs font-bold">CHAINLINK AUTOMATION ACTIVE</span>
            </div>

            <div className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">{formatAddress(address)}</span>

            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
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
                gradient: "from-yellow-200/1 to-yellow-700/20",
                border: "border-yellow-500/40",
                hoverBorder: "hover:border-yellow-400/70",
                accent: "yellow"
              },
              {
                value: stats.approvedCount,
                label: "Approved",
                change: "Ready to pay",
                icon: "✅",
                gradient: "from-green-200/1 to-green-700/20",
                border: "border-emerald-500/40",
                hoverBorder: "hover:border-emerald-400/70",
                accent: "emerald"
              },
              {
                value: `$${stats.totalPending.toFixed(2)}`,
                label: "Total Due",
                change: "Outstanding amount",
                icon: "💰",
                gradient: "from-cyan-200/1 to-cyan-700/30",
                border: "border-cyan-500/40",
                hoverBorder: "hover:border-cyan-400/70",
                accent: "cyan"
              },
              {
                value: `$${stats.totalPenalties.toFixed(2)}`,
                label: "Penalties",
                change: "Late fees",
                icon: "📈",
                gradient: "from-red-200/1 to-red-700/20",
                border: "border-red-500/40",
                hoverBorder: "hover:border-red-400/70",
                accent: "red"
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
                className={`relative backdrop-blur-2xl border rounded-2xl p-6 transition-all duration-500 cursor-pointer group overflow-hidden bg-gradient-to-br ${(invoice.statusCode === 2 && !invoice.isOverdue)
                  ? 'border-gray-700/50 from-gray-800/40 to-gray-700/40 hover:transform hover:scale-105 hover:border-gray-600/70 hover:shadow-xl hover:shadow-purple-500/20'
                  : 'border-gray-800/30 from-gray-900/20 to-gray-800/20 opacity-75 hover:opacity-90'
                  }`}
              >
                <div className="absolute inset-0 opacity-5">
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
                </div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">

                      <div className={`text-lg font-black ${invoice.statusCode === 2 && !invoice.isOverdue ? 'text-white' : 'text-gray-400'}`}>#{invoice.id}</div>
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
                      <div className={`${invoice.statusCode === 2 && !invoice.isOverdue ? 'text-white' : 'text-gray-400'} font-bold text-sm truncate`}>
                        {formatAddress(invoice.supplier)}
                      </div>
                    </div>
                  </div>

                  {/* Amount Display */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-xs font-medium">AMOUNT</span>
                      <span className="text-white font-bold">${invoice.amount}</span>
                    </div>
                    {invoice.penalty > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-red-400 text-xs font-medium">PENALTY</span>
                        <span className="text-red-400 font-bold">+${invoice.penalty.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-600/50 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-bold">TOTAL DUE</span>
                        <span className="text-white font-black text-lg">${invoice.totalDue.toFixed(2)}</span>
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
                      {invoice.statusCode == 2 && (<div className={`text-xs font-bold px-2 py-1 rounded-full ${invoice.isOverdue
                        ? 'text-red-400 bg-red-500/20'
                        : 'text-green-400 bg-green-500/20'
                        }`}>
                        {formatDate(invoice.dueDate)}
                      </div>)}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handlePayInvoice(invoice)}
                    disabled={invoice.statusCode !== 2} // Changed from invoice.status checks
                    className={`w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group ${invoice.statusCode === 2 ? 'hover:bg-gradient-to-r hover:from-green-500 hover:via-green-600 hover:to-cyan-500' : 'opacity-50 hover:scale-2  hover:cursor-not-allowed'
                      }`}
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      <span>{invoice.statusCode === 4 ? '✅' : '💳'}</span> {/* Changed from invoice.status === 'Paid' */}
                      <span>
                        {invoice.statusCode === 4 // Changed from invoice.status === 'Paid'
                          ? 'Paid'
                          : invoice.statusCode === 2 // Changed from invoice.status === 'Approved'
                            ? `Pay $${invoice.totalDue}`
                            : `${invoice.status}`
                        }
                      </span>
                    </span>
                    {invoice.statusCode === 2 && ( // Changed from invoice.status === 'Approved'
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
      </main>
      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 max-w-md w-full mx-4 shadow-2xl shadow-purple-500/20 max-h-[95vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Payment Details</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium text-sm">Invoice #</span>
                <span className="text-white font-bold text-sm">{selectedInvoice.id}</span>
              </div>
              <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium text-sm">Supplier</span>
                <span className="text-white font-bold text-right text-sm" title={selectedInvoice.supplier}>
                  {formatAddress(selectedInvoice.supplier)}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium text-sm">Amount</span>
                <span className="text-white font-bold text-sm">${selectedInvoice.amount}</span>
              </div>
              <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-400 font-medium text-sm">Due Date</span>
                <span className="text-white font-bold text-sm">{selectedInvoice.dueDate}</span>
              </div>
              {selectedInvoice.penalty > 0 && (
                <div className="flex justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                  <span className="text-red-400 font-medium text-sm">Late Penalty</span>
                  <span className="text-red-400 font-bold text-sm">${selectedInvoice.penalty}</span>
                </div>
              )}
              <div className="flex justify-between p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <span className="text-purple-300 font-medium text-sm">Total Due</span>
                <span className="text-purple-300 font-bold">${selectedInvoice.totalDue}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-xs font-medium mb-2">
                Payment Amount (Locked)
              </label>
              <div className="w-full bg-white/10 border border-gray-600/50 rounded-lg px-3 py-2 text-white font-bold bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
                ${selectedInvoice.totalDue}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-3 px-4 bg-gray-700/50 text-gray-300 rounded-xl font-bold hover:bg-gray-600/50 transition-all duration-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
              >
                Process Payment
              </button>
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default Buyer;