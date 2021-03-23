const { ethers } = require('hardhat');
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

const COMP_PRECISSION = 1000000000;
// const COMP_PRECISSION = 1;

const { BigNumber } = ethers;
const { parseUnits } = ethers.utils;

describe('MasterChef', function () {
  let swm, chef, token1, token2, token3;
  let owner, alice, bob, dev, minter;
  let timeBefore = Math.round(Date.now() / 1000 - 100);
  const pid1 = 0;
  const pid2 = 1;
  const increase1 = parseUnits('2000');
  const increase2 = parseUnits('1000');
  const amount1 = parseUnits('100');
  const amount2 = parseUnits('200');
  let precision = BigNumber.from('10').pow(18);
  // let masterChef, swm, erc20

  before(async function () {
    [owner, alice, bob, dev, minter] = await ethers.getSigners();
    swm = await deployContract('SWM');
    token1 = await deployErc20('Token1');
    token2 = await deployErc20('Token2');
    token3 = await deployErc20('Token3');
    const holderAddresses = [alice.address, bob.address];
    await distributeToken(owner, token1, holderAddresses, 10000);
    await distributeToken(owner, token2, holderAddresses, 10000);
    await distributeToken(owner, token3, holderAddresses, 10000);
  });

  it('deploys correctly', async function () {
    const duration = Math.round(Math.random() * 10000) + 1000;
    const chef = await deployChef(swm.address, duration);

    // await this.sushi.transferOwnership(this.chef.address);

    expect(await chef.rewardToken()).to.equal(swm.address);
    expect(await chef.rewardsDuration()).to.equal(duration);
    expect((await chef.timeDeployed()).toNumber()).to.be.greaterThan(timeBefore);
    expect(await chef.periodFinish()).to.equal((await chef.timeDeployed()).add(duration));
  });

  context('With chef deployed', () => {
    beforeEach(async function () {
      chef = await deployChef(swm.address);
    });

    it('allows owner to add pools', async () => {
      await chef.add(2, token1.address, false);
      await chef.add(3, token2.address, false);
      expect(await chef.totalAllocPoint()).to.equal(5);
      expect(await chef.poolLength()).to.equal(2);

      const pool1 = await chef.poolInfo(0);
      expect(pool1.token).to.equal(token1.address);
      expect(pool1.allocPoint).to.equal(2);
      expect(pool1.lastUpdateTime.toNumber()).to.be.greaterThan(timeBefore);
      expect(pool1.totalStaked).to.equal(0);
      expect(pool1.accUndistributedReward).to.equal(0);
    });

    it('does not allow anyone else to add pools', async () => {
      await expect(chef.connect(alice).add(2, token1.address, false)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });

    it('allows creation of only one pool per token', async () => {
      await chef.add(2, token1.address, false);
      await expect(chef.add(3, token1.address, false)).to.be.revertedWith(
        'MasterChefMod: Stake token has already been added'
      );
    });

    it('allows owner to change allocPoint of stake token', async () => {
      await chef.add(2, token1.address, false);
      await chef.set(0, 11, false);
      expect(await chef.totalAllocPoint()).to.equal(11);
    });

    it('does not allow anyone else to change allocPoint', async () => {
      await chef.add(2, token1.address, false);
      await expect(chef.connect(bob).set(0, 11, false)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
  });

  context('With some pools setup', async () => {
    const amount = parseUnits('100');

    beforeEach(async () => {
      chef = await deployChef(swm.address);
      await updateAllowance(owner, swm, chef.address);
      await chef.add(1, token1.address, false);
      await chef.add(2, token2.address, false);
    });

    it('allows alice to deposit', async () => {
      await updateAllowance(alice, token1, chef.address);
      await expect(chef.connect(alice).deposit(pid1, amount))
        .to.emit(chef, 'Deposit')
        .withArgs(alice.address, pid1, amount);
    });

    it('allows owner to increase rewards', async () => {
      // create a nontrivial setup
      await chef.updateRewards(increase1);
      const pool1Before = await chef.poolInfo(pid1);
      const totalRewards = await chef.totalRewards();
      const ownerTokenBalance = await swm.balanceOf(owner.address);
      const chefTokenBalance = await swm.balanceOf(chef.address);
      const periodFinish = (await chef.periodFinish()).toNumber();

      await chef.updateRewards(increase2);
      const pool1After = await chef.poolInfo(pid1);
      expect(pool1After.allocPoint).to.equal(pool1Before.allocPoint);
      expect(pool1After.lastUpdateTime.toNumber()).to.be.greaterThan(
        pool1Before.lastUpdateTime.toNumber()
      );
      expect(pool1After.accRewardPerShare).to.equal(pool1Before.accRewardPerShare);
      expect(pool1After.totalStaked).to.equal(pool1Before.totalStaked);

      expect(await chef.totalRewards()).to.equal(totalRewards.add(increase2));
      expect(await swm.balanceOf(owner.address)).to.equal(ownerTokenBalance.sub(increase2));
      expect(await swm.balanceOf(chef.address)).to.equal(chefTokenBalance.add(increase2));
      // todo: exact comparison
      expect((await chef.periodFinish()).toNumber()).to.be.greaterThan(periodFinish);
    });

    it('does not allow anyone else to do that', async () => {
      await expect(chef.connect(bob).updateRewards(1)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });

    it('does not allow to increase rewards by zero', async () => {
      await expect(chef.updateRewards(0)).to.be.revertedWith(
        'MasterChefMod: Reward amount must be greater than zero'
      );
    });

    it('reward refill starts a fresh period', async () => {
      const periodFinishBefore = await chef.periodFinish();
      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase1);

      // period finish has moved with the time travel (10s tolerance)
      expect(await chef.periodFinish()).to.be.closeTo(periodFinishBefore.add(TEN_DAYS), 10);
    });

    it('reward refill changes rewardRate', async () => {
      const rewardsDuration = await chef.rewardsDuration();
      expect(await chef.rewardRate()).to.equal(0);
      await chef.updateRewards(increase1);
      expect(await chef.rewardRate()).to.equal(increase1.mul(precision).div(rewardsDuration));
      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase2);
      expect((await chef.rewardRate()).div(precision)).to.be.closeTo(
        increase1.mul(20).div(30).add(increase2).div(rewardsDuration),
        100
      );
    });

    it('reward refill increases accUndistributedReward when no one stakes', async () => {
      const poolBefore = await chef.poolInfo(pid1);

      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase1);
      const rewardRate = await chef.rewardRate();

      const poolAfter = await chef.poolInfo(pid1);
      const poolTimeDifference = poolAfter.lastUpdateTime.sub(poolBefore.lastUpdateTime);

      const expectedAccAfter = poolTimeDifference.mul(rewardRate).div(precision).div(3);
      expect(poolAfter.accUndistributedReward).to.equal(expectedAccAfter);

      await advanceTime(TWENTY_DAYS); // doesn't matter how much realllllyyyy
      await chef.updateRewards(increase2);
      const rewardRate2 = await chef.rewardRate();
      const poolAfter2 = await chef.poolInfo(pid1);
      const poolTimeDifference2 = poolAfter2.lastUpdateTime.sub(poolAfter.lastUpdateTime);
      const expectedAccAfter2 = expectedAccAfter.add(
        poolTimeDifference2.mul(rewardRate2).div(precision).div(3)
      );
      expect(poolAfter2.accUndistributedReward).to.equal(expectedAccAfter2);
    });

    it('reward refill increases accRewardPerShare with users staking', async () => {
      await updateAllowance(alice, token1, chef.address);
      await chef.connect(alice).deposit(pid1, amount);

      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase1);
      const poolBefore = await chef.poolInfo(pid1);

      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase2);
      const poolAfter = await chef.poolInfo(pid1);
      const poolTimeDifference = poolAfter.lastUpdateTime.sub(poolBefore.lastUpdateTime);
      const rewardRate = await chef.rewardRate();

      const poolRewards = poolTimeDifference.mul(rewardRate).div(3);
      expect(poolAfter.accRewardPerShare).to.equal(
        poolBefore.accRewardPerShare.add(poolRewards.div(amount))
        // ^ actually it's .mul(precision).div(precision) - cancels out
      );
    });

    it('allows owner to withdraw stuck tokens', async () => {
      await token3.transfer(chef.address, amount1);
      const contractBalanceBefore = await token3.balanceOf(chef.address);
      const ownerBalanceBefore = await token3.balanceOf(owner.address);
      const amount = parseUnits('50');
      await expect(chef.withdrawStuckTokens(token3.address, amount)).to.emit(token3, 'Transfer');
      expect(await token3.balanceOf(chef.address)).to.equal(contractBalanceBefore.sub(amount));
      expect(await token3.balanceOf(owner.address)).to.equal(ownerBalanceBefore.add(amount));
    });

    it('does not allow anyone else to do that', async () => {
      await expect(
        chef.connect(alice).withdrawStuckTokens(token3.address, amount1)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('only allows to withdraw existing stake tokens', async () => {
      await expect(chef.withdrawStuckTokens(swm.address, amount1)).to.be.revertedWith(
        'MasterChefMod: Cannot withdraw reward tokens'
      );
      await expect(chef.withdrawStuckTokens(token1.address, amount1)).to.be.revertedWith(
        'MasterChefMod: Cannot withdraw stake tokens'
      );
    });
  });

  context('With some pools setup and some users in', async () => {
    let initialTs; // from when pool 1 exists

    async function getPoolProp(pid, prop) {
      const poolInfo = await chef.poolInfo(pid);
      return poolInfo[prop];
    }

    async function getUserProp(pid, user, prop) {
      const userInfo = await chef.userInfo(pid, typeof user === 'string' ? user : user.address);
      return userInfo[prop];
    }

    beforeEach(async () => {
      /*
        setup
        2 pools (1:2 allocPoint)
        pool 1: alice 100 in, bob 200 in
        10 days passed
        reward1 in (around 1/3 gets distributed because 10 days of 30)
       */
      chef = await deployChef(swm.address);
      await updateAllowance(owner, swm, chef.address);
      await updateAllowance(alice, token1, chef.address);
      await updateAllowance(bob, token1, chef.address);
      await chef.add(1, token1.address, false);
      const pool1 = await chef.poolInfo(pid1);
      initialTs = pool1.lastUpdateTime;
      await chef.add(2, token2.address, false);
      await chef.connect(alice).deposit(pid1, amount1);
      await chef.connect(bob).deposit(pid1, amount2);
      await advanceTime(TEN_DAYS);
      await chef.updateRewards(increase1);
    });

    it('computes users pending reward', async () => {
      // not including since last update
      const pendingRewardBefore = await chef.pendingReward(pid1, alice.address);

      await advanceTimeAndBlock(TEN_DAYS);
      // including since last update
      const pendingReward = await chef.pendingReward(pid1, alice.address);
      const accRewardPerShare = await getPoolProp(pid1, 'accRewardPerShare');

      expect(pendingRewardBefore).to.equal(accRewardPerShare.mul(amount1).div(precision));
      expect(pendingReward).to.equal(accRewardPerShare.mul(amount1).div(precision).mul(2));
    });

    it('allows to withdraw stake (with implicit reward claim)', async () => {
      const withdrawAmount = parseUnits('50');
      const pendingReward = await chef.pendingReward(pid1, alice.address);
      const tolerance = (await chef.rewardRate()).div(3); // 1 second for pool1
      const stakeBefore = await getUserProp(pid1, alice, 'amount');
      const token1BalanceBefore = await token1.balanceOf(alice.address);
      const rewardTokenBalanceBefore = await swm.balanceOf(alice.address);
      expect(await chef.connect(alice).withdraw(pid1, withdrawAmount))
        .to.emit(chef, 'Withdraw')
        .withArgs(alice.address, pid1, withdrawAmount);

      expect(await getUserProp(pid1, alice, 'amount')).to.equal(stakeBefore.sub(withdrawAmount));

      expect(await token1.balanceOf(alice.address)).to.equal(
        token1BalanceBefore.add(withdrawAmount)
      );
      expect(await swm.balanceOf(alice.address)).to.be.closeTo(
        rewardTokenBalanceBefore.add(pendingReward),
        tolerance
      );

      // todo: userInfo.amoutn changed. deposit too...
    });

    it('does not allow to withdraw more than staked', async () => {
      await expect(chef.connect(alice).withdraw(pid1, amount1.add(1))).to.be.revertedWith(
        'MasterChefMod: Withdraw amount is greater than user stake.'
      );
    });

    it('allow to withdraw reward only', async () => {
      const pendingReward = await chef.pendingReward(pid1, alice.address);
      const tolerance = (await chef.rewardRate()).div(3); // 1 second for pool1
      const token1BalanceBefore = await token1.balanceOf(alice.address);
      const rewardTokenBalanceBefore = await swm.balanceOf(alice.address);
      await chef.connect(alice).withdraw(pid1, 0);

      expect(await token1.balanceOf(alice.address)).to.equal(token1BalanceBefore);
      expect(await swm.balanceOf(alice.address)).to.be.closeTo(
        rewardTokenBalanceBefore.add(pendingReward),
        tolerance
      );
    });

    it('allows to deposit more and claims reward implicitly', async () => {
      const depositAmount = parseUnits('40');
      const pendingReward = await chef.pendingReward(pid1, alice.address);
      const tolerance = (await chef.rewardRate()).div(3); // 1 second for pool1
      const stakeBefore = await getUserProp(pid1, alice, 'amount');
      const token1BalanceBefore = await token1.balanceOf(alice.address);
      const rewardTokenBalanceBefore = await swm.balanceOf(alice.address);
      expect(await chef.connect(alice).deposit(pid1, depositAmount))
        .to.emit(chef, 'Deposit')
        .withArgs(alice.address, pid1, depositAmount);

      expect(await getUserProp(pid1, alice, 'amount')).to.equal(stakeBefore.add(depositAmount));

      expect(await token1.balanceOf(alice.address)).to.equal(
        token1BalanceBefore.sub(depositAmount)
      );
      expect(await swm.balanceOf(alice.address)).to.be.closeTo(
        rewardTokenBalanceBefore.add(pendingReward),
        tolerance
      );
    });

    async function checkRewardFloor(pid, user) {
      const accRewardPerShare = await getPoolProp(pid, 'accRewardPerShare');
      const stakedAmount = await getUserProp(pid, user, 'amount');
      const floor = await getUserProp(pid1, user, 'rewardDebt');
      expect(floor).to.equal(accRewardPerShare.mul(stakedAmount).div(precision));
    }

    it('updates reward floor on withdraw/deposit', async () => {
      let floor = await getUserProp(pid1, alice, 'rewardDebt');
      expect(floor).to.equal(0);
      await chef.connect(alice).withdraw(pid1, parseUnits('50'));
      await checkRewardFloor(pid1, alice);
      await chef.connect(alice).deposit(pid1, parseUnits('123'));
      await checkRewardFloor(pid1, alice);
    });

    function sleep(s) {
      return new Promise((resolve) => setTimeout(resolve, s * 1000));
    }

    it('updates pool props after withdraw/deposit', async () => {
      const arpsBefore = await getPoolProp(pid1, 'accRewardPerShare');
      const lastUpdateBefore = await getPoolProp(pid1, 'lastUpdateTime');
      const totalStaked = await getPoolProp(pid1, 'totalStaked');
      const rewardRate = await chef.rewardRate();

      await sleep(2);
      await chef.connect(alice).withdraw(pid1, parseUnits('50'));
      const timeDiff = (await getPoolProp(pid1, 'lastUpdateTime')).sub(lastUpdateBefore);
      const arpsDiff = (await getPoolProp(pid1, 'accRewardPerShare')).sub(arpsBefore);

      expect(arpsDiff).to.equal(rewardRate.mul(2).div(3).div(totalStaked));
      // ^ actually it's .mul(precision).div(precision) - cancels out
      expect(timeDiff).to.equal(2);
    });

    it('allows emergency withdrawal with all consequences', async () => {
      const token1BalanceBefore = await token1.balanceOf(alice.address);
      const rewardTokenBalanceBefore = await swm.balanceOf(alice.address);
      const poolBefore = await chef.poolInfo(pid1);
      const userBefore = await chef.userInfo(pid1, alice.address);
      const amount = userBefore.amount;

      await expect(chef.connect(alice).emergencyWithdraw(pid1))
        .to.emit(chef, 'EmergencyWithdraw')
        .withArgs(alice.address, pid1, amount);

      // pool unchanged except for total stake
      const pool = await chef.poolInfo(pid1);
      expect(pool.lastUpdateTime).to.equal(poolBefore.lastUpdateTime);
      expect(pool.accRewardPerShare).to.equal(poolBefore.accRewardPerShare);
      expect(pool.totalStaked).to.equal(poolBefore.totalStaked.sub(amount));
      expect(pool.accUndistributedReward).to.equal(poolBefore.accUndistributedReward);

      // user cleared
      const user = await chef.userInfo(pid1, alice.address);
      expect(user.amount).to.equal(0);
      expect(user.rewardDebt).to.equal(0);

      // user got token1 but no reward
      expect(await token1.balanceOf(alice.address)).to.equal(token1BalanceBefore.add(amount));
      expect(await swm.balanceOf(alice.address)).to.equal(rewardTokenBalanceBefore);
    });
  });
});
