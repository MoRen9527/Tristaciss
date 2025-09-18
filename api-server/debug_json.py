import json
import sys

print("Python版本:", sys.version)
print("json模块位置:", json.__file__)

# 测试基本JSON
data = {"a": 1, "b": 2}
result = json.dumps(data)
print("基本测试:", result)

# 测试布尔值
data2 = {"success": True, "count": 5}
result2 = json.dumps(data2)
print("布尔值测试:", result2)

# 检查json.dumps函数
print("json.dumps函数:", json.dumps)
print("json.dumps类型:", type(json.dumps))