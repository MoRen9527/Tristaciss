import time
import json

class TokenStatsCollector:
    """Token统计收集器"""
    
    def __init__(self):
        self.start_time = None
        self.first_token_time = None
        self.total_tokens = 0
        self.content_length = 0
        
    def start_timing(self):
        """开始计时"""
        self.start_time = time.time()
        
    def record_chunk(self, content):
        """记录每个chunk的内容"""
        if self.first_token_time is None:
            self.first_token_time = time.time() - self.start_time
            
        self.content_length += len(content)
        # 粗略估算token数量（中文约2-3字符/token，英文约4字符/token）
        estimated_tokens = len(content) // 2 if any('\u4e00' <= c <= '\u9fff' for c in content) else len(content) // 4
        self.total_tokens += max(1, estimated_tokens)
        
    def get_stats(self, messages):
        """获取统计数据"""
        total_time = time.time() - self.start_time
        tokens_per_second = self.total_tokens / total_time if total_time > 0 else 0
        
        # 估算输入token数量
        input_text = ' '.join([msg['content'] for msg in messages])
        input_tokens = len(input_text) // 2 if any('\u4e00' <= c <= '\u9fff' for c in input_text) else len(input_text) // 4
        input_tokens = max(10, input_tokens)  # 最少10个token
        
        total_all_tokens = input_tokens + self.total_tokens
        
        # 费用计算（以DeepSeek为例：输入¥0.0014/1K tokens，输出¥0.0028/1K tokens）
        input_cost = (input_tokens / 1000) * 0.0014
        output_cost = (self.total_tokens / 1000) * 0.0028
        total_cost_usd = input_cost + output_cost
        total_cost_cny = total_cost_usd * 7.2  # 美元转人民币汇率
        
        return {
            "type": "stats",
            "performance": {
                "first_token_time": self.first_token_time or 0,
                "response_time": total_time,
                "tokens_per_second": tokens_per_second
            },
            "tokens": {
                "input_tokens": input_tokens,
                "output_tokens": self.total_tokens,
                "total_tokens": total_all_tokens,
                "total_cost_usd": total_cost_usd,
                "total_cost_cny": total_cost_cny
            }
        }