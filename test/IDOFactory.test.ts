import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { initIDOFactory } from "./utils/IDO.behavior";
import { IDOFactory, Tier, Point, BUSD, SEG, IDO } from "../typechain";

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
      expect(await idoFactory._tier()).to.equal(tier.address);
      expect(await idoFactory._point()).to.equal(point.address);
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
      expect(await idoFactory.operators(operator.address)).to.eq(false);
    });
  });

  describe("Create IDO", async () => {
    it("Caller must be operator", async () => {
      const idoProperty: IDO.IDOMetaStruct = {
        fundToken: busd.address,
        saleToken: seg.address,
        fundAmount: 0,
        saleAmount: 0,
        startTime: 0,
        endTime: 0,
        claimTime: 0,
        tge: 0,
        cliffTime: 0,
        duration: 0,
        periodicity: 0,
        baseAmount: 0,
        maxAmountPerUser: 0,
      };
      await expect(idoFactory.connect(user0).createIDO(idoProperty)).to.be.revertedWith(
        "IDOFactory: caller is not operator",
      );
    });

    it("Check the index of IDO", async () => {
      await expect(idoFactory._ctrtIDOs(1)).to.be.reverted;
    });
  });

  describe("Get multiplier of funder", () => {
    it("Check user's  multiplier", async () => {
      // user point = 2350 (= 200 * 0.8 + 500 * 1.5), Star: 1500, 15
      expect(await idoFactory.getMultiplier(user0.address)).to.equal(15);
    });
  });
});
