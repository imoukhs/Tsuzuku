from scrapling.fetchers import Fetcher

url = "https://aquareader.org/?s=one+piece&post_type=wp-manga"
page = Fetcher.get(url)

print("STATUS:", page.status)
print("URL:", page.url)
print("HTML LENGTH:", len(page.body))
print()

cards = page.css(".c-tabs-item__content", adaptive=True)
print("CARDS FOUND:", len(cards))

print()
print("--- first 2000 chars of body ---")
print(page.body[:2000])
