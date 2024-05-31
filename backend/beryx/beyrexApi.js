const axios = require('axios');
require('dotenv').config();


const BEYREX_API_URL = 'https://api.zondax.ch/fil/data/v3/mainnet';
const BEYREX_API_KEY = process.env.BEYREX_API_KEY; 

const apiClient = axios.create({
  baseURL: BEYREX_API_URL,
  headers: {
    'accept': 'application/json',
    'authorization': `Bearer ${BEYREX_API_KEY}`
  }
});

async function getAccountBalance(address) {
  const response = await apiClient.get(`/account/balance/${address}`);
  const balanceInWei = response.data.balances[0].value;
  const decimals = response.data.balances[0].currency.decimals;
  const symbol = response.data.balances[0].currency.symbol;
  const balance = (balanceInWei / Math.pow(10, decimals)).toFixed(4);
  return `The balance is ${balance} ${symbol}`;
}

async function getAccountInfo(address) {
  const response = await apiClient.get(`/account/info/${address}`);
  return response.data;
}

async function getDynamicConfig() {
  const response = await apiClient.get(`/dynamic-config`);
  return response.data;
}

async function getERC20Approvals(ticker, address) {
  const response = await apiClient.get(`/transactions/erc20/ticker/${ticker}/address/${address}/approvals`);
  return response.data;
}

async function getERC20Info(ticker, address) {
  const response = await apiClient.get(`/transactions/erc20/ticker/${ticker}/address/${address}`);
  return response.data;
}

async function getERC20Transfers(ticker, address) {
  const response = await apiClient.get(`/transactions/erc20/ticker/${ticker}/address/${address}/transfers`);
  return response.data;
}

async function getERC20Contracts() {
  const response = await apiClient.get(`/erc20/contracts`);
  return response.data;
}

async function getERC20AllTransactions(address) {
  const response = await apiClient.get(`/transactions/erc20/address/${address}/all`);
  return response.data;
}

async function getERC20AllTransfers(address) {
  const response = await apiClient.get(`/transactions/erc20/address/${address}/transfers`);
  return response.data;
}

async function getERC20AllApprovals(address) {
  const response = await apiClient.get(`/transactions/erc20/address/${address}/approvals`);
  return response.data;
}

async function getERC20ContractTransfers(contract_address, address) {
  const response = await apiClient.get(`/transactions/erc20/contract/${contract_address}/address/${address}/transfers`);
  return response.data;
}

async function getERC20ContractApprovals(contract_address, address) {
  const response = await apiClient.get(`/transactions/erc20/contract/${contract_address}/address/${address}/approvals`);
  return response.data;
}

async function getEventById(id) {
  const response = await apiClient.get(`/events/id/${id}`);
  return response.data;
}

async function getEventByHeight(height) {
  const response = await apiClient.get(`/events/height/${height}`);
  return response.data;
}

async function getEventByTxCid(tx_cid) {
  const response = await apiClient.get(`/events/tx-cid/${tx_cid}`);
  return response.data;
}

async function getEventByEmitter(emitter) {
  const response = await apiClient.get(`/events/emitter/${emitter}`);
  return response.data;
}

async function getEventBySelector(selector) {
  const response = await apiClient.get(`/events/selector/${selector}`);
  return response.data;
}

async function getEventByType(type) {
  const response = await apiClient.get(`/events/type/${type}`);
  return response.data;
}

async function searchFull(identifier) {
  const response = await apiClient.get(`/search/full/${identifier}`);
  return response.data;
}

async function searchLight(identifier) {
  const response = await apiClient.get(`/search/light/${identifier}`);
  return response.data;
}

async function getFeesBase(period) {
  const response = await apiClient.get(`/stats/fees/base/global/${period}`);
  return response.data;
}

async function getFeesEstimate(method) {
  const response = await apiClient.get(`/stats/fees/estimate/${method}`);
  return response.data;
}

async function getStatsBalance(address) {
  const response = await apiClient.get(`/stats/balance/${address}/latest`);
  return response.data;
}

async function getStatsERC20Balance(address) {
  const response = await apiClient.get(`/stats/balance/erc20/all/${address}/latest`);
  return response.data;
}

async function getTransactions(address) {
  const response = await apiClient.get(`/transactions/address/${address}`);
  return response.data;
}

async function getTransactionByHash(hash) {
  const response = await apiClient.get(`/transactions/hash/${hash}`);
  return response.data;
}

async function getTransactionByHeight(height) {
  const response = await apiClient.get(`/transactions/height/${height}`);
  return response.data;
}

async function getTransactionByBlockCid(cid) {
  const response = await apiClient.get(`/transactions/block-cid/${cid}`);
  return response.data;
}

async function getTransactionByAddress(address) {
  const response = await apiClient.get(`/transactions/address/${address}`);
  return response.data;
}

async function getTransactionByReceiver(address) {
  const response = await apiClient.get(`/transactions/address/${address}/receiver`);
  return response.data;
}

async function getTransactionBySender(address) {
  const response = await apiClient.get(`/transactions/address/${address}/sender`);
  return response.data;
}

async function getTipsetByHeight(height) {
  const response = await apiClient.get(`/tipset/height/${height}`);
  return response.data;
}

async function getTipsetByHash(hash) {
  const response = await apiClient.get(`/tipset/hash/${hash}`);
  return response.data;
}

async function getTipsetByBlockCid(cid) {
  const response = await apiClient.get(`/tipset/block-cid/${cid}`);
  return response.data;
}

async function getTipsetLatest() {
    const response = await apiClient.get(`/tipset/latest`);
    const data = response.data[0];
    const height = data.height;
    const blockCount = data.blocks_cid.length;
    return `The height is ${height} and the number of blocks is ${blockCount}`;
  }

module.exports = {
  getAccountBalance,
  getAccountInfo,
  getDynamicConfig,
  getERC20Approvals,
  getERC20Info,
  getERC20Transfers,
  getERC20Contracts,
  getERC20AllTransactions,
  getERC20AllTransfers,
  getERC20AllApprovals,
  getERC20ContractTransfers,
  getERC20ContractApprovals,
  getEventById,
  getEventByHeight,
  getEventByTxCid,
  getEventByEmitter,
  getEventBySelector,
  getEventByType,
  searchFull,
  searchLight,
  getFeesBase,
  getFeesEstimate,
  getStatsBalance,
  getStatsERC20Balance,
  getTransactions,
  getTransactionByHash,
  getTransactionByHeight,
  getTransactionByBlockCid,
  getTransactionByAddress,
  getTransactionByReceiver,
  getTransactionBySender,
  getTipsetByHeight,
  getTipsetByHash,
  getTipsetByBlockCid,
  getTipsetLatest
};
