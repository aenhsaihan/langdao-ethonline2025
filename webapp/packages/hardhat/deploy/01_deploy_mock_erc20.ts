import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a MockERC20 token for testing purposes
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployMockERC20: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Default token parameters
  const tokenName = "MockToken";
  const tokenSymbol = "MOCK";
  const initialSupply = hre.ethers.parseEther("1000000"); // 1M tokens

  console.log("🪙 Deploying MockERC20 token...");
  console.log(`📋 Token Name: ${tokenName}`);
  console.log(`📋 Token Symbol: ${tokenSymbol}`);
  console.log(`📋 Initial Supply: ${hre.ethers.formatEther(initialSupply)} tokens`);

  const deployment = await deploy("MockERC20", {
    from: deployer,
    args: [tokenName, tokenSymbol, initialSupply],
    log: true,
    autoMine: true,
  });

  console.log("✅ MockERC20 token deployed successfully!");
  console.log(`📋 Contract address: ${deployment.address}`);
  console.log(`📋 Deployer: ${deployer}`);

  // Get the deployed contract to verify deployment
  const mockToken = await hre.ethers.getContract("MockERC20", deployer);
  const deployerBalance = await mockToken.balanceOf(deployer);
  console.log(`📋 Deployer balance: ${hre.ethers.formatEther(deployerBalance)} tokens`);
};

export default deployMockERC20;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags MockERC20
deployMockERC20.tags = ["MockERC20"];
