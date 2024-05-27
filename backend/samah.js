require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const ABI = require('./abis/Agent.json');
const app = express();
const port = 3200;

app.use(cors());
app.use(express.json());

app.post('/run-command', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        console.log('Prompt is required');
        return res.status(400).send('Prompt is required');
    }

    
    console.log('prompt:', prompt);
   

    console.log('Running agent with prompt:', prompt);

    try {
        const response = await runAgentWithPrompt(prompt);
        res.send(response);
    } catch (error) {
        console.error(`Error running agent: ${error.message}`);
        res.status(500).send(`Error: ${error.message}`);
    }
});



async function runAgentWithPrompt(prompt) {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.AGENT_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
        throw new Error('Missing required environment variables');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ABI, wallet);

    const maxIterations = 2; // Set the number of iterations to 5

    // Call the runAgent function
    const transactionResponse = await contract.runAgent(prompt, maxIterations);
    const receipt = await transactionResponse.wait();
    console.log(`Task sent, tx hash: ${receipt.transactionHash}`);
    // console.log(`Agent started with task: "${prompt}"`);

    // Get the agent run ID from transaction receipt logs
    const agentRunID = getAgentRunId(receipt, contract);
    console.log("agentRunID", agentRunID)
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

    // Extract the final response from allMessages
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
                // Convert the agentRunID to a number
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
            content: messages[i]
        });
    }
    return newMessages;
}

function extractResponse(messages) {
    // Process the messages to create a final response
    // Assuming the last message from the 'assistant' role is the final response
    const finalMessage = messages.filter(msg => msg.role === 'assistant').pop();
    if (!finalMessage) {
        throw new Error('No final response found from assistant');
    }
    return finalMessage.content;
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
