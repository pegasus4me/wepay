// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title Weppo
 * @dev Programmable Settlement Layer for AI Agents (x402 Compatible)
 * Enables "Pull" payments where agents authorize others to charge them.
 * Supports Gasless transactions via ERC2771.
 */
interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Weppo is ERC2771Context, Ownable {
    IERC20 public usdc;

    // Reentrancy Guard
    uint256 private _status;

    // Mapping: Agent -> Balance (Escrowed)
    mapping(address => uint256) public balances;

    // Mapping: Owner -> Spender -> Allowance
    mapping(address => mapping(address => uint256)) public allowances;

    event Deposit(address indexed agent, uint256 amount);
    event Withdrawal(address indexed agent, uint256 amount);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
    event Settlement(
        address indexed from,
        address indexed to,
        uint256 amount,
        string memo
    );

    constructor(
        address _usdc,
        address _trustedForwarder
    ) ERC2771Context(_trustedForwarder) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        _status = 1; // _NOT_ENTERED
    }

    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    /**
     * @dev Deposit USDC into Weppo escrow.
     * Used by agents to fund their spending account.
     * NOTE: This usually requires the user to submit the TX themselves (to approve transfer),
     * OR use EIP-2612 permit + meta-tx if USDC supports it on this chain.
     */
    function deposit(uint256 amount) external nonReentrant {
        address sender = _msgSender();
        require(
            usdc.transferFrom(sender, address(this), amount),
            "Transfer failed"
        );
        balances[sender] += amount;
        emit Deposit(sender, amount);
    }

    /**
     * @dev Withdraw USDC from Weppo escrow.
     */
    function withdraw(uint256 amount) external nonReentrant {
        address sender = _msgSender();
        require(balances[sender] >= amount, "Insufficient balance");
        balances[sender] -= amount;
        require(usdc.transfer(sender, amount), "Transfer failed");
        emit Withdrawal(sender, amount);
    }

    /**
     * @dev Sets the amount of USDC that `spender` can charge from `msg.sender`.
     * This is the "Pull" payment authorization.
     */
    function preAuthorize(address spender, uint256 maxAmount) external {
        address sender = _msgSender();
        allowances[sender][spender] = maxAmount;
        emit Approval(sender, spender, maxAmount);
    }

    /**
     * @dev Executes a "Pull" payment. The caller (service provider) charges the user.
     * @param from The agent to charge (must have pre-authorized msg.sender)
     * @param amount The amount to charge
     * @param memo A note or reference ID (e.g. x402 invoice ID)
     */
    function charge(
        address from,
        uint256 amount,
        string memory memo
    ) external nonReentrant {
        address spender = _msgSender();

        require(allowances[from][spender] >= amount, "Insufficient allowance");
        require(balances[from] >= amount, "Insufficient balance");

        allowances[from][spender] -= amount;
        balances[from] -= amount;
        balances[spender] += amount;

        emit Settlement(from, spender, amount, memo);
    }

    // Overrides to resolve inheritance conflict
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        override(Context, ERC2771Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
    }
}
