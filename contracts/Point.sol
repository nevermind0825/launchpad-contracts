// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Point is Ownable {
    struct TokenInfo {
        address token;
        uint256 weight;
    }

    mapping(uint256 => TokenInfo) _tokenInfos;
    uint256 _tokenInfoNumber;
    uint256 private _decimal; // this is decimal for weight.

    constructor(uint256 decimal) {
        _decimal = decimal;
    }

    // modifiers
    modifier onlyIndex(uint256 indexTokenInfo) {
        require(indexTokenInfo < _tokenInfoNumber, "Point: the token index is invalid");
        _;
    }

    // functions
    function insertToken(address token, uint256 weight) external onlyOwner returns (uint256) {
        TokenInfo storage t = _tokenInfos[_tokenInfoNumber];
        t.token = token;
        t.weight = weight;
        return _tokenInfoNumber++;
    }

    function removeToken(uint256 indexTokenInfo) external onlyOwner onlyIndex(indexTokenInfo) {
        delete _tokenInfos[indexTokenInfo];
    }

    function getToken(uint256 indexTokenInfo)
        external
        view
        onlyOwner
        onlyIndex(indexTokenInfo)
        returns (address, uint256)
    {
        TokenInfo storage t = _tokenInfos[indexTokenInfo];
        require(t.token != address(0), "Point: you have already removed this token");
        return (t.token, t.weight);
    }

    function getPoint(address account) external view returns (uint256) {
        uint256 totalPoint = 0;
        for (uint256 i = 0; i < _tokenInfoNumber; i++) {
            TokenInfo storage t = _tokenInfos[i];
            if (t.token != address(0)) {
                totalPoint += IERC20(t.token).balanceOf(account) * t.weight;
            }
        }

        return totalPoint / (10**_decimal);
    }

    function setDecimal(uint256 decimal) external onlyOwner {
        _decimal = decimal;
    }

    function getDecimal() external view onlyOwner returns (uint256) {
        return _decimal;
    }
}
