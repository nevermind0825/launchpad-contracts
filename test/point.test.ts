import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { initPoint } from "./utils/IDO.behavior";
import { PLAYBUSD_WEIGHT, PLAY_WEIGHT } from "./utils/constants";
import { Point, Play, PlayBUSD } from "../typechain";

describe("point test", () => {
  let point: Point;
  let play: Play, playBUSD: PlayBUSD; // token contracts
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    [, user0, user1] = await ethers.getSigners();
    [point, play, playBUSD] = await initPoint(user0, user1);
  });

  describe("Insert Token", () => {
    it("Caller must be owner", async () => {
      await expect(point.connect(user0).insertToken(play.address, 8)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check invalid token address(address(0))", async () => {
      await expect(point.insertToken(ethers.constants.AddressZero, 8)).to.be.revertedWith(
        "Point: token addres is invalid.",
      );
    });

    it("Token weight must be greater than zero", async () => {
      await expect(point.insertToken(play.address, 0)).to.be.revertedWith(
        "Point: token weight must be greater than zero.",
      );
    });

    it("A token can not be duplicated", async () => {
      await expect(point.insertToken(play.address, 8)).to.be.revertedWith("Point: the token is already inserted.");
    });

    it("Check inseted token", async () => {
      let tokenInfo = await point.getToken(0);
      expect(tokenInfo[0]).to.be.equal(play.address);
      expect(tokenInfo[1]).to.be.equal(PLAY_WEIGHT);
      tokenInfo = await point.getToken(1);
      expect(tokenInfo[0]).to.be.equal(playBUSD.address);
      expect(tokenInfo[1]).to.be.equal(PLAYBUSD_WEIGHT);
    });
  });

  describe("Update Token", () => {
    it("Caller must be owner", async () => {
      await expect(point.connect(user0).updateToken(0, play.address, 15)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Check token index", async () => {
      await expect(point.updateToken(2, play.address, 15)).to.be.revertedWith("Point: token index is invalid");
    });

    it("Updated token can not be duplicated", async () => {
      await expect(point.updateToken(1, play.address, 8)).to.be.revertedWith("Point: token address is invalid");
    });

    it("Check updated token infos", async () => {
      await point.updateToken(1, user0.address, 3);
      const updatedToken = await point.getToken(1);
      expect(updatedToken[0]).to.be.equal(user0.address);
      expect(updatedToken[1]).to.be.equal(3);
    });
  });

  describe("Remove Token", () => {
    it("Caller must be owner", async () => {
      await expect(point.connect(user0).removeToken(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Check token index", async () => {
      await expect(point.removeToken(2)).to.be.revertedWith("Point: token index is invalid");
    });

    it("Check remove token", async () => {
      await point.removeToken(0);
      await point.removeToken(0);
      await expect(point.getToken(1)).to.be.revertedWith("Point: token index is invalid");
    });
  });

  describe("Get point", () => {
    it("Check invalid token address(address(0))", async () => {
      await expect(point.getPoint(ethers.constants.AddressZero)).to.be.revertedWith("Point: user account is invalid");
    });

    it("Check user's point", async () => {
      expect(await point.getPoint(user0.address)).to.equal(2350); // 200 * 8 + 50 * 15 = 2350
      expect(await point.getPoint(user1.address)).to.equal(1250); // 100 * 8 + 30 * 15 = 1250
      await point.removeToken(1);
      expect(await point.getPoint(user0.address)).to.equal(1600); // 200 * 8 = 1600
      expect(await point.getPoint(user1.address)).to.equal(800); // 100 * 8 = 800
    })
  });
});
