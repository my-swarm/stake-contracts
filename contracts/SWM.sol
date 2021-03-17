// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract SWM is ERC20 {
  constructor() public ERC20('Swarm Token', 'SWM') {
    _mint(msg.sender, 100_000_000 ether);
  }
}
