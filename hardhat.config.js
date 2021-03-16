require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');

const fs = require('fs');
// key to launch on testenets
const mnemonicTestnet = fs.readFileSync('.secret-testnet').toString().trim();
// key to launch on mainnet
const mnemonic = fs.readFileSync('.secret').toString().trim();

const etherscan_key = process.env.ETHERSCAN_KEY;
const alchemy_key = process.env.ALCHEMY_KEY;
const infura_key = process.env.INFURA_KEY;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
      },
      {
        version: '0.7.4',
      },
    ],
    optimizer: {
      enabled: true,
      runs: 100,
    },
  },
  etherscan: {
    apiKey: etherscan_key,
  },
  networks: {
    hardhat: {
      gas: 12000000,
      blockGasLimit: 12000000,
    },
    fork: {
      blockGasLimit: 12000000,
      url: 'https://eth-mainnet.alchemyapi.io/v2/' + alchemy_key,
      chainId: 1,
      forking: {
        blockNumber: 11600501,
      },
    },
    mainnet: {
      url: 'https://eth-mainnet.alchemyapi.io/v2/' + alchemy_key,
      chainId: 1,
      gas: 'auto',
      gasPrice: 'auto',
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
      },
    },
    kovan: {
      url: 'https://kovan.infura.io/v3/' + infura_key,
      chainId: 42,
      gas: 'auto',
      gasPrice: 'auto',
      accounts: {
        mnemonic: mnemonicTestnet,
        path: "m/44'/60'/0'/0",
      },
    },
    xdai: {
      url: 'https://xdai-archive.blockscout.com', //'https://rpc.xdaichain.com/',
      chainId: 100,
      gas: 'auto',
      gasPrice: 'auto',
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
      },
    },
  },
};
