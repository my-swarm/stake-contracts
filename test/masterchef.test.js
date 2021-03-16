const { ethers } = require('hardhat');
const { expect } = require('chai');
const { deployContract, deployChef } = require('./utils');

describe('MasterChef', function () {
  let swm;
  let owner, alice, bob, carol, dev, minter;
  // let masterChef, swm, erc20

  before(async function () {
    [owner, alice, bob, carol, dev, minter] = await ethers.getSigners();
    swm = await deployContract('SWM');
  });

  it('sets correct state variables', async function () {
    const duration = Math.round(Math.random() * 10000) + 1000;
    const chef = await deployChef(swm.address, duration);

    // await this.sushi.transferOwnership(this.chef.address);

    expect(await chef.rewardToken()).to.equal(swm.address);
    expect(await chef.rewardsDuration()).to.equal(duration);
    expect((await chef.timeDeployed()).toNumber()).to.be.greaterThan(
      Date.now() / 1000 - 100
    );
    expect(await chef.periodFinish()).to.equal(
      (await chef.timeDeployed()).add(duration)
    );
  });
});
