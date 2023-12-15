import {
  VStack,
  InputGroup,
  Heading,
  Flex,
  Spinner,
  FormLabel,
  Input,
  Button,
  Tooltip
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Chain, allChains } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

// Add your constant values
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

function Home() {
  const [nftCollectionAddress, setNftCollection] = useState("");
  const [stakingContractAddress, setStakingContract] = useState("");
  const [allOwnersData, setAllOwnersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chainRef = useRef();

  const handleInputChange = (e, setterFunction) => {
    setterFunction(e.target.value);
  };

  const handleGetAllNFTs = async () => {
    try {
      setLoading(true);
      const chainSlug = chainRef.current?.value;
      if (!chainSlug || !nftCollectionAddress || !stakingContractAddress) {
        setLoading(false);
        return alert(
          "Please enter all the detais first!"
        );
      }
      const sdk = new ThirdwebSDK(chainSlug, {
        clientId: process.env.REACT_APP_TEMPLATE_CLIENT_ID,
      });
      const nftCollection = await sdk.getContract(nftCollectionAddress);
      const stakingContract = await sdk.getContract(stakingContractAddress);

      const owners = await nftCollection.erc721.getAllOwners();

      const filteredOwners = owners.filter(
        (owner) =>
          owner.owner !== stakingContractAddress &&
          owner.owner !== DEAD_ADDRESS
      );

      const stakedCount = owners.length - filteredOwners.length;

      const callsPerSecond = 100;
      const delayBetweenCalls = 1000 / callsPerSecond;

      async function processStakedData(startIndex) {
        const stakedOwners = [];
        for (let i = startIndex; i < stakedCount; i++) {
          try {
            const data = await stakingContract.call("stakersArray", [i]);
            const dataInfo = await stakingContract.call("getStakeInfo", [data]);

            stakedOwners.push(
              ...dataInfo._tokensStaked.map((token) => ({
                tokenId: parseInt(token.toString()),
                owner: data,
              }))
            );

            if ((i + 1) % callsPerSecond === 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, delayBetweenCalls)
              );
            }
          } catch (e) {
            console.error(e);
            break;
          }
        }
        return stakedOwners;
      }

      const stakedOwners = await processStakedData(0);

      setAllOwnersData([...filteredOwners, ...stakedOwners]);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const downloadAirdropContent = () => {
    const jsonContent = JSON.stringify(allOwnersData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapshot_for_airdrop_erc721.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Flex direction="column" align="center" justify="center" height="100vh">
      <Heading mb={6} color="white">
        Get All NFTs
      </Heading>
      <VStack spacing={4}>
        <FormLabel color="white">Your NFT Collection Address</FormLabel>
        <Input
          placeholder=""
          value={nftCollectionAddress}
          onChange={(e) => handleInputChange(e, setNftCollection)}
          color="white"
          bg="gray.800"
          _placeholder={{ color: "white" }}
        />
        <FormLabel color="white">Your Staking Collection Address</FormLabel>
        <Input
          placeholder=""
          value={stakingContractAddress}
          onChange={(e) => handleInputChange(e, setStakingContract)}
          color="white"
          bg="gray.800"
          _placeholder={{ color: "white" }}
        />
        <FormLabel color="white">Select Network</FormLabel>
        <InputGroup>
          <Input
            type="text"
            list="network-list"
            placeholder="Select a network"
            className="input input-bordered w-full px-3 py-2"
            ref={chainRef}
            color="white"
          />
        </InputGroup>
        <datalist id="network-list" color="white">
          {allChains.map((item) => (
            <option key={item.chainId} value={item.slug}>
              {item.name}
            </option>
          ))}
        </datalist>
        <Tooltip label="Data may take some minutes to load" hasArrow>
          <VStack spacing={4}>
            <Button bg="green.500" onClick={handleGetAllNFTs} isLoading={loading}>
              Get Data
            </Button>
            {allOwnersData.length > 0 && (
              <Button bg="green.500" onClick={downloadAirdropContent}>
                Download Excel {allOwnersData.length}
              </Button>
            )}
          </VStack>
        </Tooltip>
      </VStack>
    </Flex>
  );
}

export default Home;
