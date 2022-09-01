import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

describe("IDOFactory test", () => {
  let IDOFactory: Contract;
  let Tier: Contract;
  let Point: Contract;
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
    Tier = await tier.deploy();
    await Tier.deployed();

    // Deploy point contract.
    const point = await ethers.getContractFactory("Point");
    Point = await point.deploy(1); // set decimal as 1.
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

    // Users fund into the Play token and PlayBUSD token.
    await Play.transfer(user0.address, 100);
    await Play.transfer(user1.address, 200);

    await PlayBUSD.transfer(user0.address, 500);
    await PlayBUSD.transfer(user1.address, 300);

    // Add tokens
    await Point.insertToken(Play.address, 8);
    await Point.insertToken(PlayBUSD.address, 15);
  });

  it("Insert and remove opertors", async () => {
    await expect(IDOFactory.connect(user0).insertOperator(operator.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(IDOFactory.connect(user0).removeOperator(0)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(IDOFactory.removeOperator(0)).to.be.revertedWith("IDOFactory: operator index is invalid");
    await IDOFactory.connect(owner).insertOperator(operator.address);
    await expect(IDOFactory.insertOperator(operator.address)).to.be.revertedWith(
      "IDOFactory: you have already inserted the operator",
    );
    await IDOFactory.connect(owner).insertOperator(user1.address);
    await IDOFactory.removeOperator(0);
  });

  it("Create and get IDO and set fee percent and fee recipient", async () => {
    await IDOFactory.insertOperator(operator.address);

    await expect(IDOFactory.connect(user0).createIDO(Play.address, 1000, PlayBUSD.address, 5000)).to.be.revertedWith(
      "IDOFactory: caller is not the operator",
    );
    await expect(IDOFactory.connect(operator).createIDO(Play.address, 0, PlayBUSD.address, 0)).to.be.revertedWith(
      "IDO: amount must be greater than zero",
    );
    await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000);

    await expect(IDOFactory.getIDO(1)).to.be.revertedWith("IDOFactory: IDO index is invalid");
    console.log("\tIDO address:", await IDOFactory.getIDO(0));

    await expect(IDOFactory.setFeeRecipient(ethers.constants.AddressZero)).to.be.revertedWith(
      "IDOFactory: fee recipient must not be address(0)",
    );
    await expect(IDOFactory.connect(user0).setFeeRecipient(recipient.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await IDOFactory.setFeeRecipient(recipient.address);

    await expect(IDOFactory.setFeePercent(0)).to.be.revertedWith("IDOFactory: fee percent must be bigger than zero");
    await expect(IDOFactory.connect(user0).setFeePercent(10)).to.be.revertedWith("Ownable: caller is not the owner");
    await IDOFactory.setFeePercent(10);
  });

  it("Finalize IDO", async () => {
    await IDOFactory.insertOperator(operator.address);
    await PlayBUSD.transfer(operator.address, 5000);
    await expect(IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000)).to.be.revertedWith(
      "IDOFactroy: balance of owner is not enough",
    );
    await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 4200);
    await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith(
      "IDOFactory: owner didn't set the fee percent",
    );
    await IDOFactory.setFeePercent(10);
    await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith(
      "IDOFactory: owner didn't set the fee recipient",
    );
    await IDOFactory.setFeeRecipient(recipient.address);
    await expect(IDOFactory.connect(user1).finalizeIDO(0, finalizer.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await IDOFactory.finalizeIDO(0, finalizer.address);
  });
});
