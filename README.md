# NoticeAI - 智能文本编辑助手

NoticeAI是一个基于React的智能文本编辑工具，帮助用户在编辑过程中快速优化、翻译和改进文本内容。它通过AI技术为选中的文本提供多种处理选项，提高写作和编辑效率。

## 特点

- **智能文本处理**: 选中文本后快速获取AI建议
- **多种优化选项**: 包括改进写作、简化语言、翻译、增加或减少文本长度
- **实时AI反馈**: 利用OpenRouter API连接到强大的AI模型
- **流式响应**: 即时展示AI生成内容，提供良好的用户体验
- **现代界面**: 简洁易用的用户界面，支持任何文本编辑场景

## 技术栈

- React 19
- TypeScript
- Vite
- OpenRouter API (接入多种AI模型)
- Lucide Icons

## 安装

1. 安装依赖:
```
pnpm install
```

2. 设置API密钥:
在 `src/components/AIAssistant.tsx` 文件中替换OpenRouter API密钥。

3. 启动开发服务器:
```
pnpm dev
```

## 使用方法

1. 在编辑区域中输入或粘贴文本
2. 选择您想要优化或处理的文本片段
3. 在弹出的AI助手中选择处理选项（改进、简化、翻译等）
4. 点击发送按钮处理文本
5. 查看AI生成的结果，满意后点击"替换"将其应用到文本中

## 自定义

您可以在 `src/components/AIAssistant.tsx` 文件中修改以下内容:
- AI模型选择 (通过修改 `model` 参数)
- 处理选项和提示词 (通过修改 `operationOptions` 数组)
- UI样式和布局