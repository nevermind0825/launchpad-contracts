// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

import "./IDO.sol";
import "./interfaces/ITier.sol";

/**
 * @title IDOFactory
 * @notice IDOFactoy creates IDOs.
 */
contract IDOFactory is Ownable {
    address[] public _ctrtIDOs;

    address public _tier;
    address public _point;

    mapping(address => bool) public operators;

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

    function setPointAddress(address point) external onlyOwner {
        _point = point;
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
    function createIDO(IDO.IDOMeta memory idoMeta) external onlyOperator {
        _ctrtIDOs.push(address(new IDO(idoMeta)));
        uint256 index = _ctrtIDOs.length - 1;
        emit CreateIDO(_ctrtIDOs[index], index);
    }

    /**
     * @notice Get IDO addresses
     * @return IDOs: Addresses of the IDOs
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
}
