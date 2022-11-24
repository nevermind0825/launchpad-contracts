import { ethers } from "hardhat";

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
} from "../typechain";

async function main() {
  /* Point contract deploy. */
  const pointFactory: Point__factory = await ethers.getContractFactory("Point");
  const point = <Point>await pointFactory.deploy();
  await point.deployed();
  console.log(`Point deployed to ${point.address}`);

  /* Deploy contracts for user's point. */
  const playFactory: Play__factory = await ethers.getContractFactory("Play");
  const play = <Play>await playFactory.deploy(20000); // set initail supply of Play token as 20000.
  await play.deployed();
  console.log(`Token Play deployed to ${play.address}`);

  const playBUSDFactory: PlayBUSD__factory = await ethers.getContractFactory("PlayBUSD");
  const playBUSD = <PlayBUSD>await playBUSDFactory.deploy(20000); // set initail supply of PlayBUSD token as 20000.
  await playBUSD.deployed();
  console.log(`Token PlayBUSD deployed to ${playBUSD.address}`);

  // Deploy tier contract.
  const tierFactory: Tier__factory = await ethers.getContractFactory("Tier");
  const tier = <Tier>await tierFactory.deploy();
  await tier.deployed();
  console.log(`Tier deployed to ${tier.address}`);

  /* Deploy IDOFactory contract */
  const idoFactoryFactory: IDOFactory__factory = await ethers.getContractFactory("IDOFactory");
  const idoFactory = <IDOFactory>await idoFactoryFactory.deploy(tier.address, point.address);
  await idoFactory.deployed();
  console.log(`IDOFactory deployed to ${idoFactory.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
