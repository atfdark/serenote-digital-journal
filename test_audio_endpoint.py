import requests
import json

# Test the audio endpoint
# First, let's login to get a session
session = requests.Session()

# Login data - you'll need to replace with actual credentials
login_data = {
    'username': 'testuser',  # Replace with actual username
    'password': 'testpass'   # Replace with actual password
}

# Login
login_response = session.post('http://localhost:5000/auth/login', data=login_data)
print(f"Login response status: {login_response.status_code}")
if login_response.status_code != 200:
    print("Login failed")
    exit(1)

# Now test the audio endpoint with entry ID 119 (which has audio data)
entry_id = 119  # From the test output, this has audio_data
audio_url = f'http://localhost:5000/entries/voice/audio/{entry_id}'

print(f"Testing audio endpoint: {audio_url}")
response = session.get(audio_url)

print(f"Response status: {response.status_code}")
print(f"Response headers: {dict(response.headers)}")

if response.status_code == 200:
    data = response.json()
    print(f"Response data keys: {data.keys()}")
    print(f"MIME type: {data.get('mime_type')}")
    print(f"Audio data length: {len(data.get('audio_data', ''))}")
    print(f"Audio data preview: {data.get('audio_data', '')[:50]}...")
else:
    print(f"Error response: {response.text}")