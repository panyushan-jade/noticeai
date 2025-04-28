/**
 * @file AIAssistant.tsx
 * @description AI助手组件，处理文本选择和AI处理操作
 * 
 * @copyright 2025 panyushan. 保留所有权利。
 * @license 专有软件，未经许可不得使用、复制或分发
 */

import { useState, useEffect, useRef } from 'react';
import { IconX, IconBrain, IconSend, IconReplace } from '@tabler/icons-react';
import { Sparkle, SendHorizontal, Loader2 } from 'lucide-react';

interface AIAssistantPosition {
  top: number;
  left: number;
}

interface AIAssistantProps {
  selectedText?: string;
  position: AIAssistantPosition;
  onReplace: (newText: string) => void;
  onClose: () => void;
}

// 文本处理操作类型
type TextOperation = 'improve' | 'simplify' | 'translate' | 'longer' | 'shorter';

interface OperationOption {
  id: TextOperation;
  label: string;
  prompt: string;
}

const operationOptions: OperationOption[] = [
  { id: 'improve', label: 'Improve writing', prompt: 'Improve this text: ' },
  { id: 'simplify', label: 'Simplify language', prompt: 'Simplify this text: ' },
  { id: 'translate', label: 'Translate', prompt: 'Translate this text to Chinese: ' },
  { id: 'longer', label: 'Make longer', prompt: 'Make this text longer with more details: ' },
  { id: 'shorter', label: 'Make shorter', prompt: 'Make this text shorter while keeping the key points: ' }
];

// OpenRouter API URL
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// 需要在实际使用时替换为你的API密钥
const API_KEY = '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';

const AIAssistant = ({ selectedText = '', position, onReplace, onClose }: AIAssistantProps) => {
  // 状态变量
  const [userInput, setUserInput] = useState<string>('');
  const [aiResponse, setAIResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [showReplaceOptions, setShowReplaceOptions] = useState<boolean>(false);
  const [isInputMode, setIsInputMode] = useState<boolean>(true); // 控制是输入模式还是显示响应模式
  const [activeOperation, setActiveOperation] = useState<TextOperation>('improve'); // 默认选择"Improve writing"
  
  // 保存选中的文本，但不在输入框中显示
  const selectedTextRef = useRef<string>(selectedText);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 更新引用值
  useEffect(() => {
    selectedTextRef.current = selectedText;
  }, [selectedText]);

  // 处理OpenRouter API的流式响应
  const processStreamResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    setIsStreaming(true);
    setIsInputMode(false);
    setAIResponse('');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码响应数据
        const chunk = new TextDecoder('utf-8').decode(value);
        const lines = chunk
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            try {
              // 移除 "data: " 前缀并解析JSON
              const cleanedLine = line.replace(/^data: /, '');
              if (cleanedLine === '[DONE]') return null;
              return JSON.parse(cleanedLine);
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean);

        // 处理每一行的内容
        for (const line of lines) {
          if (line?.choices?.[0]?.delta?.content) {
            const content = line.choices[0].delta.content;
            setAIResponse(prev => prev + content);
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
    } finally {
      setIsStreaming(false);
      setShowReplaceOptions(true);
    }
  };

  // 处理文本的函数 - 调用OpenRouter API
  const processTextWithAI = async (text: string, operation: TextOperation) => {
  
    if (!text.trim()) return;
    
    setIsLoading(true);
    setShowReplaceOptions(false);
    
    // 取消之前的请求（如果有）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const prompt = operationOptions.find(op => op.id === operation)?.prompt || '';
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': ' /json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          // model: 'anthropic/claude-3-haiku', // 使用Claude 3 Haiku，速度快且价格合理
          model: "mistralai/mistral-7b-instruct:free", // 使用Claude 3 Haiku，速度快且价格合理
          messages: [
            {
              role: 'user',
              content: `${prompt}${selectedTextRef.current}\n\n ${text} Please provide only the revised text without additional commentary or explanations.`
            }
          ],
          stream: true, // 启用流式响应
          max_tokens: 1024 // 限制响应长度
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      // 流式响应开始，设置streaming状态，但保持loading状态为false
      setIsLoading(false);
      setIsStreaming(true);
      
      const reader = response.body.getReader();
      await processStreamResponse(reader);
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error calling OpenRouter API:', error);
        setAIResponse('Error: Failed to get response from AI service.');
        setShowReplaceOptions(true);
      }
    } finally {
      // 确保无论如何都重置loading状态
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // 处理输入提交
  const handleInputSubmit = () => {
    // 使用选中的文本，如果有输入则使用输入
    const textToProcess = userInput.trim() !== '' ? userInput : selectedTextRef.current;
    if (textToProcess && textToProcess.trim() !== '') {
      processTextWithAI(textToProcess, activeOperation);
    }
  };

  // 选择处理操作
  const handleOperationSelect = (operation: TextOperation) => {
    setActiveOperation(operation);
    // 不再自动处理文本
  };


  // 处理关闭
  const handleClose = () => {
    // 取消进行中的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (onClose) {
      onClose();
    }
  };

  // 按Enter键发送输入
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (userInput.trim() !== '') {
        handleInputSubmit();
        e.preventDefault();
      }
    }
  };

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div 
      className="assistant-container" 
      style={{ 
        top: position.top, 
        left: position.left,
        zIndex: 1000, // 确保在编辑器之上
        position: 'absolute',
        backgroundColor: 'white'
      }}
      onMouseDown={(e) => {
        e.stopPropagation(); 
        e.preventDefault(); // 阻止默认行为
      }} 
    >
      <div className="assistant-header">
        {
          aiResponse && <div style={{width:'100%',textAlign:'left'}}>{aiResponse}</div>
        }
        <div className="assistant-logo">
          <Sparkle size={20} />
          <div className="assistant-input">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedTextRef.current ? "Enter text or use selected text" : "Enter text to process..."}
            onMouseDown={(e) => {
              e.stopPropagation(); // 阻止冒泡但不阻止默认行为
            }}
          />
        </div>
        {isLoading || isStreaming ? (
          <Loader2 size={20} className="loading-spinner" style={{ cursor: 'not-allowed', animation: 'spin 1s linear infinite' }} />
        ) : (
          <SendHorizontal 
            size={20} 
            style={{cursor: isLoading ? 'not-allowed' : 'pointer'}} 
            onClick={() => !isLoading && handleInputSubmit()} 
          />
        )}
        </div>
      </div>

      <div className="assistant-content">
        {isInputMode && (
          <div className="operation-options">
            <div 
                key='edit'
                className='operation-option-title'
              >
                Edit
              </div>
            {operationOptions.map(option => (
              <div 
                key={option.id} 
                className={`operation-option ${activeOperation === option.id ? 'selected' : ''}`}
                onClick={() => !isLoading && !isStreaming && handleOperationSelect(option.id)}
                style={{ cursor: isLoading || isStreaming ? 'not-allowed' : 'pointer' }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
        {showReplaceOptions && (
          <div className="operation-options">
            <div className='operation-option' onClick={() => onReplace(aiResponse)}>
                Replace
            </div>
            <div className='operation-option' onClick={handleClose}>
                Close
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant; 