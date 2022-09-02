import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

describe("IDOFactory test", () => {
  let IDOFactory: Contract;
  let Play: Contract;
  let PlayBUSD: Contract;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [owner, operator, recipient, finalizer, user0, user1] = await ethers.getSigners();

    // Deploy tier contract.
    const tier = await ethers.getContractFactory("Tier");
    const Tier = await tier.deploy();
    await Tier.deployed();

    // Deploy point contract.
    const point = await ethers.getContractFactory("Point");
    const Point = await point.deploy(1); // set decimal as 1.
    await Point.deployed();

    // Play contract deploy.
    const play = await ethers.getContractFactory("Play");
    Play = await play.deploy(10000); // set initail supply of Play token as 10000.
    await Play.deployed();

    // PlayBUSD contract deploy
    const playBUSD = await ethers.getContractFactory("PlayBUSD");
    PlayBUSD = await playBUSD.deploy(10000); // set initail supply of PlayBUSD token as 10000.
    await PlayBUSD.deployed();

    // deploy IDOFactory contract
    const idoFactory = await ethers.getContractFactory("IDOFactory");
    IDOFactory = await idoFactory.deploy(Tier.address, Point.address);
    await IDOFactory.deployed();

    // Transfer tokens
    await Play.transfer(user0.address, 100);
    await Play.transfer(user1.address, 200);
    await PlayBUSD.transfer(user0.address, 500);
    await PlayBUSD.transfer(user1.address, 300);

    // Insert tokens
    await Point.insertToken(Play.address, 8);
    await Point.insertToken(PlayBUSD.address, 15);

    // Insert operator
    await IDOFactory.connect(owner).insertOperator(operator.address);
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
      await expect(IDOFactory.connect(user1).emergencyRefund(0)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });
  });

  describe("Check operator functions", async () => {
    it("Check removeOperator function", async () => {
      await expect(IDOFactory.removeOperator(1)).to.be.revertedWith("IDOFactory: operator index is invalid");
      await IDOFactory.connect(owner).insertOperator(user1.address);
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
     // user point = 830 (= 100 * 0.8 + 500 * 1.5), Star: 500, 5
    expect(await IDOFactory.getMultiplier(user0.address)).to.equal(5);
  });
});
