// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Play is ERC20 {
    constructor(uint initSupply) ERC20("Play", "PLAY") {
        _mint(msg.sender, initSupply);
    }
}
