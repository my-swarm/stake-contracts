const hre = require('hardhat');
const { expect } = require('chai');
const {
  advanceTime,
  advanceTimeAndBlock,
  deployContract,
  deployChef,
  deployErc20,
  distributeToken,
  updateAllowance,
  dumpBn,
  dumpBns,
  TEN_DAYS,
  TWENTY_DAYS,
} = require('./utils');

const { ethers } = hre;

const { BigNumber } = ethers;
const { parseUnits } = ethers.utils;

const precision = BigNumber.from(10).pow(18);

describe('MasterChef', () => {
  let swm, masterchef, feeder;
  const numNetworks = 2;
  const initialPeriodStart = 1567296000;
  const secPerYear = 365 * 24 * 3600;
  const secPerMonth = secPerYear / 12;
  const rewardsDuration = 2592000; // this is actually 30 days

  function getMonthAndYear(ts) {
    const year = Math.floor((ts - initialPeriodStart) / secPerYear);
    const month = Math.floor((ts - initialPeriodStart) / secPerMonth);
    return { month, year };
  }

  before(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    swm = await deployContract('SWM');
    masterchef = await deployContract('MasterChefMod', [swm.address, rewardsDuration]);
    const swmPerAccount = parseUnits('1000');
    await swm.transfer(alice.address, swmPerAccount);
    await swm.transfer(bob.address, swmPerAccount);
    feeder = await deployContract('RewardsFeeder', [swm.address, masterchef.address]);
    await swm.connect(alice).approve(feeder.address, swmPerAccount);
    await swm.connect(bob).approve(feeder.address, swmPerAccount);
    await masterchef.transferOwnership(feeder.address);
  });

  it('has basic vars setup', async () => {
    expect(await feeder.numNetworks()).to.equal(numNetworks);
    expect(await feeder.initialYearlyReward()).to.equal(BigNumber.from(2_500_000).mul(precision));
    expect(await feeder.initialPeriodStart()).to.equal(initialPeriodStart);
    expect(await feeder.token()).to.equal(swm.address);
  });

  it('gets year and month number', async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const { month, year } = getMonthAndYear(now);

    expect(await feeder.getYearNumber()).to.equal(year);
    expect(await feeder.getYearNumberByTs(now)).to.equal(year);
    expect(await feeder.getYearNumberByTs(now + secPerYear)).to.equal(year + 1);

    expect(await feeder.getMonthNumber()).to.equal(month);
    expect(await feeder.getMonthNumberByTs(now)).to.equal(month);
    expect(await feeder.getMonthNumberByTs(now + secPerMonth)).to.equal(month + 1);
    expect(await feeder.getMonthNumberByTs(now + secPerYear)).to.equal(month + 12);
  });

  it('gets yearly and monthly reward by timestamp', async () => {
    let reward = (await feeder.initialYearlyReward()).div(numNetworks);
    let periodStart = initialPeriodStart;

    expect(await feeder.getYearlyRewardTs(periodStart)).to.equal(reward);

    for (let i = 0; i <= 10; i++) {
      const nextReward = reward.mul(3).div(4);
      const nextPeriodStart = periodStart + secPerYear;

      expect(await feeder.getYearlyRewardTs(periodStart)).to.equal(reward);
      expect(await feeder.getMonthlyRewardTs(periodStart)).to.equal(reward.div(12));

      expect(await feeder.getYearlyRewardTs(nextPeriodStart - 1)).to.equal(reward);
      expect(await feeder.getMonthlyRewardTs(nextPeriodStart - 1)).to.equal(reward.div(12));

      expect(await feeder.getYearlyRewardTs(nextPeriodStart)).to.equal(nextReward);
      expect(await feeder.getMonthlyRewardTs(nextPeriodStart)).to.equal(nextReward.div(12));

      reward = nextReward;
      periodStart = nextPeriodStart;
    }
  });

  it('gets current yearly and monthly reward', async () => {
    const initialYearlyReward = await feeder.getYearlyReward();
    const initialMonthlyReward = await feeder.getMonthlyReward();

    await advanceTimeAndBlock(secPerYear);

    expect(await feeder.getYearlyReward()).to.equal(initialYearlyReward.mul(3).div(4));
    expect(await feeder.getMonthlyReward()).to.equal(initialMonthlyReward.mul(3).div(4));
  });

  it('allows anyone to add more SWM', async () => {
    const swmBalanceBefore = await swm.balanceOf(feeder.address);
    await expect(feeder.connect(alice).addTokens(parseUnits('100')))
      .to.emit(feeder, 'TokensAdded')
      .withArgs(alice.address, parseUnits('100'));
    await feeder.connect(bob).addTokens(parseUnits('50'));
    const swmBalanceAfter = await swm.balanceOf(feeder.address);
    expect(swmBalanceAfter).to.equal(swmBalanceBefore.add(parseUnits('150')));
  });

  it('allows anyone to feed rewards', async () => {
    const swmBalanceBefore = await swm.balanceOf(feeder.address);
    const currentReward = await feeder.getMonthlyReward();
    const monthNumber = await feeder.getMonthNumber();

    await swm.connect(bob).approve(feeder.address, swmPerAccount);

    await expect(feeder.connect(bob).feedRewards())
      .to.emit(feeder, 'rewardsFed')
      .withArgs(bob.address, monthNumber, currentReward)
    const swmBalanceAfter = await swm.balanceOf(feeder.address);
    expect(swmBalanceAfter).to.equal(swmBalanceBefore.add(currentReward));
  });

  // it('only allows feed rewards once a month', async () => {
  //   const swmBalanceBefore = await swm.balanceOf(feeder.address);
  //   const currentReward = await feeder.getMonthlyReward();
  //   const monthNumber = await feeder.getMonthNumber();
  //
  //   await expect(feeder.connect(bob).feedRewards())
  //     .to.emit(feeder, 'rewardsFed')
  //     .withArgs(bob.address, monthNumber, currentReward)
  //   const swmBalanceAfter = await swm.balanceOf(feeder.address);
  //   expect(swmBalanceAfter).to.equal(swmBalanceBefore.add(currentReward));
  // });

  it('owner can change masterchef address', async () => {});
  it('no one else can change masterchef address', async () => {});
  it('can tell the amount of seconds before the next period starts', async () => {});

});
