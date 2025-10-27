#  SECURITY_NOTES.md – Week 9 AuthZ Enforcement

## 🧩 Overview

This document outlines the **trust assumptions**, **authorization model**, and **security controls** implemented in the Agricultural DApp project, specifically focusing on **Week 9 – Authorization (AuthZ) Feature**.
It complements the core contract (`AgriSensorData.sol`) and associated Foundry test suite (`AgriSensorData.t.sol`).

---

##  Trust Assumptions

| Assumption                                                   | Description                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Authorized Entities Hold Verifiable Credentials (VCs)** | Only users (farmers, devices, inspectors) who hold valid credentials issued through DIDLab or pre-approved admin onboarding can invoke restricted contract functions. |
| **2. Frontend Enforcement is Assistive, Not Authoritative**  | The DApp UI restricts actions visually (e.g., hides unauthorized buttons), but final enforcement always happens on-chain within `AgriSensorData.sol`.                 |
| **3. On-Chain Data is Public but Integrity-Protected**       | Sensor readings, crop events, and certificates are public, but all sensitive or raw data are hashed before submission to ensure privacy and immutability.             |
| **4. Administrator Accounts Are Trusted**                    | Admins are responsible for assigning roles (`DEFAULT_ADMIN_ROLE`) and revoking compromised roles as part of standard key rotation procedures.                         |
| **5. Off-Chain Sensors are Semi-Trusted**                    | Devices must possess `DEVICE_ROLE` and are subject to anomaly detection and hash verification to mitigate spoofing.                                                   |

---

##  Authorization (AuthZ) Model

### **Roles and Permissions**

| Role                 | Permissions                                       | Purpose                                        |
| -------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `DEFAULT_ADMIN_ROLE` | Assigns and revokes roles                         | Governs network policy and user access control |
| `DEVICE_ROLE`        | Can submit sensor readings                        | Represents IoT data sources                    |
| `FARMER_ROLE`        | Can record crop events                            | Represents individual farm operators           |
| `SUPPLY_CHAIN_ROLE`  | Can record transport/storage events               | Represents logistics partners                  |
| `INSPECTOR_ROLE`     | Can issue or revoke crop certificates (Feature 2) | Adds trust to product quality verification     |

---

### **Enforcement Location**

* **Primary Enforcement:** On-chain within the Solidity contract using OpenZeppelin’s `AccessControl` modifiers.
* **Secondary Validation:** Gateway and frontend perform VC claim checks before calling protected methods.
* **Fail-Fast Design:** Unauthorized transactions revert with `AccessControl: account lacks role`.

---

##  Security Controls

### **1. Data Integrity**

* Each sensor reading or crop event is hashed (SHA-256) before submission.
* Duplicates are rejected using a stored mapping of unique hashes.
* Prevents replay attacks or double submissions.

### **2. Role-Based Access Control (RBAC)**

* Functions are annotated with role modifiers, e.g.:

  ```solidity
  function issueCertificate(uint256 cropId, string memory certHash)
      public
      onlyRole(INSPECTOR_ROLE)
  {
      // ... logic
  }
  ```
* Only entities with the correct roles may execute write operations.
* All administrative changes require `DEFAULT_ADMIN_ROLE`.

### **3. Attribute-Based Access Control (ABAC) Extension**

* Cross-checked contextual attributes: farm ownership, crop ID, and sender address.
* Prevents an inspector or device from modifying records outside its domain.

### **4. Auditability & Event Logging**

* All significant actions emit events (`SensorSubmitted`, `CropEventRecorded`, `CertificateIssued`, etc.).
* Provides complete on-chain traceability for auditors and consumers.

### **5. Anomaly Detection Safeguards**

* Out-of-range sensor readings trigger events for monitoring.
* The contract emits alerts without reverting transactions to maintain audit continuity.

### **6. Failure Testing**

* Unauthorized test cases (`test_IssueCertificate_Unauthorized`) confirm enforcement logic.
* CI workflow ensures consistent revert messages across environments.

---

##  Threats and Mitigations

| Threat                           | Description                                                | Mitigation                                                                      |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Unauthorized Write Access**    | Attackers attempt to submit fake or unauthorized readings. | Enforced via `onlyRole()` and verified device addresses.                        |
| **Duplicate or Replay Data**     | Re-submission of identical readings to inflate trust.      | Hash-based deduplication and mapping check before commit.                       |
| **Compromised Admin Key**        | Admin account misuse could alter roles.                    | Multi-admin consensus planned; logs all `RoleGranted` and `RoleRevoked` events. |
| **Sensor Spoofing**              | Fake devices mimic real IoT sources.                       | Future VC-gate for devices; anomaly alerting in place.                          |
| **Data Tampering or Censorship** | Blockchain data alteration attempt.                        | Immutable ledger; hash verification ensures authenticity.                       |

---

##  Evidence and Validation

### **Test Artifacts (Foundry)**

| Test                                   | Purpose                           | Expected Outcome  |
| -------------------------------------- | --------------------------------- | ----------------- |
| `test_AddSensorData()`                 | Validate device submission        | ✅ Pass            |
| `test_RoleRestrictedSubmission()`      | Block unauthorized writer         | ❌ Revert expected |
| `test_IssueCertificate_Authorized()`   | Inspector authorized              | ✅ Pass            |
| `test_IssueCertificate_Unauthorized()` | Farmer tries to issue certificate | ❌ Revert expected |
| `test_AnomalyEventEmission()`          | Emit event on abnormal data       | ✅ Pass            |

### **Evidence of Enforcement**

* CI test output (attached screenshots)
* GitHub workflow logs (`forge test -vvv`)
* Screenshots of both **success** and **failure** cases for authorization validation

---

## 🧾 References

* Week 8 Progress Report – Core Contract Implementation and Foundry Migration【45†week8-updates.md】
* Week 9 Assignment Objective – Feature 2 + AuthZ Enforcement (Roles/VC-Gate)
* Project Proposal – IoT + Blockchain Data Verification System【41†proposal.md】
