import requests
import json

# Test the entries API endpoint
base_url = "http://localhost:5000"  # Assuming the app runs on port 5000

# Test with user_id 1 (common test user)
user_id = 1
url = f"{base_url}/entries/user/{user_id}"

print(f"Testing API endpoint: {url}")

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"Response type: {type(data)}")
        print(f"Number of entries: {len(data) if isinstance(data, list) else 'N/A'}")

        if isinstance(data, list) and len(data) > 0:
            print("\nFirst entry sample:")
            entry = data[0]
            print(f"Keys: {list(entry.keys())}")
            print(f"ID: {entry.get('id')}")
            print(f"Title: {entry.get('title')}")
            print(f"Type: {entry.get('type')}")
            print(f"Has drawing_data: {'drawing_data' in entry}")
            if 'drawing_data' in entry and entry['drawing_data']:
                print(f"Drawing data length: {len(entry['drawing_data'])}")
            else:
                print("Drawing data: None or empty")
        else:
            print("No entries found or response is not a list")

    else:
        print(f"Error response: {response.text}")

except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to the server. Is the Flask app running?")
except Exception as e:
    print(f"ERROR: {e}")