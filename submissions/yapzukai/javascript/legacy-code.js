/**
 * Legacy ES5 JavaScript Code (BEFORE Modernization)
 * =================================================
 * 
 * This file shows the original legacy code that was modernized.
 * Included for comparison and educational purposes.
 * 
 * PROBLEMS WITH THIS CODE:
 * - ES5 syntax (var, function declarations)
 * - XMLHttpRequest (old HTTP API)
 * - Synchronous requests (blocking)
 * - Manual JSON string building
 * - No error handling
 * - No authentication
 * - No retry logic
 * - No input validation
 * - No logging
 * - Security vulnerabilities
 * - Poor user experience
 */

// Legacy ES5 JavaScript - MODERNIZE THIS!
function transferMoney(fromAccount, toAccount, amount) {
    // Old XMLHttpRequest approach
    var xhr = new XMLHttpRequest();
    var url = "http://localhost:8123/transfer";
    
    // Manual JSON string building - DANGEROUS!
    var data = '{"fromAccount":"' + fromAccount + '","toAccount":"' + toAccount + '","amount":' + amount + '}';
    
    xhr.open("POST", url, false); // Synchronous - BAD!
    xhr.setRequestHeader("Content-Type", "application/json");
    
    try {
        xhr.send(data);
        if (xhr.status == 200) {
            var result = JSON.parse(xhr.responseText);
            console.log("Transfer successful: " + result.transactionId);
            return result;
        } else {
            console.log("Error: " + xhr.status);
            return null;
        }
    } catch (e) {
        console.log("Request failed: " + e.message);
        return null;
    }
}

// Usage - old style
transferMoney("ACC1000", "ACC1001", 100.00);