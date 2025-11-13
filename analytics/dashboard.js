// analytics/dashboard.js

// ---  CONFIGURATION ---
// 1. Get this from your Hardhat deployment script's output
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";

// 2. Get this from: artifacts/contracts/AgriSensorData.sol/AgriSensorData.json
//    Find the "abi" array and copy/paste *only* your event objects here.
const CONTRACT_ABI = [
    // --- Paste *ONLY* your Event ABI(s) here ---
    // This is an EXAMPLE for a "DataAdded" event. Yours might be different.
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "deviceId", "type": "uint256" },
        { "indexed": false, "name": "dataHash", "type": "string" },
        { "indexed": false, "name": "timestamp", "type": "uint256" }
      ],
      "name": "DataAdded",
      "type": "event"
    }
    // You can paste more than one event ABI if you have them.
];

// 3. The event name you want to query. Use "*" to get all events from the ABI.
const EVENT_NAME = "*"; // Or "DataAdded"

// 4. Connect to the Hardhat local node
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
// --- END CONFIGURATION ---


async function fetchContractEvents() {
    const tableBody = document.getElementById("events-table-body");
    const tableHeader = document.getElementById("table-header");
    const loadingEl = document.getElementById("loading");

    try {
        if (CONTRACT_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE") {
            loadingEl.innerText = "Error: Please set CONTRACT_ADDRESS in dashboard.js";
            return;
        }

        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        console.log(`Querying for "${EVENT_NAME}" events at ${CONTRACT_ADDRESS}...`);
        
        // This is the core logic: "consumes real events"
        const events = await contract.queryFilter(EVENT_NAME, 0, 'latest'); // From block 0 to latest
        
        if (events.length === 0) {
            loadingEl.innerText = "No events found for this contract. (Have you interacted with it?)";
            return;
        }
        
        loadingEl.style.display = 'none'; // Hide loading message

        // Dynamically create header
        const headers = new Set(['Event', 'Block Number']);
        events.forEach(event => {
            if (event.args) Object.keys(event.args).forEach(key => !/^\d+$/.test(key) && headers.add(key));
        });
        tableHeader.innerHTML = [...headers].map(h => `<th>${h}</th>`).join('');

        // Populate the table
        for (const event of events.reverse()) { // Show newest events first
            const row = tableBody.insertRow();
            for (const header of headers) {
                const cell = row.insertCell();
                let val = '';
                if (header === 'Event') {
                    val = event.event;
                } else if (header === 'Block Number') {
                    val = event.blockNumber;
                } else {
                    let arg = event.args[header];
                    if (arg === undefined) {
                        val = '---';
                    } else if (ethers.BigNumber.isBigNumber(arg)) {
                        // Try to format as date if it looks like a 10-digit (seconds) timestamp
                        if (arg.toString().length === 10) {
                             val = new Date(arg.toNumber() * 1000).toLocaleString();
                        } else {
                             val = arg.toString();
                        }
                    } else {
                        val = arg;
                    }
                }
                cell.innerText = val;
            }
        }

    } catch (error) {
        console.error("Failed to fetch events:", error);
        loadingEl.innerText = "Error loading events. Is your Hardhat node running? Check console (F12).";
    }
}

// Run the function when the page loads
window.onload = fetchContractEvents;