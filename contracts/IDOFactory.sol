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
    address _feeRecipient;
    uint256 _feePercent;

    IDO[] _ctrtIDOs;

    address[] _operators;

    address _tier;
    address _point;

    /**
     * @notice Set tier and point address
     * @param tier: Addres of tier contract
     * @param point: Address of point contract
     */
    constructor(address tier, address point) {
        _tier = tier;
        _point = point;
    }

    modifier inOperators(uint256 index) {
        require(_operators.length > index, "IDOFactory: operator index is invalid");
        _;
    }

    modifier inIDOs(uint256 index) {
        require(_ctrtIDOs.length > index, "IDOFactory: IDO index is invalid");
        _;
    }

    modifier onlyOperator() {
        require(isOperator(msg.sender), "IDOFactory: caller is not the operator");
        _;
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
        require(IERC20(saleToken).balanceOf(owner()) >= saleAmount, "IDOFactroy: balance of owner is not enough");
        IDO ido = new IDO(fundToken, fundAmount, saleToken, saleAmount);
        _ctrtIDOs.push(ido);
        return _ctrtIDOs.length - 1;
    }

    /**
     * @notice IDOFactory owner sets a fee recipient
     * @param feeRecipient: Address of fee recipient
     */
    function setFeeRecipient(address feeRecipient) external onlyOwner {
        require(feeRecipient != address(0), "IDOFactory: fee recipient must not be address(0)");
        _feeRecipient = feeRecipient;
    }

    /**
     * @notice IDOFactory owner sets a fee percent
     * @param feePercent: Fee percent
     */
    function setFeePercent(uint256 feePercent) external onlyOwner {
        require(feePercent > 0, "IDOFactory: fee percent must be bigger than zero");
        _feePercent = feePercent;
    }

    /**
     * @notice IDOFactory owner finalizes a IDO
     * @param index: Index of the IDO
     * @param finalizer: Address of finalizer
     */
    function finalizeIDO(uint256 index, address finalizer) external onlyOwner inIDOs(index) {
        require(_feePercent > 0, "IDOFactory: owner didn't set the fee percent");
        require(_feeRecipient != address(0), "IDOFactory: owner didn't set the fee recipient");
        _ctrtIDOs[index].finalize(owner(), finalizer, _feePercent, _feeRecipient);
    }

    /**
     * @notice IDOFactory owner calls emergencyRefund
     * @param index: Index of the IDO
     */
    function emergencyRefund(uint256 index) external onlyOwner inIDOs(index) {
        _ctrtIDOs[index].emergencyRefund();
    }

    /**
     * @notice IDOFactory owner inserts a operator
     * @param operator: Address of operator
     * @return index: Index of the inserted operator
     */
    function insertOperator(address operator) external onlyOwner returns (uint256) {
        require(!isOperator(operator), "IDOFactory: you have already inserted the operator");
        _operators.push(operator);
        return _operators.length - 1;
    }

    /**
     * @notice IDOFactory owner removes a operator
     * @param index: Index of the operator
     */
    function removeOperator(uint256 index) external onlyOwner inOperators(index) {
        for (uint256 i = index; i < _operators.length - 1; i++) {
            _operators[i] = _operators[i + 1];
        }
        _operators.pop();
    }

    /**
     * @notice Get IDO address
     * @param index: Index of the IDO to get
     * @return IDO: Address of the IDO to get
     */
    function getIDO(uint256 index) external view inIDOs(index) returns (IDO) {
        return _ctrtIDOs[index];
    }

    /**
     * @notice Get user's multiplier
     * @param funder: Address of funder
     * @return multiplier: Return the user's multiplier
     */
    function getMultiplier(address funder) public view returns (uint256) {
        return ITier(_tier).getMultiplier(_point, funder);
    }

    /**
     * @notice Check if user is an operator
     * @param addr: Address of user's account
     * @return isOperator: Return true if user is an operator, false otherwise
     */
    function isOperator(address addr) public view returns (bool) {
        for (uint256 i = 0; i < _operators.length; i++) {
            if (_operators[i] == addr) return true;
        }
        return false;
    }
}
