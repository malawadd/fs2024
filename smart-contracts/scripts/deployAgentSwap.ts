import {ethers} from "hardhat";

const AGENT_PROMPT = "You're a token swapping agent. You will analyze the user input and determine the details of the swap they want: the name of the token from which chain, and the token to swap to, and its address as well, and in what chain. Reply only with the following in a JSON format: {\"fromAmount\": \"\", \"fromTokenName\": \"\", \"fromtokenAddress\": \"\", \"fromChain\": \"\", \"fromchainID\": \"\", \"toChain\": \"\", \"toChainId\": \"\", \"toTokenName\": \"\", \"toTokenAddress\": \"\"}";
const CID = "bafybeifoxolhqeorqb67z4rqbcjxicxduuuw4xi5lpmaeiirrov4h67eou"
async function main() {
  const oracleAddress: string = "0x4168668812C94a3167FCd41D12014c5498D74d7e"
  console.log()

  await deployAgent(oracleAddress);
  console.log()

}


async function deployAgent(oracleAddress: string) {
  const agent = await ethers.deployContract(
    "AgentSwap",
    [
      oracleAddress,
      CID
    ], {});

  await agent.waitForDeployment();

  console.log(
    `AgentSwap deployed to ${agent.target}`
  );
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
