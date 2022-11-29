import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import moment from "moment";

import { timeTravel, getLatestBlockTimestamp } from "./utils/helpers";
import { State, UserRole } from "./utils/constants";
import { initIDOFactory } from "./utils/IDO.behavior";
import { IDOFactory, IDO, IDO__factory, BUSD, SEG } from "../typechain";

describe("IDO test", async () => {
  let idoFactory: IDOFactory;
  let ido: IDO;
  let busd: BUSD;
  let seg: SEG;
  let operator: SignerWithAddress;
  let recipient: SignerWithAddress;
  let projectOwner: SignerWithAddress;
  let finalizer: SignerWithAddress;
  let user0: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let momentNow: moment.Moment;
  let idoProperty: IDO.IDOPropertyStruct;

  beforeEach(async () => {
    [, operator, recipient, projectOwner, finalizer, user0, user1, user2] = await ethers.getSigners();

    [idoFactory, , , busd, seg] = await initIDOFactory(operator, user0, user1, user2);

    // Create IDO
    await seg.transfer(projectOwner.address, 5000);
    momentNow = moment.unix(await getLatestBlockTimestamp()); // 2022-09-01
    idoProperty = {
      fundToken: busd.address,
      saleToken: seg.address,
      fundAmount: 1000,
      saleAmount: 5000,
      startTime: momentNow.add(10, "days").unix(),
      endTime: momentNow.add(9, "days").unix(),
      claimTime: momentNow.add(2, "days").unix(),
      tge: 20,
      cliffTime: momentNow.add(3, "days").unix(),
      duration: moment.duration(2, "weeks").asSeconds(),
      periodicity: moment.duration(1, "weeks").asSeconds(),
      baseAmount: 100,
      maxAmountPerUser: 50,
    };
    await idoFactory.connect(operator).createIDO(idoProperty);
    const idoAddr = await idoFactory.getIDO(0);
    const idoContractFactory: IDO__factory = await ethers.getContractFactory("IDO");
    ido = <IDO>idoContractFactory.attach(idoAddr);

    // Init IDO property
    // await ido.connect(operator).setSaleInfo(busd.address, 1000, seg.address, 5000);
    // await ido.setStartTime(momentNow.add(10, "days").unix()); // 2022-09-11
    // await ido.connect(operator).setEndTime(momentNow.add(9, "days").unix()); // 2022-09-20
    // await ido.connect(operator).setClaimTime(momentNow.add(2, "days").unix()); // 2022-09-22
    // await ido.connect(operator).setVestInfo(
    //   20,
    //   momentNow.add(3, "days").unix(), // 2022-09-25
    //   moment.duration(2, "weeks").asSeconds(),
    //   moment.duration(1, "weeks").asSeconds(),
    // );
    // await ido.connect(operator).setBaseAmount(100);
    // await ido.connect(operator).setMaxAmountPerUser(50);
    await ido.connect(operator).setWhitelistAmount(user0.address, 0);
    await ido.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]);

    // Users approve
    await busd.connect(user0).approve(ido.address, 1000);
    await busd.connect(user1).approve(ido.address, 1000);
    await busd.connect(user2).approve(ido.address, 1000);
    await seg.connect(projectOwner).approve(ido.address, 5000);
  });

  describe("Set IDO property", () => {
    it("Check to create IDO", async () => {
      idoProperty.fundToken = ethers.constants.AddressZero;
      await expect(idoFactory.createIDO(idoProperty)).to.be.revertedWith("IDO: token address is invalid");
      idoProperty.fundToken = busd.address;
      idoProperty.fundAmount = 0;
      await expect(idoFactory.createIDO(idoProperty)).to.be.revertedWith(
        "IDO: token amount is zero",
      );
    });

    it("Check operator to set property", async () => {
      const now: number = moment().unix();
      await expect(ido.connect(user0).setStartTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(ido.connect(user0).setEndTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(ido.connect(user0).setClaimTime(now)).to.be.revertedWith("IDO: caller is not operator");
      await expect(
        ido.connect(user0).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-08
          moment.duration(2, "weeks").asSeconds(),
          moment.duration(1, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: caller is not operator");
      await expect(ido.connect(user0).setBaseAmount(100)).to.be.revertedWith("IDO: caller is not operator");
      await expect(ido.connect(user0).setMaxAmountPerUser(100)).to.be.revertedWith("IDO: caller is not operator");
      await expect(ido.connect(user0).setSaleInfo(busd.address, 1000, seg.address, 5000)).to.be.revertedWith(
        "IDO: caller is not operator",
      );
      await expect(ido.connect(user0).setWhitelistAmount(user0.address, 0)).to.be.revertedWith(
        "IDO: caller is not operator",
      );
      await expect(
        ido.connect(user0).setWhitelistAmounts([user1.address, user2.address], [500, 300]),
      ).to.be.revertedWith("IDO: caller is not operator");
    });

    it("Check validation to set property", async () => {
      await expect(
        ido.connect(operator).setVestInfo(
          120,
          momentNow.add(17, "days").unix(), // 2022-09-25
          moment.duration(4, "weeks").asSeconds(),
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: tge must be smaller than 100");
      await expect(
        ido.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-25
          0,
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: duration must be greater than zero");
      await expect(
        ido.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-25
          moment.duration(3, "weeks").asSeconds(),
          moment.duration(2, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: duration must be a multiple of periodicity");
      await expect(ido.connect(operator).setSaleInfo(busd.address, 0, seg.address, 0)).to.be.revertedWith(
        "IDO: token amount is zero",
      );
      await expect(ido.connect(operator).setWhitelistAmounts([user1.address, user2.address], [500])).to.be.revertedWith(
        "IDO: invalid whitelisted users' info",
      );
    });

    it("Fund time is not yet.", async () => {
      await expect(ido.connect(user0).fund(100)).to.be.revertedWith("IDO: time is not yet");
    });
  });

  describe("Check time when set and update property", () => {
    it("Check fund round time", async () => {
      let startTime = momentNow.subtract(14, "days").unix();
      let endTime = momentNow.add(9, "days").unix();
      let tierFundTime = (endTime - startTime) / 3 + startTime;
      let whitelistedFundTime = ((endTime - startTime) * 2) / 3 + startTime;
      expect(await ido.getTierFundTime()).to.equal(tierFundTime);
      expect(await ido.getWhitelistedFundTime()).to.equal(whitelistedFundTime);

      endTime = momentNow.add(1, "days").unix();
      tierFundTime = (endTime - startTime) / 3 + startTime;
      whitelistedFundTime = ((endTime - startTime) * 2) / 3 + startTime;
      await ido.setEndTime(endTime);
      expect(await ido.getTierFundTime()).to.equal(tierFundTime);
      expect(await ido.getWhitelistedFundTime()).to.equal(whitelistedFundTime);

      startTime = momentNow.subtract(8, "days").unix();
      tierFundTime = (endTime - startTime) / 3 + startTime;
      whitelistedFundTime = ((endTime - startTime) * 2) / 3 + startTime;
      await ido.setStartTime(startTime);
      expect(await ido.getTierFundTime()).to.equal(tierFundTime);
      expect(await ido.getWhitelistedFundTime()).to.equal(whitelistedFundTime);
    });

    it("The setting time must be greater than related time", async () => {
      await expect(ido.connect(operator).setStartTime(momentNow.subtract(26, "days").unix())).to.be.revertedWith(
        "IDO: start time must be greater than now", // 2022-08-31
      );
      await expect(ido.connect(operator).setEndTime(momentNow.add(8, "days").unix())).to.be.revertedWith(
        "IDO: end time must be greater than start time", // 2022-09-08
      );
      await expect(ido.connect(operator).setClaimTime(momentNow.unix())).to.be.revertedWith(
        "IDO: claim time must be greater than end time", // 2022-09-08
      );
      await expect(
        ido.connect(operator).setVestInfo(
          20,
          momentNow.unix(), // 2022-09-08
          moment.duration(2, "weeks").asSeconds(),
          moment.duration(1, "weeks").asSeconds(),
        ),
      ).to.be.revertedWith("IDO: cliff time must be greater than claim time");
    });

    it("The setting time is out", async () => {
      /* After start time */
      timeTravel(moment.duration(12, "days").asSeconds());
      await expect(ido.setStartTime(momentNow.unix())).to.be.revertedWith("IDO: time is out");
      await expect(ido.setBaseAmount(100)).to.be.revertedWith("IDO: time is out");
      await expect(ido.setMaxAmountPerUser(100)).to.be.revertedWith("IDO: time is out");
      await expect(ido.setSaleInfo(busd.address, 1000, seg.address, 5000)).to.be.revertedWith("IDO: time is out");
      await expect(ido.setWhitelistAmount(user0.address, 0)).to.be.revertedWith("IDO: time is out");
      await expect(ido.setWhitelistAmounts([user1.address, user2.address], [500, 300])).to.be.revertedWith(
        "IDO: time is out",
      );
      /* After end time */
      timeTravel(moment.duration(10, "days").asSeconds());
      await expect(ido.setEndTime(momentNow.unix())).to.be.revertedWith("IDO: time is out");
      /* After claim time */
      timeTravel(moment.duration(5, "days").asSeconds());
      await expect(ido.setClaimTime(momentNow.unix())).to.be.revertedWith("IDO: time is out");
      /* After cliff time */
      timeTravel(moment.duration(5, "days").asSeconds());
      await expect(
        ido
          .connect(operator)
          .setVestInfo(
            20,
            momentNow.unix(),
            moment.duration(2, "weeks").asSeconds(),
            moment.duration(1, "weeks").asSeconds(),
          ),
      ).to.be.revertedWith("IDO: time is out");
    });
  });

  describe("Test Fund", () => {
    let contractNow: number;
    let endTime: BigNumber;
    let tierFundTime: BigNumber;
    let whitelistedFundTime: BigNumber;

    beforeEach(async () => {
      timeTravel(moment.duration(11, "days").asSeconds());
      contractNow = await getLatestBlockTimestamp();
      endTime = (await ido.getIDOProperty()).endTime;
      tierFundTime = await ido.getTierFundTime();
      whitelistedFundTime = await ido.getWhitelistedFundTime();
    });

    describe("Check to fund", () => {
      it("Users can fund a specified amount", async () => {
        /* user's fund amount = 10000 > 1000 = Total fund amount */
        await expect(ido.connect(user0).fund(10000)).to.be.revertedWith("IDO: fund amount is greater than the rest");
        expect(await busd.balanceOf(ido.address)).to.equal(0);
      });

      it("Fund tiers", async () => {
        await expect(ido.connect(operator).fund(150)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user1).fund(100)).to.emit(ido, "Fund").withArgs(UserRole.Tier, user1.address, 100);
        expect(await busd.balanceOf(ido.address)).to.equal(100);
        await expect(ido.connect(user1).fund(500)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user2).fund(800)).to.be.revertedWith("IDO: fund amount is too much");
        expect(await busd.balanceOf(ido.address)).to.equal(100);
      });

      it("Fund whitelisted users", async () => {
        if (contractNow < tierFundTime.toNumber()) timeTravel(tierFundTime.toNumber() - contractNow);
        await expect(ido.connect(user0).fund(100)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user1).fund(100))
          .to.emit(ido, "Fund")
          .withArgs(UserRole.WhitelistedUser, user1.address, 100);
        expect(await busd.balanceOf(ido.address)).to.equal(100);
        await expect(ido.connect(user1).fund(500)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user2).fund(600)).to.be.revertedWith("IDO: fund amount is too much");
        expect(await busd.balanceOf(ido.address)).to.equal(100);
      });

      it("Fund any users", async () => {
        if (contractNow < whitelistedFundTime.toNumber()) timeTravel(whitelistedFundTime.toNumber() - contractNow);
        await expect(ido.connect(user2).fund(550)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user1).fund(50)).to.emit(ido, "Fund").withArgs(UserRole.FCFS, user1.address, 50);
        expect(await busd.balanceOf(ido.address)).to.equal(50);
        await expect(ido.connect(user1).fund(50)).to.be.revertedWith("IDO: fund amount is too much");
        await expect(ido.connect(user0).fund(150)).to.be.revertedWith("IDO: fund amount is too much");
        expect(await busd.balanceOf(ido.address)).to.equal(50);
      });

      it("Fund when emergency refund", async () => {
        await ido.emergencyRefund();
        expect(await ido.getState()).to.be.equal(State.FAILURE);
        expect(await busd.balanceOf(ido.address)).to.equal(0);
        await expect(ido.connect(user2).fund(10)).to.be.revertedWith("IDO: funder can't fund");
      });

      it("Users can't fund after fund time", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        expect(await busd.balanceOf(ido.address)).to.equal(0);
        await expect(ido.connect(user1).fund(100)).to.be.revertedWith("IDO: time has already passed");
        expect(await busd.balanceOf(ido.address)).to.equal(0);
      });

      it("Users can refund when IDO is failure", async () => {
        await expect(ido.connect(user1).fund(100)).to.emit(ido, "Fund").withArgs(UserRole.Tier, user1.address, 100);
        await expect(ido.connect(user1).refund()).to.be.revertedWith("IDO: state is not failure");
        await expect(ido.connect(user0).refund()).to.be.revertedWith("IDO: there is no token for you");
        expect(await busd.balanceOf(ido.address)).to.equal(100);
      });

      it("Users can claim when IDO is success", async () => {
        await expect(ido.connect(user1).fund(100)).to.emit(ido, "Fund").withArgs(UserRole.Tier, user1.address, 100);
        await expect(ido.connect(user1).claim()).to.be.revertedWith("IDO: claim time is not yet");
        timeTravel(moment.duration(15, "days").asSeconds());
        expect(await ido.getState()).to.equal(State.WAITING);
        await expect(ido.connect(user1).claim()).to.be.revertedWith("IDO: state is not success");
      });
    });

    describe("Check to finalize IDO", () => {
      it("Caller must be IDOfactory owner.", async () => {
        await expect(
          ido.connect(operator).finalize(projectOwner.address, finalizer.address, recipient.address, 101),
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Fee percent must be smaller than 100", async () => {
        await expect(ido.finalize(projectOwner.address, finalizer.address, recipient.address, 101)).to.be.revertedWith(
          "IDO: fee percent must be smaller than 100",
        );
      });

      it("Fund time is not ended yet", async () => {
        await expect(ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10)).to.be.revertedWith(
          "IDO: IDO is not ended yet",
        );
      });

      it("After call emergency refund", async () => {
        await ido.emergencyRefund();
        await expect(ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10)).to.be.revertedWith(
          "IDO: IDO has already ended",
        );
      });

      it("After finalize", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        await ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10);
        await expect(ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10)).to.be.revertedWith(
          "IDO: IDO has already ended",
        );
      });

      it("Check state IDO after finalize", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        expect(await busd.balanceOf(ido.address)).to.equal(0);
        await expect(ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10))
          .to.emit(ido, "Finalize")
          .withArgs(State.FAILURE);
      });
    });

    describe("Check to call emergency refund", () => {
      it("Caller must be IDOfactory owner.", async () => {
        await expect(ido.connect(operator).emergencyRefund()).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Already finished fund", async () => {
        timeTravel(moment.duration(10, "days").asSeconds());
        await expect(ido.emergencyRefund()).to.be.revertedWith("IDO: time is out");
      });
    });

    describe("Users refund when IDO is failure", () => {
      beforeEach(async () => {
        await ido.connect(user0).fund(100); // user0 is tier, now is for tier fund time
        await ido.connect(user1).fund(400); // user0 is tier, now is for tier fund time
        timeTravel(moment.duration(10, "days").asSeconds());
        await ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10);
      });

      it("Check IDO state", async () => {
        expect(await busd.balanceOf(ido.address)).to.equal(500);
        // 100 + 400 = 500 < 1000 * 0.51 = 510 => failure
        expect(await ido.getState()).to.equal(State.FAILURE);
      });

      it("Funders can't claim", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        await expect(ido.connect(user0).claim()).to.be.revertedWith("IDO: state is not success");
      });

      it("Funders refund the fund", async () => {
        await expect(ido.connect(user2).refund()).to.be.revertedWith("IDO: there is no token for you");
        await expect(ido.connect(user0).refund()).to.emit(ido, "ReFund").withArgs(user0.address, 100);
        await expect(ido.connect(user1).refund()).to.emit(ido, "ReFund").withArgs(user1.address, 400);
        await expect(ido.connect(user0).refund()).to.be.revertedWith("IDO: there is no token for you");
        await expect(ido.connect(user1).refund()).to.be.revertedWith("IDO: there is no token for you");
        /* After refund, balance of IDO is zero. */
        expect(await busd.balanceOf(ido.address)).to.equal(0);
      });
    });

    describe("Users claim when IDO is success", () => {
      beforeEach(async () => {
        /* tiers fund */
        await ido.connect(user0).fund(100);
        await ido.connect(user1).fund(400);
        timeTravel(tierFundTime.toNumber() - contractNow);
        /* whiitlisted users fund */
        await ido.connect(user1).fund(100);
        await ido.connect(user2).fund(300);
        timeTravel(whitelistedFundTime.toNumber() - tierFundTime.toNumber());
        /* any users */
        await ido.connect(user0).fund(50);
        await ido.connect(user1).fund(50);
        timeTravel(endTime.toNumber() - whitelistedFundTime.toNumber());
        /* finalize the IDO */
        await ido.finalize(projectOwner.address, finalizer.address, recipient.address, 10);
      });

      it("Check IDO state", async () => {
        /* 100 + 400 + 100 + 300 + 50 + 50 = 1000 => IDO is SUCCESS! */
        expect(await ido.getState()).to.equal(State.SUCCESS);
        expect(await busd.balanceOf(ido.address)).to.equal(0);
        expect(await seg.balanceOf(ido.address)).to.equal(5000);
      });

      it("Funder can't claim before claim time", async () => {
        await expect(ido.connect(user0).claim()).to.be.revertedWith("IDO: claim time is not yet");
        expect(await seg.balanceOf(user0.address)).to.equal(0);
      });

      it("Funders claim sale tokens normally", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        // user0's claimable: 150 = (100 + 50) * 5 * 0.2
        await expect(ido.connect(user0).claim()).to.emit(ido, "Claim").withArgs(user0.address, 150);
        expect(await seg.balanceOf(ido.address)).to.equal(4850); // 5000 - 150
        expect(await seg.balanceOf(user0.address)).to.equal(150);
        // user1's claimable: 550 = (400 + 100 + 50) * 5 * 0.2
        await expect(ido.connect(user1).claim()).to.emit(ido, "Claim").withArgs(user1.address, 550);
        expect(await seg.balanceOf(ido.address)).to.equal(4300); // 4850 - 550
        expect(await seg.balanceOf(user1.address)).to.equal(550);
        await expect(ido.connect(user1).claim()).to.be.revertedWith(
          "IDO: there is no token for you to claim this time.",
        );
        // after cliff time and first periodicity
        timeTravel(moment.duration(10, "days").asSeconds());
        // user0's claimable: 300 = 0 + 750 * (1 - 0.2) / 2
        await expect(ido.connect(user0).claim()).to.emit(ido, "Claim").withArgs(user0.address, 300);
        expect(await seg.balanceOf(ido.address)).to.equal(4000); // 4300 - 300
        expect(await seg.balanceOf(user0.address)).to.equal(450);
        // user1's claimable: 1100 = 0 + 2750 * (1 - 0.2) / 2
        await expect(ido.connect(user1).claim()).to.emit(ido, "Claim").withArgs(user1.address, 1100);
        expect(await seg.balanceOf(ido.address)).to.equal(2900); // 4000 - 1100
        expect(await seg.balanceOf(user1.address)).to.equal(1650);
        // user2's claimable: 900 = 300 * 5 * 0.2 + 300 * 5 * (1 - 0.2) / 2
        await expect(ido.connect(user2).claim()).to.emit(ido, "Claim").withArgs(user2.address, 900);
        expect(await seg.balanceOf(ido.address)).to.equal(2000); // 2900 - 900
        expect(await seg.balanceOf(user2.address)).to.equal(900);
      });

      it("Funders claim after claim time", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        // user0's claimable: 150 = (100 + 50) * 5 * 0.2
        await expect(ido.connect(user0).claim()).to.emit(ido, "Claim").withArgs(user0.address, 150);
        expect(await seg.balanceOf(ido.address)).to.equal(4850); // 5000 - 150
        expect(await seg.balanceOf(user0.address)).to.equal(150);
        // user1's claimable: 550 = (400 + 100 + 50) * 5 * 0.2
        await expect(ido.connect(user1).claim()).to.emit(ido, "Claim").withArgs(user1.address, 550);
        expect(await seg.balanceOf(ido.address)).to.equal(4300); // 4850 - 550
        expect(await seg.balanceOf(user1.address)).to.equal(550);
        // user2'claimable: 300 = 300 * 5 * 0.2
        await expect(ido.connect(user2).claim()).to.emit(ido, "Claim").withArgs(user2.address, 300);
        expect(await seg.balanceOf(ido.address)).to.equal(4000); // 4300 - 300
        expect(await seg.balanceOf(user2.address)).to.equal(300);
      });

      it("Funders claim after cliff time", async () => {
        timeTravel(moment.duration(12, "days").asSeconds());
        // user0's claimable: 450 = (100 + 50) * 5 * 0.2 + 750 * (1 - 0.2) / 2
        await expect(ido.connect(user0).claim()).to.emit(ido, "Claim").withArgs(user0.address, 450);
        expect(await seg.balanceOf(ido.address)).to.equal(4550); // 5000 - 450
        expect(await seg.balanceOf(user0.address)).to.equal(450);
        // user1's claimable: 1650 = (400 + 100 + 50) * 5 * 0.2 + 2750 * (1 - 0.2) / 2
        await expect(ido.connect(user1).claim()).to.emit(ido, "Claim").withArgs(user1.address, 1650);
        expect(await seg.balanceOf(ido.address)).to.equal(2900); // 4550 - 1650
        expect(await seg.balanceOf(user1.address)).to.equal(1650);
        // user2'claimable: 900 = 300 * 5 * 0.2 + 300 * 5 * (1 - 0.2) / 2
        await expect(ido.connect(user2).claim()).to.emit(ido, "Claim").withArgs(user2.address, 900);
        expect(await seg.balanceOf(ido.address)).to.equal(2000); // 2900 - 900
        expect(await seg.balanceOf(user2.address)).to.equal(900);
      });

      it("Funders can't claim twice at a time", async () => {
        timeTravel(moment.duration(2, "days").asSeconds());
        await ido.connect(user0).claim();
        await expect(ido.connect(user0).claim()).to.be.revertedWith(
          "IDO: there is no token for you to claim this time.",
        );
        await ido.connect(user1).claim();
        await expect(ido.connect(user1).claim()).to.be.revertedWith(
          "IDO: there is no token for you to claim this time.",
        );
      });

      it("Funders can't refund the fund token", async () => {
        await expect(ido.connect(user0).refund()).to.be.revertedWith("IDO: state is not failure");
        expect(await ido.getState()).to.equal(State.SUCCESS);
      });
    });
  });
});
