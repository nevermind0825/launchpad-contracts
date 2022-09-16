// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// import "hardhat/console.sol";

/**
 * @title Point
 * @notice Get users' points based on the token amount that users owned.
 */
contract Point is Ownable {
    struct TokenInfo {
        address token;
        uint256 weight;
    }

    TokenInfo[] private _tokenInfos;

    // This is decimal for the weight.
    uint256 private _decimal;

    /**
     * @notice Init decimal for weight.
     * @param decimal: decimal for weight
     */
    constructor(uint256 decimal) {
        _decimal = decimal;
    }

    modifier onlyIndex(uint256 indexTokenInfo) {
        require(indexTokenInfo < _tokenInfos.length, "Point: the token index is invalid");
        _;
    }

    /**
     * @notice A new token info is inserted.
     * @param token: Address of the token to insert
     * @param weight: Weight of the token to insert
     * @return index: Index of the inserted token
     */
    function insertToken(address token, uint256 weight) external onlyOwner returns (uint256) {
        require(token != address(0), "Point: token addres is invalid.");
        require(weight > 0, "Point: token weight must be greater than zero.");
        for (uint256 i = 0; i < _tokenInfos.length; i++) {
            require(_tokenInfos[i].token != token, "Point: the token is already inserted.");
        }
        _tokenInfos.push(TokenInfo(token, weight));
        return _tokenInfos.length - 1;
    }

    /**
     * @notice A token is removed.
     * @param index: Index of token to remove
     */
    function removeToken(uint256 index) external onlyOwner onlyIndex(index) {
        _tokenInfos[index] = _tokenInfos[_tokenInfos.length - 1];
        _tokenInfos.push();
    }

    /**
     * @notice Get a token
     * @param index: Index of a token to get
     * @return tokenInfo: Return the token info (token address, token weight)
     */
    function getToken(uint256 index) external view onlyOwner onlyIndex(index) returns (address, uint256) {
        TokenInfo storage t = _tokenInfos[index];
        require(t.token != address(0), "Point: you have already removed this token");
        return (t.token, t.weight);
    }

    /**
     * @notice Get user's point
     * @param account: Address of user's account
     * @return point: Return user's point
     */
    function getPoint(address account) external view returns (uint256) {
        uint256 totalPoint = 0;
        for (uint256 i = 0; i < _tokenInfos.length; i++) {
            TokenInfo storage t = _tokenInfos[i];
            if (t.token != address(0)) {
                totalPoint += IERC20(t.token).balanceOf(account) * t.weight;
            }
        }

        return totalPoint / (10**_decimal);
    }

    /**
     * @notice Set a decimal for weight.
     * @param decimal: Decimal for weight
     */
    function setDecimal(uint256 decimal) external onlyOwner {
        _decimal = decimal;
    }

    /**
     * @notice Get a decimal for weight.
     * @return _decimal: Return decimal for weight
     */
    function getDecimal() external view onlyOwner returns (uint256) {
        return _decimal;
    }
}
