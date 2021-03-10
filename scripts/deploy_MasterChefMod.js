const fs = require('fs');
const hre = require('hardhat');
const ethers = hre.ethers;
const provider = hre.ethers.provider;
const timeMachine = require('ganache-time-traveler');

let overrides = {
  // The maximum units of gas for the transaction to use
  // gasLimit: 8000000,
  gasPrice: ethers.utils.parseUnits('1.0', 'gwei'),
};

module.exports = async (root, network) => {
  if (network == 'xdai') {
    root.swm = await ethers.getContractAt(
      'ERC20',
      '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa'
    );
  } else if (network == 'localhost') {
    root.swm = await deploySwm(root);
  } else if (network == 'fork' || network == 'mainnet') {
    root.swm = await ethers.getContractAt(
      'ERC20',
      '0x3505f494c3f0fed0b594e01fa41dd3967645ca39'
    );
  }
  const day = 86400;
  const rewardsDuration = day * 30;

  async function deploySwm(root) {
    const SWM = await ethers.getContractFactory('SWM', overrides);
    const swm = await SWM.deploy('Swarm Token', 'SWM', overrides);
    await swm.deployed();
    return swm;
  }

  const amount = ethers.utils.parseEther('1000000');
  MasterChefMod = await ethers.getContractFactory('MasterChefMod');
  root.masterChefMod = await MasterChefMod.deploy(
    root.swm.address,
    rewardsDuration,
    overrides
  );
  await root.masterChefMod.deployed();

  await root.masterChefMod.add(1, root.swm.address, false);
  await root.swm.approve(root.masterChefMod.address, amount);
  await root.masterChefMod.updateRewards(amount);

  let contracts = {
    SwarmToken: root.swm.address,
    MasterChefMod: root.masterChefMod.address,
  };

  fs.writeFileSync(
    `./output/${network}.json`,
    JSON.stringify(contracts, null, 2),
    function (err) {
      if (err) throw err;
    }
  );
};
