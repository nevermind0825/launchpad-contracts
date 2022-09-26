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
    mapping(address => bool) private isTokenAdded;

    modifier onlyIndex(uint256 indexTokenInfo) {
        require(indexTokenInfo < _tokenInfos.length, "Point: token index is invalid");
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
        require(isTokenAdded[token] == false, "Point: the token is already inserted.");
        _tokenInfos.push(TokenInfo(token, weight));
        isTokenAdded[token] = true;
        return _tokenInfos.length - 1;
    }

    function updateToken(
        uint256 index,
        address token,
        uint256 weight
    ) external onlyOwner onlyIndex(index) {
        TokenInfo storage t = _tokenInfos[index];
        require(
            (isTokenAdded[token] == false) || (isTokenAdded[token] == true && t.token == token),
            "Point: token address is invalid"
        );
        isTokenAdded[token] = true;
        t.token = token;
        t.weight = weight;
    }

    /**
     * @notice A token is removed.
     * @param index: Index of token to remove
     */
    function removeToken(uint256 index) external onlyOwner onlyIndex(index) {
        TokenInfo storage t = _tokenInfos[index];
        isTokenAdded[t.token] = false;
        if (index < _tokenInfos.length - 1)
            t = _tokenInfos[_tokenInfos.length - 1];
        _tokenInfos.pop();
    }

    /**
     * @notice Get a token
     * @param index: Index of a token to get
     * @return tokenInfo: Return the token info (token address, token weight)
     */
    function getToken(uint256 index) external view onlyIndex(index) returns (TokenInfo memory) {
        return _tokenInfos[index];
    }

    /**
     * @notice Get user's point
     * @param account: Address of user's account
     * @return point: Return user's point
     */
    function getPoint(address account) external view returns (uint256) {
        require(account != address(0), "Point: user account is invalid");
        uint256 totalPoint = 0;
        uint256 tokenInfosLength = _tokenInfos.length;
        for (uint256 i = 0; i < tokenInfosLength; i++) {
            TokenInfo memory t = _tokenInfos[i];
            totalPoint += IERC20(t.token).balanceOf(account) * t.weight;
        }

        return totalPoint;
    }
}
