// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

interface IPoint {
    function getPoint(address account) external view returns (uint);
}