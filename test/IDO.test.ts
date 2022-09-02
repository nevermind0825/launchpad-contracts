import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import moment from "moment";

import { timeTravel } from "./helper";
import {
  ONE_DAY_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  TIER_FUND_TIME,
  WHITELISTED_USER_FUND_TIME,
  ANY_USER_FUND_TIME,
  WAITING,
  SUCCESS,
  FAILURE,
} from "./constants";

describe("IDO test", async () => {
  let IDOFactory: Contract;
  let IDO: Contract;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let momentNow: any;

  beforeEach(async () => {
    [owner, operator, recipient, finalizer, user0, user1, user2] = await ethers.getSigners();

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
    const Play = await play.deploy(10000); // set initail supply of Play token as 10000.
    await Play.deployed();

    // PlayBUSD contract deploy
    const playBUSD = await ethers.getContractFactory("PlayBUSD");
    const PlayBUSD = await playBUSD.deploy(10000); // set initail supply of PlayBUSD token as 10000.
    await PlayBUSD.deployed();

    // deploy IDOFactory contract
    const idoFactory = await ethers.getContractFactory("IDOFactory");
    IDOFactory = await idoFactory.deploy(Tier.address, Point.address);
    await IDOFactory.deployed();

    // Transfer tokens.
    await Play.transfer(user0.address, 1000);
    await Play.transfer(user1.address, 1000);
    await Play.transfer(user2.address, 1000);
    await PlayBUSD.transfer(user0.address, 300);
    await PlayBUSD.transfer(user1.address, 500);

    // Add tokens
    await Point.insertToken(PlayBUSD.address, 10);

    // Create IDO
    await PlayBUSD.transfer(owner.address, 5000);
    await IDOFactory.insertOperator(operator.address);
    await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000);
    await IDOFactory.setFeeRecipient(recipient.address);
    await IDOFactory.setFeePercent(10);
    const idoAddr = await IDOFactory.getIDO(0);
    const ido = await ethers.getContractFactory("IDO");
    IDO = ido.attach(idoAddr);

    // Init IDO property
    const contractNow = await IDO.getNowTime();
    momentNow = moment.unix(contractNow.toNumber()); // 2022-09-01
    await IDO.connect(operator).setStartTime(momentNow.add(10, "days").unix()); // 2022-09-11
    await IDO.connect(operator).setEndTime(momentNow.add(9, "days").unix()); // 2022-09-20
    await IDO.connect(operator).setClaimTime(momentNow.add(2, "days").unix()); // 2022-09-22
    await IDO.connect(operator).setVestInfo(
      20,
      momentNow.add(3, "days").unix(), // 2022-09-25
      moment.duration(2, "weeks").asSeconds(),
      moment.duration(1, "weeks").asSeconds(),
    );
    await IDO.connect(operator).setBaseAmount(100);
    await IDO.connect(operator).setMaxAmountPerUser(50);
    await IDO.connect(operator).setSaleInfo(1000, 5000);
    await IDO.connect(operator).setWhitelistAmount(user0.address, 0);
    await IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]);

    // Users approve
    await Play.connect(user0).approve(IDO.address, 1000);
    await Play.connect(user1).approve(IDO.address, 1000);
    await Play.connect(user2).approve(IDO.address, 1000);
    await PlayBUSD.approve(IDO.address, 5000);
  });

  describe("Check setting IDO property", async () => {
    it("Check operator functions", async () => {
      const now: number = moment().unix();
      await expect(IDO.setStartTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.setEndTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.setClaimTime(now)).to.be.revertedWith("IDO: caller is not operator");
    });

    it("Check time to set property", async () => {
      await expect(IDO.connect(operator).setStartTime(momentNow.subtract(26, "days").unix())).to.be.revertedWith(
        "IDO: start time is greater than now", // 2022-08-31
      );
      await expect(IDO.connect(operator).setEndTime(momentNow.add(8, "days").unix())).to.be.revertedWith(
        "IDO: end time must be greater than start time", // 2022-09-08
      );
      await expect(IDO.connect(operator).setClaimTime(momentNow.unix())).to.be.revertedWith(
        "IDO: claim time must be greater than end time", // 2022-09-08
      );
      await expect(
        IDO.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-08
          moment.duration(2, "weeks").asSeconds(),
          moment.duration(1, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: cliff time must be greater than claim time");
      timeTravel(moment.duration(12, "days").asSeconds());
      await expect(IDO.connect(operator).setBaseAmount(100)).to.be.revertedWith("IDO: time is out");
      await expect(IDO.connect(operator).setMaxAmountPerUser(100)).to.be.revertedWith("IDO: time is out");
      await expect(IDO.connect(operator).setSaleInfo(1000, 5000)).to.be.revertedWith("IDO: time is out");
    });

    it("Check property validation", async () => {
      await expect(
        IDO.connect(operator).setVestInfo(
          120,
          momentNow.add(17, "days").unix(), // 2022-09-25
          moment.duration(4, "weeks").asSeconds(),
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: tge must be smaller than 100");
      await expect(
        IDO.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-25
          moment.duration(3, "weeks").asSeconds(),
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: duration must be a multiple of periodicity");
    });

    it("Fund time is not yet.", async () => {
      await expect(IDO.fund(user0.address, 100)).to.be.revertedWith("IDO: time is not yet");
    });
  });

  describe("Fund test", async () => {
    let contractNow: number;

    beforeEach(async () => {
      contractNow = (await IDO.getNowTime()) % ONE_DAY_IN_SECONDS;
      timeTravel(moment.duration(10, "days").asSeconds());
    });

    it("Users can fund a specified amount", async () => {
      await expect(IDO.fund(user0.address, 10000)).to.be.revertedWith("IDO: fund amount is greater than the rest");
    });

    it("Fund tiers.", async () => {
      if (contractNow > TIER_FUND_TIME) timeTravel(ONE_DAY_IN_SECONDS - contractNow);
      await expect(IDO.fund(user0.address, 200)).to.be.revertedWith("IDO: fund amount is too much");
    });

    it("Fund whitelisted users", async () => {
      if (WHITELISTED_USER_FUND_TIME < contractNow || contractNow < TIER_FUND_TIME)
        timeTravel(ONE_DAY_IN_SECONDS - contractNow + TIER_FUND_TIME);
      await expect(IDO.fund(user0.address, 100)).to.be.revertedWith("IDO: fund amount is too much");
    });

    it("Fund any users", async () => {
      if (WHITELISTED_USER_FUND_TIME > contractNow)
        timeTravel(ONE_DAY_IN_SECONDS - contractNow + WHITELISTED_USER_FUND_TIME);
      await expect(IDO.fund(user2.address, 150)).to.be.revertedWith("IDO: fund amount is too much");
    });

    it("Fund in case of emergency refund", async () => {
      await IDOFactory.emergencyRefund(0);
      await expect(IDO.fund(user2.address, 10)).to.be.revertedWith("IDO: funder can't fund");
    });

    it("Fund at the end of fund time", async () => {
      timeTravel(moment.duration(10, "days").asSeconds());
      await expect(IDO.fund(user1.address, 100)).to.be.revertedWith("IDO: time has already passed");
    });

    it("Fund time is not ended yet", async () => {
      await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith("IDO: IDO is not ended yet");
    });

    describe("Users refund when IDO is failure", async () => {
      beforeEach(async () => {
        timeTravel(ONE_DAY_IN_SECONDS - contractNow);
        await IDO.fund(user0.address, 100); // user0 is tier, now is for tier fund time
        timeTravel(moment.duration(10, "days").asSeconds());
        await IDOFactory.finalizeIDO(0, finalizer.address);
      });

      it("Check IDO state", async () => {
        expect(await IDO.getState()).to.equal(FAILURE);
      });

      it("Funders can't claim", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        await expect(IDO.claim(user0.address, 150)).to.be.revertedWith("IDO: state is not success");
      });

      it("Funders refund the fund", async () => {
        await expect(IDO.refund(user1.address)).to.be.revertedWith("IDO: user didn't fund");
        await IDO.refund(user0.address);
      });
    });

    describe("Users claim when IDO is success", async () => {
      beforeEach(async () => {
        timeTravel(ONE_DAY_IN_SECONDS - contractNow);
        // tiers fund
        await IDO.fund(user0.address, 100);
        await IDO.fund(user1.address, 400);
        timeTravel(TIER_FUND_TIME);
        // whiitlisted users fund
        await IDO.fund(user1.address, 100);
        await IDO.fund(user2.address, 300);
        timeTravel(WHITELISTED_USER_FUND_TIME - TIER_FUND_TIME);
        // any users
        await IDO.fund(user0.address, 50);
        await IDO.fund(user1.address, 50);
        timeTravel(moment.duration(9, "days").asSeconds());
        await IDOFactory.finalizeIDO(0, finalizer.address);
      });

      it("Funders claim", async () => {
        await expect(IDO.claim(user0.address, 150)).to.be.revertedWith("IDO: claim time is not yet");
        timeTravel(moment.duration(2, "days").asSeconds());
        await expect(IDO.claim(user0.address, 200)).to.be.revertedWith("IDO: claim amount is greater than the rest");
        await IDO.claim(user0.address, 150);
        await IDO.claim(user1.address, 550);
      });

      it("Funders can't refund the fund", async () => {
        await expect(IDO.refund(user0.address)).to.be.revertedWith("IDO: state is not failure");
      });

      it("IDO has already ended", async () => {
        await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith("IDO: IDO has already ended");
      });
    });
  });
});
