// SPDX-License-Identifier: MIT
//SECURITY integer overflow protection automatically protected using ^0.8.x vers
pragma solidity ^0.8.20;

// SEPARATION OF CONCERNS: We import secure, audited code instead of writing it all in one file.
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SkillChainMY Unified Student Portfolio
 * @notice Issues academic and extracurricular credentials as Soulbound Tokens (SBTs).
 * @dev Implements ERC721, RBAC, ReentrancyGuard, and the CEI pattern.
 */
contract SkillChainMY is ERC721, AccessControl, ReentrancyGuard {
    
    // SECURITY: RBAC (Role-Based Access Control)
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    uint256 private _nextTokenId;

    // GAS OPTIMIZATION: Struct Packing
    // An Ethereum storage slot is 32 bytes. 
    // An address is 20 bytes. A uint40 timestamp is 5 bytes. 
    // Because we put them next to each other, they pack into ONE single slot, saving massive gas fees!
    struct Credential {
        address issuer;
        uint40 timestamp;
        string ipfsCID;
    }

    // Maps a Token ID to its Credential data
    mapping(uint256 => Credential) public credentials;
    
    // Student Address => Recruiter Address => Expiry Timestamp
    mapping(address => mapping(bytes32 => uint256)) public linkAccess;

    /**
     * @notice Initializes the token and grants the deployer Admin rights.
     */
    constructor() ERC721("SkillChain Portfolio", "SKILL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Grants the ISSUER_ROLE to a university or event organizer.
     * @param account The address of the organization.
     */
     // SECURITY : RBAC (Role-Based Access Control)
    function addIssuer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /**
     * @notice Mints a new credential to a student.
     * @dev Uses ReentrancyGuard and CEI (Checks, Effects, Interactions) pattern.
     * @param student The recipient's wallet address.
     * @param _ipfsCID The IPFS hash (using calldata for gas optimization).
     */
     // SECURITY: RBAC (Role-Based Access Control)
     // SECURITY: Checks-Effects-Interactions pattern and ReentrancyGuard implemented here
    function issueCredential(address student, string calldata _ipfsCID) external onlyRole(ISSUER_ROLE) nonReentrant {
        // 1. CHECKS
        require(student != address(0), "Cannot issue to zero address");
        require(bytes(_ipfsCID).length > 0, "IPFS CID cannot be empty");

        // 2. EFFECTS
        uint256 tokenId = _nextTokenId++;
        credentials[tokenId] = Credential({
            issuer: msg.sender,
            timestamp: uint40(block.timestamp),
            ipfsCID: _ipfsCID
        });

        // 3. INTERACTIONS
        _safeMint(student, tokenId);
    }

    /**
     * @notice Allows a student to generate a temporary verification link passcode.
     * @param accessHash The keccak256 hash of the random passcode in the URL.
     * @param daysValid How many days the link should remain active.
     */
    function grantRecruiterAccess(bytes32 accessHash, uint256 daysValid) external {
        require(daysValid > 0, "Duration must be > 0");
        
        // Calculates the exact future timestamp when access expires
        uint256 expiry = block.timestamp + (daysValid * 1 days);
        linkAccess[msg.sender][accessHash] = expiry;
    }

    /**
     * @notice Wallet-Free check! A frontend read-only provider calls this to verify the URL passcode.
     * @param student The student being verified.
     * @param accessHash The hash of the passcode provided in the URL.
     * @return isValid Boolean indicating if the link is still active.
     */
    function verifyRecruiterAccess(address student, bytes32 accessHash) external view returns (bool isValid) {
        // Anyone (even a web app without MetaMask) can read this!
        if (linkAccess[student][accessHash] >= block.timestamp) {
            return true;
        }
        return false;
    }

    // --- SOULBOUND TOKEN (SBT) LOGIC ---
    
    /**
     * @notice Prevents the token from being transferred. Certificates cannot be sold!
     * @dev Overrides the standard ERC721 update function to lock the token to the soul (wallet).
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // If it's not a minting transaction (from address 0) and not a burning transaction (to address 0)...
        if (from != address(0) && to != address(0)) {
            revert("SkillChainMY: Credentials are Soulbound and cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }

    // Standard override required by Solidity when inheriting AccessControl and ERC721
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}