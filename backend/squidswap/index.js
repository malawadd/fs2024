const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const { Squid } = require('@0xsquid/sdk');
const fs = require('fs');
const path = require('path');
const nlp = require('compromise');
const fuzzball = require('fuzzball');
const axios = require("axios");

// Function to load JSON files and create maps
const loadJSONAsMap = (filePath, keyField, arrayName) => {
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8'));
    if (!Array.isArray(data[arrayName])) {
        throw new Error(`${filePath} does not contain an array in the ${arrayName} field`);
    }
    const map = new Map();
    data[arrayName].forEach(item => {
        map.set(item[keyField].toLowerCase(), item);
    });
    return map;
};

// Load chains and tokens JSON into maps
const chainsMap = loadJSONAsMap('chains.json', 'axelarChainName', 'chains');
const tokens = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'tokens.json'), 'utf-8')).tokens;

const getChainId = (chainName) => {
    const chain = chainsMap.get(chainName.toLowerCase());
    return chain ? chain.chainId : null;
};

const getTokenAddress = (chainId, tokenSymbol) => {
    // First, try to find an exact match
    for (let token of tokens) {
        if (token.chainId === chainId && token.symbol.toLowerCase() === tokenSymbol.toLowerCase()) {
            return token.address;
        }
    }
    
    // If no exact match is found, use fuzzy matching
    let bestMatch = null;
    let bestScore = 0;
    tokens.forEach(token => {
        if (token.chainId === chainId) {
            const score = fuzzball.partial_ratio(token.symbol.toLowerCase(), tokenSymbol.toLowerCase());
            if (score > bestScore) {
                bestScore = score;
                bestMatch = token;
            }
        }
    });
    return bestScore > 70 ? bestMatch.address : null; // Adjust threshold as needed
};

const parsePrompt = (prompt) => {
    const regex = /swap (\d+\.?\d*) (\w+) to (\w+) from (\w+) to (\w+)/i;
    const match = prompt.match(regex);
    if (match) {
        const [_, amount, fromToken, toToken, fromChain, toChain] = match;
        return {
            amount: parseFloat(amount),
            fromToken,
            toToken,
            fromChain,
            toChain
        };
    } else {
        throw new Error('Invalid prompt format');
    }
};

router.post('/squidswap', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            console.log('Prompt is required');
            return res.status(400).send('Prompt is required');
        }

        console.log('prompt:', prompt);

        // Step 1: Parse swap details from the prompt
        const { amount, fromToken, toToken, fromChain, toChain } = parsePrompt(prompt);

        console.log("Parsed details:", { amount, fromToken, toToken, fromChain, toChain });

        // Lookup chain IDs and token addresses
        const fromChainId = getChainId(fromChain);
        const toChainId = getChainId(toChain);
        if (!fromChainId || !toChainId) {
            return res.status(400).send('Invalid chain specified');
        }

        const fromTokenAddress = getTokenAddress(fromChainId, fromToken);
        const toTokenAddress = getTokenAddress(toChainId, toToken);
        if (!fromTokenAddress || !toTokenAddress) {
            return res.status(400).send('Invalid token specified');
        }

        console.log("Chain IDs:", fromChainId, toChainId);
        console.log("Token Addresses:", fromTokenAddress, toTokenAddress);

        const integratorId = process.env.SQUID_INTEGRATOR_ID;
        const privateKey = process.env.SQUID_PRIVATE_KEY;
        const rpcUrl = process.env.FROM_CHAIN_RPC_ENDPOINT;

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);

        const squid = new Squid({
            baseUrl: 'https://v2.api.squidrouter.com',
            integratorId: integratorId,
        });

        // await squid.init();

        console.log(fromChainId, ethers.parseUnits(amount.toString(), 18).toString(),fromTokenAddress, toChainId, toTokenAddress,signer.address  )

        const params = {
            fromAddress: signer.address.toString(),
            fromChain: fromChainId,
            fromToken: fromTokenAddress,
            fromAmount: ethers.parseUnits(amount.toString(), 18).toString(),
            toChain: toChainId,
            toToken: toTokenAddress,
            toAddress: signer.address,
            slippage: 1,
            slippageConfig: {
              autoMode: 1,
            },
          };
        
          console.log("Parameters:", params);
          


        
  // Get the swap route using Squid API
  const routeResult = await getRoute(params);
  const route = routeResult.data.route;
  const requestId = routeResult.requestId;
  console.log("Calculated route:", route);
  console.log("requestId:", requestId);

  const transactionRequest = route.transactionRequest;
  const { gasPrice } = await provider.getFeeData();


  console.log(gasPrice)
   // Get the gas price data
   const feeData = await provider.getFeeData();
   const maxFeePerGas = feeData.maxFeePerGas;
   const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
 

  // Execute the swap transaction
  const tx = await signer.sendTransaction({
    to: transactionRequest.target,
    data: transactionRequest.data,
    value: transactionRequest.value,
    gasLimit: transactionRequest.gasLimit,
	maxPriorityFeePerGas:maxPriorityFeePerGas,
	maxFeePerGas:maxFeePerGas,
  });
  console.log("Tx:", tx);
  console.log("Transaction Hash:", tx.hash);
  const txReceipt = await tx.wait();
  console.log(txReceipt)

        // const txHash = result.hash;
        const axelarScanLink = `https://axelarscan.io/gmp/${tx.hash}`;
        console.log(`Finished! Check Axelarscan for details: ${axelarScanLink}`);
        res.send(`Swap executed successfully. Check Axelarscan for details. https://axelarscan.io/gmp/${tx.hash}`);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal server error');
    }
});


const getRoute = async (params) => {
    try {
        const integratorId = process.env.SQUID_INTEGRATOR_ID;
      const result = await axios.post(
        "https://apiplus.squidrouter.com/v2/route",
        params,
        {
          headers: {
            "x-integrator-id": integratorId,
            "Content-Type": "application/json",
          },
        }
      );
      const requestId = result.headers["x-request-id"]; // Retrieve request ID from response headers
      return { data: result.data, requestId: requestId };
    } catch (error) {
      if (error.response) {
        console.error("API error:", error.response.data);
      }
      console.error("Error with parameters:", params);
      throw error;
    }
  };
  

module.exports = router;
