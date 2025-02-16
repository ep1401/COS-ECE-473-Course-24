// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISwap.sol";
import "./sAsset.sol";

contract Swap is Ownable, ISwap {

    address token0;
    address token1;
    uint reserve0;
    uint reserve1;
    mapping (address => uint) shares;
    uint public totalShares;

    constructor(address addr0, address addr1) {
        token0 = addr0;
        token1 = addr1;
    }

    function init(uint token0Amount, uint token1Amount) external override onlyOwner {
        require(reserve0 == 0 && reserve1 == 0, "init - already has liquidity");
        require(token0Amount > 0 && token1Amount > 0, "init - both tokens are needed");
        
        require(sAsset(token0).transferFrom(msg.sender, address(this), token0Amount));
        require(sAsset(token1).transferFrom(msg.sender, address(this), token1Amount));
        reserve0 = token0Amount;
        reserve1 = token1Amount;
        totalShares = sqrt(token0Amount * token1Amount);
        shares[msg.sender] = totalShares;
    }

    // https://github.com/Uniswap/v2-core/blob/v1.0.1/contracts/libraries/Math.sol
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function getReserves() external view returns (uint, uint) {
        return (reserve0, reserve1);
    }

    function getTokens() external view returns (address, address) {
        return (token0, token1);
    }

    function getShares(address LP) external view returns (uint) {
        return shares[LP];
    }

    /* TODO: implement your functions here */
    // Add liquidity to the pool
    function addLiquidity(uint token0Amount) external override {
        require(token0Amount > 0, "Amount must be greater than 0");
        
        // Calculate the required amount of token1 based on the current reserve ratio
        uint token1Amount = reserve1 * token0Amount / reserve0;
        
        // Transfer tokens from the user to the contract
        require(sAsset(token0).transferFrom(msg.sender, address(this), token0Amount), "Transfer of token0 failed");
        require(sAsset(token1).transferFrom(msg.sender, address(this), token1Amount), "Transfer of token1 failed");
        
        // Calculate new shares for the liquidity provider
        uint newShares = totalShares == 0 ? 
            sqrt(token0Amount * token1Amount) : 
            (token0Amount * totalShares) / reserve0;
        
        require(newShares > 0, "Insufficient liquidity minted");
        
        // Update reserves and shares
        reserve0 += token0Amount;
        reserve1 += token1Amount;
        totalShares += newShares;
        shares[msg.sender] += newShares;
    }

    // Remove liquidity from the pool
    function removeLiquidity(uint withdrawShares) external override {
        require(withdrawShares > 0 && withdrawShares <= shares[msg.sender], "Invalid shares amount");
        
        // Calculate the amounts of tokens to withdraw based on the shares
        uint amount0 = (reserve0 * withdrawShares) / totalShares;
        uint amount1 = (reserve1 * withdrawShares) / totalShares;
        
        require(amount0 > 0 && amount1 > 0, "Insufficient liquidity burned");
        
        // Update shares and reserves
        shares[msg.sender] -= withdrawShares;
        totalShares -= withdrawShares;
        reserve0 -= amount0;
        reserve1 -= amount1;
        
        // Transfer tokens to the user
        require(sAsset(token0).transfer(msg.sender, amount0), "Transfer of token0 failed");
        require(sAsset(token1).transfer(msg.sender, amount1), "Transfer of token1 failed");
    }

    // Swap token0 for token1
    function token0To1(uint token0Amount) external override {
        require(token0Amount > 0, "Amount must be greater than 0");
        
        // Calculate fee and amount to exchange
        uint fee = (token0Amount * 3) / 1000; // 0.3% fee
        uint token0AmountAfterFee = token0Amount - fee;
        
        // Calculate the amount of token1 to return based on the constant product formula
        uint token1Amount = (reserve1 * token0AmountAfterFee) / (reserve0 + token0AmountAfterFee);
        
        require(token1Amount > 0, "Insufficient output amount");
        
        // Transfer tokens
        require(sAsset(token0).transferFrom(msg.sender, address(this), token0Amount), "Transfer of token0 failed");
        require(sAsset(token1).transfer(msg.sender, token1Amount), "Transfer of token1 failed");
        
        // Update reserves
        reserve0 += token0Amount;
        reserve1 -= token1Amount;
    }

    // Swap token1 for token0
    function token1To0(uint token1Amount) external override {
        require(token1Amount > 0, "Amount must be greater than 0");
        
        // Calculate fee and amount to exchange
        uint fee = (token1Amount * 3) / 1000; // 0.3% fee
        uint token1AmountAfterFee = token1Amount - fee;
        
        // Calculate the amount of token0 to return based on the constant product formula
        uint token0Amount = (reserve0 * token1AmountAfterFee) / (reserve1 + token1AmountAfterFee);
        
        require(token0Amount > 0, "Insufficient output amount");
        
        // Transfer tokens
        require(sAsset(token1).transferFrom(msg.sender, address(this), token1Amount), "Transfer of token1 failed");
        require(sAsset(token0).transfer(msg.sender, token0Amount), "Transfer of token0 failed");
        
        // Update reserves
        reserve1 += token1Amount;
        reserve0 -= token0Amount;
    }

}
