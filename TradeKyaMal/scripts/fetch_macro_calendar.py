import requests
import xml.etree.ElementTree as ET

def fetch_economic_calendar():
    try:
        print("Fetching economic calendar from ForexFactory...")
        # Free XML feed for this week's events
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        
        root = ET.fromstring(response.content)
        events = []
        
        # Only grab High Impact events for USD
        for event in root.findall('event'):
            country = event.find('country').text
            impact = event.find('impact').text
            
            if country == "USD" and impact == "High":
                title = event.find('title').text
                date = event.find('date').text
                events.append(f"* {date}: **{title}**")
                
        if not events:
            return "* No high-impact USD events scheduled this week."
            
        return "\n".join(events)
    except Exception as e:
        return "* Failed to fetch calendar automatically."