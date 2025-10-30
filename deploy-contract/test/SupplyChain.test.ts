import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat"; 

describe("SupplyChain (with didlab Signer)", function () {
  
  async function deploySupplyChainFixture() {
    const [owner, didlabSigner, device1, unauthorizedSigner] = await ethers.getSigners();
    
    // 1. FIX: Changed to Ethers v6 deploy syntax
    const supplyChain = await ethers.deployContract("SupplyChain", [didlabSigner.address]);

    // 2. REMOVED: The 'getTxHash' function is no longer needed.
    
    return { 
      supplyChain, 
      owner, 
      didlabSigner, 
      device1, 
      unauthorizedSigner
    };
  }

  // 
  // ERROR 1: The stray 'it(...)' block that was here has been removed.
  // It was breaking the syntax of the 'deploySupplyChainFixture' function.
  //

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
    const { supplyChain, didlabSigner, device1 } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 001");
    
    const batchId = 1; // JS number
    const temp = "25C";
    const hum = "60%";
    const nonce = await supplyChain.getNonce(device1.address); // 0n
    
    // --- START EIP-712 SIGNING ---
    const { chainId } = await ethers.provider.getNetwork();
    const verifyingContract = await supplyChain.getAddress();

    const domain = {
      name: "DidLabSupplyChain", 
      version: "1", 
      chainId: chainId,
      verifyingContract: verifyingContract
    };

    const types = {
      SensorReading: [
        { name: "user", type: "address" },
        { name: "batchId", type: "uint256" },
        { name: "temperature", type: "string" },
        { name: "humidity", type: "string" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const value = {
      user: device1.address,
      batchId: batchId,
      temperature: temp,
      humidity: hum,
      nonce: nonce // This is a bigint
    };
    
    const signature = await didlabSigner.signTypedData(domain, types, value);
    // --- END EIP-712 SIGNING ---
    
    // ERROR 2: Fixed this call. 
    // It was using 'user' (which is not defined here) instead of 'device1'.
    // It was also using 'value.reading' (which doesn't exist) instead of 'temp' and 'hum'.
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.emit(supplyChain, "SensorDataAdded");

    const batch = await supplyChain.batches(1);
    expect((batch as any)[3].length);
    expect(await supplyChain.getNonce(device1.address)).to.equal(1n); // Compare to a bigint (1n)
  });

  // Test 5: Unauthorized Action (FAILURE case)
  it("Should FAIL for addSensorReading with an *invalid* signature", async function () {
    const { supplyChain, unauthorizedSigner, device1 } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 002");
    
    const batchId = 1;
    const temp = "30C";
    const hum = "70%";
    const nonce = await supplyChain.getNonce(device1.address); // 0n
    
    // --- START EIP-712 SIGNING ---
    const { chainId } = await ethers.provider.getNetwork();
    const verifyingContract = await supplyChain.getAddress(); // Ethers v6

    const domain = {
      name: "DidLabSupplyChain",
      version: "1",
      chainId: chainId,
      verifyingContract: verifyingContract
    };

    const types = {
      SensorReading: [
        { name: "user", type: "address" },
        { name: "batchId", type: "uint256" },
        { name: "temperature", type: "string" },
        { name: "humidity", type: "string" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const value = {
      user: device1.address,
      batchId: batchId,
      temperature: temp,
      humidity: hum,
      nonce: nonce 
    };
    
    const signature = await unauthorizedSigner.signTypedData(domain, types, value);
    // --- END EIP-712 SIGNING ---
    
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.be.revertedWith("Invalid didlab signature");
    
    expect(await supplyChain.getNonce(device1.address)).to.equal(0n); // Compare to a bigint (0n)
  });

  // Test 6: Replay Attack (FAILURE case)
  it("Should FAIL a replay attack (re-using a valid signature)", async function () {
    const { supplyChain, didlabSigner, device1 } = await loadFixture(deploySupplyChainFixture);
    await supplyChain.connect(device1).createBatch("Batch 001");
    
    const batchId = 1;
    const temp = "25C";
    const hum = "60%";
    const nonce = await supplyChain.getNonce(device1.address); // nonce = 0n
    
    // --- START EIP-712 SIGNING ---
    const { chainId } = await ethers.provider.getNetwork();
    const verifyingContract = await supplyChain.getAddress(); // Ethers v6

    const domain = {
      name: "DidLabSupplyChain",
      version: "1",
      chainId: chainId,
      verifyingContract: verifyingContract
    };

    const types = {
      SensorReading: [
        { name: "user", type: "address" },
        { name: "batchId", type: "uint256" },
        { name: "temperature", type: "string" },
        { name: "humidity", type: "string" },
        { name: "nonce", type: "uint256" }
      ]
    };
    
    const value = {
      user: device1.address,
      batchId: batchId,
      temperature: temp,
      humidity: hum,
      nonce: nonce 
    };

    const signature = await didlabSigner.signTypedData(domain, types, value);
    // --- END EIP-712 SIGNING ---
    
    // Call the function (this first one should work)
    await supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature);
    
    // Nonce should now be 1
    expect(await supplyChain.getNonce(device1.address)).to.equal(1n); // Compare to bigint (1n)
    
    // Call again with the *same* signature and nonce (this should fail)
    await expect(
      supplyChain.connect(device1).addSensorReading(batchId, temp, hum, nonce, signature)
    ).to.be.revertedWith("Invalid nonce");
  });
});