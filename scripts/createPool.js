const hre = require('hardhat');
const { ethers } = hre;

async function main() {
  let t;
  const chef = await ethers.getContractAt(
    'MasterChefMod',
    '0xde0EBBbcB678C15D10DB1c21449C9bd91D4Ad8d0'
  );
  t = await chef.add(4, '0xBB2F4187cECd7676D8aEdd8374B02D1b480E77E2', true);
  await t.wait();
  console.log('Pool created!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
