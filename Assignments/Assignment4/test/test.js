const contracts = {}
const contracts_to_deploy = ['sBNB', 'sTSLA', 'Swap']
for (name of contracts_to_deploy) {
    contracts[name] = artifacts.require(name)
}

contract("Swap test", async accounts => {
    
    it("Running setup", async () => {
        var instances = {};
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed();
        }

        const amount = 500000 * 10 ** 8;
        const tokens = await instances['Swap'].getTokens.call();
        assert.equal(tokens[0], instances['sBNB'].address);
        assert.equal(tokens[1], instances['sTSLA'].address);
        
        await instances['sBNB'].approve(instances['Swap'].address, amount);
        await instances['sTSLA'].approve(instances['Swap'].address, amount);
        await instances['Swap'].init(amount, amount);
    });
    
    it("Checking setup", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }

        const amount = 500000 * 10 ** 8;
        const reserves = await instances['Swap'].getReserves.call();
        assert.equal(reserves[0], amount);
        assert.equal(reserves[1], amount);

        const shares = await instances['Swap'].getShares.call(accounts[0]);
        assert.equal(shares, amount);
    });

    it("Test 1: test addLiquidity", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const amount = 500000 * 10 ** 8;
        await instances['sBNB'].approve(instances['Swap'].address, amount);
        await instances['sTSLA'].approve(instances['Swap'].address, amount);
        await instances['Swap'].addLiquidity(amount);

        const reserves = await instances['Swap'].getReserves.call();
        assert.equal(reserves[0], amount * 2);
        assert.equal(reserves[1], amount * 2);

        const shares = await instances['Swap'].getShares.call(accounts[0]);
        assert.equal(shares, amount * 2);
    });

    it("Test 2: test token0To1", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }

        const tokenSent = 1000 * 10 ** 8;
        await instances['sBNB'].transfer(accounts[1], tokenSent);
        await instances['sBNB'].approve(instances['Swap'].address, tokenSent, { from: accounts[1] });
        await instances['Swap'].token0To1(tokenSent, { from: accounts[1] });

        const tokenReceived = await instances['sTSLA'].balanceOf.call(accounts[1]);
        assert(Math.abs(tokenReceived - 99600698103) < 100);
        const reserves = await instances['Swap'].getReserves.call();
        assert.equal(reserves[0], 1000000 * 10 ** 8 + tokenSent);
        assert.equal(reserves[1], 1000000 * 10 ** 8 - tokenReceived);
    });

    it("Test 3: test token1To0", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }

        const reserves_before = await instances['Swap'].getReserves.call();

        const tokenSent = 1000 * 10 ** 8;
        await instances['sTSLA'].transfer(accounts[2], tokenSent);
        await instances['sTSLA'].approve(instances['Swap'].address, tokenSent, { from: accounts[2] });
        await instances['Swap'].token1To0(tokenSent, { from: accounts[2] });

        const tokenReceived = await instances['sBNB'].balanceOf.call(accounts[2]);
        assert(Math.abs(tokenReceived - 99799600897) < 100);
        const reserves = await instances['Swap'].getReserves.call();
        assert(reserves[0].eq(reserves_before[0].sub(tokenReceived)));
        assert.equal(reserves[1], reserves_before[1].toNumber() + tokenSent);
    });

    it("Test 4: test removeLiquidity", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }

        const reserves = await instances['Swap'].getReserves.call();

        const balance0 = await instances['sBNB'].balanceOf.call(accounts[0]);
        const balance1 = await instances['sTSLA'].balanceOf.call(accounts[0]);
        const shares = await instances['Swap'].getShares.call(accounts[0]);

        await instances['Swap'].removeLiquidity(shares);
        
        const new_reserves = await instances['Swap'].getReserves.call();
        assert.equal(new_reserves[0], 0);
        assert.equal(new_reserves[1], 0);

        const new_balance0 = await instances['sBNB'].balanceOf.call(accounts[0]);
        const new_balance1 = await instances['sTSLA'].balanceOf.call(accounts[0]);
        
        assert(new_balance0.eq(balance0.add(reserves[0])));
        assert(new_balance1.eq(balance1.add(reserves[1])));

        const new_shares = await instances['Swap'].getShares.call(accounts[0]);
        assert.equal(new_shares, 0);
    });

    it("Test 5: test invalid removeLiquidity", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }

        const shares = await instances['Swap'].getShares.call(accounts[0]);
        assert.equal(shares, 0);

        var error = false;
        try {
            await instances['Swap'].removeLiquidity(shares + 1);
        } catch (err) {
            error = true;
        }
        assert(error, "Removing more liquidity than owned should fail");
    });

    // Additional tests for invalid operations:

    it("Test 6: invalid addLiquidity with 0 token0 amount", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        var error = false;
        try {
            await instances['Swap'].addLiquidity(0);
        } catch (err) {
            error = true;
        }
        assert(error, "addLiquidity with 0 token0 should fail");
    });

    it("Test 7: invalid token0To1 with 0 token0 amount", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        var error = false;
        try {
            await instances['Swap'].token0To1(0);
        } catch (err) {
            error = true;
        }
        assert(error, "token0To1 with 0 token0 should fail");
    });

    it("Test 8: invalid token1To0 with 0 token1 amount", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        var error = false;
        try {
            await instances['Swap'].token1To0(0);
        } catch (err) {
            error = true;
        }
        assert(error, "token1To0 with 0 token1 should fail");
    });

    it("Test 9: re-initializing the pool should fail", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const amount = 500000 * 10 ** 8;
        var error = false;
        try {
            await instances['Swap'].init(amount, amount);
        } catch (err) {
            error = true;
        }
        assert(error, "Calling init again should fail");
    });

    it("Test 10: token0To1 with insufficient allowance", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const tokenSent = 1000 * 10 ** 8;
        // accounts[4] does not have an approval set for sBNB
        var error = false;
        try {
            await instances['Swap'].token0To1(tokenSent, { from: accounts[4] });
        } catch (err) {
            error = true;
        }
        assert(error, "token0To1 without approval should fail");
    });

    it("Test 11: token1To0 with insufficient balance", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const tokenSent = 1000 * 10 ** 8;
        var error = false;
        try {
            // accounts[5] has not been funded with sTSLA (or has an insufficient balance)
            await instances['sTSLA'].approve(instances['Swap'].address, tokenSent, { from: accounts[5] });
            await instances['Swap'].token1To0(tokenSent, { from: accounts[5] });
        } catch (err) {
            error = true;
        }
        assert(error, "token1To0 with insufficient balance should fail");
    });

    it("Test 12: removeLiquidity from an account with no shares", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        var error = false;
        try {
            // accounts[6] never provided liquidity, so has 0 shares.
            await instances['Swap'].removeLiquidity(1, { from: accounts[6] });
        } catch (err) {
            error = true;
        }
        assert(error, "removeLiquidity from a non-liquidity provider should fail");
    });

    it("Test 13: token0To1 with an extremely small amount causing 0 output", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const tokenSent = 1; // extremely small amount; after fee, token0In becomes 0
        // Transfer a small amount to accounts[7] and approve it.
        await instances['sBNB'].transfer(accounts[7], tokenSent);
        await instances['sBNB'].approve(instances['Swap'].address, tokenSent, { from: accounts[7] });
        var error = false;
        try {
            await instances['Swap'].token0To1(tokenSent, { from: accounts[7] });
        } catch (err) {
            error = true;
        }
        assert(error, "token0To1 with extremely small amount should fail due to insufficient output");
    });

    it("Test 14: token1To0 with an extremely small amount causing 0 output", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const tokenSent = 1; // extremely small amount; after fee, token1In becomes 0
        await instances['sTSLA'].transfer(accounts[8], tokenSent);
        await instances['sTSLA'].approve(instances['Swap'].address, tokenSent, { from: accounts[8] });
        var error = false;
        try {
            await instances['Swap'].token1To0(tokenSent, { from: accounts[8] });
        } catch (err) {
            error = true;
        }
        assert(error, "token1To0 with extremely small amount should fail due to insufficient output");
    });

});
