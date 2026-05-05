#!/usr/bin/env python3
"""Multi-site product parser for Kazakhstan e-commerce stores."""

from __future__ import annotations

import argparse
import json
import logging
import random
import re
import sys
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator, Optional
from urllib.parse import urljoin, urlsplit, urlunsplit

import pandas as pd
import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover
    tqdm = None


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Connection": "keep-alive",
}

PRODUCT_COLUMNS = [
    "site",
    "product_url",
    "name",
    "old_price",
    "current_price",
    "in_stock",
    "source_category_url",
]


@dataclass(slots=True)
class ProductRow:
    site: str
    product_url: str
    name: str
    old_price: Optional[int]
    current_price: Optional[int]
    in_stock: Optional[bool]
    source_category_url: str


def configure_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%H:%M:%S",
    )


def make_session() -> requests.Session:
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.0,
        allowed_methods=frozenset({"GET", "HEAD"}),
        status_forcelist=(429, 500, 502, 503, 504),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=20)

    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


class PageFetcher:
    """Fetches HTML via requests and can optionally fall back to Playwright."""

    def __init__(
        self,
        session: requests.Session,
        timeout: float,
        min_delay: float,
        max_delay: float,
        use_playwright_fallback: bool = False,
    ) -> None:
        self.session = session
        self.timeout = timeout
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.use_playwright_fallback = use_playwright_fallback
        self.cache: dict[str, Optional[str]] = {}

    def fetch(
        self,
        url: str,
        *,
        page_type: str,
        validator: Optional[Callable[[str, str], bool]] = None,
        force_playwright: bool = False,
    ) -> Optional[str]:
        normalized_url = normalize_url(url, base_url=url)
        cache_key = f"{page_type}:{normalized_url}:pw={int(force_playwright)}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        html: Optional[str]
        if force_playwright:
            html = self._fetch_with_playwright(normalized_url)
        else:
            html = self._fetch_with_requests(normalized_url)
        if html and self._looks_usable(html, page_type=page_type, validator=validator):
            self.cache[cache_key] = html
            return html

        if not force_playwright and self.use_playwright_fallback:
            logging.warning(
                "Requests HTML for %s looked incomplete, trying Playwright fallback: %s",
                page_type,
                normalized_url,
            )
            html = self._fetch_with_playwright(normalized_url)
            if html and self._looks_usable(html, page_type=page_type, validator=validator):
                self.cache[cache_key] = html
                return html

        self.cache[cache_key] = html
        return html

    def _fetch_with_requests(self, url: str) -> Optional[str]:
        self._sleep()
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            logging.error("Request failed for %s: %s", url, exc)
            return None

    def _fetch_with_playwright(self, url: str) -> Optional[str]:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logging.error(
                "Playwright fallback requested, but playwright is not installed. URL: %s",
                url,
            )
            return None

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                context = browser.new_context(user_agent=DEFAULT_HEADERS["User-Agent"])
                page = context.new_page()
                page.goto(url, wait_until="networkidle", timeout=int(self.timeout * 1000))
                html = page.content()
                context.close()
                browser.close()
                return html
        except Exception as exc:  # pragma: no cover
            logging.error("Playwright fetch failed for %s: %s", url, exc)
            return None

    @staticmethod
    def _looks_usable(
        html: str,
        *,
        page_type: str,
        validator: Optional[Callable[[str, str], bool]] = None,
    ) -> bool:
        if not html:
            return False
        if validator is not None:
            return validator(html, page_type)
        return True

    def _sleep(self) -> None:
        time.sleep(random.uniform(self.min_delay, self.max_delay))


def normalize_url(url: str, *, base_url: str) -> str:
    url = url.strip()
    if not url:
        return url

    absolute = urljoin(base_url, url)
    parts = urlsplit(absolute)
    cleaned = urlunsplit((parts.scheme, parts.netloc.lower(), parts.path, parts.query, ""))
    if cleaned.endswith("/") or parts.query:
        return cleaned
    return cleaned + "/"


def same_domain(url: str, *, base_url: str) -> bool:
    target_netloc = urlsplit(url).netloc.lower().removeprefix("www.")
    base_netloc = urlsplit(base_url).netloc.lower().removeprefix("www.")
    return target_netloc == base_netloc


def parse_price(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    digits = re.sub(r"[^\d]", "", value)
    return int(digits) if digits else None


def clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def iter_progress(items: Iterable, description: str, unit: str) -> Iterator:
    if tqdm is None:
        logging.info("%s", description)
        yield from items
        return

    yield from tqdm(items, desc=description, unit=unit)


class BaseSiteParser(ABC):
    """Common parsing workflow with site-specific selectors and heuristics."""

    site_name: str
    base_url: str
    category_page_type = "category"
    home_page_type = "home"
    implemented = True
    use_playwright_for_all = False
    fetcher: PageFetcher

    @abstractmethod
    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        """Return all category URLs for the site."""

    @abstractmethod
    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        """Extract products from one category page."""

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        return bool(html)

    def collect_category_pages(
        self,
        fetcher: PageFetcher,
        category_urls: list[str],
    ) -> list[tuple[str, str]]:
        logging.info("[%s] Collecting paginated pages for %s categories", self.site_name, len(category_urls))
        results: list[tuple[str, str]] = []

        for category_url in iter_progress(category_urls, f"{self.site_name}: categories", "url"):
            seen_pages: set[str] = set()
            queue: list[str] = [category_url]

            while queue:
                page_url = queue.pop(0)
                normalized_page_url = normalize_url(page_url, base_url=self.base_url)
                if normalized_page_url in seen_pages:
                    continue

                seen_pages.add(normalized_page_url)
                html = fetcher.fetch(
                    normalized_page_url,
                    page_type=self.category_page_type,
                    validator=self.category_page_looks_usable,
                    force_playwright=self.use_playwright_for_all,
                )
                if not html:
                    logging.warning("[%s] Skipping failed category page: %s", self.site_name, normalized_page_url)
                    continue

                results.append((category_url, normalized_page_url))
                soup = BeautifulSoup(html, "html.parser")

                for next_page in self.extract_pagination_urls(soup):
                    if next_page not in seen_pages and next_page not in queue:
                        queue.append(next_page)

        logging.info("[%s] Collected %s category pages", self.site_name, len(results))
        return results

    def extract_pagination_urls(self, soup: BeautifulSoup) -> list[str]:
        return []

    def deduplicate_products(self, products: list[ProductRow]) -> list[ProductRow]:
        unique_by_url: dict[str, ProductRow] = {}
        for product in products:
            dedupe_key = f"{product.site}:{product.product_url}"
            if dedupe_key not in unique_by_url:
                unique_by_url[dedupe_key] = product
        unique_products = list(unique_by_url.values())
        logging.info("[%s] Deduplicated %s -> %s", self.site_name, len(products), len(unique_products))
        return unique_products

    def run(self, fetcher: PageFetcher) -> list[ProductRow]:
        if not self.implemented:
            logging.warning("[%s] Parser adapter is not implemented yet", self.site_name)
            return []

        self.fetcher = fetcher
        category_urls = self.collect_category_urls(fetcher)
        if not category_urls:
            logging.warning("[%s] No category URLs found", self.site_name)
            return []

        category_pages = self.collect_category_pages(fetcher, category_urls)
        if not category_pages:
            logging.warning("[%s] No category pages found", self.site_name)
            return []

        all_products: list[ProductRow] = []
        page_iterable = iter_progress(category_pages, f"{self.site_name}: category pages", "page")
        for source_category_url, page_url in page_iterable:
            html = fetcher.fetch(
                page_url,
                page_type=self.category_page_type,
                validator=self.category_page_looks_usable,
                force_playwright=self.use_playwright_for_all,
            )
            if not html:
                logging.warning("[%s] Failed to fetch category page: %s", self.site_name, page_url)
                continue

            try:
                all_products.extend(self.parse_products_from_html(html, source_category_url))
            except Exception as exc:
                logging.warning("[%s] Failed to parse page %s: %s", self.site_name, page_url, exc)

        return self.deduplicate_products(all_products)


class UnsupportedSiteParser(BaseSiteParser):
    """Placeholder adapter for sites not implemented yet."""

    implemented = False

    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        return []

    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        return []


class BeautyProffParser(BaseSiteParser):
    site_name = "beautyproff"
    base_url = "https://beautyproff.kz/"

    selectors = {
        "category_links": 'a[href*="/product-category/"]',
        "product_cards": "li.product",
        "product_title": "h2.woocommerce-loop-product__title",
        "product_main_link": "a.woocommerce-LoopProduct-link",
        "price_wrapper": "span.price",
        "old_price": "del .woocommerce-Price-amount, del bdi, del",
        "current_price_discounted": "ins .woocommerce-Price-amount, ins bdi, ins",
        "stock_button_label": ".w-btn-label",
        "pagination_links": "nav.pagination a.page-numbers",
    }

    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        logging.info("[%s] Collecting category URLs from homepage", self.site_name)
        html = fetcher.fetch(
            self.base_url,
            page_type=self.home_page_type,
            validator=self.category_page_looks_usable,
        )
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        category_urls: set[str] = set()
        for link in soup.select(self.selectors["category_links"]):
            href = link.get("href")
            if not href:
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            if not same_domain(normalized, base_url=self.base_url):
                continue
            if "/page/" in normalized or "?" in normalized:
                continue
            category_urls.add(normalized)

        urls = sorted(category_urls)
        logging.info("[%s] Collected %s unique category URLs", self.site_name, len(urls))
        return urls

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        if page_type == self.home_page_type:
            return "/product-category/" in html
        return "woocommerce" in html.lower() or 'li class="woo-variation-gallery-product product' in html.lower()

    def extract_pagination_urls(self, soup: BeautifulSoup) -> list[str]:
        urls: list[str] = []
        for link in soup.select(self.selectors["pagination_links"]):
            href = link.get("href")
            if not href:
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            if same_domain(normalized, base_url=self.base_url):
                urls.append(normalized)
        return urls

    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        soup = BeautifulSoup(html, "html.parser")
        products: list[ProductRow] = []

        for card in soup.select(self.selectors["product_cards"]):
            try:
                product_link = card.select_one(self.selectors["product_main_link"])
                product_url = normalize_url(product_link.get("href", ""), base_url=self.base_url) if product_link else ""
                if not product_url:
                    continue

                title_node = card.select_one(self.selectors["product_title"])
                name = clean_text(title_node.get_text(" ", strip=True) if title_node else "")
                if not name and product_link:
                    name = clean_text(product_link.get_text(" ", strip=True))

                price_wrapper = card.select_one(self.selectors["price_wrapper"])
                old_price: Optional[int] = None
                current_price: Optional[int] = None
                if price_wrapper:
                    old_price = parse_price(
                        clean_text_from_selector(price_wrapper, self.selectors["old_price"]),
                    )
                    discounted = clean_text_from_selector(
                        price_wrapper,
                        self.selectors["current_price_discounted"],
                    )
                    if old_price is not None and discounted:
                        current_price = parse_price(discounted)
                    else:
                        current_price = parse_price(clean_text(price_wrapper.get_text(" ", strip=True)))

                products.append(
                    ProductRow(
                        site=self.site_name,
                        product_url=product_url,
                        name=name,
                        old_price=old_price,
                        current_price=current_price,
                        in_stock=self._parse_stock_status(card),
                        source_category_url=source_category_url,
                    )
                )
            except Exception as exc:
                logging.warning("[%s] Failed to parse product card on %s: %s", self.site_name, source_category_url, exc)

        return products

    def _parse_stock_status(self, card: Tag) -> Optional[bool]:
        classes = set(card.get("class", []))
        if "instock" in classes:
            return True
        if "outofstock" in classes:
            return False

        button_label = clean_text_from_selector(card, self.selectors["stock_button_label"]).lower()
        if "нет в наличии" in button_label:
            return False
        if button_label in {"в корзину", "выбрать ...", "выбрать..."}:
            return True
        return None


class DionaShopParser(BaseSiteParser):
    site_name = "dionashop"
    base_url = "https://dionashop.kz/"

    selectors = {
        "category_links": 'a[href^="/catalog/"], a[href^="https://dionashop.kz/catalog/"]',
        "product_cards": "div.catalog-block-view__item.item_block",
        "pagination_links": '.module-pagination a[href*="PAGEN_"]',
        "product_name_meta": 'meta[itemprop="name"]',
        "item_title_link": ".item-title a[href]",
        "current_price": ".price_matrix_wrapper:not(.strike_block) .price_value",
        "old_price": ".price_matrix_wrapper.strike_block .price_value",
        "buy_button": ".to-cart",
    }

    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        logging.info("[%s] Collecting category URLs from homepage", self.site_name)
        html = fetcher.fetch(self.base_url, page_type=self.home_page_type)
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        category_urls: set[str] = set()
        for link in soup.select(self.selectors["category_links"]):
            href = link.get("href")
            if not href:
                continue

            normalized = normalize_url(href, base_url=self.base_url)
            path = urlsplit(normalized).path
            if not same_domain(normalized, base_url=self.base_url):
                continue
            if path in {"/catalog/", "/catalog"}:
                continue
            if "?" in normalized:
                continue
            category_urls.add(normalized)

        urls = sorted(category_urls)
        logging.info("[%s] Collected %s candidate category URLs", self.site_name, len(urls))
        return urls

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        if page_type == self.home_page_type:
            return "/catalog/" in html
        return "catalog-block-view__item" in html or 'class="item-title"' in html or "module-pagination" in html

    def extract_pagination_urls(self, soup: BeautifulSoup) -> list[str]:
        urls: list[str] = []
        for link in soup.select(self.selectors["pagination_links"]):
            href = link.get("href")
            if not href:
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            if same_domain(normalized, base_url=self.base_url):
                urls.append(normalized)
        return urls

    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        soup = BeautifulSoup(html, "html.parser")
        products: list[ProductRow] = []

        for card in soup.select(self.selectors["product_cards"]):
            try:
                product_url = self._extract_product_url(card)
                if not product_url:
                    continue

                name = self._extract_product_name(card)
                old_price = parse_price(clean_text_from_selector(card, self.selectors["old_price"]))
                current_price = parse_price(clean_text_from_selector(card, self.selectors["current_price"]))

                products.append(
                    ProductRow(
                        site=self.site_name,
                        product_url=product_url,
                        name=name,
                        old_price=old_price,
                        current_price=current_price,
                        in_stock=self._parse_stock_status(card),
                        source_category_url=source_category_url,
                    )
                )
            except Exception as exc:
                logging.warning("[%s] Failed to parse product card on %s: %s", self.site_name, source_category_url, exc)

        return products

    def _extract_product_name(self, card: Tag) -> str:
        meta = card.select_one(self.selectors["product_name_meta"])
        if meta and meta.get("content"):
            return clean_text(meta["content"])

        title_link = card.select_one(self.selectors["item_title_link"])
        if title_link:
            return clean_text(title_link.get_text(" ", strip=True))

        hidden_name = card.find(attrs={"data-js-item-name": True})
        if hidden_name and hidden_name.get("data-js-item-name"):
            return clean_text(hidden_name["data-js-item-name"])

        return ""

    def _extract_product_url(self, card: Tag) -> str:
        candidates: list[str] = []
        for link in card.find_all("a", href=True):
            href = link.get("href", "")
            if not href or href.startswith("#"):
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            path = urlsplit(normalized).path
            if not same_domain(normalized, base_url=self.base_url):
                continue
            if path.startswith("/basket"):
                continue
            if "PAGEN_" in normalized:
                continue
            if path in {"/catalog/", "/catalog"}:
                continue
            candidates.append(normalized)

        if not candidates:
            return ""

        # Product links are usually deeper and more specific than category links.
        candidates = sorted(set(candidates), key=lambda item: (item.count("/"), len(item)), reverse=True)
        return candidates[0]

    def _parse_stock_status(self, card: Tag) -> Optional[bool]:
        if card.select_one(self.selectors["buy_button"]):
            return True

        card_text = clean_text(card.get_text(" ", strip=True)).lower()
        if "нет в наличии" in card_text or "под заказ" in card_text:
            return False
        return None


class FrenchHouseParser(UnsupportedSiteParser):
    site_name = "french-house"
    base_url = "https://french-house.kz/"
    implemented = True

    selectors = {
        "category_links": 'a[href^="/catalog/"], a[href^="https://french-house.kz/catalog/"]',
        "product_cards": ".goodItem .goodCard",
        "product_link": ".goodCard > a[href]",
        "product_name": ".cardInfo .name",
        "current_price": ".costLine .cardCost:not(.old)",
        "old_price": ".costLine .cardCost.old",
        "pagination_links": 'a[href*="PAGEN_"], link[rel="next"]',
    }

    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        html = fetcher.fetch(self.base_url + "catalog/", page_type=self.home_page_type)
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        urls: set[str] = set()
        for link in soup.select(self.selectors["category_links"]):
            href = link.get("href")
            if not href:
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            path = urlsplit(normalized).path
            if path in {"/catalog/", "/catalog"}:
                continue
            if not same_domain(normalized, base_url=self.base_url):
                continue
            if "?" in normalized:
                continue
            urls.add(normalized)
        return sorted(urls)

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        return "goodCard" in html or "catalogGrid" in html or 'rel="next"' in html

    def extract_pagination_urls(self, soup: BeautifulSoup) -> list[str]:
        urls: list[str] = []
        for link in soup.select(self.selectors["pagination_links"]):
            href = link.get("href")
            if not href:
                continue
            normalized = normalize_url(href, base_url=self.base_url)
            if same_domain(normalized, base_url=self.base_url):
                urls.append(normalized)
        return sorted(set(urls))

    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        soup = BeautifulSoup(html, "html.parser")
        products: list[ProductRow] = []
        for card in soup.select(self.selectors["product_cards"]):
            link = card.select_one(self.selectors["product_link"])
            if not link or not link.get("href"):
                continue
            product_url = normalize_url(link["href"], base_url=self.base_url)
            name = clean_text_from_selector(card, self.selectors["product_name"]) or clean_text(link.get_text(" ", strip=True))
            current_price = parse_price(clean_text_from_selector(card, self.selectors["current_price"]))
            old_price = parse_price(clean_text_from_selector(card, self.selectors["old_price"]))
            products.append(
                ProductRow(
                    site=self.site_name,
                    product_url=product_url,
                    name=name,
                    old_price=old_price,
                    current_price=current_price,
                    in_stock=True,
                    source_category_url=source_category_url,
                )
            )
        return products


class BrowserOnlyPatternParser(BaseSiteParser):
    """Browser-driven parser for JS-heavy sites using URL patterns and detail pages."""

    use_playwright_for_all = True
    start_url: str
    category_href_pattern: re.Pattern[str]
    product_href_pattern: re.Pattern[str]
    pagination_pattern: re.Pattern[str]

    def collect_category_urls(self, fetcher: PageFetcher) -> list[str]:
        html = fetcher.fetch(
            self.start_url,
            page_type=self.home_page_type,
            validator=self.category_page_looks_usable,
            force_playwright=True,
        )
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        urls = {
            normalize_url(link["href"], base_url=self.base_url)
            for link in soup.find_all("a", href=True)
            if self.category_href_pattern.match(normalize_url(link["href"], base_url=self.base_url))
        }
        urls.add(normalize_url(self.start_url, base_url=self.base_url))
        return sorted(urls)

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        lowered = html.lower()
        return not ("javascript is disabled" in lowered or "cloudflare" in lowered or "you have been blocked" in lowered)

    def extract_pagination_urls(self, soup: BeautifulSoup) -> list[str]:
        urls: list[str] = []
        for link in soup.find_all("a", href=True):
            href = normalize_url(link["href"], base_url=self.base_url)
            if self.pagination_pattern.search(href):
                urls.append(href)
        return sorted(set(urls))

    def parse_products_from_html(self, html: str, source_category_url: str) -> list[ProductRow]:
        soup = BeautifulSoup(html, "html.parser")
        product_urls = {
            normalize_url(link["href"], base_url=self.base_url)
            for link in soup.find_all("a", href=True)
            if self.product_href_pattern.match(normalize_url(link["href"], base_url=self.base_url))
        }
        return self._parse_detail_pages(product_urls, source_category_url)

    def _parse_detail_pages(
        self,
        product_urls: set[str],
        source_category_url: str,
    ) -> list[ProductRow]:
        products: list[ProductRow] = []
        for product_url in iter_progress(sorted(product_urls), f"{self.site_name}: product details", "url"):
            html = self.fetcher.fetch(
                product_url,
                page_type="product",
                validator=self.category_page_looks_usable,
                force_playwright=True,
            )
            if not html:
                continue
            product = self._parse_product_detail(html, product_url, source_category_url)
            if product:
                products.append(product)
        return products

    def _parse_product_detail(
        self,
        html: str,
        product_url: str,
        source_category_url: str,
    ) -> Optional[ProductRow]:
        soup = BeautifulSoup(html, "html.parser")
        ld_json = extract_product_ld_json(soup)

        name = (
            ld_json.get("name")
            or get_meta_content(soup, "property", "og:title")
            or clean_text(soup.title.get_text(" ", strip=True) if soup.title else "")
        )
        h1 = soup.find("h1")
        if h1:
            name = clean_text(h1.get_text(" ", strip=True)) or name
        name = clean_text(re.sub(r"\s+[|–-]\s+.*$", "", name))

        current_price = None
        old_price = None
        in_stock: Optional[bool] = None

        offers = ld_json.get("offers")
        if isinstance(offers, dict):
            current_price = parse_price(str(offers.get("price") or offers.get("lowPrice") or ""))
            availability = str(offers.get("availability") or "").lower()
            if "instock" in availability:
                in_stock = True
            elif "outofstock" in availability:
                in_stock = False

        if current_price is None:
            current_price = parse_price(
                first_non_empty(
                    meta_price_from_soup(soup),
                    text_from_selectors(
                        soup,
                        [
                            '[itemprop="price"]',
                            'meta[property="product:price:amount"]',
                            ".price .current",
                            ".price .new",
                            ".price [class*=current]",
                            ".price [class*=new]",
                            ".product-price",
                            ".price",
                            "[class*=price]",
                        ],
                    ),
                )
            )

        old_price = parse_price(
            text_from_selectors(
                soup,
                [
                    "del",
                    ".old-price",
                    ".price-old",
                    "[class*=old-price]",
                    "[class*=oldPrice]",
                    "[class*=old]",
                ],
            )
        )

        if in_stock is None:
            page_text = clean_text(soup.get_text(" ", strip=True)).lower()
            if "нет в наличии" in page_text or "out of stock" in page_text:
                in_stock = False
            elif "в наличии" in page_text or "добавить в корзину" in page_text or "купить" in page_text:
                in_stock = True

        if not product_url or not name:
            return None

        return ProductRow(
            site=self.site_name,
            product_url=product_url,
            name=name,
            old_price=old_price,
            current_price=current_price,
            in_stock=in_stock,
            source_category_url=source_category_url,
        )


class MonAmieParser(BrowserOnlyPatternParser):
    site_name = "monamie"
    base_url = "https://www.monamie.kz/"
    start_url = "https://www.monamie.kz/catalog/"
    category_href_pattern = re.compile(r"^https://www\.monamie\.kz/catalog/(?!.*_id\d+/).+")
    product_href_pattern = re.compile(r"^https://www\.monamie\.kz/catalog/.+_id\d+/?$")
    pagination_pattern = re.compile(r"[?&]page=\d+")

    def category_page_looks_usable(self, html: str, page_type: str) -> bool:
        lowered = html.lower()
        if "cloudflare" in lowered or "attention required" in lowered or "you have been blocked" in lowered:
            return False
        return "/catalog/" in html and ("купить" in lowered or "избранное" in lowered or "товар" in lowered)


class MakeupParser(BrowserOnlyPatternParser):
    site_name = "makeup"
    base_url = "https://makeup.kz/"
    start_url = "https://makeup.kz/"
    category_href_pattern = re.compile(r"^https://makeup\.kz/categorys/\d+/?$")
    product_href_pattern = re.compile(r"^https://makeup\.kz/product/\d+/?$")
    pagination_pattern = re.compile(r"page=\d+")


class ViledParser(BrowserOnlyPatternParser):
    site_name = "viled"
    base_url = "https://viled.kz/"
    start_url = "https://viled.kz/women"
    category_href_pattern = re.compile(r"^https://viled\.kz/women(?!/item/)(?:/[^?#]+)?/?(?:\?.*)?$")
    product_href_pattern = re.compile(r"^https://viled\.kz(?:/women)?/item/\d+/?$")
    pagination_pattern = re.compile(r"page=\d+")


PARSER_REGISTRY = {
    "beautyproff": BeautyProffParser,
    "dionashop": DionaShopParser,
    "monamie": MonAmieParser,
    "french-house": FrenchHouseParser,
    "makeup": MakeupParser,
    "viled": ViledParser,
}

IMPLEMENTED_SITES = {
    site_name for site_name, parser_cls in PARSER_REGISTRY.items() if parser_cls.implemented
}


def clean_text_from_selector(node: Tag, selector: str) -> str:
    found = node.select_one(selector)
    if not found:
        return ""
    return clean_text(found.get_text(" ", strip=True))


def first_non_empty(*values: Optional[str]) -> str:
    for value in values:
        if value:
            return value
    return ""


def get_meta_content(soup: BeautifulSoup, attr_name: str, attr_value: str) -> str:
    tag = soup.find("meta", attrs={attr_name: attr_value})
    if not tag:
        return ""
    return clean_text(tag.get("content", ""))


def meta_price_from_soup(soup: BeautifulSoup) -> str:
    itemprop = soup.find(attrs={"itemprop": "price"})
    if itemprop and itemprop.get("content"):
        return clean_text(itemprop["content"])

    meta = soup.find("meta", attrs={"property": "product:price:amount"})
    if meta and meta.get("content"):
        return clean_text(meta["content"])
    return ""


def text_from_selectors(soup: BeautifulSoup, selectors: list[str]) -> str:
    for selector in selectors:
        found = soup.select_one(selector)
        if not found:
            continue
        if found.get("content"):
            return clean_text(found["content"])
        text = clean_text(found.get_text(" ", strip=True))
        if text:
            return text
    return ""


def extract_product_ld_json(soup: BeautifulSoup) -> dict:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue

        product = find_product_object(data)
        if product:
            return product
    return {}


def find_product_object(data: object) -> Optional[dict]:
    if isinstance(data, dict):
        data_type = str(data.get("@type") or "").lower()
        if data_type == "product":
            return data
        if "@graph" in data:
            return find_product_object(data["@graph"])
        if "mainEntity" in data:
            return find_product_object(data["mainEntity"])
        if "itemListElement" in data:
            return find_product_object(data["itemListElement"])
    if isinstance(data, list):
        for item in data:
            found = find_product_object(item)
            if found:
                return found
    return None


def save_outputs(products: list[ProductRow], csv_path: Path, xlsx_path: Path) -> None:
    rows = [asdict(product) for product in products]
    df = pd.DataFrame(rows, columns=PRODUCT_COLUMNS)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    df.to_excel(xlsx_path, index=False)
    logging.info("Saved CSV: %s", csv_path)
    logging.info("Saved XLSX: %s", xlsx_path)


def resolve_site_names(site_args: list[str]) -> list[str]:
    if "all" in site_args:
        return sorted(PARSER_REGISTRY.keys())
    return site_args


def build_default_output_name(site_names: list[str], extension: str) -> str:
    if len(site_names) == 1:
        return f"{site_names[0]}_products.{extension}"
    return f"{'_'.join(site_names)}_products.{extension}"


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Parse products and prices from multiple stores")
    parser.add_argument(
        "--site",
        nargs="+",
        default=["beautyproff"],
        choices=["all", *sorted(PARSER_REGISTRY.keys())],
        help="One or more site parsers to run",
    )
    parser.add_argument("--csv", help="Path to output CSV file")
    parser.add_argument("--xlsx", help="Path to output XLSX file")
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP request timeout in seconds",
    )
    parser.add_argument(
        "--delay-min",
        type=float,
        default=0.5,
        help="Minimum delay between requests in seconds",
    )
    parser.add_argument(
        "--delay-max",
        type=float,
        default=1.2,
        help="Maximum delay between requests in seconds",
    )
    parser.add_argument(
        "--playwright-fallback",
        action="store_true",
        help="Use Playwright if requests HTML looks incomplete",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.delay_min < 0 or args.delay_max < 0 or args.delay_min > args.delay_max:
        parser.error("Delay values must be non-negative and delay-min must be <= delay-max.")

    configure_logging(verbose=args.verbose)

    site_names = resolve_site_names(args.site)
    csv_path = Path(args.csv or build_default_output_name(site_names, "csv"))
    xlsx_path = Path(args.xlsx or build_default_output_name(site_names, "xlsx"))

    session = make_session()
    fetcher = PageFetcher(
        session=session,
        timeout=args.timeout,
        min_delay=args.delay_min,
        max_delay=args.delay_max,
        use_playwright_fallback=args.playwright_fallback,
    )

    try:
        all_products: list[ProductRow] = []
        for site_name in site_names:
            parser_cls = PARSER_REGISTRY[site_name]
            parser_instance = parser_cls()
            logging.info("[%s] Starting parser", site_name)
            site_products = parser_instance.run(fetcher)
            all_products.extend(site_products)
            logging.info("[%s] Parsed %s unique products", site_name, len(site_products))

        if not all_products:
            logging.error("No products parsed for selected sites: %s", ", ".join(site_names))
            return 1

        save_outputs(all_products, csv_path=csv_path, xlsx_path=xlsx_path)

        implemented_requested = [site for site in site_names if site in IMPLEMENTED_SITES]
        skipped_requested = [site for site in site_names if site not in IMPLEMENTED_SITES]
        logging.info("Done. Parsed %s products across %s implemented site(s)", len(all_products), len(implemented_requested))
        if skipped_requested:
            logging.warning("Not implemented yet and skipped: %s", ", ".join(skipped_requested))
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
