// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract SWM is ERC20 {
  constructor(string memory name_, string memory symbol_)
    public
    ERC20(name_, symbol_)
  {
    _mint(msg.sender, 100_000_000 ether);
  }
}
