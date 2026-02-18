// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerchantGateway
 * @dev The "Cash Register" for Autonomous AI Agents.
 * Standardizes how merchants sell services and how agents pay via x402.
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MerchantGateway {
    address public merchant;
    IERC20 public usdc;

    struct Product {
        string name;
        uint256 price; // Price in USDC units (6 decimals)
        bool exists;
    }

    mapping(uint256 => Product) public products;
    uint256[] public productIds;

    event PaymentReceived(address indexed agent, uint256 indexed productId, uint256 amount, string memo);
    event ProductAdded(uint256 indexed productId, string name, uint256 price);

    modifier onlyMerchant() {
        require(msg.sender == merchant, "Only merchant can call this");
        _;
    }

    constructor(address _usdcAddress) {
        merchant = msg.sender;
        usdc = IERC20(_usdcAddress);
    }

    /**
     * @dev Adds or updates a product for sale.
     */
    function setProduct(uint256 _productId, string memory _name, uint256 _price) external onlyMerchant {
        if (!products[_productId].exists) {
            productIds.push(_productId);
        }
        products[_productId] = Product(_name, _price, true);
        emit ProductAdded(_productId, _name, _price);
    }

    /**
     * @dev AI Agents call this to purchase a service.
     * The agent must have approved this contract to spend USDC on its behalf.
     */
    function buy(uint256 _productId, string memory _memo) external {
        Product memory product = products[_productId];
        require(product.exists, "Product does not exist");
        
        // Transfer USDC from the agent (msg.sender) to this contract
        require(usdc.transferFrom(msg.sender, address(this), product.price), "USDC transfer failed");

        emit PaymentReceived(msg.sender, _productId, product.price, _memo);
    }

    /**
     * @dev Price discovery for agents.
     */
    function getPrice(uint256 _productId) external view returns (uint256) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].price;
    }

    /**
     * @dev Merchant withdraws settled funds.
     */
    function withdraw() external onlyMerchant {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        require(usdc.transfer(merchant, balance), "Withdrawal failed");
    }
}
