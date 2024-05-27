require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Contract, ethers, Wallet } = require('ethers');
const ABIAgent = require('./abis/Agent.json');
const ABIVision = require('./abis/ChatGptVision.json');
const screenshot = require('screenshot-desktop');
const path = require('path');
const fleekStorage = require('@fleekhq/fleek-storage-js');
const fs = require('fs').promises;


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


app.post('/chatwithvision', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).send({ error: 'Prompt is required' });
    }

    try {
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) throw new Error('Missing RPC_URL in .env');
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) throw new Error('Missing PRIVATE_KEY in .env');
        const contractAddress = process.env.CHAT_VISION_CONTRACT_ADDRESS;
        if (!contractAddress) throw new Error('Missing CHAT_VISION_CONTRACT_ADDRESS in .env');

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new Wallet(privateKey, provider);
        const contract = new Contract(contractAddress, ABIVision, wallet);

        const screenshotPath = await takeScreenshot();
        const imageUrl = await uploadToFleek(screenshotPath);

        const transactionResponse = await contract.startChat(prompt, imageUrl);
        const receipt = await transactionResponse.wait();
        console.log(`Message sent, tx hash: ${receipt.transactionHash}`);
        console.log(`Chat started with message: "${prompt}"`);

        let chatId = getChatId(receipt, contract);
        console.log(`Created chat ID: ${chatId}`);
        if (!chatId && chatId !== 0) {
            return res.status(500).send({ error: 'Failed to create chat ID' });
        }

        let allMessages = [];
        while (true) {
            const newMessages = await getNewMessagesVision(contract, chatId, allMessages.length);
            if (newMessages) {
                for (let message of newMessages) {
                    console.log(`${message.role}: ${message.content}`);
                    allMessages.push(message);
                    if (allMessages.at(-1)?.role === 'assistant') {
                        return res.send(message.content);
                    }
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send({ error: 'Internal server error' });
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
    const contract = new ethers.Contract(contractAddress, ABIAgent, wallet);

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

// Function to take a screenshot
const takeScreenshot = async () => {
    const timestamp = Date.now();
    const imgPath = path.join(__dirname, `screenshot_${timestamp}.png`);
    try {
        await screenshot({ filename: imgPath });
        console.log(`Screenshot saved to ${imgPath}`);
        return imgPath;
    } catch (err) {
        console.error('Error taking screenshot:', err);
        throw err;
    }
};

// Function to upload the screenshot to Fleek
const uploadToFleek = async (filePath) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const uploadedFile = await fleekStorage.upload({
            apiKey: process.env.FLEEK_API_KEY,
            apiSecret: process.env.FLEEK_API_SECRET,
            key: path.basename(filePath),
            data: fileContent,
        });
        console.log('File uploaded to Fleek:', uploadedFile.publicUrl);
        return uploadedFile.publicUrl;
    } catch (err) {
        console.error('Error uploading to Fleek:', err);
        throw err;
    }
};

// Function to get chat ID from receipt
const getChatId = (receipt, contract) => {
    let chatId;
    for (const log of receipt.logs) {
        try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'ChatCreated') {
                // chatId = ethers.toNumber(parsedLog.args[1]);
                chatId = parsedLog.args[1];
                // Convert the chatId to a number
                if (ethers.BigNumber.isBigNumber(chatId)) {
                    chatId = chatId.toNumber();
                }
                break; 
            }
        } catch (error) {
            console.log('Could not parse log:', log);
        }
    }
    return chatId;
};

// Function to get new messages from the contract
const getNewMessagesVision = async (contract, chatId, currentMessagesCount) => {
    const messages = await contract.getMessageHistory(chatId);
    const newMessages = [];

    messages.forEach((message, i) => {
        if (i >= currentMessagesCount) {
            newMessages.push({
                role: message[0],
                content: message[1][0][1],
            });
        }
    });

    return newMessages;
};

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
