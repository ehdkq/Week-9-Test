// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SupplyChain {
    using Counters for Counters.Counter;

    // --- State Variables ---
    Counters.Counter private _batchIds;
    address public immutable didlabSignerAddress;
    mapping(address => uint256) public nonces;

    // --- Structs & Mappings ---
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
        SensorReading[] readings;
    }

    mapping(uint256 => Batch) public batches;

    // --- Events ---
    event BatchCreated(uint256 indexed batchId, address indexed farmer, string description);
    event SensorDataAdded(uint256 indexed batchId, uint256 timestamp, address indexed reportedBy);

    // --- Constructor ---
    constructor(address _didlabSigner) {
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
        uint256 _nonce, // <-- CRITICAL FIX HERE
        bytes memory _signature
    )
        external
    {
        require(batches[_batchId].id != 0, "Batch does not exist");
        
        // 1. Check for replay attack using the passed-in nonce
        require(nonces[msg.sender] == _nonce, "Invalid nonce");
        
        // 2. Re-create the message hash
        bytes32 messageHash = _getTxHash(
            _batchId,
            _temperature,
            _humidity,
            _nonce
        );

        // 3. Verify the signature
        address recoveredSigner = _verify(messageHash, _signature);
        
        // 4. AuthZ ENFORCEMENT
        require(
            recoveredSigner == didlabSignerAddress,
            "Invalid didlab signature"
        );

        // 5. Prevent replay: Increment the stored nonce
        nonces[msg.sender]++;

        // 6. Execute the action
        SensorReading memory newReading = SensorReading({
            timestamp: block.timestamp,
            temperature: _temperature,
            humidity: _humidity,
            reportedBy: msg.sender
        });

        batches[_batchId].readings.push(newReading);

        emit SensorDataAdded(_batchId, block.timestamp, msg.sender);
    }
    
    // --- Helper Functions ---
    function _getTxHash(
        uint256 _batchId,
        string memory _temperature,
        string memory _humidity,
        uint256 _nonce
    )
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this), // Contract address
                msg.sender,    // User submitting the tx
                _batchId,
                _temperature,
                _humidity,
                _nonce
            )
        );
    }

    function _verify(bytes32 _hash, bytes memory _signature)
        internal
        pure
        returns (address)
    {
        return ECDSA.recover(_hash, _signature);
    }

    function getNonce(address _user) external view returns (uint256) {
        return nonces[_user];
    }
}