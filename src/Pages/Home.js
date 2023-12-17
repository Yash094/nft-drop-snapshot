import {
  VStack,
  InputGroup,
  Heading,
  Flex,
  Checkbox,
  FormLabel,
  Input,
  Button,
  Tooltip,
  Alert,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { allChains } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

// Add your constant values
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

function Home() {
  const [nftCollectionAddress, setNftCollection] = useState("");
  const [stakingContractAddress, setStakingContract] = useState("");
  const [nonWalletAddressCount, setNotWalletAddressCount] = useState(0);
  const [isStakingContractPrebuilt, setIsStakingContractPrebuilt] =
    useState(true);
  const [allOwnersData, setAllOwnersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chainRef = useRef();
  const handleInputChange = (e, setterFunction) => {
    setterFunction(e.target.value);
  };

  const handleGetAllNFTsPrebuilt = async () => {
    try {
      const chainSlug = chainRef.current?.value;
      if (!chainSlug || !nftCollectionAddress || !stakingContractAddress) {
        return alert("Please enter all the details first!");
      }
      const sdk = new ThirdwebSDK(chainSlug, {
        clientId: process.env.REACT_APP_TEMPLATE_CLIENT_ID,
      });
      const [nftCollection, stakingContract] = await Promise.all([
        sdk.getContract(nftCollectionAddress),
        sdk.getContract(stakingContractAddress),
      ]);

      const owners = await nftCollection.erc721.getAllOwners();

      const filteredOwners = owners.filter(
        (owner) =>
          owner.owner !== stakingContractAddress &&
          owner.owner !== DEAD_ADDRESS &&
          owner.owner !== ADDRESS_ZERO
      );

      const stakedCount = owners.length - filteredOwners.length;

      const callsPerSecond = 50;
      const delayBetweenCalls = 1000 / callsPerSecond;

      async function processStakedData(startIndex) {
        console.log("starred");
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
        console.log("stopped");
        return stakedOwners;
      }

      const stakedOwners = await processStakedData(0);

      setAllOwnersData([...filteredOwners, ...stakedOwners]);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGetAllNFTsCustom= async () => {
    try {
      const chainSlug = chainRef.current?.value;
      if (!chainSlug || !nftCollectionAddress) {
        return alert("Please enter all the details first!");
      }
      const sdk = new ThirdwebSDK(chainSlug, {
        clientId: process.env.REACT_APP_TEMPLATE_CLIENT_ID,
      });
      const nftCollection = await sdk.getContract(nftCollectionAddress);

      const owners = await nftCollection.erc721.getAllOwners();
      let counter = 0;
      await Promise.all(
        owners.map(async (owner) => {
          const code = await sdk.getProvider().getCode(owner.owner);
          // Use a regular if statement
          if (code != "0x") {
            counter++;
          }
        })
      );
      setNotWalletAddressCount(counter);
      setAllOwnersData(owners);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGetAllNFTs = async () => {
    try {
      setLoading(true);
      const chainSlug = chainRef.current?.value;
      if (!chainSlug || !nftCollectionAddress) {
        setLoading(false);
        return alert("Please enter all the details first!");
      }

      if (isStakingContractPrebuilt) {
        await handleGetAllNFTsPrebuilt();
      } else {
        await handleGetAllNFTsCustom();
      }
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
    <>
      <Alert status="warning" mb={4}>
        <AlertIcon />
        The tool is in beta & is only tested with pre-builts, please make sure
        to test on testnets first
      </Alert>
      <Flex direction="column" align="center" justify="center" height="100vh">
        <Heading mb={6} color="white">
          Better Snapshot v0.0.1
        </Heading>
        <VStack
          spacing={4}
          align="stretch"
          w={["90%", "70%", "50%", "40%"]}
          mx="auto"
        >
          {" "}
          {/* Set maximum width and center the content */}
          <FormLabel color="white">Your NFT Collection Address</FormLabel>
          <Input
            placeholder=""
            value={nftCollectionAddress}
            onChange={(e) => handleInputChange(e, setNftCollection)}
            color="white"
            bg="gray.800"
            _placeholder={{ color: "white" }}
          />
          <Checkbox
            isChecked={isStakingContractPrebuilt}
            onChange={(e) => setIsStakingContractPrebuilt(e.target.checked)}
            color="white"
          >
            Is Staking Contract Prebuilt?
          </Checkbox>
          {isStakingContractPrebuilt ? (
            <>
              <FormLabel color="white">
                Your Staking Collection Address
              </FormLabel>
              <Input
                placeholder=""
                value={stakingContractAddress}
                onChange={(e) => handleInputChange(e, setStakingContract)}
                color="white"
                bg="gray.800"
                _placeholder={{ color: "white" }}
              />
            </>
          ) : (
            <Tooltip
              label="Staking contract not available for prebuilt contracts"
              hasArrow
            >
              <Button isDisabled bg="gray.500" h="80px">
                The tool is not available for custom staking contract but the{" "}
                <br />
                tool can get you a number of holders which are contract <br />
                addresses and not real wallet addresses in your collection
              </Button>
            </Tooltip>
          )}
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
          <VStack spacing={4}>
            <Tooltip label="Data may take some minutes to load" hasArrow>
              <Button
                bg="green.500"
                w={["90%", "70%", "50%", "40%"]}
                onClick={handleGetAllNFTs}
                isLoading={loading}
              >
                Get Data
              </Button>
            </Tooltip>
            {allOwnersData.length > 0 && (
              <>
                <Button
                  bg="green.500"
                  w={["90%", "70%", "50%", "40%"]}
                  onClick={downloadAirdropContent}
                >
                  Download Excel {allOwnersData.length}
                </Button>

                {!isStakingContractPrebuilt && (
                  <Text color="white">
                    <b>{nonWalletAddressCount} </b>NFTs in your collection are
                    owned by contracts &
                    <b>{allOwnersData.length - nonWalletAddressCount}</b> are
                    owned by real wallet addresses
                  </Text>
                )}
              </>
            )}
          </VStack>
        </VStack>
      </Flex>
    </>
  );
}

export default Home;
