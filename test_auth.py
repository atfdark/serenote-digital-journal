import requests
import json

BASE_URL = "http://localhost:5000"

def test_auth_flow():
    print("Testing Authentication Flow...")

    # Create a session for maintaining cookies
    session = requests.Session()

    # 1. Register a new user
    print("\n1. Registering user...")
    register_data = {"username": "testuser", "password": "testpass"}
    response = session.post(f"{BASE_URL}/auth/register", json=register_data)
    print(f"Register response: {response.status_code} - {response.json()}")

    # 2. Try accessing /main without login (should redirect to /login)
    print("\n2. Accessing /main without login...")
    response = session.get(f"{BASE_URL}/main", allow_redirects=False)
    if response.status_code == 302 and '/login' in response.headers.get('Location', ''):
        print("PASS: Correctly redirected to /login")
    else:
        print(f"FAIL: Expected redirect to /login, got {response.status_code}")

    # 3. Login with valid credentials
    print("\n3. Logging in...")
    login_data = {"username": "testuser", "password": "testpass"}
    response = session.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login response: {response.status_code} - {response.json()}")
    if response.status_code == 200:
        print("PASS: Login successful")
    else:
        print("FAIL: Login failed")

    # 4. Access /main after login (should succeed)
    print("\n4. Accessing /main after login...")
    response = session.get(f"{BASE_URL}/main", allow_redirects=False)
    if response.status_code == 200:
        print("PASS: Successfully accessed /main")
    else:
        print(f"FAIL: Failed to access /main, status: {response.status_code}")

    # 5. Test API routes without authentication (should fail)
    print("\n5. Testing API without authentication...")
    unauth_session = requests.Session()  # New session without login
    response = unauth_session.get(f"{BASE_URL}/todos/todos")
    if response.status_code == 401:
        print("PASS: API correctly rejected unauthenticated request")
    else:
        print(f"FAIL: API should reject unauthenticated, got {response.status_code}")

    # 6. Test API routes with authentication (should work)
    print("\n6. Testing API with authentication...")
    response = session.get(f"{BASE_URL}/todos/todos")
    if response.status_code == 200:
        print("PASS: API correctly accepted authenticated request")
        print(f"Response: {response.json()}")
    else:
        print(f"FAIL: API should accept authenticated, got {response.status_code}")

    # 7. Logout
    print("\n7. Logging out...")
    response = session.post(f"{BASE_URL}/auth/logout")
    print(f"Logout response: {response.status_code} - {response.json()}")
    if response.status_code == 200:
        print("PASS: Logout successful")
    else:
        print("FAIL: Logout failed")

    # 8. Try accessing /main after logout (should redirect)
    print("\n8. Accessing /main after logout...")
    response = session.get(f"{BASE_URL}/main", allow_redirects=False)
    if response.status_code == 302 and '/login' in response.headers.get('Location', ''):
        print("PASS: Correctly redirected to /login after logout")
    else:
        print(f"FAIL: Expected redirect to /login, got {response.status_code}")

    print("\nAuthentication flow testing completed.")

if __name__ == "__main__":
    test_auth_flow()