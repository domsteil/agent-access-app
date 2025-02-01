import { ethers, Network } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(
  "https://base-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
  { name: 'base', chainId: 8453 }
);

const contractAddress = "0x42bb446eae6dca7723a9ebdb81ea88afe77ef4b9";
const builderPool = "0x3082ff65dbbc9af673b283c31d546436e07875a57eaffa505ce04de42b279306"

const contractAbi = [
  "function usersData(address user, bytes32 builderPoolId) view returns (uint256 stake, uint256 lastStakeTimestamp)"
];
const contract = new ethers.Contract(contractAddress, contractAbi, provider);

export async function isStaked(addy: string) {
  try {
    const res = await contract.usersData(addy, builderPool);
    if (Number(ethers.formatEther(res[0])) > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return false;
  }
}
