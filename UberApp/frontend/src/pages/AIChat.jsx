import React, { useState, useRef, useEffect } from 'react';
import { 
    MessageSquare, Send, Sparkles, Database, AlertCircle, 
    CheckCircle, Loader2, Trash2, Copy, Check
} from 'lucide-react';

export default function AIChat() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (num) => {
        if (num === null || num === undefined) return '۰';
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(num).replace(/\d/g, (digit) => farsiDigits[parseInt(digit)]).replace(/\./g, ',');
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            type: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/Chat/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: inputValue })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const aiMessage = {
                    type: 'ai',
                    content: data.message,
                    data: data.data,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorMessage = {
                    type: 'error',
                    content: data.error || data.message || 'خطایی رخ داد',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = {
                type: 'error',
                content: 'خطا در ارتباط با سرور',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }

        setIsLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const copyToClipboard = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Render dynamic data based on structure
    const renderData = (data) => {
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return (
                <div className="text-center py-8 text-slate-500">
                    <Database size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">داده‌ای یافت نشد</p>
                </div>
            );
        }

        // If it's an array of objects (table data)
        if (Array.isArray(data) && typeof data[0] === 'object') {
            const columns = Object.keys(data[0]);
            
            return (
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} className="px-4 py-3 text-right text-slate-300 font-bold border-b border-slate-700 whitespace-nowrap">
                                        {col.replace(/_/g, ' ').toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-4 py-3 text-slate-300 border-b border-slate-800/50 whitespace-nowrap">
                                            {renderCellValue(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // If it's a single object (single result)
        if (typeof data === 'object' && !Array.isArray(data)) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(data).map(([key, value], idx) => (
                        <div key={idx} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                            <p className="text-xs text-slate-500 mb-1 font-medium uppercase">
                                {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-lg text-slate-200 font-bold">
                                {renderCellValue(value)}
                            </p>
                        </div>
                    ))}
                </div>
            );
        }

        // If it's a simple value
        return (
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700 text-center">
                <p className="text-3xl text-blue-400 font-bold">
                    {renderCellValue(data)}
                </p>
            </div>
        );
    };

    const renderCellValue = (value) => {
        if (value === null || value === undefined) return <span className="text-slate-600">—</span>;
        if (typeof value === 'number') {
            return toFarsiNumber(value.toLocaleString('en-US', { maximumFractionDigits: 2 }));
        }
        if (typeof value === 'boolean') return value ? '✓' : '✗';
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // It's a date
            return <span className="font-mono text-xs">{value}</span>;
        }
        return String(value);
    };

    // Example questions
    const exampleQuestions = [
        "Show me the latest 10 completed rides",
        "What is the total revenue from all rides?",
        "Average customer rating for Go Mini vehicles",
        "Top 5 cancellation reasons by customers",
        "How many rides were paid by UPI?"
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30">
                            <Sparkles size={28} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">دستیار هوش مصنوعی</h2>
                            <p className="text-slate-400 text-sm mt-1">سوال خود را به زبان انگلیسی بپرسید</p>
                        </div>
                    </div>
                    
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors text-red-400 text-sm font-bold"
                        >
                            <Trash2 size={16} />
                            پاک کردن چت
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 bg-[#1e293b] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Center container for messages */}
                    <div className="max-w-5xl mx-auto space-y-4" dir="ltr">
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center py-12">
                                <div className="text-center max-w-2xl" dir="rtl">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
                                        <MessageSquare size={40} className="text-purple-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-200 mb-3">سوال خود را بپرسید</h3>
                                    <p className="text-slate-400 text-sm mb-6">
                                        از هوش مصنوعی برای تحلیل داده‌های اوبر استفاده کنید. سوالات خود را به زبان انگلیسی بنویسید.
                                    </p>
                                    
                                    {/* Example Questions */}
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 mb-3 font-bold">نمونه سوالات:</p>
                                        <div className="space-y-2">
                                            {exampleQuestions.map((question, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setInputValue(question)}
                                                    className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-lg transition-all text-slate-300 text-sm"
                                                    dir="ltr"
                                                >
                                                    {question}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((message, idx) => (
                                    <div key={idx} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] ${
                                            message.type === 'user' 
                                                ? 'bg-blue-600/20 border-blue-500/30' 
                                                : message.type === 'error'
                                                ? 'bg-red-500/20 border-red-500/30'
                                                : 'bg-slate-800/50 border-slate-700'
                                        } border rounded-2xl p-4`}>
                                            {/* Message Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {message.type === 'user' ? (
                                                        <>
                                                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                                                <span className="text-xs text-white font-bold">U</span>
                                                            </div>
                                                            <span className="text-xs text-blue-400 font-bold">You</span>
                                                        </>
                                                    ) : message.type === 'error' ? (
                                                        <>
                                                            <AlertCircle size={18} className="text-red-400" />
                                                            <span className="text-xs text-red-400 font-bold">Error</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={18} className="text-purple-400" />
                                                            <span className="text-xs text-purple-400 font-bold">AI Assistant</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                {message.type === 'user' && (
                                                    <button
                                                        onClick={() => copyToClipboard(message.content, idx)}
                                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                    >
                                                        {copiedIndex === idx ? (
                                                            <Check size={14} className="text-green-400" />
                                                        ) : (
                                                            <Copy size={14} className="text-slate-400" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Message Content */}
                                            {message.type === 'user' ? (
                                                <p className="text-slate-200 text-sm leading-relaxed">
                                                    {message.content}
                                                </p>
                                            ) : message.type === 'error' ? (
                                                <div className="flex items-start gap-2">
                                                    <p className="text-red-300 text-sm" dir="rtl">{message.content}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                                                        <CheckCircle size={16} className="text-green-400" />
                                                        <p className="text-green-400 text-sm font-bold" dir="rtl">{message.content}</p>
                                                    </div>
                                                    {message.data && renderData(message.data)}
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <p className="text-xs text-slate-600 mt-2">
                                                {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Loading Indicator */}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
                                            <div className="flex items-center gap-3">
                                                <Loader2 size={20} className="text-purple-400 animate-spin" />
                                                <span className="text-slate-400 text-sm">Processing...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-800 p-4 bg-slate-900/50">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask a question in English... (e.g., 'Show me top 5 rides by revenue')"
                                disabled={isLoading}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 rounded-xl transition-all font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Send size={20} />
                                )}
                                ارسال
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            💡 لطفاً سوالات خود را به زبان انگلیسی بنویسید
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
