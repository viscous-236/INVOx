import React, { useState, useMemo, useEffect } from 'react';

const UnifiedSupplierDashboard = () => {
  const [scrollY, setScrollY] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [newInvoice, setNewInvoice] = useState({
    id: '', buyer: '', amount: '', dueDate: '', description: ''
  });
  const [verifyId, setVerifyId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  const [invoices] = useState([
    { id: 12344, buyer: 'TechCorp Industries', amount: 25000, dueDate: '2025-07-15', status: 'Approved', description: 'Software Development Services Q2' },
    { id: 12343, buyer: 'Global Manufacturing Ltd', amount: 40000, dueDate: '2025-08-20', status: 'Pending', description: 'Industrial Equipment Supply' },
    { id: 12342, buyer: 'Digital Solutions Inc', amount: 15000, dueDate: '2025-06-01', status: 'Paid', description: 'Cloud Infrastructure Setup' },
    { id: 12341, buyer: 'Logistics Pro Services', amount: 32000, dueDate: '2025-07-30', status: 'Paid', description: 'Transportation & Delivery Services' },
    { id: 12340, buyer: 'Creative Design Studio', amount: 18500, dueDate: '2025-06-28', status: 'Paid', description: 'Brand Identity & Marketing Campaign' },
    { id: 12339, buyer: 'Healthcare Solutions', amount: 28000, dueDate: '2025-07-12', status: 'Rejected', description: 'Medical Equipment Maintenance' }
  ]);

  const filteredInvoices = useMemo(() => {
    return filterStatus === 'all' ? invoices : invoices.filter(inv => inv.status.toLowerCase() === filterStatus);
  }, [invoices, filterStatus]);

  const stats = useMemo(() => {
    const pending = invoices.filter(inv => inv.status === 'Pending').length;
    const approved = invoices.filter(inv => inv.status === 'Approved').length;
    const paid = invoices.filter(inv => inv.status === 'Paid').length;
    const totalValue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    return { totalInvoices: invoices.length, pending, approved, paid, totalValue };
  }, [invoices]);

  const handleCreateInvoice = () => {
    alert('Invoice created successfully!');
    setNewInvoice({ id: '', buyer: '', amount: '', dueDate: '', description: '' });
  };

  const handleVerify = () => {
    alert(`Verifying invoice #${verifyId}...`);
    setVerifyId('');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'Paid': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      'Rejected': 'bg-red-500/20 text-red-400 border-red-500/40'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending': '⏳',
      'Approved': '✅',
      'Paid': '🏦',
      'Rejected': '❌'
    };
    return icons[status] || '📄';
  };

  const getBuyerInitials = (buyer) => {
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
            <div className="text-gray-400 text-sm">
              <span className="text-gray-300 font-medium">0x742d35Cc...9A4C</span>
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
              value: `$${(stats.totalValue / 1000).toFixed(0)}K`,
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
                  onChange={(e) => setNewInvoice({...newInvoice, id: e.target.value})}
                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                />
                <input
                  type="number"
                  placeholder="Amount (USD)"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                  className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                />
              </div>
              <input
                type="text"
                placeholder="Buyer Company"
                value={newInvoice.buyer}
                onChange={(e) => setNewInvoice({...newInvoice, buyer: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
              />
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all duration-300"
              />
              <textarea
                placeholder="Invoice description"
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 h-20 resize-none transition-all duration-300"
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
              className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                filterStatus === filter.key
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

              {/* Buyer & Description */}
              <div className="mb-4">
                <div className="font-bold text-white text-lg mb-1">
                  {invoice.buyer}
                </div>
                <div className="text-sm text-gray-400 line-clamp-2">
                  {invoice.description}
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
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-purple-500/20">
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

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 text-sm font-bold">Description</span>
                </div>
                <div className="text-white text-sm mt-1">{selectedInvoice.description}</div>
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