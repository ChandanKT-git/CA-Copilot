"""
Seed the CA CoPilot database with realistic demo data.
Run: ./venv/bin/python seed_db.py
"""
import asyncio
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# ---------- Target user ----------
USER_ID = "a9b0386d-2eea-4dac-a8ea-74f47d4e08fa"  # Chandan K T

def gid():
    return str(uuid.uuid4())

def ts(days_ago=0, hours_ago=0):
    return (datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_ago)).isoformat()


# ===================== CLIENT DATA =====================
CLIENTS = [
    {"name": "Rajesh Sharma",        "email": "rajesh.sharma@gmail.com",       "pan": "ABCPS1234R", "status": "active"},
    {"name": "Priya Patel",          "email": "priya.patel@outlook.com",       "pan": "BCDPP5678S", "status": "active"},
    {"name": "Amit Kumar Singh",     "email": "amit.singh@yahoo.com",          "pan": "CDESK9012T", "status": "active"},
    {"name": "Sneha Reddy",          "email": "sneha.reddy@gmail.com",         "pan": "DEFSR3456U", "status": "active"},
    {"name": "Vikram Mehta",         "email": "vikram.mehta@hotmail.com",      "pan": "EFGVM7890V", "status": "active"},
    {"name": "Ananya Gupta",         "email": "ananya.gupta@gmail.com",        "pan": "FGHAG2345W", "status": "active"},
    {"name": "Karthik Iyer",         "email": "karthik.iyer@outlook.com",      "pan": "GHIKI6789X", "status": "active"},
    {"name": "Meera Joshi",          "email": "meera.joshi@gmail.com",         "pan": "HIJMJ1234Y", "status": "inactive"},
    {"name": "Suresh Naidu",         "email": "suresh.naidu@yahoo.com",        "pan": "IJKSN5678Z", "status": "active"},
    {"name": "Deepa Krishnamurthy",  "email": "deepa.k@gmail.com",            "pan": "JKLDK9012A", "status": "active"},
    {"name": "Rohit Agarwal",        "email": "rohit.agarwal@gmail.com",       "pan": "KLMRA3456B", "status": "active"},
    {"name": "Kavitha Nair",         "email": "kavitha.nair@outlook.com",      "pan": "LMNKN7890C", "status": "inactive"},
]

# ===================== DOCUMENT DATA =====================
DOCUMENTS = [
    {"filename": "Form16_RajeshSharma_AY2025.pdf",     "doc_type": "Form 16",          "char_count": 14200, "num_chunks": 6,  "days_ago": 30},
    {"filename": "Form16_PriyaPatel_AY2025.pdf",        "doc_type": "Form 16",          "char_count": 12800, "num_chunks": 5,  "days_ago": 28},
    {"filename": "GST_Return_Q1_2025.xlsx",             "doc_type": "GST Return",       "char_count": 8500,  "num_chunks": 4,  "days_ago": 25},
    {"filename": "Balance_Sheet_FY2024.pdf",            "doc_type": "Balance Sheet",    "char_count": 22000, "num_chunks": 10, "days_ago": 22},
    {"filename": "PnL_Statement_FY2024.pdf",            "doc_type": "P&L Statement",    "char_count": 18500, "num_chunks": 8,  "days_ago": 20},
    {"filename": "Bank_Statement_HDFC_Apr2025.pdf",     "doc_type": "Bank Statement",   "char_count": 35000, "num_chunks": 14, "days_ago": 18},
    {"filename": "TDS_Certificate_AmitSingh.pdf",       "doc_type": "TDS Certificate",  "char_count": 6200,  "num_chunks": 3,  "days_ago": 15},
    {"filename": "Form26AS_VikramMehta_AY2025.pdf",     "doc_type": "Form 26AS",        "char_count": 9800,  "num_chunks": 4,  "days_ago": 14},
    {"filename": "GST_Invoice_Batch_Jul2025.csv",       "doc_type": "Invoice",          "char_count": 42000, "num_chunks": 18, "days_ago": 12},
    {"filename": "Audit_Report_KarthikIyer_FY2024.pdf", "doc_type": "Audit Report",     "char_count": 28000, "num_chunks": 12, "days_ago": 10},
    {"filename": "Rental_Agreement_SnehaReddy.pdf",     "doc_type": "Agreement",        "char_count": 11000, "num_chunks": 5,  "days_ago": 8},
    {"filename": "Investment_Proof_80C_Ananya.pdf",     "doc_type": "Investment Proof",  "char_count": 7800,  "num_chunks": 3,  "days_ago": 6},
    {"filename": "Capital_Gains_Statement_2025.pdf",    "doc_type": "Capital Gains",    "char_count": 15600, "num_chunks": 7,  "days_ago": 5},
    {"filename": "PRD.pdf",                             "doc_type": "Document",         "char_count": 20000, "num_chunks": 9,  "days_ago": 3},
    {"filename": "Salary_Slip_Aug2025_Rohit.pdf",       "doc_type": "Salary Slip",      "char_count": 4500,  "num_chunks": 2,  "days_ago": 1},
]

# Realistic chunk text samples for different doc types
CHUNK_SAMPLES = {
    "Form 16": [
        "FORM NO. 16 [See rule 31(1)(a)] PART A - Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary. Name and address of the Employer: TCS Ltd, Rajiv Gandhi Infotech Park, Hinjewadi, Pune 411057. TAN of the Deductor: PNET12345A.",
        "Gross Salary as per provisions contained in section 17(1): Rs 18,50,000. Value of perquisites under section 17(2): Rs 45,000. Profits in lieu of salary under section 17(3): Rs 0. Total: Rs 18,95,000.",
        "Deductions under Chapter VI-A: Section 80C - Life Insurance Premium Rs 1,50,000. Section 80D - Medical Insurance Rs 25,000. Section 80CCD(1B) - NPS Rs 50,000. Total Deductions: Rs 2,25,000.",
    ],
    "GST Return": [
        "GSTR-3B Summary for Quarter ending June 2025. GSTIN: 29ABCPS1234R1Z5. Legal Name: Sharma Trading Co. Outward taxable supplies (other than zero/nil rated): Taxable Value Rs 45,20,000, IGST Rs 8,13,600, CGST Rs 0, SGST Rs 0.",
        "Input Tax Credit (ITC): IGST Rs 5,45,000, CGST Rs 1,20,000, SGST Rs 1,20,000. Net tax payable after ITC: IGST Rs 2,68,600. Interest: Rs 0. Late Fee: Rs 100.",
    ],
    "Balance Sheet": [
        "BALANCE SHEET AS AT 31ST MARCH 2024. SOURCES OF FUNDS: Share Capital Rs 50,00,000. Reserves & Surplus Rs 1,25,00,000. Secured Loans Rs 35,00,000. Unsecured Loans Rs 10,00,000. TOTAL Rs 2,20,00,000.",
        "APPLICATION OF FUNDS: Fixed Assets (Net Block) Rs 85,00,000. Investments Rs 40,00,000. Current Assets, Loans & Advances: Inventories Rs 30,00,000, Sundry Debtors Rs 45,00,000, Cash & Bank Rs 12,00,000. Less: Current Liabilities Rs 22,00,000. Net Current Assets Rs 65,00,000.",
    ],
    "Bank Statement": [
        "HDFC Bank Statement. Account No: 50100XXXXXXX123. Period: 01-Apr-2025 to 30-Apr-2025. Opening Balance: Rs 4,52,340.50. Credits: 8 transactions totaling Rs 18,75,000.00. Debits: 23 transactions totaling Rs 15,20,450.00. Closing Balance: Rs 8,06,890.50.",
        "Date: 05-Apr-2025, Description: NEFT-CR-SALARY-TCS-APR25, Credit: Rs 1,45,000.00. Date: 10-Apr-2025, Description: UPI-DR-AMAZON, Debit: Rs 3,450.00. Date: 15-Apr-2025, Description: NACH-DR-HDFC-HOME-LOAN-EMI, Debit: Rs 42,500.00.",
    ],
}

DEFAULT_CHUNK = "This section contains financial data relevant to the taxpayer's assessment for the current financial year. All figures are in Indian Rupees (INR) and have been verified against source documents."


# ===================== ITR VALIDATIONS =====================
ITR_RECORDS = [
    {
        "taxpayer_name": "Rajesh Sharma", "pan": "ABCPS1234R", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 1850000, "house_property": -150000, "other_sources": 45000},
        "deductions": {"section_80c": 150000, "section_80d": 25000, "nps_80ccd1b": 50000},
        "taxes": {"tds": 185000, "advance_tax": 0}, "days_ago": 25
    },
    {
        "taxpayer_name": "Priya Patel", "pan": "BCDPP5678S", "assessment_year": "2025-26", "regime": "old",
        "income": {"salary": 1200000, "other_sources": 30000},
        "deductions": {"section_80c": 150000, "section_80d": 50000, "home_loan_interest": 200000},
        "taxes": {"tds": 95000}, "days_ago": 22
    },
    {
        "taxpayer_name": "Amit Kumar Singh", "pan": "CDESK9012T", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 2500000, "capital_gains": 350000, "other_sources": 80000},
        "deductions": {"section_80c": 150000}, "taxes": {"tds": 380000, "advance_tax": 50000}, "days_ago": 20
    },
    {
        "taxpayer_name": "Sneha Reddy", "pan": "DEFSR3456U", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 950000}, "deductions": {}, "taxes": {"tds": 45000}, "days_ago": 18
    },
    {
        "taxpayer_name": "Vikram Mehta", "pan": "EFGVM7890V", "assessment_year": "2025-26", "regime": "old",
        "income": {"salary": 3200000, "house_property": -200000, "business": 500000, "other_sources": 120000},
        "deductions": {"section_80c": 150000, "section_80d": 75000, "nps_80ccd1b": 50000, "home_loan_interest": 200000},
        "taxes": {"tds": 520000, "advance_tax": 100000, "self_assessment_tax": 25000}, "days_ago": 15
    },
    {
        "taxpayer_name": "Ananya Gupta", "pan": "FGHAG2345W", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 680000}, "deductions": {}, "taxes": {"tds": 12000}, "days_ago": 12
    },
    {
        "taxpayer_name": "Karthik Iyer", "pan": "GHIKI6789X", "assessment_year": "2025-26", "regime": "old",
        "income": {"salary": 1600000, "other_sources": 95000},
        "deductions": {"section_80c": 150000, "section_80d": 30000, "section_80g": 20000},
        "taxes": {"tds": 175000}, "days_ago": 10
    },
    {
        "taxpayer_name": "Suresh Naidu", "pan": "IJKSN5678Z", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 4500000, "capital_gains": 800000},
        "deductions": {"section_80c": 150000, "nps_80ccd1b": 50000},
        "taxes": {"tds": 750000, "advance_tax": 200000}, "days_ago": 7
    },
    {
        "taxpayer_name": "Rohit Agarwal", "pan": "KLMRA3456B", "assessment_year": "2025-26", "regime": "new",
        "income": {"salary": 1100000, "other_sources": 15000},
        "deductions": {"section_80c": 100000}, "taxes": {"tds": 78000}, "days_ago": 3
    },
    {
        "taxpayer_name": "Deepa Krishnamurthy", "pan": "JKLDK9012A", "assessment_year": "2025-26", "regime": "old",
        "income": {"salary": 2100000, "house_property": -180000, "other_sources": 60000},
        "deductions": {"section_80c": 150000, "section_80d": 50000, "home_loan_interest": 200000, "nps_80ccd1b": 50000},
        "taxes": {"tds": 280000, "advance_tax": 30000}, "days_ago": 1
    },
]


# ===================== CHAT SESSIONS =====================
CHAT_SESSIONS = [
    {
        "title": "Section 80C deduction limits for FY 2024-25",
        "days_ago": 28,
        "messages": [
            ("user", "What is the maximum deduction allowed under Section 80C for FY 2024-25?"),
            ("assistant", "Under Section 80C of the Income Tax Act, the maximum deduction allowed for FY 2024-25 (AY 2025-26) is **₹1,50,000**.\n\nThis includes investments/expenses such as:\n- **PPF** (Public Provident Fund)\n- **ELSS** (Equity Linked Savings Scheme)\n- **NSC** (National Savings Certificate)\n- **Life Insurance Premium**\n- **5-year Fixed Deposits**\n- **Tuition fees** for up to 2 children\n- **Home loan principal repayment**\n- **Sukanya Samriddhi Yojana**\n\n> **Note:** This deduction is only available under the **Old Tax Regime**. Under the New Tax Regime, Section 80C deductions are not allowed."),
            ("user", "Can my client claim both 80C and 80CCD(1B)?"),
            ("assistant", "Yes, your client can claim **both** deductions:\n\n1. **Section 80C**: Up to ₹1,50,000\n2. **Section 80CCD(1B)**: Additional ₹50,000 (exclusively for NPS contributions)\n\nThis means the total deduction can be up to **₹2,00,000** if the client invests ₹1,50,000 in 80C-eligible instruments AND ₹50,000 in NPS under 80CCD(1B).\n\nAgain, this is only under the **Old Regime**."),
        ],
    },
    {
        "title": "GST reconciliation for Sharma Trading Q1",
        "days_ago": 20,
        "messages": [
            ("user", "I need to reconcile the GSTR-3B with GSTR-2A for my client Sharma Trading for Q1 FY 2025-26. What should I check?"),
            ("assistant", "For GSTR-3B vs GSTR-2A reconciliation for Sharma Trading Q1, here's a systematic checklist:\n\n**Key Reconciliation Steps:**\n1. **ITC Claimed vs Available** — Compare ITC claimed in GSTR-3B with ITC reflected in GSTR-2A/2B\n2. **Invoice-level matching** — Identify mismatches in invoice numbers, dates, and amounts\n3. **Reverse charge transactions** — Verify RCM entries are correctly reported\n4. **Credit/Debit notes** — Ensure all CN/DN are reflected in both returns\n5. **Inter-state vs Intra-state** — Verify IGST/CGST/SGST classification\n\n**Common Discrepancies:**\n- Supplier not filing their GSTR-1 (ITC shows in 3B but not 2A)\n- Timing differences between invoice booking and filing\n- Rounding differences in tax amounts\n\nWould you like me to analyze the uploaded GST return document for specific discrepancies?"),
        ],
    },
    {
        "title": "New vs Old regime comparison for Vikram Mehta",
        "days_ago": 14,
        "messages": [
            ("user", "My client Vikram Mehta has salary income of 32L, house property loss of 2L, business income of 5L and other sources of 1.2L. He has significant deductions under old regime. Which regime should he choose?"),
            ("assistant", "Let me analyze Vikram Mehta's case:\n\n**Gross Total Income:** ₹36,20,000\n(Salary ₹32,00,000 + House Property -₹2,00,000 + Business ₹5,00,000 + Other ₹1,20,000)\n\n**Old Regime Computation:**\n- Standard Deduction: ₹50,000\n- Section 80C: ₹1,50,000\n- Section 80D: ₹75,000\n- NPS 80CCD(1B): ₹50,000\n- Home Loan Interest (Sec 24): ₹2,00,000\n- Total Deductions: ₹5,25,000\n- Taxable Income: ₹30,95,000\n- Tax: ~₹7,70,500 + 4% cess = **₹8,01,320**\n\n**New Regime Computation:**\n- Standard Deduction: ₹75,000\n- Taxable Income: ₹35,45,000\n- Tax: ~₹6,63,500 + 4% cess = **₹6,90,040**\n\n**Recommendation:** Despite Vikram's significant deductions, the **New Regime saves approximately ₹1,11,280** due to the lower slab rates. I'd recommend the New Regime for AY 2025-26.\n\n⚠️ *Note: This is an indicative calculation. Please validate with the ITR validation tool for precise figures.*"),
        ],
    },
    {
        "title": "TDS on property sale — Section 194-IA",
        "days_ago": 8,
        "messages": [
            ("user", "My client sold a property for 85 lakhs. What are the TDS implications under Section 194-IA?"),
            ("assistant", "Under **Section 194-IA**, TDS on sale of immovable property applies as follows:\n\n**For your client's property sold at ₹85,00,000:**\n\n| Parameter | Detail |\n|-----------|--------|\n| **Applicability** | Yes — sale consideration exceeds ₹50 lakh threshold |\n| **TDS Rate** | 1% of sale consideration |\n| **TDS Amount** | ₹85,000 |\n| **Deductor** | Buyer of the property |\n| **Form** | 26QB (to be filed by buyer within 30 days) |\n| **Certificate** | Form 16B (issued to seller within 15 days of filing 26QB) |\n\n**Important Points:**\n1. TDS is on the **total sale consideration**, not just capital gains\n2. If buyer fails to deduct TDS, they face interest @ 1% per month\n3. If PAN is not provided by seller, TDS rate increases to **20%**\n4. The buyer should obtain Form 16B from TRACES portal\n\n**Capital Gains Computation** would be separate — do you want me to help with that as well?"),
            ("user", "Yes, the property was bought in 2018 for 45 lakhs"),
            ("assistant", "Here's the capital gains computation for your client:\n\n**Long-Term Capital Gains (LTCG)** — held for more than 24 months ✅\n\n| Item | Amount |\n|------|--------|\n| Sale Consideration | ₹85,00,000 |\n| Cost of Acquisition (2018) | ₹45,00,000 |\n| Indexed Cost (CII 2018-19: 280, CII 2024-25: 363) | ₹58,33,929 |\n| LTCG | ₹26,66,071 |\n| Tax @ 20% with indexation | ₹5,33,214 |\n| Cess @ 4% | ₹21,329 |\n| **Total Tax on Capital Gains** | **₹5,54,543** |\n\n**Tax Saving Options (Section 54/54EC):**\n- **Section 54**: Invest LTCG in a new residential property within 2 years (or construct within 3 years) — Full exemption\n- **Section 54EC**: Invest up to ₹50 lakh in specified bonds (NHAI/REC) within 6 months — Proportionate exemption\n- **Capital Gains Account Scheme**: If reinvestment not done before ITR filing, deposit in CGAS\n\nShall I help with the ITR filing for this?"),
        ],
    },
    {
        "title": "Audit requirements under Section 44AB",
        "days_ago": 3,
        "messages": [
            ("user", "When is a tax audit mandatory under Section 44AB? One of my clients has turnover of 8 crores."),
            ("assistant", "Under **Section 44AB**, tax audit requirements for FY 2024-25 are:\n\n**For Business:**\n| Turnover Threshold | Audit Required? |\n|---|---|\n| > ₹1 crore (cash transactions > 5%) | ✅ Yes |\n| > ₹10 crore (cash transactions ≤ 5%) | ✅ Yes |\n| ≤ ₹1 crore | ❌ No |\n| ₹1 Cr - ₹10 Cr (cash ≤ 5%) | ❌ No |\n\n**For Profession:**\n| Gross Receipts | Audit Required? |\n|---|---|\n| > ₹50 lakh | ✅ Yes |\n| ≤ ₹50 lakh | ❌ No |\n\n**For your client with ₹8 crore turnover:**\n- If cash receipts/payments ≤ 5% of total → **No audit required** (₹10 Cr limit applies)\n- If cash receipts/payments > 5% of total → **Audit required** (₹1 Cr limit applies)\n\n**Key Deadlines:**\n- Audit report due: **30th September 2025**\n- ITR filing due: **31st October 2025**\n- Form: **3CA-3CD** (if already audited) or **3CB-3CD** (if not)\n\nPlease verify the cash transaction percentage for your client to determine the applicable threshold."),
        ],
    },
]


# ===================== CLIENT MESSAGES =====================
CLIENT_MESSAGES_DATA = [
    {"client_idx": 0, "subject": "ITR Filing Confirmation - AY 2025-26",
     "body": "Dear Rajesh,\n\nYour Income Tax Return for AY 2025-26 has been filed successfully. Your acknowledgement number is CPC/ITR/2025/1234567.\n\nKey Details:\n- Gross Total Income: ₹17,45,000\n- Total Tax Liability: ₹1,82,000\n- TDS Credit: ₹1,85,000\n- Refund Due: ₹3,000\n\nPlease retain this for your records.\n\nBest regards,\nCA Chandan K T", "days_ago": 24},
    {"client_idx": 1, "subject": "Documents Required for ITR Filing",
     "body": "Dear Priya,\n\nKindly share the following documents for your ITR filing:\n1. Form 16 from employer\n2. Bank statements (all accounts)\n3. Home loan interest certificate\n4. Medical insurance premium receipts (80D)\n5. Investment proofs for Section 80C\n\nDeadline: 15th July 2025\n\nBest regards,\nCA Chandan K T", "days_ago": 30},
    {"client_idx": 2, "subject": "Advance Tax Reminder - Q2 FY 2025-26",
     "body": "Dear Amit,\n\nThis is a reminder that Q2 Advance Tax installment is due on 15th September 2025.\n\nEstimated advance tax for Q2: ₹1,20,000\n\nPlease ensure timely payment to avoid interest under Section 234C.\n\nBest regards,\nCA Chandan K T", "days_ago": 5},
    {"client_idx": 4, "subject": "GST Return Filed - GSTR-3B July 2025",
     "body": "Dear Vikram,\n\nYour GSTR-3B for July 2025 has been filed successfully.\n\nSummary:\n- Output Tax: ₹2,45,000\n- ITC Claimed: ₹1,80,000\n- Net GST Payable: ₹65,000\n- Payment Reference: 25071234567890\n\nBest regards,\nCA Chandan K T", "days_ago": 2},
    {"client_idx": 5, "subject": "Welcome to CA Chandan K T's Practice",
     "body": "Dear Ananya,\n\nWelcome! I'm pleased to take you on as a client. Here's what we'll need to get started:\n\n1. PAN Card copy\n2. Aadhaar Card copy\n3. Previous year's ITR (if filed)\n4. Bank account details\n\nOur annual retainer fee is ₹15,000 + GST for individual tax filing services.\n\nBest regards,\nCA Chandan K T", "days_ago": 15},
    {"client_idx": 6, "subject": "Tax Audit Report - Draft for Review",
     "body": "Dear Karthik,\n\nPlease find attached the draft Tax Audit Report (Form 3CD) for your review.\n\nKey observations:\n- Turnover: ₹4,80,00,000\n- Net Profit Ratio: 8.2%\n- No disallowances under Section 40A(3)\n- MSME payments compliant under Section 43B(h)\n\nPlease review and confirm by 25th September.\n\nBest regards,\nCA Chandan K T", "days_ago": 8},
    {"client_idx": 9, "subject": "Quarterly Tax Planning Review",
     "body": "Dear Deepa,\n\nTime for our quarterly tax planning review. Based on your current income trajectory:\n\n- Projected Annual Salary: ₹21,00,000\n- Estimated Tax (Old Regime): ₹3,20,000\n- Suggested additional investments:\n  • NPS: ₹50,000 (extra 80CCD(1B) benefit)\n  • ELSS: ₹50,000 remaining under 80C\n\nPotential savings: ~₹30,000\n\nLet's schedule a call this week.\n\nBest regards,\nCA Chandan K T", "days_ago": 1},
]


# ===================== AUDIT LOG DATA =====================
AUDIT_ACTIONS = [
    ("document.upload", "document"),
    ("copilot.query", "session"),
    ("itr.validate", "itr"),
    ("client.create", "client"),
    ("client.message", "client"),
    ("reconcile.run", "document"),
    ("document.upload", "document"),
    ("copilot.query", "session"),
    ("copilot.query", "session"),
    ("document.upload", "document"),
]


async def seed():
    mongo = AsyncIOMotorClient(MONGO_URL)
    db = mongo[DB_NAME]

    print("🌱 Seeding CA CoPilot database for user:", USER_ID)

    # ---------- 1. Clients ----------
    client_ids = []
    for i, c in enumerate(CLIENTS):
        cid = gid()
        client_ids.append(cid)
        await db.clients.insert_one({
            "id": cid, "user_id": USER_ID, "name": c["name"], "email": c["email"],
            "pan": c["pan"], "status": c["status"], "messages_sent": 0,
            "created_at": ts(days_ago=35 - i),
        })
    print(f"  ✅ {len(CLIENTS)} clients created")

    # ---------- 2. Documents & Chunks ----------
    doc_ids = []
    total_chunks = 0
    for d in DOCUMENTS:
        did = gid()
        doc_ids.append(did)
        doc_type_key = d["doc_type"]
        sample_chunks = CHUNK_SAMPLES.get(doc_type_key, [DEFAULT_CHUNK])

        chunk_docs = []
        for ci in range(d["num_chunks"]):
            chunk_text = sample_chunks[ci % len(sample_chunks)] if ci < len(sample_chunks) * 3 else DEFAULT_CHUNK
            chunk_docs.append({
                "id": gid(), "document_id": did, "user_id": USER_ID,
                "filename": d["filename"], "index": ci, "text": chunk_text,
                "created_at": ts(days_ago=d["days_ago"]),
            })
        if chunk_docs:
            await db.chunks.insert_many(chunk_docs)
            total_chunks += len(chunk_docs)

        await db.documents.insert_one({
            "id": did, "user_id": USER_ID, "filename": d["filename"],
            "storage_path": f"ca-copilot/uploads/{USER_ID}/{did}.pdf",
            "content_type": "application/pdf" if d["filename"].endswith(".pdf") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "size": d["char_count"] * 2, "doc_type": d["doc_type"],
            "status": "parsed", "num_chunks": d["num_chunks"],
            "char_count": d["char_count"], "is_deleted": False,
            "created_at": ts(days_ago=d["days_ago"]),
        })
    print(f"  ✅ {len(DOCUMENTS)} documents created ({total_chunks} chunks)")

    # ---------- 3. ITR Validations ----------
    from tax import compute_return
    for itr in ITR_RECORDS:
        payload = {
            "taxpayer_name": itr["taxpayer_name"], "pan": itr["pan"],
            "assessment_year": itr["assessment_year"], "regime": itr["regime"],
            "income": itr["income"], "deductions": itr["deductions"], "taxes": itr["taxes"],
        }
        computed = compute_return(payload)

        # Generate a realistic analysis
        checks = [
            {"label": "Regime Optimality", "status": "pass" if computed["better_regime"] == itr["regime"] else "warn",
             "detail": f"Current regime is {'optimal' if computed['better_regime'] == itr['regime'] else 'suboptimal'}. Savings with {computed['better_regime']} regime: ₹{computed['regime_savings']:,.0f}"},
            {"label": "TDS vs Tax Liability", "status": "pass" if abs(computed["refund_or_payable"]) < 50000 else "warn",
             "detail": f"{'Refund of' if computed['refund_or_payable'] < 0 else 'Tax payable of'} ₹{abs(computed['refund_or_payable']):,.0f}"},
            {"label": "Data Completeness", "status": "pass", "detail": "All required fields provided"},
        ]

        rid = gid()
        await db.itr_validations.insert_one({
            "id": rid, "user_id": USER_ID,
            "taxpayer_name": itr["taxpayer_name"], "pan": itr["pan"],
            "assessment_year": itr["assessment_year"],
            "input": payload, "computation": computed,
            "analysis": {
                "checks": checks, "issues": [],
                "recommendations": [f"Consider {computed['better_regime']} regime for potential savings of ₹{computed['regime_savings']:,.0f}"] if computed["better_regime"] != itr["regime"] else [],
                "summary": f"Tax computed for {itr['taxpayer_name']} under {itr['regime']} regime. Total tax: ₹{computed['tax_computation']['total_tax']:,.0f}. Status: {computed['status']}."
            },
            "created_at": ts(days_ago=itr["days_ago"]),
        })
    print(f"  ✅ {len(ITR_RECORDS)} ITR validations created")

    # ---------- 4. Chat Sessions & Messages ----------
    total_msgs = 0
    for sess in CHAT_SESSIONS:
        sid = gid()
        await db.chat_sessions.insert_one({
            "id": sid, "user_id": USER_ID, "title": sess["title"],
            "created_at": ts(days_ago=sess["days_ago"]),
            "updated_at": ts(days_ago=sess["days_ago"]),
        })
        for j, (role, content) in enumerate(sess["messages"]):
            await db.messages.insert_one({
                "id": gid(), "session_id": sid, "user_id": USER_ID,
                "role": role, "content": content, "sources": [],
                "created_at": ts(days_ago=sess["days_ago"], hours_ago=-j),
            })
            total_msgs += 1
    print(f"  ✅ {len(CHAT_SESSIONS)} chat sessions created ({total_msgs} messages)")

    # ---------- 5. Client Messages ----------
    for cm in CLIENT_MESSAGES_DATA:
        cid = client_ids[cm["client_idx"]]
        await db.client_messages.insert_one({
            "id": gid(), "user_id": USER_ID, "client_id": cid,
            "subject": cm["subject"], "body": cm["body"],
            "channel": "email (stub)", "status": "sent",
            "created_at": ts(days_ago=cm["days_ago"]),
        })
        await db.clients.update_one({"id": cid}, {"$inc": {"messages_sent": 1}})
    print(f"  ✅ {len(CLIENT_MESSAGES_DATA)} client messages created")

    # ---------- 6. Audit Logs ----------
    audit_count = 0
    for day in range(30, -1, -1):
        n_actions = random.randint(2, 6)
        for _ in range(n_actions):
            action, entity = random.choice(AUDIT_ACTIONS)
            details = {
                "document.upload": lambda: random.choice([d["filename"] for d in DOCUMENTS]),
                "copilot.query": lambda: random.choice(["What is 80C?", "GST filing help", "TDS on salary", "Audit requirements", "Capital gains query"]),
                "itr.validate": lambda: f"{random.choice([i['taxpayer_name'] for i in ITR_RECORDS])} AY2025-26",
                "client.create": lambda: random.choice([c["name"] for c in CLIENTS]),
                "client.message": lambda: "Email sent",
                "reconcile.run": lambda: "Bank reconciliation",
            }
            await db.audit_logs.insert_one({
                "id": gid(), "user_id": USER_ID,
                "action": action, "entity": entity,
                "entity_id": gid(), "detail": details[action](),
                "created_at": ts(days_ago=day, hours_ago=random.randint(0, 12)),
            })
            audit_count += 1
    print(f"  ✅ {audit_count} audit log entries created")

    mongo.close()
    print("\n🎉 Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
