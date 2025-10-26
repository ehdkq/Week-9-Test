

## 🌾 Week-9 Test – Agricultural DApp Authorization and Feature Expansion

### **Objective**

Implement and test **Feature 2** with robust **authorization (AuthZ)** enforcement.
This week extends the agricultural DApp from Week 8 by adding an additional protected feature and formal access-control enforcement at the contract and gateway levels.

---

## 🚀 Overview

The **Agricultural DApp** enables IoT-based agricultural data collection and supply-chain transparency.
The Week 9 update introduces:

* A second core feature building on `AgriSensorData.sol`
* On-chain **role-based and ABAC-style authorization**
* An enforceable authorization layer (not just UI-level)
* A validated test suite including **unauthorized-access failure cases**

---

## ⚙️ Project Structure

```
Week-9-Test/
├── contracts/
│   └── AgriSensorData.sol
├── test/
│   └── AgriSensorData.t.sol
├── scripts/
│   └── deploy.ts
├── SECURITY_NOTES.md
├── foundry.toml
├── hardhat.config.ts
└── README.md   ← you are here
```

---

## 🌱 Feature 2 – “Verified Crop Certification Registry”

**Purpose:** Adds a secure registry where only authorized inspectors can issue crop-quality certificates linked to farmer and supply-chain records.

### **New Functionalities**

| Function                                                   | Description                               | Access Control        |
| ---------------------------------------------------------- | ----------------------------------------- | --------------------- |
| `issueCertificate(uint256 cropId, string memory certHash)` | Registers a new crop certificate on-chain | `INSPECTOR_ROLE` only |
| `revokeCertificate(uint256 certId)`                        | Revokes a certificate if found invalid    | `ADMIN_ROLE` only     |
| `getCertificate(uint256 certId)`                           | Retrieves certificate metadata            | Public view           |

### **Implementation Highlights**

* **ABAC Extension:** Checks both `msg.sender`’s role **and** contextual attributes (e.g., farm ownership, crop status).
* **Event Logging:** Emits `CertificateIssued` and `CertificateRevoked` events for traceability.
* **Cross-Feature Linkage:** Certificates reference `CropEvent` entries from `AgriSensorData.sol`, ensuring full provenance.

---

## 🔐 Authorization Enforcement

### **Mechanism**

* Built using **OpenZeppelin’s `AccessControl`** in Solidity.
* Roles:

  * `DEFAULT_ADMIN_ROLE` – governs role assignment and policy changes.
  * `DEVICE_ROLE` – authorized IoT data submitters.
  * `FARMER_ROLE` – crop event reporters.
  * `SUPPLY_CHAIN_ROLE` – logistics stage reporters.
  * `INSPECTOR_ROLE` – authorized certifiers (Feature 2).

### **Policy Layer**

* **Enforcement location:** On-chain (contract level).
* **Gateway integration:** Off-chain UI verifies Verifiable Credential (VC) claims before invoking protected endpoints.
* **UI restriction:** Unauthorized buttons hidden, but *security enforcement lives on-chain.*

---

## 🧪 Testing

### **Environment**

* Framework: **Foundry** (`forge test`)
* Network: `didlab` local or testnet
* Solidity version: `^0.8.20`

### **Test Coverage (≥ 5 tests)**

| Test File                                | Scenario                                | Expected Result               |
| ---------------------------------------- | --------------------------------------- | ----------------------------- |
| ✅ `test_AddSensorData()`                 | Device submits valid sensor reading     | Pass                          |
| ✅ `test_BatchSubmission()`               | Multiple readings handled atomically    | Pass                          |
| ✅ `test_RoleRestrictedSubmission()`      | Unauthorized sender attempts submission | **Fail – Revert as expected** |
| ✅ `test_AnomalyEventEmission()`          | Detects abnormal readings               | Pass                          |
| ✅ `test_IssueCertificate_Authorized()`   | Inspector issues valid certificate      | Pass                          |
| ✅ `test_IssueCertificate_Unauthorized()` | Farmer tries to issue certificate       | **Fail – Revert as expected** |

### **Example Command**

```bash
forge test -vvv
```

---

## 🛡️ SECURITY_NOTES.md (Summary)

| Category              | Description                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trust Assumptions** | Authorized entities (admins, inspectors, devices) are issued verifiable credentials via DIDLab registry.  Frontend only *assists* role validation; contract is final authority. |
| **AuthZ Rule**        | `require(hasRole(INSPECTOR_ROLE, msg.sender))` for certificate issuance.  Non-authorized roles revert with `"AccessControl: account lacks role"`.                               |
| **Data Integrity**    | Duplicate sensor hash rejection prevents replay attacks.                                                                                                                        |
| **Failure Testing**   | Unauthorized attempts explicitly tested and logged.                                                                                                                             |
| **Audit Notes**       | All public functions use role guards or view-only modifiers. No critical state change without role validation.                                                                  |


