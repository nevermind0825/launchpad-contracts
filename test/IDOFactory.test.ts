import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { initIDOFactory } from "./IDO.behavior";

describe("IDOFactory test", () => {
  let IDOFactory: Contract;
  let Play: Contract;
  let PlayBUSD: Contract;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, operator, recipient, finalizer, user0, user1] = await ethers.getSigners();
    [IDOFactory, , , Play, PlayBUSD] = await initIDOFactory(operator, user0, user1);
  });

  describe("Check owner functions", async () => {
    it("Check inertOperator function", async () => {
      await expect(IDOFactory.connect(user0).insertOperator(operator.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check removeOperator function", async () => {
      await expect(IDOFactory.connect(user0).removeOperator(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check setFeePercent function", async () => {
      await expect(IDOFactory.connect(user0).setFeePercent(10)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check setFeeReciepent function", async () => {
      await expect(IDOFactory.connect(user0).setFeeRecipient(recipient.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check finalizeIDO function", async () => {
      await expect(IDOFactory.connect(user1).finalizeIDO(0, finalizer.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check emergencyRefund function", async () => {
      await expect(IDOFactory.connect(user1).emergencyRefund(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Check operator functions", async () => {
    it("Check removeOperator function", async () => {
      await expect(IDOFactory.removeOperator(1)).to.be.revertedWith("IDOFactory: operator index is invalid");
      await IDOFactory.insertOperator(user1.address);
      await IDOFactory.removeOperator(0);
    });

    it("Check insertOperator function", async () => {
      await expect(IDOFactory.insertOperator(operator.address)).to.be.revertedWith(
        "IDOFactory: you have already inserted the operator",
      );
    });
  });

  describe("Check createIDO function", async () => {
    it("Check operator", async () => {
      await expect(IDOFactory.connect(user0).createIDO(Play.address, 1000, PlayBUSD.address, 5000)).to.be.revertedWith(
        "IDOFactory: caller is not the operator",
      );
    });

    it("Check parameters of createIDO function", async () => {
      await expect(IDOFactory.connect(operator).createIDO(Play.address, 0, PlayBUSD.address, 0)).to.be.revertedWith(
        "IDO: amount must be greater than zero",
      );
    });

    it("Check balance of owenr", async () => {
      await expect(
        IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 50000),
      ).to.be.revertedWith("IDOFactroy: balance of owner is not enough");
    });

    it("Check getIDO funtion", async () => {
      await expect(IDOFactory.getIDO(1)).to.be.revertedWith("IDOFactory: IDO index is invalid");
    });
  });

  describe("Set fee info functions", async () => {
    it("Check setFeeRecipient function", async () => {
      await expect(IDOFactory.setFeeRecipient(ethers.constants.AddressZero)).to.be.revertedWith(
        "IDOFactory: fee recipient must not be address(0)",
      );
    });

    it("Check setFeePercent function", async () => {
      await expect(IDOFactory.setFeePercent(0)).to.be.revertedWith("IDOFactory: fee percent must be bigger than zero");
    });
  });

  describe("Finalize IDO", async () => {
    beforeEach(async () => {
      await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 4200);
    });

    it("Check setting fee info before finalize", async () => {
      await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith(
        "IDOFactory: owner didn't set the fee percent",
      );
      await IDOFactory.setFeePercent(10);
      await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith(
        "IDOFactory: owner didn't set the fee recipient",
      );
    });

    it("Check finalizeIDO function", async () => {
      console.log("\tIDO address:", await IDOFactory.getIDO(0));
      await IDOFactory.setFeePercent(10);
      await IDOFactory.setFeeRecipient(recipient.address);
      await IDOFactory.finalizeIDO(0, finalizer.address);
    });

    it("Emergency refund", async () => {
      await IDOFactory.emergencyRefund(0);
    });
  });

  it("Get multiplier of funder", async () => {
    // user point = 1550 (= 1000 * 0.8 + 500 * 1.5), Star: 1500, 15
    expect(await IDOFactory.getMultiplier(user0.address)).to.equal(15);
  });
});
