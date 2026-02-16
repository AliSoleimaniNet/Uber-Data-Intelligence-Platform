import React, { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCcw, CheckCircle2, AlertCircle, Clock, ChevronLeft, ChevronRight, Zap, X, Copy, RotateCcw } from 'lucide-react';

export default function Pipeline() {
    const [history, setHistory] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(null);
    const [tick, setTick] = useState(Date.now());
    const [resumingBatch, setResumingBatch] = useState(null);
    const [resumeSuccess, setResumeSuccess] = useState(null);
    const historyRef = useRef([]);
    const totalCountRef = useRef(0);
    const currentPageRef = useRef(1);

    // تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (num) => {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        // convert number or numeric string, keep other chars
        const replaced = String(num).replace(/\d/g, (digit) => farsiDigits[parseInt(digit)]);
        // convert any decimal point to comma as requested (e.g. 123,35)
        return replaced.replace(/\./g, ',');
    };

    // Parse server-provided timestamps as UTC when necessary
    const parseServerDate = (s) => {
        if (!s) return null;
        try {
            if (typeof s === 'string') {
                // if string already contains timezone info (Z or ±hh:mm), use as-is
                if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
                // otherwise treat as UTC by appending Z
                return new Date(s + 'Z');
            }
            return new Date(s);
        } catch (e) {
            return new Date(s);
        }
    };

    // ترجمه وضعیت
    const getStatusFarsi = (status) => {
        const statusMap = {
            'Success': 'موفق',
            'Failed': 'ناموفق',
            'Processing': 'درحال پردازش'
        };
        return statusMap[status] || status;
    };

    // ترجمه و رنگ مرحله
    const getStepDetails = (step) => {
        const stepMap = {
            'Bronze': { farsi: 'برنز (ورود)', color: 'bg-amber-500/20 text-amber-400' },
            'Silver': { farsi: 'نقره (تمیزسازی)', color: 'bg-slate-400/20 text-slate-300' },
            'Gold': { farsi: 'طلا (نهایی)', color: 'bg-yellow-500/20 text-yellow-400' }
        };
        return stepMap[step] || { farsi: step, color: 'bg-blue-500/20 text-blue-400' };
    };

    const fetchHistory = async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/Ingestion/history?page=${page}&pageSize=${pageSize}`);
            const data = await res.json();
            setHistory(data.items);
            setTotalCount(data.totalCount);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching history");
        }
        setLoading(false);
    };

    // Handle resume request
    const handleResume = async (batchId) => {
        setResumingBatch(batchId);
        try {
            const response = await fetch(`/api/Ingestion/resume/${batchId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`خطا در ادامه پردازش: ${response.status}`);
            }

            setResumeSuccess(batchId);
            
            // Refresh history after a short delay
            setTimeout(() => {
                fetchHistory(currentPage);
            }, 1000);

            // Auto-hide success message
            setTimeout(() => {
                setResumeSuccess(null);
            }, 4000);

        } catch (error) {
            console.error("Error resuming pipeline:", error);
            setUploadError(error.message || 'خطا در ادامه پردازش');
        }
        setResumingBatch(null);
    };

    // Check if a run can be resumed
    const canResume = (run) => {
        return run.status === 'Failed' && (run.step === 'Silver' || run.step === 'Gold');
    };

    // initialize and polling: only update state when server data changes
    useEffect(() => {
        // sync refs whenever state changes
        historyRef.current = history;
    }, [history]);

    useEffect(() => {
        totalCountRef.current = totalCount;
    }, [totalCount]);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    useEffect(() => {
        const poll = async () => {
            const page = currentPageRef.current || 1;
            try {
                const res = await fetch(`/api/Ingestion/history?page=${page}&pageSize=${pageSize}`);
                if (!res.ok) return;
                const data = await res.json();

                const itemsJson = JSON.stringify(data.items || []);
                const prevJson = JSON.stringify(historyRef.current || []);

                if (itemsJson !== prevJson || data.totalCount !== totalCountRef.current) {
                    setHistory(data.items || []);
                    setTotalCount(data.totalCount || 0);
                    setCurrentPage(page);
                }
            } catch (err) {
                // silent poll errors - keep existing UI
                console.error('Polling error', err);
            }
        };

        // initial fetch immediately
        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, [pageSize]);

    // update tick only while there are processing runs to show sub-second durations
    useEffect(() => {
        const hasProcessing = history.some((r) => r.status === 'Processing');
        if (!hasProcessing) return;
        const id = setInterval(() => setTick(Date.now()), 500);
        return () => clearInterval(id);
    }, [history]);

    // Auto-hide success message after 4 seconds
    useEffect(() => {
        if (uploadSuccess) {
            const timer = setTimeout(() => setUploadSuccess(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [uploadSuccess]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // بررسی نوع فایل
        if (!file.name.endsWith('.csv')) {
            setUploadError('فقط فایل‌های CSV پذیرفته می‌شوند');
            return;
        }

        // بررسی سایز فایل (مثلا 100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            setUploadError('حجم فایل بیش از 100MB است');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            const response = await fetch('/api/Ingestion/upload', {
                method: 'POST',
                body: formData
            });

            const responseData = await response.json().catch(() => null);

            if (!response.ok) {
                const errorMessage = responseData?.message || responseData?.Message || response.statusText;
                throw new Error(errorMessage || `خطا: ${response.status}`);
            }

            console.log('آپلود موفق:', responseData);
            setUploadSuccess(`آپلود موفق! BatchId: ${responseData.batchId || responseData.BatchId}`);

            // بارگذاری مجدد تاریخچه بعد از 1 ثانیه
            setTimeout(() => {
                fetchHistory(1);
            }, 1000);

        } catch (error) {
            console.error("خطا در آپلود فایل:", error);
            setUploadError(error.message || 'خطای نامشخص در آپلود فایل');
        }

        setUploading(false);
        // Clear upload input
        e.target.value = '';
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const calculateDuration = (startTime, endTime) => {
        const start = parseServerDate(startTime) || new Date(startTime);
        const end = endTime ? (parseServerDate(endTime) || new Date(endTime)) : new Date(tick);
        let diff = end - start; // milliseconds
        if (diff < 0) diff = 0;

        // If less than 1 second -> show milliseconds with two decimals: 123,35 م.ث
        if (diff < 1000) {
            const msValue = diff; // milliseconds
            const msFixed = (msValue).toFixed(2); // two decimals
            return `${toFarsiNumber(msFixed)} م.ث`;
        }

        // If less than 1 minute -> show seconds with two decimals: 3,256 ث
        if (diff < 60000) {
            const secValue = diff / 1000;
            const secFixed = secValue.toFixed(2);
            return `${toFarsiNumber(secFixed)} ث`;
        }

        // 1 minute or more -> minutes and seconds (seconds with two decimals)
        const minutes = Math.floor(diff / 60000);
        const remaining = diff % 60000;
        const secValue = remaining / 1000;
        const secFixed = secValue.toFixed(2);
        return `${toFarsiNumber(minutes)}د ${toFarsiNumber(secFixed)}ث`;
    };

    const getStatusStyles = (status) => {
        const styles = {
            'Success': 'bg-green-500/10 text-green-500',
            'Failed': 'bg-red-500/10 text-red-500',
            'Processing': 'bg-blue-500/10 text-blue-500 animate-pulse'
        };
        return styles[status] || 'bg-slate-500/10 text-slate-500';
    };

    const getStatusIcon = (status, run) => {
        // If this run can be resumed and we're hovering, show resume icon
        if (status === 'Failed' && canResume(run)) {
            return (
                <div className="relative group/status">
                    <AlertCircle size={16} className="group-hover/status:hidden" />
                    <RotateCcw size={16} className="hidden group-hover/status:block" />
                </div>
            );
        }

        switch (status) {
            case 'Success':
                return <CheckCircle2 size={16} />;
            case 'Failed':
                return <AlertCircle size={16} />;
            case 'Processing':
                return <RefreshCcw size={16} className="animate-spin" />;
            default:
                return <Clock size={16} />;
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">جریان داده (مراحل پردازش)</h2>
                    <p className="text-slate-500 mt-1">مدیریت و مانیتورینگ ورود داده‌های خام CSV</p>
                    <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-xs text-slate-400">برنز: ورود اولیه</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                            <span className="text-xs text-slate-400">نقره: تمیزسازی</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-xs text-slate-400">طلا: نهایی ✓</span>
                        </div>
                    </div>
                </div>

                <label className={`flex items-center gap-2 px-6 py-3 rounded-xl cursor-pointer transition-all ${uploading ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}>
                    <Upload size={20} />
                    <span className="font-bold">{uploading ? 'در حال آپلود...' : 'شروع پایپ‌لاین جدید'}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv" disabled={uploading} />
                </label>
            </div>

            {/* Table View */}
            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr className="text-slate-400">
                                <th className="px-6 py-4 text-right font-semibold">وضعیت</th>
                                <th className="px-6 py-4 text-right font-semibold">شناسه Batch</th>
                                <th className="px-6 py-4 text-right font-semibold">مرحله</th>
                                <th className="px-6 py-4 text-right font-semibold">زمان شروع</th>
                                <th className="px-6 py-4 text-right font-semibold">مدت زمان</th>
                                <th className="px-6 py-4 text-right font-semibold">تعداد ردیف</th>
                                <th className="px-6 py-4 text-right font-semibold">پیام</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCcw className="animate-spin" size={18} />
                                            در حال بارگذاری...
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                        هیچ داده‌ای موجود نیست
                                    </td>
                                </tr>
                            ) : (
                                history.map((run) => (
                                    <tr key={run.batchId} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className={`p-2 rounded-full ${getStatusStyles(run.status)} ${
                                                        canResume(run) && resumingBatch !== run.batchId
                                                            ? 'cursor-pointer hover:scale-110 transition-transform' 
                                                            : ''
                                                    } ${resumingBatch === run.batchId ? 'animate-pulse' : ''}`}
                                                    onClick={() => {
                                                        if (canResume(run) && resumingBatch !== run.batchId) {
                                                            handleResume(run.batchId);
                                                        }
                                                    }}
                                                    title={canResume(run) ? 'برای ادامه پردازش، کلید کنید' : ''}
                                                >
                                                    {resumingBatch === run.batchId ? (
                                                        <RefreshCcw size={16} className="animate-spin" />
                                                    ) : (
                                                        getStatusIcon(run.status, run)
                                                    )}
                                                </div>
                                                <span className={`font-bold text-xs whitespace-nowrap`}>
                                                    {getStatusFarsi(run.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded">{run.batchId.slice(0, 8)}...</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs rounded-full font-bold ${getStepDetails(run.step).color}`}>
                                                {getStepDetails(run.step).farsi}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <span className="text-xs">{parseServerDate(run.startTime)?.toLocaleString('fa-IR')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <span className="text-sm font-bold text-slate-200">{calculateDuration(run.startTime, run.endTime)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-emerald-400">{toFarsiNumber(run.rowsImported.toLocaleString('en-US'))}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.error ? (
                                                <button
                                                    onClick={() => setSelectedError(run)}
                                                    className="text-xs text-red-400 hover:text-red-300 underline hover:bg-red-500/10 px-2 py-1 rounded transition-colors line-clamp-1"
                                                >
                                                    مشاهده خطا ({String(run.error).length} کاراکتر)
                                                </button>
                                            ) : (
                                                <span className="text-xs text-emerald-400">✓</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => fetchHistory(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => fetchHistory(pageNum)}
                                    className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === pageNum
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {toFarsiNumber(pageNum)}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => fetchHistory(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <span className="text-slate-400 text-sm">
                        صفحه {toFarsiNumber(currentPage)} از {toFarsiNumber(totalPages)}
                    </span>
                </div>
            )}

            {/* Error Modal */}
            {selectedError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedError(null)}
                    ></div>

                    {/* Modal */}
                    <div className="relative bg-[#1e293b] border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-200">جزئیات خطا</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    شناسه: <code className="bg-slate-900 px-2 py-0.5 rounded">{selectedError.batchId.slice(0, 12)}...</code>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedError(null)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div
                                dir="ltr"
                                className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 font-mono text-xs leading-relaxed text-red-300 whitespace-pre-wrap break-words text-left selection:bg-red-500/30"
                            >
                                {selectedError.error}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-slate-800">
                            <span className="text-xs text-slate-500">
                                {toFarsiNumber(String(selectedError.error).length)} کاراکتر
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        copyToClipboard(selectedError.error);
                                        // Optional: Show toast
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white font-bold text-sm"
                                >
                                    <Copy size={16} />
                                    کپی کردن
                                </button>
                                <button
                                    onClick={() => setSelectedError(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white font-bold text-sm"
                                >
                                    بستن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Error Alert */}
            {uploadError && (
                <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">خطا در آپلود</p>
                            <p className="text-xs text-red-100 mt-1">{uploadError}</p>
                        </div>
                        <button
                            onClick={() => setUploadError(null)}
                            className="text-red-200 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Success Alert */}
            {uploadSuccess && (
                <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">آپلود موفق</p>
                            <p className="text-xs text-green-100 mt-1">{uploadSuccess}</p>
                        </div>
                        <button
                            onClick={() => setUploadSuccess(null)}
                            className="text-green-200 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Resume Success Alert */}
            {resumeSuccess && (
                <div className="fixed bottom-6 left-6 z-50 bg-blue-500 text-white rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start gap-3">
                        <RotateCcw size={20} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">ادامه پردازش آغاز شد</p>
                            <p className="text-xs text-blue-100 mt-1">پایپ‌لاین مجدداً در حال اجرا است</p>
                        </div>
                        <button
                            onClick={() => setResumeSuccess(null)}
                            className="text-blue-200 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
