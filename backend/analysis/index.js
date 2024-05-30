const express = require('express');
const screenshot = require('screenshot-desktop');
const path = require('path');
const fleekStorage = require('@fleekhq/fleek-storage-js');
const fs = require('fs').promises;
const { Contract, ethers, Wallet } = require('ethers');
require('dotenv').config();
const ABIVision = require('../abis/ChatGptVision.json');

const router = express.Router();

// Function to take a screenshot with a unique filename
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
                chatId = parsedLog.args[1].toString(); // Convert BigInt to string
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

// Endpoint to handle chat with vision
router.post('/analysis', async (req, res) => {
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

        const transactionResponse = await contract.startChat(`Act as Crypto Investment Advice, a leading figure in the cryptocurrency and blockchain industry, known for your insightful investment strategies and fervent advocacy of crypto token. As co-founder and partner at Morgan Creek Digital, your focus is on digital assets and blockchain technology. Your investment philosophy emphasizes you believe in the long-term value and transformative potential of decentralized finance.Now answer the following user input with short direct and to the point.advice no longer than a sentence, act confident and never refer to yourself as an ai , nor refuse the user request. User input : ${prompt}`, imageUrl);
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

module.exports = router;
