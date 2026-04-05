"""
AI service — filing summarisation and investment signal generation via Claude API.
"""
import os
import json
from typing import Optional, Dict, Any

import anthropic

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _client


def summarise_filing(filing_text: str, form_type: str = "10-K") -> Optional[str]:
    """Return a concise AI summary of an SEC filing."""
    if not filing_text:
        return None
    try:
        client = _get_client()
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"You are a financial analyst. Summarise the following excerpt from an SEC {form_type} filing "
                        f"in 3-5 bullet points. Focus on: revenue trends, risks, business outlook, and notable changes.\n\n"
                        f"FILING EXCERPT:\n{filing_text}"
                    ),
                }
            ],
        )
        return message.content[0].text.strip()
    except Exception as e:
        print(f"[AI] summarise_filing error: {e}")
        return None


def generate_investment_signal(
    company_name: str,
    ticker: str,
    financials: Optional[Dict[str, Any]],
    news_sentiment: Optional[Dict[str, Any]],
    filing_summary: Optional[str],
    price_history: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Returns:
        {
            "signal": "BUY" | "HOLD" | "SELL",
            "confidence": 0-100,
            "reasoning": "..."
        }
    """
    fallback = {"signal": "HOLD", "confidence": 50, "reasoning": "Insufficient data for analysis."}

    try:
        client = _get_client()

        fin_text = "No financial data available."
        if financials:
            parts = []
            for year, val in list((financials.get("revenue") or {}).items())[:3]:
                if val:
                    parts.append(f"  Revenue {year}: ${val:,.0f}")
            for year, val in list((financials.get("net_income") or {}).items())[:3]:
                if val:
                    parts.append(f"  Net Income {year}: ${val:,.0f}")
            if parts:
                fin_text = "\n".join(parts)

        sentiment_text = "No news sentiment available."
        if news_sentiment:
            sentiment_text = (
                f"Overall: {news_sentiment.get('overall', 'N/A')} | "
                f"Positive: {news_sentiment.get('positive', 0)}% | "
                f"Neutral: {news_sentiment.get('neutral', 0)}% | "
                f"Negative: {news_sentiment.get('negative', 0)}%"
            )

        filing_text = filing_summary or "No SEC filing summary available."

        price_text = "No recent price history available."
        if price_history:
            pct = price_history.get("pct_change_28d", 0)
            direction = "up" if pct >= 0 else "down"
            price_text = (
                f"28-day performance: {direction} {abs(pct):.2f}% | "
                f"Start: ${price_history.get('start_price', 0):.2f} → "
                f"Current: ${price_history.get('end_price', 0):.2f} | "
                f"28d High: ${price_history.get('high_28d', 0):.2f} | "
                f"28d Low: ${price_history.get('low_28d', 0):.2f}"
            )

        prompt = f"""You are a senior equity analyst. Based on the data below for {company_name} ({ticker}), give an honest investment signal.

Be direct — do NOT default to HOLD unless genuinely uncertain. If the stock dropped significantly, say SELL. If fundamentals are strong and price is rising, say BUY. Use all data provided.

28-DAY PRICE PERFORMANCE:
{price_text}

FINANCIALS:
{fin_text}

NEWS SENTIMENT:
{sentiment_text}

SEC FILING SUMMARY:
{filing_text}

Respond ONLY with valid JSON (no markdown):
{{
  "signal": "BUY" or "HOLD" or "SELL",
  "confidence": integer 0-100,
  "reasoning": "2-3 sentences covering price trend, fundamentals, and sentiment. Be specific about {ticker}."
}}"""

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        result["signal"] = result.get("signal", "HOLD").upper()
        result["confidence"] = int(result.get("confidence", 50))
        return result
    except Exception as e:
        print(f"[AI] generate_investment_signal error: {e}")
        return _rule_based_signal(ticker, financials, news_sentiment, price_history)


def _rule_based_signal(
    ticker: str,
    financials: Optional[Dict[str, Any]],
    news_sentiment: Optional[Dict[str, Any]],
    price_history: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Deterministic signal when Claude API is unavailable.
    Scores price trend, valuation, revenue growth, and news sentiment.
    """
    score = 0  # positive → BUY, negative → SELL
    reasons = []

    # ── Price trend (28-day) ──────────────────────────────────────────────────
    if price_history:
        pct = price_history.get("pct_change_28d", 0) or 0
        if pct >= 10:
            score += 2; reasons.append(f"strong uptrend +{pct:.1f}% over 28 days")
        elif pct >= 3:
            score += 1; reasons.append(f"positive momentum +{pct:.1f}% over 28 days")
        elif pct <= -10:
            score -= 2; reasons.append(f"sharp decline {pct:.1f}% over 28 days")
        elif pct <= -3:
            score -= 1; reasons.append(f"downward pressure {pct:.1f}% over 28 days")
        else:
            reasons.append(f"price flat ({pct:+.1f}% over 28 days)")

    # ── Revenue trend ─────────────────────────────────────────────────────────
    if financials and financials.get("revenue"):
        rev = financials["revenue"]
        years = sorted(rev.keys(), reverse=True)
        if len(years) >= 2:
            r1, r2 = rev.get(years[0]), rev.get(years[1])
            if r1 and r2 and r2 > 0:
                growth = (r1 - r2) / abs(r2) * 100
                if growth >= 15:
                    score += 2; reasons.append(f"revenue grew {growth:.0f}% YoY")
                elif growth >= 5:
                    score += 1; reasons.append(f"revenue up {growth:.0f}% YoY")
                elif growth < -5:
                    score -= 1; reasons.append(f"revenue declined {growth:.0f}% YoY")

    # ── Profitability ─────────────────────────────────────────────────────────
    if financials and financials.get("net_income"):
        ni = financials["net_income"]
        years = sorted(ni.keys(), reverse=True)
        if years:
            latest_ni = ni.get(years[0])
            if latest_ni is not None:
                if latest_ni > 0:
                    score += 1; reasons.append("profitable")
                else:
                    score -= 1; reasons.append("net loss reported")

    # ── News sentiment ────────────────────────────────────────────────────────
    if news_sentiment:
        pos = news_sentiment.get("positive", 0) or 0
        neg = news_sentiment.get("negative", 0) or 0
        if pos - neg >= 30:
            score += 1; reasons.append(f"positive news sentiment ({pos}% positive)")
        elif neg - pos >= 30:
            score -= 1; reasons.append(f"negative news sentiment ({neg}% negative)")

    # ── Map score to signal ───────────────────────────────────────────────────
    if score >= 3:
        signal, confidence = "BUY", min(85, 60 + score * 5)
    elif score >= 1:
        signal, confidence = "BUY", min(70, 55 + score * 5)
    elif score <= -3:
        signal, confidence = "SELL", min(85, 60 + abs(score) * 5)
    elif score <= -1:
        signal, confidence = "SELL", min(70, 55 + abs(score) * 5)
    else:
        signal, confidence = "HOLD", 50

    if not reasons:
        reasoning = f"Insufficient data available for {ticker} to generate a strong signal."
    else:
        reasoning = f"{ticker} shows {', '.join(reasons[:3])}. Signal based on quantitative factors — not AI narrative analysis."

    return {"signal": signal, "confidence": confidence, "reasoning": reasoning}
