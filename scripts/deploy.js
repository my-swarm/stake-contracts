const fs = require('fs');
const hre = require('hardhat');
const { ethers } = hre;

override = {
  // The maximum units of gas for the transaction to use
  gasLimit: 200000,
  gasPrice: ethers.utils.parseUnits('5.0', 'gwei'),
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
  // distributionContractxDai =  0xDe6f5dcc1f203BF01549d74B3E3Ff61a30173A13;
  // disperseContractxDai = 0x82bCD20b7d64f1c706438942b18B2eaaF2ef276e;

  console.log(root.swm.address, root.distribution.address);
};

async function main() {
  await setup(this);
}

async function payDividend() {
  paymentString =
    1136774260299389498773,382659175659296111660,381622379362657435032,
  ];



  addresses =
0x34eb35af16b847405bc6405b1a838163ad59c0cd,0xc3266c376d52ac06953b08b7ff38297229fdad92,0x0e977de8a0022e1ce086075776c1991ebdd6f9ec
  ];

  payment = convertBN(paymentString);

  function convertBN(arr) {
    bn_arr = new Array();
    for (let a in arr) {
      bn_arr.push(ethers.BigNumber.from(arr[a]));
    }
    return bn_arr;
  }

  function addAll(arr) {
    let sum = ethers.BigNumber.from('0');
    for (let a in arr) {
      sum = sum.add(arr[a]);
    }
    return sum;
  }

  timestamp = 1614556800;

  distribution = await ethers.getContractAt(
    'Distribution',
    '0xDe6f5dcc1f203BF01549d74B3E3Ff61a30173A13'
  );

  swm = await ethers.getContractAt(
    'ERC20',
    '0xaB57C72BFe106E6D4f8D82BC8CAD9614cdd890Fa'
  );

  await swm.approve(distribution.address, sum);

  tx = await distribution.assignRewards(
    timestamp,
    addresses,
    payment,
    override
  );
  await tx.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
