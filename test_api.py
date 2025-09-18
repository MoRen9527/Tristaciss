#!/usr/bin/env python3
"""
测试API端点的脚本
"""
import requests
import json

def test_api_endpoint():
    base_url = "http://localhost:8008"
    
    # 测试健康检查
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Health response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # 测试providers config GET
    try:
        response = requests.get(f"{base_url}/api/providers/config")
        print(f"Providers config GET: {response.status_code}")
        if response.status_code == 200:
            print(f"Providers config response: {response.json()}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Providers config GET failed: {e}")
    
    # 测试providers config POST
    try:
        test_data = {
            "provider_type": "test",
            "config": {
                "api_key": "test_key",
                "base_url": "https://test.com",
                "default_model": "test_model"
            }
        }
        response = requests.post(f"{base_url}/api/providers/config", json=test_data)
        print(f"Providers config POST: {response.status_code}")
        if response.status_code == 200:
            print(f"POST response: {response.json()}")
        else:
            print(f"POST error response: {response.text}")
    except Exception as e:
        print(f"Providers config POST failed: {e}")

if __name__ == "__main__":
    test_api_endpoint()