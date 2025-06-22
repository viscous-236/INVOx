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
  const [showTokenGeneration, setShowTokenGeneration] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);
  const [approvedInvoiceAmount, setApprovedInvoiceAmount] = useState(null);
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [verificationStartTime, setVerificationStartTime] = useState(null);
  const [tokenData, setTokenData] = useState({});
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

  useEffect(() => {
    const checkUserRole = async () => {
      if (contract && address) {
        try {
          const role = await contract.getUserRole(address);
          const roleInNum = Number(role);

          if (roleInNum !== 0) {
            alert('You do not have permission to access this dashboard. Only Suppliers can access this page.');
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



  const loadSupplierInvoices = async () => {
    if (!contract || !address) return;

    setError('');

    try {
      // Get supplier's invoice IDs
      const supplierInvoiceIds = await contract.getSupplierInvoices(address);
      console.log('Supplier Invoice IDs:', supplierInvoiceIds);

      // Fetch details for each invoice
      const invoicePromises = supplierInvoiceIds.map(async (invoiceId) => {
        try {
          const invoiceDetails = await contract.getInvoiceDetails(invoiceId);

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


  useEffect(() => {
    if (!contract || !address) return;

    let isSubscribed = true;
    let eventCleanup = null;
    let pollInterval = null;

    const setupEventListener = async () => {
      try {
        const handleInvoiceVerified = async (invoiceId, isValid, event) => {
          console.log('InvoiceVerified event received:', {
            invoiceId: invoiceId.toString(),
            isValid,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });

          if (!isSubscribed) return;

          // Get invoice details to verify it belongs to current supplier
          try {
            const invoice = await contract.getInvoice(invoiceId);
            if (invoice.supplier.toLowerCase() !== address.toLowerCase()) {
              console.log('Event not for current supplier, ignoring');
              return;
            }
          } catch (err) {
            console.error('Error checking invoice ownership:', err);
            return;
          }

          // Reset waiting state
          setWaitingForVerification(false);
          setVerificationStartTime(null);

          if (isValid) {
            try {
              const isTokenGenerated = await contract.isTokenGenerated(invoiceId);
              if (!isTokenGenerated) {
                setShowTokenGeneration(true);
              } else {
                alert(`Invoice #${invoiceId.toString()} has been approved! (Tokens already generated)`);
              }
            } catch (error) {
              console.error('Error checking token generation status:', error);
              alert(`Invoice #${invoiceId.toString()} has been approved!`);
            }
          } else {
            alert(`Invoice #${invoiceId.toString()} has been rejected.`);
            setApprovedInvoiceId(null);
            setApprovedInvoiceAmount(null);
          }

          // Refresh invoices
          await loadSupplierInvoices();
        };

        // Set up event listener
        contract.on('InvoiceVerified', handleInvoiceVerified);

        eventCleanup = () => {
          try {
            contract.off('InvoiceVerified', handleInvoiceVerified);
          } catch (error) {
            console.error('Failed to remove event listener:', error);
          }
        };

        console.log('Event listener set up successfully');

      } catch (error) {
        console.error('Failed to set up event listener:', error);
      }
    };

    // Set up polling as fallback
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        if (!isSubscribed || !waitingForVerification) return;

        try {
          // Check if any pending invoices have changed status
          const supplierInvoices = await contract.getSupplierInvoices(address);

          for (const invoiceId of supplierInvoices) {
            const invoice = await contract.getInvoice(invoiceId);
            const statusCode = Number(invoice.status);

            // Find corresponding invoice in our state
            const existingInvoice = invoices.find(inv => inv.id === Number(invoiceId));

            if (existingInvoice && existingInvoice.statusCode !== statusCode) {
              console.log(`Status change detected for invoice ${invoiceId}: ${existingInvoice.statusCode} -> ${statusCode}`);

              if (statusCode === 2) { // Approved
                setWaitingForVerification(false);
                setVerificationStartTime(null);

                const isTokenGenerated = await contract.isTokenGenerated(invoiceId);
                if (!isTokenGenerated) {
                  setApprovedInvoiceId(Number(invoiceId));
                  setApprovedInvoiceAmount(invoice.amount);
                  setShowTokenGeneration(true);
                }
              } else if (statusCode === 3) { // Rejected
                setWaitingForVerification(false);
                setVerificationStartTime(null);
                alert(`Invoice #${invoiceId} has been rejected.`);
              }

              await loadSupplierInvoices();
              break;
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 5000); // Poll every 5 seconds when waiting for verification
    };

    setupEventListener();

    // Start polling if waiting for verification
    if (waitingForVerification) {
      startPolling();
    }

    return () => {
      isSubscribed = false;

      if (eventCleanup) {
        eventCleanup();
      }

      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [contract, address, waitingForVerification, invoices]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (waitingForVerification) {
        e.preventDefault();
        e.returnValue = 'Invoice verification is in progress. Are you sure you want to leave?';
        return 'Invoice verification is in progress. Are you sure you want to leave?';
      }
    };

    const handlePopState = (e) => {
      if (waitingForVerification) {
        const confirmLeave = window.confirm('Invoice verification is in progress. Are you sure you want to navigate away?');
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    if (waitingForVerification) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);

      // Push a state to handle back button
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [waitingForVerification]);

  useEffect(() => {
    if (!contract) return;

    const pollForUpdates = setInterval(async () => {
      try {
        await loadSupplierInvoices();
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, 20000);

    return () => clearInterval(pollForUpdates);
  }, [contract]);

  const handleVerify = async () => {
    if (!contract || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!verifyId || verifyId.trim() === '') {
      alert('Please enter an invoice ID to verify');
      return;
    }

    const invoiceId = parseInt(verifyId);

    if (isNaN(invoiceId) || invoiceId < 0) {
      alert('Please enter a valid invoice ID (positive number)');
      return;
    }


    setLoading(true);
    try {
      const exists = await contract.IdExists(invoiceId);
      if (!exists) {
        alert('Invoice does not exist');
        return;
      }

      const invoice = await contract.getInvoice(invoiceId);

      if (invoice.supplier.toLowerCase() !== address.toLowerCase()) {
        alert('You can only verify your own invoices');
        return;
      }

      if (Number(invoice.status) !== 0) {
        alert(`Invoice must be in Pending status to verify. Current status: ${invoice.status}`);
        return;
      }

      const userRole = await contract.getUserRole(address);
      if (Number(userRole) !== 0) {
        alert('Only suppliers can verify invoices');
        return;
      }

      setApprovedInvoiceId(invoiceId);
      setApprovedInvoiceAmount(invoice.amount);
      console.log('Verifying invoice with ID:', invoiceId);
      console.log('Invoice Amount:', invoice.amount);

      const tx = await contract.verifyInvoice(invoiceId);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      if (receipt.status === 1) {
        console.log('Verification transaction successful, waiting for event...');
        setWaitingForVerification(true);
        setVerificationStartTime(Date.now());
        setVerifyId('');
      } else {
        alert('Transaction failed. Check console for details.');
      }

    } catch (err) {
      console.error('=== VERIFICATION ERROR ===', err);

      if (err.message.includes('Main__InvoiceStatusMustBePending')) {
        alert('Invoice must be in Pending status to verify');
      } else if (err.message.includes('Main__CallerMustBeSupplier')) {
        alert('Only suppliers can verify invoices');
      } else if (err.message.includes('Main__InvoiceNotExist')) {
        alert('Invoice does not exist');
      } else if (err.message.includes('user rejected')) {
        alert('Transaction was rejected by user');
      } else {
        alert(`Verification failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      console.log('=== VERIFICATION DEBUG END ===');
      setLoading(false);
    }
  };


  const handleTokenGeneration = async () => {
    if (!contract || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const invoiceId = approvedInvoiceId;

    if (!invoiceId || !approvedInvoiceId) {
      alert('Invalid invoice data for token generation');
      return;
    }

    // Check if tokens are already generated
    const isTokenGenerated = await contract.isTokenGenerated(invoiceId);
    if (isTokenGenerated) {
      alert('Tokens have already been generated for this invoice');
      setShowTokenGeneration(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Generating tokens for invoice ID:', invoiceId);
      console.log('Approved Invoice Amount:', approvedInvoiceAmount);
      const tx = await contract.tokenGeneration(invoiceId, approvedInvoiceAmount);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        alert(`Tokens successfully generated for invoice #${invoiceId}`);
        setShowTokenGeneration(false);
        setApprovedInvoiceId(null);
        setApprovedInvoiceAmount(null);
        await loadSupplierInvoices(); // Refresh invoices after token generation
      }
    } catch (err) {
      console.error('Error generating tokens:', err);
      if (err.message.includes('Main__InvoiceStatusMustBeApproved')) {
        alert('Invoice must be Approved before generating tokens');
      } else if (err.message.includes('Main__TokenAlreadyGenerated')) {
        alert('Tokens have already been generated for this invoice');
      } else if (err.message.includes('user rejected')) {
        alert('Transaction was rejected by user');
      } else {
        alert(`Token generation failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenData = async (invoiceId) => {
    if (!contract) return;

    try {
      const [tokenAddress, totalSupply] = await Promise.all([
        contract.getInvoiceTokenAddress(invoiceId),
        contract.getTotalSupply(invoiceId)
      ]);
      console.log('Total Supply:', totalSupply.toString());
      setTokenData(prev => ({
        ...prev,
        [invoiceId]: {
          address: tokenAddress || '',
          purchased: totalSupply ? Number(ethers.formatEther(totalSupply)) : 0
        }
      }));
    } catch (error) {
      console.error(`Error fetching token data for invoice ${invoiceId}:`, error);
      setTokenData(prev => ({
        ...prev,
        [invoiceId]: {
          address: '',
          purchased: 0
        }
      }));
    }
  };

  // Update the modal to fetch data when selectedInvoice changes
  useEffect(() => {
    if (selectedInvoice && (selectedInvoice.status === 'Approved' || selectedInvoice.status === 'Paid')) {
      fetchTokenData(selectedInvoice.id);
    }
  }, [selectedInvoice, contract]);



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
            {/* Logo */}
            <button onClick={() => navigate('/')} className='hover: cursor-pointer'>
              <div className="flex items-center space-x-1">
                <img src="/logo2.jpeg" alt="Logo" className="w-20 h-18" />
                <div className="bg-gradient-to-r text-4xl font-black from-white via-purple-200 to-white bg-clip-text text-transparent mb-2">
                  INVOx
                </div>
              </div>
            </button>
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
                Loading
              </h2>
              <p className="text-gray-400 text-sm">Please wait a moment...</p>
            </div>

            {/* Minimal Progress Indicator */}
            <div className="mt-6 w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-900/50 via-purple-700/50 to-cyan-600/80 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

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

          {/* Verify Invoice and Token Generation*/}
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 hover:border-gray-600/70 transition-all duration-300">
            <h3 className="text-2xl font-black mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Verify Invoice And Tokenize It
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Invoice ID to verify"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-all duration-300"
                disabled={showTokenGeneration}
              />

              <button
                onClick={handleVerify}
                disabled={showTokenGeneration || loading || waitingForVerification}
                className="w-full relative bg-gradient-to-r from-purple-900/5 via-purple-700/5 to-cyan-600/50 text-white py-3 rounded-xl hover:from-green-500 hover:via-green-600 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-purple-400/30 hover:border-purple-300/60 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  <span>🔒</span>
                  <span>{waitingForVerification ? 'Waiting for Verification...' : 'Verify with ERP System'}</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>

              {/* Warning Message */}
              {waitingForVerification && (
                <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-amber-400 text-lg">⚠️</span>
                    <div>
                      <h4 className="text-amber-200 font-semibold text-sm mb-1">
                        Verification in Progress
                      </h4>
                      <p className="text-amber-300/80 text-xs leading-relaxed">
                        Please don't reload or navigate away from this page. We're waiting for the ERP system to process your invoice verification.
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-amber-400/60 text-xs">
                          Listening for verification result...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>


          {showTokenGeneration && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-500">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] opacity-20"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full bg-gradient-to-r from-green-500/10 via-emerald-400/10 to-cyan-600/20 blur-3xl"></div>
                </div>

                <div className="relative z-10">
                  {/* Success Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-emerald-400/20 rounded-full flex items-center justify-center border border-green-500/30">
                      <span className="text-3xl">✅</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Invoice Approved!
                  </h2>

                  {/* Message */}
                  <p className="text-gray-300 text-center mb-2">
                    Invoice #{approvedInvoiceId} has been successfully approved.
                  </p>
                  <p className="text-gray-400 text-center text-sm mb-8">
                    You can now generate tokens for this invoice.
                  </p>

                  {/* Invoice Details */}
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Invoice ID:</span>
                      <span className="text-white font-mono">#{approvedInvoiceId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-mono">{Number(ethers.formatEther(approvedInvoiceAmount))} tokens</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleTokenGeneration}
                      disabled={loading}
                      className="w-full relative bg-gradient-to-r from-green-500/20 via-emerald-400/20 to-cyan-600/30 text-white py-3 rounded-xl hover:from-green-500 hover:via-emerald-400 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/50 font-bold text-sm overflow-hidden cursor-pointer border border-green-400/30 hover:border-green-300/60 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        <span>🪙</span>
                        <span>{loading ? 'Generating Tokens...' : 'Generate Tokens'}</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

                {(selectedInvoice.status === 'Approved' || selectedInvoice.status === 'Paid') && (
                  <>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm font-medium">Token Address</span>
                      <span className="text-white font-bold text-xs break-all">
                        {tokenData[selectedInvoice.id]?.address || 'Loading...'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                      <span className="text-gray-400 text-sm font-medium">Total Tokens Purchased</span>
                      <span className="text-white font-bold text-sm">
                        {tokenData[selectedInvoice.id]?.purchased}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-gray-400 text-sm font-medium">Due Date</span>
                  <span className="text-white font-bold text-sm">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </span>
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