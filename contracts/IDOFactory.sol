// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
// import "hardhat/console.sol";

import "./IDO.sol";
import "./interfaces/ITier.sol";

/**
 * @title IDOFactory
 * @notice IDOFactoy creates IDOs.
 */
contract IDOFactory is Ownable {
    address[] private _ctrtIDOs;

    address private _tier;
    address private _point;

    mapping(address => bool) private operators;

    event CreateIDO(address indexed idoAddress, uint256 index);
    event SetOperator(address indexed operator, bool canOperate);

    /**
     * @notice Set tier, point address and roles.
     * @param tier: Addres of tier contract
     * @param point: Address of point contract
     */
    constructor(address tier, address point) {
        _tier = tier;
        _point = point;
        operators[owner()] = true;
    }

    modifier inIDOs(uint256 index) {
        require(_ctrtIDOs.length > index, "IDOFactory: IDO index is invalid");
        _;
    }

    modifier onlyOperator() {
        require(operators[msg.sender], "IDOFactory: caller is not operator");
        _;
    }

    function setTierAddress(address tier) external onlyOwner {
        _tier = tier;
    }

    function getTierAddress() external view returns (address) {
        return _tier;
    }

    function setPointAddress(address point) external onlyOwner {
        _point = point;
    }

    function getPointAddress() external view returns (address) {
        return _point;
    }

    /**
     * @notice IDOFactory owner sets or removes a operator
     * @param operator: Address of operator
     * @param canOperate: possible of operator
     */
    function setOperator(address operator, bool canOperate) external onlyOwner {
        operators[operator] = canOperate;
        emit SetOperator(operator, canOperate);
    }

    /**
     * @notice IDOFactory owner creates a new IDO
     */
    function createIDO(IDO.IDOProperty memory idoProperty) external onlyOperator {
        _ctrtIDOs.push(address(new IDO(idoProperty)));
        uint256 index = _ctrtIDOs.length - 1;
        emit CreateIDO(_ctrtIDOs[index], index);
    }

    /**
     * @notice Get IDO address
     * @param index: Index of the IDO to get
     * @return IDO: Address of the IDO to get
     */
    function getIDO(uint256 index) external view inIDOs(index) returns (address) {
        return _ctrtIDOs[index];
    }

    /**
     * @notice Get IDO addresses
     */
    function getIDOs() external view returns (address[] memory) {
        return _ctrtIDOs;
    }

    /**
     * @notice Get user's multiplier
     * @param funder: Address of funder
     * @return multiplier
     */
    function getMultiplier(address funder) public view returns (uint256 multiplier) {
        (, multiplier) = ITier(_tier).getMultiplier(_point, funder);
    }

    /**
     * @notice Check if user is an operator
     * @param addr: Address of user's account
     * @return isOperator: Return true if user is an operator, false otherwise
     */
    function isOperator(address addr) public view returns (bool) {
        return operators[addr];
    }
}
