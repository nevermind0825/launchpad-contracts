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

    enum UserRole {
        Tier,
        WhitelistedUser,
        FSFC
    }

    uint256 public constant HUNDRED_PERCENT = 100;
    uint256 public constant FINALIZE_PERCENT = 51;

    struct IDOMeta {
        string title;
        string website;
        string logo;
        string description;
        string fundSymbol;
        string saleSymbol;
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

    IDOMeta public _metaInfo;

    mapping(address => uint256) public _whitelistedAmounts;
    mapping(address => uint256) public _fundedAmounts;
    mapping(address => mapping(UserRole => uint256)) public _roleFundedAmounts;
    mapping(address => uint256) public _claimedAmounts;

    uint256 public _fundedAmount;
    uint256 public _tierFundTime;
    uint256 public _whitelistedFundTime;

    address private _factory;

    State public _state = State.Waiting;

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
        require(IDOFactory(_factory).operators(msg.sender) == true, "IDO: caller is not operator");
        _;
    }

    /**
     * @notice IDOFacotry owner creates IDO contract
     */
    constructor(IDOMeta memory idoMeta) {
        require(
            idoMeta.fundToken != address(0) && idoMeta.saleToken != address(0),
            "IDO: token address is invalid"
        );
        require(idoMeta.fundAmount > 0 && idoMeta.saleAmount > 0, "IDO: token amount is zero");
        require(idoMeta.startTime > block.timestamp, "IDO: start time must be greater than now");
        require(idoMeta.startTime <= idoMeta.endTime, "IDO: end time must be greater than start time");
        require(idoMeta.endTime < idoMeta.claimTime, "IDO: claim time must be greater than end time");
        require(idoMeta.claimTime < idoMeta.cliffTime, "IDO: cliff time must be greater than claim time");
        require(idoMeta.tge <= HUNDRED_PERCENT, "IDO: tge must be smaller than 100");
        require(idoMeta.duration > 0, "IDO: duration must be greater than zero");
        require(idoMeta.duration % idoMeta.periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _metaInfo = idoMeta;
        setFundRoundTimes();
        _factory = owner();
        transferOwnership(IDOFactory(_factory).owner());
    }

    /**
     * @notice Set the propety of IDO
     */
    function setIDOMeta(IDOMeta memory idoMeta) external onlyOperator onlyBefore(_metaInfo.startTime) {
        require(
            idoMeta.fundToken != address(0) && idoMeta.saleToken != address(0),
            "IDO: token address is invalid"
        );
        require(idoMeta.fundAmount > 0 && idoMeta.saleAmount > 0, "IDO: token amount is zero");
        require(idoMeta.startTime > block.timestamp, "IDO: start time must be greater than now");
        require(idoMeta.startTime <= idoMeta.endTime, "IDO: end time must be greater than start time");
        require(idoMeta.endTime < idoMeta.claimTime, "IDO: claim time must be greater than end time");
        require(idoMeta.claimTime < idoMeta.cliffTime, "IDO: cliff time must be greater than claim time");
        require(idoMeta.tge <= HUNDRED_PERCENT, "IDO: tge must be smaller than 100");
        require(idoMeta.duration > 0, "IDO: duration must be greater than zero");
        require(idoMeta.duration % idoMeta.periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _metaInfo = idoMeta;
        setFundRoundTimes();
    }

    /**
     * @notice Operator sets the sale info
     */
    function setSaleInfo(
        address fundToken,
        uint256 fundAmount,
        address saleToken,
        uint256 saleAmount
    ) external onlyOperator onlyBefore(_metaInfo.startTime) {
        require(fundToken != address(0) && saleToken != address(0), "IDO: token address is invalid");
        require(fundAmount > 0 && saleAmount > 0, "IDO: token amount is zero");
        _metaInfo.fundToken = fundToken;
        _metaInfo.fundAmount = fundAmount;
        _metaInfo.saleToken = saleToken;
        _metaInfo.saleAmount = saleAmount;
    }

    /**
     * @notice Operator sets the time to start
     * @param startTime: timestamp that the sale will start
     */
    function setStartTime(uint256 startTime) external onlyOperator onlyBefore(_metaInfo.startTime) {
        require(startTime > block.timestamp, "IDO: start time must be greater than now");
        _metaInfo.startTime = startTime;
        setFundRoundTimes();
    }

    /**
     * @notice Operator sets the time to end
     * @param endTime: timestamp that the sale will end
     */
    function setEndTime(uint256 endTime) external onlyOperator onlyBefore(_metaInfo.endTime) {
        require(_metaInfo.startTime <= endTime, "IDO: end time must be greater than start time");
        _metaInfo.endTime = endTime;
        setFundRoundTimes();
    }


    /**
     * @notice Operator sets the time to claim
     * @param claimTime: timestamp that users can start claiming the saleToken
     */
    function setClaimTime(uint256 claimTime) external onlyOperator onlyBefore(_metaInfo.claimTime) {
        require(_metaInfo.endTime < claimTime, "IDO: claim time must be greater than end time");
        _metaInfo.claimTime = claimTime;
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
    ) external onlyOperator onlyBefore(_metaInfo.cliffTime) {
        require(_metaInfo.claimTime < cliffTime, "IDO: cliff time must be greater than claim time");
        require(tge <= HUNDRED_PERCENT, "IDO: tge must be smaller than 100");
        require(duration > 0, "IDO: duration must be greater than zero");
        require(duration % periodicity == 0, "IDO: duration must be a multiple of periodicity");
        _metaInfo.tge = tge;
        _metaInfo.cliffTime = cliffTime;
        _metaInfo.duration = duration;
        _metaInfo.periodicity = periodicity;
    }

    /**
     * @notice Operator sets the base amount
     * @param baseAmount: tiers can fund up to “baseAmount * multiplier” during Tier Fund Round
     */
    function setBaseAmount(uint256 baseAmount) external onlyOperator onlyBefore(_metaInfo.startTime) {
        _metaInfo.baseAmount = baseAmount;
    }

    /**
     * @notice Operator sets the max amount per user
     * @param maxAmountPerUser: investors can fund up to this value during FCFS round
     */
    function setMaxAmountPerUser(uint256 maxAmountPerUser) external onlyOperator onlyBefore(_metaInfo.startTime) {
        _metaInfo.maxAmountPerUser = maxAmountPerUser;
    }

    /**
     * @notice Operator sets the whitelisted user
     * @param funder: Address of funder
     * @param amount: Amount of the fund token
     */
    function setWhitelistAmount(address funder, uint256 amount)
        external
        onlyOperator
        onlyBefore(_metaInfo.startTime)
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
        onlyBefore(_metaInfo.startTime)
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
        require(block.timestamp > _metaInfo.endTime, "IDO: IDO is not ended yet");
        if (_fundedAmount * HUNDRED_PERCENT < _metaInfo.fundAmount * FINALIZE_PERCENT) {
            _state = State.Failure;
        } else {
            _state = State.Success;
            uint256 feeAmout = (feePercent * _fundedAmount) / HUNDRED_PERCENT;
            IERC20(_metaInfo.fundToken).transfer(feeRecipient, feeAmout);
            IERC20(_metaInfo.fundToken).transfer(finalizer, _fundedAmount - feeAmout);
            IERC20(_metaInfo.saleToken).transferFrom(
                projectOwner,
                address(this),
                (_fundedAmount * _metaInfo.saleAmount) / _metaInfo.fundAmount
            );
        }

        emit Finalize(_state);
    }

    /**
     * @notice Users fund
     * @param amount: Fund token amount
     */
    function fund(uint256 amount) external onlyInTime(_metaInfo.startTime, _metaInfo.endTime) {
        require(_fundedAmount + amount <= _metaInfo.fundAmount, "IDO: fund amount is greater than the rest");
        require(_state == State.Waiting, "IDO: funder can't fund");
        address funder = msg.sender;
        uint256 multiplier = IDOFactory(_factory).getMultiplier(funder);
        (uint256 maxFundAmount, UserRole userRole) = block.timestamp < _tierFundTime
            ? (multiplier * _metaInfo.baseAmount, UserRole.Tier)
            : (block.timestamp < _whitelistedFundTime)
            ? (_whitelistedAmounts[funder], UserRole.WhitelistedUser)
            : (_metaInfo.maxAmountPerUser, UserRole.FSFC);
        require(maxFundAmount >= amount + _roleFundedAmounts[funder][userRole], "IDO: fund amount is too much");
        _fundedAmount += amount;
        _fundedAmounts[funder] += amount;
        _roleFundedAmounts[funder][userRole] += amount;

        IERC20(_metaInfo.fundToken).transferFrom(funder, address(this), amount);

        emit Fund(userRole, funder, amount);
    }

    /**
     * @notice Users claim
     */
    function claim() external onlyFunder {
        require(block.timestamp > _metaInfo.claimTime, "IDO: claim time is not yet");
        require(_state == State.Success, "IDO: state is not success");
        address claimer = msg.sender;
        uint256 maxSaleAmount = (_fundedAmounts[claimer] * _metaInfo.saleAmount) / _metaInfo.fundAmount;
        uint256 cnt = _metaInfo.duration / _metaInfo.periodicity;
        uint256 pass = block.timestamp < _metaInfo.cliffTime
            ? 0
            : block.timestamp > _metaInfo.cliffTime + _metaInfo.duration
            ? _metaInfo.duration
            : block.timestamp - _metaInfo.cliffTime;
        pass = pass / _metaInfo.periodicity;
        uint256 afterCliffPercent = ((HUNDRED_PERCENT - _metaInfo.tge) / cnt) * pass;
        uint256 totalPercent = _metaInfo.tge + afterCliffPercent;
        uint256 amount = (maxSaleAmount * totalPercent) / HUNDRED_PERCENT - _claimedAmounts[claimer];
        require(amount > 0, "IDO: there is no token for you to claim this time.");
        _claimedAmounts[claimer] += amount;
        IERC20(_metaInfo.saleToken).transfer(claimer, amount);

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
        IERC20(_metaInfo.fundToken).transfer(refunder, amount);

        emit ReFund(refunder, amount);
    }

    /**
     * @notice IDOFactory owner calls to cancel the IDO
     */
    function emergencyRefund() external onlyOwner onlyBefore(_metaInfo.endTime) {
        _state = State.Failure;
    }

    /**
     * @dev Set round times that user can fund.
     * These times should be updated when start and end time is updated.
     */
    function setFundRoundTimes() internal {
        if (_metaInfo.endTime > _metaInfo.startTime) {
            uint256 fundDuration = (_metaInfo.endTime - _metaInfo.startTime) / 3;
            _tierFundTime = fundDuration + _metaInfo.startTime;
            _whitelistedFundTime = fundDuration * 2 + _metaInfo.startTime;
        }
    }
}
