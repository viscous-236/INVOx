import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { ethers } from 'ethers';

const Investor = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [scrollY, setScrollY] = useState(0);
  const [showPayments, setShowPayments] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  // const [priceOfOneTokenInEth, setPriceOfOneTokenInEth] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState({});
  const navigate = useNavigate();

  const { address, contract, isConnected, provider } = useWallet();

  // Convert contract status to display status
  const getDisplayStatus = (contractStatus) => {
    switch (contractStatus) {
      case 0: return 'VerificationPending';
      case 1: return 'VerificationInProgress';
      case 2: return 'ReadyForFunding';
      case 3: return 'Rejected';
      case 4: return 'Paid';
      default: return 'Unknown';
    }
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


  const fetchInvoices = async () => {
    try {
      setLoading(true);


      const getAllInvoiceIds = await contract.getAllInvoiceIds();


      const invoicePromises = getAllInvoiceIds.map(async (id) => {
        try {
          const invoiceData = await contract.getInvoiceDetails(id);

          return {
            id: Number(invoiceData.id),
            supplier: formatAddress(invoiceData.supplier),
            buyer: formatAddress(invoiceData.buyer),
            amount: invoiceData.amount,
            dueDate: new Date(Number(invoiceData.dueDate) * 1000).toISOString().split('T')[0],
            status: getDisplayStatus(Number(invoiceData.status)),
            fundedAmount: invoiceData.totalInvestment,
            daysToPayment: Math.ceil((Number(invoiceData.dueDate) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
            description: `Invoice #${invoiceData.id} for $${parseFloat(ethers.formatEther(invoiceData.amount)).toFixed(2)} from ${formatAddress(invoiceData.supplier)} to ${formatAddress(invoiceData.buyer)}`,
            tokenAddress: await contract.getInvoiceTokenAddress(id),
            maxSupply: await contract.getMaxSupply(id),
            isPaid: invoiceData.isPaid
          }
        } catch (error) {
          console.error(`Error fetching invoice at id ${id}:`, error);
          return null;
        }
      });

      const invoices = (await Promise.all(invoicePromises)).filter(Boolean);

      setAvailableInvoices(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && contract && address) {
      fetchInvoices();
      setupEventListeners();
    }
  }, [isConnected, contract, address]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (contract && address) {
        const role = await contract.getUserRole(address);
        const roleInNum = Number(role);
        if (roleInNum !== 2) {
          alert('You do not have permission to access this dashboard. Please switch to the Investor role.');
          navigate('/');
        } else {
          await fetchInvoices();
        }
      } else {
        alert('Please connect your wallet to access the Invoice dashboard.');
        navigate('/');
      }
    }
    checkUserRole();
  }, [contract, address, isConnected, navigate]);



  const setupEventListeners = () => {
    if (!contract) return;

    contract.removeAllListeners('SuccessfulTokenPurchase');
    contract.removeAllListeners('PaymentDistributed');

    console.log('Setting up event listeners for SuccessfulTokenPurchase and PaymentDistributed');


    // Listen for successful token purchases
    contract.on('SuccessfulTokenPurchase', (invoiceId, buyer, amount, event) => {
      if (buyer.toLowerCase() === address.toLowerCase()) {
        const amountInEth = parseFloat(ethers.formatEther(amount));
        setPaymentHistory(prev => [{
          id: Date.now(),
          invoice: `#${invoiceId.toString()}`,
          amount: amountInEth,
          timestamp: new Date().toLocaleTimeString(),
          date: new Date().toISOString().split('T')[0],
          source: 'Token Purchase',
          status: 'Completed'
        }, ...prev]);

        // Refresh invoices to update funding status
        fetchInvoices();
      }
    });

    // Listen for payment distributions
    contract.on('PaymentDistributed', (invoiceId, receiver, amount, event) => {
      if (receiver.toLowerCase() === address.toLowerCase()) {
        const amountInEth = parseFloat(ethers.utils.formatEther(amount));
        setPaymentHistory(prev => [{
          id: Date.now(),
          invoice: `#${invoiceId.toString()}`,
          amount: amountInEth,
          timestamp: new Date().toLocaleTimeString(),
          date: new Date().toISOString().split('T')[0],
          source: 'Chainlink Automation',
          status: 'Completed'
        }, ...prev]);
      }
    });

    return () => {
      contract.removeAllListeners('SuccessfulTokenPurchase');
      contract.removeAllListeners('PaymentDistributed');
    };
  };

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return availableInvoices;
    return availableInvoices.filter(invoice => {
      const displayStatus = invoice.status;
      return displayStatus.toLowerCase() === filterStatus.toLowerCase();
    });
  }, [availableInvoices, filterStatus]);

  const stats = useMemo(() => {
    const totalValue = availableInvoices.reduce((sum, inv) => sum + ethers.formatEther(inv.amount), 0);
    const readyForFunding = availableInvoices.filter(inv =>
      inv.status === 'ReadyForFunding'
    ).length;
    const verificationPending = availableInvoices.filter(inv =>
      inv.status === 'VerificationPending'
    ).length;
    const verificationInProgress = availableInvoices.filter(inv =>
      inv.status === 'VerificationInProgress'
    ).length;
    const paid = availableInvoices.filter(inv =>
      inv.status === 'Paid'
    ).length;

    return {
      totalInvoices: availableInvoices.length,
      totalValue,
      readyForFunding,
      verificationPending,
      verificationInProgress,
      paid
    };
  }, [availableInvoices]);

  const isInvestable = (invoice) => {
    const status = invoice.status;
    return status === 'ReadyForFunding';
  };

  const getButtonConfig = (invoice) => {
    const status = invoice.status;

    switch (status) {
      case 'ReadyForFunding':
        return {
          text: '💎 Invest Now',
          className: "w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group",
          disabled: false,
          showShimmer: true
        };
      case 'VerificationPending':
        return {
          text: '⏳ Pending Verification',
          className: 'w-full bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70',
          disabled: true,
          showShimmer: false
        };
      case 'VerificationInProgress':
        return {
          text: '🔄 Under Verification',
          className: 'w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70',
          disabled: true,
          showShimmer: false
        };
      case 'Rejected':
        return {
          text: '❌ Rejected',
          className: 'w-full bg-red-600/20 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70',
          disabled: true,
          showShimmer: false
        };
      case 'Paid':
        return {
          text: '✨ Paid by Buyer',
          className: 'w-full bg-purple-600/20 text-purple-400 border border-purple-500/30 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70',
          disabled: true,
          showShimmer: false
        };
      default:
        return {
          text: '❓ Unknown Status',
          className: 'w-full bg-gray-600/20 text-gray-400 border border-gray-500/30 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70',
          disabled: true,
          showShimmer: false
        };
    }
  };

  const handleInvest = (invoice) => {
    if (true) {
      setSelectedInvoice(invoice);
      setInvestmentAmount('1');
    }
  };

  const processInvestment = async () => {
    if (!selectedInvoice || !investmentAmount || !contract) return;

    try {
      setLoading(true);

      // Convert investment amount to wei
      // const amountInWei = ethers.utils.parseEther(investmentAmount);

      const priceOfOneTokenInEth = tokenData[selectedInvoice.id]?.priceOfOneTokenInEth || 0;
      if (priceOfOneTokenInEth <= 0) {
        alert('Price of one token is not available or invalid.');
        setLoading(false);
        return;
      }
      console.log('Price of one token in ETH:', priceOfOneTokenInEth);
      console.log('Investment amount:', investmentAmount);
      const totalValue = priceOfOneTokenInEth * investmentAmount;
      const totalValueInWei = ethers.parseEther(totalValue.toString());
      const investmentAmountInWei = ethers.parseEther(investmentAmount.toString());
      console.log(`Investment amount in wei: ${investmentAmountInWei}`);
      console.log(`Total value in wei: ${totalValueInWei}`);
      const maxSupply = tokenData[selectedInvoice.id]?.maxSupply || 0;
      console.log(`Max supply for invoice ${selectedInvoice.id}: ${maxSupply}`);

      // Call buyTokens function
      const tx = await contract.buyTokens(selectedInvoice.id, investmentAmountInWei, {
        value: totalValueInWei
      });
      console.log(`Transaction sent: ${tx.hash}`);
      await tx.wait();

      alert(`Investment of ${investmentAmount} ETH processed successfully!\n\nChainlink Automation will handle payment distribution when the invoice is paid.`);

      setSelectedInvoice(null);
      setInvestmentAmount('');

      // Refresh invoices to show updated funding status
      fetchInvoices();

    } catch (error) {
      console.error('Investment failed:', error);
      alert('Investment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenData = async (invoiceId) => {
    if (!contract) return;

    try {
      const [tokenAddress, totalSupply, maxSupply, priceOfOneTokenInEth] = await Promise.all([
        contract.getInvoiceTokenAddress(invoiceId),
        contract.getTotalSupply(invoiceId),
        contract.getMaxSupply(invoiceId),
        contract.getPriceOfTokenInEth(invoiceId)
      ]);

      console.log(`Token data for invoice ${invoiceId}:`);
      console.log('Max Supply:', maxSupply);


      setTokenData(prev => ({
        ...prev,
        [invoiceId]: {
          address: tokenAddress || '',
          purchased: totalSupply || 0,
          maxSupply: maxSupply || 0,
          priceOfOneTokenInEth: priceOfOneTokenInEth ? parseFloat(ethers.formatEther(priceOfOneTokenInEth)) : 0
        }
      }));
    } catch (error) {
      console.error(`Error fetching token data for invoice ${invoiceId}:`, error);
      setTokenData(prev => ({
        ...prev,
        [invoiceId]: {
          address: '',
          purchased: 0,
          maxSupply: 0,
          priceOfOneTokenInEth: 0
        }
      }));
    }
  };


  useEffect(() => {
    if (selectedInvoice && selectedInvoice.status === 'ReadyForFunding') {
      fetchTokenData(selectedInvoice.id);
    }
    console.log('Selected Invoice:', selectedInvoice);
  }, [selectedInvoice, contract]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'VerificationPending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      'VerificationInProgress': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'ReadyForFunding': 'bg-green-500/20 text-green-400 border-green-500/40',
      'Rejected': 'bg-red-500/20 text-red-400 border-red-500/40',
      'Paid': 'bg-purple-500/20 text-purple-400 border-purple-500/40'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs border font-medium ${statusStyles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
        {status}
      </span>
    );
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
              <span className="text-gray-300 font-medium">{formatAddress(address)}</span>
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

        {/* Updated Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              value: stats.totalInvoices,
              label: "Total Invoices",
              change: "All invoices",
              icon: "📄",
              gradient: "from-cyan-200/1 to-blue-700/20",
              border: "border-cyan-500/40"
            },
            {
              value: stats.readyForFunding,
              label: "Ready for Funding",
              change: "Available to invest",
              icon: "💎",
              gradient: "from-purple-200/1 to-purple-700/20",
              border: "border-purple-500/40"
            },
            {
              value: stats.verificationPending + stats.verificationInProgress,
              label: "Under Review",
              change: "Pending verification",
              icon: "🔄",
              gradient: "from-yellow-200/1 to-yellow-700/20",
              border: "border-yellow-500/40"
            },
            {
              value: stats.paid,
              label: "Completed",
              change: "Paid invoices",
              icon: "✅",
              gradient: "from-green-200/1 to-green-700/20",
              border: "border-green-500/40"
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
              {/* Subtle glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>

        {/* Updated Filter Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          {[
            {
              key: 'all',
              label: 'All Invoices',
              count: availableInvoices.length,
            },
            {
              key: 'readyforfunding',
              label: 'Ready for Funding',
              count: availableInvoices.filter(inv => inv.status === 'ReadyForFunding').length,
            },
            {
              key: 'verificationpending',
              label: 'Verification Pending',
              count: availableInvoices.filter(inv => inv.status === 'VerificationPending').length,
            },
            {
              key: 'verificationinprogress',
              label: 'Under Verification',
              count: availableInvoices.filter(inv => inv.status === 'VerificationInProgress').length,
            },
            {
              key: 'paid',
              label: 'Paid',
              count: availableInvoices.filter(inv => getDisplayStatus(inv.contractStatus || inv.status) === 'Paid').length,
            }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 ${filterStatus === filter.key
                ? 'bg-gradient-to-r from-black-600/60 to-grey-600/60 text-white border border-purple-400/50 shadow-lg shadow-purple-500/30 cursor-pointer'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/50 hover:bg-gray-700/40 hover:text-gray-300 backdrop-blur-xl cursor-pointer hover:transform'
                }`}
            >
              <span className="text-sm">{filter.icon}</span>
              <span>{filter.label} ({filter.count})</span>
            </button>
          ))}
        </div>

        {/* Updated Invoice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice) => {
            const displayStatus = invoice.status;
            const buttonConfig = getButtonConfig(invoice);
            const investable = isInvestable(invoice);
            const maxSupply = ethers.formatEther(invoice.maxSupply || 0);
            const fundedAmount = ethers.formatEther(invoice.fundedAmount || 0);

            return (
              <div
                key={invoice.id}
                className={`relative backdrop-blur-2xl border rounded-2xl p-6 transition-all duration-500 cursor-pointer group overflow-hidden bg-gradient-to-br ${investable
                  ? 'border-gray-700/50 from-gray-800/40 to-gray-700/40 hover:transform hover:scale-105 hover:border-gray-600/70 hover:shadow-xl hover:shadow-purple-500/20'
                  : 'border-gray-800/30 from-gray-900/20 to-gray-800/20 opacity-75 hover:opacity-90'
                  }`}
              >
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-lg font-black ${investable ? 'text-white' : 'text-gray-400'}`}>
                      #{invoice.id}
                    </div>
                    {getStatusBadge(displayStatus)}
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <div className={`text-3xl font-black mb-1 ${investable ? 'text-white' : 'text-gray-500'}`}>
                      ${parseFloat(ethers.formatEther(invoice.amount))}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {displayStatus === 'Paid' ? 'Paid by buyer' :
                        displayStatus === 'ReadyForFunding' ? `Due in ${invoice.daysToPayment || 'N/A'} days` :
                          `Status: ${displayStatus}`}
                    </div>
                  </div>

                  {/* Funding Progress - only show for ReadyForFunding status */}
                  {displayStatus === 'ReadyForFunding' && invoice.fundedAmount !== undefined && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs font-medium">FUNDING PROGRESS</span>
                        <span className="text-white text-xs font-bold">
                          {((fundedAmount / maxSupply) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(fundedAmount / maxSupply) * 100}%` }}
                        />
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        ${fundedAmount} / ${maxSupply} funded
                      </div>
                    </div>
                  )}

                  {/* Invoice Details */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-xs font-medium">SUPPLIER</span>
                      <span className={`font-medium text-sm ${investable ? 'text-white' : 'text-gray-400'}`}>
                        {invoice.supplier}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-xs font-medium">BUYER</span>
                      <span className={`font-medium text-sm ${investable ? 'text-white' : 'text-gray-400'}`}>
                        {invoice.buyer}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-medium">DUE DATE</span>
                      <span className={`font-medium text-sm ${investable ? 'text-white' : 'text-gray-400'}`}>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <div className="text-gray-400 text-xs font-medium mb-1">DESCRIPTION</div>
                    <div className={`text-sm ${investable ? 'text-gray-300' : 'text-gray-500'}`}>
                      {invoice.description}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => investable ? handleInvest(invoice) : null}
                    disabled={buttonConfig.disabled}
                    className={buttonConfig.className}
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      <span>{buttonConfig.text}</span>
                    </span>
                    {buttonConfig.showShimmer && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-2xl w-full shadow-2xl shadow-purple-500/20">
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
              {selectedInvoice.status === 'ReadyForFunding' && (
                <>
                  <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400 font-medium">Token Address</span>
                    <span className="text-white font-bold text-sm break-all">{tokenData[selectedInvoice.id]?.address || "Loading..."}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400 font-medium">Price of One Token</span>
                    <span className="text-white font-bold">{tokenData[selectedInvoice.id]?.priceOfOneTokenInEth || "Loading..."}ETH</span>
                  </div>
                </>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Enter the amount of Tokens you want to buy
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
                className="flex-2 py-3 px-3 bg-gray-700/50 text-gray-300 rounded-xl font-bold hover:bg-gray-600/50 transition-all duration-300"
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