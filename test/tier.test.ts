import { Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Tier test", () => {
  let Tier: Contract;
  let Point: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    // Deploy tier contract.
    const tier = await ethers.getContractFactory("Tier");
    Tier = await tier.connect(owner).deploy();
    await Tier.deployed();

    // Deploy point contract.
    const point = await ethers.getContractFactory("Point");
    Point = await point.deploy(1); // set decimal as 1.
    await Point.deployed();

    // Play contract deploy.
    const play = await ethers.getContractFactory("Play");
    const Play = await play.deploy(10000); // set initail supply of Play token as 10000.
    await Play.deployed();

    // PlayBUSD contract deploy
    const playBUSD = await ethers.getContractFactory("PlayBUSD");
    const PlayBUSD = await playBUSD.deploy(10000); // set initail supply of PlayBUSD token as 10000.
    await PlayBUSD.deployed();

    // transter tokens to users.
    await Play.transfer(user1.address, 100);
    await Play.transfer(user2.address, 200);
    await PlayBUSD.transfer(user1.address, 500);
    await PlayBUSD.transfer(user2.address, 300);

    // add tokens
    await Point.insertToken(Play.address, 8);
    await Point.insertToken(PlayBUSD.address, 15);
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
    expect(await Tier.getMultiplier(Point.address, user1.address)).to.equal(5);
  });
});
