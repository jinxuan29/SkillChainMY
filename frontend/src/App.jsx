import { useState, useContext, useEffect } from "react";
import { ethers } from "ethers";
import { WalletContext } from "./context/WalletContext";
import { uploadFileToIPFS } from "./utils/pinata";

const CertificateGallery = ({ certificates }) => {
  if (certificates.length === 0) return <p className="text-gray-500 italic mt-4">No certificates found in this portfolio.</p>;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 border-t pt-6">
      {certificates.map((cert) => (
        <div key={cert.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-center hover:shadow-md transition">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded mb-3">Token #{cert.id}</span>
          
          <p className="text-xs text-gray-500 mb-1">
            Issued by: <span className="font-mono text-gray-800">{cert.issuer.slice(0,6)}...{cert.issuer.slice(-4)}</span>
          </p>
          <p className="text-xs text-gray-500 mb-3">Date: {cert.timestamp}</p>
          
          <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium underline break-all">
            View Document (IPFS)
          </a>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// ERROR PARSING UTILITY
// Transforms nasty JSON errors into user-friendly UI text
// ==========================================
const parseBlockchainError = (err, fallbackMessage) => {
  console.error("Raw Blockchain Error:", err);

  // 1. User clicked "Reject" in MetaMask
  if (err.code === "ACTION_REJECTED" || err.code === 4001) {
    return "Transaction was cancelled in MetaMask.";
  }

  // 2. Look for specific OpenZeppelin AccessControl reverts
  const errorString = err.reason || err.data?.message || err.message || "";
  if (errorString.includes("AccessControl: account")) {
    return "Unauthorized: You do not have the required Admin or Issuer role for this action.";
  }

  // 3. Catch generic contract reverted reasons (e.g., custom requires)
  if (err.reason) {
    return `Transaction failed: ${err.reason}`;
  }

  // 4. Return the fallback message if it's an unidentifiable error
  return fallbackMessage;
};

export default function App() {
  const { account, role, contract, readOnlyContract, connectWallet } = useContext(WalletContext);
  
  const [activeTab, setActiveTab] = useState("recruiter");
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const TARGET_CHAIN_ID = "0xaa36a7"; // Sepolia Testnet Hex (Use "0x7a69" if testing on Local Hardhat)

  const [newIssuerAddr, setNewIssuerAddr] = useState("");
  const [issueStudentAddr, setIssueStudentAddr] = useState("");
  const [issueFile, setIssueFile] = useState(null);
  const [myCertificates, setMyCertificates] = useState([]);
  
  const [studentPasscode, setStudentPasscode] = useState("");
  const [studentDays, setStudentDays] = useState("");
  
  const [verifyStudentAddr, setVerifyStudentAddr] = useState("");
  const [verifyPasscode, setVerifyPasscode] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [recruiterCertificates, setRecruiterCertificates] = useState([]);

  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  const showStatus = (message, type) => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 6000);
  };

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        setIsWrongNetwork(currentChainId !== TARGET_CHAIN_ID);

        window.ethereum.on('chainChanged', (chainId) => {
          setIsWrongNetwork(chainId !== TARGET_CHAIN_ID);
        });
      }
    };
    checkNetwork();
  }, []);

  const handleAddIssuer = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      showStatus("Initiating transaction... Confirm in MetaMask.", "info");

      const tx = await contract.addIssuer(newIssuerAddr);
      showStatus("Transaction sent! Waiting for confirmation...", "info");
      await tx.wait(); 
      
      showStatus(`✅ Success! The address ${newIssuerAddr.slice(0,6)}... is now an authorized Issuer!`, "success");
      setNewIssuerAddr("");
    } catch (err) {
      showStatus(`❌ ${parseBlockchainError(err, "Failed to grant Issuer role.")}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentPortfolio = async (studentAddress, contractInstance) => {
    try {
      const certs = [];
      let PINATA_GATEWAY_URL = import.meta.env.VITE_PINATA_GATEWAY_URL;
      if (!PINATA_GATEWAY_URL.startsWith("http")) {
        PINATA_GATEWAY_URL = `https://${PINATA_GATEWAY_URL}`;
      }

      for (let i = 0; i < 50; i++) {
        try {
          const owner = await contractInstance.ownerOf(i);
          if (owner.toLowerCase() === studentAddress.toLowerCase()) {
            const certData = await contractInstance.credentials(i); 
            certs.push({
              id: i.toString(),
              issuer: certData.issuer,
              timestamp: new Date(Number(certData.timestamp) * 1000).toLocaleDateString(),
              cid: certData.ipfsCID,
              url: `${PINATA_GATEWAY_URL}/ipfs/${certData.ipfsCID.replace("ipfs://", "")}`
            });
          }
        } catch (err) {
          break; 
        }
      }
      return certs;
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      return [];
    }
  };

  useEffect(() => {
    if (activeTab === "student" && account && contract) {
      fetchStudentPortfolio(account, contract).then(certs => setMyCertificates(certs));
    }
  }, [activeTab, account, contract]);

  const handleMint = async (e) => {
    e.preventDefault();
    if (!issueFile) return showStatus("Please select a file to upload.", "error");

    try {
      setLoading(true);
      showStatus("Uploading file to IPFS...", "info");
      const ipfsCID = await uploadFileToIPFS(issueFile);
      
      showStatus(`File uploaded (CID: ${ipfsCID}). Please confirm in MetaMask.`, "info");
      const tx = await contract.issueCredential(issueStudentAddr, ipfsCID);
      
      showStatus("Minting on blockchain... Waiting for confirmation...", "info");
      await tx.wait(); 
      
      showStatus("✅ Credential successfully issued as a Soulbound Token!", "success");
      setIssueStudentAddr("");
      setIssueFile(null);
    } catch (err) {
      showStatus(`❌ ${parseBlockchainError(err, "Failed to mint credential.")}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      showStatus("Initiating transaction... Confirm in MetaMask.", "info");

      const accessHash = ethers.keccak256(ethers.toUtf8Bytes(studentPasscode));
      const tx = await contract.grantRecruiterAccess(accessHash, parseInt(studentDays));
      
      showStatus("Transaction sent! Waiting for confirmation...", "info");
      await tx.wait();
      
      showStatus(`✅ Success! Give the recruiter your address and passcode: "${studentPasscode}"`, "success");
      setStudentPasscode("");
      setStudentDays("");
    } catch (err) {
      showStatus(`❌ ${parseBlockchainError(err, "Failed to generate recruiter access link.")}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setVerifyResult(null);
      setRecruiterCertificates([]); 

      const accessHash = ethers.keccak256(ethers.toUtf8Bytes(verifyPasscode));
      const isValid = await readOnlyContract.verifyRecruiterAccess(verifyStudentAddr, accessHash);
      
      setVerifyResult(isValid);

      if (isValid) {
        const certs = await fetchStudentPortfolio(verifyStudentAddr, readOnlyContract);
        setRecruiterCertificates(certs);
      }
    } catch (err) {
      showStatus(`❌ ${parseBlockchainError(err, "Failed to query the blockchain. Ensure contract address is correct.")}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      {isWrongNetwork && (
        <div className="bg-red-600 text-white text-center py-2 font-bold shadow-md">
          ⚠️ WARNING: MetaMask is connected to the wrong network. Please switch to the Sepolia Testnet.
        </div>
      )}

      <nav className="bg-indigo-700 p-4 text-white shadow-md flex justify-between items-center overflow-x-auto">
        <h1 className="text-xl font-bold tracking-wider mr-4">SkillChainMY</h1>
        
        <div className="flex space-x-2">
          {role === 'admin' && (
            <button onClick={() => setActiveTab("admin")} className={`px-4 py-2 rounded font-medium transition ${activeTab === 'admin' ? 'bg-indigo-900' : 'hover:bg-indigo-600'}`}>
              Admin Panel
            </button>
          )}

          {(role === 'issuer' || role === 'admin') && (
            <button onClick={() => setActiveTab("issuer")} className={`px-4 py-2 rounded font-medium transition ${activeTab === 'issuer' ? 'bg-indigo-900' : 'hover:bg-indigo-600'}`}>
              Issue Credential
            </button>
          )}

          {(role !== 'guest') && (
            <button onClick={() => setActiveTab("student")} className={`px-4 py-2 rounded font-medium transition ${activeTab === 'student' ? 'bg-indigo-900' : 'hover:bg-indigo-600'}`}>
              My Portfolio
            </button>
          )}

          <button onClick={() => setActiveTab("recruiter")} className={`px-4 py-2 rounded font-medium transition ${activeTab === 'recruiter' ? 'bg-indigo-900' : 'hover:bg-indigo-600'}`}>
            Recruiter Verify
          </button>
        </div>

        <div className="ml-4">
          {!account ? (
            <button onClick={connectWallet} className="bg-white text-indigo-700 px-5 py-2 rounded font-bold shadow hover:bg-gray-100 transition whitespace-nowrap">
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center space-x-3 bg-indigo-800 px-4 py-2 rounded shadow-inner">
              <span className={`text-xs text-white px-2 py-1 rounded uppercase font-bold tracking-wide ${role === 'admin' ? 'bg-red-500' : role === 'issuer' ? 'bg-blue-500' : 'bg-green-500'}`}>
                {role}
              </span>
              <span className="font-mono text-sm">{account.slice(0,6)}...{account.slice(-4)}</span>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto mt-10 px-4">
        
        {status.message && (
          <div className={`mb-6 p-4 rounded-lg font-medium border shadow-sm ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
            status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {status.message}
          </div>
        )}

        {activeTab === "admin" && role === 'admin' && (
          <div className="bg-white p-8 rounded-xl shadow border border-red-100">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">⚙️ System Administrator</h2>
            <p className="text-gray-500 text-sm mb-6">Authorize new universities or event organizers to issue credentials.</p>
            <form onSubmit={handleAddIssuer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University / Organization Wallet Address</label>
                <input type="text" required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={newIssuerAddr} onChange={e => setNewIssuerAddr(e.target.value)} placeholder="0x..." />
              </div>
              <button type="submit" disabled={loading || isWrongNetwork} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition shadow">
                {loading ? "Processing..." : "Grant ISSUER_ROLE"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "issuer" && (
          <div className="bg-white p-8 rounded-xl shadow border border-gray-100">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">🏛️ Issue New Credential</h2>
            <p className="text-gray-500 text-sm mb-6">Mint a Soulbound Token and upload documents to IPFS.</p>
            <form onSubmit={handleMint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Address</label>
                <input type="text" required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={issueStudentAddr} onChange={e => setIssueStudentAddr(e.target.value)} placeholder="0x..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate File (PDF/Image)</label>
                <input type="file" required className="w-full border p-2 rounded-lg bg-gray-50" onChange={e => setIssueFile(e.target.files[0])} />
              </div>
              <button type="submit" disabled={loading || isWrongNetwork} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition">
                {loading ? "Processing..." : "Mint Credential"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "student" && (
          <div className="bg-white p-8 rounded-xl shadow border border-gray-100">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">🎓 My Portfolio</h2>
            <form onSubmit={handleGrantAccess} className="space-y-4 mb-8 bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="font-semibold text-purple-800 text-sm">Generate Recruiter Access</h3>
              <div className="flex space-x-2">
                <input type="text" required className="w-1/2 border p-2 rounded outline-none" value={studentPasscode} onChange={e => setStudentPasscode(e.target.value)} placeholder="Create Passcode" />
                <input type="number" required min="1" className="w-1/4 border p-2 rounded outline-none" value={studentDays} onChange={e => setStudentDays(e.target.value)} placeholder="Days" />
                <button type="submit" disabled={loading || isWrongNetwork} className="w-1/4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded">Generate</button>
              </div>
            </form>
            <h3 className="text-lg font-bold text-gray-700">My Verified Credentials</h3>
            <CertificateGallery certificates={myCertificates} />
          </div>
        )}

        {activeTab === "recruiter" && (
          <div className="bg-white p-8 rounded-xl shadow border border-gray-100">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">💼 Recruiter Verification</h2>
            <p className="text-gray-500 text-sm mb-6">Verify student credentials. No wallet connection required.</p>
            <form onSubmit={handleVerify} className="space-y-4">
              <input type="text" required className="w-full border p-3 rounded" value={verifyStudentAddr} onChange={e => setVerifyStudentAddr(e.target.value)} placeholder="Student Address (0x...)" />
              <input type="text" required className="w-full border p-3 rounded" value={verifyPasscode} onChange={e => setVerifyPasscode(e.target.value)} placeholder="Passcode" />
              <button type="submit" disabled={loading} className="w-full bg-gray-800 text-white font-bold py-3 rounded">Verify Access</button>
            </form>

            {verifyResult !== null && (
              <div className="mt-6">
                <div className={`p-4 rounded-lg text-center font-bold text-lg mb-4 ${verifyResult ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {verifyResult ? "✅ ACCESS GRANTED" : "❌ ACCESS DENIED: Link Expired or Invalid"}
                </div>
                {verifyResult && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mt-4">Student's Portfolio Data</h3>
                    <CertificateGallery certificates={recruiterCertificates} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}