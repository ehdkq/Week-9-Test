// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SupplyChain is EIP712 {
    using Counters for Counters.Counter;

    // --- State Variables ---
    Counters.Counter private _batchIds;
    address public immutable didlabSignerAddress;
    mapping(address => uint256) public nonces;

    // --- Structs & Mappings ---
    // This struct was missing from the merged file
    struct SensorReading {
        uint256 timestamp;
        string temperature;
        string humidity;
        address reportedBy;
    }

    struct Batch {
        uint256 id;
        string description;
        address farmer;
        uint256 createdTimestamp;
        SensorReading[] readings; // This references the struct above
    }

    mapping(uint256 => Batch) public batches;

    // This is the correct EIP-712 typehash for your function
    bytes32 public constant SENSOR_READING_TYPEHASH = keccak256(
        "SensorReading(address user,uint256 batchId,string temperature,string humidity,uint256 nonce)"
    );

    // --- Events ---
    event BatchCreated(uint256 indexed batchId, address indexed farmer, string description);
    event SensorDataAdded(uint256 indexed batchId, uint256 timestamp, address indexed reportedBy);

    // --- Constructor ---
    // Kept the one constructor that matches your EIP-712 setup
    constructor(address _didlabSigner) EIP712("DidLabSupplyChain", "1"){
        require(_didlabSigner != address(0), "Invalid signer address");
        didlabSignerAddress = _didlabSigner;
    }

    // --- Feature 1: Create Batch ---
    function createBatch(string memory _description) external {
        _batchIds.increment();
        uint256 newBatchId = _batchIds.current();

        Batch storage newBatch = batches[newBatchId];
        newBatch.id = newBatchId;
        newBatch.description = _description;
        newBatch.farmer = msg.sender;
        newBatch.createdTimestamp = block.timestamp;

        emit BatchCreated(newBatchId, msg.sender, _description);
    }

    // --- Feature 2 (Protected): Add Sensor Reading ---
    function addSensorReading(
        uint256 _batchId,
        string memory _temperature,
        string memory _humidity,
        uint256 _nonce,
        bytes memory _signature
    )
        external
    {
        require(batches[_batchId].id != 0, "Batch does not exist");
        
        // 1. Check for replay attack using the passed-in nonce
        require(nonces[msg.sender] == _nonce, "Invalid nonce");
        
        // 2. Re-create the EIP-712 hash
        bytes32 structHash = keccak256(
            abi.encode(
                SENSOR_READING_TYPEHASH,
                msg.sender, // user
                _batchId,
                keccak256(bytes(_temperature)), // EIP-712 hashes strings
                keccak256(bytes(_humidity)), // EIP-712 hashes strings
                _nonce
            )
        );
        
        bytes32 messageHash = _hashTypedDataV4(structHash); 

        // 3. Verify the signature
        address recoveredSigner = ECDSA.recover(messageHash, _signature);
        
        // 4. AuthZ ENFORCEMENT
        require(
            recoveredSigner == didlabSignerAddress,
            "Invalid didlab signature"
        );

        // 5. Prevent replay: Increment the stored nonce
        nonces[msg.sender]++; // <-- FIX: Removed redundant/broken nonce increment

        // 6. Execute the action
        SensorReading memory newReading = SensorReading({
            timestamp: block.timestamp,
            temperature: _temperature,
            humidity: _humidity,
            reportedBy: msg.sender
        });

        batches[_batchId].readings.push(newReading);

        // FIX: Corrected emit statement to match event definition
        emit SensorDataAdded(_batchId, block.timestamp, msg.sender);
    }
    
    // --- Helper Functions ---
    function getNonce(address _user) external view returns (uint256) {
        return nonces[_user];
    }
}