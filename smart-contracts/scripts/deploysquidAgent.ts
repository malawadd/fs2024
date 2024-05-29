import {ethers} from "hardhat";


async function main() {
  const oracleAddress: string = "0x4168668812C94a3167FCd41D12014c5498D74d7e";
  console.log("oracle Address", oracleAddress)
  await deployChatGptWithKnowledgeBase("ChatGpt", oracleAddress, "bafybeifoxolhqeorqb67z4rqbcjxicxduuuw4xi5lpmaeiirrov4h67eou");
  
}

async function deployChatGptWithKnowledgeBase(contractName: string, oracleAddress: string, knowledgeBaseCID: string) {
  const agent = await ethers.deployContract(contractName, [oracleAddress, knowledgeBaseCID], {});

  await agent.waitForDeployment();

  console.log(
    `${contractName} deployed to ${agent.target} with knowledge base "${knowledgeBaseCID}"`
  );
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
