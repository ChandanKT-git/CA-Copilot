"""Simplified Indian income-tax computation (FY 2024-25 / AY 2025-26).

Numbers are computed deterministically here so the copilot narrative is grounded
in real figures rather than model guesses.
"""

NEW_REGIME_SLABS = [
    (300000, 0.0),
    (700000, 0.05),
    (1000000, 0.10),
    (1200000, 0.15),
    (1500000, 0.20),
    (float("inf"), 0.30),
]

OLD_REGIME_SLABS = [
    (250000, 0.0),
    (500000, 0.05),
    (1000000, 0.20),
    (float("inf"), 0.30),
]


def _slab_tax(taxable: float, slabs) -> float:
    tax = 0.0
    lower = 0.0
    for upper, rate in slabs:
        if taxable > lower:
            tax += (min(taxable, upper) - lower) * rate
            lower = upper
        else:
            break
    return tax


def compute_tax(taxable_income: float, regime: str) -> dict:
    taxable = max(0.0, round(taxable_income))
    if regime == "new":
        base = _slab_tax(taxable, NEW_REGIME_SLABS)
        rebate = base if taxable <= 700000 else 0.0
    else:
        base = _slab_tax(taxable, OLD_REGIME_SLABS)
        rebate = base if taxable <= 500000 else 0.0
    after_rebate = max(0.0, base - rebate)
    cess = round(after_rebate * 0.04)
    total = round(after_rebate + cess)
    return {
        "regime": regime,
        "taxable_income": taxable,
        "tax_before_rebate": round(base),
        "rebate_87a": round(rebate),
        "tax_after_rebate": round(after_rebate),
        "cess": cess,
        "total_tax": total,
    }


def standard_deduction(regime: str, salary: float) -> float:
    if salary <= 0:
        return 0.0
    return 75000.0 if regime == "new" else 50000.0


def compute_return(payload: dict) -> dict:
    inc = payload.get("income", {})
    ded = payload.get("deductions", {})
    tax_paid = payload.get("taxes", {})
    regime = payload.get("regime", "new")

    salary = float(inc.get("salary", 0) or 0)
    house = float(inc.get("house_property", 0) or 0)
    capital_gains = float(inc.get("capital_gains", 0) or 0)
    business = float(inc.get("business", 0) or 0)
    other = float(inc.get("other_sources", 0) or 0)

    gross_total_income = salary + house + capital_gains + business + other

    std_ded = standard_deduction(regime, salary)

    if regime == "old":
        c80c = min(float(ded.get("section_80c", 0) or 0), 150000)
        c80d = min(float(ded.get("section_80d", 0) or 0), 100000)
        c80g = float(ded.get("section_80g", 0) or 0)
        home_loan = min(float(ded.get("home_loan_interest", 0) or 0), 200000)
        nps = min(float(ded.get("nps_80ccd1b", 0) or 0), 50000)
        chapter_via = c80c + c80d + c80g + home_loan + nps
        total_deductions = std_ded + chapter_via
        deduction_breakdown = {
            "standard_deduction": std_ded,
            "section_80c": c80c,
            "section_80d": c80d,
            "section_80g": c80g,
            "home_loan_interest": home_loan,
            "nps_80ccd1b": nps,
        }
    else:
        total_deductions = std_ded
        deduction_breakdown = {"standard_deduction": std_ded}

    taxable_income = max(0.0, gross_total_income - total_deductions)

    chosen = compute_tax(taxable_income, regime)
    alt_regime = "old" if regime == "new" else "new"
    if alt_regime == "old":
        alt_std = standard_deduction("old", salary)
        alt_c80c = min(float(ded.get("section_80c", 0) or 0), 150000)
        alt_c80d = min(float(ded.get("section_80d", 0) or 0), 100000)
        alt_c80g = float(ded.get("section_80g", 0) or 0)
        alt_home = min(float(ded.get("home_loan_interest", 0) or 0), 200000)
        alt_nps = min(float(ded.get("nps_80ccd1b", 0) or 0), 50000)
        alt_ded = alt_std + alt_c80c + alt_c80d + alt_c80g + alt_home + alt_nps
    else:
        alt_ded = standard_deduction("new", salary)
    alt_taxable = max(0.0, gross_total_income - alt_ded)
    alt = compute_tax(alt_taxable, alt_regime)

    tds = float(tax_paid.get("tds", 0) or 0)
    advance = float(tax_paid.get("advance_tax", 0) or 0)
    self_assessment = float(tax_paid.get("self_assessment_tax", 0) or 0)
    total_paid = tds + advance + self_assessment

    net = round(chosen["total_tax"] - total_paid)

    return {
        "regime": regime,
        "gross_total_income": round(gross_total_income),
        "deduction_breakdown": deduction_breakdown,
        "total_deductions": round(total_deductions),
        "taxable_income": round(taxable_income),
        "tax_computation": chosen,
        "alternative_regime": alt,
        "alternative_regime_name": alt_regime,
        "total_tax_paid": round(total_paid),
        "refund_or_payable": net,
        "status": "Refund Due" if net < 0 else ("Tax Payable" if net > 0 else "Settled"),
        "better_regime": regime if chosen["total_tax"] <= alt["total_tax"] else alt_regime,
        "regime_savings": abs(chosen["total_tax"] - alt["total_tax"]),
    }
