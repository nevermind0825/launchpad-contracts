// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

import "./IDOFactory.sol";

/**
 * @title IDO
 * @notice An Initial DEX Offering, or IDO for short,
 * is a new crowdfunding technique that enables cryptocurrency
 * projects to introduce their native token or coin
 * through decentralized exchanges (DEXs)
 */
contract IDO is Ownable {
    enum State {
        Waiting,
        Success,
        Failure
    }

    enum UserRole {
        Tier,
        WhitelistedUser,
        FSFC
    }

    uint256 public constant HUNDRED_PERCENT = 100;
    uint256 public constant FINALIZE_PERCENT = 51;

    struct IDOProperty {
        address fundToken;
        address saleToken;
        uint256 fundAmount;
        uint256 saleAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 claimTime;
        uint256 tge;
        uint256 cliffTime;
        uint256 duration;
        uint256 periodicity;
        uint256 baseAmount;
        uint256 maxAmountPerUser;
    }

    IDOProperty private _idoProperty;

    mapping(address => uint256) private _whitelistedAmounts;
    mapping(address => uint256) private _fundedAmounts;
    mapping(address => mapping(UserRole => uint256)) private _roleFundedAmounts;
    mapping(address => uint256) private _claimedAmounts;

    uint256 private _fundedAmount;
    uint256 private _tierFundTime;
    uint256 private _whitelistedFundTime;

    address private _factory;

    State private _state = State.Waiting;

    // events
    event Fund(UserRole userRole, address funder, uint256 amount);
    event Claim(address claimer, uint256 amount);
    event ReFund(address refunder, uint256 amount);
    event Finalize(State state);

    modifier onlyInTime(uint256 from, uint256 to) {
        require(block.timestamp >= from, "IDO: time is not yet");
        require(block.timestamp < to, "IDO: time has already passed");
        _;
    }

    modifier onlyBefore(uint256 beforeTime) {
        require(block.timestamp < beforeTime || beforeTime == 0, "IDO: time is out");
        _;
    }

    modifier onlyFunder() {
        require(_fundedAmounts[msg.sender] > 0, "IDO: there is no token for you");
        _;
    }

    modifier onlyOperator() {
        require(IDOFactory(_factory).isOperator(msg.sender) == true, "IDO: caller is not operator");
        _;
    }

    /**
     * @notice IDOFacotry owner creates IDO contract
     */
    constructor(IDOProperty memory idoProperty) {
        require(
            idoProperty.fundToken != address(0) && idoProperty.saleToken != address(0),
            "IDO: token address is invalid"
        );
        require(idoProperty.fundAmount > 0 && idoProperty.saleAmount > 0, "IDO: token amount is greater than zero");
        require(idoProperty.startTime > block.timestamp, "IDO: start time must be greater than now");
        require(idoProperty.startTime <= idoProperty.endTime, "IDO: end time must be greater than start time");
        require(idoProperty.endTime < idoProperty.claimTime, "IDO: claim time must be greater than end time");
        require(idoProperty.claimTime < idoProperty.cliffTime, "IDO: cliff time must be greater than claim time");
        require(idoProperty.tge <= HUNDRED_PERCENT, "IDO: tge must be smaller than 100");
        require(idoProperty.duration > 0, "IDO: duration must be greater than zero");
        require(idoProperty.duration % idoProperty.periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _idoProperty = idoProperty;
        _factory = owner();
        transferOwnership(IDOFactory(_factory).owner());
    }

    /**
     * @notice Operator sets the sale info
     */
    function setSaleInfo(
        address fundToken,
        uint256 fundAmount,
        address saleToken,
        uint256 saleAmount
    ) external onlyOperator onlyBefore(_idoProperty.startTime) {
        require(fundToken != address(0) && saleToken != address(0), "IDO: token address is invalid");
        require(fundAmount > 0 && saleAmount > 0, "IDO: token amount is greater than zero");
        _idoProperty.fundToken = fundToken;
        _idoProperty.fundAmount = fundAmount;
        _idoProperty.saleToken = saleToken;
        _idoProperty.saleAmount = saleAmount;
    }

    /**
     * @notice Operator sets the time to start
     * @param startTime: timestamp that the sale will start
     */
    function setStartTime(uint256 startTime) external onlyOperator onlyBefore(_idoProperty.startTime) {
        require(startTime > block.timestamp, "IDO: start time must be greater than now");
        _idoProperty.startTime = startTime;
        setFundRoundTimes();
    }

    /**
     * @notice Operator sets the time to end
     * @param endTime: timestamp that the sale will end
     */
    function setEndTime(uint256 endTime) external onlyOperator onlyBefore(_idoProperty.endTime) {
        require(_idoProperty.startTime <= endTime, "IDO: end time must be greater than start time");
        _idoProperty.endTime = endTime;
        setFundRoundTimes();
    }

    /**
     * @notice Get end time that users can fund.
     * @return _endTime timestamp of the end time.
     */
    function getEndTime() external view returns (uint256) {
        return _idoProperty.endTime;
    }

    /**
     * @notice Get time that tiers can fund.
     * @return _tierFundTime timestamp that tiers can fund.
     */
    function getTierFundTime() external view returns (uint256) {
        return _tierFundTime;
    }

    /**
     * @notice Get time that whitelisted users can fund.
     * @return _whitelistedFundTime timestamp that whitelisted users can fund.
     */
    function getWhitelistedFundTime() external view returns (uint256) {
        return _whitelistedFundTime;
    }

    /**
     * @notice Operator sets the time to claim
     * @param claimTime: timestamp that users can start claiming the saleToken
     */
    function setClaimTime(uint256 claimTime) external onlyOperator onlyBefore(_idoProperty.claimTime) {
        require(_idoProperty.endTime < claimTime, "IDO: claim time must be greater than end time");
        _idoProperty.claimTime = claimTime;
    }

    /**
     * @notice Operator sets factors for vesting saleToken
     * @param tge: percent to claim till cliffTime
     * @param cliffTime: timestamp to claim with tge
     * @param duration: after cliffTime, How long funders can claim
     * @param periodicity: after cliffTime, How often funders claim
     */
    function setVestInfo(
        uint256 tge,
        uint256 cliffTime,
        uint256 duration,
        uint256 periodicity
    ) external onlyOperator onlyBefore(_idoProperty.cliffTime) {
        require(_idoProperty.claimTime < cliffTime, "IDO: cliff time must be greater than claim time");
        require(tge <= HUNDRED_PERCENT, "IDO: tge must be smaller than 100");
        require(duration > 0, "IDO: duration must be greater than zero");
        require(duration % periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _idoProperty.tge = tge;
        _idoProperty.cliffTime = cliffTime;
        _idoProperty.duration = duration;
        _idoProperty.periodicity = periodicity;
    }

    /**
     * @notice Operator sets the base amount
     * @param baseAmount: tiers can fund up to “baseAmount * multiplier” during Tier Fund Round
     */
    function setBaseAmount(uint256 baseAmount) external onlyOperator onlyBefore(_idoProperty.startTime) {
        _idoProperty.baseAmount = baseAmount;
    }

    /**
     * @notice Operator sets the max amount per user
     * @param maxAmountPerUser: investors can fund up to this value during FCFS round
     */
    function setMaxAmountPerUser(uint256 maxAmountPerUser) external onlyOperator onlyBefore(_idoProperty.startTime) {
        _idoProperty.maxAmountPerUser = maxAmountPerUser;
    }

    /**
     * @notice Operator sets the info of sale
     * @param fundAmount: Amount of fund token
     * @param saleAmount: Amount of sale token
     */
    function setSaleInfo(uint256 fundAmount, uint256 saleAmount)
        external
        onlyOperator
        onlyBefore(_idoProperty.startTime)
    {
        require(fundAmount > 0 && saleAmount > 0, "IDO: token amount must be greater than zero.");
        _idoProperty.fundAmount = fundAmount;
        _idoProperty.saleAmount = saleAmount;
    }

    /**
     * @notice Operator sets the whitelisted user
     * @param funder: Address of funder
     * @param amount: Amount of the fund token
     */
    function setWhitelistAmount(address funder, uint256 amount)
        external
        onlyOperator
        onlyBefore(_idoProperty.startTime)
    {
        _whitelistedAmounts[funder] = amount;
    }

    /**
     * @notice Operator sets whitelisted users
     * @param funders: Array of the funder address
     * @param amounts: Array of the fund token amount
     */
    function setWhitelistAmounts(address[] memory funders, uint256[] memory amounts)
        external
        onlyOperator
        onlyBefore(_idoProperty.startTime)
    {
        require(funders.length == amounts.length, "IDO: invalid whitelisted users' info");
        for (uint256 i = 0; i < funders.length; i++) {
            _whitelistedAmounts[funders[i]] = amounts[i];
        }
    }

    /**
     * @notice IDOFactory owner finalizes the IDO
     * @param projectOwner: Address of the IDOFactory owner
     * @param finalizer: Address of user account sending the fund token
     * @param feePercent: "feePercent" of "totalFunded" will be sent to "feeRecipient" address
     * @param feeRecipient: "feePercent" of "totalFunded" will be sent to "feeRecipient" address
     */
    function finalize(
        address projectOwner,
        address finalizer,
        address feeRecipient,
        uint256 feePercent
    ) external onlyOwner {
        require(feePercent <= HUNDRED_PERCENT, "IDO: fee percent must be smaller than 100");
        require(_state == State.Waiting, "IDO: IDO has already ended");
        require(block.timestamp > _idoProperty.endTime, "IDO: IDO is not ended yet");
        if (_fundedAmount * HUNDRED_PERCENT < _idoProperty.fundAmount * FINALIZE_PERCENT) {
            _state = State.Failure;
        } else {
            _state = State.Success;
            uint256 feeAmout = (feePercent * _fundedAmount) / HUNDRED_PERCENT;
            IERC20(_idoProperty.fundToken).transfer(feeRecipient, feeAmout);
            IERC20(_idoProperty.fundToken).transfer(finalizer, _fundedAmount - feeAmout);
            IERC20(_idoProperty.saleToken).transferFrom(
                projectOwner,
                address(this),
                (_fundedAmount * _idoProperty.saleAmount) / _idoProperty.fundAmount
            );
        }

        emit Finalize(_state);
    }

    /**
     * @notice Get a sate of IDO
     * @return _state: Return the IDO state
     */
    function getState() external view returns (State) {
        return _state;
    }

    /**
     * @notice Users fund
     * @param amount: Fund token amount
     */
    function fund(uint256 amount) external onlyInTime(_idoProperty.startTime, _idoProperty.endTime) {
        require(_fundedAmount + amount <= _idoProperty.fundAmount, "IDO: fund amount is greater than the rest");
        require(_state == State.Waiting, "IDO: funder can't fund");
        address funder = msg.sender;
        uint256 multiplier = IDOFactory(_factory).getMultiplier(funder);
        (uint256 maxFundAmount, UserRole userRole) = block.timestamp < _tierFundTime
            ? (multiplier * _idoProperty.baseAmount, UserRole.Tier)
            : (block.timestamp < _whitelistedFundTime)
            ? (_whitelistedAmounts[funder], UserRole.WhitelistedUser)
            : (_idoProperty.maxAmountPerUser, UserRole.FSFC);
        require(maxFundAmount >= amount + _roleFundedAmounts[funder][userRole], "IDO: fund amount is too much");
        _fundedAmount += amount;
        _fundedAmounts[funder] += amount;
        _roleFundedAmounts[funder][userRole] += amount;

        IERC20(_idoProperty.fundToken).transferFrom(funder, address(this), amount);

        emit Fund(userRole, funder, amount);
    }

    /**
     * @notice Users claim
     */
    function claim() external onlyFunder {
        require(block.timestamp > _idoProperty.claimTime, "IDO: claim time is not yet");
        require(_state == State.Success, "IDO: state is not success");
        address claimer = msg.sender;
        uint256 maxSaleAmount = (_fundedAmounts[claimer] * _idoProperty.saleAmount) / _idoProperty.fundAmount;
        uint256 cnt = _idoProperty.duration / _idoProperty.periodicity;
        uint256 pass = block.timestamp < _idoProperty.cliffTime
            ? 0
            : block.timestamp > _idoProperty.cliffTime + _idoProperty.duration
            ? _idoProperty.duration
            : block.timestamp - _idoProperty.cliffTime;
        pass = pass / _idoProperty.periodicity;
        uint256 afterCliffPercent = ((HUNDRED_PERCENT - _idoProperty.tge) / cnt) * pass;
        uint256 totalPercent = _idoProperty.tge + afterCliffPercent;
        uint256 amount = (maxSaleAmount * totalPercent) / HUNDRED_PERCENT - _claimedAmounts[claimer];
        require(amount > 0, "IDO: there is no token for you to claim this time.");
        _claimedAmounts[claimer] += amount;
        IERC20(_idoProperty.saleToken).transfer(claimer, amount);

        emit Claim(claimer, amount);
    }

    /**
     * @notice Users refund the funded token
     */
    function refund() external onlyFunder {
        require(_state == State.Failure, "IDO: state is not failure");
        address refunder = msg.sender;
        uint256 amount = _fundedAmounts[refunder];
        _fundedAmounts[refunder] = 0;
        IERC20(_idoProperty.fundToken).transfer(refunder, amount);

        emit ReFund(refunder, amount);
    }

    /**
     * @notice IDOFactory owner calls to cancel the IDO
     */
    function emergencyRefund() external onlyOwner onlyBefore(_idoProperty.endTime) {
        _state = State.Failure;
    }

    /**
     * @dev Set round times that user can fund.
     * These times should be updated when start and end time is updated.
     */
    function setFundRoundTimes() internal {
        if (_idoProperty.endTime > _idoProperty.startTime) {
            uint256 fundDuration = (_idoProperty.endTime - _idoProperty.startTime) / 3;
            _tierFundTime = fundDuration + _idoProperty.startTime;
            _whitelistedFundTime = fundDuration * 2 + _idoProperty.startTime;
        }
    }
}
