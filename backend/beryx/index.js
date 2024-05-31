const express = require('express');
const { Contract, ethers, Wallet } = require('ethers');
const ABIAgent = require('../abis/Agent.json');
require('dotenv').config();
// const bodyParser = require('body-parser');
const beyrexApi = require('./beyrexApi');

const router = express.Router();

router.post('/beryx', async (req, res) => {
    const prompt = req.body.prompt;

    const filtered = await runAgentWithPrompt(`Analyze the user input and output one of the following cases stricly, fill any address or parameter the user input.  the cases are  : accountbalance {address}, accountinfo {address}, dynamicconfig {}, erc20approvals {ticker, address}, erc20info {ticker, address}, erc20transfers {ticker, address}, erc20contracts {}, erc20alltransactions {address}, erc20alltransfers {address}, erc20allapprovals {address}, erc20contracttransfers {contract_address, address}, erc20contractapprovals {contract_address, address}, eventbyid {id}, eventbyheight {height}, eventbytxcid {tx_cid}, eventbyemitter {emitter}, eventbyselector {selector}, eventbytype {type}, searchfull {identifier}, searchlight {identifier}, feesbase {period}, feesestimate {method}, statsbalance {address}, statserc20balance {address}, statstransactions {address}, transactionbyhash {hash}, transactionbyheight {height}, transactionbyblockcid {cid}, transactionbyaddress {address}, transactionbyreceiver {address}, transactionbysender {address}, tipsetbyheight {height}, tipsetbyhash {hash}, tipsetbyblockcid {cid}, tipsetlatest {}. User input:'${prompt}'`);

    // const match1 = filtered.match(/(\w+)\s*(?:\{([a-zA-Z0-9,:.\s]+)\})?/);
    const match = filtered.match(/(\w+)\s*(?:\{\s*([^}]*)\s*\})?/);
    // const match = filtered.match(/(\w+)\s*(?:\{\s*([^}]*)\s*\})?/);
    console.log("match",  match)
  
    if (!match) {
      return res.status(400).json({ error: 'Invalid prompt format' });
    }
  
    const [_, action, params] = match;
    let param1, param2;

    console.log("action", action)
    console.log("params", params)
  
    if (params) {
        const splitParams = params.split(',').map(param => param.split(':').pop().trim().replace(/^"|"$/g, ''));
        [param1, param2] = splitParams;

      console.log("splitParams", splitParams)
      console.log("param1", param1)
      console.log("param2", param2)


    }

  try {
    let result;
    switch (action.toLowerCase()) {
      case 'accountbalance':
        result = await beyrexApi.getAccountBalance(param1);
        break;
      case 'accountinfo':
        result = await beyrexApi.getAccountInfo(param1);
        break;
      case 'dynamicconfig':
        result = await beyrexApi.getDynamicConfig();
        break;
      case 'erc20approvals':
        result = await beyrexApi.getERC20Approvals(param1, param2);
        break;
      case 'erc20info':
        result = await beyrexApi.getERC20Info(param1, param2);
        break;
      case 'erc20transfers':
        result = await beyrexApi.getERC20Transfers(param1, param2);
        break;
      case 'erc20contracts':
        result = await beyrexApi.getERC20Contracts();
        break;
      case 'erc20alltransactions':
        result = await beyrexApi.getERC20AllTransactions(param1);
        break;
      case 'erc20alltransfers':
        result = await beyrexApi.getERC20AllTransfers(param1);
        break;
      case 'erc20allapprovals':
        result = await beyrexApi.getERC20AllApprovals(param1);
        break;
      case 'erc20contracttransfers':
        result = await beyrexApi.getERC20ContractTransfers(param1, param2);
        break;
      case 'erc20contractapprovals':
        result = await beyrexApi.getERC20ContractApprovals(param1, param2);
        break;
      case 'eventbyid':
        result = await beyrexApi.getEventById(param1);
        break;
      case 'eventbyheight':
        result = await beyrexApi.getEventByHeight(param1);
        break;
      case 'eventbytxcid':
        result = await beyrexApi.getEventByTxCid(param1);
        break;
      case 'eventbyemitter':
        result = await beyrexApi.getEventByEmitter(param1);
        break;
      case 'eventbyselector':
        result = await beyrexApi.getEventBySelector(param1);
        break;
      case 'eventbytype':
        result = await beyrexApi.getEventByType(param1);
        break;
      case 'searchfull':
        result = await beyrexApi.searchFull(param1);
        break;
      case 'searchlight':
        result = await beyrexApi.searchLight(param1);
        break;
      case 'feesbase':
        result = await beyrexApi.getFeesBase(param1);
        break;
      case 'feesestimate':
        result = await beyrexApi.getFeesEstimate(param1);
        break;
      case 'statsbalance':
        result = await beyrexApi.getStatsBalance(param1);
        break;
      case 'statserc20balance':
        result = await beyrexApi.getStatsERC20Balance(param1);
        break;
      case 'statstransactions':
        result = await beyrexApi.getTransactions(param1);
        break;
      case 'transactionbyhash':
        result = await beyrexApi.getTransactionByHash(param1);
        break;
      case 'transactionbyheight':
        result = await beyrexApi.getTransactionByHeight(param1);
        break;
      case 'transactionbyblockcid':
        result = await beyrexApi.getTransactionByBlockCid(param1);
        break;
      case 'transactionbyaddress':
        result = await beyrexApi.getTransactionByAddress(param1);
        break;
      case 'transactionbyreceiver':
        result = await beyrexApi.getTransactionByReceiver(param1);
        break;
      case 'transactionbysender':
        result = await beyrexApi.getTransactionBySender(param1);
        break;
      case 'tipsetbyheight':
        result = await beyrexApi.getTipsetByHeight(param1);
        break;
      case 'tipsetbyhash':
        result = await beyrexApi.getTipsetByHash(param1);
        break;
      case 'tipsetbyblockcid':
        result = await beyrexApi.getTipsetByBlockCid(param1);
        break;
      case 'tipsetlatest':
        result = await beyrexApi.getTipsetLatest();
        break;
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function runAgentWithPrompt(prompt) {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.BEYREX_AGENT;

    if (!rpcUrl || !privateKey || !contractAddress) {
        throw new Error('Missing required environment variables');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, ABIAgent, wallet);

    const maxIterations = 2; // Set the number of iterations to 2

    const transactionResponse = await contract.runAgent(prompt, maxIterations);
    const receipt = await transactionResponse.wait();
    console.log(`Task sent, tx hash: ${receipt.transactionHash}`);

    const agentRunID = getAgentRunId(receipt, contract);
    console.log('agentRunID', agentRunID);
    if (agentRunID === undefined) {
        throw new Error('Agent run ID not found in transaction receipt');
    }

    let allMessages = [];
    while (true) {
        const newMessages = await getNewMessages(contract, agentRunID, allMessages.length);
        allMessages = allMessages.concat(newMessages);

        if (await contract.isRunFinished(agentRunID)) {
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(allMessages)
    const finalResponse = extractResponse(allMessages);
    return finalResponse;
}

function getAgentRunId(receipt, contract) {
    let agentRunID;
    for (const log of receipt.logs) {
        try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'AgentRunCreated') {
                agentRunID = parsedLog.args[1];
                if (ethers.BigNumber.isBigNumber(agentRunID)) {
                    agentRunID = agentRunID.toNumber();
                }
                break;
            }
        } catch (error) {
            console.log('Could not parse log:', log);
        }
    }
    return agentRunID;
}

async function getNewMessages(contract, agentRunID, currentMessagesCount) {
    const messages = await contract.getMessageHistoryContents(agentRunID);
    const roles = await contract.getMessageHistoryRoles(agentRunID);

    const newMessages = [];
    for (let i = currentMessagesCount; i < messages.length; i++) {
        newMessages.push({
            role: roles[i],
            content: messages[i],
        });
    }
    return newMessages;
}

function extractResponse(messages) {
    const finalMessage = messages.filter(msg => msg.role === 'assistant').pop();
    if (!finalMessage) {
        throw new Error('No final response found from assistant');
    }
    return finalMessage.content;
}

module.exports = router;
