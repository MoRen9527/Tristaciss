"""
Token统计验证工具

用于验证前端显示的token统计数据是否与后端实际API调用一致
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class TokenVerificationLogger:
    """Token验证日志记录器"""
    
    def __init__(self):
        self.api_calls = []
        
    def log_api_request(self, provider: str, model: str, messages: List[Dict], request_id: str):
        """记录API请求信息"""
        # 估算输入token
        input_text = ' '.join([msg.get('content', '') for msg in messages])
        estimated_input_tokens = self._estimate_tokens(input_text)
        
        call_info = {
            'request_id': request_id,
            'provider': provider,
            'model': model,
            'timestamp': datetime.now().isoformat(),
            'input_text_length': len(input_text),
            'estimated_input_tokens': estimated_input_tokens,
            'messages_count': len(messages)
        }
        
        self.api_calls.append(call_info)
        logger.info(f"🔍 API请求记录: {json.dumps(call_info, ensure_ascii=False, indent=2)}")
        
    def log_api_response(self, request_id: str, response_text: str, actual_tokens: Dict = None):
        """记录API响应信息"""
        # 找到对应的请求记录
        for call in self.api_calls:
            if call['request_id'] == request_id:
                estimated_output_tokens = self._estimate_tokens(response_text)
                
                call.update({
                    'response_text_length': len(response_text),
                    'estimated_output_tokens': estimated_output_tokens,
                    'actual_tokens': actual_tokens,  # 如果API返回了真实token数据
                    'response_timestamp': datetime.now().isoformat()
                })
                
                # 计算差异
                if actual_tokens:
                    input_diff = abs(call['estimated_input_tokens'] - actual_tokens.get('prompt_tokens', 0))
                    output_diff = abs(estimated_output_tokens - actual_tokens.get('completion_tokens', 0))
                    
                    call['token_accuracy'] = {
                        'input_token_diff': input_diff,
                        'output_token_diff': output_diff,
                        'input_accuracy': 1 - (input_diff / max(actual_tokens.get('prompt_tokens', 1), 1)),
                        'output_accuracy': 1 - (output_diff / max(actual_tokens.get('completion_tokens', 1), 1))
                    }
                
                logger.info(f"📊 API响应记录: {json.dumps(call, ensure_ascii=False, indent=2)}")
                break
                
    def _estimate_tokens(self, text: str) -> int:
        """估算token数量（与前端逻辑保持一致）"""
        if not text:
            return 0
        # 中文约2-3字符/token，英文约4字符/token
        return len(text) // 2 if any('\u4e00' <= c <= '\u9fff' for c in text) else len(text) // 4
        
    def get_verification_report(self) -> Dict[str, Any]:
        """生成验证报告"""
        if not self.api_calls:
            return {"message": "暂无API调用记录"}
            
        total_calls = len(self.api_calls)
        calls_with_actual_tokens = len([call for call in self.api_calls if call.get('actual_tokens')])
        
        report = {
            "total_api_calls": total_calls,
            "calls_with_actual_tokens": calls_with_actual_tokens,
            "recent_calls": self.api_calls[-5:],  # 最近5次调用
            "verification_methods": [
                "1. 检查后端日志中的API请求/响应记录",
                "2. 对比估算token与实际API返回的token数据",
                "3. 验证费用计算是否基于正确的模型价格",
                "4. 检查响应时间是否与实际API调用时间一致"
            ]
        }
        
        if calls_with_actual_tokens > 0:
            # 计算准确率统计
            accuracies = []
            for call in self.api_calls:
                if call.get('token_accuracy'):
                    accuracies.append(call['token_accuracy'])
            
            if accuracies:
                avg_input_accuracy = sum(acc['input_accuracy'] for acc in accuracies) / len(accuracies)
                avg_output_accuracy = sum(acc['output_accuracy'] for acc in accuracies) / len(accuracies)
                
                report['accuracy_stats'] = {
                    'average_input_token_accuracy': f"{avg_input_accuracy:.2%}",
                    'average_output_token_accuracy': f"{avg_output_accuracy:.2%}"
                }
        
        return report

# 全局验证器实例
token_verifier = TokenVerificationLogger()