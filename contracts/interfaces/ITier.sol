// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

interface ITier {
    function getMultiplier(address point, address user) external view returns (uint256);
}
