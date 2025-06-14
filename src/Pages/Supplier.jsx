import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { ethers } from 'ethers';

const UnifiedSupplierDashboard = () => {
  const [scrollY, setScrollY] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [newInvoice, setNewInvoice] = useState({
    id: '', buyer: '', amount: '', dueDate: ''
  });
  const [verifyId, setVerifyId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { address, contract, isConnected } = useWallet();

  // Status mapping from contract to UI - Updated according to your contract
  const statusMap = {
    0: 'Pending',              // Pending
    1: 'Verification In Progress', // VerificationInProgress
    2: 'Approved',             // Approved
    3: 'Rejected',             // Rejected
    4: 'Paid'                  // Paid
  };

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

  // Load supplier's invoices when contract is available
  useEffect(() => {
    if (contract && address && isConnected) {
      loadSupplierInvoices();
    }
  }, [contract, address, isConnected]);

  const loadSupplierInvoices = async () => {
    if (!contract || !address) return;

    setLoading(true);
    setError('');

    try {
      // Get supplier's invoice IDs
      const supplierInvoiceIds = await contract.getSupplierInvoices(address);
      console.log('Supplier Invoice IDs:', supplierInvoiceIds);
      
      // Fetch details for each invoice
      const invoicePromises = supplierInvoiceIds.map(async (invoiceId) => {
        try {
          const invoiceDetails = await contract.getInvoiceDetails(invoiceId);
          console.log(`Invoice ${invoiceId} details:`, invoiceDetails);

          return {
            id: Number(invoiceDetails.id),
            buyer: invoiceDetails.buyer,
            amount: Number(ethers.formatEther(invoiceDetails.amount)),
            dueDate: new Date(Number(invoiceDetails.dueDate) * 1000).toISOString().split('T')[0],
            status: statusMap[invoiceDetails.status] || 'Unknown',
            statusCode: Number(invoiceDetails.status),
            totalInvestment: Number(ethers.formatEther(invoiceDetails.totalInvestment)),
            isPaid: invoiceDetails.isPaid,
            investors: invoiceDetails.investors
          };
        } catch (err) {
          console.error(`Error loading invoice ${invoiceId}:`, err);
          return null;
        }
      });

      const loadedInvoices = (await Promise.all(invoicePromises)).filter(Boolean);
      setInvoices(loadedInvoices);
    } catch (err) {
      console.error('Error loading supplier invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return filterStatus === 'all'
      ? invoices
      : invoices.filter(inv => inv.status.toLowerCase().includes(filterStatus.toLowerCase()));
  }, [invoices, filterStatus]);

  const stats = useMemo(() => {
    const pending = invoices.filter(inv => inv.statusCode === 0).length;
    const verificationInProgress = invoices.filter(inv => inv.statusCode === 1).length;
    const approved = invoices.filter(inv => inv.statusCode === 2).length;
    const rejected = invoices.filter(inv => inv.statusCode === 3).length;
    const paid = invoices.filter(inv => inv.statusCode === 4).length;
    const totalValue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    return {
      totalInvoices: invoices.length,
      pending,
      verificationInProgress,
      approved,
      rejected,
      paid,
      totalValue
    };
  }, [invoices]);

  const handleCreateInvoice = async () => {
    if (!contract || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const { id, buyer, amount, dueDate } = newInvoice;

    // Validation
    if (!id || !buyer || !amount || !dueDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (!ethers.isAddress(buyer)) {
      alert('Please enter a valid buyer address');
      return;
    }

    // Check if due date is in the future
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    if (dueDateObj <= now) {
      alert('Due date must be in the future');
      return;
    }

    console.log('Creating invoice with data:', { id, buyer, amount, dueDate });

    setLoading(true);
    try {
      // Check if invoice ID already exists
      const exists = await contract.IdExists(id);
      if (exists) {
        alert('Invoice ID already exists. Please use a different ID.');
        return;
      }

      // Convert amount to wei and dueDate to timestamp
      const amountInWei = ethers.parseEther(amount.toString());
      const dueDateTimestamp = Math.floor(dueDateObj.getTime() / 1000);

      // Create invoice on blockchain
      const tx = await contract.createInvoice(
        parseInt(id),
        buyer,
        amountInWei,
        dueDateTimestamp
      );

      await tx.wait();
      alert('Invoice created successfully!');
      setNewInvoice({ id: '', buyer: '', amount: '', dueDate: '' });

      // Reload invoices
      await loadSupplierInvoices();

    } catch (err) {
      console.error('Error creating invoice:', err);
      
      // Provide specific error messages based on contract errors
      if (err.message.includes('Main__MustBeUnique')) {
        alert('Invoice ID already exists. Please use a different ID.');
      } else if (err.message.includes('Main__CallerMustBeSupplier')) {
        alert('Only suppliers can create invoices');
      } else if (err.message.includes('Main__DueDateMustBeInFuture')) {
        alert('Due date must be in the future');
      } else if (err.message.includes('Main__MoreThanZero')) {
        alert('Amount and ID must be greater than zero');
      } else if (err.message.includes('Main__MustBeValidAddress')) {
        alert('Please enter a valid buyer address');
      } else {
        alert('Failed to create invoice. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

const handleVerify = async () => {
  if (!contract || !isConnected) {
    alert('Please connect your wallet first');
    return;
  }

  if (!verifyId) {
    alert('Please enter an invoice ID to verify');
    return;
  }

  const invoiceId = parseInt(verifyId);
  console.log('=== VERIFICATION DEBUG START ===');
  console.log('Invoice ID to verify:', invoiceId);
  console.log('Connected address:', address);
  console.log('Contract address:', contract?.target || contract?.address);

  setLoading(true);
  try {
    // Step 1: Check if invoice exists using IdExists
    console.log('Step 1: Checking if invoice exists...');
    const exists = await contract.IdExists(invoiceId);
    console.log('Invoice exists:', exists);
    
    if (!exists) {
      alert('Invoice does not exist');
      return;
    }

    // Step 2: Get invoice details using getInvoice (not getInvoiceDetails)
    console.log('Step 2: Getting invoice details...');
    const invoice = await contract.getInvoice(invoiceId);
    console.log('Raw invoice data:', invoice);
    
    // Parse the invoice data based on your contract structure
    const invoiceData = {
      id: Number(invoice.id || invoice[0]),
      supplier: invoice.supplier || invoice[1],
      buyer: invoice.buyer || invoice[2],
      amount: invoice.amount || invoice[3],
      dueDate: Number(invoice.dueDate || invoice[4]),
      status: Number(invoice.status || invoice[5]),
      totalInvestment: invoice.totalInvestment || invoice[6],
      isPaid: invoice.isPaid || invoice[7]
    };
    
    console.log('Parsed invoice data:', invoiceData);
    console.log('Invoice supplier:', invoiceData.supplier);
    console.log('Current user address:', address);
    console.log('Addresses match:', invoiceData.supplier.toLowerCase() === address.toLowerCase());
    console.log('Invoice status:', invoiceData.status);

    // Step 3: Verify ownership
    if (invoiceData.supplier.toLowerCase() !== address.toLowerCase()) {
      alert('You can only verify your own invoices');
      console.log('ERROR: User is not the supplier of this invoice');
      return;
    }

    // Step 4: Check status - must be Pending (0)
    if (invoiceData.status !== 0) {
      alert(`Invoice must be in Pending status to verify. Current status: ${statusMap[invoiceData.status] || invoiceData.status}`);
      console.log('ERROR: Invoice status is not Pending. Current status:', invoiceData.status);
      return;
    }

    // Step 5: Check user role
    console.log('Step 5: Checking user role...');
    const userRole = await contract.getUserRole(address);
    console.log('User role:', Number(userRole));
    
    if (Number(userRole) !== 0) { // 0 = Supplier
      alert('Only suppliers can verify invoices');
      console.log('ERROR: User is not a supplier. Role:', Number(userRole));
      return;
    }

    // Step 6: Estimate gas before transaction
    console.log('Step 6: Estimating gas for verification...');
    try {
      const gasEstimate = await contract.verifyInvoice.estimateGas(invoiceId);
      console.log('Gas estimate:', gasEstimate.toString());
    } catch (gasError) {
      console.error('Gas estimation failed:', gasError);
      alert('Transaction will likely fail. Check console for details.');
      return;
    }

    // Step 7: Execute verification with explicit gas settings
    console.log('Step 7: Executing verification transaction...');
    const tx = await contract.verifyInvoice(invoiceId, {
      gasLimit: 500000, // Set explicit gas limit
      // You might also want to set gasPrice if needed
    });

    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    console.log('Transaction status:', receipt.status);
    
    if (receipt.status === 1) {
      alert(`Invoice #${verifyId} verification requested successfully!`);
      setVerifyId('');
      await loadSupplierInvoices();
    } else {
      alert('Transaction failed. Check console for details.');
    }

  } catch (err) {
    console.error('=== VERIFICATION ERROR ===');
    console.error('Error object:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error data:', err.data);
    
    // More specific error handling
    if (err.message.includes('Main__InvoiceStatusMustBePending')) {
      alert('Invoice must be in Pending status to verify');
    } else if (err.message.includes('Main__CallerMustBeSupplier')) {
      alert('Only suppliers can verify invoices');
    } else if (err.message.includes('Main__InvoiceNotExist')) {
      alert('Invoice does not exist');
    } else if (err.message.includes('user rejected')) {
      alert('Transaction was rejected by user');
    } else if (err.message.includes('insufficient funds')) {
      alert('Insufficient funds for gas fees');
    } else if (err.message.includes('gas')) {
      alert('Gas estimation failed or insufficient gas limit');
    } else if (err.reason) {
      alert(`Contract error: ${err.reason}`);
    } else {
      alert(`Verification failed: ${err.message || 'Unknown error'}`);
    }
  } finally {
    setLoading(false);
    console.log('=== VERIFICATION DEBUG END ===');
  }
};

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      'Verification In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Paid': 'bg-green-500/20 text-green-400 border-green-500/40',
      'Rejected': 'bg-red-500/20 text-red-400 border-red-500/40'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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

  const getBuyerInitials = (buyer) => {
    // For address, show first 2 characters after 0x
    if (buyer.startsWith('0x')) {
      return buyer.slice(2, 4).toUpperCase();
    }
    return buyer.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
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

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleInvoiceClick = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // Check user role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      if (contract && address) {
        try {
          const role = await contract.getUserRole(address);
          const roleInNum = Number(role);
          
          // UserRole.Supplier = 0 in your contract
          if (roleInNum !== 0) {
            alert('You do not have permission to access this dashboard. Please switch to the Supplier role.');
            navigate('/');
            return;
          }
          
          await loadSupplierInvoices();
        } catch (err) {
          console.error('Error checking user role:', err);
          alert('Error checking user permissions. Please try again.');
          navigate('/');
        }
      } else {
        alert('Please connect your wallet to access the Supplier dashboard.');
        navigate('/');
      }
    };
    
    if (isConnected) {
      checkUserRole();
    }
  }, [contract, address, isConnected, navigate]);
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
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
            <div className="hidden lg:block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-medium">
              SUPPLIER
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-300 text-sm">
              <span className="text-gray-300 font-medium">{address}</span>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-12 space-y-12">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Collection Dashboard
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Transform your invoices into liquid assets with instant funding
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 cursor-pointer">
          {[
            {
              value: stats.pending,
              label: "Pending",
              change: "Under review",
              icon: "⏳",
              gradient: "from-yellow-200/1 to-yellow-700/20",
              border: "border-yellow-500/40",
              hoverBorder: "hover:border-yellow-400/70",
              accent: "yellow"
            },
            {
              value: stats.approved,
              label: "Approved",
              change: "Ready for funding",
              icon: "✅",
              gradient: "from-emerald-200/1 to-green-700/20",
              border: "border-emerald-500/40",
              hoverBorder: "hover:border-emerald-400/70",
              accent: "emerald"
            },
            {
              value: `$${stats.totalValue}`,
              label: "Total Value",
              change: "All invoices",
              icon: "💰",
              gradient: "from-cyan-200/1 to-blue-700/15",
              border: "border-cyan-500/40",
              hoverBorder: "hover:border-cyan-400/70",
              accent: "cyan"
            },
            {
              value: stats.paid,
              label: "Paid",
              change: "Successfully paid",
              icon: "🏦",
              gradient: "from-blue-200/1 to-blue-700/20",
              border: "border-blue-500/40",
              hoverBorder: "hover:border-blue-400/70",
              accent: "blue"
            }
          ].map((stat, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${stat.gradient} backdrop-blur-2xl border ${stat.border} ${stat.hoverBorder} rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden `}
            >
              <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300 text-sm font-medium cursor-pointer">{stat.label}</span>
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

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 cursor-pointer">
          {/* Create Invoice */}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 hover:border-gray-600/70 transition-all duration-300">
            <h3 className="text-2xl font-black mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Create New Invoice
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Invoice ID"
                  value={newInvoice.id}
                  onChange={(e) => setNewInvoice({ ...newInvoice, id: e.target.value })}
                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                />
                <input
                  type="number"
                  placeholder="Amount (USD)"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                />
              </div>
              <input
                type="text"
                placeholder="Buyer Company"
                value={newInvoice.buyer}
                onChange={(e) => setNewInvoice({ ...newInvoice, buyer: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
              />
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all duration-300"
              />
              <button
                onClick={handleCreateInvoice}
                className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
              >
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  <span>📝</span>
                  <span>Create Invoice</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>
            </div>
          </div>

          {/* Verify Invoice */}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 hover:border-gray-600/70 transition-all duration-300">
            <h3 className="text-2xl font-black mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Verify Invoice
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Invoice ID to verify"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all duration-300"
              />
          
              <button
                onClick={handleVerify}
                className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
              >
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  <span>🔒</span>
                  <span>Verify with ERP System</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>

              <div className="mt-6 space-y-3">
                <h4 className="text-lg font-bold text-gray-300">Recent Verifications</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="font-medium">Invoice #12344</span>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full text-sm font-medium">
                      ✅ Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <span className="font-medium">Invoice #12343</span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full text-sm font-medium">
                      ⏳ In Progress...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-8 justify-center">
          {[
            { key: 'all', label: 'All Invoices', count: stats.totalInvoices },
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'approved', label: 'Approved', count: stats.approved },
            { key: 'paid', label: 'Paid', count: stats.paid }
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

        {/* Invoice Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/70 transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-300">
                      {getBuyerInitials(invoice.buyer)}
                    </span>
                  </div>
                  <div>
                    <div className="font-mono text-sm text-gray-400">#{invoice.id}</div>
                    <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(invoice.status)}`}>
                      <span>{getStatusIcon(invoice.status)}</span>
                      <span>{invoice.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <div className="text-3xl font-black text-white mb-1">
                  ${invoice.amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  {formatDate(invoice.dueDate)}
                </div>
              </div>

              {/* Buyer */}
              <div className="mb-4">
                <div className="font-bold text-white text-lg mb-1">
                  {formatAddress(invoice.buyer)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedInvoice(invoice)}
                  className=
                  "w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group"
                >
                  <span className="relative z-10">View Details</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </button>


              </div>
            </div>
          ))}
        </div>

        {/* Show More Button */}
        {filteredInvoices.length > 6 && (
          <div className="text-center">
            <button className="relative bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/50 text-gray-300 hover:text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden group">
              <span className="relative z-10">Show More Invoices</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </button>
          </div>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white">Invoice Details</h3>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-white transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Invoice #</span>
                  <span className="text-white font-bold">#{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Buyer</span>
                  <span className="text-white font-bold text-sm">{selectedInvoice.buyer}</span>
                </div>
                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Amount</span>
                  <span className="text-white font-bold">${selectedInvoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Due Date</span>
                  <span className="text-white font-bold text-sm">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedInvoice.status)}`}>
                    {getStatusIcon(selectedInvoice.status)} {selectedInvoice.status}
                  </span>
                </div>
              </div>


              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full relative bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition-all duration-300 font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 overflow-hidden group cursor-pointer"
              >
                <span className="relative z-10">Close</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UnifiedSupplierDashboard;