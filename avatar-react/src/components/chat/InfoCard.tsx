import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  color?: string;
  maxTokens?: number;
  description?: string;
}

interface InfoCardProps {
  model: ModelInfo;
  selected?: boolean;
  onToggle?: () => void;
  variant?: 'selection' | 'display';
}

const InfoCard: React.FC<InfoCardProps> = ({ 
  model, 
  selected = false, 
  onToggle,
  variant = 'display'
}) => {
  const handleClick = () => {
    if (variant === 'selection' && onToggle) {
      onToggle();
    }
  };

  const formatTokens = (tokens?: number): string => {
    if (!tokens) return '未知';
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const getProviderDisplayName = (provider: string): string => {
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'openrouter': 'OpenRouter',
      'ollama': 'Ollama',
      'unknown': '未知'
    };
    return providerNames[provider.toLowerCase()] || provider;
  };

  return (
    <Card
      data-testid="model-card"
      sx={{
        cursor: variant === 'selection' ? 'pointer' : 'default',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: selected ? 'action.selected' : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': variant === 'selection' ? {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: 2
        } : {},
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      className={selected ? 'selected' : ''}
      onClick={handleClick}
    >
      {/* 选择状态指示器 */}
      {variant === 'selection' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
        >
          {selected ? (
            <CheckCircleIcon color="primary" />
          ) : (
            <RadioButtonUncheckedIcon color="action" />
          )}
        </Box>
      )}

      <CardContent sx={{ flex: 1, pb: 1 }}>
        {/* 模型头像和名称 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: model.color || '#6b7280',
              width: 40,
              height: 40,
              mr: 2,
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {model.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {model.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {getProviderDisplayName(model.provider)}
            </Typography>
          </Box>
        </Box>

        {/* 模型描述 */}
        {model.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4
            }}
          >
            {model.description}
          </Typography>
        )}

        {/* 模型规格 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={`上下文: ${formatTokens(model.maxTokens)}`}
            size="small"
            variant="outlined"
            color="primary"
          />
          <Chip
            label={getProviderDisplayName(model.provider)}
            size="small"
            variant="outlined"
            sx={{
              backgroundColor: model.color ? `${model.color}20` : undefined,
              borderColor: model.color || undefined,
              color: model.color || undefined
            }}
          />
        </Box>
      </CardContent>

      {/* 操作区域 */}
      {variant === 'display' && (
        <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
          <Tooltip title="查看详细信息">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      )}
    </Card>
  );
};

export default InfoCard;