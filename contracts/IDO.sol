// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "hardhat/console.sol";

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

    uint256 private _tierFundTime;
    uint256 private _whitelistedFundTime;

    // IDO variables
    address private _fundToken;
    uint256 private _fundAmount;
    uint256 private _fundedAmount;
    address private _saleToken;
    uint256 private _saleAmount;
    uint256 private _startTime;
    uint256 private _endTime;
    uint256 private _claimTime;
    uint256 private _tge;
    uint256 private _cliffTime;
    uint256 private _duration;
    uint256 private _periodicity;
    uint256 private _baseAmount;
    uint256 private _maxAmountPerUser;
    uint256 private _perAmount;
    mapping(address => uint256) private _whitelistedAmounts;
    mapping(address => uint256) private _fundedAmounts;
    mapping(address => uint256) private _claimedAmounts;

    State private _state = State.Waiting;

    /**
     * @notice IDOFacotry owner creates IDO contract
     * @param fundToken: Address of fund token
     * @param fundAmount: Amount of fund token
     * @param saleToken: Address of sale token
     * @param saleAmount: Amount of sale token
     */
    constructor(
        address fundToken,
        uint256 fundAmount,
        address saleToken,
        uint256 saleAmount
    ) {
        require(fundAmount > 0 && saleAmount > 0, "IDO: amount must be greater than zero");
        _fundToken = fundToken;
        _fundAmount = fundAmount;
        _saleToken = saleToken;
        _saleAmount = saleAmount;
        _perAmount = _saleAmount / _fundAmount;
    }

    modifier onlyInTime(uint256 from, uint256 to) {
        require(block.timestamp >= from, "IDO: time is not yet");
        require(block.timestamp < to, "IDO: time has already passed");
        _;
    }

    modifier onlyBefore(uint256 beforeTime) {
        require(block.timestamp < beforeTime || beforeTime == 0, "IDO: time is out");
        _;
    }

    modifier onlyFundAmount(uint256 amount) {
        require(_fundedAmount + amount <= _fundAmount, "IDO: fund amount is greater than the rest");
        _;
    }

    modifier onlyFunder(address funder) {
        require(_fundedAmounts[funder] > 0, "IDO: user didn't fund");
        _;
    }

    modifier onlyOperator() {
        require(IDOFactory(owner()).isOperator(msg.sender), "IDO: caller is not operator");
        _;
    }

    /**
     * @notice Operator sets the time to start
     * @param startTime: timestamp that the sale will start
     */
    function setStartTime(uint256 startTime) external onlyOperator onlyBefore(_startTime) {
        require(startTime > block.timestamp, "IDO: start time is greater than now");
        _startTime = startTime;
    }

    /**
     * @notice Operator sets the time to end
     * @param endTime: timestamp that the sale will end
     */
    function setEndTime(uint256 endTime) external onlyOperator onlyBefore(_endTime) {
        require(_startTime <= endTime, "IDO: end time must be greater than start time");
        _endTime = endTime;
        _tierFundTime = (_endTime - _startTime) / 3 + _startTime;
        _whitelistedFundTime = (_endTime - _startTime) * 2 / 3 + _startTime;
    }

    /**
     * @notice Get end time that users can fund.
     * @return _endTime timestamp of the end time.
     */
    function getEndTime() external view returns(uint) {
        return _endTime;
    }

    /**
     * @notice Get time that tiers can fund.
     * @return _tierFundTime timestamp that tiers can fund.
     */
    function getTierFundTime() external view returns(uint) {
        return _tierFundTime;
    }

    /**
     * @notice Get time that whitelisted users can fund.
     * @return _whitelistedFundTime timestamp that whitelisted users can fund.
     */
    function getWhitelistedFundTime() external view returns(uint) {
        return _whitelistedFundTime;
    }

    /**
     * @notice Operator sets the time to claim
     * @param claimTime: timestamp that users can start claiming the saleToken
     */
    function setClaimTime(uint256 claimTime) external onlyOperator onlyBefore(_claimTime) {
        require(_endTime < claimTime, "IDO: claim time must be greater than end time");
        _claimTime = claimTime;
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
    ) external onlyOperator onlyBefore(_cliffTime) {
        require(_claimTime < cliffTime, "IDO: cliff time must be greater than claim time");
        require(tge < 100, "IDO: tge must be smaller than 100");
        require(duration % periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _tge = tge;
        _cliffTime = cliffTime;
        _duration = duration;
        _periodicity = periodicity;
    }

    /**
     * @notice Operator sets the base amount
     * @param baseAmount: tiers can fund up to “baseAmount * multiplier” during Tier Fund Round
     */
    function setBaseAmount(uint256 baseAmount) external onlyOperator onlyBefore(_startTime) {
        _baseAmount = baseAmount;
    }

    /**
     * @notice Operator sets the max amount per user
     * @param maxAmountPerUser: investors can fund up to this value during FCFS round
     */
    function setMaxAmountPerUser(uint256 maxAmountPerUser) external onlyOperator onlyBefore(_startTime) {
        _maxAmountPerUser = maxAmountPerUser;
    }

    /**
     * @notice Operator sets the info of sale
     * @param fundAmount: Amount of fund token
     * @param saleAmount: Amount of sale token
     */
    function setSaleInfo(uint256 fundAmount, uint256 saleAmount) external onlyOperator onlyBefore(_startTime) {
        _fundAmount = fundAmount;
        _saleAmount = saleAmount;
    }

    /**
     * @notice Operator sets the whitelisted user
     * @param funder: Address of funder
     * @param amount: Amount of the fund token
     */
    function setWhitelistAmount(address funder, uint256 amount) external onlyOperator onlyBefore(_startTime) {
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
        onlyBefore(_startTime)
    {
        for (uint256 i = 0; i < funders.length; i++) {
            _whitelistedAmounts[funders[i]] = amounts[i];
        }
    }

    /**
     * @notice IDOFacotory owner finalizes the IDO
     * @param idoFactoryOwner: Address of the IDOFactory owner
     * @param finalizer: Address of user account sending the fund token
     * @param feePercent: "feePercent" of "totalFunded" will be sent to "feeRecipient" address
     * @param feeRecipient: "feePercent" of "totalFunded" will be sent to "feeRecipient" address
     */
    function finalize(
        address idoFactoryOwner,
        address finalizer,
        uint256 feePercent,
        address feeRecipient
    ) external onlyOwner {
        require(block.timestamp > _endTime, "IDO: IDO is not ended yet");
        require(_state == State.Waiting, "IDO: IDO has already ended");
        if (_fundedAmount < (_fundAmount * 51) / 100) {
            _state = State.Failure;
        } else {
            uint256 feeAmout = (feePercent * _fundedAmount) / 100;
            _state = State.Success;
            // console.log("fee recipient:", feeRecipient, feeAmout);
            IERC20(_fundToken).transfer(feeRecipient, feeAmout);
            // console.log("finalizer:", finalizer, _fundedAmount - feeAmout);
            IERC20(_fundToken).transfer(finalizer, _fundedAmount - feeAmout);
            IERC20(_saleToken).transferFrom(
                idoFactoryOwner,
                address(this),
                (_fundedAmount * _saleAmount) / _fundAmount
            );
        }
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
     * @param funder: Funder address
     * @param amount: Fund token amount
     */
    function fund(address funder, uint256 amount) external onlyInTime(_startTime, _endTime) onlyFundAmount(amount) {
        require(_state == State.Waiting, "IDO: funder can't fund");
        uint256 maxFundAmount = 0;
        // console.log(block.timestamp);

        if (block.timestamp < _tierFundTime) {
            uint256 multiplier = IDOFactory(owner()).getMultiplier(funder);
            maxFundAmount = multiplier * _baseAmount;
            // console.log("tier:", maxFundAmount, amount);
        } else if (block.timestamp < _whitelistedFundTime ) {
            maxFundAmount = _whitelistedAmounts[funder];
            // console.log("whitelisted user:", maxFundAmount, amount);
        } else {
            maxFundAmount = _maxAmountPerUser;
            // console.log("any user:", maxFundAmount, amount);
        }
        require(maxFundAmount >= amount, "IDO: fund amount is too much");
        _fundedAmount += amount;
        _fundedAmounts[funder] += amount;

        IERC20(_fundToken).transferFrom(funder, address(this), amount);
    }

    /**
     * @notice Users claim
     * @param claimer: Claimer address
     * @param amount: Claim token amount
     */
    function claim(address claimer, uint256 amount) external onlyFunder(claimer) {
        require(block.timestamp > _claimTime, "IDO: claim time is not yet");
        require(_state == State.Success, "IDO: state is not success");
        uint256 cnt = _duration / _periodicity;
        uint256 passTime = block.timestamp < _cliffTime ? 0 : block.timestamp - _cliffTime + _periodicity;
        uint256 maxAmount = (_fundedAmounts[claimer] *
            _perAmount *
            (_tge + (((100 - _tge)) / cnt) * (passTime / _periodicity))) / 100;
        // console.log(maxAmount, amount);
        require(maxAmount >= amount + _claimedAmounts[claimer], "IDO: claim amount is greater than the rest");
        _claimedAmounts[claimer] += amount;
        IERC20(_saleToken).transfer(claimer, amount);
    }

    /**
     * @notice Users refund the funded token
     * @param refunder: Refunder address
     */
    function refund(address refunder) external onlyFunder(refunder) {
        require(_state == State.Failure, "IDO: state is not failure");
        uint256 amount = _fundedAmounts[refunder];
        _fundedAmounts[refunder] = 0;
        IERC20(_fundToken).transfer(refunder, amount);
    }

    /**
     * @notice IDOFactory owner calls to cancel the IDO
     */
    function emergencyRefund() external onlyOwner onlyBefore(_endTime) {
        _state = State.Failure;
    }
}
