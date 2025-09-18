#!/usr/bin/env python3
"""修复提供商配置文件，添加缺失的openai_compatible和enabled_models字段"""

import json
import os
from datetime import datetime

def fix_provider_configs():
    config_file = "provider_configs.json"
    
    # 支持OpenAI兼容模式的提供商
    openai_compatible_providers = {
        'google': True, 'deepseek': True, 'glm': True, 'qwen': True,
        'moonshot': True, 'together': True, 'openrouter': True,
        'modelscope': True, 'huggingface': True,
        'openai': False, 'anthropic': False, 'meta': False
    }
    
    try:
        # 读取配置
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        # 备份
        backup_file = f"{config_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        # 修复配置
        providers = config_data.get('providers', {})
        fixed_count = 0
        
        for provider_name, provider_config in providers.items():
            if provider_name == 'test_provider':
                continue
                
            needs_fix = False
            
            # 添加 openai_compatible 字段
            if 'openai_compatible' not in provider_config:
                provider_config['openai_compatible'] = openai_compatible_providers.get(provider_name, False)
                needs_fix = True
            
            # 添加 enabled_models 字段
            if 'enabled_models' not in provider_config:
                provider_config['enabled_models'] = []
                needs_fix = True
            
            if needs_fix:
                provider_config['updated_at'] = datetime.now().isoformat()
                fixed_count += 1
                print(f"✅ 修复提供商: {provider_name} (openai_compatible: {provider_config['openai_compatible']})")
        
        # 保存修复后的配置
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        print(f"🎉 修复完成！总计修复: {fixed_count} 个提供商")
        return True
        
    except Exception as e:
        print(f"❌ 修复失败: {e}")
        return False

if __name__ == "__main__":
    print("🔧 开始修复提供商配置...")
    fix_provider_configs()