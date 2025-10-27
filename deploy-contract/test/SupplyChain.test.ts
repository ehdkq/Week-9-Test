import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("SupplyChain (EIP-712)", function () {

  async function deployFixture() {
    const [owner, didlabSigner, user] = await ethers.getSigners();
    const supplyChain = await ethers.deployContract("SupplyChain", [didlabSigner.address]);
    await supplyChain.waitForDeployment();
    return { owner, didlabSigner, user, supplyChain };
  }

  it("signs typed data, recovers correctly, and enforces nonce", async function () {
    const { didlabSigner, user, supplyChain } = await loadFixture(deployFixture);

    // 1) Print domain inputs actually used
    const { chainId } = await ethers.provider.getNetwork();
    console.log("chainId:", chainId);
    console.log("verifyingContract (v6):", await supplyChain.getAddress()); // .target also works in v6 as alias
    console.log("didlabSigner:", didlabSigner.address);
    console.log("user:", user.address);

    // 2) Read the current nonce from the contract (must be right before signing)
    const nonce = await supplyChain.nonces(user.address);
    console.log("nonce:", nonce.toString());

    // 3) Prepare EIP-712 domain, types, value
    const domain = {
      name: "DidLabSupplyChain",
      version: "1",
      chainId: Number(chainId),
      verifyingContract: await supplyChain.getAddress(),
    } as const;

    const types = {
      SensorReading: [
        { name: "user", type: "address" },
        { name: "batchId", type: "uint256" },
        { name: "reading", type: "int256" },
        { name: "nonce", type: "uint256" },
      ],
    } as const;

    const value = {
      user: user.address,
      batchId: 1n,
      reading: 42n,   // example data
      nonce,
    } as const;

    // 4) Sign typed data with the didlab signer
    const signature = await didlabSigner.signTypedData(domain, types, value);

    // 5) Recover locally and compare (must equal didlab signer)
    const recovered = ethers.recoverTypedData(domain, types, value, signature);
    console.log("recovered:", recovered);
    expect(recovered).to.equal(didlabSigner.address);

    // 6) Call once → should succeed
    await expect(
      supplyChain.connect(user).addSensorReading(value.batchId, value.reading, value.nonce, signature)
    ).to.not.be.reverted;

    // 7) Replay same signature → must revert with Bad nonce
    await expect(
      supplyChain.connect(user).addSensorReading(value.batchId, value.reading, value.nonce, signature)
    ).to.be.revertedWith("Bad nonce");
  });

});
