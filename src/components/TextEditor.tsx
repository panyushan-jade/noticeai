/**
 * @file TextEditor.tsx
 * @description 文本编辑器组件，支持选中文本并显示AI助手
 * 
 * @copyright 2025 panyushan. 保留所有权利
 * @license 专有软件，未经许可不得使用、复制或分发
 */

import { useState, useRef, useEffect } from 'react';
import AIAssistant from './AIAssistant';

interface AIAssistantPosition {
  top: number;
  left: number;
}

const TextEditor = () => {
  const [showAssistant, setShowAssistant] = useState<boolean>(false);
  const [assistantPosition, setAssistantPosition] = useState<AIAssistantPosition>({ top: 0, left: 0 });
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // 显示写作助手
  const showWritingAssistant = (position: AIAssistantPosition) => {
    setAssistantPosition(position);
    setShowAssistant(true);
  };

  // 生成唯一ID
  const generateUniqueId = () => {
    return `highlight-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // 清除所有高亮
  const clearAllHighlights = () => {
    if (!editorRef.current) return;
    
    const highlights = editorRef.current.querySelectorAll('.text-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        // 将高亮元素内的内容提取出来并替换元素本身
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
      }
    });
    
    setHighlightId(null);
  };

  // 处理选择文本
  const handleSelection = () => {
    const selection = window.getSelection();
    
    if (selection && !selection.isCollapsed) {
      try {
        // 先清除之前的高亮
        clearAllHighlights();
        
        // 保存当前选区的Range对象，用于后续替换操作
        const range = selection.getRangeAt(0).cloneRange();
        setCurrentRange(range);
        
        // 保存选中的文本内容
        const text = selection.toString();
        setSelectedText(text);
        
        // 创建高亮元素
        const highlightSpan = document.createElement('span');
        const id = generateUniqueId();
        highlightSpan.id = id;
        highlightSpan.className = 'text-highlight';
        
        try {
          // 尝试使用surroundContents包裹选中内容
          // 这在某些复杂DOM结构下可能会失败
          range.surroundContents(highlightSpan);
        } catch (e) {
          // 如果surroundContents失败，使用提取内容和插入的方式
          console.log('surroundContents failed, using alternative method');
          
          // 提取选中内容
          const fragment = range.extractContents();
          
          // 将提取的内容添加到高亮元素中
          highlightSpan.appendChild(fragment);
          
          // 将高亮元素插入到选区的起始位置
          range.insertNode(highlightSpan);
        }
        
        setHighlightId(id);
        
        // 获取高亮元素的位置
        const rect = highlightSpan.getBoundingClientRect();
        
        // 如果是多行选择，计算第一行的位置
        let topPosition = rect.top;
        let leftPosition = rect.left;
        
        // 创建Range来获取第一行的位置
        const firstLineRange = document.createRange();
        const textNode = highlightSpan.firstChild;
        
        // 检查是否有文本节点
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          // 设置Range为第一行的第一个字符
          firstLineRange.setStart(textNode, 0);
          firstLineRange.setEnd(textNode, 1);
          
          // 获取第一行的位置
          const firstLineRect = firstLineRange.getBoundingClientRect();
          if (firstLineRect.top !== 0 && firstLineRect.left !== 0) {
            topPosition = firstLineRect.bottom;
            leftPosition = firstLineRect.left;
          }
        }
        
        // 清除浏览器原生的选择
        selection.removeAllRanges();
        
        // 显示助手在第一行的位置
        showWritingAssistant({
          top: topPosition + window.scrollY,
          left: leftPosition + window.scrollX
        });
      } catch (error) {
        console.error("Error applying highlight:", error);
        // 如果出错，至少保存选中的文本
        setSelectedText(selection.toString());
        
        // 获取选区位置
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 尝试获取第一行的位置
        try {
          // 创建临时Range来获取第一行的位置
          const firstLineRange = document.createRange();
          
          // 从选区的起始位置开始
          firstLineRange.setStart(range.startContainer, range.startOffset);
          
          // 只选择一个字符来确保是在第一行
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const endOffset = Math.min(range.startOffset + 1, range.startContainer.textContent?.length || 0);
            firstLineRange.setEnd(range.startContainer, endOffset);
          } else {
            firstLineRange.setEnd(range.startContainer, range.startOffset);
          }
          
          const firstLineRect = firstLineRange.getBoundingClientRect();
          
          // 显示助手在第一行的位置
          showWritingAssistant({
            top: firstLineRect.bottom + window.scrollY,
            left: firstLineRect.left + window.scrollX
          });
        } catch (positionError) {
          console.error("Error getting first line position:", positionError);
          // 如果计算第一行位置也出错，则使用整个选区的位置
          showWritingAssistant({
            top: rect.top + window.scrollY + rect.height,
            left: rect.left + window.scrollX
          });
        }
      }
    }
  };

  // 替换选中的文本
  const handleReplaceText = (newText: string) => {
    if (!editorRef.current || !highlightId) return;
    
    // 查找高亮元素
    const highlightElement = document.getElementById(highlightId);
    if (highlightElement) {
      // 替换高亮元素的内容
      highlightElement.innerHTML = '';
      highlightElement.textContent = newText;
      
      // 移除高亮样式
      highlightElement.className = '';
      highlightElement.style.backgroundColor = '';
      highlightElement.style.padding = '';
      
      // 将span元素内容提取出来并替换span
      const parent = highlightElement.parentNode;
      if (parent) {
        const textNode = document.createTextNode(newText);
        parent.replaceChild(textNode, highlightElement);
      }
    }
    
    // 清除状态并关闭助手
    setShowAssistant(false);
    setCurrentRange(null);
    setSelectedText('');
    setHighlightId(null);
  };

  // 点击外部关闭助手
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const assistantContainer = document.querySelector('.assistant-container');
      const highlightElement = highlightId ? document.getElementById(highlightId) : null;
      
      // 如果点击的不是助手和高亮区域，则关闭助手并清除高亮
      if (
        !(assistantContainer && assistantContainer.contains(event.target as Node)) && 
        !(highlightElement && highlightElement.contains(event.target as Node))
      ) {
        setShowAssistant(false);
        clearAllHighlights();
        setCurrentRange(null);
        setSelectedText('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [highlightId]);

  // 添加自定义样式
  useEffect(() => {
    // 添加自定义样式到页面
    const style = document.createElement('style');
    style.innerHTML = `
      .text-highlight {
        background-color: rgba(215,228,254);
        padding: 2px 0;
      }
      
      .assistant-container {
        position: absolute;
        z-index: 9999;
        pointer-events: auto;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-radius: 8px;
      }
      
      .assistant-active {
        position: relative;
      }
      
      .assistant-active:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999;
        pointer-events: none;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .loading-spinner {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="editor-container">
      <div
        id="editor"
        ref={editorRef}
        className={`editor ${showAssistant ? 'assistant-active' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
      > 
        I enjoy the crispness of the first bite 
        <br />
        <br />
        As I relish the succulent flavors, my senses are transported to a serene orchard where the sun-kissed fruits sway with grace. The luscious juices envelop my palate, painting a portrait of nature's artistry. This symphony of taste evokes a profound appreciation for the intricate masterpiece that is the bananacherrydateApple. Each bite is a celebration of life's ephemeral treasures, urging gratitude for the wonders bestowed upon us. Nature's harmonious choir of flavors continues to enchant, reminding me to savor every morsel and find solace in the simplest indulgences life provides.
        <br />
        <br />
        Artificial Intelligence (AI) has revolutionized industries from healthcare to finance, yet its rapid advancement raises significant ethical concerns. This paper examines key dilemmas, including algorithmic bias, privacy erosion, and autonomous decision-making, through case studies of facial recognition and predictive policing. By analyzing ethical frameworks (utilitarianism, deontology, and virtue ethics), we propose a hybrid governance model combining regulatory policies and technical safeguards. The study concludes that interdisciplinary collaboration is critical to ensure AI aligns with human values
        <br />
        <br />
        AI ethics cannot rely solely on technologists or regulators. A multidisciplinary approach—integrating philosophy, law, and computer science—is essential. Future research should explore quantum computing's ethical implications.
        <br />
        <br />
        The global AI market is projected to reach $1.5 trillion by 2030 (Statista, 2023). However, incidents like Amazon's biased hiring algorithm (Dastin, 2018) and OpenAI's ChatGPT generating misinformation highlight unintended consequences.
        <br />
        <br />
        Should AI decision-making (e.g., autonomous vehicles) prioritize utilitarian outcomes (minimize total harm) or individual rights (protect passengers)?Can AI ethics be standardized globally, or will cultural differences lead to fragmented regulations?
        <br />
        <br />
        The rapid advancement of artificial intelligence (AI) presents unprecedented ethical challenges, from algorithmic bias to existential risks. This paper examines the ethical dilemmas of AI through case studies in criminal justice, healthcare, and autonomous weapons, evaluating solutions under utilitarianism, deontology, and virtue ethics frameworks. A mixed-methods approach combines quantitative analysis of bias in facial recognition systems with qualitative interviews with AI policymakers The findings reveal that current self-regulation is insufficient, and a hybrid governance model—combining technical audits, policy enforcement, and public oversight—is necessary to align AI with human values. The study concludes with recommendations for interdisciplinary collaboration to mitigate AI's societal risks
      
      </div>
      
      {showAssistant && (
        <AIAssistant
          selectedText={selectedText}
          position={assistantPosition}
          onReplace={handleReplaceText}
          onClose={() => {
            setShowAssistant(false);
            clearAllHighlights();
          }}
        />
      )}
    </div>
  );
};

export default TextEditor; 