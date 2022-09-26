import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initTier } from "./utils/IDO.behavior";
import { Tier, Point } from "../typechain"

describe("Tier test", () => {
  let tier: Tier;
  let point: Point;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, user0, user1] = await ethers.getSigners();
    [tier, point] = await initTier(user0, user1);
  });

  describe("Insert Tier", () => {
    it("Caller must be owner", async () => {
      await expect(tier.connect(user0).insertTier("Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Tier name is essential", async () => {
      await expect(tier.insertTier("", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
    });

    it("Minimum point must be greater than zero", async () => {
      await expect(tier.insertTier("Test", 0, 2)).to.be.revertedWith("Tier: minimum point must be greater than zero");
    });

    it("Multiplier must be greater than zero", async () => {
      await expect(tier.insertTier("Test", 200, 0)).to.be.revertedWith("Tier: multiplier must be greater than zero");
    });

    it("Tier name can not be duplicated", async () => {
      await expect(tier.insertTier("Star", 200, 2)).to.be.revertedWith("Tier: tier name has already inserted");
    });

    it("Check inserted tier", async () => {
      const tierInfo = await tier.getTier(1);
      expect(tierInfo[0]).to.equal("Star");
      expect(tierInfo[1]).to.equal(500);
      expect(tierInfo[2]).to.equal(5);
    });
  });

  describe("Update Tier", () => {
    it("Caller must be owner", async () => {
      await expect(tier.connect(user0).updateTier(1, "Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check tier index", async () => {
      await expect(tier.updateTier(5, "Test", 200, 2)).to.be.revertedWith("Tier: invalid index");
    });

    it("Check tier info to update", async () => {
      await expect(tier.updateTier(2, "", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
      await expect(tier.updateTier(2, "Test", 0, 2)).to.be.revertedWith(
        "Tier: minimum point must be greater than zero",
      );
      await expect(tier.updateTier(2, "Test", 200, 0)).to.be.revertedWith("Tier: multiplier must be greater than zero");
      await expect(tier.updateTier(2, "Star", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
    });

    it("Check updated tier info", async () => {
      await tier.updateTier(2, "Test", 200, 2);
      const updatedTierInfo = await tier.getTier(2);
      expect(updatedTierInfo[0]).to.equal("Test");
      expect(updatedTierInfo[1]).to.equal(200);
      expect(updatedTierInfo[2]).to.equal(2);
    });
  });

  describe("Remove Tier", () => {
    it("Caller must be owner", async () => {
      await expect(tier.connect(user0).removeTier(2)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check tier index", async () => {
      await expect(tier.removeTier(5)).to.be.revertedWith("Tier: invalid index");
    });

    it("Check remove tier", async () => {
      await tier.removeTier(2);
      await tier.removeTier(2);
      await expect(tier.getTier(3)).to.be.revertedWith("Tier: invalid index");
    });
  });

  describe("Get Multiplier", async () => {
    it("Check invalid point address(address(0))", async () => {
      await expect(tier.getMultiplier(ethers.constants.AddressZero, user0.address)).to.be.revertedWith(
        "Tier: point address is invalid",
      );
    });

    it("Check invalid user address(address(0))", async () => {
      await expect(tier.getMultiplier(point.address, ethers.constants.AddressZero)).to.be.revertedWith(
        "Tier: user account is invalid",
      );
    });

    it("Check user's multiplier", async () => {
      let multiplierInfo = await tier.getMultiplier(point.address, user0.address);
      /* user0 point = 2350 (= 200 * 8 + 50 * 15), Star: 1500, 15 */
      expect(multiplierInfo[0]).to.equal(2);
      expect(multiplierInfo[1]).to.equal(15);

      multiplierInfo = await tier.getMultiplier(point.address, user1.address);
      // user1 point = 1250 (= 100 * 8 + 30 * 15), Star: 500, 5
      expect(multiplierInfo[0]).to.equal(1);
      expect(multiplierInfo[1]).to.equal(5);
    })
  });
});
