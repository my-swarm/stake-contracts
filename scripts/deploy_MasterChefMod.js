const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

const { parseUnits } = ethers.utils;

let overrides = {
  // The maximum units of gas for the transaction to use
  // gasLimit: 8000000,
  gasPrice: parseUnits('1.0', 'gwei'),
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
  let t;

  const signer = (await ethers.getSigners())[0];
  const network = hre.network.name;

  console.log(`Deploying on ${network} as ${signer.address}`);

  if (network === 'xdai') {
    swm = await ethers.getContractAt('ERC20', '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa');
  } else if (network === 'kovan') {
    swm = await ethers.getContractAt('ERC20', '0x46874BfC5Ed8D1c238F615Bb95c13b99994Aa578');
    token1 = await deployContract('Erc20Mock');
    console.log('token1', token1.address);
  } else if (network === 'fork' || network === 'mainnet') {
    swm = await ethers.getContractAt('ERC20', '0x3505f494c3f0fed0b594e01fa41dd3967645ca39');
  } else if (network === 'localhost') {
    swm = await deployContract('SWM');
    token1 = await deployContract('Erc20Mock');
    token2 = await deployContract('Erc20Mock');
  }
  const day = 86400;
  const rewardsDuration = day * 30;

  const amount = parseUnits('1000000');
  chef = await deployContract('MasterChefMod', [swm.address, rewardsDuration, overrides]);
  console.log('chef', chef.address);

  t = await chef.add(1, swm.address, false);
  await t.wait();
  console.log('pool 1 added');

  t = await swm.approve(chef.address, amount);
  await t.wait();
  console.log('swm approved on chef');

  let contracts = {
    SwarmToken: swm.address,
    MasterChefMod: chef.address,
  };

  if (network === 'localhost') {
    await chef.add(2, token1.address, false);
    await chef.add(5, token2.address, false);
    await chef.updateRewards(parseUnits('50000'));
    contracts.token1 = token1.address;
    contracts.token2 = token2.address;
    const alice = (await ethers.getSigners())[10];
    await swm.transfer(alice.address, parseUnits('100000'));
    await token1.transfer(alice.address, parseUnits('100000'));
    await token2.transfer(alice.address, parseUnits('100000'));
    await swm.connect(alice).approve(chef.address, parseUnits('100000'));
    await token1.connect(alice).approve(chef.address, parseUnits('100000'));
    await token2.connect(alice).approve(chef.address, parseUnits('100000'));
    await chef.connect(alice).deposit(0, parseUnits('10000'));
    await chef.connect(alice).deposit(1, parseUnits('10000'));
    await chef.connect(alice).deposit(2, parseUnits('10000'));

    // advance 10 days and mine
    await ethers.provider.send('evm_increaseTime', [10 * 24 * 3600]);
    await ethers.provider.send('evm_mine', []);
  } else if (network === 'kovan') {
    t = await chef.add(5, token1.address, false);
    await t.wait();
    console.log('pool 2 added');
    // t = await chef.updateRewards(parseUnits('50000'));
    // await t.wait();
    // console.log('rewards updated');
    contracts.token1 = token1.address;
  }

  fs.writeFileSync(`./output/${network}.json`, JSON.stringify(contracts, null, 2), function (err) {
    if (err) throw err;
  });

  console.log('Done');
  for ([key, contract] of Object.entries(contracts)) console.log(`${key}: ${contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
