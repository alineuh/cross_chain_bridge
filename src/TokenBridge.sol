// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );

    event Distribution(
        address indexed token,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );

    event Swap(
        address indexed fromToken,
        address indexed toToken,
        address indexed recipient,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 nonce
    );

    // State variables
    uint256 private _nonce;
    mapping(address => bool) private _supportedTokens;
    mapping(uint256 => bool) private _processedDeposits;
    mapping(address => mapping(address => uint256)) private _swapRates; // fromToken => toToken => rate
    bool private _paused;

    // Modifiers
    modifier whenNotPaused() {
        require(!_paused, "Bridge: paused");
        _;
    }

    modifier onlyDistributor() {
        require(msg.sender == owner(), "Bridge: not distributor");
        _;
    }

    constructor() Ownable(msg.sender) {
        _nonce = 0;
        _paused = false;
    }

    function addSupportedToken(address token) external onlyOwner {
        _supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) external onlyOwner {
        _supportedTokens[token] = false;
    }

    function pause() external onlyOwner {
        _paused = true;
    }

    function unpause() external onlyOwner {
        _paused = false;
    }

    function shutdown() external onlyOwner {
        _paused = true;
    }

    function resume() external onlyOwner {
        _paused = false;
    }

    function setSwapRate(address fromToken, address toToken, uint256 rate) external onlyOwner {
        require(rate > 0, "Bridge: rate must be greater than 0");
        _swapRates[fromToken][toToken] = rate;
    }

    function getSwapRate(address fromToken, address toToken) external view returns (uint256) {
        return _swapRates[fromToken][toToken];
    }

    function deposit(
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant whenNotPaused {
        require(_supportedTokens[token], "Bridge: token not supported");
        require(amount > 0, "Bridge: amount must be greater than 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 currentNonce = _nonce++;
        emit Deposit(token, msg.sender, recipient, amount, currentNonce);
    }

    function depositAndSwap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        address recipient
    ) external nonReentrant whenNotPaused {
        require(_supportedTokens[fromToken], "Bridge: fromToken not supported");
        require(_supportedTokens[toToken], "Bridge: toToken not supported");
        require(fromAmount > 0, "Bridge: amount must be greater than 0");

        uint256 rate = _swapRates[fromToken][toToken];
        require(rate > 0, "Bridge: no swap rate available");

        uint256 toAmount = (fromAmount * rate) / 1e18; // Assuming rate is scaled by 1e18
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), fromAmount);

        uint256 currentNonce = _nonce++;
        emit Swap(fromToken, toToken, recipient, fromAmount, toAmount, currentNonce);
    }

    function distribute(
        address token,
        address recipient,
        uint256 amount,
        uint256 depositNonce
    ) external nonReentrant whenNotPaused onlyDistributor {
        require(_supportedTokens[token], "Bridge: token not supported");
        require(!_processedDeposits[depositNonce], "Bridge: deposit already processed");

        _processedDeposits[depositNonce] = true;
        IERC20(token).safeTransfer(recipient, amount);
        emit Distribution(token, recipient, amount, depositNonce);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
