module.exports = [
  "event Deposit(address indexed token, address indexed from, address indexed to, uint256 amount, uint256 nonce)",
  "event DepositSwap(address indexed fromToken, address indexed toToken, address indexed sender, address recipient, uint256 amount, uint256 nonce)",
  "function distribute(address token, address recipient, uint256 amount, uint256 depositNonce)"
];
