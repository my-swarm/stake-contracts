// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Distribution is Ownable {
  using SafeMath for uint256;

  event RewardAssigned(
    uint256 periodEnd,
    address indexed masternode,
    uint256 value
  );
  event RewardCollected(
    uint256 periodEnd,
    address indexed masternode,
    uint256 value
  );
  event RewardSet(address indexed masternode, uint256 value);

  struct AccountReward {
    uint256 reward;
    uint256 periodEnd;
  }

  mapping(address => AccountReward) public _rewards;

  IERC20 private _swmERC20;

  bool public paused;

  modifier whenNotPaused() {
    require(!paused, 'Distribution: Contract paused');
    _;
  }

  modifier whenPaused() {
    require(paused, 'Distribution: Contract paused');
    _;
  }

  constructor(address swmERC20) {
    _swmERC20 = IERC20(swmERC20);
  }

  function rewardOf(address account) external view returns (uint256) {
    return _rewards[account].reward;
  }

  function periodEndOf(address account) external view returns (uint256) {
    return _rewards[account].periodEnd;
  }

  function assignRewards(
    uint256 periodEnd,
    address[] calldata accounts,
    uint256[] calldata values
  ) external whenNotPaused onlyOwner returns (bool) {
    require(accounts.length != 0, 'Distribution: Accounts length is zero');
    require(
      accounts.length == values.length,
      'Distribution: Lengths difference'
    );
    require(periodEnd < block.timestamp, 'Distribution: Period end is in future');

    uint256 sumValues = 0;

    for (uint256 i = 0; i < accounts.length; i++) {
      _assign(periodEnd, accounts[i], values[i]);

      sumValues = sumValues.add(values[i]);
    }

    require(_swmERC20.transferFrom(msg.sender, address(this), sumValues));

    return true;
  }

  function setRewards(address[] calldata accounts, uint256[] calldata values)
    external
    whenPaused
    onlyOwner
    returns (bool)
  {
    require(accounts.length != 0, 'Distribution: Accounts length is zero');
    require(
      accounts.length == values.length,
      'Distribution: Lengths difference'
    );

    for (uint256 i = 0; i < accounts.length; i++) {
      _set(accounts[i], values[i]);
    }

    return true;
  }

  function collect() external whenNotPaused returns (bool) {
    _collect(msg.sender);

    return true;
  }

  function collectRewards(address[] calldata accounts)
    external
    onlyOwner
    returns (bool)
  {
    require(accounts.length != 0, 'Distribution: Accounts length is zero');

    for (uint256 i = 0; i < accounts.length; i++) {
      _collect(accounts[i]);
    }

    return true;
  }

  function clear() external onlyOwner returns (bool) {
    return _swmERC20.transfer(msg.sender, _swmERC20.balanceOf(address(this)));
  }

  function togglePause() external onlyOwner {
    paused = !paused;
  }

  function _collect(address account) internal {
    require(_rewards[account].reward != 0, 'Distribution: Reward is zero');

    uint256 reward = _rewards[account].reward;
    uint256 periodEnd = _rewards[account].periodEnd;

    delete _rewards[account].reward;

    require(_swmERC20.transfer(account, reward));

    emit RewardCollected(periodEnd, account, reward);
  }

  function _assign(
    uint256 periodEnd,
    address account,
    uint256 value
  ) internal {
    require(value != 0, 'Distribution: Value is zero');
    require(account != address(0), 'Distribution: Account address is zero');
    require(
      periodEnd > _rewards[account].periodEnd,
      'Distribution: Period end less than saved for account'
    );

    _rewards[account].reward = _rewards[account].reward.add(value);
    _rewards[account].periodEnd = periodEnd;

    emit RewardAssigned(periodEnd, account, value);
  }

  function _set(address account, uint256 value) internal {
    require(account != address(0), 'Distribution: Account address is zero');

    _rewards[account].reward = value;

    emit RewardSet(account, value);
  }
}
