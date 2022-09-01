import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import moment from "moment";

import { timeTravel } from "./helper";

describe("IDO test", async () => {
  let IDOFactory: Contract;
  let IDO: Contract;
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
  let user2: SignerWithAddress;

  beforeEach(async () => {
    [owner, operator, recipient, finalizer, user0, user1, user2] = await ethers.getSigners();

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
    await Play.transfer(user0.address, 1000);
    await Play.transfer(user1.address, 1000);
    await Play.transfer(user2.address, 1000);

    await PlayBUSD.transfer(user0.address, 300);
    await PlayBUSD.transfer(user1.address, 500);

    // Add tokens
    await Point.insertToken(PlayBUSD.address, 10);

    // Create IDO
    await PlayBUSD.transfer(owner.address, 5000);
    await IDOFactory.connect(owner).insertOperator(operator.address);
    await IDOFactory.connect(operator).createIDO(Play.address, 1000, PlayBUSD.address, 5000);
    await IDOFactory.setFeeRecipient(recipient.address);
    await IDOFactory.setFeePercent(10);
    const idoAddr = await IDOFactory.getIDO(0);
    const ido = await ethers.getContractFactory("IDO");
    IDO = ido.attach(idoAddr);

    // Users approve
    await Play.connect(user0).approve(IDO.address, 1000);
    await Play.connect(user1).approve(IDO.address, 1000);
    await Play.connect(user2).approve(IDO.address, 1000);

    await PlayBUSD.approve(IDO.address, 5000);
  });

  it("Check operator when you init IDO property", async () => {
    const now = moment().unix();
    await expect(IDO.setStartTime(now)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setEndTime(now)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setClaimTime(now)).to.be.revertedWith("IDO: caller is not operator");
    await expect(
      IDO.setVestInfo(20, now, moment.duration(2, "weeks").asSeconds(), moment.duration(1, "weeks").asSeconds()),
    ).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setBaseAmount(10)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setMaxAmountPerUser(10)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setSaleInfo(10, 500)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setWhitelistAmount(user0.address, 0)).to.be.revertedWith("IDO: caller is not operator");
    await expect(IDO.setWhitelistAmounts([user1.address, user2.address], [200, 500])).to.be.revertedWith(
      "IDO: caller is not operator",
    );
  });

  it("Init IDO property and check validation", async () => {
    const contractNow = await IDO.getNowTime();
    const momentNow = moment.unix(contractNow.toNumber()); // 2022-09-01
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

    await expect(IDO.connect(operator).setStartTime(momentNow.subtract(25, "days").unix())).to.be.revertedWith(
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

    timeTravel(moment.duration(12, "days").asSeconds());
    await expect(IDO.connect(operator).setStartTime(momentNow.subtract(14, "days").unix())).to.be.revertedWith(
      "IDO: time is out", // 2022-09-11
    );

    await expect(IDO.connect(operator).setBaseAmount(100)).to.be.revertedWith("IDO: time is out");
    await expect(IDO.connect(operator).setMaxAmountPerUser(100)).to.be.revertedWith("IDO: time is out");
    await expect(IDO.connect(operator).setSaleInfo(1000, 5000)).to.be.revertedWith("IDO: time is out");
    await expect(IDO.connect(operator).setWhitelistAmount(user0.address, 0)).to.be.revertedWith("IDO: time is out");
    await expect(
      IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]),
    ).to.be.revertedWith("IDO: time is out");

    timeTravel(moment.duration(9, "days").asSeconds());
    await expect(IDO.connect(operator).setEndTime(momentNow.add(9, "days").unix())).to.be.revertedWith(
      "IDO: time is out", // 2022-09-20
    );

    timeTravel(moment.duration(3, "days").asSeconds());
    await expect(IDO.connect(operator).setClaimTime(momentNow.add(2, "days").unix())).to.be.revertedWith(
      "IDO: time is out", // 2022-09-22
    );

    timeTravel(moment.duration(4, "days").asSeconds());
    await expect(
      IDO.connect(operator).setVestInfo(
        20,
        momentNow.add(3, "days").unix(), // 2022-09-25
        moment.duration(2, "weeks").asSeconds(),
        moment.duration(1, "weeks").asSeconds(),
      ),
    ).to.be.revertedWith("IDO: time is out");
  });

  it("Fund test", async () => {
    const contractNow = await IDO.getNowTime();
    const momentNow = moment.unix(contractNow.toNumber());
    await IDO.connect(operator).setStartTime(momentNow.add(1, "days").unix());
    await IDO.connect(operator).setEndTime(momentNow.add(10, "days").unix());
    await IDO.connect(operator).setClaimTime(momentNow.add(2, "days").unix());
    await IDO.connect(operator).setVestInfo(
      20,
      momentNow.add(3, "days").unix(),
      moment.duration(2, "weeks").asSeconds(),
      moment.duration(1, "weeks").asSeconds(),
    );
    await IDO.connect(operator).setBaseAmount(100);
    await IDO.connect(operator).setMaxAmountPerUser(50);
    await IDO.connect(operator).setSaleInfo(1000, 5000);
    await IDO.connect(operator).setWhitelistAmount(user0.address, 0);
    await IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]);

    await expect(IDO.fund(user0.address, 100)).to.be.revertedWith("IDO: time is not yet");
    timeTravel(moment.duration(1, "days").asSeconds());
    await expect(IDO.fund(user0.address, 10000)).to.be.revertedWith("IDO: fund amount is greater than the rest");
    // console.log(await IDO.getNowTime());

    // any users
    await expect(IDO.fund(user2.address, 150)).to.be.revertedWith("IDO: fund amount is too much");
    await IDO.fund(user0.address, 50);
    await IDO.fund(user1.address, 50);

    timeTravel(8 * 3600);

    // tiers
    await expect(IDO.fund(user0.address, 200)).to.be.revertedWith("IDO: fund amount is too much");
    await IDO.fund(user0.address, 100);
    await IDO.fund(user1.address, 300);

    timeTravel(8 * 3600);

    // Whitelisted users
    await expect(IDO.fund(user0.address, 100)).to.be.revertedWith("IDO: fund amount is too much");
    await IDO.fund(user1.address, 100);
    await IDO.fund(user2.address, 300);

    await IDOFactory.emergencyRefund(0);
    await expect(IDO.fund(user2.address, 10)).to.be.revertedWith("IDO: funder can't fund");
    timeTravel(moment.duration(10, "days").asSeconds());
    await expect(IDO.fund(user1.address, 100)).to.be.revertedWith("IDO: time has already passed");
  });

  it("IDO is failure and funders refund", async () => {
    const contractNow = await IDO.getNowTime();
    const momentNow = moment.unix(contractNow.toNumber());
    await IDO.connect(operator).setStartTime(momentNow.add(1, "days").unix());
    await IDO.connect(operator).setEndTime(momentNow.add(10, "days").unix());
    await IDO.connect(operator).setClaimTime(momentNow.add(2, "days").unix());
    await IDO.connect(operator).setVestInfo(
      20,
      momentNow.add(3, "days").unix(),
      moment.duration(2, "weeks").asSeconds(),
      moment.duration(1, "weeks").asSeconds(),
    );
    await IDO.connect(operator).setBaseAmount(100);
    await IDO.connect(operator).setMaxAmountPerUser(50);
    await IDO.connect(operator).setSaleInfo(1000, 5000);
    await IDO.connect(operator).setWhitelistAmount(user0.address, 0);
    await IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]);
    timeTravel(moment.duration(1, "days").asSeconds());

    // Whitelisted users
    await IDO.fund(user1.address, 100);
    await IDO.fund(user2.address, 300);

    await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith("IDO: IDO is not ended yet");

    timeTravel(moment.duration(10, "days").asSeconds());
    await IDOFactory.finalizeIDO(0, finalizer.address);
    expect(await IDO.getState()).to.equal(2); // 0: Waiting, 1: Success, 2: Failure
    await expect(IDOFactory.finalizeIDO(0, finalizer.address)).to.be.revertedWith("IDO: IDO has already ended");

    timeTravel(moment.duration(2, "days").asSeconds());
    await expect(IDO.claim(user1.address, 150)).to.be.revertedWith("IDO: state is not success");

    await expect(IDO.refund(user0.address)).to.be.revertedWith("IDO: user didn't fund");
    await IDO.refund(user1.address);
  });

  it("IDO is success and funders claim", async () => {
    const contractNow = await IDO.getNowTime();
    const momentNow = moment.unix(contractNow.toNumber());
    await IDO.connect(operator).setStartTime(momentNow.add(1, "days").unix());
    await IDO.connect(operator).setEndTime(momentNow.add(10, "days").unix());
    await IDO.connect(operator).setClaimTime(momentNow.add(2, "days").unix());
    await IDO.connect(operator).setVestInfo(
      20,
      momentNow.add(3, "days").unix(),
      moment.duration(2, "weeks").asSeconds(),
      moment.duration(1, "weeks").asSeconds(),
    );
    await IDO.connect(operator).setBaseAmount(100);
    await IDO.connect(operator).setMaxAmountPerUser(50);
    await IDO.connect(operator).setSaleInfo(1000, 5000);
    await IDO.connect(operator).setWhitelistAmount(user0.address, 0);
    await IDO.connect(operator).setWhitelistAmounts([user1.address, user2.address], [200, 500]);
    timeTravel(moment.duration(1, "days").asSeconds());

    // Whitelisted users
    await IDO.fund(user1.address, 100);
    await IDO.fund(user2.address, 300);

    timeTravel(8 * 3600);

    // any users
    await IDO.fund(user0.address, 50);
    await IDO.fund(user1.address, 50);

    timeTravel(8 * 3600);

    // tiers
    await IDO.fund(user0.address, 100);
    await IDO.fund(user1.address, 400);

    timeTravel(moment.duration(10, "days").asSeconds());
    await IDOFactory.finalizeIDO(0, finalizer.address);
    expect(await IDO.getState()).to.equal(1); // 0: Waiting, 1: Success, 2: Failure

    // Funders claim
    await expect(IDO.claim(user0.address, 150)).to.be.revertedWith("IDO: claim time is not yet");
    timeTravel(moment.duration(2, "days").asSeconds());
    await expect(IDO.claim(user0.address, 200)).to.be.revertedWith("IDO: claim amount is greater than the rest");

    await IDO.claim(user0.address, 150);
    await IDO.claim(user1.address, 550);

    await expect(IDO.refund(user0.address)).to.be.revertedWith("IDO: state is not failure");
  });
});
