const fs = require('fs');
const hre = require('hardhat');
const ethers = hre.ethers;
const provider = hre.ethers.provider;

let overrides = {
  // The maximum units of gas for the transaction to use
  // gasLimit: 8000000,
  gasPrice: ethers.utils.parseUnits('1.0', 'gwei'),
};

const setup = async (root) => {
  const day = 86400;
  const rewardsDuration = day * 30;
  const xdaiSwm = '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa';

  const amount = ethers.utils.parseEther('1000000');
  MasterChefMod = await ethers.getContractFactory('MasterChefMod');
  root.masterChefMod = await MasterChefMod.deploy(
    xdaiSwm,
    rewardsDuration,
    overrides
  );
  await root.masterChefMod.deployed();

  await root.masterChefMod.add();

  let contracts = {
    MasterChefMod: root.masterChefMod.address,
  };

  fs.writeFileSync(
    `./output/contracts.json`,
    JSON.stringify(contracts, null, 2),
    function (err) {
      if (err) throw err;
    }
  );
};

async function main() {
  await setup(this);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
