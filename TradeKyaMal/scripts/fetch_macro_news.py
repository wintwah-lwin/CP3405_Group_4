import requests
import xml.etree.ElementTree as ET

def fetch_latest_news():
    try:
        print("Fetching latest macro news...")
        url = "https://www.cnbc.com/id/10001147/device/rss/rss.html"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        
        root = ET.fromstring(response.content)
        news_items = []
        
        for item in root.findall('.//item')[:3]:
            title = item.find('title').text
            news_items.append(f"* {title}")
            
        return "\n".join(news_items)
    except Exception as e:
        return "* Failed to fetch live news headlines automatically."