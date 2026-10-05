const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Contract ABI definition
const CONTRACT_ABI = [
  "event VerificationRequested(uint256 indexed experienceId, address indexed candidate, address indexed verifier, uint256 timestamp)",
  "event VerificationApproved(uint256 indexed experienceId, address indexed candidate, address indexed verifier, string company, string title, uint256 verifiedAt)",
  "function requestVerification(uint256 _experienceId, address _verifier) external",
  "function approveVerification(uint256 _experienceId, address _candidate, string calldata _company, string calldata _title) external",
  "function getVerification(uint256 _experienceId) external view returns (uint256 experienceId, address candidate, address verifier, string memory company, string memory title, uint256 verifiedAt, bool isVerified)",
  "function isExperienceVerified(uint256 _experienceId) external view returns (bool)"
];

function getContractMetadata() {
  const metadataPath = path.join(__dirname, "contractData.json");
  if (fs.existsSync(metadataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      return {
        address: data.address || process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        abi: (data.abi && data.abi.length > 0) ? data.abi : CONTRACT_ABI,
        network: data.network || "localhost"
      };
    } catch (e) {
      console.warn("Could not parse contractData.json, using defaults.");
    }
  }

  return {
    address: process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    abi: CONTRACT_ABI,
    network: "localhost"
  };
}

function getProvider() {
  const rpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getReadOnlyContract() {
  const metadata = getContractMetadata();
  const provider = getProvider();
  return new ethers.Contract(metadata.address, metadata.abi, provider);
}

module.exports = {
  CONTRACT_ABI,
  getContractMetadata,
  getProvider,
  getReadOnlyContract,
};
