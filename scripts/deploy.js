const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

let overrides = {
  // The maximum units of gas for the transaction to use
  // gasLimit: 8000000,
  gasPrice: ethers.utils.parseUnits('1.0', 'gwei'),
};

const setup = async (root) => {
  const xdaiSwm = '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa';

  const amount = ethers.utils.parseEther('1000000');
  const SWM = await ethers.getContractFactory('SWM', overrides);
  root.swm = await SWM.deploy('Swarm Token', 'SWM', overrides);
  root.swm.deployed();

  const Distribution = await ethers.getContractFactory(
    'Distribution',
    overrides
  );
  root.distribution = await Distribution.deploy(xdaiSwm, overrides);
  root.distribution.deployed();

  //deployed distributions address mainnnet
  // 0xDe6f5dcc1f203BF01549d74B3E3Ff61a30173A13

  console.log(root.swm.address, root.distribution.address);
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
