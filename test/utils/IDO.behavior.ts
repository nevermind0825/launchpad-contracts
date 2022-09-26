import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import { PLAY_WEIGHT, PLAYBUSD_WEIGHT } from "./constants";
import {
  Play,
  Play__factory,
  PlayBUSD,
  PlayBUSD__factory,
  Point,
  Point__factory,
  Tier,
  Tier__factory,
  IDOFactory,
  IDOFactory__factory,
  BUSD,
  BUSD__factory,
  SEG,
  SEG__factory,
} from "../../typechain";

export const initPoint = async (
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Point, Play, PlayBUSD]> => {
  /* Point contract deploy. */
  const pointFactory: Point__factory = await ethers.getContractFactory("Point");
  const point = <Point>await pointFactory.deploy();

  /* Deploy contracts for user's point. */
  const playFactory: Play__factory = await ethers.getContractFactory("Play");
  const play = <Play>await playFactory.deploy(20000); // set initail supply of Play token as 20000.

  const playBUSDFactory: PlayBUSD__factory = await ethers.getContractFactory("PlayBUSD");
  const playBUSD = <PlayBUSD>await playBUSDFactory.deploy(20000); // set initail supply of PlayBUSD token as 20000.

  /* Insert tokens for user's point */
  await point.insertToken(play.address, PLAY_WEIGHT);
  await point.insertToken(playBUSD.address, PLAYBUSD_WEIGHT);

  /* Transfer tokens for user's point */
  await play.transfer(user0.address, 200);
  await play.transfer(user1.address, 100);
  user2 && (await play.transfer(user2.address, 100));
  await playBUSD.transfer(user0.address, 50);
  await playBUSD.transfer(user1.address, 30);

  return [point, play, playBUSD];
};

export const initTier = async (
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[Tier, Point]> => {
  const [point] = await initPoint(user0, user1, user2);

  // Deploy tier contract.
  const tierFactory: Tier__factory = await ethers.getContractFactory("Tier");
  const tier = <Tier>await tierFactory.deploy();

  return [tier, point];
};

export const initIDOFactory = async (
  operator: SignerWithAddress,
  user0: SignerWithAddress,
  user1: SignerWithAddress,
  user2?: SignerWithAddress,
): Promise<[IDOFactory, Tier, Point, BUSD, SEG]> => {
  const [tier, point] = await initTier(user0, user1, user2);

  /* Deploy IDOFactory contract */
  const idoFactoryFactory: IDOFactory__factory = await ethers.getContractFactory("IDOFactory");
  const idoFactory = <IDOFactory>await idoFactoryFactory.deploy(tier.address, point.address);

  /* Deploy tokens for IDO exchange */
  const busdFactory: BUSD__factory = await ethers.getContractFactory("BUSD");
  const busd = <BUSD>await busdFactory.deploy(100000);

  const segFactory: SEG__factory = await ethers.getContractFactory("SEG");
  const seg = <BUSD>await segFactory.deploy(100000);

  /* Transer tokens for IDO exchange */
  await busd.transfer(user0.address, 1000);
  await busd.transfer(user1.address, 1000);
  user2 && (await busd.transfer(user2.address, 1000));

  /* Insert operator */
  await idoFactory.setOperator(operator.address, true);

  return [idoFactory, tier, point, busd, seg];
};
