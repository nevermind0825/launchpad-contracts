import { Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initTier } from "./IDO.behavior";

describe("Tier test", () => {
  let Tier: Contract;
  let Point: Contract;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [, user1, user2] = await ethers.getSigners();
    [Tier, Point] = await initTier(user1, user2);
  });

  describe("Check owner functions", () => {
    it("check insertTier function", async () => {
      await expect(Tier.connect(user1).insertTier("Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });
    it("check updateTier function", async () => {
      await expect(Tier.connect(user1).updateTier(1, "Test", 200, 2)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });
    it("check removeTier function", async () => {
      await expect(Tier.connect(user1).removeTier(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Check index functions", () => {
    it("Check getTier function", async () => {
      await expect(Tier.getTier(5)).to.be.revertedWith("Tier: Invalid index");
    });
    it("check updateTier function", async () => {
      await expect(Tier.updateTier(5, "Test", 200, 2)).to.be.revertedWith("Tier: Invalid index");
    });
    it("check removeTier function", async () => {
      await expect(Tier.removeTier(5)).to.be.revertedWith("Tier: Invalid index");
    });
  });

  describe("Act tier", () => {
    it("insertTier function", async () => {
      await Tier.insertTier("Test", 200, 2);
      const tierInfo = await Tier.getTier(4);
      expect(tierInfo[0]).to.equal("Test");
      expect(tierInfo[1].eq(BigNumber.from(200))).to.equal(true);
      expect(tierInfo[2].eq(BigNumber.from(2))).to.equal(true);
    });

    it("updateTier function", async () => {
      await Tier.updateTier(3, "Test", 2000, 20);
      const tierInfo = await Tier.getTier(3);
      expect(tierInfo[0]).to.equal("Test");
      expect(tierInfo[1].eq(BigNumber.from(2000))).to.equal(true);
      expect(tierInfo[2].eq(BigNumber.from(20))).to.equal(true);
    });

    it("removeTier function", async () => {
      await Tier.removeTier(2);
      await expect(Tier.getTier(3)).to.be.revertedWith("Tier: Invalid index");
    });
  });

  it("Get user's multiplier", async () => {
    // user point = 1550 (= 1000 * 0.8 + 500 * 1.5), Star: 1500, 15
    expect(await Tier.getMultiplier(Point.address, user1.address)).to.equal(15);
  });
});
