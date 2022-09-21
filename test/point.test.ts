import { Contract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initPoint, insertTokenForPoint } from "./utils/IDO.behavior";
import { PLAY_WEIGHT } from "./utils/constants";

describe("Point test", () => {
  let Point: Contract;
  let Play: Contract, PlayBUSD: Contract; // token contracts
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, user0, user1] = await ethers.getSigners();
    [Point, Play, PlayBUSD] = await initPoint(user0, user1);
    await insertTokenForPoint(Point, Play, PlayBUSD);
  });

  describe("Insert Token", () => {
    it("Caller must be owner", async () => {
      await expect(Point.connect(user0).insertToken(Play.address, 8)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check invalid token address(address(0))", async () => {
      await expect(Point.insertToken(ethers.constants.AddressZero, 8)).to.be.revertedWith(
        "Point: token addres is invalid.",
      );
    });

    it("Token weight must be greater than zero", async () => {
      await expect(Point.insertToken(Play.address, 0)).to.be.revertedWith(
        "Point: token weight must be greater than zero.",
      );
    });

    it("A token can only be inserted once", async () => {
      await expect(Point.insertToken(Play.address, 8)).to.be.revertedWith("Point: the token is already inserted.");
    });

    it("Check inseted token", async () => {
      const tokenInfo = await Point.getToken(0);
      expect(tokenInfo[0]).to.be.equal(Play.address);
      expect(tokenInfo[1]).to.be.equal(PLAY_WEIGHT);
    });
  });

  describe("Update Token", () => {
    it("Caller must be owner", async () => {
      await expect(Point.connect(user0).updateToken(0, Play.address, 15)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check token index", async () => {
      await expect(Point.updateToken(2, Play.address, 15)).to.be.revertedWith("Point: token index is invalid");
    });

    it("Updated token can not be duplicated", async () => {
      await expect(Point.updateToken(1, Play.address, 8)).to.be.revertedWith("Point: token address is invalid");
    });

    it("Check updated token infos", async () => {
      await Point.updateToken(1, user0.address, 3);
      const updatedToken = await Point.getToken(1);
      expect(updatedToken[0]).to.be.equal(user0.address);
      expect(updatedToken[1]).to.be.equal(3);
    });
  });

  describe("Remove Token", () => {
    it("Caller must be owner", async () => {
      await expect(Point.connect(user0).removeToken(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check token index", async () => {
      await expect(Point.removeToken(2)).to.be.revertedWith("Point: token index is invalid");
    });

    it("Check remove token", async () => {
      await Point.removeToken(1);
      await expect(Point.getToken(1)).to.be.revertedWith("Point: token index is invalid");
    });
  });

  describe("Get Point", () => {
    it("Check invalid token address(address(0))", async () => {
      await expect(Point.getPoint(ethers.constants.AddressZero)).to.be.revertedWith("Point: user account is invalid");
    });

    it("Check user's point", async () => {
      expect(await Point.getPoint(user0.address)).to.equal(2350); // 200 * 8 + 50 * 15 = 2350
      await Point.removeToken(1);
      expect(await Point.getPoint(user0.address)).to.equal(1600); // 200 * 8
    })
  });
});
