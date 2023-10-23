// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './MasterChefMod.sol';

contract RewardsFeeder is Ownable {

    IERC20 public token;
    MasterChefMod public masterchef;

    uint256 private PRECISION = 10 ** 18;
    /// @notice rewards are split between multiple networks the token is deployed on
    uint256 public numNetworks = 2;
    uint256 public initialYearlyReward = 2_500_000 * PRECISION;
    uint256 public initialPeriodStart = 1567296000;
    uint256 public lastRewardMonth = 0;

    uint256 public secondsPerYear = 3600 * 24 * 365;
    uint256 public secondsPerMonth = secondsPerYear / 12;

    mapping (uint256 => bool) periodsRewarded;

    event TokensAdded(address account, uint256 amount);
    event RewardsFed(address account, uint256 monthNumber, uint256 amount);

    constructor(address _tokenAddress, address _masterchefAddress) {
        token = IERC20(_tokenAddress);
        masterchef = MasterChefMod(_masterchefAddress);
    }

    function setNumNetworks(uint256 _numNetworks) external onlyOwner {
        numNetworks = _numNetworks;
    }

    /// @notice period number (counting from 0). Periods are year long, start at Sep 1st and mark rewards decrease by 25%
    function getYearNumberByTs(uint256 ts) public view returns (uint256) {
        return (ts - initialPeriodStart) / secondsPerYear;
    }

    function getYearNumber() public view returns (uint256) {
        return getYearNumberByTs(block.timestamp);
    }

    function getMonthNumberByTs(uint256 ts) public view returns (uint256) {
        return (ts - initialPeriodStart) / secondsPerMonth;
    }

    function getMonthNumber() public view returns (uint256) {
        return getMonthNumberByTs(block.timestamp);
    }

    function getYearlyRewardTs(uint256 ts) public view returns (uint256) {
        uint256 currentYear = getYearNumberByTs(ts);
        return initialYearlyReward * (3 ** currentYear) / (4 ** currentYear) / numNetworks;
    }

    function getYearlyReward() public view returns (uint256) {
        return getYearlyRewardTs(block.timestamp);
    }

    function getMonthlyRewardTs(uint256 ts) public view returns (uint256) {
        return getYearlyRewardTs(ts) / 12;
    }

    function getMonthlyReward() public view returns (uint256) {
        return getMonthlyRewardTs(block.timestamp);
    }

    function addTokens(uint256 amount) public {
        token.transferFrom(msg.sender, address(this), amount);
        emit TokensAdded(msg.sender, amount);
    }

    function feedRewards() public {
        uint256 amount = getMonthlyReward();
        uint256 monthNumber = getMonthNumber();
        masterchef.updateRewards(amount);
        emit RewardsFed(msg.sender, monthNumber, amount);
    }

}

/*
rewards schedule: https://docs.google.com/spreadsheets/d/1a8ZjpD2obMg-YXXUrpVU_Us4Nt_TTCx8ndK1lb5wMlQ/edit#gid=638079350
2018: 208333,3 * 12 = 2_500_000
2019: 156250 * 12 = 1_875_000
2020: 117187 * 12 = 1_406_244
2021: 117187 * 12 = 1_054_688


high level api:
- pullRewards
 - called by anyone
 - checks if rewards pending this month
    -


*/