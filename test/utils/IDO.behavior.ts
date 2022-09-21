import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Contract } from "ethers";

import { PLAY_WEIGHT, PLAYBUSD_WEIGHT } from './constants';

export const initPoint = async (
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Contract, Contract, Contract]> => {
  // Point contract deploy.
  const point = await ethers.getContractFactory("Point");
  const Point = await point.deploy(); // set decimal as 1.
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
  await Play.transfer(user0.address, 200);
  await Play.transfer(user1.address, 1000);
  user2 && (await Play.transfer(user2.address, 1000));
  await PlayBUSD.transfer(user0.address, 50);
  await PlayBUSD.transfer(user1.address, 30);

  return [Point, Play, PlayBUSD];
};

export const insertTokenForPoint = async (Point: Contract, Play: Contract, PlayBUSD: Contract): Promise<void> => {
  await Point.insertToken(Play.address, PLAY_WEIGHT);
  await Point.insertToken(PlayBUSD.address, PLAYBUSD_WEIGHT);
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
  const [Tier, Point, Play, PlayBUSD] = await initTier(user0, user1, user2);

  // deploy IDOFactory contract
  const idoFactory = await ethers.getContractFactory("IDOFactory");
  const IDOFactory = await idoFactory.deploy(Tier.address, Point.address);
  await IDOFactory.deployed();

  // Insert operator
  await IDOFactory.setOperator(operator.address, true);

  return [IDOFactory, Tier, Point, Play, PlayBUSD];
};
