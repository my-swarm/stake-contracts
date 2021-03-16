const { ethers } = require('hardhat');

const { BigNumber } = ethers;

async function deployContract(
  contractName,
  constructorParams = [],
  signer = null
) {
  if (signer === null) signer = (await ethers.getSigners())[0];
  const factory = await ethers.getContractFactory(contractName, signer);
  const contract = await factory.deploy(...constructorParams);
  await contract.deployed();
  return contract;
}

async function deployErc20(name) {
  const signers = await ethers.getSigners();
  return deployContract('ERC20Mock', signers[4]);
}

async function deployChef(swmAddress, rewardsDuration = 30 * 24 * 3600) {
  return deployContract('MasterChefMod', [swmAddress, rewardsDuration]);
}

async function advanceBlock() {
  return ethers.provider.send('evm_mine', []);
}

async function advanceBlockTo(blockNumber) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock();
  }
}

async function increase(value) {
  await ethers.provider.send('evm_increaseTime', [value.toNumber()]);
  await advanceBlock();
}

async function latest() {
  const block = await ethers.provider.getBlock('latest');
  return BigNumber.from(block.timestamp);
}

async function advanceTimeAndBlock(time) {
  await advanceTime(time);
  await advanceBlock();
}

async function advanceTime(time) {
  await ethers.provider.send('evm_increaseTime', [time]);
}

const duration = {
  seconds: function (val) {
    return BigNumber.from(val);
  },
  minutes: function (val) {
    return BigNumber.from(val).mul(this.seconds('60'));
  },
  hours: function (val) {
    return BigNumber.from(val).mul(this.minutes('60'));
  },
  days: function (val) {
    return BigNumber.from(val).mul(this.hours('24'));
  },
  weeks: function (val) {
    return BigNumber.from(val).mul(this.days('7'));
  },
  years: function (val) {
    return BigNumber.from(val).mul(this.days('365'));
  },
};

module.exports = {
  deployContract,
  deployErc20,
  deployChef,
  advanceBlock,
};
