"""
Computes the 4 additional scoring-matrix parameters that are fetchable from
CMOTS but weren't part of the original 9-parameter intersection model:

    Portfolio Concentration (Top 10 stocks %)   -- data/portfolio_holdings.json
    Sector Diversification                      -- data/sector_exposure.json
    Expense Ratio (vs Category Average)         -- data/summary_info_extra.json
    AMC Reputation & Research Capability (proxy) -- data/amc_asset.json

Each of the four raw data files was built by looping CMOTS's per-scheme
endpoints (TopHoldingMain, MFSector) or its AMC-level endpoint (FundAMCAsset)
over the scored universe -- see the fetch scripts used to build them. This
module only turns those raw payloads into per-scheme values; it does not
re-fetch anything itself (there is no live network call in this file).

Coverage, as measured against the 1,379-fund intersection universe:
    Portfolio Concentration: 1379/1379 (100%)
    Sector Diversification:  1361/1379 (~99%, 18 transient fetch errors)
    Expense Ratio:            695/1379 direct + ~553/684 backfilled from a
                               Regular-plan sibling (~90% total) -- see
                               build_expense_ratio_lookup()
    AMC Reputation:          1379/1379 (100%, all 35 AMCs behind these funds
                               are covered by FundAMCAsset)
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

# Number of largest AMCs (by total AUM, FundAMCAsset's amcsize) treated as
# "Top-tier AMC with strong research team" (matrix score 5). The next NEXT_TIER
# are "Mid-sized AMC, adequate resources" (score 3); everyone else is
# "Small/new AMC, limited research" (score 1). Rank-based rather than an
# absolute Cr threshold, since the split is checked against the matrix's own
# named examples (HDFC, SBI, ICICI, Nippon, Mirae, Axis), all of which land in
# the top 10 by AUM -- see the tier assignment printed by build_amc_tiers().
TOP_TIER_COUNT = 10
MID_TIER_COUNT = 15

# A stock holding below this weight isn't counted as a distinct "sector
# exposure" for Sector Diversification -- residual/rounding-level positions in
# many sectors would otherwise inflate the sector count without the fund
# actually being invested there in any meaningful way. Not from the matrix
# file itself; documented here as our own operationalization of "how many
# sectors is a fund really in."
SECTOR_MIN_WEIGHT_PCT = 5.0

TOP_N_HOLDINGS = 10


def _load_json(name):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _load_scheme_masters():
    text = (DATA_DIR / "scheme_masters_1.json").read_text(encoding="utf-8")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = json.loads(text, strict=False)
    by_schcode = {}
    for row in payload["data"]:
        sch = row.get("mf_schcode")
        if sch is not None:
            by_schcode[int(round(float(sch)))] = row
    return by_schcode


# --------------------------------------------------------------------------
# Portfolio Concentration (Top 10 stocks %)
# --------------------------------------------------------------------------

def build_top10_concentration():
    """schcode -> sum of the top 10 holdings' Perc_Hold (None if no data)."""
    raw = _load_json("portfolio_holdings.json")
    out = {}
    for schcode_str, holdings in raw.items():
        if not holdings:
            out[int(schcode_str)] = None
            continue
        pct = sorted((h.get("Perc_Hold") or 0.0) for h in holdings)[::-1][:TOP_N_HOLDINGS]
        out[int(schcode_str)] = round(sum(pct), 4)
    return out


# --------------------------------------------------------------------------
# Sector Diversification
# --------------------------------------------------------------------------

def build_sector_counts():
    """schcode -> count of sectors holding >= SECTOR_MIN_WEIGHT_PCT of the
    portfolio (None if no data)."""
    raw = _load_json("sector_exposure.json")
    out = {}
    for schcode_str, sectors in raw.items():
        if not sectors:
            out[int(schcode_str)] = None
            continue
        count = sum(1 for s in sectors if (s.get("perc_hold") or 0.0) >= SECTOR_MIN_WEIGHT_PCT)
        out[int(schcode_str)] = count
    return out


# --------------------------------------------------------------------------
# Expense Ratio (vs Category Average), with Direct-plan backfill
# --------------------------------------------------------------------------

_DIRECT_WORD_RE = re.compile(r"\b(direct|dir)\b", re.I)
_NON_ALNUM_RE = re.compile(r"[^a-z0-9()]+")


def _norm_fund_key(name, cocode):
    """Normalizes a scheme name to match a Direct-plan fund to its Regular/IDCW
    sibling within the same AMC: drops the word "Direct"/"Dir" and all
    whitespace/punctuation, keeping cocode as part of the key so funds from
    different AMCs with a similar name never collide."""
    if not name or cocode is None:
        return None
    n = _DIRECT_WORD_RE.sub(" ", name.lower())
    n = _NON_ALNUM_RE.sub("", n)
    return (int(cocode), n)


def build_expense_ratio_lookup():
    """schcode -> (expense_ratio, is_backfilled). Direct hits come straight
    from summary_info_extra.json; Direct-plan funds missing from that feed
    (confirmed to be ~575 of the ~684 gaps -- see conversation notes, this
    isn't a fund-importance pattern) are backfilled from their Regular/IDCW
    sibling's expense ratio, found by matching (mf_cocode, normalized name).

    The backfilled value is a known UNDERESTIMATE of how good the Direct
    fund's real expense ratio is: Direct plans carry no distributor
    commission and are typically ~0.5-1% cheaper than their Regular sibling,
    so scoring a Direct fund on its Regular sibling's ratio makes it look
    worse than it actually is, never better. `is_backfilled` is returned so
    callers can flag this rather than silently blending it with real data."""
    summary = _load_json("summary_info_extra.json")
    summary_by_sch = {int(k): v for k, v in summary.items()}

    sibling_lookup = {}
    for row in summary_by_sch.values():
        key = _norm_fund_key(row.get("MF_SCHNAME"), row.get("Mf_cocode"))
        if key and row.get("ExpenseRatio") is not None:
            sibling_lookup[key] = row["ExpenseRatio"]

    masters = _load_scheme_masters()
    out = {}
    for schcode, row in masters.items():
        if schcode in summary_by_sch and summary_by_sch[schcode].get("ExpenseRatio") is not None:
            out[schcode] = (summary_by_sch[schcode]["ExpenseRatio"], False)
            continue
        key = _norm_fund_key(row.get("sch_name"), row.get("mf_cocode"))
        if key in sibling_lookup:
            out[schcode] = (sibling_lookup[key], True)
        else:
            out[schcode] = (None, False)
    return out


# --------------------------------------------------------------------------
# AMC Reputation & Research Capability (AUM-size tier proxy)
# --------------------------------------------------------------------------

def build_amc_tiers():
    """mf_cocode -> 1/3/5 tier score, ranked by FundAMCAsset's amcsize
    (total AMC AUM). This is an explicit PROXY for "reputation & research
    capability" -- the matrix's own named top-tier examples (HDFC, SBI,
    ICICI, Nippon, Mirae, Axis) are all, in fact, in the top 10 AMCs by AUM,
    which is why AUM rank was chosen as the stand-in rather than something
    invented from scratch."""
    raw = _load_json("amc_asset.json")
    ranked = sorted(raw, key=lambda r: -(r.get("amcsize") or 0))
    tiers = {}
    for i, row in enumerate(ranked):
        cocode = row.get("co_code")
        if cocode is None:
            continue
        if i < TOP_TIER_COUNT:
            tier = 5.0
        elif i < TOP_TIER_COUNT + MID_TIER_COUNT:
            tier = 3.0
        else:
            tier = 1.0
        tiers[int(cocode)] = tier
    return tiers


def amc_reputation_for(mf_cocode, amc_tiers):
    if mf_cocode is None:
        return None
    return amc_tiers.get(int(mf_cocode))
