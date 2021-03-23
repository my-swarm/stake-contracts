const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

let overrides = {
  // The maximum units of gas for the transaction to use
  // gasLimit: 8000000,
  gasPrice: ethers.utils.parseUnits('1.0', 'gwei'),
};

async function deployContract(contractName, constructorParams = [], signer = null) {
  if (signer === null) signer = (await ethers.getSigners())[0];
  const factory = await ethers.getContractFactory(contractName, signer);
  const contract = await factory.deploy(...constructorParams);
  await contract.deployed();
  return contract;
}

async function main() {
  let swm, token1, token2, chef;

  const network = hre.network.name;
  console.log('deploying...');
  if (network === 'xdai') {
    swm = await ethers.getContractAt('ERC20', '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa');
  } else if (network === 'fork' || network === 'mainnet') {
    swm = await ethers.getContractAt('ERC20', '0x3505f494c3f0fed0b594e01fa41dd3967645ca39');
  } else if (network === 'localhost') {
    swm = await deployContract('SWM');
    token1 = await deployContract('Erc20Mock');
    token2 = await deployContract('Erc20Mock');
  }
  const day = 86400;
  const rewardsDuration = day * 30;

  const amount = ethers.utils.parseEther('1000000');
  chef = await deployContract('MasterChefMod', [swm.address, rewardsDuration, overrides]);

  await chef.add(1, swm.address, false);

  await swm.approve(chef.address, amount);
  await chef.updateRewards(amount);

  let contracts = {
    SwarmToken: swm.address,
    MasterChefMod: chef.address,
  };

  if (network === 'localhost') {
    await chef.add(2, token1.address, false);
    await chef.add(5, token2.address, false);
    contracts.token1 = token1.address;
    contracts.token2 = token2.address;
  }

  fs.writeFileSync(`./output/${network}.json`, JSON.stringify(contracts, null, 2), function (err) {
    if (err) throw err;
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
