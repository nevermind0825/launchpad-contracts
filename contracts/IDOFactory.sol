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

    event CreateIDO(address fundToken, uint256 fundAmount, address saleToken, uint256 saleAmount);
    event SetOperator(address operator, bool canOperate);

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
     * @param fundToken: Address of fund token
     * @param fundAmount: Amount of fund token
     * @param saleToken: Address of sale token
     * @param saleAmount: Amount of sale token
     * @return index: Index of the created IDO
     */
    function createIDO(
        address fundToken,
        uint256 fundAmount,
        address saleToken,
        uint256 saleAmount
    ) external onlyOperator returns (uint256) {
        _ctrtIDOs.push(address(new IDO(fundToken, fundAmount, saleToken, saleAmount)));
        emit CreateIDO(fundToken, fundAmount, saleToken, saleAmount);
        return _ctrtIDOs.length - 1;
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
     * @notice IDOFactory owner finalizes a IDO
     * @param index: Index of the IDO
     * @param finalizer: Address of finalizer
     */
    function finalizeIDO(
        uint256 index,
        address projectOwner,
        address finalizer,
        address feeRecipient,
        uint256 feePercent
    ) external onlyOwner inIDOs(index) {
        IDO(_ctrtIDOs[index]).finalize(projectOwner, finalizer, feePercent, feeRecipient);
    }

    /**
     * @notice IDOFactory owner calls emergencyRefund
     * @param index: Index of the IDO
     */
    function emergencyRefund(uint256 index) external onlyOwner inIDOs(index) {
        IDO(_ctrtIDOs[index]).emergencyRefund();
    }

    /**
     * @notice Get user's multiplier
     * @param funder: Address of funder
     * @return multiplier: Return the user's multiplier
     */
    function getMultiplier(address funder) public view returns (uint256) {
        uint256 tierIndex;
        uint256 multiplier;
        (tierIndex, multiplier) = ITier(_tier).getMultiplier(_point, funder);
        return multiplier;
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
