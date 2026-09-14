from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalize_url(url: str) -> str:
    """Produces a canonical form of a URL for duplicate detection.

    Lowercases scheme/host, drops a leading "www.", strips default ports,
    trailing slashes and fragments, and sorts query parameters.
    """
    parts = urlsplit(url.strip())

    scheme = (parts.scheme or "https").lower()

    netloc = parts.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[len("www."):]
    if scheme == "http" and netloc.endswith(":80"):
        netloc = netloc[: -len(":80")]
    if scheme == "https" and netloc.endswith(":443"):
        netloc = netloc[: -len(":443")]

    path = parts.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)))

    return urlunsplit((scheme, netloc, path, query, ""))


def fetch_page_title(url: str) -> str | None:
    """Fetches a URL and extracts the document title or og:title.

    Returns None if fetching fails, times out, or no title is present.
    """
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        import html
        import re
        import httpx

        with httpx.Client(follow_redirects=True, timeout=5.0, headers=headers) as client:
            response = client.get(url)
            if response.status_code >= 400:
                return None
            content = response.text[:50000]

            # 1. Try og:title
            og_match = re.search(
                r'<meta[^>]+property=[\'"]og:title[\'"][^>]+content=[\'"]([^\'"]+)[\'"]',
                content,
                re.IGNORECASE,
            )
            if not og_match:
                og_match = re.search(
                    r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+property=[\'"]og:title[\'"]',
                    content,
                    re.IGNORECASE,
                )
            if og_match:
                title = html.unescape(og_match.group(1)).strip()
                if title:
                    return " ".join(title.split())

            # 2. Try <title> tag
            title_match = re.search(
                r"<title[^>]*>(.*?)</title>",
                content,
                re.IGNORECASE | re.DOTALL,
            )
            if title_match:
                title = html.unescape(title_match.group(1)).strip()
                if title:
                    return " ".join(title.split())
    except Exception:
        return None

    return None
