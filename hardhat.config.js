require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');

const fs = require('fs');
// key to launch on testenets
const mnemonicTestnet = fs.readFileSync('.secret-testnet').toString().trim();
// key to launch on mainnet
const mnemonic = fs.readFileSync('.secret').toString().trim();

const privateKey = fs.readFileSync('.private_key').toString().trim();

const alchemyUrl = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`;
const alchemyUrlKovan = `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_KOVAN}`;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        // kept for diesperse
        version: '0.7.6',
      },
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10,
          },
        }
      }
    ],
    // this config is probably wrong but I'm keeping to make sure we keep the bytecode of the old contracts
    optimizer: {
      enabled: true,
      runs: 100,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
    },
  },
  networks: {
    hardhat: {
      gas: 12000000,
      blockGasLimit: 12000000,
      // forking: {
      //   url: alchemyUrl,
      //   blockNumber: 12096271,
      // },
    },
    /*
    fork: {
      blockGasLimit: 12000000,
      url: alchemyUrl,
      chainId: 1,
      forking: {
        blockNumber: 12096271,
      },
    },
 */
    mainnet: {
      url: alchemyUrl,
      chainId: 1,
      gas: 'auto',
      gasPrice: 'auto',
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
      },
    },
    kovan: {
      url: alchemyUrlKovan,
      chainId: 42,
      gas: 12000000,
      blockGasLimit: 12000000,
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
    polygon: {
      url: process.env.ALCHEMY_POLYGON,
      chainId: 137,
      accounts: [privateKey],
      gasPrice: 600000000000,
    },
  },
};
