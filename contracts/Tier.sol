// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IPoint.sol";

contract Tier is Ownable {
    struct TierList {
        string tierName;
        uint256 minimumPoint;
        uint256 multiplier;
    }

    TierList[] _tiers;

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

    function insertTier(
        string memory tierName,
        uint256 minimumPoint,
        uint256 multiplier
    ) public onlyOwner returns (uint256) {
        _tiers.push(TierList({ tierName: tierName, minimumPoint: minimumPoint, multiplier: multiplier }));
        return _tiers.length - 1;
    }

    function removeTier(uint256 index) external onlyOwner onlyIndex(index) {
        for (uint256 i = index; i < _tiers.length - 1; i++) {
            _tiers[i] = _tiers[i + 1];
        }
        _tiers.pop();
    }

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
