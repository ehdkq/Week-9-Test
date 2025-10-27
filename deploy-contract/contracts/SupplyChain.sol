// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SupplyChain is EIP712 {
    using ECDSA for bytes32;

    event SensorDataAdded(uint256 indexed batchId, address indexed user, int256 reading, uint256 nonce);

    // signer that is allowed to authorize sensor readings
    address public immutable didlabSignerAddress;

    // per-user nonces (replay protection)
    mapping(address => uint256) public nonces;

    // EIP-712 typehash for the struct you’ll sign off-chain
    // SensorReading(address user,uint256 batchId,int256 reading,uint256 nonce)
    bytes32 private constant SENSOR_READING_TYPEHASH =
        keccak256("SensorReading(address user,uint256 batchId,int256 reading,uint256 nonce)");

    constructor(address _didlabSignerAddress)
        EIP712("DidLabSupplyChain", "1") // <-- domain name + version must match your test
    {
        didlabSignerAddress = _didlabSignerAddress;
    }

    function addSensorReading(
        uint256 batchId,
        int256 reading,
        uint256 nonce,
        bytes calldata signature
    ) external {
        // replay-protection
        require(nonce == nonces[msg.sender], "Bad nonce");

        // build typed data hash
        bytes32 structHash = keccak256(abi.encode(
            SENSOR_READING_TYPEHASH,
            msg.sender,
            batchId,
            reading,
            nonce
        ));
        bytes32 digest = _hashTypedDataV4(structHash);

        // recover signer from typed-data signature
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == didlabSignerAddress, "Invalid didlab signature");

        // success → consume nonce
        unchecked { nonces[msg.sender] = nonce + 1; }

        emit SensorDataAdded(batchId, msg.sender, reading, nonce);
    }
}
