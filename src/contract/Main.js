import {ethers} from 'ethers';

const CONTRACT_ADDRESS = '0xFF8657E8A1562cE1E51839E92201eF02689DA20b';

const CONTRACT_ABI = [
  "event ContractFunded(address indexed sender, uint256 amount)",
  "event InvoiceCreated(uint256 indexed id, address indexed supplier, address indexed buyer, uint256 amount, uint256 dueDate)",
  "event SuccessfulTokenPurchase(uint256 indexed invoiceId, address indexed buyer, uint256 amount)",
  "event InvoiceVerificationRequested(uint256 indexed invoiceId, bytes32 requestId)",
  "event InvoiceVerified(uint256 indexed invoiceId, bool isValid)",
  "event PaymentReceived(uint256 indexed invoiceId, address indexed buyer, uint256 amount)",
  "event InvoicePaid(uint256 indexed invoiceId, uint256 amount)",
  "event PaymentDistributed(uint256 indexed invoiceId, address indexed receiver, uint256 amount)",
  "event PaymentToSupplier(uint256 indexed invoiceId, address indexed supplier, uint256 amount)",
  "event InvoiceTokenCreated(uint256 indexed invoiceId, address indexed tokenAddress)",
  "event UpkeeperAuthorized(address indexed upkeeper)",
  "event UpkeeperRevoked(address indexed upkeeper)",
  "event AllTokensBurned(uint256 indexed invoiceId, address[] investors)",

  // External/Public Functions
  "function authorizeUpkeeper(address _upkeeper) external",
  "function revokeUpkeeper(address _upkeeper) external",
  "function chooseRole(uint8 _role) external",
  "function createInvoice(uint256 _id, address _buyer, uint256 _amount, uint256 _dueDate) external",
  "function verifyInvoice(uint256 invoiceId) external",
  "function buyTokens(uint256 _id, uint256 _amount) external payable",
  "function buyerPayment(uint256 _id) external payable",
  "function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)",
  "function performUpkeep(bytes calldata performData) external",

  // Getter Functions
  "function getBuyerInvoiceIds(address _buyer) external view returns (uint256[] memory)",
  "function getSupplierInvoices(address _supplier) external view returns (uint256[] memory)",
  "function getInvoice(uint256 _invoiceId) external view returns (tuple(uint256 id, address supplier, address buyer, uint256 amount, address[] investors, uint8 status, uint256 dueDate, uint256 totalInvestment, bool isPaid))",
  "function getInvoiceStatus(uint256 _invoiceId) external view returns (uint8)",
  "function isAuthorizedUpkeeper(address _upkeeper) external view returns (bool)",
  "function getPriceOfTokenInEth(uint256 _invoiceId) external view returns (uint256)",
  "function getTokenDetails(uint256 _invoiceId) external view returns (address tokenAddress, string memory name, string memory symbol, uint256 totalSupply, address supplier, uint256 remainingCapacity)",
  "function getUserRole(address _user) external view returns (uint8)",
  "function getInvoiceTokenAddress(uint256 _invoiceId) external view returns (address)",
  "function getInvoiceDetails(uint256 _invoiceId) external view returns (uint256 id, address supplier, address buyer, uint256 amount, address[] memory investors, uint8 status, uint256 dueDate, uint256 totalInvestment, bool isPaid)",

  // State Variables
  "function hasChosenRole(address _user) external view returns (bool)",
  "function IdExists(uint256 _id) external view returns (bool)",
];




export const getContract = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return null;
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const getReadOnlyContract = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return null;
  }
  
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};

