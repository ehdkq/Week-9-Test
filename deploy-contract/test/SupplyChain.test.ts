import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat"; // <-- 1. CHANGED IMPORT

describe("SupplyChain (with didlab Signer)", function () {
  
  async function deploySupplyChainFixture() {
    // 2. CHANGED: No longer uses 'hre'
    const [owner, didlabSigner, device1, unauthorizedSigner] = await ethers.getSigners();
    
    // NEW Ethers v6 syntax
const supplyChain = await ethers.deployContract("SupplyChain", [didlabSigner.address]);
    const getTxHash = async (
      user: string,
      batchId: number,
      temp: string,
      hum: string,
      nonce: bigint
    ) => {
      // 2. CHANGED: No longer uses 'hre'
      return ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "string", "string", "uint256"],
          [
            await supplyChain.getAddress(),
            user,
            batchId,
            temp,
            hum,
            nonce,
          ]
        )
      );
    };

    return { 
      supplyChain, 
      owner, 
      didlabSigner, 
      device1, 
      unauthorizedSigner,
      getTxHash 
    };
  }

  // Test 1: Deployment
  it("Should set the correct didlabSignerAddress", async function () {
    const { supplyChain, didlabSigner } = await loadFixture(deploySupplyChainFixture);
    expect(await supplyChain.didlabSignerAddress()).to.equal(didlabSigner.address);
  });

  // Test 2: Unprotected Feature
  it("Should allow any user to create a new batch", async function () {
    const { supplyChain, device1 } = await loadFixture(deploySupplyChainFixture);
    await expect(supplyChain.connect(device1).createBatch("Organic Apples"))
      .to.emit(supplyChain, "BatchCreated")
      .withArgs(1, device1.address, "Organic Apples");
  });

  // Test 3: Nonce Check
  it("Should return a nonce of 0 for a new user", async function () {
    const { supplyChain, device1 } = await loadFixture(deploySupplyChainFixture);
    expect(await supplyChain.getNonce(device1.address)).to.equal(0);
  });

  // Test 4: Successful Authorized Action (SUCCESS case)
  it("Should PASS for addSensorReading with a valid didlab signature", async function () {
    const { supplyChain, didlabSigner, device1, getTxHash } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 001");
    
    const batchId = 1;
    const temp = "25C";
    const hum = "60%";
    const nonce = await supplyChain.getNonce(device1.address); // 0n
    
    const txHash = await getTxHash(device1.address, batchId, temp, hum, nonce);
    // 2. CHANGED: No longer uses 'hre'
    const signature = await didlabSigner.signMessage(ethers.getBytes(txHash)); 
    
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.emit(supplyChain, "SensorDataAdded");

    const batch = await supplyChain.batches(1);
    // This should work now that the types are loaded
    expect(batch.readings.length).to.equal(1);
    expect(await supplyChain.getNonce(device1.address)).to.equal(1);
  });

  // Test 5: Unauthorized Action (FAILURE case)
  it("Should FAIL for addSensorReading with an *invalid* signature", async function () {
    const { supplyChain, unauthorizedSigner, device1, getTxHash } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 002");
    
    const batchId = 1;
    const temp = "30C";
    const hum = "70%";
    const nonce = await supplyChain.getNonce(device1.address); // 0n
    
    const txHash = await getTxHash(device1.address, batchId, temp, hum, nonce);
    // 2. CHANGED: No longer uses 'hre'
    const signature = await unauthorizedSigner.signMessage(ethers.getBytes(txHash)); 
    
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.be.revertedWith("Invalid didlab signature");
    
    expect(await supplyChain.getNonce(device1.address)).to.equal(0);
  });

  // Test 6: Replay Attack (FAILURE case)
  it("Should FAIL a replay attack (re-using a valid signature)", async function () {
    const { supplyChain, didlabSigner, device1, getTxHash } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 001");
    
    const batchId = 1;
    const temp = "25C";
    const hum = "60%";
    const nonce = await supplyChain.getNonce(device1.address); // nonce = 0
    const txHash = await getTxHash(device1.address, batchId, temp, hum, nonce);
    // 2. CHANGED: No longer uses 'hre'
    const signature = await didlabSigner.signMessage(ethers.getBytes(txHash));
    
    await supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature);
    expect(await supplyChain.getNonce(device1.address)).to.equal(1);
    
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.be.revertedWith("Invalid nonce");
  });
});