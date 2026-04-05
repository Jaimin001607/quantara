from dotenv import load_dotenv
load_dotenv()

from services.yahoo import get_quote, get_company_meta, get_financials, get_news_yf

print("QUOTE:")
print(get_quote("AAPL"))
print()
print("META:")
print(get_company_meta("AAPL"))
print()
print("FINANCIALS:")
print(get_financials("AAPL"))
print()
print("NEWS (first 2):")
for n in get_news_yf("AAPL")[:2]:
    print(" -", n.get("headline") or n.get("title"))
