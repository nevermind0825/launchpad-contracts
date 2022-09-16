import { Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initPoint, insertTokenForPoint } from "./utils/IDO.behavior";

describe("Point test", () => {
  let Point: Contract;
  let Play: Contract, PlayBUSD: Contract; // token contracts
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, user0, user1] = await ethers.getSigners();
    [Point, Play, PlayBUSD] = await initPoint(user0, user1);
  });

  it("Set and get decimal", async () => {
    await Point.setDecimal(2);
    expect(await Point.getDecimal()).to.equal(2);
  });

  it("Get Point", async () => {
    await insertTokenForPoint(Point, Play, PlayBUSD);
    expect(await Point.getPoint(user0.address)).to.equal(1550); // 1000 * 0.8 + 500 * 1.5 = 830
    await Point.removeToken(1);
    expect(await Point.getPoint(user0.address)).to.equal(800); // 1000 * 0.8
  });

  describe("Check onwer functions", async () => {
    it("Check insertToken function", async () => {
      await expect(Point.connect(user0).insertToken(Play.address, 8)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check removeToken function", async () => {
      await expect(Point.connect(user0).removeToken(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Check token functions", async () => {
    beforeEach("Insert Token", async () => {
      await insertTokenForPoint(Point, Play, PlayBUSD);
    });

    it("Check insertToken function", async () => {
      await expect(Point.insertToken(ethers.constants.AddressZero, 8)).to.be.revertedWith(
        "Point: token addres is invalid.",
      );
      await expect(Point.insertToken(Play.address, 0)).to.be.revertedWith(
        "Point: token weight must be greater than zero.",
      );
      await expect(Point.insertToken(Play.address, 8)).to.be.revertedWith("Point: the token is already inserted.");
    });

    it("Check getToken function", async () => {
      await expect(Point.getToken(2)).to.be.revertedWith("Point: the token index is invalid");
      const tokenInfo = await Point.getToken(1);
      expect(tokenInfo[0]).to.equal(PlayBUSD.address);
      expect(tokenInfo[1].eq(BigNumber.from(15))).to.equal(true);
    });

    it("Check removeToken funtion", async () => {
      await Point.removeToken(1);
      await expect(Point.getToken(1)).to.be.revertedWith("Point: the token index is invalid");
    });
  });
});
