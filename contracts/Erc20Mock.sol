// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Erc20Mock is ERC20 {
  constructor() ERC20('Mock Token', 'TKN') {
    _mint(msg.sender, 100_000_000 ether);
  }
}
