import { Contract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initTier } from "./utils/IDO.behavior";

describe("Tier test", () => {
  let Tier: Contract;
  let Point: Contract;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, user0, user1] = await ethers.getSigners();
    [Tier, Point] = await initTier(user0, user1);
  });

  describe("Insert Tier", () => {
    it("Caller must be owner", async () => {
      await expect(Tier.connect(user0).insertTier("Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Tier name is essential", async () => {
      await expect(Tier.insertTier("", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
    });

    it("Minimum point must be greater than zero", async () => {
      await expect(Tier.insertTier("Test", 0, 2)).to.be.revertedWith("Tier: minimum point must be greater than zero");
    });

    it("Multiplier must be greater than zero", async () => {
      await expect(Tier.insertTier("Test", 200, 0)).to.be.revertedWith("Tier: multiplier must be greater than zero");
    });

    it("Tier name can not be duplicated", async () => {
      await expect(Tier.insertTier("Star", 200, 2)).to.be.revertedWith("Tier: tier name has already inserted");
    });

    it("Check inserted tier", async () => {
      const tierInfo = await Tier.getTier(1);
      expect(tierInfo[0]).to.equal("Star");
      expect(tierInfo[1]).to.equal(500);
      expect(tierInfo[2]).to.equal(5);
    });
  });

  describe("Update Tier", () => {
    it("Caller must be owner", async () => {
      await expect(Tier.connect(user0).updateTier(1, "Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check tier index", async () => {
      await expect(Tier.updateTier(5, "Test", 200, 2)).to.be.revertedWith("Tier: invalid index");
    });

    it("Check tier info to update", async () => {
      await expect(Tier.updateTier(2, "", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
      await expect(Tier.updateTier(2, "Test", 0, 2)).to.be.revertedWith(
        "Tier: minimum point must be greater than zero",
      );
      await expect(Tier.updateTier(2, "Test", 200, 0)).to.be.revertedWith("Tier: multiplier must be greater than zero");
      await expect(Tier.updateTier(2, "Star", 200, 2)).to.be.revertedWith("Tier: tier name is invalid");
    });

    it("Check updated tier info", async () => {
      await Tier.updateTier(2, "Test", 200, 2);
      const updatedTierInfo = await Tier.getTier(2);
      expect(updatedTierInfo[0]).to.equal("Test");
      expect(updatedTierInfo[1]).to.equal(200);
      expect(updatedTierInfo[2]).to.equal(2);
    });
  });

  describe("Remove Tier", () => {
    it("Caller must be owner", async () => {
      await expect(Tier.connect(user0).removeTier(2)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check tier index", async () => {
      await expect(Tier.removeTier(5)).to.be.revertedWith("Tier: invalid index");
    });

    it("Check remove tier", async () => {
      await Tier.removeTier(2);
      await expect(Tier.getTier(3)).to.be.revertedWith("Tier: invalid index");
    });
  });

  describe("Get Multiplier", async () => {
    it("Check invalid point address(address(0))", async () => {
      await expect(Tier.getMultiplier(ethers.constants.AddressZero, user0.address)).to.be.revertedWith(
        "Tier: point address is invalid",
      );
    });

    it("Check invalid user address(address(0))", async () => {
      await expect(Tier.getMultiplier(Point.address, ethers.constants.AddressZero)).to.be.revertedWith(
        "Tier: user account is invalid",
      );
    });

    it("Check user's multiplier", async () => {
      const multiplierInfo = await Tier.getMultiplier(Point.address, user0.address);
      // user point = 2350 (= 200 * 8 + 50 * 15), Star: 1500, 15
      expect(multiplierInfo[0]).to.equal(2);
      expect(multiplierInfo[1]).to.equal(15);
    })
  });
});
