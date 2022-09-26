import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { initIDOFactory } from "./utils/IDO.behavior";
import { IDOFactory, Tier, Point, BUSD, SEG } from "../typechain";

describe("IDOFactory test", () => {
  let idoFactory: IDOFactory;
  let tier: Tier;
  let point: Point;
  let busd: BUSD;
  let seg: SEG;
  let operator: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, operator, user0, user1] = await ethers.getSigners();
    [idoFactory, tier, point, busd, seg] = await initIDOFactory(operator, user0, user1);
  });

  describe("Set Tier and Point Address", () => {
    it("Caller must be owner", async () => {
      await expect(idoFactory.connect(user0).setTierAddress(tier.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
      await expect(idoFactory.connect(user0).setPointAddress(point.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check tier and point address", async () => {
      idoFactory.setTierAddress(tier.address);
      idoFactory.setPointAddress(point.address);
      expect(await idoFactory.getTierAddress()).to.equal(tier.address);
      expect(await idoFactory.getPointAddress()).to.equal(point.address);
    });
  });

  describe("Set Operator", async () => {
    it("Caller must be owner", async () => {
      await expect(idoFactory.connect(user0).setOperator(operator.address, true)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check operator", async () => {
      await expect(idoFactory.setOperator(operator.address, false))
        .to.emit(idoFactory, "SetOperator")
        .withArgs(operator.address, false);
      expect(await idoFactory.isOperator(operator.address)).to.eq(false);
    });
  });

  describe("Create IDO", async () => {
    it("Caller must be operator", async () => {
      await expect(idoFactory.connect(user0).createIDO(busd.address, 0, seg.address, 0)).to.be.revertedWith(
        "IDOFactory: caller is not operator",
      );
    });

    it("Check create IDO", async () => {
      await expect(idoFactory.connect(operator).createIDO(busd.address, 1000, seg.address, 5000)).to.emit(
        idoFactory,
        "CreateIDO",
      );
      await expect(idoFactory.getIDO(1)).to.be.revertedWith("IDOFactory: IDO index is invalid");
      await idoFactory.getIDO(0);
    });
  });

  describe("Get multiplier of funder", () => {
    it("Check user's  multiplier", async () => {
      // user point = 2350 (= 200 * 0.8 + 500 * 1.5), Star: 1500, 15
      expect(await idoFactory.getMultiplier(user0.address)).to.equal(15);
    });
  });
});
