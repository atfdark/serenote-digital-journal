#!/usr/bin/env python3
"""
Test script to verify IST timezone conversion
"""
from datetime import datetime, timezone, timedelta

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def test_ist_conversion():
    """Test IST conversion functions"""
    # Test current time in IST
    now_utc = datetime.now(timezone.utc)
    now_ist = datetime.now(IST)

    print(f"Current UTC time: {now_utc}")
    print(f"Current IST time: {now_ist}")
    print(f"Difference: {(now_ist - now_utc).total_seconds() / 3600} hours")

    # Test timestamp conversion
    timestamp = datetime.now(IST).timestamp()
    print(f"IST timestamp: {timestamp}")

    # Test date string formatting
    ist_date = datetime.now(IST)
    print(f"IST date string: {ist_date.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    print("IST conversion test completed successfully!")

if __name__ == "__main__":
    test_ist_conversion()