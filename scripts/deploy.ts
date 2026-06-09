import { network } from "hardhat";

async function main() {
  // 1. Connect to the network exactly as your lecturer demonstrated
  const conn = await network.create();
  const ethers = conn.ethers;

  // 2. Fetch the compiled SkillChainMY contract
  const SkillChainFactory = await ethers.getContractFactory("SkillChainMY");
  
  // 3. Deploy it
  const skillChain = await SkillChainFactory.deploy();

  // 4. Wait for the transaction to be mined on the blockchain
  await skillChain.waitForDeployment();

  // 5. Print the address using Ethers v6 .target syntax
  console.log(`SkillChainMY deployed to: ${skillChain.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});