# Julius Baer SingHacks 2025 - Side Quest: Vibe Code Revival

> **GenAI-Powered Legacy Banking Code Modernization** — Upgrade legacy banking functions with modern development practices using Generative AI tools

---

## Challenge Summary

**Goal**: In 2 hours, refactor and modernize **ONE** legacy banking function using GenAI tools to achieve "vibe coding" - infusing modern practices like readability, efficiency, security, scalability, and best practices while preserving core functionality.

**Prize**: $1k prizes are up for grabs for standout submissions! 

**Theme**: "Vibe Code Revival" - Transforming legacy banking code from tight coupling, poor error handling, outdated patterns, and security vulnerabilities into modern, maintainable solutions.

**What You'll Do**:
1. **Choose ONE** of 2 legacy functions (Python Account Balance or Java Loan Calculator)
2. **Use GenAI tools** (Grok, GPT, Cursor, etc.) to refactor the code
3. **Submit** your modernized code with explanation via GitHub PR

> **📖 IMPORTANT**: This is a 2-hour challenge testing your ability to leverage GenAI tools for rapid code refactoring and modernization.

---

## 📋 The Problem We're Solving

### Current State
- **Legacy banking code** suffers from tight coupling, poor error handling, outdated patterns, and security vulnerabilities
- **Manual refactoring** could take days in real-world scenarios
- **GenAI tools** can accelerate this process to hours, enabling rapid modernization
- **Core banking systems** (inspired by Temenos) need urgent modernization

### What You're Building
- **Modernized banking functions** with improved architecture and security
- **GenAI-assisted refactoring** demonstrating effective prompt engineering
- **Modern paradigms** including async patterns, design principles, and testing
- **Enhanced code quality** with better readability, efficiency, and scalability

### Who Benefits
- **Banking developers**: Faster modernization of legacy systems
- **Compliance teams**: More secure and maintainable code
- **Operations teams**: Better performance and reliability
- **Development teams**: Modern development practices and patterns

---

## 🎯 Challenge Overview

**Duration**: 2 hours (strictly timed)  
**Team Size**: Individual  
**Format**: Choose ONE of 2 legacy functions to upgrade

### Assessment Criteria

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Functionality** | 40% | Does the upgraded code pass the same test cases as the legacy version? |
| **GenAI Integration** | 30% | Evidence of effective prompting and iteration |
| **Modernization Quality** | 20% | Improvements in readability, efficiency, security, and scalability |
| **Creativity & Vibe** | 10% | Bonus for innovative twists (microservices patterns, AI-assisted features) |

---

## 🏗️ Legacy Function Options - Choose ONE to Refactor

> **Important**: You must choose **ONE** of the two legacy functions below to modernize using GenAI tools.

### Option 1: Account Balance Inquiry (Python)

**Language**: Python 3.x  
**Legacy Description**: This procedural function simulates querying a customer's account balance from a legacy database. It uses string concatenation for SQL (vulnerable to injection), no input validation, and loops inefficiently over a mock dataset. It's from a batch-processing module in Temenos-like systems, handling ~100 queries/sec poorly under load.

**Legacy Code**:
```python
def get_account_balance(customer_id, account_type):
    # Mock database - in real Temenos, this would be a direct DB query
    mock_db = [
        {'id': 'CUST001', 'type': 'savings', 'balance': 1500.50},
        {'id': 'CUST002', 'type': 'checking', 'balance': 250.75},
        {'id': 'CUST001', 'type': 'checking', 'balance': 800.00},
        {'id': 'CUST003', 'type': 'savings', 'balance': -50.25}, # Overdraft
    ]
    query = "SELECT balance FROM accounts WHERE customer_id = '" + customer_id + "' AND type = '" + account_type + "'"
    print("Executing query:", query) # Debug - insecure!
    balance = 0.0
    for record in mock_db:
        if record['id'] == customer_id and record['type'] == account_type:
            balance = record['balance']
            break # Assumes one match; no error if multiple/none
    if balance < 0:
        print("Warning: Overdraft detected")
    return balance

# Example usage (for testing)
print(get_account_balance("CUST001", "savings")) # Should output: 1500.5
```

**Key Issues to Fix**:
- ❌ SQL injection vulnerability (string concatenation)
- ❌ No input validation
- ❌ Inefficient data processing (loops)
- ❌ Poor error handling
- ❌ No caching or async patterns
- ❌ Debug prints expose sensitive data

**Upgrade Goals**:
- ✅ Refactor into class-based service with async querying (use asyncio for scalability)
- ✅ Implement parameterized SQL (or ORM like SQLAlchemy mock)
- ✅ Add input sanitization and validation
- ✅ Implement caching (e.g., via functools.lru_cache)
- ✅ Add comprehensive error handling and logging
- ✅ Apply SOLID principles and type hints
- ✅ Return structured data (e.g., dict with status)

**Target Performance**: Handle 1,000+ queries/sec, prevent injection, add logging

**Test Cases**:
- `get_account_balance("CUST001", "savings")` → Output: 1500.5 (or equivalent structured)
- `get_account_balance("CUST999", "invalid")` → Output: 0.0 or error with message (no crash)
- `get_account_balance("CUST001'; DROP TABLE accounts;--", "savings")` → No injection exploit

**GenAI Prompt Idea**: *"Refactor this Python legacy function to use async, add security, and make it cacheable—output clean code with type hints."*

---

### Option 2: Loan Interest Calculation (Java)

**Language**: Java 8+  
**Legacy Description**: This static method calculates simple interest on a loan from a Temenos-style loan servicing module. It uses magic numbers, no exception handling, and imperative loops for rate tables—error-prone for varying loan terms and prone to arithmetic overflows in high-volume batch jobs.

**Legacy Code**:
```java
public class LoanCalculator {
    public static double calculateInterest(double principal, int years, double rate) {
        // Hardcoded annual compounding - no validation
        if (principal <= 0 || years <= 0) {
            System.out.println("Invalid input, using defaults");
            principal = 1000.0;
            years = 1;
        }
        double interest = 0.0;
        // Manual loop for compounding (inefficient for large years)
        for (int i = 0; i < years; i++) {
            interest += principal * (rate / 100) * (12 / 12); // Simplified monthly, but buggy
            principal += interest; // Compound on interest - wrong for simple!
        }
        // Magic number for tax deduction
        double finalAmount = principal + interest - (interest * 0.15);
        return finalAmount;
    }
    
    // Example usage (for testing)
    public static void main(String[] args) {
        System.out.println(calculateInterest(10000.0, 5, 5.0)); // Should approx: 12762.82 (but legacy is buggy)
    }
}
```

**Key Issues to Fix**:
- ❌ Magic numbers (0.15 tax rate)
- ❌ No exception handling
- ❌ Arithmetic overflow potential
- ❌ Buggy compounding logic
- ❌ Static method (not thread-safe)
- ❌ No validation for edge cases

**Upgrade Goals**:
- ✅ Convert to immutable class with builder pattern
- ✅ Use BigDecimal for precision
- ✅ Add validation exceptions
- ✅ Support compound interest formulas via strategy pattern (simple vs. compound)
- ✅ Thread-safe and extensible for new rate types
- ✅ Add logging and handle edge cases gracefully

**Target Performance**: Thread-safe, extensible for new rate types, with logging

**Test Cases**:
- `calculateInterest(10000.0, 5, 5.0)` → Output: 12762.82 (correct simple interest: P + Prt)
- `calculateInterest(-5000.0, 0, 10.0)` → Throws IllegalArgumentException with message
- `calculateInterest(1000.0, 10, 3.5)` → Output: 1350

**GenAI Prompt Idea**: *"Upgrade this Java legacy method to use BigDecimal, add design patterns for extensibility, and fix compounding logic—include JUnit test stubs."*


## 📝 Submission Requirements

### Required Deliverables
For **any one of the 2 legacy functions** (detailed above), submit:

- [ ] **Refactored code** - Your modernized version of the chosen legacy function
- [ ] **Short explanation** (1-2 paragraphs) covering:
  - Changes made and rationale
  - GenAI prompts used
  - Why the upgrade adds "vibe" (e.g., performance gains, security enhancements)
- [ ] **GitHub fork** with pull request to the original repository

### Optional Deliverables
- [ ] **Simple unit tests** or demo script showing before/after comparison
- [ ] **Performance benchmarks** demonstrating improvements
- [ ] **Additional documentation** of your GenAI process

---

## 🚀 Submission Steps for Hackers

### Step 1: Repository Setup
```bash
# 1. Fork the official repository on GitHub
# Go to: https://github.com/SingHacks-2025/julius-baer-side-quest
# Click "Fork" button

# 2. Clone your fork locally
git clone https://github.com/YOUR_USERNAME/julius-baer-side-quest
cd julius-baer-side-quest
```

### Step 2: Choose Your Legacy Function
- **Review both options** above (Python Account Balance or Java Loan Calculator)
- **Select ONE function** that matches your skills and interests
- **Understand the legacy code** and its specific issues
- **Plan your modernization approach** using GenAI

### Step 3: Document Your Process
Create a `REFACTORING_NOTES.md` file with:
- At the very top, include this metadata block (required):
```
Hacker Name: <Your Full Name>
Registered Email (SingHacks 2025): <your@email>
Selected Option: <Python Account Balance | Java Loan Calculator>
GitHub Username: <your_github>
```
- **Key GenAI prompts** you used (1-2 most effective ones)
- **Changes made** and why they improve the code
- **Performance improvements** achieved
- **Security enhancements** implemented

### Step 4: Submit Your Work
```bash
# 1. Commit your changes
git add .
git commit -m "Refactor [function_name]: Modernize with GenAI assistance"

# 2. Push to your fork
git push origin main

# 3. Create a Pull Request
# Go to your fork on GitHub
# Click "New Pull Request"
# Select: your-fork -> original-repo
# Title format (required): "GenAI Refactor: [Your Full Name] - [Option: Python|Java]"
# Description: Paste the metadata block and the contents of REFACTORING_NOTES.md
```

### Step 5: Final Checklist
Before submitting, ensure you have:
- [ ] **Metadata provided** (Name, Registered Email, Selected Option, GitHub username)
- [ ] **Working refactored code** that passes all test cases
- [ ] **Documentation** of your GenAI process (1-2 paragraphs)
- [ ] **Pull request** created on the original repository
- [ ] **2-hour time limit** respected
- [ ] **All deliverables** included in your PR


### What Happens After Submission
1. **Automated Testing**: Judges will run your code against the original test cases
2. **GenAI Review**: Judges will evaluate your prompt engineering and iteration process
3. **Code Review**: Assessment of modernization quality and improvements
4. **Scoring**: Based on the 4 criteria (Functionality 40%, GenAI Integration 30%, Modernization Quality 20%, Creativity & Vibe 10%)
5. **Results**: Top scorers receive swag, certificates, and shoutouts
6. **Feedback**: All participants get feedback on GenAI best practices

---

## 🏆 Judging Criteria Details

### Functionality (40%)
- Code passes all original test cases
- Maintains backward compatibility where required
- Handles edge cases appropriately
- Demonstrates correct business logic

### GenAI Integration (30%)
- Evidence of effective prompt engineering
- Iterative improvement through prompt refinement
- Creative use of GenAI capabilities
- Documentation of prompt strategies

### Modernization Quality (20%)
- **Readability**: Clear, well-documented code
- **Efficiency**: Performance improvements
- **Security**: Input validation, secure coding practices
- **Scalability**: Async patterns, caching, modular design

### Creativity & Vibe (10%)
- Innovative architectural patterns
- AI-assisted features
- Modern development practices
- Creative solutions to legacy problems

---

## ✅ Features Checklist

### Core Requirements
- [ ] Choose and refactor ONE legacy function
- [ ] Maintain original functionality
- [ ] Implement modern coding practices
- [ ] Add comprehensive error handling
- [ ] Include input validation and security measures

### GenAI Integration
- [ ] Document key prompts used
- [ ] Show iterative improvement process
- [ ] Demonstrate effective prompt engineering
- [ ] Include examples of GenAI-assisted decisions

### Modernization Features
- [ ] Apply SOLID principles
- [ ] Implement async patterns where appropriate
- [ ] Add type hints/annotations
- [ ] Include comprehensive documentation
- [ ] Add unit tests or validation

### Submission
- [ ] Create GitHub fork
- [ ] Submit pull request
- [ ] Include explanation document
- [ ] Meet 2-hour time limit


---

## 📚 Additional Resources

- **GenAI Prompt Engineering**: Best practices for coding assistance
- **Modern Banking Architecture**: Patterns and principles
- **Security Best Practices**: Input validation, secure coding
- **Performance Optimization**: Async patterns, caching strategies
- **Testing Strategies**: Unit tests, integration tests, validation


