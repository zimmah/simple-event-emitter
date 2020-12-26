// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

contract eventEmitter {
    event gotPaid(uint timestamp, address caller, uint amount);

    function acceptEth() public payable {
        emit gotPaid(block.timestamp, msg.sender, msg.value);
    }
}