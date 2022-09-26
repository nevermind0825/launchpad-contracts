// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BUSD is ERC20 {
    constructor(uint initSupply) ERC20("BUSD", "BUSD") {
        _mint(msg.sender, initSupply);
    }
}
