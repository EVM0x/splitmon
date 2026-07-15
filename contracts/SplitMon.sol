// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SplitMon
 * @notice Onchain bill splitter — create splits, friends pay their share,
 *         funds auto-release when fully paid or auto-refund on timeout.
 */
contract SplitMon {
    struct Split {
        address creator;
        uint256 totalAmount;
        uint256 perPerson;
        uint256 deadline;
        uint8 participantCount;
        uint8 paidCount;
        bool settled;
        bool refunded;
        mapping(address => bool) hasPaid;
        mapping(address => bool) isParticipant;
        address[] participants;
        string title;
    }

    uint256 public splitCount;
    mapping(uint256 => Split) private splits;

    event SplitCreated(
        uint256 indexed splitId,
        address indexed creator,
        uint256 totalAmount,
        uint8 participantCount,
        uint256 perPerson,
        uint256 deadline,
        string title
    );

    event PaymentMade(uint256 indexed splitId, address indexed payer, uint256 amount);
    event SplitSettled(uint256 indexed splitId, address indexed creator, uint256 amount);
    event SplitRefunded(uint256 indexed splitId);
    event ParticipantRefunded(uint256 indexed splitId, address indexed participant, uint256 amount);

    /**
     * @notice Create a new split
     * @param _participants Array of participant addresses (excluding creator)
     * @param _deadline Unix timestamp after which participants can refund
     * @param _title Human-readable title for the split
     */
    function createSplit(
        address[] calldata _participants,
        uint256 _deadline,
        string calldata _title
    ) external payable returns (uint256) {
        require(_participants.length > 0, "Need at least 1 participant");
        require(_participants.length <= 20, "Max 20 participants");
        require(msg.value > 0, "Must send total amount");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_deadline <= block.timestamp + 30 days, "Deadline too far");

        // Check for duplicates and self-inclusion
        for (uint256 i = 0; i < _participants.length; i++) {
            require(_participants[i] != msg.sender, "Creator cannot be participant");
            require(_participants[i] != address(0), "Invalid participant address");
            for (uint256 j = i + 1; j < _participants.length; j++) {
                require(_participants[i] != _participants[j], "Duplicate participant");
            }
        }

        uint256 participantCount = uint8(_participants.length) + 1; // +1 for creator
        uint256 perPerson = msg.value / participantCount;

        // Rounding check — total must be divisible
        require(perPerson * participantCount == msg.value, "Amount not evenly divisible");

        splitCount++;
        uint256 splitId = splitCount;

        Split storage s = splits[splitId];
        s.creator = msg.sender;
        s.totalAmount = msg.value;
        s.perPerson = perPerson;
        s.participantCount = uint8(participantCount);
        s.deadline = _deadline;
        s.title = _title;
        s.paidCount = 1; // creator already "paid" by funding
        s.hasPaid[msg.sender] = true;
        s.isParticipant[msg.sender] = true;
        s.participants.push(msg.sender);

        for (uint256 i = 0; i < _participants.length; i++) {
            s.isParticipant[_participants[i]] = true;
            s.participants.push(_participants[i]);
        }

        emit SplitCreated(splitId, msg.sender, msg.value, uint8(participantCount), perPerson, _deadline, _title);

        return splitId;
    }

    /**
     * @notice Pay your share of a split
     * @param _splitId The split ID to pay into
     */
    function payShare(uint256 _splitId) external payable {
        Split storage s = splits[_splitId];
        require(s.creator != address(0), "Split does not exist");
        require(!s.settled, "Already settled");
        require(!s.refunded, "Already refunded");
        require(s.isParticipant[msg.sender], "Not a participant");
        require(!s.hasPaid[msg.sender], "Already paid");
        require(block.timestamp < s.deadline, "Deadline passed");
        require(msg.value == s.perPerson, "Incorrect payment amount");

        s.hasPaid[msg.sender] = true;
        s.paidCount++;

        emit PaymentMade(_splitId, msg.sender, msg.value);

        // Auto-settle if everyone paid
        if (s.paidCount == s.participantCount) {
            s.settled = true;
            uint256 payout = s.totalAmount;
            (bool sent, ) = s.creator.call{value: payout}("");
            require(sent, "Transfer to creator failed");
            emit SplitSettled(_splitId, s.creator, payout);
        }
    }

    /**
     * @notice Refund your share if deadline passed and split not settled
     * @param _splitId The split ID to refund from
     */
    function refund(uint256 _splitId) external {
        Split storage s = splits[_splitId];
        require(s.creator != address(0), "Split does not exist");
        require(!s.settled, "Already settled");
        require(!s.refunded, "Already refunded");
        require(block.timestamp >= s.deadline, "Deadline not reached");
        require(s.hasPaid[msg.sender], "Nothing to refund");

        s.hasPaid[msg.sender] = false;
        s.paidCount--;

        uint256 refundAmount = s.perPerson;
        (bool sent, ) = msg.sender.call{value: refundAmount}("");
        require(sent, "Refund transfer failed");

        emit ParticipantRefunded(_splitId, msg.sender, refundAmount);

        // If everyone refunded, mark as refunded
        if (s.paidCount == 0) {
            s.refunded = true;
            emit SplitRefunded(_splitId);
        }
    }

    // ========== View Functions ==========

    /**
     * @notice Get full split details
     */
    function getSplit(uint256 _splitId)
        external
        view
        returns (
            address creator,
            uint256 totalAmount,
            uint256 perPerson,
            uint256 deadline,
            uint8 participantCount,
            uint8 paidCount,
            bool settled,
            bool refunded,
            string memory title,
            address[] memory participants,
            bool[] memory paidStatus
        )
    {
        Split storage s = splits[_splitId];
        require(s.creator != address(0), "Split does not exist");

        participants = s.participants;
        paidStatus = new bool[](participants.length);
        for (uint256 i = 0; i < participants.length; i++) {
            paidStatus[i] = s.hasPaid[participants[i]];
        }

        return (
            s.creator,
            s.totalAmount,
            s.perPerson,
            s.deadline,
            s.participantCount,
            s.paidCount,
            s.settled,
            s.refunded,
            s.title,
            participants,
            paidStatus
        );
    }

    /**
     * @notice Check if an address has paid for a split
     */
    function hasPaid(uint256 _splitId, address _participant) external view returns (bool) {
        return splits[_splitId].hasPaid[_participant];
    }

    /**
     * @notice Check if an address is a participant in a split
     */
    function isParticipant(uint256 _splitId, address _participant) external view returns (bool) {
        return splits[_splitId].isParticipant[_participant];
    }

    // Allow contract to receive ETH (for potential direct transfers)
    receive() external payable {
        revert("Use createSplit or payShare");
    }
}
