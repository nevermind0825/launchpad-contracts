import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Contract } from "ethers";

export const initPoint = async (
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Contract, Contract, Contract]> => {
  // Point contract deploy.
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

  // Transfer tokens
  await Play.transfer(user0.address, 1000);
  await Play.transfer(user1.address, 1000);
  user2 && (await Play.transfer(user2.address, 1000));
  await PlayBUSD.transfer(user0.address, 500);
  await PlayBUSD.transfer(user1.address, 300);

  return [Point, Play, PlayBUSD];
};

export const insertTokenForPoint = async (Point: Contract, Play: Contract, PlayBUSD: Contract): Promise<void> => {
  await Point.insertToken(Play.address, 8);
  await Point.insertToken(PlayBUSD.address, 15);
};

export const initTier = async (
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Contract, Contract, Contract, Contract]> => {
  const [Point, Play, PlayBUSD] = await initPoint(user0, user1, user2);
  await insertTokenForPoint(Point, Play, PlayBUSD);

  // Deploy tier contract.
  const tier = await ethers.getContractFactory("Tier");
  const Tier = await tier.deploy();
  await Tier.deployed();

  return [Tier, Point, Play, PlayBUSD];
};

export const initIDOFactory = async (
  operator: SignerWithAddress,
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Contract, Contract, Contract, Contract, Contract]> => {
  const [Tier, Point, Play, PlayBUSD] = await initTier(user0, user1, user2 || undefined);

  // deploy IDOFactory contract
  const idoFactory = await ethers.getContractFactory("IDOFactory");
  const IDOFactory = await idoFactory.deploy(Tier.address, Point.address);
  await IDOFactory.deployed();

  // Insert operator
  await IDOFactory.insertOperator(operator.address);

  return [IDOFactory, Tier, Point, Play, PlayBUSD];
};
