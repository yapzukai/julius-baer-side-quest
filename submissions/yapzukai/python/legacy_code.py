"""
Legacy Python 2.7 Code (BEFORE Modernization)
==============================================

This file shows the original legacy code that was modernized.
Included for comparison and educational purposes.

PROBLEMS WITH THIS CODE:
- Python 2.7 syntax (print statements, string formatting)
- urllib2 (deprecated HTTP library)
- No error handling
- No async support
- Manual JSON handling
- No type hints
- No logging
- No configuration management
- No authentication
- No retry logic
- Security vulnerabilities
"""

import urllib.request
import urllib.error
import json

def transfer_money(from_acc, to_acc, amount):
    # Old-style string formatting
    url = "http://localhost:8123/transfer"
    
    # Manual JSON encoding
    data = '{"fromAccount":"' + from_acc + '","toAccount":"' + to_acc + '","amount":' + str(amount) + '}'
    
    # Old urllib approach (updated for Python 3)
    req = urllib.request.Request(url, data.encode('utf-8'))
    req.add_header('Content-Type', 'application/json')
    
    try:
        response = urllib.request.urlopen(req)
        result = response.read().decode('utf-8')
        print("Transfer result: " + result)
        return result
    except urllib.error.HTTPError as e:
        print("Error: " + str(e.code))
        return None

# Usage - old style
if __name__ == "__main__":
    transfer_money("ACC1000", "ACC1001", 100.00)