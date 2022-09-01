import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Tier test", () => {
  let Tier: Contract;
  let Point: Contract;
  let Play: Contract;
  let PlayBUSD: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

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

    // Users fund into the Play token and PlayBUSD token.
    await Play.transfer(user1.address, 100);
    await Play.transfer(user2.address, 200);

    await PlayBUSD.transfer(user1.address, 500);
    await PlayBUSD.transfer(user2.address, 300);

    // Add tokens
    await Point.insertToken(Play.address, 8);
    await Point.insertToken(PlayBUSD.address, 15);
  });

  it("Check owner", async () => {
    await expect(Tier.connect(user1).insertTier("Test", 200, 2)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(Tier.connect(user1).updateTier(1, "Test", 200, 2)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(Tier.connect(user1).removeTier(1)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Check index", async () => {
    await expect(Tier.getTier(5)).to.be.revertedWith("Tier: Invalid index");
    await expect(Tier.updateTier(5, "Test", 200, 2)).to.be.revertedWith("Tier: Invalid index");
    await expect(Tier.removeTier(5)).to.be.revertedWith("Tier: Invalid index");
  });

  it("Insert, get, update and remove Tier", async () => {
    await Tier.insertTier("Test", 200, 2);
    let tierInfo = await Tier.getTier(4);
    expect(tierInfo[0]).to.equal("Test");
    expect(tierInfo[1].eq(BigNumber.from(200))).to.equal(true);
    expect(tierInfo[2].eq(BigNumber.from(2))).to.equal(true);

    await Tier.updateTier(4, "Test", 2000, 20);
    tierInfo = await Tier.getTier(4);
    expect(tierInfo[0]).to.equal("Test");
    expect(tierInfo[1].eq(BigNumber.from(2000))).to.equal(true);
    expect(tierInfo[2].eq(BigNumber.from(20))).to.equal(true);

    await Tier.removeTier(3);
    await expect(Tier.getTier(4)).to.be.revertedWith("Tier: Invalid index");
  });

  it("Get user's multiplier", async () => {
    expect(await Point.connect(deployer).getPoint(user1.address)).to.equal(830);
    expect(await Tier.getMultiplier(Point.address, user1.address)).to.equal(5);
  });
});
