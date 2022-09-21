import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import moment from "moment";

import { timeTravel, getLatestBlockTimestamp } from "./utils/helpers";
import { FAILURE, SUCCESS } from "./utils/constants";
import { initIDOFactory } from "./utils/IDO.behavior";

describe("IDO test", async () => {
  let IDOFactory: Contract;
  let IDO: Contract;
  let Play: Contract;
  let PlayBUSD: Contract;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let momentNow: any;

  beforeEach(async () => {
    [, operator, recipient, projectOwner, finalizer, user0, user1, user2] = await ethers.getSigners();

    [IDOFactory, , , Play, PlayBUSD] = await initIDOFactory(operator, user0, user1, user2);

    // Create IDO
    await PlayBUSD.transfer(projectOwner.address, 5000);
    await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000);
    const idoAddr = await IDOFactory.getIDO(0);
    const ido = await ethers.getContractFactory("IDO");
    IDO = ido.attach(idoAddr);

    // Init IDO property
    const contractNow = await getLatestBlockTimestamp();
    momentNow = moment.unix(contractNow); // 2022-09-01
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
    await PlayBUSD.connect(projectOwner).approve(IDO.address, 5000);
  });

  describe("Set IDO property", async () => {
    it("Check to create IDO", async () => {
      await expect(
        IDOFactory.createIDO(ethers.constants.AddressZero, 1000, ethers.constants.AddressZero, 5000),
      ).to.be.revertedWith("IDO: token address is invalid");
      await expect(IDOFactory.createIDO(Play.address, 0, PlayBUSD.address, 0)).to.be.revertedWith(
        "IDO: token amount is greater than zero",
      );
    });

    it("Check operator functions", async () => {
      const now: number = moment().unix();
      await expect(IDO.connect(user0).setStartTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.connect(user0).setEndTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.connect(user0).setClaimTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(
        IDO.connect(user0).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-08
          moment.duration(2, "weeks").asSeconds(),
          moment.duration(1, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.connect(user0).setBaseAmount(100)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.connect(user0).setMaxAmountPerUser(100)).to.be.revertedWith("IDO: caller is not operator");
      await expect(IDO.connect(user0).setSaleInfo(1000, 5000)).to.be.revertedWith("IDO: caller is not operator");
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
          0,
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: duration must be greater than zero");
      await expect(
        IDO.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-25
          moment.duration(3, "weeks").asSeconds(),
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: duration must be a multiple of periodicity");
      await expect(IDO.connect(operator).setSaleInfo(0, 0)).to.be.revertedWith(
        "IDO: token amount must be greater than zero.",
      );
      await expect(IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [500])).to.be.revertedWith(
        "IDO: invalid whitelisted users' info",
      );
    });

    it("Fund time is not yet.", async () => {
      await expect(IDO.fund(user0.address, 100)).to.be.revertedWith("IDO: time is not yet");
    });
  });

  describe("Start Fund", async () => {
    let contractNow: number;
    let endTime: number;
    let tierFundTime: number;
    let whitelistedFundTime: number;

    beforeEach(async () => {
      timeTravel(moment.duration(10, "days").asSeconds());
      contractNow = await getLatestBlockTimestamp();
      endTime = await IDO.getEndTime();
      tierFundTime = await IDO.getTierFundTime();
      whitelistedFundTime = await IDO.getWhitelistedFundTime();
    });

    describe("Check to fund users", () => {
      it("Users can fund a specified amount", async () => {
        await expect(IDO.fund(user0.address, 10000)).to.be.revertedWith("IDO: fund amount is greater than the rest");
      });

      it("Fund tiers", async () => {
        await expect(IDO.fund(operator.address, 150)).to.be.revertedWith("IDO: fund amount is too much");
      });

      it("Fund whitelisted users", async () => {
        if (contractNow < tierFundTime.valueOf()) timeTravel(tierFundTime.valueOf() - contractNow);
        await expect(IDO.fund(user0.address, 800)).to.be.revertedWith("IDO: fund amount is too much");
      });

      it("Fund any users", async () => {
        if (contractNow < whitelistedFundTime.valueOf()) timeTravel(whitelistedFundTime.valueOf() - contractNow);
        await expect(IDO.fund(user2.address, 550)).to.be.revertedWith("IDO: fund amount is too much");
      });

      it("Fund in case of emergency refund", async () => {
        await IDOFactory.emergencyRefund(0);
        await expect(IDO.fund(user2.address, 10)).to.be.revertedWith("IDO: funder can't fund");
      });

      it("Fund at the end of fund time", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        await expect(IDO.fund(user1.address, 100)).to.be.revertedWith("IDO: time has already passed");
      });
    });

    describe("Check to finalize IDO", () => {
      it("Fee percent must be smaller than 100", async () => {
        await expect(
          IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 101),
        ).to.be.revertedWith("IDO: fee percent must be smaller than 100");
      });

      it("Fund time is not ended yet", async () => {
        await expect(
          IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10),
        ).to.be.revertedWith("IDO: IDO is not ended yet");
      });

      it("IDO has already ended", async () => {
        await IDOFactory.emergencyRefund(0);
        await expect(
          IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10),
        ).to.be.revertedWith("IDO: IDO has already ended");
      });

      it("Check state IDO after finalize", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        await expect(IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10))
          .to.emit(IDO, "Finalize")
          .withArgs(FAILURE);
      });
    });

    describe("Users refund when IDO is failure", async () => {
      beforeEach(async () => {
        // timeTravel(endTime - contractNow);
        await IDO.fund(user0.address, 100); // user0 is tier, now is for tier fund time
        timeTravel(moment.duration(10, "days").asSeconds());
        await IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10);
      });

      it("Check IDO state", async () => {
        expect(await IDO.getState()).to.equal(FAILURE);
      });

      it("Funders can't claim", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        await expect(IDO.claim(user0.address)).to.be.revertedWith("IDO: state is not success");
      });

      it("Funders refund the fund", async () => {
        await expect(IDO.refund(user1.address)).to.be.revertedWith("IDO: user didn't fund");
        await expect(IDO.refund(user0.address)).to.emit(IDO, "ReFund").withArgs(user0.address, 100);
      });
    });

    describe("Users claim when IDO is success", async () => {
      beforeEach(async () => {
        // tiers fund
        await expect(IDO.fund(user0.address, 100)).to.emit(IDO, "Fund").withArgs("tier", user0.address, 100);
        await expect(IDO.fund(user1.address, 400)).to.emit(IDO, "Fund").withArgs("tier", user1.address, 400);
        timeTravel(tierFundTime.valueOf() - contractNow);
        // whiitlisted users fund
        await expect(IDO.fund(user1.address, 100))
          .to.emit(IDO, "Fund")
          .withArgs("whitelisted user", user1.address, 100);
        await expect(IDO.fund(user2.address, 300))
          .to.emit(IDO, "Fund")
          .withArgs("whitelisted user", user2.address, 300);
        timeTravel(whitelistedFundTime - tierFundTime);
        // any users
        await expect(IDO.fund(user0.address, 50)).to.emit(IDO, "Fund").withArgs("FCFS", user0.address, 50);
        await expect(IDO.fund(user1.address, 50)).to.emit(IDO, "Fund").withArgs("FCFS", user1.address, 50);
        timeTravel(endTime - whitelistedFundTime);

        await expect(IDOFactory.finalizeIDO(0, projectOwner.address, finalizer.address, recipient.address, 10))
          .to.emit(IDO, "Finalize")
          .withArgs(SUCCESS);
      });

      it("Funders claim", async () => {
        await expect(IDO.claim(user0.address)).to.be.revertedWith("IDO: claim time is not yet");
        timeTravel(moment.duration(2, "days").asSeconds());
        // user0's claimable: 150 = (100 + 50) * 5 * 0.2
        await expect(IDO.claim(user0.address)).to.emit(IDO, "Claim").withArgs(user0.address, 150);
        // user1's claimable: 550 = (400 + 100 + 50) * 5 * 0.2
        await expect(IDO.claim(user1.address)).to.emit(IDO, "Claim").withArgs(user1.address, 550);
        // after cliff time and first periodicity
        timeTravel(moment.duration(10, "days").asSeconds());
        // user0's claimable: 300 = 0 + 750 * (1 - 0.2) / 2
        await expect(IDO.claim(user0.address)).to.emit(IDO, "Claim").withArgs(user0.address, 300);
        // user1's claimable: 1100 = 0 + 2750 * (1 - 0.2) / 2
        await expect(IDO.claim(user1.address)).to.emit(IDO, "Claim").withArgs(user1.address, 1100);
        // user2's claimable: 900 = 300 * 5 * 0.2 + 300 * 5 * (1 - 0.2) / 2
        await expect(IDO.claim(user2.address)).to.emit(IDO, "Claim").withArgs(user2.address, 900);
      });

      it("Funders can't refund the fund", async () => {
        await expect(IDO.refund(user0.address)).to.be.revertedWith("IDO: state is not failure");
      });
    });
  });
});
