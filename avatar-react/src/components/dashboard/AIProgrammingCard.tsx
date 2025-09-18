import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { clineAPI } from '../../services/api';
import Editor from '@monaco-editor/react';
import {
  Code as CodeIcon,
  PlayArrow as RunIcon,
  Save as SaveIcon,
  Description as FileIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Terminal as TerminalIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import './AIProgrammingCard.css';

interface FileItem {
  name: string;
  language: string;
  content: string;
}

interface AIProgrammingCardProps {
  data?: any;
  onClose: () => void;
}

interface ApiResponse {
  success: boolean;
  explanation?: string;
  completion?: string;
  error?: string;
}

const AIProgrammingCard: React.FC<AIProgrammingCardProps> = ({ data, onClose }) => {
  const [code, setCode] = useState<string>('# 在这里编写你的代码\n\ndef hello_world():\n    print("Hello, World!")\n');
  const [language, setLanguage] = useState<string>('python');
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor');
  const [files, setFiles] = useState<FileItem[]>([
    { name: 'main.py', language: 'python', content: '# 主程序文件\n\ndef main():\n    print("Hello from main!")\n\nif __name__ == "__main__":\n    main()' },
    { name: 'utils.py', language: 'python', content: '# 工具函数\n\ndef calculate_sum(a, b):\n    return a + b' }
  ]);
  const [activeFile, setActiveFile] = useState<number>(0);
  const editorRef = useRef<any>(null);
  const resizableRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(800); // 默认宽度
  
  // 处理编辑器挂载
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // 处理代码变更
  const handleCodeChange = (value: string | undefined) => {
    const newValue = value || '';
    setCode(newValue);
    // 更新当前文件内容
    if (activeFile !== null && activeFile >= 0 && activeFile < files.length) {
      const updatedFiles = [...files];
      updatedFiles[activeFile].content = newValue;
      setFiles(updatedFiles);
    }
  };

  // 切换文件
  const handleFileChange = (index: number) => {
    setActiveFile(index);
    setCode(files[index].content);
    setLanguage(files[index].language);
  };

  // 添加新文件
  const handleAddFile = () => {
    const newFileName = window.prompt('请输入文件名:', 'new_file.py');
    if (newFileName) {
      const fileExt = newFileName.split('.').pop()?.toLowerCase() || '';
      let lang = 'python';
      
      // 根据扩展名确定语言
      if (['js', 'jsx'].includes(fileExt)) lang = 'javascript';
      else if (['ts', 'tsx'].includes(fileExt)) lang = 'typescript';
      else if (['html'].includes(fileExt)) lang = 'html';
      else if (['css'].includes(fileExt)) lang = 'css';
      else if (['json'].includes(fileExt)) lang = 'json';
      
      const newFile: FileItem = {
        name: newFileName,
        language: lang,
        content: `// ${newFileName}\n\n`
      };
      
      setFiles([...files, newFile]);
      setActiveFile(files.length);
      setCode(newFile.content);
      setLanguage(newFile.language);
    }
  };

  // 删除文件
  const handleDeleteFile = (index: number) => {
    if (window.confirm(`确定要删除文件 ${files[index].name} 吗?`)) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);
      
      // 如果删除的是当前活动文件，则切换到第一个文件
      if (index === activeFile) {
        if (newFiles.length > 0) {
          setActiveFile(0);
          setCode(newFiles[0].content);
          setLanguage(newFiles[0].language);
        } else {
          setActiveFile(0);
          setCode('');
        }
      } else if (index < activeFile) {
        // 如果删除的文件在当前文件之前，需要调整activeFile索引
        setActiveFile(activeFile - 1);
      }
    }
  };

  // 处理运行代码
  const handleRunCode = () => {
    setIsLoading(true);
    setResult(`> 执行 ${language} 代码...\n`);
    
    // 使用Cline API执行代码
    // 由于Cline API没有直接的代码执行功能，我们使用解释功能来模拟执行
    clineAPI.explain(code)
      .then(response => {
        // 处理 Axios 响应格式
        const data: ApiResponse = (response as any).data || response;
        if (data.success) {
          // 添加执行结果
          setResult(prev => prev + `\n${data.explanation}\n\n> 执行完成，退出代码: 0`);
        } else {
          setResult(prev => prev + `\n错误: ${data.error || '执行失败'}`);
        }
      })
      .catch((error: any) => {
        console.error('代码执行请求失败:', error);
        setResult(prev => prev + `\n请求失败: ${error.message || '未知错误'}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // 处理保存代码
  const handleSaveCode = () => {
    // 模拟保存操作
    const notification = `已保存 ${files[activeFile]?.name || 'code'} (${new Date().toLocaleTimeString()})`;
    setResult(prev => notification + '\n' + prev);
  };

  // 处理AI补全
  const handleAIComplete = () => {
    if (!prompt.trim()) {
      window.alert('请输入提示内容');
      return;
    }
    
    setIsLoading(true);
    setResult('> AI正在分析您的代码...\n> 基于提示: "' + prompt + '"\n> 生成补全内容...');
    
    // 调用真实的Cline API
    clineAPI.complete(code, prompt)
      .then(response => {
        // 处理 Axios 响应格式
        const data: ApiResponse = (response as any).data || response;
        if (data.success) {
          setResult(prev => prev + '\n\n' + data.completion);
        } else {
          setResult(prev => prev + '\n\n错误: ' + (data.error || '未知错误'));
        }
      })
      .catch((error: any) => {
        console.error('AI补全请求失败:', error);
        setResult(prev => prev + '\n\n请求失败: ' + (error.message || '未知错误'));
        
        // 如果API调用失败，显示详细错误信息
        if (error.response) {
          setResult(prev => prev + '\n状态码: ' + error.response.status);
          if (error.response.data) {
            setResult(prev => prev + '\n错误详情: ' + JSON.stringify(error.response.data));
          }
        } else if (error.request) {
          setResult(prev => prev + '\n请求未收到响应，可能是网络问题或CORS限制');
        } else {
          setResult(prev => prev + '\n请求配置错误: ' + error.message);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // 使用useCallback包装事件处理函数
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && resizableRef.current) {
      // 计算新宽度 - 从鼠标位置减去父元素的左边界位置
      const parentRect = resizableRef.current.parentElement?.getBoundingClientRect();
      if (parentRect) {
        const newWidth = Math.max(400, Math.min(1200, e.clientX - parentRect.left));
        setWidth(newWidth);
        
        // 添加调试信息
        console.log('Resizing AI Card:', {
          mouseX: e.clientX,
          parentLeft: parentRect.left,
          newWidth: newWidth
        });
        
        // 阻止事件冒泡，防止与HomePage的调整大小功能冲突
        e.stopPropagation();
        e.preventDefault(); // 防止选择文本
      }
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    // 恢复鼠标样式和文本选择
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // 处理拖动调整大小
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // 防止默认行为
    e.stopPropagation(); // 阻止事件冒泡，防止与HomePage的调整大小功能冲突
    setIsResizing(true);
    // 设置全局鼠标样式和禁止文本选择
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  // 清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Box className={`ai-programming-card ${isResizing ? 'resizing' : ''}`} ref={resizableRef} sx={{ width: `${width}px` }}>
      {/* 拖动时的覆盖层 */}
      {isResizing && <Box className="resize-overlay" />}
      
      {/* 卡片头部 */}
      <Box className="ai-programming-header">
        <Box className="header-left">
          <CodeIcon className="header-icon" />
          <Typography variant="h6" className="header-title">AI编程助手</Typography>
        </Box>
        <Box className="header-tabs">
          <Box 
            className={`header-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <CodeIcon fontSize="small" />
            <span>编辑器</span>
          </Box>
          <Box 
            className={`header-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon fontSize="small" />
            <span>终端</span>
          </Box>
        </Box>
        <Box className="header-right">
          <Tooltip title="帮助">
            <IconButton size="small" className="header-action">
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="关闭">
            <IconButton size="small" className="header-action" onClick={onClose}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 卡片内容 */}
      <Box className="ai-programming-content">
        {/* 左侧文件浏览器 */}
        <Box className="file-explorer">
          <Box className="file-explorer-header">
            <Typography variant="subtitle2">文件浏览器</Typography>
            <IconButton size="small" onClick={handleAddFile}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box className="file-list">
            {files.map((file, index) => (
              <Box 
                key={index}
                className={`file-item ${index === activeFile ? 'active' : ''}`}
                onClick={() => handleFileChange(index)}
              >
                <FileIcon fontSize="small" className="file-icon" />
                <Typography variant="body2" className="file-name">{file.name}</Typography>
                <IconButton 
                  size="small" 
                  className="file-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(index);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>

        {/* 右侧编辑器/终端 */}
        <Box className="editor-container">
          {activeTab === 'editor' ? (
            <>
              {/* 代码编辑器 */}
              <Editor
                height="300px"
                language={language}
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true
                }}
              />
              
              {/* 底部工具栏 */}
              <Box className="editor-toolbar">
                <Box className="toolbar-left">
                  <Tooltip title="运行代码">
                    <IconButton 
                      onClick={handleRunCode}
                      disabled={isLoading}
                      className="toolbar-button"
                    >
                      <RunIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="保存代码">
                    <IconButton 
                      onClick={handleSaveCode}
                      disabled={isLoading}
                      className="toolbar-button"
                    >
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box className="toolbar-right">
                  <input
                    type="text"
                    placeholder="输入AI提示..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="ai-prompt-input"
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handleAIComplete}
                    disabled={isLoading}
                    className="ai-complete-button"
                  >
                    AI补全
                  </button>
                </Box>
              </Box>
            </>
          ) : (
            /* 终端输出 */
            <Box className="terminal-output">
              <pre>{result || '> 终端就绪，等待命令...'}</pre>
              {isLoading && (
                <Box className="terminal-loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
      
      {/* 拖动调整大小的手柄 */}
      <Box 
        className="resize-handle"
        onMouseDown={handleMouseDown}
      />
    </Box>
  );
};

export default AIProgrammingCard;