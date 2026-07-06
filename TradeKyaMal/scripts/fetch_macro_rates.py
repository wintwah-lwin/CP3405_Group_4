import re
from calendar import month_name
from datetime import date
from html.parser import HTMLParser

import requests
import yfinance as yf

# This module produces FedWatch-style rate move signals using
# Fed funds futures and the official Fed FOMC calendar.
# NOTE: probabilities are proxy estimates, not the CME FedWatch official values.

FED_CALENDAR_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
MONTH_NAME_TO_NUMBER = {name.lower(): idx for idx, name in enumerate(month_name) if name}


class _FOMCCalendarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._current_section = None
        self._current_text: list[str] = []
        self._recent_year: int | None = None
        self._current_month: str | None = None
        self.dates: list[date] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h4":
            self._current_section = "year"
            self._current_text = []
        elif tag == "a" and self._current_section == "year":
            self._current_text = []
        elif tag == "div":
            class_attr = attrs.get("class", "")
            if "fomc-meeting__month" in class_attr:
                self._current_section = "month"
                self._current_text = []
            elif "fomc-meeting__date" in class_attr:
                self._current_section = "date"
                self._current_text = []

    def handle_endtag(self, tag):
        if tag == "h4" and self._current_section == "year":
            text = "".join(self._current_text).strip()
            year_match = re.search(r"(\d{4})", text)
            if year_match:
                self._recent_year = int(year_match.group(1))
            self._current_section = None
            self._current_text = []
        elif tag == "div" and self._current_section in {"month", "date"}:
            content = "".join(self._current_text).strip()
            if self._current_section == "month":
                self._current_month = re.sub(r"\s+", " ", content)
            elif self._current_section == "date" and self._current_month and self._recent_year is not None:
                clean_date = re.sub(r"[\s*]+", " ", content).replace("*", "").strip()
                if clean_date:
                    day_str = clean_date.split("-")[0].strip()
                    day_match = re.match(r"(\d+)", day_str)
                    if day_match:
                        month_number = MONTH_NAME_TO_NUMBER.get(self._current_month.lower())
                        if month_number:
                            try:
                                self.dates.append(date(self._recent_year, month_number, int(day_match.group(1))))
                            except ValueError:
                                pass
            self._current_section = None
            self._current_text = []

    def handle_data(self, data):
        if self._current_section in {"year", "month", "date"}:
            self._current_text.append(data)


def _parse_fomc_calendar_html(html: str) -> list[date]:
    parser = _FOMCCalendarParser()
    parser.feed(html)
    return parser.dates


def _get_next_fomc_date() -> str | None:
    try:
        response = requests.get(FED_CALENDAR_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        response.raise_for_status()
        fomc_dates = _parse_fomc_calendar_html(response.text)
    except Exception:
        return None

    today = date.today()
    future_dates = [meeting for meeting in sorted(fomc_dates) if meeting >= today]
    next_date = future_dates[0] if future_dates else (fomc_dates[0] if fomc_dates else None)
    return next_date.strftime("%d %b %Y") if next_date else None


def _get_yfinance_close(symbol: str, period: str = "6d") -> list[float]:
    history = yf.Ticker(symbol).history(period=period)["Close"].dropna()
    return [float(value) for value in history.tolist()]


def _calculate_move_probabilities(current_rate: float, implied_rate: float) -> tuple[str, str, str]:
    delta_bp = round((implied_rate - current_rate) * 100)

    if delta_bp >= 75:
        hike, hold, cut = 90.0, 8.0, 2.0
    elif delta_bp >= 50:
        hike, hold, cut = 80.0, 15.0, 5.0
    elif delta_bp >= 25:
        hike, hold, cut = 60.0, 30.0, 10.0
    elif delta_bp >= 10:
        hike, hold, cut = 45.0, 40.0, 15.0
    elif delta_bp >= -10:
        hike, hold, cut = (15.0, 75.0, 10.0) if delta_bp >= 0 else (10.0, 75.0, 15.0)
    elif delta_bp >= -25:
        hike, hold, cut = 10.0, 30.0, 60.0
    elif delta_bp >= -50:
        hike, hold, cut = 5.0, 15.0, 80.0
    else:
        hike, hold, cut = 2.0, 8.0, 90.0

    return f"{hold:.1f}%", f"{hike:.1f}%", f"{cut:.1f}%"


def _direction_vs_last_week(symbol: str) -> str:
    closes = _get_yfinance_close(symbol, period="6d")
    if len(closes) < 2:
        return "unchanged"

    current_rate = 100.0 - closes[-1]
    prior_rate = 100.0 - closes[0]
    diff = current_rate - prior_rate
    if diff > 0.05:
        return "shifted hawkish"
    if diff < -0.05:
        return "shifted dovish"
    return "unchanged"


def _ten_year_direction() -> str:
    closes = _get_yfinance_close("^TNX", period="6d")
    if len(closes) < 2:
        return "Flat"

    diff = closes[-1] - closes[0]
    if diff > 0.05:
        return "Rising"
    if diff < -0.05:
        return "Falling"
    return "Flat"


def fetch_fed_and_yields():
    try:
        print("Fetching Treasury yields and Fed expectations...")
        irx_history = yf.Ticker("^IRX").history(period="3d")["Close"].dropna()
        tnx_history = yf.Ticker("^TNX").history(period="3d")["Close"].dropna()
        tyx_history = yf.Ticker("^TYX").history(period="3d")["Close"].dropna()
        zq_history = yf.Ticker("ZQ=F").history(period="6d")["Close"].dropna()

        irx = float(irx_history.iloc[-1])
        tnx = float(tnx_history.iloc[-1])
        tyx = float(tyx_history.iloc[-1])
        zq_latest = float(zq_history.iloc[-1]) if len(zq_history) else None

        next_fomc_date = _get_next_fomc_date() or "N/A"
        implied_rate = 100.0 - zq_latest if zq_latest is not None else irx
        hold_probability, hike_probability, cut_probability = _calculate_move_probabilities(irx, implied_rate)
        direction_vs_last_week = _direction_vs_last_week("ZQ=F")
        ten_year_direction = _ten_year_direction()
        implication = "Inverted Yield Curve" if irx > tnx else "Normal Yield Curve"
        yield_implication = (
            "Inverted Yield Curve, cautious on growth" if implication == "Inverted Yield Curve"
            else "Normal yield curve, rate expectations steady"
        )

        return {
            "current_fed_proxy": f"{round(irx, 2)}%",
            "next_fomc_date": next_fomc_date,
            "hold_probability": hold_probability,
            "hike_probability": hike_probability,
            "cut_probability": cut_probability,
            "direction_vs_last_week": direction_vs_last_week,
            "yield_2y_10y_30y": f"{round(irx, 2)}% / {round(tnx, 2)}% / {round(tyx, 2)}%",
            "implication": implication,
            "ten_year_direction": ten_year_direction,
            "yield_implication": yield_implication,
        }
    except Exception as e:
        print(f"Error fetching yields: {e}")
        return {
            "current_fed_proxy": "[Error]",
            "next_fomc_date": "[Error]",
            "hold_probability": "[Error]",
            "hike_probability": "[Error]",
            "cut_probability": "[Error]",
            "direction_vs_last_week": "[Error]",
            "yield_2y_10y_30y": "[Error]",
            "implication": "[Error]",
            "ten_year_direction": "[Error]",
            "yield_implication": "[Error]",
        }
        tnx = yf.Ticker("^TNX").history(period="1d")['Close'].iloc[-1]
        tyx = yf.Ticker("^TYX").history(period="1d")['Close'].iloc[-1]
        
        return {
            "current_fed_proxy": f"{round(irx, 2)}%",
            "yield_2y_10y_30y": f"{round(irx, 2)}% / {round(tnx, 2)}% / {round(tyx, 2)}%",
            "implication": "Inverted Yield Curve" if irx > tnx else "Normal Yield Curve"
        }
    except Exception as e:
        print(f"Error fetching yields: {e}")
        return {"current_fed_proxy": "[Error]", "yield_2y_10y_30y": "[Error]", "implication": "[Error]"}