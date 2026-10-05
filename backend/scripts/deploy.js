const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EmploymentVerification contract to network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer ? deployer.address : "Default Provider");

  const EmploymentVerification = await hre.ethers.getContractFactory("EmploymentVerification");
  const contract = await EmploymentVerification.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ EmploymentVerification deployed successfully to:", contractAddress);

  // Read artifact to get ABI
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/EmploymentVerification.sol/EmploymentVerification.json"
  );

  let abi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abi = artifact.abi;
  }

  // Save contract address and ABI to backend config
  const backendConfigPath = path.join(__dirname, "../config/contractData.json");
  fs.writeFileSync(
    backendConfigPath,
    JSON.stringify(
      {
        address: contractAddress,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
        abi: abi,
      },
      null,
      2
    )
  );
  console.log("Saved contract metadata to:", backendConfigPath);

  // Save to frontend config dir as well
  const frontendConfigPath = path.join(__dirname, "../../frontend/js/contractData.json");
  fs.writeFileSync(
    frontendConfigPath,
    JSON.stringify(
      {
        address: contractAddress,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
        abi: abi,
      },
      null,
      2
    )
  );
  console.log("Saved contract metadata to frontend:", frontendConfigPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
