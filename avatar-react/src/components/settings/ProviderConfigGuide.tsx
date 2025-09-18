import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Star as StarIcon
} from '@mui/icons-material';

interface ProviderInfo {
  provider: string;
  model: string;
  cost: string;
  speed: string;
  features: string[];
  bestFor: string;
}

const ProviderConfigGuide: React.FC = () => {
  const providerComparison: ProviderInfo[] = [
    {
      provider: 'DeepSeek直连',
      model: 'deepseek-chat',
      cost: '按量付费',
      speed: '快速',
      features: ['官方API', '稳定性高', '完整功能'],
      bestFor: '生产环境使用'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: 'var(--primary-color)', mb: 2 }}>
        📚 Provider配置指南
      </Typography>

      {/* 架构说明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <InfoIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
          <strong>架构说明：</strong>本系统支持同一个AI模型通过不同的API路径访问
        </Typography>
        <Typography variant="body2">
          DeepSeek模型可以通过 <strong>DeepSeek官方API</strong> 进行调用
        </Typography>
      </Alert>

      {/* Provider对比 */}
      <Accordion sx={{ mb: 3, backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            🔄 Provider对比 - 同样的DeepSeek模型，不同的访问方式
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Provider</strong></TableCell>
                  <TableCell><strong>模型名称</strong></TableCell>
                  <TableCell><strong>费用</strong></TableCell>
                  <TableCell><strong>速度</strong></TableCell>
                  <TableCell><strong>特点</strong></TableCell>
                  <TableCell><strong>适用场景</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providerComparison.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.provider}</TableCell>
                    <TableCell>
                      <code style={{ 
                        backgroundColor: 'rgba(0, 229, 255, 0.1)', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {row.model}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={row.cost} 
                        size="small" 
                        color={row.cost === '免费' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{row.speed}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.features.map((feature, i) => (
                          <Chip
                            key={i}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{row.bestFor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* 配置步骤 */}
      <Accordion sx={{ mb: 3, backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            ⚙️ 推荐配置步骤
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pl: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'var(--primary-color)', mb: 2 }}>
              <StarIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              推荐配置：DeepSeek官方API
            </Typography>
            
            <ol style={{ lineHeight: 1.8, marginLeft: 16 }}>
              
              <li>
                <strong>测试连接</strong>
                <ul style={{ marginTop: 4, marginBottom: 8 }}>
                  <li>点击"测试连接"按钮验证配置</li>
                  <li>成功后Provider状态会变为"在线"</li>
                </ul>
              </li>
            </ol>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                🎉 完成后，您就可以免费使用DeepSeek模型进行AI对话了！
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 高级配置 */}
      <Accordion sx={{ backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            🚀 高级用户：DeepSeek直连配置
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              💰 注意：DeepSeek直连需要充值才能使用，但速度更快，稳定性更高
            </Typography>
          </Alert>
          
          <Box sx={{ pl: 2 }}>
            <ol style={{ lineHeight: 1.8, marginLeft: 16 }}>
              <li>
                <strong>注册DeepSeek账户</strong>
                <ul style={{ marginTop: 4, marginBottom: 8 }}>
                  <li>访问 <a href="https://deepseek.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>deepseek.com</a></li>
                  <li>注册账户并进行实名认证</li>
                  <li>充值一定额度（建议20元起）</li>
                </ul>
              </li>
              
              <li>
                <strong>配置OpenAI兼容Provider</strong>
                <ul style={{ marginTop: 4, marginBottom: 8 }}>
                  <li>API Key: DeepSeek提供的sk-开头密钥</li>
                  <li>Base URL: https://api.deepseek.com/v1</li>
                  <li>默认模型: deepseek-chat</li>
                </ul>
              </li>
            </ol>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ProviderConfigGuide;