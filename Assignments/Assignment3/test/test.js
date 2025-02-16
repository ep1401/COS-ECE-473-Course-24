const fs = require('fs').promises;
contracts_to_deploy = ['Mint', 'EUSD', 'sAsset', 'PriceFeed']
var contracts = {}
for (name of contracts_to_deploy) {
    contracts[name] = artifacts.require(name)
}

contract("Mint test", async accounts => {
    console.log('starting test')
    
    it("Running setup", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        
        let minterRole = await instances['sAsset'].MINTER_ROLE.call()
        let burnerRole = await instances['sAsset'].BURNER_ROLE.call()

        let minter_result = await instances['sAsset'].hasRole.call(minterRole, instances['Mint'].address)
        let burner_result = await instances['sAsset'].hasRole.call(burnerRole, instances['Mint'].address)
        assert.equal(minter_result, false);
        assert.equal(burner_result, false);
        await instances['sAsset'].grantRole(minterRole, instances['Mint'].address);
        await instances['sAsset'].grantRole(burnerRole, instances['Mint'].address);
        
        let registered = await instances['Mint'].checkRegistered.call(instances['sAsset'].address)
        assert.equal(registered, false);
        instances['Mint'].registerAsset(instances['sAsset'].address, 2, instances['PriceFeed'].address)

    });
    it("Checking setup", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const balance = await instances['EUSD'].balanceOf.call(accounts[0]);
        const symbol = await instances['sAsset'].symbol.call();
        const price = await instances['PriceFeed'].getLatestPrice.call();
        assert.equal(balance, 10000000000000000);
        assert.equal(symbol, 'sTSLA');
        assert.equal(price[0], 100000000000);
        let minterRole = await instances['sAsset'].MINTER_ROLE.call()
        let burnerRole = await instances['sAsset'].BURNER_ROLE.call()

        let minter_result = await instances['sAsset'].hasRole.call(minterRole, instances['Mint'].address)
        let burner_result = await instances['sAsset'].hasRole.call(burnerRole, instances['Mint'].address)
        assert.equal(minter_result, true);
        assert.equal(burner_result, true);

        let registered = await instances['Mint'].checkRegistered.call(instances['sAsset'].address)
        assert.equal(registered, true);

        const collateral = await instances['EUSD'].balanceOf.call(instances['Mint'].address);
        assert.equal(collateral, 0);
          
    });

    it("Test 1: test openPosition", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2
        const price = await instances['PriceFeed'].getLatestPrice.call();

        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].openPosition(collateralAmount, instances['sAsset'].address, collateralRatio);

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 150000000);

        const balance = await instances['sAsset'].balanceOf.call(accounts[0]);
        assert.equal(balance, 150000000);

        const collateral = await instances['EUSD'].balanceOf.call(instances['Mint'].address);
        assert.equal(collateral, collateralAmount);
    });

    it("Test 2: test deposit", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2

        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].deposit(0, collateralAmount);

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount * 2);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 150000000);
        
        const collateral = await instances['EUSD'].balanceOf.call(instances['Mint'].address);
        assert.equal(collateral, collateralAmount * 2);
    });

    it("Test 3: test withdraw", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2

        await instances['Mint'].withdraw(0, collateralAmount);

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 150000000);

        const collateral = await instances['EUSD'].balanceOf.call(instances['Mint'].address);
        assert.equal(collateral, collateralAmount);
    });

    it("Test 4: test burn", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 150000000);

        await instances['Mint'].burn(0, result[3]);

        result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 0);

        const balance = await instances['sAsset'].balanceOf.call(accounts[0]);
        assert.equal(balance, 0);
    });

    it("Test 5: test mint", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2

        await instances['Mint'].mint(0, 150000000);

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], accounts[0]);
        assert.equal(result[1], collateralAmount);
        assert.equal(result[2], instances['sAsset'].address);
        assert.equal(result[3], 150000000);

        const balance = await instances['sAsset'].balanceOf.call(accounts[0]);
        assert.equal(balance, 150000000);
    });

    it("Test 6: test closePosition", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
        const collateralAmount = 3000 * 10 ** 8
        const collateralRatio = 2

        await instances['Mint'].closePosition(0);

        let result = await instances['Mint'].getPosition.call(0);
        assert.equal(result[0], 0);
        assert.equal(result[1], 0);
        assert.equal(result[2], 0);
        assert.equal(result[3], 0);

        const balance = await instances['sAsset'].balanceOf.call(accounts[0]);
        assert.equal(balance, 0);
    });
    it("Test 7: test invalid ownership for deposit", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
    
        const collateralAmount = 3000 * 10 ** 8;
        const collateralRatio = 2;
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].openPosition(collateralAmount, instances['sAsset'].address, collateralRatio);
    
        // Try deposit from an unauthorized account (account[1])
        try {
            await instances['Mint'].deposit(0, collateralAmount, { from: accounts[1] });
            assert.fail("Deposit should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can deposit"), `Expected 'Only the owner can deposit' but got ${err.message}`);
        }
    });
    
    it("Test 8: test invalid ownership for withdraw", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
    
        const collateralAmount = 3000 * 10 ** 8;
        const collateralRatio = 2;
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].openPosition(collateralAmount, instances['sAsset'].address, collateralRatio);
    
        // Try withdraw from an unauthorized account (account[1])
        try {
            await instances['Mint'].withdraw(0, collateralAmount, { from: accounts[1] });
            assert.fail("Withdraw should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can withdraw"), `Expected 'Only the owner can withdraw' but got ${err.message}`);
        }
    });
    
    it("Test 9: test invalid ownership for mint", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
    
        const mintAmount = 150000000;
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, mintAmount);
        await instances['Mint'].openPosition(mintAmount, instances['sAsset'].address, 2);
    
        // Try mint from an unauthorized account (account[1])
        try {
            await instances['Mint'].mint(0, mintAmount, { from: accounts[1] });
            assert.fail("Mint should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can mint"), `Expected 'Only the owner can mint' but got ${err.message}`);
        }
    });
    
    it("Test 10: test invalid ownership for burn", async () => {
        var instances = {}
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed()
        }
    
        const burnAmount = 150000000;
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, burnAmount);
        await instances['Mint'].openPosition(burnAmount, instances['sAsset'].address, 2);
    
        // Try burn from an unauthorized account (account[1])
        try {
            await instances['Mint'].burn(0, burnAmount, { from: accounts[1] });
            assert.fail("Burn should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can burn"), `Expected 'Only the owner can burn' but got ${err.message}`);
        }
    });
    it("Test 13: test under-collateralized CDP on withdraw", async () => {
        var instances = {};
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed();
        }
    
        const collateralAmount = 3000 * 10 ** 8;  // Amount of collateral (EUSD) to deposit
        const collateralRatio = 2;  // The collateral ratio (MCR is set to 2 in the contract)
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].openPosition(collateralAmount, instances['sAsset'].address, collateralRatio);
    
        // Try withdraw from an unauthorized account (account[1])
        const excessiveWithdrawalAmount = collateralAmount * 2; // Attempt to withdraw more than the collateral amount
        try {
            await instances['Mint'].withdraw(0, excessiveWithdrawalAmount, { from: accounts[1] });
            assert.fail("Withdraw should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can withdraw"), `Expected 'Only the owner can withdraw' but got ${err.message}`);
        }
    });
    
    it("Test 14: test under-collateralized CDP on mint", async () => {
        var instances = {};
        for (name of contracts_to_deploy) {
            instances[name] = await contracts[name].deployed();
        }
    
        const collateralAmount = 3000 * 10 ** 8;  // Amount of collateral (EUSD) to deposit
        const collateralRatio = 2;  // The collateral ratio (MCR is set to 2 in the contract)
    
        // Open position from account[0]
        await instances['EUSD'].approve(instances['Mint'].address, collateralAmount);
        await instances['Mint'].openPosition(collateralAmount, instances['sAsset'].address, collateralRatio);
    
        // Try mint from an unauthorized account (account[1])
        const excessiveMintAmount = 500000000;  // Trying to mint more than collateral supports
        try {
            await instances['Mint'].mint(0, excessiveMintAmount, { from: accounts[1] });
            assert.fail("Mint should only be allowed by the owner");
        } catch (err) {
            assert(err.message.includes("Only the owner can mint"), `Expected 'Only the owner can mint' but got ${err.message}`);
        }
    });
    
});