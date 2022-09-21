import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { initIDOFactory } from "./utils/IDO.behavior";

describe("IDOFactory test", () => {
  let IDOFactory: Contract;
  let Tier: Contract;
  let Point: Contract;
  let Play: Contract;
  let PlayBUSD: Contract;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, operator, recipient, projectOwner, finalizer, user0, user1] = await ethers.getSigners();
    [IDOFactory, Tier, Point, Play, PlayBUSD] = await initIDOFactory(operator, user0, user1);
  });

  describe("Set Tier and Point Address", () => {
    it("Caller must be owner", async () => {
      await expect(IDOFactory.connect(user0).setTierAddress(Tier.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
      await expect(IDOFactory.connect(user0).setPointAddress(Point.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check tier and point address", async () => {
      IDOFactory.setTierAddress(Tier.address);
      IDOFactory.setPointAddress(Point.address);
      expect(await IDOFactory.getTierAddress()).to.equal(Tier.address);
      expect(await IDOFactory.getPointAddress()).to.equal(Point.address);
    });
  });

  describe("Set Operator", async () => {
    it("Caller must be owner", async () => {
      await expect(IDOFactory.connect(user0).setOperator(operator.address, true)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check operator", async () => {
      await expect(IDOFactory.setOperator(operator.address, false))
        .to.emit(IDOFactory, "SetOperator")
        .withArgs(operator.address, false);
      expect(await IDOFactory.isOperator(operator.address)).to.eq(false);
    });
  });

  describe("Create IDO", async () => {
    it("Caller must be operator", async () => {
      await expect(IDOFactory.connect(user0).createIDO(Play.address, 0, PlayBUSD.address, 0)).to.be.revertedWith(
        "IDOFactory: caller is not operator",
      );
    });

    it("Check create IDO", async () => {
      await expect(IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000))
        .to.emit(IDOFactory, "CreateIDO")
        .withArgs(Play.address, 1000, PlayBUSD.address, 5000);
    });
  });

  describe("Finalize IDO", async () => {
    beforeEach(async () => {
      await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 4200);
    });

    it("Caller must be owner", async () => {
      await expect(
        IDOFactory.connect(user1).finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10),
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check IDO index", async () => {
      await expect(
        IDOFactory.finalizeIDO(1, projectOwner.address, finalizer.address, recipient.address, 10),
      ).to.be.revertedWith("IDOFactory: IDO index is invalid");
    });

    it("Check finalizeIDO function", async () => {
      await IDOFactory.getIDO(0);
      await IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10);
    });
  });

  describe("Emergency refund", () => {
    beforeEach(async () => {
      await IDOFactory.createIDO(Play.address, 1000, PlayBUSD.address, 4200);
    });

    it("Caller must be owner", async () => {
      await expect(IDOFactory.connect(user1).emergencyRefund(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check IDO index", async () => {
      await expect(IDOFactory.emergencyRefund(1)).to.be.revertedWith("IDOFactory: IDO index is invalid");
    });

    it("Check emergency refund", async () => {
      await IDOFactory.emergencyRefund(0);
    });
  });

  describe("Get multiplier of funder", () => {
    it("Check user's  multiplier", async () => {
      // user point = 2350 (= 200 * 0.8 + 500 * 1.5), Star: 1500, 15
      expect(await IDOFactory.getMultiplier(user0.address)).to.equal(15);
    });
  });
});
