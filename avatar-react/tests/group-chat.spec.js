const { test, expect } = require('@playwright/test');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:8000';

test.describe('群聊功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的准备工作
    await page.goto(`${BASE_URL}/group-chat`);
  });

  test('TC001: 群聊页面加载测试', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/群聊|Group Chat/);
    
    // 检查模型选择对话框是否自动弹出
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // 检查对话框标题
    const dialogTitle = page.locator('h2:has-text("选择群聊参与的大模型")');
    await expect(dialogTitle).toBeVisible();
    
    // 检查是否有可用模型列表
    const modelCards = page.locator('[data-testid="model-card"]');
    await expect(modelCards.first()).toBeVisible();
  });

  test('TC002: 模型选择功能测试', async ({ page }) => {
    // 等待对话框加载
    await page.waitForSelector('[role="dialog"]');
    
    // 选择至少2个模型
    const modelCards = page.locator('[data-testid="model-card"]');
    const count = await modelCards.count();
    
    if (count >= 2) {
      await modelCards.nth(0).click();
      await modelCards.nth(1).click();
      
      // 检查选中状态
      await expect(modelCards.nth(0)).toHaveClass(/selected/);
      await expect(modelCards.nth(1)).toHaveClass(/selected/);
      
      // 检查开始群聊按钮状态
      const startButton = page.locator('button:has-text("开始群聊")');
      await expect(startButton).toBeEnabled();
      await expect(startButton).toContainText('2 个模型');
    }
  });

  test('TC003: 系统提示词配置测试', async ({ page }) => {
    await page.waitForSelector('[role="dialog"]');
    
    // 选择模型
    const modelCards = page.locator('[data-testid="model-card"]');
    await modelCards.first().click();
    
    // 测试统一配置模式
    const unifiedRadio = page.locator('input[value="unified"]');
    await unifiedRadio.click();
    
    const unifiedPrompt = page.locator('textarea[label*="统一系统提示词"]');
    await expect(unifiedPrompt).toBeVisible();
    await unifiedPrompt.fill('测试统一提示词');
    
    // 切换到个性化配置模式
    const individualRadio = page.locator('input[value="individual"]');
    await individualRadio.click();
    
    // 检查个性化输入框
    const individualPrompts = page.locator('textarea[label*="系统提示词"]');
    await expect(individualPrompts.first()).toBeVisible();
  });

  test('TC004: WebSocket连接建立测试', async ({ page }) => {
    await page.waitForSelector('[role="dialog"]');
    
    // 选择模型并开始群聊
    const modelCards = page.locator('[data-testid="model-card"]');
    await modelCards.first().click();
    
    const startButton = page.locator('button:has-text("开始群聊")');
    await startButton.click();
    
    // 等待对话框关闭
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // 检查群聊界面是否显示
    const chatInterface = page.locator('[data-testid="group-chat-interface"]');
    await expect(chatInterface).toBeVisible();
    
    // 检查是否没有连接断开警告
    const disconnectWarning = page.locator('text=WebSocket连接已断开');
    await expect(disconnectWarning).not.toBeVisible();
  });

  test('TC005: 消息发送测试', async ({ page }) => {
    // 完成初始化
    await setupGroupChat(page);
    
    // 发送测试消息
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    const testMessage = '你好，请介绍一下你们自己';
    await messageInput.fill(testMessage);
    await sendButton.click();
    
    // 检查消息是否显示在聊天界面
    const userMessage = page.locator(`text=${testMessage}`).first();
    await expect(userMessage).toBeVisible();
    
    // 检查输入框是否清空
    await expect(messageInput).toHaveValue('');
  });

  test('TC006: AI模型响应测试', async ({ page }) => {
    await setupGroupChat(page);
    
    // 发送消息
    await sendMessage(page, '你好');
    
    // 等待AI响应
    await page.waitForTimeout(5000); // 等待响应
    
    // 检查是否有AI响应消息
    const aiMessages = page.locator('[data-testid="ai-message"]');
    await expect(aiMessages.first()).toBeVisible({ timeout: 10000 });
    
    // 检查响应消息是否包含模型名称
    const modelName = page.locator('[data-testid="model-name"]');
    await expect(modelName.first()).toBeVisible();
  });

  test('TC007: 上下文显示测试', async ({ page }) => {
    await setupGroupChat(page);
    
    // 发送消息并等待响应
    await sendMessage(page, '测试上下文');
    await page.waitForTimeout(3000);
    
    // 检查上下文大小显示
    const contextSize = page.locator('text=共享上下文大小');
    await expect(contextSize).toBeVisible();
    
    // 检查模型上下文使用率
    const contextProgress = page.locator('[data-testid="context-progress"]');
    await expect(contextProgress.first()).toBeVisible();
  });

  test('TC008: 模型状态显示测试', async ({ page }) => {
    await setupGroupChat(page);
    
    // 检查模型状态芯片
    const modelChips = page.locator('[data-testid="model-chip"]');
    await expect(modelChips.first()).toBeVisible();
    
    // 发送消息并观察状态变化
    await sendMessage(page, '测试状态');
    
    // 检查处理状态（可能很快，所以用较短的超时）
    await page.waitForTimeout(1000);
  });

  test('TC011: 重新配置功能测试', async ({ page }) => {
    await setupGroupChat(page);
    
    // 点击重新配置按钮
    const reconfigButton = page.locator('button:has-text("重新配置")');
    await reconfigButton.click();
    
    // 检查模型选择对话框是否重新打开
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('TC015: 空消息处理测试', async ({ page }) => {
    await setupGroupChat(page);
    
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // 测试空消息
    await messageInput.fill('');
    await expect(sendButton).toBeDisabled();
    
    // 测试只包含空格的消息
    await messageInput.fill('   ');
    await expect(sendButton).toBeDisabled();
  });

  test('TC016: 特殊字符处理测试', async ({ page }) => {
    await setupGroupChat(page);
    
    // 测试包含特殊字符的消息
    const specialMessage = '测试消息 😊\n换行测试\n特殊字符: @#$%^&*()';
    await sendMessage(page, specialMessage);
    
    // 检查消息是否正确显示
    const messageElement = page.locator(`text=${specialMessage.split('\n')[0]}`);
    await expect(messageElement).toBeVisible();
  });

  test('TC022: 键盘快捷键测试', async ({ page }) => {
    await setupGroupChat(page);
    
    const messageInput = page.locator('[data-testid="message-input"]');
    
    // 测试Enter键发送消息
    await messageInput.fill('Enter键测试');
    await messageInput.press('Enter');
    
    // 检查消息是否发送
    await expect(messageInput).toHaveValue('');
    
    // 测试Shift+Enter换行
    await messageInput.fill('第一行');
    await messageInput.press('Shift+Enter');
    await messageInput.type('第二行');
    
    const value = await messageInput.inputValue();
    expect(value).toContain('\n');
  });
});

// 辅助函数
async function setupGroupChat(page) {
  // 等待对话框加载
  await page.waitForSelector('[role="dialog"]');
  
  // 选择第一个模型
  const modelCards = page.locator('[data-testid="model-card"]');
  await modelCards.first().click();
  
  // 开始群聊
  const startButton = page.locator('button:has-text("开始群聊")');
  await startButton.click();
  
  // 等待群聊界面加载
  await page.waitForSelector('[data-testid="group-chat-interface"]');
}

async function sendMessage(page, message) {
  const messageInput = page.locator('[data-testid="message-input"]');
  const sendButton = page.locator('[data-testid="send-button"]');
  
  await messageInput.fill(message);
  await sendButton.click();
}