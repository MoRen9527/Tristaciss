import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Divider,
  Badge,
  InputAdornment,
  Paper
} from '@mui/material';
import api from '../../services/api';
import './ProviderSettings.css';
import configManager from '../../services/ConfigManager';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Science as TestIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Person as SingleChatIcon,
  Group as GroupChatIcon,
  Group as GroupIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { setGroupChatSettings } from '../../store/chatSlice';
import { ProviderConfig, ProviderConfigs } from '../../types/config';

interface ProviderSettingsProps {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
  onSettingsChange?: () => void;
}

const ProviderSettings: React.FC<ProviderSettingsProps> = ({ open, onClose, embedded = false, onSettingsChange }) => {
    
  // 如果组件没有打开且不是嵌入模式，直接返回null
  if (!open && !embedded) {
        return null;
  }
  
  const dispatch = useDispatch();
  const reduxGroupChatSettings = useSelector((state: any) => state.chat.groupChatSettings);
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dialogPosition, setDialogPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // 健壮配置架构：不再依赖localStorage，使用内存状态管理
  const [mainTab, setMainTab] = useState<number>(0);
  const [singleChatTab, setSingleChatTab] = useState<number>(0);
  
  // 统一的提供商配置，去重并整理
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfigs>({
    openai: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      openaiCompatible: false,
      enabledModels: [
        'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
        'o1-preview', 'o1-mini', 'gpt-4-vision-preview'
      ]
    },
    anthropic: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-3-5-sonnet-20241022',
      openaiCompatible: true,
      enabledModels: [
        'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
      ]
    },
    google: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-1.5-pro',
      openaiCompatible: true,
      enabledModels: [
        'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro',
        'gemini-1.5-pro-vision', 'gemini-1.5-flash-8b'
      ]
    },
    deepseek: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
      openaiCompatible: true,
      enabledModels: [
        'deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'
      ]
    },
    glm: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      defaultModel: 'glm-4.5',
      openaiCompatible: false,
      enabledModels: [
        'glm-4.5', 'glm-4.5-x', 'glm-4.5-air', 'glm-4.5-flash',
        'glm-4.5-long', 'glm-4.5-air-long', 'glm-4-plus', 'glm-4-0520',
        'glm-4-long', 'glm-4-airx', 'glm-4-air', 'glm-4-flashx', 'glm-4-flash'
      ]
    },
    qwen: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-plus',
      openaiCompatible: true,
      enabledModels: [
        'qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long',
        'qwen2.5-72b-instruct', 'qwen2.5-32b-instruct', 'qwen2.5-14b-instruct'
      ]
    },
    moonshot: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.moonshot.cn/v1',
      defaultModel: 'moonshot-v1-8k',
      openaiCompatible: true,
      enabledModels: [
        'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'
      ]
    },
    meta: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.llama-api.com/v1',
      defaultModel: 'llama-3.1-70b-instruct',
      openaiCompatible: true,
      enabledModels: [
        'llama-3.1-405b-instruct', 'llama-3.1-70b-instruct', 'llama-3.1-8b-instruct',
        'llama-3.2-90b-vision-instruct', 'llama-3.2-11b-vision-instruct', 'llama-3.2-3b-instruct'
      ]
    },
    openrouter: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'deepseek/deepseek-r1:free',
      openaiCompatible: true,
      enabledModels: [
        // 免费推理模型（推荐）
        'deepseek/deepseek-r1:free',
        'deepseek/deepseek-chat-v3.1:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'deepseek/deepseek-r1-0528:free',
        'qwen/qwq-32b:free',
        // 免费OpenAI模型
        'openai/gpt-oss-120b:free',
        'openai/gpt-oss-20b:free',
        // 免费GLM模型
        'z-ai/glm-4.5-air:free',
        // 免费Kimi模型
        'moonshotai/kimi-k2:free',
        'moonshotai/kimi-dev-72b:free',
        // 免费通用模型
        'qwen/qwen2.5-vl-32b-instruct:free',
        'qwen/qwen3-8b:free',
        'qwen/qwen3-30b-a3b:free',
        'qwen/qwen3-235b-a22b:free',
        // 免费编程模型
        'cognitivecomputations/dolphin3.0-mistral-24b:free',
        'mistralai/devstral-small-2505:free',
        // 免费多模态模型
        'google/gemma-3n-e4b-it:free',
        // 付费模型（可选）
        'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-3.5-turbo',
        'anthropic/claude-3-5-sonnet', 'anthropic/claude-3-haiku'
      ]
    },
    modelscope: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.modelscope.cn/v1',
      defaultModel: 'qwen-plus',
      openaiCompatible: true,
      enabledModels: [
        'qwen-plus', 'qwen-turbo', 'qwen-max', 'baichuan2-13b-chat'
      ]
    },
    huggingface: {
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api-inference.huggingface.co/v1',
      defaultModel: 'microsoft/DialoGPT-medium',
      openaiCompatible: true,
      enabledModels: [
        'microsoft/DialoGPT-medium', 'microsoft/DialoGPT-large',
        'facebook/blenderbot-400M-distill', 'microsoft/GODEL-v1_1-base-seq2seq'
      ]
    }
  });

  // API密钥可见性状态
  const [showApiKeys, setShowApiKeys] = useState({});
  
  // 测试连接状态
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  
  // 变更追踪
  const [hasChanges, setHasChanges] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 监听hasChanges变化
  useEffect(() => {
    console.log('🔄 hasChanges useEffect 触发:', hasChanges);
    setForceUpdate(prev => prev + 1);
  }, [hasChanges]);

  
  // 监听保存事件
  useEffect(() => {
    const handleSaveEvent = () => {
      console.log('🎯 收到保存事件，执行保存');
      handleSave();
    };
    
    window.addEventListener('saveProviderSettings', handleSaveEvent);
    
    return () => {
      window.removeEventListener('saveProviderSettings', handleSaveEvent);
    };
  }, []);
  
  // 监听renderKey变化
  useEffect(() => {
    console.log('🔄 renderKey useEffect 触发:', renderKey);
  }, [renderKey]);
  
  // 监听providerConfigs变化
  useEffect(() => {
    console.log('🔄 providerConfigs useEffect 触发:', providerConfigs);
  }, [providerConfigs]);
  
  // 群聊设置的本地状态
  const [localGroupChatSettings, setLocalGroupChatSettings] = useState(reduxGroupChatSettings);

  // 切换API密钥可见性
  const toggleApiKeyVisibility = (provider) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  // 更新提供商配置
  const updateProviderConfig = (provider, field, value) => {
    console.log(`🔧 更新配置: ${provider}.${field} = ${value}`);
    console.log(`🔧 更新前 hasChanges:`, hasChanges);
    
    // 直接更新配置，不检查值变化
    setProviderConfigs(prev => {
      const newConfig = {
        ...prev,
        [provider]: {
          ...prev[provider],
          [field]: value
        }
      };
      console.log(`🔧 新配置:`, newConfig);
      return newConfig;
    });
    
    // 标记有更改并强制重新渲染
    console.log('🔧 设置 hasChanges 为 true');
    setHasChanges(true);
    setRenderKey(prev => prev + 1);
    
    // 通知父组件配置发生变化
    if (onSettingsChange) {
      console.log('🔧 调用 onSettingsChange 回调');
      onSettingsChange();
    }
    
    // 如果更新了启用的模型列表，通知ChatPanel刷新
    if (field === 'enabledModels') {
      console.log('🔧 启用模型列表已更新，通知ChatPanel刷新');
      window.dispatchEvent(new CustomEvent('providerConfigUpdated'));
    }
    
    // 如果切换了OpenAI兼容模式，清除测试结果
    if (field === 'openaiCompatible') {
      setTestResults(prev => {
        const newResults = { ...prev };
        delete newResults[provider];
        return newResults;
      });
    }
  };

  // 测试连接
  const testConnection = async (provider) => {
    setTesting(prev => ({ ...prev, [provider]: true }));
    
    try {
      const config = providerConfigs[provider];
      // 转换字段名以匹配后端期望的格式
      const backendConfig = {
        api_key: config.apiKey,
        base_url: config.baseUrl,
        default_model: config.defaultModel,
        enabled_models: config.enabledModels,
        openai_compatible: config.openaiCompatible
      };
      
      const result = await api.post('/providers/test', {
        provider,
        config: backendConfig
      });
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: (result as any).connected,
          message: (result as any).connected ? '连接成功' : ((result as any).error || '连接失败'),
          developmentMode: (result as any).development_mode || false
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: `连接测试失败: ${error.message}`
        }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // 保存配置
  const saveConfigs = async () => {
    try {
      setIsSaving(true);
      
      // 使用函数式状态更新来获取最新状态
      let currentConfigs: typeof providerConfigs = providerConfigs;
      setProviderConfigs(prev => {
        currentConfigs = prev;
        return prev;
      });
      
      // 确保状态已更新
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🚀 开始保存配置，当前配置:', currentConfigs);
      
      // 逐个保存每个提供商的配置
      const savePromises = Object.entries(currentConfigs).map(async ([providerName, config]) => {
        console.log(`🔍 检查提供商 ${providerName}:`, config);
        console.log(`🔍 条件检查: enabled=${config.enabled}, apiKey=${config.apiKey ? '***' : ''}`);
        
        // 特别关注 DeepSeek
        if (providerName === 'deepseek') {
          console.log(`🎯 DeepSeek 详细状态:`, {
            enabled: config.enabled,
            apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : '(空)',
            hasApiKey: !!config.apiKey,
            apiKeyLength: config.apiKey ? config.apiKey.length : 0
          });
        }
        
        // 保存所有配置，不管是否启用
        const configData = {
          api_key: config.apiKey || '',
          base_url: config.baseUrl || '',
          default_model: config.defaultModel || '',
          enabled: config.enabled || false,
          enabled_models: config.enabledModels || [],
          openai_compatible: config.openaiCompatible || false
        };
        
        console.log(`📤 发送保存请求 ${providerName}:`, {
          provider_name: providerName,
          config: configData
        });
        
        const response: any = await configManager.updateProviderConfig(providerName, {
          apiKey: configData.api_key,
          baseUrl: configData.base_url,
          defaultModel: configData.default_model,
          enabled: configData.enabled,
          enabledModels: configData.enabled_models || [],
          openaiCompatible: configData.openai_compatible || false
        });
        
        console.log(`📥 收到保存响应 ${providerName}:`, response);
        return response;
      });
      
      await Promise.all(savePromises.filter(Boolean));
      
      // 保存成功后不重新加载配置，保持当前状态
      setHasChanges(false);
      if (onSettingsChange) {
        onSettingsChange();
      }
      
      console.log('✅ 所有配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // 加载配置
  const loadConfigs = async () => {
    console.log('🔄 loadConfigs 被调用，调用栈:', new Error().stack);
    
    // 如果正在保存，跳过加载
    if (isSaving) {
      console.log('⏭️ 正在保存中，跳过配置加载');
      return;
    }
    
    try {
      const configs = await configManager.loadConfigs();
      if (configs) {
        // 使用函数式更新确保使用最新的状态
        setProviderConfigs(currentConfigs => {
          const mergedConfigs = { ...currentConfigs };
          
          Object.entries(configs).forEach(([providerName, providerData]: [string, any]) => {
            console.log(`🔄 处理提供商 ${providerName}:`, providerData);
            console.log(`🔄 原始openai_compatible值:`, providerData.openai_compatible);
            console.log(`🔄 原始openaiCompatible值:`, providerData.openaiCompatible);
            
            if (mergedConfigs[providerName]) {
              const backendHasApiKey = Boolean(providerData.hasApiKey || providerData.has_api_key || (providerData.apiKey && providerData.apiKey.trim()));
              mergedConfigs[providerName] = {
                ...mergedConfigs[providerName], // 保留当前配置
                enabled: providerData.enabled || false,
                // 环境变量模式下后端不再回显真实 key；有运行时密钥时清空本地回显，避免保留旧值
                apiKey: providerData.apiKey && providerData.apiKey.trim() && providerData.apiKey !== 'sk-deepseek-test-123' 
                  ? providerData.apiKey 
                  : (backendHasApiKey ? '' : mergedConfigs[providerName].apiKey),
                hasApiKey: backendHasApiKey,
                apiKeySource: providerData.apiKeySource || providerData.api_key_source || (backendHasApiKey ? 'env' : mergedConfigs[providerName].apiKeySource),
                baseUrl: providerData.baseUrl || mergedConfigs[providerName].baseUrl,
                defaultModel: providerData.defaultModel || mergedConfigs[providerName].defaultModel,
                enabledModels: providerData.enabledModels || mergedConfigs[providerName].enabledModels,
                // 优先使用openai_compatible字段（后端格式），然后是openaiCompatible（前端格式）
                openaiCompatible: providerData.openai_compatible !== undefined 
                  ? providerData.openai_compatible 
                  : (providerData.openaiCompatible !== undefined 
                    ? providerData.openaiCompatible 
                    : mergedConfigs[providerName].openaiCompatible)
              };
              console.log(`🔄 最终${providerName}的openaiCompatible值:`, mergedConfigs[providerName].openaiCompatible);
            }
          });
          
          console.log('✅ 配置加载成功:', mergedConfigs);
          return mergedConfigs;
        });
        
        // 重置更改状态，因为刚加载的配置就是最新的
        setHasChanges(false);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 获取模型描述和能力
  const getModelDescription = (modelId) => {
    const descriptions = {
      // OpenAI 模型
      'gpt-4o': '🚀 最新的GPT-4 Omni模型 | 多模态：文本+图像+音频 | 128K上下文 | 推理能力强',
      'gpt-4o-mini': '⚡ GPT-4o轻量版 | 快速响应 | 经济实惠 | 128K上下文 | 适合日常对话',
      'gpt-4-turbo': '🔥 GPT-4 Turbo | 128K上下文 | 高性能推理 | 支持函数调用',
      'gpt-4': '💎 经典GPT-4 | 8K上下文 | 强大推理 | 复杂任务处理',
      'gpt-3.5-turbo': '💨 快速对话模型 | 16K上下文 | 高性价比 | 适合聊天应用',
      'o1-preview': '🧠 推理专家模型 | 复杂问题解决 | 数学和科学推理 | 预览版',
      'o1-mini': '🧮 轻量推理模型 | 快速推理 | 编程和数学 | 经济版',
      'gpt-4-vision-preview': '👁️ 视觉理解 | 图像分析 | 多模态交互 | 预览版',
      
      // Anthropic Claude 模型
      'claude-3-5-sonnet-20241022': '🎯 Claude 3.5 Sonnet | 200K上下文 | 平衡性能 | 代码生成专家',
      'claude-3-5-haiku-20241022': '🌸 Claude 3.5 Haiku | 快速响应 | 轻量级 | 高效处理',
      'claude-3-opus-20240229': '🎭 Claude 3 Opus | 最强推理 | 200K上下文 | 复杂任务专家',
      'claude-3-sonnet-20240229': '🎼 Claude 3 Sonnet | 平衡性能 | 200K上下文 | 通用能力强',
      'claude-3-haiku-20240307': '🍃 Claude 3 Haiku | 快速轻量 | 经济实惠 | 日常对话',
      
      // Google Gemini 模型
      'gemini-1.5-pro': '💫 Gemini 1.5 Pro | 2M上下文 | 多模态 | 长文档处理专家',
      'gemini-1.5-flash': '⚡ Gemini 1.5 Flash | 1M上下文 | 快速响应 | 高效多模态',
      'gemini-1.0-pro': '🌟 Gemini 1.0 Pro | 32K上下文 | 稳定可靠 | 通用对话',
      'gemini-1.5-pro-vision': '👀 Gemini 1.5 Pro Vision | 图像理解 | 视觉分析专家',
      'gemini-1.5-flash-8b': '🚀 Gemini 1.5 Flash 8B | 轻量快速 | 经济高效',
      
      // DeepSeek 模型
      'deepseek-chat': '🤖 DeepSeek Chat | 通用对话 | 中英双语 | 代码理解',
      'deepseek-coder': '💻 DeepSeek Coder | 代码专家 | 编程助手 | 多语言支持',
      'deepseek-reasoner': '🧠 DeepSeek Reasoner | 推理专家 | 逻辑分析 | 问题解决',
      
      // GLM 智谱AI 模型
      'glm-4.5': '👑 GLM-4.5 旗舰 | 355B参数 | 最强推理 | 多模态能力',
      'glm-4.5-x': '⚡ GLM-4.5-X 极速 | 高性能 | 快速响应 | 平衡性价比',
      'glm-4.5-air': '☁️ GLM-4.5-Air | 106B参数 | 高性价比 | 强劲性能',
      'glm-4.5-flash': '💨 GLM-4.5-Flash | 超快响应 | 轻量高效 | 日常使用',
      'glm-4.5-long': '📚 GLM-4.5-Long | 长上下文 | 文档处理 | 深度分析',
      'glm-4.5-air-long': '📖 GLM-4.5-Air-Long | 长文本 | 经济版 | 文档理解',
      'glm-4-plus': '➕ GLM-4-Plus | 增强版 | 全能助手 | 稳定可靠',
      'glm-4-0520': '🗓️ GLM-4-0520 | 特定版本 | 稳定性能 | 企业级',
      'glm-4-long': '📄 GLM-4-Long | 长上下文 | 文档分析 | 深度理解',
      'glm-4-airx': '🌪️ GLM-4-AirX | 轻量增强 | 快速处理 | 高效能',
      'glm-4-air': '🌬️ GLM-4-Air | 轻量版 | 经济实惠 | 日常对话',
      'glm-4-flashx': '⚡ GLM-4-FlashX | 超快版 | 即时响应 | 轻量应用',
      'glm-4-flash': '💫 GLM-4-Flash | 快速版 | 高效处理 | 实时交互',
      
      // Qwen 通义千问 模型
      'qwen-plus': '➕ 通义千问Plus | 平衡性能 | 中英双语 | 通用能力强',
      'qwen-turbo': '🚀 通义千问Turbo | 快速响应 | 高效处理 | 经济实惠',
      'qwen-max': '👑 通义千问Max | 最强版本 | 复杂推理 | 专业能力',
      'qwen-long': '📚 通义千问Long | 长上下文 | 文档处理 | 深度分析',
      'qwen2.5-72b-instruct': '🎯 Qwen2.5-72B | 指令调优 | 强大推理 | 多任务处理',
      'qwen2.5-32b-instruct': '⚡ Qwen2.5-32B | 平衡版本 | 高效能 | 通用助手',
      'qwen2.5-14b-instruct': '💨 Qwen2.5-14B | 轻量版 | 快速响应 | 日常使用',
      
      // Moonshot 月之暗面 模型
      'moonshot-v1-8k': '🌙 Moonshot 8K | 8K上下文 | 对话专家 | 中文优化',
      'moonshot-v1-32k': '🌕 Moonshot 32K | 32K上下文 | 长对话 | 深度交互',
      'moonshot-v1-128k': '🌝 Moonshot 128K | 128K上下文 | 超长文本 | 文档分析',
      
      // Meta Llama 模型
      'llama-3.1-405b-instruct': '🦙 Llama 3.1-405B | 超大模型 | 最强开源 | 指令调优',
      'llama-3.1-70b-instruct': '🔥 Llama 3.1-70B | 高性能 | 开源领先 | 多语言支持',
      'llama-3.1-8b-instruct': '⚡ Llama 3.1-8B | 轻量高效 | 快速部署 | 边缘计算',
      'llama-3.2-90b-vision-instruct': '👁️ Llama 3.2-90B Vision | 视觉理解 | 多模态 | 图像分析',
      'llama-3.2-11b-vision-instruct': '📷 Llama 3.2-11B Vision | 轻量视觉 | 图像处理 | 高效能',
      'llama-3.2-3b-instruct': '💨 Llama 3.2-3B | 超轻量 | 快速响应 | 移动端优化',
      
      // OpenRouter 免费推理模型
      'deepseek/deepseek-r1:free': '🆓🧠 DeepSeek R1 (免费) | 163K上下文 | 开源推理专家 | 媲美OpenAI o1',
      'deepseek/deepseek-chat-v3.1:free': '🆓💬 DeepSeek Chat V3.1 (免费) | 32K上下文 | 最新对话模型 | 中英双语',
      'deepseek/deepseek-chat-v3-0324:free': '🆓💬 DeepSeek Chat V3-0324 (免费) | 32K上下文 | 稳定版本 | 高质量对话',
      'deepseek/deepseek-r1-0528:free': '🆓🧠 DeepSeek R1-0528 (免费) | 163K上下文 | 优化版推理模型',

      'openai/gpt-oss-120b:free': '🆓🔓 GPT-OSS 120B (免费) | 开源GPT | 1200亿参数 | 社区维护',
      'openai/gpt-oss-20b:free': '🆓🔓 GPT-OSS 20B (免费) | 开源GPT | 200亿参数 | 轻量版本',
      'z-ai/glm-4.5-air:free': '🆓🌟 GLM-4.5 Air (免费) | 智谱AI | 轻量版本 | 快速响应',
      'moonshotai/kimi-k2:free': '🆓🌙 Kimi K2 (免费) | 月之暗面 | 长上下文 | 中文优化',
      'moonshotai/kimi-dev-72b:free': '🆓🌙 Kimi Dev 72B (免费) | 月之暗面 | 720亿参数 | 开发专用',
      'qwen/qwen2.5-vl-32b-instruct:free': '🆓👁️ Qwen2.5 VL 32B (免费) | 多模态模型 | 视觉理解 | 指令优化',
      'qwen/qwq-32b:free': '🆓🤔 Qwen QwQ-32B (免费) | 32K上下文 | 推理专用模型 | 困难问题专家',
      
      // OpenRouter 免费通用模型
      'qwen/qwen3-8b:free': '🆓⚡ Qwen3-8B (免费) | 40K上下文 | 82亿参数 | 推理对话双模式',
      'qwen/qwen3-30b-a3b:free': '🆓🚀 Qwen3-30B-A3B (免费) | 40K上下文 | 305亿参数MoE | 激活33亿',
      'qwen/qwen3-235b-a22b:free': '🆓👑 Qwen3-235B-A22B (免费) | 131K上下文 | 2350亿参数MoE | 顶级推理',
      
      // OpenRouter 免费编程模型
      'cognitivecomputations/dolphin3.0-mistral-24b:free': '🆓💻 Dolphin3.0-Mistral-24B (免费) | 32K上下文 | 编程数学专家',
      'mistralai/devstral-small-2505:free': '🆓🔧 Devstral-Small-2505 (免费) | 32K上下文 | 软件工程优化',
      
      // OpenRouter 免费多模态模型
      'google/gemma-3n-e4b-it:free': '🆓👁️ Gemma-3n-E4B (免费) | 8K上下文 | 多模态输入 | 移动优化',
      
      // OpenRouter 付费模型
      'openai/gpt-4o': '🔗💰 OpenRouter GPT-4o | 通过OpenRouter访问 | 多模态能力',
      'openai/gpt-4o-mini': '🔗💰 OpenRouter GPT-4o-mini | 经济版本 | 快速响应',
      'openai/gpt-3.5-turbo': '🔗💰 OpenRouter GPT-3.5 | 经典对话模型 | 高性价比',
      'anthropic/claude-3-5-sonnet': '🔗💰 OpenRouter Claude-3.5 | 强大推理 | 代码专家',
      'anthropic/claude-3-haiku': '🔗💰 OpenRouter Claude-3 Haiku | 快速轻量 | 经济实惠',
      
      // ModelScope 魔搭社区 模型
      'baichuan2-13b-chat': '🐉 百川2-13B | 中文优化 | 对话专家 | 国产模型',
      
      // Hugging Face 模型
      'microsoft/DialoGPT-medium': '💬 DialoGPT Medium | 对话生成 | 开源模型 | 研究用途',
      'microsoft/DialoGPT-large': '💬 DialoGPT Large | 大型对话 | 更强能力 | 研究级别',
      'facebook/blenderbot-400M-distill': '🤖 BlenderBot 400M | Facebook模型 | 轻量对话',
      'microsoft/GODEL-v1_1-base-seq2seq': '🔄 GODEL v1.1 | 序列到序列 | 任务导向对话'
    };
    return descriptions[modelId] || '📝 暂无详细描述 | 请查看提供商文档了解更多信息';
  };

  // 获取提供商的可用模型列表
  const getAvailableModelsForProvider = (providerKey: string): string[] => {
    const predefinedModels: { [key: string]: string[] } = {
      deepseek: ['deepseek-chat', 'deepseek-coder'],
      glm: ['glm-4.5', 'glm-4.5-flash', 'glm-4'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      openrouter: [
        // 免费推理模型
        'deepseek/deepseek-r1:free',
        'deepseek/deepseek-r1-0528:free', 
        'qwen/qwq-32b:free',
        // 免费通用模型
        'qwen/qwen3-8b:free',
        'qwen/qwen3-30b-a3b:free',
        'qwen/qwen3-235b-a22b:free',
        // 免费编程模型
        'cognitivecomputations/dolphin3.0-mistral-24b:free',
        'mistralai/devstral-small-2505:free',
        // 免费多模态模型
        'google/gemma-3n-e4b-it:free',
        // 付费热门模型
        'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-3.5-turbo',
        'anthropic/claude-3-5-sonnet', 'anthropic/claude-3-haiku'
      ],
      qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
      moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      google: ['gemini-1.5-pro'],
      meta: ['llama-3.1-70b-instruct'],
      together: ['llama-3.1-70b-instruct'],
      groq: ['llama-3.1-70b-instruct'],
      modelscope: ['qwen-plus'],
      huggingface: ['microsoft/DialoGPT-medium']
    };

    return predefinedModels[providerKey] || [];
  };

  // 渲染统一的提供商配置
  const renderUnifiedProvidersTab = () => {
    // 所有提供商配置，去重并整理
    const allProviders = [
      'openai', 'anthropic', 'google', 'deepseek', 'glm', 
      'qwen', 'moonshot', 'meta', 'openrouter', 'modelscope', 'huggingface'
    ];
    
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          统一的模型提供商配置，支持官方SDK、OpenAI兼容接口和聚合平台。启用所需的提供商并配置API密钥即可使用。
        </Alert>

        {allProviders.map((provider) => {
          const config = providerConfigs[provider];
          const providerNames = {
            openai: 'OpenAI',
            anthropic: 'Anthropic Claude',
            google: 'Google Gemini',
            deepseek: 'DeepSeek',
            glm: 'GLM (智谱AI)',
            qwen: 'Qwen (通义千问)',
            moonshot: 'Moonshot (月之暗面)',
            meta: 'Meta Llama',
            openrouter: 'OpenRouter',
            modelscope: 'ModelScope (魔搭社区)',
            huggingface: 'Hugging Face'
          };

          const providerTypes = {
            openai: '官方SDK',
            anthropic: '官方SDK',
            google: '官方SDK',
            deepseek: '官方SDK / OpenAI兼容',
            glm: '官方SDK / OpenAI兼容',
            qwen: 'OpenAI兼容',
            moonshot: 'OpenAI兼容',
            meta: 'OpenAI兼容',
            openrouter: '聚合平台',
            modelscope: '聚合平台',
            huggingface: '聚合平台'
          };

          return (
            <Box key={provider} sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
                    {providerNames[provider]}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-color)', opacity: 0.7 }}>
                      {providerTypes[provider]}
                    </Typography>
                    {/* 只有支持OpenAI兼容的提供商才显示开关 */}
                    {providerTypes[provider].includes('OpenAI兼容') && (
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={config?.openaiCompatible || false}
                            onChange={(e) => {
                                updateProviderConfig(provider, 'openaiCompatible', e.target.checked);
                                // 强制设置 hasChanges 为 true
                                setHasChanges(true);
                              }}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#00e5ff !important',
                                transform: 'translateX(16px)',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#00e5ff !important',
                                opacity: 0.5,
                              },
                              '& .MuiSwitch-track': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                opacity: 1,
                              },
                              '& .MuiSwitch-thumb': {
                                backgroundColor: config?.openaiCompatible ? '#00e5ff' : '#ffffff',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                              },
                            }}
                          />
                        }
                        label={
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.7rem',
                              color: config?.openaiCompatible ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              fontWeight: config?.openaiCompatible ? 'bold' : 'normal'
                            }}
                          >
                            OpenAI兼容模式
                          </Typography>
                        }
                        sx={{ ml: 1, mr: 0 }}
                      />
                    )}
                  </Box>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.enabled || false}
                      onChange={(e) => {
                        console.log(`🔘 ${provider} 启用状态变更:`, e.target.checked);
                        updateProviderConfig(provider, 'enabled', e.target.checked);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="启用"
                />
              </Box>
              
              {config?.enabled && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>API Key</Typography>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config?.apiKey || ''}
                        onChange={(e) => {
                          console.log('🎯 输入框onChange触发:', e.target.value);
                          updateProviderConfig(provider, 'apiKey', e.target.value);
                          // 强制设置 hasChanges 为 true
                          setHasChanges(true);
                        }}
                        placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'API Key'}
                        style={{
                          width: '100%',
                          padding: '8px 40px 8px 8px',
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          border: '1px solid rgba(0, 229, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'var(--text-color)'
                        }}
                      />
                      <IconButton
                        onClick={() => toggleApiKeyVisibility(provider)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: '8px',
                          color: 'var(--primary-color)',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 229, 255, 0.1)',
                          },
                        }}
                      >
                        {showApiKeys[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Base URL</Typography>
                    <input
                      type="text"
                      value={config?.baseUrl || providerConfigs[provider]?.baseUrl || ''}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'baseUrl', e.target.value);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'rgba(0, 229, 255, 0.05)',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'var(--text-color)'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>默认模型</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={config?.defaultModel || providerConfigs[provider]?.defaultModel || ''}
                        onChange={(e) => {
                          updateProviderConfig(provider, 'defaultModel', e.target.value);
                          // 强制设置 hasChanges 为 true
                          setHasChanges(true);
                        }}
                        sx={{
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 229, 255, 0.2)',
                          },
                        }}
                      >
                        {getAvailableModelsForProvider(provider).map((model) => (
                          <MenuItem key={model} value={model}>
                            <Box>
                              <Typography variant="body2">{model}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {getModelDescription(model)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>启用的模型</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {getAvailableModelsForProvider(provider).map((model) => (
                        <FormControlLabel
                          key={model}
                          control={
                            <Switch
                              size="small"
                              checked={(config?.enabledModels || providerConfigs[provider]?.enabledModels || []).includes(model)}
                              onChange={(e) => {
                                const currentModels = config?.enabledModels || providerConfigs[provider]?.enabledModels || [];
                                const newModels = e.target.checked
                                  ? [...currentModels, model]
                                  : currentModels.filter(m => m !== model);
                                updateProviderConfig(provider, 'enabledModels', newModels);
                                // 强制设置 hasChanges 为 true
                                setHasChanges(true);
                              }}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#00e5ff !important',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#00e5ff !important',
                                  opacity: 0.5,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.7rem',
                                color: (config?.enabledModels || providerConfigs[provider]?.enabledModels || []).includes(model) ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              }}
                            >
                              {model}
                            </Typography>
                          }
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TestIcon />}
                      onClick={() => testConnection(provider)}
                      disabled={testing[provider] || !(config?.apiKey || config?.hasApiKey)}
                      sx={{
                        borderColor: 'var(--primary-color)',
                        color: 'var(--primary-color)',
                        '&:hover': {
                          borderColor: 'var(--primary-color)',
                          backgroundColor: 'rgba(0, 229, 255, 0.1)',
                        },
                      }}
                    >
                      {testing[provider] ? '测试中...' : '测试连接'}
                    </Button>
                    
                    {testResults[provider] && (
                      <Chip
                        icon={
                          testResults[provider].success ? <SuccessIcon /> : 
                          testResults[provider].developmentMode ? <TestIcon /> : <ErrorIcon />
                        }
                        label={testResults[provider].message}
                        color={
                          testResults[provider].success ? 'success' : 
                          testResults[provider].developmentMode ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    )}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // 渲染官方SDK选项卡（保留用于兼容性）
  const renderOfficialSDKTab = () => {
    const officialProviders = ['openai', 'anthropic', 'google', 'deepseek', 'glm', 'openrouter'];
    
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          使用各提供商的官方SDK连接，享受最佳的兼容性和性能。
        </Alert>

        {officialProviders.map((provider) => {
          const config = providerConfigs[provider];
          const providerNames = {
            openai: 'OpenAI',
            anthropic: 'Anthropic Claude',
            google: 'Google Gemini',
            deepseek: 'DeepSeek',
            glm: 'GLM (智谱AI)',
            openrouter: 'OpenRouter'
          };

          return (
            <Box key={provider} sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
                  {providerNames[provider]}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.enabled || false}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'enabled', e.target.checked);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="启用"
                />
              </Box>
              
              {config?.enabled && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>API Key</Typography>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config?.apiKey || ''}
                        onChange={(e) => updateProviderConfig(provider, 'apiKey', e.target.value)}
                        placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'API Key'}
                        style={{
                          width: '100%',
                          padding: '8px 40px 8px 8px',
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          border: '1px solid rgba(0, 229, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'var(--text-color)'
                        }}
                      />
                      <IconButton
                        onClick={() => toggleApiKeyVisibility(provider)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: '8px',
                          color: 'var(--primary-color)',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 229, 255, 0.1)',
                          },
                        }}
                      >
                        {showApiKeys[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Base URL</Typography>
                    <input
                      type="text"
                      value={config?.baseUrl || ''}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'baseUrl', e.target.value);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'rgba(0, 229, 255, 0.05)',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'var(--text-color)'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>默认模型</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={config?.defaultModel || ''}
                        onChange={(e) => {
                          updateProviderConfig(provider, 'defaultModel', e.target.value);
                          // 强制设置 hasChanges 为 true
                          setHasChanges(true);
                        }}
                        sx={{
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 229, 255, 0.2)',
                          },
                        }}
                      >
                        {getAvailableModelsForProvider(provider).map((model) => (
                          <MenuItem key={model} value={model}>
                            <Box>
                              <Typography variant="body2">{model}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {getModelDescription(model)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>启用的模型</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {getAvailableModelsForProvider(provider).map((model) => (
                        <FormControlLabel
                          key={model}
                          control={
                            <Switch
                              size="small"
                              checked={(config?.enabledModels || []).includes(model)}
                              onChange={(e) => {
                                const currentModels = config?.enabledModels || [];
                                const newModels = e.target.checked
                                  ? [...currentModels, model]
                                  : currentModels.filter(m => m !== model);
                                updateProviderConfig(provider, 'enabledModels', newModels);
                                // 强制设置 hasChanges 为 true
                                setHasChanges(true);
                              }}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#00e5ff !important',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#00e5ff !important',
                                  opacity: 0.5,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.7rem',
                                color: (config?.enabledModels || []).includes(model) ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              }}
                            >
                              {model}
                            </Typography>
                          }
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TestIcon />}
                      onClick={() => testConnection(provider)}
                      disabled={testing[provider] || !(config?.apiKey || config?.hasApiKey)}
                      sx={{
                        borderColor: 'var(--primary-color)',
                        color: 'var(--primary-color)',
                        '&:hover': {
                          borderColor: 'var(--primary-color)',
                          backgroundColor: 'rgba(0, 229, 255, 0.1)',
                        },
                      }}
                    >
                      {testing[provider] ? '测试中...' : '测试连接'}
                    </Button>
                    
                    {testResults[provider] && (
                      <Chip
                        icon={testResults[provider].success ? <SuccessIcon /> : <ErrorIcon />}
                        label={testResults[provider].message}
                        color={testResults[provider].success ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // 渲染OpenAI兼容接口选项卡
  const renderOpenAICompatibleTab = () => {
    const compatibleProviders = ['deepseek', 'glm', 'qwen', 'moonshot', 'meta', 'openrouter'];
    
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          使用OpenAI兼容的API接口连接各种模型，享受统一的接口体验。
        </Alert>

        {compatibleProviders.map((provider) => {
          const config = providerConfigs[provider];
          const providerNames = {
            deepseek: 'DeepSeek (OpenAI兼容)',
            glm: 'GLM (OpenAI兼容)',
            qwen: 'Qwen (通义千问)',
            moonshot: 'Moonshot (月之暗面)',
            meta: 'Meta Llama',
            openrouter: 'OpenRouter (兼容模式)'
          };

          return (
            <Box key={provider} sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
                  {providerNames[provider]}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.enabled || false}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'enabled', e.target.checked);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="启用"
                />
              </Box>
              
              {config?.enabled && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>API Key</Typography>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config?.apiKey || ''}
                        onChange={(e) => updateProviderConfig(provider, 'apiKey', e.target.value)}
                        placeholder="API Key"
                        style={{
                          width: '100%',
                          padding: '8px 40px 8px 8px',
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          border: '1px solid rgba(0, 229, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'var(--text-color)'
                        }}
                      />
                      <IconButton
                        onClick={() => toggleApiKeyVisibility(provider)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: '8px',
                          color: 'var(--primary-color)',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 229, 255, 0.1)',
                          },
                        }}
                      >
                        {showApiKeys[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Base URL</Typography>
                    <input
                      type="text"
                      value={config?.baseUrl || ''}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'baseUrl', e.target.value);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'rgba(0, 229, 255, 0.05)',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'var(--text-color)'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>默认模型</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={config?.defaultModel || ''}
                        onChange={(e) => {
                          updateProviderConfig(provider, 'defaultModel', e.target.value);
                          // 强制设置 hasChanges 为 true
                          setHasChanges(true);
                        }}
                        sx={{
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 229, 255, 0.2)',
                          },
                        }}
                      >
                        {getAvailableModelsForProvider(provider).map((model) => (
                          <MenuItem key={model} value={model}>
                            <Box>
                              <Typography variant="body2">{model}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {getModelDescription(model)}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>启用的模型</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {getAvailableModelsForProvider(provider).map((model) => (
                        <FormControlLabel
                          key={model}
                          control={
                            <Switch
                              size="small"
                              checked={(config?.enabledModels || []).includes(model)}
                              onChange={(e) => {
                                const currentModels = config?.enabledModels || [];
                                const newModels = e.target.checked
                                  ? [...currentModels, model]
                                  : currentModels.filter(m => m !== model);
                                updateProviderConfig(provider, 'enabledModels', newModels);
                                // 强制设置 hasChanges 为 true
                                setHasChanges(true);
                              }}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#00e5ff !important',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#00e5ff !important',
                                  opacity: 0.5,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.7rem',
                                color: (config?.enabledModels || []).includes(model) ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                              }}
                            >
                              {model}
                            </Typography>
                          }
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TestIcon />}
                      onClick={() => testConnection(provider)}
                      disabled={testing[provider] || !(config?.apiKey || config?.hasApiKey)}
                      sx={{
                        borderColor: 'var(--primary-color)',
                        color: 'var(--primary-color)',
                        '&:hover': {
                          borderColor: 'var(--primary-color)',
                          backgroundColor: 'rgba(0, 229, 255, 0.1)',
                        },
                      }}
                    >
                      {testing[provider] ? '测试中...' : '测试连接'}
                    </Button>
                    
                    {testResults[provider] && (
                      <Chip
                        icon={testResults[provider].success ? <SuccessIcon /> : <ErrorIcon />}
                        label={testResults[provider].message}
                        color={testResults[provider].success ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // 渲染聚合平台选项卡
  const renderAggregationTab = () => {
    const aggregationProviders = ['modelscope', 'huggingface'];
    
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          通过聚合平台访问多种模型，一个接口调用多个提供商的服务。
        </Alert>

        {aggregationProviders.map((provider) => {
          const config = providerConfigs[provider];
          const providerNames = {
            modelscope: 'ModelScope (魔搭社区)',
            huggingface: 'Hugging Face'
          };

          return (
            <Box key={provider} sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'var(--primary-color)' }}>
                  {providerNames[provider]}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config?.enabled || false}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'enabled', e.target.checked);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="启用"
                />
              </Box>
              
              {config?.enabled && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>API Key</Typography>
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config?.apiKey || ''}
                        onChange={(e) => updateProviderConfig(provider, 'apiKey', e.target.value)}
                        placeholder="API Key"
                        style={{
                          width: '100%',
                          padding: '8px 40px 8px 8px',
                          backgroundColor: 'rgba(0, 229, 255, 0.05)',
                          border: '1px solid rgba(0, 229, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'var(--text-color)'
                        }}
                      />
                      <IconButton
                        onClick={() => toggleApiKeyVisibility(provider)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: '8px',
                          color: 'var(--primary-color)',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 229, 255, 0.1)',
                          },
                        }}
                      >
                        {showApiKeys[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Base URL</Typography>
                    <input
                      type="text"
                      value={config?.baseUrl || ''}
                      onChange={(e) => {
                        updateProviderConfig(provider, 'baseUrl', e.target.value);
                        // 强制设置 hasChanges 为 true
                        setHasChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'rgba(0, 229, 255, 0.05)',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'var(--text-color)'
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TestIcon />}
                      onClick={() => testConnection(provider)}
                      disabled={testing[provider] || !(config?.apiKey || config?.hasApiKey)}
                      sx={{
                        borderColor: 'var(--primary-color)',
                        color: 'var(--primary-color)',
                        '&:hover': {
                          borderColor: 'var(--primary-color)',
                          backgroundColor: 'rgba(0, 229, 255, 0.1)',
                        },
                      }}
                    >
                      {testing[provider] ? '测试中...' : '测试连接'}
                    </Button>
                    
                    {testResults[provider] && (
                      <Chip
                        icon={testResults[provider].success ? <SuccessIcon /> : <ErrorIcon />}
                        label={testResults[provider].message}
                        color={testResults[provider].success ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // 渲染群聊设置选项卡
  const renderGroupChatTab = () => {
    return (
      <Box sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center'
      }}>
        {/* 主要图标 */}
        <Box sx={{ 
          mb: 3,
          p: 3,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1), rgba(0, 229, 255, 0.05))',
          border: '2px solid rgba(0, 229, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <GroupIcon sx={{ 
            fontSize: '48px', 
            color: 'var(--primary-color)',
            filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.5))'
          }} />
        </Box>

        {/* 标题 */}
        <Typography variant="h4" sx={{ 
          mb: 2, 
          color: 'var(--primary-color)',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(0, 229, 255, 0.5)'
        }}>
          群聊配置
        </Typography>

        {/* 主要提示信息 */}
        <Typography variant="h6" sx={{ 
          mb: 3, 
          color: '#ffaa00',
          fontWeight: 'bold',
          fontSize: '20px'
        }}>
          🚧 开发中，敬请期待 🚧
        </Typography>

        {/* 详细说明 */}
        <Box sx={{ 
          maxWidth: '500px',
          p: 3,
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.05), rgba(0, 229, 255, 0.02))',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '12px',
          mb: 3
        }}>
          <Typography variant="body1" sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: 1.6,
            mb: 2
          }}>
            多智能体群聊功能正在紧张开发中，将为您带来：
          </Typography>
          
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#00ff88', marginRight: '8px' }}>✨</span>
              多个AI智能体协作对话
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#00ff88', marginRight: '8px' }}>✨</span>
              不同角色的专业化分工
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#00ff88', marginRight: '8px' }}>✨</span>
              复杂任务的智能分解与协作
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ color: '#00ff88', marginRight: '8px' }}>✨</span>
              更高效的问题解决方案
            </Typography>
          </Box>
        </Box>

        {/* 进度提示 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          p: 2,
          background: 'rgba(255, 170, 0, 0.1)',
          border: '1px solid rgba(255, 170, 0, 0.3)',
          borderRadius: '8px'
        }}>
          <Box sx={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ffaa00',
            animation: 'pulse 2s infinite'
          }} />
          <Typography variant="body2" sx={{ 
            color: '#ffaa00',
            fontWeight: 'bold'
          }}>
            预计在下个版本中发布，请关注更新
          </Typography>
        </Box>
      </Box>
    );
  };

  // 组件初始化
  useEffect(() => {
    if (open || embedded) {
      loadConfigs();
    }
  }, [open, embedded]);

  // 健壮配置架构：移除localStorage依赖，标签页状态仅在会话期间保持
  // 这符合新架构的设计理念：后端为权威源，前端不持久化状态

  // 处理保存
  const handleSave = async () => {
    await saveConfigs();
    
    // 保存群聊设置
    dispatch(setGroupChatSettings(localGroupChatSettings));
    
    if (!embedded) {
      onClose();
    }
  };

  if (embedded) {
    return (
      <Box sx={{ width: '100%', height: '100%' }}>
        <Tabs
          value={mainTab}
          onChange={(e, newValue) => setMainTab(newValue)}
          sx={{
            borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
            '& .MuiTab-root': {
              color: 'var(--text-color)',
              '&.Mui-selected': {
                color: 'var(--primary-color)',
              },
            },
          }}
        >
          <Tab icon={<SingleChatIcon />} label="单聊配置" />
          <Tab icon={<GroupChatIcon />} label="群聊配置" />
        </Tabs>

        {mainTab === 0 && renderUnifiedProvidersTab()}
        
        {mainTab === 1 && renderGroupChatTab()}


      </Box>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--background-color)',
          color: 'var(--text-color)',
          border: '1px solid var(--primary-color)',
          borderRadius: '12px',
          transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
          height: '80vh',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: 'var(--primary-color)',
          color: 'var(--background-color)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragOffset({
            x: e.clientX - dialogPosition.x,
            y: e.clientY - dialogPosition.y,
          });
        }}
      >
        提供商设置
        <IconButton
          onClick={onClose}
          sx={{
            color: 'var(--background-color)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 0, 
        flex: 1, 
        overflow: 'auto',
        maxHeight: 'calc(80vh - 120px)' // 减去标题和底部按钮的高度
      }}>
        <Tabs
          value={mainTab}
          onChange={(e, newValue) => setMainTab(newValue)}
          sx={{
            borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
            '& .MuiTab-root': {
              color: 'var(--text-color)',
              '&.Mui-selected': {
                color: 'var(--primary-color)',
              },
            },
          }}
        >
          <Tab icon={<SingleChatIcon />} label="单聊配置" />
          <Tab icon={<GroupChatIcon />} label="群聊配置" />
        </Tabs>

        {mainTab === 0 && renderUnifiedProvidersTab()}
        
        {mainTab === 1 && renderGroupChatTab()}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 229, 255, 0.2)' }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ 
            color: hasChanges ? '#ff4444' : '#666666',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            DEBUG: hasChanges={String(hasChanges)} | renderKey={renderKey} | forceUpdate={forceUpdate}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                color: 'var(--text-color)',
                borderColor: 'var(--text-color)',
              }}
            >
              取消
            </Button>
            
            <Button
                onClick={() => {
                  console.log('🔘 保存按钮被点击，hasChanges:', hasChanges);
                  handleSave();
                }}
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!hasChanges}
                sx={{
                  backgroundColor: hasChanges ? '#ff4444 !important' : '#00ffff !important',
                  color: hasChanges ? '#ffffff !important' : '#000000 !important',
                  fontWeight: hasChanges ? 'bold !important' : 'normal !important',
                  boxShadow: hasChanges ? '0 0 20px rgba(255, 68, 68, 0.8) !important' : '0 0 10px rgba(0, 255, 255, 0.5) !important',
                  transform: hasChanges ? 'scale(1.05) !important' : 'scale(1) !important',
                  '&:hover': {
                    backgroundColor: hasChanges ? '#ff6666 !important' : '#00cccc !important',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#666666 !important',
                    color: 'rgba(255, 255, 255, 0.5) !important',
                  },
                }}
              >
                {hasChanges ? `🚨 保存配置 🚨` : '保存配置'}
              </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ProviderSettings;