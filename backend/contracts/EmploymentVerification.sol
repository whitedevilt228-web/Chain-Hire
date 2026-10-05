// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmploymentVerification
 * @dev Cryptographic registry for verifying professional experiences on ChainHire 2.0
 */
contract EmploymentVerification {
    address public owner;

    struct VerificationRecord {
        uint256 experienceId;
        address candidate;
        address verifier;
        string company;
        string title;
        uint256 verifiedAt;
        bool isVerified;
    }

    // Mapping from experienceId => VerificationRecord
    mapping(uint256 => VerificationRecord) public verifications;

    // Mapping to track pending requests: experienceId => verifier
    mapping(uint256 => address) public requestedVerifiers;

    // Events
    event VerificationRequested(
        uint256 indexed experienceId,
        address indexed candidate,
        address indexed verifier,
        uint256 timestamp
    );

    event VerificationApproved(
        uint256 indexed experienceId,
        address indexed candidate,
        address indexed verifier,
        string company,
        string title,
        uint256 verifiedAt
    );

    event VerificationRevoked(
        uint256 indexed experienceId,
        address indexed verifier,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can execute");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Candidate requests verification from a specific recruiter/employer address
     */
    function requestVerification(uint256 _experienceId, address _verifier) external {
        require(_verifier != address(0), "Invalid verifier address");
        require(_verifier != msg.sender, "Cannot verify own experience");
        require(!verifications[_experienceId].isVerified, "Already verified");

        requestedVerifiers[_experienceId] = _verifier;

        emit VerificationRequested(
            _experienceId,
            msg.sender,
            _verifier,
            block.timestamp
        );
    }

    /**
     * @notice Verifier approves and stamps the employment credential on-chain
     */
    function approveVerification(
        uint256 _experienceId,
        address _candidate,
        string calldata _company,
        string calldata _title
    ) external {
        require(_candidate != address(0), "Invalid candidate address");
        require(bytes(_company).length > 0, "Company name cannot be empty");
        require(bytes(_title).length > 0, "Job title cannot be empty");

        verifications[_experienceId] = VerificationRecord({
            experienceId: _experienceId,
            candidate: _candidate,
            verifier: msg.sender,
            company: _company,
            title: _title,
            verifiedAt: block.timestamp,
            isVerified: true
        });

        emit VerificationApproved(
            _experienceId,
            _candidate,
            msg.sender,
            _company,
            _title,
            block.timestamp
        );
    }

    /**
     * @notice Query verification status and details for an experience
     */
    function getVerification(uint256 _experienceId)
        external
        view
        returns (
            uint256 experienceId,
            address candidate,
            address verifier,
            string memory company,
            string memory title,
            uint256 verifiedAt,
            bool isVerified
        )
    {
        VerificationRecord memory record = verifications[_experienceId];
        return (
            record.experienceId,
            record.candidate,
            record.verifier,
            record.company,
            record.title,
            record.verifiedAt,
            record.isVerified
        );
    }

    /**
     * @notice Check if an experience is verified
     */
    function isExperienceVerified(uint256 _experienceId) external view returns (bool) {
        return verifications[_experienceId].isVerified;
    }
}
