import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAppDispatch } from '../hooks/redux';
import { pushCard } from '../store/dynamicCardSlice';
import InfoCardSystem from '../components/cards/InfoCardSystem';

const InfoCardPage: React.FC = () => {
  const { cardType } = useParams<{ cardType: string }>();
  const dispatch = useAppDispatch();
  const [hasTriggered, setHasTriggered] = React.useState(false);

  React.useEffect(() => {
    // 当页面加载时，直接添加对应的信息卡到 Redux store
    // 添加防重复触发机制
    if (cardType && !hasTriggered) {
      console.log('InfoCardPage: 尝试添加信息卡:', cardType);
      dispatch(pushCard({
        cardType: cardType, // 不需要斜杠前缀
        trigger: `新标签页打开: /${cardType}`,
        timestamp: Date.now()
      }));
      setHasTriggered(true);
    }
  }, [cardType, dispatch, hasTriggered]);

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: 2
    }}>
      <Typography variant="h4" sx={{ 
        color: '#39ff14', 
        mb: 3, 
        textAlign: 'center',
        textShadow: '0 0 10px #39ff14'
      }}>
        信息卡 - {cardType}
      </Typography>
      
      <InfoCardSystem />
    </Box>
  );
};

export default InfoCardPage;