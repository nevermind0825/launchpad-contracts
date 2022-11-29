import hre, { ethers } from "hardhat";
import { unlockAccount } from "../test/utils/helpers";

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
  let myAddress = "0x15cc30148CfD8f9362E76eF9F623c408070838Bb";
  myAddress = await unlockAccount(myAddress);
  const [user0] = await ethers.getSigners();
  user0.sendTransaction({ to: myAddress, value: ethers.utils.parseEther("10") });
  const deployer = await ethers.getSigner(myAddress);

  /******** Deploy tokens for user's point **************/
  const playFactory: Play__factory = await ethers.getContractFactory("Play");
  const play = <Play>await playFactory.connect(deployer).deploy(20000); // set initail supply of Play token as 20000.
  await play.deployed();
  console.log(`Token Play deployed to ${play.address}`);

  const playBUSDFactory: PlayBUSD__factory = await ethers.getContractFactory("PlayBUSD");
  const playBUSD = <PlayBUSD>await playBUSDFactory.connect(deployer).deploy(20000); // set initail supply of PlayBUSD token as 20000.
  await playBUSD.deployed();
  console.log(`Token PlayBUSD deployed to ${playBUSD.address}`);
  /******************************************************/

  /************ Deploy tokens for IDO exchange **********/
  const busdFactory: BUSD__factory = await ethers.getContractFactory("BUSD");
  const busd = <BUSD>await busdFactory.connect(deployer).deploy(100000);
  await busd.deployed();
  console.log(`Token BUSD deployed to ${busd.address}`);

  const segFactory: SEG__factory = await ethers.getContractFactory("SEG");
  const seg = <SEG>await segFactory.connect(deployer).deploy(100000);
  await seg.deployed();
  console.log(`Token SEG deployed to ${seg.address}`);
  /******************************************************/

  /*************** Deploy Point contract ****************/
  const pointFactory: Point__factory = await ethers.getContractFactory("Point");
  const point = <Point>await pointFactory.connect(deployer).deploy();
  await point.deployed();
  console.log(`Point deployed to ${point.address}`);
  /******************************************************/

  /************* Deploy Tier contract *******************/
  const tierFactory: Tier__factory = await ethers.getContractFactory("Tier");
  const tier = <Tier>await tierFactory.connect(deployer).deploy();
  await tier.deployed();
  console.log(`Tier deployed to ${tier.address}`);
  /******************************************************/

  /************ Deploy IDOFactory contract **************/
  const idoFactoryFactory: IDOFactory__factory = await ethers.getContractFactory("IDOFactory");
  const idoFactory = <IDOFactory>await idoFactoryFactory.connect(deployer).deploy(tier.address, point.address);
  await idoFactory.deployed();
  console.log(`IDOFactory deployed to ${idoFactory.address}`);
  /******************************************************/
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
