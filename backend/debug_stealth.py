from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch(
    "https://aquareader.org/?s=one+piece&post_type=wp-manga",
    solve_cloudflare=True,
    headless=False,
    timeout=60000,
)
print("STATUS:", page.status)
print("TITLE IN BODY:", b"Just a moment" in page.body)
cards = page.css(".c-tabs-item__content", adaptive=True)
print("CARDS:", len(cards))
