echo "# 🔐 SECURITY_NOTES.md – Week 9 Authorization Overview

## 🧩 Purpose
This file outlines the key security and authorization (AuthZ) setup for the Agricultural DApp.

---

## 🧠 Trust & Assumptions
- Only approved users (farmers, devices, inspectors) perform protected actions.
- On-chain logic enforces all permissions; UI checks are assistive only.
- Sensor and event data are hashed for privacy and immutability.
- Admins are trusted to manage user roles responsibly.

---

## 🔐 Authorization Model
| Role | Permission | Purpose |
|------|-------------|----------|
| ADMIN_ROLE | Manage roles | Access control management |
| DEVICE_ROLE | Submit readings | IoT data entry |
| FARMER_ROLE | Record crop data | Farm updates |
| SUPPLY_CHAIN_ROLE | Track logistics | Transport & storage |
| INSPECTOR_ROLE | Issue certificates | Crop quality verification |

Authorization is enforced in Solidity:
\`\`\`solidity
require(hasRole(INSPECTOR_ROLE, msg.sender), \"Not authorized\");
\`\`\`

---

## 🧱 Key Security Features
- Role-Based Access Control (RBAC)
- Hash-based duplicate prevention
- Event logging for transparency
- Tests for both success and unauthorized reverts

---

## 🧩 Threats & Mitigations
| Threat | Mitigation |
|--------|-------------|
| Unauthorized access | On-chain RBAC checks |
| Data replay | Unique hash validation |
| Compromised admin | Logged role changes |
| Fake devices | Verified device roles |
| Data tampering | Immutable blockchain records |

---

 ✅ Summary
Security focuses on least privilege, data integrity, and transparency.
Future work includes VC-gated access and multi-admin role management.
" > SECURITY_NOTES.md
