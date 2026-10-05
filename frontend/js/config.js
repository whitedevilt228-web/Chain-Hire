// ChainHire 2.0 Global Configuration
const CONFIG = {
  API_BASE_URL: window.location.origin.includes("localhost:5000")
    ? "http://localhost:5000/api"
    : (window.location.port === "5000" ? "/api" : "http://localhost:5000/api"),
  EXPLORER_BASE_URL: "https://sepolia.etherscan.io/tx/",
  DEFAULT_CONTRACT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  HARDHAT_CHAIN_ID: 31337,
  SEPOLIA_CHAIN_ID: 11155111,
};

// ABI for EmploymentVerification smart contract
const CONTRACT_ABI = [
  "event VerificationRequested(uint256 indexed experienceId, address indexed candidate, address indexed verifier, uint256 timestamp)",
  "event VerificationApproved(uint256 indexed experienceId, address indexed candidate, address indexed verifier, string company, string title, uint256 verifiedAt)",
  "function requestVerification(uint256 _experienceId, address _verifier) external",
  "function approveVerification(uint256 _experienceId, address _candidate, string calldata _company, string calldata _title) external",
  "function getVerification(uint256 _experienceId) external view returns (uint256 experienceId, address candidate, address verifier, string memory company, string memory title, uint256 verifiedAt, bool isVerified)",
  "function isExperienceVerified(uint256 _experienceId) external view returns (bool)"
];

// Dynamically fetch contract address from server
async function fetchContractMetadata() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/contract`);
    if (res.ok) {
      const data = await res.json();
      if (data.address) {
        CONFIG.DEFAULT_CONTRACT_ADDRESS = data.address;
      }
      return data;
    }
  } catch (err) {
    console.warn("Using default contract address fallback.");
  }
  return { address: CONFIG.DEFAULT_CONTRACT_ADDRESS, abi: CONTRACT_ABI };
}

window.CONFIG = CONFIG;
window.CONTRACT_ABI = CONTRACT_ABI;
window.fetchContractMetadata = fetchContractMetadata;
