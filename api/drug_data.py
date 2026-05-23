import requests
from typing import Dict, List, Any

FDA_BASE = "https://api.fda.gov/drug/label.json"
RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
TIMEOUT = 10


def fetch_drug_info(drug_name: str) -> Dict[str, Any]:
    safe = "".join(c for c in drug_name if c.isalnum() or c.isspace()).strip()
    if not safe:
        return _not_found(drug_name)

    # Use openfda.* fields (more reliable than top-level brand_name).
    # Quoted phrase = exact match on tokenized field.
    params = {
        "search": (
            f'openfda.brand_name:"{safe}" '
            f'openfda.generic_name:"{safe}"'
        ),
        "limit": 1,
    }
    try:
        resp = requests.get(FDA_BASE, params=params, timeout=TIMEOUT)
        if resp.status_code == 404:
            return _not_found(drug_name)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return _not_found(drug_name)
        label = results[0]
        return {
            "found": True,
            "brand_name": _first(label.get("openfda", {}).get("brand_name")),
            "generic_name": _first(label.get("openfda", {}).get("generic_name")),
            "purpose": _join(label.get("purpose")),
            "warnings": _join(label.get("warnings")),
            "dosage": _join(label.get("dosage_and_administration")),
            "side_effects": _join(label.get("adverse_reactions")),
            "drug_interactions": _join(label.get("drug_interactions")),
            "active_ingredients": _join(label.get("active_ingredient")),
            "indications": _join(label.get("indications_and_usage")),
            "contraindications": _join(label.get("contraindications")),
            "pregnancy": _join(label.get("pregnancy")),
        }
    except requests.Timeout:
        return _not_found(drug_name, reason="timeout")
    except Exception:
        return _not_found(drug_name)


def search_drug_names(query: str) -> List[str]:
    """Autocomplete via OpenFDA. Lucene wildcards must be OUTSIDE quotes:
    `openfda.generic_name:aspirin*` works; `"aspirin*"` matches literal `*`."""
    # Strip non-alphanumeric to avoid breaking Lucene syntax
    safe = "".join(c for c in query if c.isalnum())
    if not safe:
        return []

    params = {
        "search": (
            f"openfda.generic_name:{safe}* "
            f"openfda.brand_name:{safe}*"
        ),
        "limit": 10,
    }
    names: List[str] = []
    try:
        resp = requests.get(FDA_BASE, params=params, timeout=TIMEOUT)
        if resp.status_code != 200:
            return []
        data = resp.json()
        for item in data.get("results", []):
            openfda = item.get("openfda", {})
            for key in ("brand_name", "generic_name"):
                val = _first(openfda.get(key))
                if val:
                    val = val.strip()
                    # Title-case for nicer display
                    nice = val.title() if val.isupper() or val.islower() else val
                    if nice and nice not in names:
                        names.append(nice)
                        if len(names) >= 5:
                            return names
    except Exception:
        pass
    return names[:5]


def check_interaction(drug1: str, drug2: str) -> Dict[str, Any]:
    try:
        url = f"{RXNORM_BASE}/interaction/list.json"
        params = {"names": f"{drug1} {drug2}"}
        resp = requests.get(url, params=params, timeout=TIMEOUT)
        if resp.status_code != 200:
            return _no_interaction()
        data = resp.json()
        groups = data.get("fullInteractionTypeGroup", [])
        if not groups:
            return _no_interaction()

        severity = "none"
        description = ""
        source = ""
        for group in groups:
            source = group.get("sourceName", "")
            for itype in group.get("fullInteractionType", []):
                for pair in itype.get("interactionPair", []):
                    desc = pair.get("description", "")
                    sev = pair.get("severity", "").lower()
                    if desc:
                        description = desc
                    if sev in ("high", "severe"):
                        severity = "severe"
                    elif sev in ("moderate",) and severity not in ("severe",):
                        severity = "moderate"
                    elif sev in ("low", "minor") and severity not in ("severe", "moderate"):
                        severity = "minor"

        if not description:
            return _no_interaction()

        return {
            "has_interaction": True,
            "severity": severity if severity != "none" else "moderate",
            "description": description,
            "source": source,
        }
    except Exception:
        return _no_interaction()


def _no_interaction() -> Dict[str, Any]:
    return {
        "has_interaction": False,
        "severity": "none",
        "description": "No known interaction found in RxNorm database.",
        "source": "RxNorm",
    }


def _not_found(name: str, reason: str = "") -> Dict[str, Any]:
    return {
        "found": False,
        "brand_name": name,
        "generic_name": name,
        "purpose": "",
        "warnings": "",
        "dosage": "",
        "side_effects": "",
        "drug_interactions": "",
        "active_ingredients": "",
        "indications": "",
        "contraindications": "",
        "pregnancy": "",
    }


def _first(lst) -> str:
    if isinstance(lst, list) and lst:
        return lst[0]
    return lst or ""


def _join(lst) -> str:
    if isinstance(lst, list):
        return " ".join(lst)
    return lst or ""
