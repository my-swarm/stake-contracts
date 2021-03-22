const { ethers } = require('hardhat');

const { BigNumber } = ethers;
const { parseUnits } = ethers.utils;

async function getOwner() {
  return (await ethers.getSigners())[0];
}

async function deployContract(contractName, constructorParams = [], signer = null) {
  if (signer === null) signer = await getOwner();
  const factory = await ethers.getContractFactory(contractName, signer);
  const contract = await factory.deploy(...constructorParams);
  await contract.deployed();
  return contract;
}
async function deployErc20(name) {
  return deployContract('Erc20Mock', [], await getOwner());
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

async function distributeToken(signer, token, holderAddresses, perHolder) {
  for (const holderAddress of holderAddresses) {
    await token.connect(signer).transfer(holderAddress, await sanitizeAmount(perHolder, token));
  }
}

async function updateAllowance(account, token, spenderAddress, allowance = -1) {
  if (allowance === -1) {
    allowance = BigNumber.from(2).pow(256).sub(1);
  } else {
    allowance = await sanitizeAmount(allowance, token);
  }
  await token.connect(account).approve(spenderAddress, allowance);
}

async function sanitizeAmount(amount, token) {
  if (typeof amount === 'number') {
    const decimals = parseInt(await token.decimals());
    amount = parseUnits(amount.toString(), decimals);
  }
  return amount;
}

function dumpBn(bn) {
  console.log(bg.toString());
}

function dumpBns(bns) {
  for (const [key, value] of Object.entries(bns)) {
    console.log(`${key}: ${value.toString()}`);
  }
}

module.exports = {
  deployContract,
  deployErc20,
  deployChef,
  advanceTime,
  advanceTimeAndBlock,
  distributeToken,
  updateAllowance,
  dumpBn,
  dumpBns,
  TEN_DAYS: 10 * 24 * 3600,
  TWENTY_DAYS: 10 * 24 * 3600,
};
