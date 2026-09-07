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
