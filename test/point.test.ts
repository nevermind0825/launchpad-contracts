import { Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Point test", () => {
  let Point: Contract;
  let Play: Contract, PlayBUSD: Contract; // token contracts
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Point contract deploy.
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
  });

  it("Set and get decimal", async () => {
    await Point.connect(owner).setDecimal(2);
    expect(await Point.connect(owner).getDecimal()).to.equal(2);
  });

  it("Get Point", async () => {
    await Point.insertToken(Play.address, 8);
    await Point.insertToken(PlayBUSD.address, 15);
    expect(await Point.getPoint(user1.address)).to.equal(830); // 100 * 0.8 + 500 * 1.5 = 830
    await Point.removeToken(1);
    expect(await Point.getPoint(user1.address)).to.equal(80); // 100 * 0.8
  });

  describe("Check onwer functions", async () => {
    it("Check insertToken function", async () => {
      await expect(Point.connect(user1).insertToken(Play.address, 8)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check removeToken function", async () => {
      await expect(Point.connect(user1).removeToken(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Check token functions", async () => {
    beforeEach("Insert Token", async () => {
      await Point.insertToken(Play.address, 8);
      await Point.insertToken(PlayBUSD.address, 15);
    });

    it("Check getToken function", async () => {
      await expect(Point.getToken(2)).to.be.revertedWith("Point: the token index is invalid");
      const tokenInfo = await Point.getToken(1);
      expect(tokenInfo[0]).to.equal(PlayBUSD.address);
      expect(tokenInfo[1].eq(BigNumber.from(15))).to.equal(true);
    });

    it("Check removeToken funtion", async () => {
      await Point.removeToken(1);
      await expect(Point.getToken(1)).to.be.revertedWith("Point: you have already removed this token");
    });
  });
});
