"""
免费模型管理器

统一管理OpenRouter和其他提供商的免费模型
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass
import logging

from .base import ModelInfo

logger = logging.getLogger(__name__)

@dataclass
class FreeModelInfo:
    """免费模型信息"""
    model_id: str
    name: str
    provider: str
    context_length: int
    supports_reasoning: bool = False
    supports_vision: bool = False
    supports_function_calling: bool = False
    description: str = ""
    
class FreeModelManager:
    """免费模型管理器"""
    
    # OpenRouter免费模型定义
    OPENROUTER_FREE_MODELS = {
        "deepseek/deepseek-r1:free": FreeModelInfo(
            model_id="deepseek/deepseek-r1:free",
            name="DeepSeek R1 (Free)",
            provider="OpenRouter",
            context_length=163840,
            supports_reasoning=True,
            supports_function_calling=True,
            description="DeepSeek R1是开源推理模型，性能媲美OpenAI o1，支持完全开放的推理token"
        ),
        "deepseek/deepseek-r1-0528:free": FreeModelInfo(
            model_id="deepseek/deepseek-r1-0528:free", 
            name="DeepSeek R1 0528 (Free)",
            provider="OpenRouter",
            context_length=163840,
            supports_reasoning=True,
            supports_function_calling=True,
            description="DeepSeek R1的5月28日更新版本，推理能力进一步优化"
        ),
        "qwen/qwen3-8b:free": FreeModelInfo(
            model_id="qwen/qwen3-8b:free",
            name="Qwen3 8B (Free)",
            provider="OpenRouter", 
            context_length=40960,
            supports_reasoning=True,
            supports_function_calling=True,
            description="Qwen3-8B是82亿参数的因果语言模型，支持推理和对话双模式"
        ),
        "qwen/qwen3-30b-a3b:free": FreeModelInfo(
            model_id="qwen/qwen3-30b-a3b:free",
            name="Qwen3 30B A3B (Free)",
            provider="OpenRouter",
            context_length=40960,
            supports_reasoning=True,
            supports_function_calling=True,
            description="Qwen3-30B-A3B是305亿参数的MoE模型，激活33亿参数，支持多语言和推理"
        ),
        "qwen/qwen3-235b-a22b:free": FreeModelInfo(
            model_id="qwen/qwen3-235b-a22b:free",
            name="Qwen3 235B A22B (Free)",
            provider="OpenRouter",
            context_length=131072,
            supports_reasoning=True,
            supports_function_calling=True,
            description="Qwen3-235B-A22B是2350亿参数的MoE模型，激活220亿参数，顶级推理能力"
        ),
        "qwen/qwq-32b:free": FreeModelInfo(
            model_id="qwen/qwq-32b:free",
            name="Qwen QwQ 32B (Free)",
            provider="OpenRouter",
            context_length=32768,
            supports_reasoning=True,
            description="QwQ是Qwen系列的推理模型，在困难问题上表现出色"
        ),
        "cognitivecomputations/dolphin3.0-mistral-24b:free": FreeModelInfo(
            model_id="cognitivecomputations/dolphin3.0-mistral-24b:free",
            name="Dolphin3.0 Mistral 24B (Free)",
            provider="OpenRouter",
            context_length=32768,
            supports_function_calling=True,
            description="Dolphin 3.0是通用指令调优模型，支持编程、数学和智能体用例"
        ),
        "mistralai/devstral-small-2505:free": FreeModelInfo(
            model_id="mistralai/devstral-small-2505:free",
            name="Mistral Devstral Small 2505 (Free)",
            provider="OpenRouter",
            context_length=32768,
            supports_function_calling=True,
            description="Devstral-Small-2505是240亿参数的智能体LLM，专为软件工程任务优化"
        ),
        "google/gemma-3n-e4b-it:free": FreeModelInfo(
            model_id="google/gemma-3n-e4b-it:free",
            name="Google Gemma 3n 4B (Free)",
            provider="OpenRouter",
            context_length=8192,
            supports_vision=True,
            description="Gemma 3n E4B-it针对移动和低资源设备优化，支持多模态输入"
        )
    }
    
    def __init__(self):
        """初始化免费模型管理器"""
        self._custom_free_models: Dict[str, FreeModelInfo] = {}
        
    def get_all_free_models(self) -> Dict[str, FreeModelInfo]:
        """获取所有免费模型"""
        all_models = {}
        all_models.update(self.OPENROUTER_FREE_MODELS)
        all_models.update(self._custom_free_models)
        return all_models
        
    def get_openrouter_free_models(self) -> Dict[str, FreeModelInfo]:
        """获取OpenRouter免费模型"""
        return self.OPENROUTER_FREE_MODELS.copy()
        
    def get_free_models_by_provider(self, provider: str) -> Dict[str, FreeModelInfo]:
        """根据提供商获取免费模型"""
        all_models = self.get_all_free_models()
        return {
            model_id: info for model_id, info in all_models.items()
            if info.provider.lower() == provider.lower()
        }
        
    def get_reasoning_models(self) -> Dict[str, FreeModelInfo]:
        """获取支持推理的免费模型"""
        all_models = self.get_all_free_models()
        return {
            model_id: info for model_id, info in all_models.items()
            if info.supports_reasoning
        }
        
    def get_vision_models(self) -> Dict[str, FreeModelInfo]:
        """获取支持视觉的免费模型"""
        all_models = self.get_all_free_models()
        return {
            model_id: info for model_id, info in all_models.items()
            if info.supports_vision
        }
        
    def get_function_calling_models(self) -> Dict[str, FreeModelInfo]:
        """获取支持函数调用的免费模型"""
        all_models = self.get_all_free_models()
        return {
            model_id: info for model_id, info in all_models.items()
            if info.supports_function_calling
        }
        
    def is_free_model(self, model_id: str) -> bool:
        """检查是否为免费模型"""
        return model_id in self.get_all_free_models()
        
    def get_model_info(self, model_id: str) -> Optional[FreeModelInfo]:
        """获取特定模型信息"""
        all_models = self.get_all_free_models()
        return all_models.get(model_id)
        
    def add_custom_free_model(self, model_info: FreeModelInfo):
        """添加自定义免费模型"""
        self._custom_free_models[model_info.model_id] = model_info
        logger.info(f"添加自定义免费模型: {model_info.model_id}")
        
    def remove_custom_free_model(self, model_id: str) -> bool:
        """移除自定义免费模型"""
        if model_id in self._custom_free_models:
            del self._custom_free_models[model_id]
            logger.info(f"移除自定义免费模型: {model_id}")
            return True
        return False
        
    def convert_to_model_info(self, free_model_info: FreeModelInfo) -> ModelInfo:
        """将FreeModelInfo转换为ModelInfo"""
        return ModelInfo(
            id=free_model_info.model_id,
            name=free_model_info.name,
            provider=free_model_info.provider,
            max_context_length=free_model_info.context_length,
            max_input_tokens=int(free_model_info.context_length * 0.75),
            max_output_tokens=int(free_model_info.context_length * 0.25),
            input_price_per_1k=0.0,
            output_price_per_1k=0.0,
            supports_streaming=True
        )
        
    def get_free_model_list(self, provider: Optional[str] = None) -> List[ModelInfo]:
        """获取免费模型列表（ModelInfo格式）"""
        if provider:
            free_models = self.get_free_models_by_provider(provider)
        else:
            free_models = self.get_all_free_models()
            
        return [
            self.convert_to_model_info(info) 
            for info in free_models.values()
        ]
        
    def get_recommended_models(self, use_case: str = "general") -> List[str]:
        """根据用例推荐免费模型"""
        if use_case == "reasoning":
            # 推理任务推荐
            return [
                "deepseek/deepseek-r1:free",
                "qwen/qwen3-235b-a22b:free", 
                "qwen/qwq-32b:free"
            ]
        elif use_case == "coding":
            # 编程任务推荐
            return [
                "mistralai/devstral-small-2505:free",
                "deepseek/deepseek-r1:free",
                "cognitivecomputations/dolphin3.0-mistral-24b:free"
            ]
        elif use_case == "chat":
            # 对话任务推荐
            return [
                "qwen/qwen3-8b:free",
                "qwen/qwen3-30b-a3b:free",
                "cognitivecomputations/dolphin3.0-mistral-24b:free"
            ]
        elif use_case == "multimodal":
            # 多模态任务推荐
            return [
                "google/gemma-3n-e4b-it:free"
            ]
        else:
            # 通用推荐
            return [
                "deepseek/deepseek-r1:free",
                "qwen/qwen3-30b-a3b:free",
                "qwen/qwen3-8b:free"
            ]
            
    def get_model_capabilities(self, model_id: str) -> Dict[str, bool]:
        """获取模型能力信息"""
        model_info = self.get_model_info(model_id)
        if not model_info:
            return {}
            
        return {
            "reasoning": model_info.supports_reasoning,
            "vision": model_info.supports_vision,
            "function_calling": model_info.supports_function_calling,
            "free": True,
            "context_length": model_info.context_length
        }
        
    def filter_models_by_capabilities(
        self, 
        reasoning: Optional[bool] = None,
        vision: Optional[bool] = None,
        function_calling: Optional[bool] = None,
        min_context_length: Optional[int] = None
    ) -> List[str]:
        """根据能力筛选模型"""
        all_models = self.get_all_free_models()
        filtered_models = []
        
        for model_id, info in all_models.items():
            # 检查推理能力
            if reasoning is not None and info.supports_reasoning != reasoning:
                continue
                
            # 检查视觉能力
            if vision is not None and info.supports_vision != vision:
                continue
                
            # 检查函数调用能力
            if function_calling is not None and info.supports_function_calling != function_calling:
                continue
                
            # 检查上下文长度
            if min_context_length is not None and info.context_length < min_context_length:
                continue
                
            filtered_models.append(model_id)
            
        return filtered_models
        
    def get_statistics(self) -> Dict[str, int]:
        """获取免费模型统计信息"""
        all_models = self.get_all_free_models()
        
        stats = {
            "total_models": len(all_models),
            "openrouter_models": len(self.OPENROUTER_FREE_MODELS),
            "custom_models": len(self._custom_free_models),
            "reasoning_models": len([m for m in all_models.values() if m.supports_reasoning]),
            "vision_models": len([m for m in all_models.values() if m.supports_vision]),
            "function_calling_models": len([m for m in all_models.values() if m.supports_function_calling])
        }
        
        return stats

# 全局免费模型管理器实例
free_model_manager = FreeModelManager()