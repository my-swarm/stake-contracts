// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/math/Math.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract MasterChefMod is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
  event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
  event ClaimedRewards(
    address indexed user,
    uint256 indexed pid,
    uint256 amount
  );
  event EmergencyWithdraw(
    address indexed user,
    uint256 indexed pid,
    uint256 amount
  );

  /// @notice Detail of each user.
  struct UserInfo {
    uint256 amount; // How many tokens the user has provided.
    uint256 rewardDebt; // Reward debt. See explanation below.
    //
    // We do some fancy math here. Basically, any point in time, the amount of reward
    // entitled to a user which is pending to be distributed is:
    //
    // pending reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt
    //
    // Whenever a user deposits or withdraws tokens to a pool:
    //   1. The pool's `accRewardPerShare` (and `lastUpdateTime`) gets updated.
    //   2. User receives the pending reward sent to their address.
    //   3. User's `amount` gets updated.
    //   4. User's `rewardDebt` gets updated.
  }

  /// @notice Detail of each pool.
  struct PoolInfo {
    address token; // Token to stake.
    uint256 allocPoint; // How many allocation points assigned to this pool. Rewards to distribute per second.
    uint256 lastUpdateTime; // Last time that distribution happened.
    uint256 accRewardPerShare; // Accumulated rewards per share.
    uint256 totalStaked; // Amount of tokens staked in the pool.
    uint256 accUndestributedReward; // Accumulated rewards when a pool has no stake in it.
  }

  /// @dev Division precision.
  uint256 private precision = 1e18;

  /// @dev Reward token balance.
  uint256 public rewardTokenBalance;

  /// @notice Total allocation points. Must be the sum of all allocation points in all pools.
  uint256 public totalAllocPoint;

  /// @notice Time of the contract deployment.
  uint256 public timeDeployed;

  /// @notice Total rewards accumulated since contract deployment.
  uint256 public totalCumulativeRewards;

  /// @notice Reward token.
  address public rewardToken;

  /// @notice Detail of each pool.
  PoolInfo[] public poolInfo;

  /// @notice Period in which the latest distribution of rewards will end.
  uint256 public periodFinish;

  /// @notice Reward rate per second.
  uint256 public rewardRate;

  ///  @notice New rewards are equaly split between the duration.
  uint256 public rewardsDuration;

  /// @notice Detail of each user who stakes tokens.
  mapping(uint256 => mapping(address => UserInfo)) public userInfo;
  mapping(address => bool) private poolToken;

  constructor(address _rewardToken, uint256 _rewardsDuration) public {
    rewardToken = _rewardToken;
    rewardsDuration = _rewardsDuration;
    timeDeployed = block.timestamp;
    periodFinish = timeDeployed.add(rewardsDuration);
  }

  /// @notice Average reward per second generated since contract deployment.
  function avgRewardsPerSecondTotal()
    external
    view
    returns (uint256 avgPerSecond)
  {
    return totalCumulativeRewards.div(block.timestamp.sub(timeDeployed));
  }

  /// @notice Total pools.
  function poolLength() external view returns (uint256) {
    return poolInfo.length;
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    return Math.min(block.timestamp, periodFinish);
  }

  /// @notice Display user rewards for a specific pool.
  function pendingReward(uint256 _pid, address _user)
    public
    view
    returns (uint256)
  {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][_user];
    uint256 accRewardPerShare = pool.accRewardPerShare;

    uint256 lastRewardApplicable = lastTimeRewardApplicable();
    uint256 timeLength;

    if (pool.totalStaked != 0 && totalAllocPoint != 0) {
      if (pool.lastUpdateTime > lastRewardApplicable) {
        timeLength = 0;
      } else {
        timeLength = lastRewardApplicable.sub(pool.lastUpdateTime);
      }

      uint256 poolRewardsStored =
        timeLength.mul(rewardRate).mul(pool.allocPoint).div(totalAllocPoint);

      accRewardPerShare = accRewardPerShare.add(
        poolRewardsStored.mul(precision).div(pool.totalStaked)
      );
    }

    return
      user.amount.mul(accRewardPerShare).div(precision).sub(user.rewardDebt);
  }

  /// @notice Add a new pool.
  function add(
    uint256 _allocPoint,
    address _token,
    bool _withUpdate
  ) public onlyOwner {
    if (_withUpdate) {
      massUpdatePools();
    }

    require(
      poolToken[address(_token)] == false,
      'MasterChefMod: Stake token has already been added'
    );

    uint256 lastUpdateTime = block.timestamp;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);

    poolInfo.push(
      PoolInfo({
        token: _token,
        allocPoint: _allocPoint,
        lastUpdateTime: lastUpdateTime,
        accRewardPerShare: 0,
        totalStaked: 0,
        accUndestributedReward: 0
      })
    );

    poolToken[address(_token)] = true;
  }

  /// @notice Update the given pool's allocation point.
  function set(
    uint256 _pid,
    uint256 _allocPoint,
    bool _withUpdate
  ) public onlyOwner {
    if (_withUpdate) {
      massUpdatePools();
    }

    totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
      _allocPoint
    );
    poolInfo[_pid].allocPoint = _allocPoint;
  }

  /// @notice Deposit tokens to vault for reward allocation.
  function deposit(uint256 _pid, uint256 _amount) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];

    _updatePool(_pid);

    if (user.amount != 0 || pool.totalStaked == 0) {
      uint256 pending;

      if (user.amount != 0) {
        // User was already staking, add accumulated rewards to pending.
        pending = user.amount.mul(pool.accRewardPerShare).div(precision).sub(
          user.rewardDebt
        );
      }
      if (pool.totalStaked == 0) {
        // No one was staking, the pool was accumulating rewards.
        pending = pool.accUndestributedReward;
        pool.accUndestributedReward = 0;
      }

      if (pending != 0) {
        uint256 amountClaimed = _safeRewardTokenTransfer(msg.sender, pending);
        emit ClaimedRewards(msg.sender, _pid, amountClaimed);
      }
    }

    //Transfer in the amounts from user
    if (_amount != 0) {
      IERC20(pool.token).safeTransferFrom(
        address(msg.sender),
        address(this),
        _amount
      );

      user.amount = user.amount.add(_amount);
      pool.totalStaked = pool.totalStaked.add(_amount);
    }

    user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(precision);
    emit Deposit(msg.sender, _pid, _amount);
  }

  // Withdraw  tokens from Vault.
  function withdraw(uint256 _pid, uint256 _amount) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    require(
      user.amount >= _amount,
      'MasterChefMod: Withdraw amount is greater than user stake.'
    );

    _updatePool(_pid);

    uint256 pending =
      user.amount.mul(pool.accRewardPerShare).div(precision).sub(
        user.rewardDebt
      );

    if (pending != 0) {
      uint256 _amountClaimed = _safeRewardTokenTransfer(msg.sender, pending);
      emit ClaimedRewards(msg.sender, _pid, _amountClaimed);
    }

    if (_amount != 0) {
      user.amount = user.amount.sub(_amount);
      pool.totalStaked = pool.totalStaked.sub(_amount);
      IERC20(pool.token).safeTransfer(msg.sender, _amount);
    }

    user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(precision);
    emit Withdraw(msg.sender, _pid, _amount);
  }

  // Withdraw without caring about rewards. EMERGENCY ONLY.
  // !Caution this will remove all your pending rewards!
  function emergencyWithdraw(uint256 _pid) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];

    uint256 _amount = user.amount;
    user.amount = 0;
    user.rewardDebt = 0;
    pool.totalStaked = pool.totalStaked.sub(_amount);

    IERC20(pool.token).safeTransfer(address(msg.sender), _amount);
    emit EmergencyWithdraw(msg.sender, _pid, user.amount);
    // No mass update dont update pending rewards
  }

  /// Adds and evenly distributes any rewards that were sent to the contract since last reward update.
  function updateRewards(uint256 amount) external onlyOwner {
    require(
      amount != 0,
      'MasterChefMod: Reward amount must be greater than zero'
    );

    IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), amount);
    rewardTokenBalance = rewardTokenBalance.add(amount);

    if (totalAllocPoint == 0) {
      return;
    }

    massUpdatePools();

    uint256 newRewards = amount;

    if (block.timestamp >= periodFinish) {
      rewardRate = newRewards.div(rewardsDuration);
    } else {
      uint256 remaining = periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(rewardRate);
      rewardRate = newRewards.add(leftover).div(rewardsDuration);
    }

    totalCumulativeRewards = totalCumulativeRewards.add(newRewards);
    periodFinish = block.timestamp.add(rewardsDuration);
  }

  /// @notice Updates rewards for all pools by adding pending rewards.
  /// Can spend a lot of gas.
  function massUpdatePools() public {
    uint256 length = poolInfo.length;
    for (uint256 pid = 0; pid < length; ++pid) {
      _updatePool(pid);
    }
  }

  /// @notice Allocates pending rewards to pool.
  function _updatePool(uint256 _pid) internal {
    PoolInfo storage pool = poolInfo[_pid];

    if (totalAllocPoint == 0) {
      return;
    }

    uint256 lastRewardApplicable = lastTimeRewardApplicable();
    uint256 timeLength;

    if (pool.lastUpdateTime > lastRewardApplicable) {
      timeLength = 0;
    } else {
      timeLength = lastRewardApplicable.sub(pool.lastUpdateTime);
    }

    uint256 poolRewardsStored =
      timeLength.mul(rewardRate).mul(pool.allocPoint).div(totalAllocPoint);

    if (pool.totalStaked != 0) {
      pool.accRewardPerShare = pool.accRewardPerShare.add(
        poolRewardsStored.mul(precision).div(pool.totalStaked)
      );
    } else {
      pool.accRewardPerShare = pool.accRewardPerShare.add(poolRewardsStored);
      pool.accUndestributedReward = pool.accUndestributedReward.add(
        poolRewardsStored
      );
    }

    pool.lastUpdateTime = block.timestamp;
  }

  function _safeRewardTokenTransfer(address _to, uint256 _amount)
    internal
    returns (uint256 _claimed)
  {
    uint256 rewardTokenBal = rewardTokenBalance;

    if (_amount > rewardTokenBal) {
      _claimed = rewardTokenBal;
      IERC20(rewardToken).transfer(_to, rewardTokenBal);
      rewardTokenBalance = rewardTokenBalance.sub(rewardTokenBal);
    } else {
      _claimed = _amount;
      IERC20(rewardToken).transfer(_to, _amount);
      rewardTokenBalance = rewardTokenBalance.sub(_amount);
    }
  }

  function withdrawStuckTokens(address _token, uint256 _amount)
    public
    onlyOwner
  {
    require(
      _token != address(rewardToken),
      'MasterChefMod: Cannot withdraw reward tokens'
    );
    require(
      poolToken[address(_token)] == false,
      'MasterChefMod: Cannot withdraw stake tokens'
    );
    IERC20(_token).safeTransfer(msg.sender, _amount);
  }
}
