// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IPoint.sol";

/**
 * @title Tier
 * @notice Based on the token amount that users owned.
 */
contract Tier is Ownable {
    struct TierList {
        string tierName;
        uint256 minimumPoint;
        uint256 multiplier;
    }

    TierList[] _tiers;

    /**
     * @notice By default, 4 tiers are added.
     */
    constructor() {
        insertTier("Popular", 100, 1);
        insertTier("Star", 500, 5);
        insertTier("SuperStar", 1500, 15);
        insertTier("MegaStar", 2500, 25);
    }

    modifier onlyIndex(uint256 index) {
        require(_tiers.length > index, "Tier: Invalid index");
        _;
    }

    /**
     * @notice A new tier info is inserted.
     * @param tierName: Name of the tier to insert
     * @param minimumPoint: Minimum point of the tier to insert
     * @param multiplier: Multiplier of the tier to insert
     * @return index: Index of the inserted tier
     */
    function insertTier(
        string memory tierName,
        uint256 minimumPoint,
        uint256 multiplier
    ) public onlyOwner returns (uint256) {
        _tiers.push(TierList({ tierName: tierName, minimumPoint: minimumPoint, multiplier: multiplier }));
        return _tiers.length - 1;
    }

    /**
     * @notice A tier is removed.
     * @param index: Index of the tier to remove
     */
    function removeTier(uint256 index) external onlyOwner onlyIndex(index) {
        for (uint256 i = index; i < _tiers.length - 1; i++) {
            _tiers[i] = _tiers[i + 1];
        }
        _tiers.pop();
    }

    /**
     * @notice A tier is updated.
     * @param index: Index of the tier to update
     * @param tierName: Name of the tier to update
     * @param minimumPoint: Minimum point of the tier to update
     * @param multiplier: Multiplier of the tier to update
     */
    function updateTier(
        uint256 index,
        string memory tierName,
        uint256 minimumPoint,
        uint256 multiplier
    ) external onlyOwner onlyIndex(index) {
        TierList storage t = _tiers[index];
        t.tierName = tierName;
        t.minimumPoint = minimumPoint;
        t.multiplier = multiplier;
    }

    /**
     * @notice Get a tier
     * @param index: Index of tier to get
     * @return tierInfo: Return the tier info (name, minimum point, multiplier)
     */
    function getTier(uint256 index)
        external
        view
        onlyIndex(index)
        returns (
            string memory,
            uint256,
            uint256
        )
    {
        TierList storage t = _tiers[index];
        return (t.tierName, t.minimumPoint, t.multiplier);
    }

    /**
     * @notice Get multiplier of user
     * @param point: Address of point contract
     * @param user: Address of user's account
     * @return multiplier: Return multiplier of user
     */
    function getMultiplier(address point, address user) external view returns (uint256) {
        uint256 userPoint = IPoint(point).getPoint(user);
        int256 i = 0;
        uint256 multiplier = 0;
        for (i = (int256)(_tiers.length - 1); i >= 0; i--) {
            TierList storage t = _tiers[uint256(i)];
            if (t.minimumPoint <= userPoint) {
                multiplier = t.multiplier;
                break;
            }
        }
        return multiplier;
    }
}
