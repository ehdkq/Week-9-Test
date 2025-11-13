// llm-audit.js
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
// 1. Add your API Key here.
//    DO NOT COMMIT THIS KEY. Use an environment variable or .env file.
const API_KEY = 'YOUR_API_KEY_HERE'; 

// 2. Update this to the path of your main smart contract.
const CONTRACT_PATH = path.resolve(process.cwd(), './deploy-contract/contracts/AgriSensorData.sol'); 
// --- END CONFIGURATION ---

// Helper function to get the OpenAI client
function getClient() {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('OpenAI API key is not set. Please add it to llm-audit.js');
  }
  return new OpenAI({ apiKey: API_KEY });
}

// This is your "Scripted Prompt"
const getAuditPrompt = (contractCode, contractFileName) => {
  return `
    Please act as an expert smart contract auditor.
    Analyze the following Solidity ${contractFileName} contract for security vulnerabilities.

    Provide a "Finding List" that identifies:
    1.  Vulnerability Type (e.g., Reentrancy, Access Control, Integer Overflow).
    2.  Severity (Critical, High, Medium, Low).
    3.  Description of the vulnerability.
    4.  A code snippet of the vulnerable line(s).
    5.  A recommended code snippet for the fix.

    Here is the contract code:
    \`\`\`solidity
    ${contractCode}
    \`\`\`
  `;
};

async function runAudit() {
  try {
    const openai = getClient();
    
    console.log(`Reading contract from: ${CONTRACT_PATH}`);
    const contractCode = fs.readFileSync(CONTRACT_PATH, 'utf8');
    
    const prompt = getAuditPrompt(contractCode, path.basename(CONTRACT_PATH));
    
    console.log('Sending prompt to LLM for analysis... (this may take a minute)');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo for a faster, cheaper audit
      messages: [{ role: 'user', content: prompt }],
    });
    
    const findingList = response.choices[0].message.content;
    
    // Save the finding list to a file
    fs.writeFileSync('llm-findings.md', findingList);
    
    console.log('\n--- AUDIT COMPLETE ---');
    console.log('Results saved to llm-findings.md. This is your "finding list" artifact.');
    console.log(findingList);

  } catch (error) {
    console.error('Error during LLM audit:', error.message);
  }
}

runAudit();