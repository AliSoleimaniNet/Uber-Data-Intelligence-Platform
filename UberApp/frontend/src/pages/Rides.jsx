import React, { useState, useEffect, useRef } from 'react';
import { 
    Car, RefreshCcw, Plus, Filter, ChevronLeft, ChevronRight, 
    X, Edit2, Trash2, MapPin, Calendar, DollarSign, Star, 
    CreditCard, Navigation, Users, Search, CheckCircle2, AlertCircle, Info, Copy
} from 'lucide-react';

export default function Rides() {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(15);
    
    // Filters
    const [filters, setFilters] = useState({
        status: '',
        vehicle: '',
        customerId: '',
        semanticSearch: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRide, setSelectedRide] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRideDetails, setShowRideDetails] = useState(false);
    
    // Notifications
    const [notification, setNotification] = useState(null);
    
    // Create/Edit form
    const [formData, setFormData] = useState({
        customerId: '',
        vehicleType: 'Auto',
        bookingValue: '',
        rideDistance: '',
        rideTimestamp: '',
        driverRatings: '',
        customerRating: '',
        paymentMethod: 'UPI'
    });

    const ridesRef = useRef([]);
    const totalCountRef = useRef(0);
    const currentPageRef = useRef(1);

    // تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (num) => {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(num).replace(/\d/g, (digit) => farsiDigits[parseInt(digit)]).replace(/\./g, ',');
    };

    const parseServerDate = (s) => {
        if (!s) return null;
        try {
            if (typeof s === 'string') {
                if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
                return new Date(s + 'Z');
            }
            return new Date(s);
        } catch (e) {
            return new Date(s);
        }
    };

    // Translation functions
    const getBookingStatusFarsi = (status) => {
        const statusMap = {
            'Completed': 'تکمیل شده',
            'Cancelled by Driver': 'لغو شده توسط راننده',
            'No Driver Found': 'راننده یافت نشد',
            'Cancelled by Customer': 'لغو شده توسط مشتری',
            'Incomplete': 'ناقص',
            'InProgress': 'در حال انجام',
            'Pending': 'در انتظار',
            'Cancelled': 'لغو شده'
        };
        return statusMap[status] || status;
    };

    const getVehicleTypeFarsi = (vehicle) => {
        const vehicleMap = {
            'Auto': 'اتو',
            'Go Mini': 'گو مینی',
            'Go Sedan': 'گو سدان',
            'Bike': 'موتور',
            'Premier Sedan': 'سدان پریمیر',
            'eBike': 'موتور برقی',
            'Uber XL': 'اوبر ایکس‌ال',
            'Economy': 'اکونومی',
            'Premium': 'پریمیوم',
            'SUV': 'شاسی بلند',
            'Luxury': 'لوکس'
        };
        return vehicleMap[vehicle] || vehicle;
    };

    const getPaymentMethodFarsi = (method) => {
        if (!method || method === 'NaN' || method === 'Not Specified') return 'نامشخص';
        const paymentMap = {
            'UPI': 'UPI',
            'Cash': 'نقدی',
            'Uber Wallet': 'کیف پول اوبر',
            'Credit Card': 'کارت اعتباری',
            'Debit Card': 'کارت بانکی',
            'Card': 'کارت',
            'Wallet': 'کیف پول'
        };
        return paymentMap[method] || method;
    };

    // Get color indicator for cancellation reason
    const getReasonColorIndicator = (status, reason) => {
        if (!reason || reason === 'Not Cancelled') return null;
        
        // Different colors for different types
        if (status === 'Cancelled by Customer') {
            return 'bg-orange-500';
        } else if (status === 'Cancelled by Driver') {
            return 'bg-red-500';
        } else if (status === 'Incomplete') {
            return 'bg-yellow-500';
        }
        
        return 'bg-amber-500';
    };

    const getCustomerCancellationReasonFarsi = (reason) => {
        if (!reason) return '';
        const reasonMap = {
            'Wrong Address': 'آدرس اشتباه',
            'Change of plans': 'تغییر برنامه',
            'Driver is not moving towards pickup location': 'راننده به سمت مبدا حرکت نمی‌کند',
            'Driver asked to cancel': 'راننده درخواست لغو کرد',
            'AC is not working': 'کولر کار نمی‌کند'
        };
        return reasonMap[reason] || reason;
    };

    const getDriverCancellationReasonFarsi = (reason) => {
        if (!reason) return '';
        const reasonMap = {
            'Customer related issue': 'مشکل مربوط به مشتری',
            'The customer was coughing/sick': 'مشتری سرفه می‌کرد/بیمار بود',
            'Personal & Car related issues': 'مشکلات شخصی و مربوط به خودرو',
            'More than permitted people in there': 'تعداد مسافر بیش از حد مجاز'
        };
        return reasonMap[reason] || reason;
    };

    const getIncompleteRideReasonFarsi = (reason) => {
        if (!reason) return '';
        const reasonMap = {
            'Customer Demand': 'درخواست مشتری',
            'Vehicle Breakdown': 'خرابی خودرو',
            'Other Issue': 'مشکل دیگر'
        };
        return reasonMap[reason] || reason;
    };

    const getCancellationReasonFarsi = (status, reason) => {
        if (!reason) return '';
        
        if (status === 'Cancelled by Customer') {
            return getCustomerCancellationReasonFarsi(reason);
        } else if (status === 'Cancelled by Driver') {
            return getDriverCancellationReasonFarsi(reason);
        } else if (status === 'Incomplete') {
            return getIncompleteRideReasonFarsi(reason);
        }
        
        return reason;
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchRides = async (page = 1, filterOverride = null) => {
        setLoading(true);
        const appliedFilters = filterOverride !== null ? filterOverride : filters;
        
        try {
            const params = new URLSearchParams({
                PageNumber: page,
                PageSize: pageSize,
                ...(appliedFilters.status && { Status: appliedFilters.status }),
                ...(appliedFilters.vehicle && { Vehicle: appliedFilters.vehicle }),
                ...(appliedFilters.customerId && { CustomerId: appliedFilters.customerId }),
                ...(appliedFilters.semanticSearch && { SemanticSearch: appliedFilters.semanticSearch })
            });
            
            const res = await fetch(`/api/Ride?${params}`);
            const data = await res.json();
            
            setRides(data.items || []);
            setTotalCount(data.totalCount || 0);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching rides:", error);
            showNotification('خطا در بارگذاری سفرها', 'error');
        }
        setLoading(false);
    };

    // Polling with refs
    useEffect(() => {
        ridesRef.current = rides;
    }, [rides]);

    useEffect(() => {
        totalCountRef.current = totalCount;
    }, [totalCount]);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    // Auto-apply customer ID filter with debounce
    useEffect(() => {
        if (filters.customerId !== '') {
            const debounceTimer = setTimeout(() => {
                setCurrentPage(1);
                fetchRides(1, filters);
            }, 500); // Wait 500ms after user stops typing
            
            return () => clearTimeout(debounceTimer);
        }
    }, [filters.customerId]);

    // Auto-apply semantic search filter with debounce
    useEffect(() => {
        if (filters.semanticSearch !== '') {
            const debounceTimer = setTimeout(() => {
                setCurrentPage(1);
                fetchRides(1, filters);
            }, 500); // Wait 500ms after user stops typing
            
            return () => clearTimeout(debounceTimer);
        }
    }, [filters.semanticSearch]);

    useEffect(() => {
        const poll = async () => {
            const page = currentPageRef.current || 1;
            try {
                const params = new URLSearchParams({
                    PageNumber: page,
                    PageSize: pageSize,
                    ...(filters.status && { Status: filters.status }),
                    ...(filters.vehicle && { Vehicle: filters.vehicle }),
                    ...(filters.customerId && { CustomerId: filters.customerId }),
                    ...(filters.semanticSearch && { SemanticSearch: filters.semanticSearch })
                });
                
                const res = await fetch(`/api/Ride?${params}`);
                if (!res.ok) return;
                const data = await res.json();

                const itemsJson = JSON.stringify(data.items || []);
                const prevJson = JSON.stringify(ridesRef.current || []);

                if (itemsJson !== prevJson || data.totalCount !== totalCountRef.current) {
                    setRides(data.items || []);
                    setTotalCount(data.totalCount || 0);
                }
            } catch (err) {
                console.error('Polling error', err);
            }
        };

        poll();
        const id = setInterval(poll, 10000); // Poll every 10 seconds
        return () => clearInterval(id);
    }, [pageSize, filters]);

    const handleCreateRide = async () => {
        try {
            const payload = {
                customerId: formData.customerId,
                vehicleType: formData.vehicleType,
                bookingValue: parseFloat(formData.bookingValue),
                rideDistance: parseFloat(formData.rideDistance),
                rideTimestamp: formData.rideTimestamp ? formData.rideTimestamp + ':00.000Z' : undefined,
                driverRatings: formData.driverRatings ? parseFloat(formData.driverRatings) : null,
                customerRating: formData.customerRating ? parseFloat(formData.customerRating) : null,
                paymentMethod: formData.paymentMethod
            };

            const res = await fetch('/api/Ride', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create ride');

            showNotification('سفر جدید با موفقیت ایجاد شد');
            setShowCreateModal(false);
            resetForm();
            fetchRides(1);
        } catch (error) {
            console.error("Error creating ride:", error);
            showNotification('خطا در ایجاد سفر', 'error');
        }
    };

    const handleUpdateStatus = async (bookingId, newStatus, reason = '') => {
        try {
            const res = await fetch(`/api/Ride/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, reason })
            });

            if (!res.ok) throw new Error('Failed to update status');

            showNotification('وضعیت سفر به‌روزرسانی شد');
            fetchRides(currentPage);
        } catch (error) {
            console.error("Error updating status:", error);
            showNotification('خطا در به‌روزرسانی وضعیت', 'error');
        }
    };

    const handleDeleteRide = async () => {
        if (!selectedRide) return;
        
        try {
            const res = await fetch(`/api/Ride/${selectedRide.bookingId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete ride');

            showNotification('سفر حذف شد');
            setShowDeleteConfirm(false);
            setSelectedRide(null);
            fetchRides(currentPage);
        } catch (error) {
            console.error("Error deleting ride:", error);
            showNotification('خطا در حذف سفر', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            customerId: '',
            vehicleType: 'Auto',
            bookingValue: '',
            rideDistance: '',
            rideTimestamp: '',
            driverRatings: '',
            customerRating: '',
            paymentMethod: 'UPI'
        });
    };

    const applyFilters = () => {
        setCurrentPage(1);
        fetchRides(1, filters);
        setShowFilters(false);
    };

    const clearFilters = () => {
        const emptyFilters = { status: '', vehicle: '', customerId: '', semanticSearch: '' };
        setFilters(emptyFilters);
        setCurrentPage(1);
        fetchRides(1, emptyFilters);
        setShowFilters(false);
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const getStatusColor = (status) => {
        const colors = {
            'Completed': 'bg-green-500/20 text-green-400 border border-green-500/30',
            'Cancelled by Driver': 'bg-red-500/20 text-red-400 border border-red-500/30',
            'Cancelled by Customer': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
            'No Driver Found': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
            'Incomplete': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
            'InProgress': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            'Pending': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
            'Cancelled': 'bg-red-500/20 text-red-400 border border-red-500/30'
        };
        return colors[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    };

    const getVehicleIcon = (vehicle) => {
        // Different colors and styles for different vehicle types
        const iconClass = "text-blue-400";
        return <Car size={16} className={iconClass} />;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-xl">
                            <Car size={28} className="text-blue-400" />
                        </div>
                        مدیریت سفرها
                    </h2>
                    <p className="text-slate-500 mt-2">مشاهده، جستجو و مدیریت تمامی سفرهای ثبت شده</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                        <span className="text-slate-400">مجموع سفرها: <strong className="text-blue-400">{toFarsiNumber(totalCount.toLocaleString('en-US'))}</strong></span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                            showFilters || filters.status || filters.vehicle || filters.customerId || filters.semanticSearch
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <Filter size={18} />
                        <span className="font-bold">فیلترها</span>
                    </button>
                    
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-white font-bold"
                    >
                        <Plus size={20} />
                        سفر جدید
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">وضعیت سفر</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">همه</option>
                                <option value="Completed">تکمیل شده</option>
                                <option value="Cancelled by Driver">لغو شده توسط راننده</option>
                                <option value="No Driver Found">راننده یافت نشد</option>
                                <option value="Cancelled by Customer">لغو شده توسط مشتری</option>
                                <option value="Incomplete">ناقص</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">نوع خودرو</label>
                            <select
                                value={filters.vehicle}
                                onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">همه</option>
                                <option value="Auto">اتو</option>
                                <option value="Go Mini">گو مینی</option>
                                <option value="Go Sedan">گو سدان</option>
                                <option value="Bike">موتور</option>
                                <option value="Premier Sedan">سدان پریمیر</option>
                                <option value="eBike">موتور برقی</option>
                                <option value="Uber XL">اوبر ایکس‌ال</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">شناسه مشتری</label>
                            <input
                                type="text"
                                value={filters.customerId}
                                onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
                                placeholder="جستجو..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Semantic Search - Full Width */}
                    <div className="mt-4">
                        <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                            <Search size={16} className="text-purple-400" />
                            جستجوی هوشمند دلیل لغو
                            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">AI-Powered</span>
                        </label>
                        <input
                            type="text"
                            value={filters.semanticSearch}
                            onChange={(e) => setFilters({ ...filters, semanticSearch: e.target.value })}
                            placeholder="مثال: Sick, wrong address, ..."
                            className="w-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            جستجوی معنایی در دلایل لغو - حداکثر ۵ نتیجه مرتبط
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-800">
                        <button
                            onClick={applyFilters}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white font-bold"
                        >
                            <Search size={16} />
                            اعمال فیلتر
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white font-bold"
                        >
                            پاک کردن
                        </button>
                    </div>
                </div>
            )}

            {/* Rides Table */}
            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr className="text-slate-400">
                                <th className="px-6 py-4 text-right font-semibold">شناسه رزرو</th>
                                <th className="px-6 py-4 text-right font-semibold">وضعیت</th>
                                <th className="px-6 py-4 text-right font-semibold">مشتری</th>
                                <th className="px-6 py-4 text-right font-semibold">خودرو</th>
                                <th className="px-6 py-4 text-right font-semibold">مسافت</th>
                                <th className="px-6 py-4 text-right font-semibold">مبلغ</th>
                                <th className="px-6 py-4 text-right font-semibold">امتیازات</th>
                                {/* <th className="px-6 py-4 text-right font-semibold">روش پرداخت</th> */}
                                <th className="px-6 py-4 text-right font-semibold">تاریخ</th>
                                <th className="px-6 py-4 text-right font-semibold">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCcw className="animate-spin" size={20} />
                                            در حال بارگذاری...
                                        </div>
                                    </td>
                                </tr>
                            ) : rides.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                                        <Car size={48} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">هیچ سفری یافت نشد</p>
                                        <p className="text-xs mt-1">سفر جدیدی ایجاد کنید یا فیلترها را تغییر دهید</p>
                                    </td>
                                </tr>
                            ) : (
                                rides.map((ride) => (
                                    <tr key={ride.bookingId} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    copyToClipboard(ride.bookingId);
                                                    showNotification('شناسه کپی شد', 'success');
                                                }}
                                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                                                title={ride.bookingId}
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 text-xs rounded-full font-bold whitespace-nowrap ${getStatusColor(ride.bookingStatus)}`}>
                                                    {getBookingStatusFarsi(ride.bookingStatus)}
                                                </span>
                                                {getReasonColorIndicator(ride.bookingStatus, ride.unifiedCancellationReason) && (
                                                    <div 
                                                        className={`w-2 h-2 rounded-full ${getReasonColorIndicator(ride.bookingStatus, ride.unifiedCancellationReason)}`}
                                                        title="دارای دلیل - جزئیات را ببینید"
                                                    ></div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                    <Users size={14} className="text-white" />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        copyToClipboard(ride.customerId);
                                                        showNotification('شناسه مشتری کپی شد', 'success');
                                                    }}
                                                    className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-blue-400"
                                                    title={ride.customerId}
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getVehicleIcon(ride.vehicleType)}
                                                <span className="text-slate-300 font-medium text-sm whitespace-nowrap">{getVehicleTypeFarsi(ride.vehicleType)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-300">
                                                <Navigation size={14} className="text-blue-400" />
                                                <span className="font-bold text-sm whitespace-nowrap">{toFarsiNumber(ride.rideDistance.toFixed(2))}</span>
                                                <span className="text-xs text-slate-500">کیلومتر</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <DollarSign size={14} className="text-emerald-400" />
                                                <span className="font-bold text-emerald-400 text-sm whitespace-nowrap">{toFarsiNumber(Math.floor(ride.bookingValue).toLocaleString('en-US'))}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {ride.driverRatings && (
                                                    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                                        <span className="text-slate-300">{toFarsiNumber(ride.driverRatings.toFixed(1))}</span>
                                                        <span className="text-slate-500 text-[10px]">راننده</span>
                                                    </div>
                                                )}
                                                {ride.customerRating && (
                                                    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                                        <Star size={12} className="text-blue-400 fill-blue-400" />
                                                        <span className="text-slate-300">{toFarsiNumber(ride.customerRating.toFixed(1))}</span>
                                                        <span className="text-slate-500 text-[10px]">مسافر</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {/* <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard size={14} className="text-blue-400" />
                                                <span className="text-xs text-slate-300 whitespace-nowrap">{getPaymentMethodFarsi(ride.paymentMethod)}</span>
                                            </div>
                                        </td> */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                                    {parseServerDate(ride.rideTimestamp)?.toISOString().substring(0, 10)}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                                                    {parseServerDate(ride.rideTimestamp)?.toISOString().substring(11, 19)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRide(ride);
                                                        setShowRideDetails(true);
                                                    }}
                                                    className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
                                                    title="جزئیات"
                                                >
                                                    <Info size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRide(ride);
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                        onClick={() => fetchRides(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(totalPages, 7) }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => fetchRides(pageNum)}
                                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                                        currentPage === pageNum
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
                        onClick={() => fetchRides(Math.min(totalPages, currentPage + 1))}
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

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
                    
                    <div className="relative bg-[#1e293b] border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-800 p-6 flex items-center justify-between z-10">
                            <h3 className="font-bold text-xl text-slate-200 flex items-center gap-2">
                                <Plus size={24} className="text-blue-400" />
                                ایجاد سفر جدید
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">شناسه مشتری *</label>
                                    <input
                                        type="text"
                                        value={formData.customerId}
                                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="CUST123"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">نوع خودرو *</label>
                                    <select
                                        value={formData.vehicleType}
                                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Auto">اتو</option>
                                        <option value="Go Mini">گو مینی</option>
                                        <option value="Go Sedan">گو سدان</option>
                                        <option value="Bike">موتور</option>
                                        <option value="Premier Sedan">سدان پریمیر</option>
                                        <option value="eBike">موتور برقی</option>
                                        <option value="Uber XL">اوبر ایکس‌ال</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">تاریخ و زمان سفر (UTC) - اختیاری</label>
                                <input
                                    type="datetime-local"
                                    value={formData.rideTimestamp}
                                    onChange={(e) => setFormData({ ...formData, rideTimestamp: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">اگر خالی بگذارید، زمان فعلی استفاده می‌شود</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">مبلغ *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.bookingValue}
                                        onChange={(e) => setFormData({ ...formData, bookingValue: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="12222"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">مبلغ پرداختی</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">مسافت (کیلومتر) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.rideDistance}
                                        onChange={(e) => setFormData({ ...formData, rideDistance: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="12.5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">امتیاز راننده (اختیاری)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="5"
                                        value={formData.driverRatings}
                                        onChange={(e) => setFormData({ ...formData, driverRatings: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="4.5"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">امتیاز مسافر (اختیاری)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="5"
                                        value={formData.customerRating}
                                        onChange={(e) => setFormData({ ...formData, customerRating: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="4.8"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">روش پرداخت</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="UPI">UPI</option>
                                    <option value="Cash">نقدی</option>
                                    <option value="Uber Wallet">کیف پول اوبر</option>
                                    <option value="Credit Card">کارت اعتباری</option>
                                    <option value="Debit Card">کارت بانکی</option>
                                </select>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-[#1e293b] border-t border-slate-800 p-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white font-bold"
                            >
                                انصراف
                            </button>
                            <button
                                onClick={handleCreateRide}
                                disabled={!formData.customerId || !formData.bookingValue || !formData.rideDistance}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ایجاد سفر
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedRide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
                    
                    <div className="relative bg-[#1e293b] border border-red-900/50 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl">
                                <AlertCircle size={24} className="text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-200 mb-2">حذف سفر</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    آیا از حذف این سفر مطمئن هستید؟ این عملیات قابل بازگشت نیست.
                                </p>
                                <code className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-300">
                                    {selectedRide.bookingId}
                                </code>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-800">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white font-bold"
                            >
                                انصراف
                            </button>
                            <button
                                onClick={handleDeleteRide}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white font-bold"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ride Details Modal */}
            {showRideDetails && selectedRide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRideDetails(false)}></div>
                    
                    <div className="relative bg-[#1e293b] border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-[#1e293b] border-b border-slate-800 p-6 flex items-center justify-between z-10">
                            <div>
                                <h3 className="font-bold text-xl text-slate-200 flex items-center gap-2">
                                    <Car size={24} className="text-blue-400" />
                                    جزئیات سفر
                                </h3>
                                <code className="text-xs text-slate-500 mt-1 block">{selectedRide.bookingId}</code>
                            </div>
                            <button 
                                onClick={() => setShowRideDetails(false)} 
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Status & Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">وضعیت سفر</div>
                                    <span className={`inline-block px-3 py-1.5 text-sm rounded-lg font-bold ${getStatusColor(selectedRide.bookingStatus)}`}>
                                        {getBookingStatusFarsi(selectedRide.bookingStatus)}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">تاریخ و زمان (UTC)</div>
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <Calendar size={16} className="text-blue-400" />
                                        <span className="text-sm font-bold font-mono">
                                            {parseServerDate(selectedRide.rideTimestamp)?.toISOString().replace('T', ' ').substring(0, 19)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer & Vehicle */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-3">مشتری</div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <Users size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <code className="text-sm text-slate-200 font-mono block">{selectedRide.customerId}</code>
                                            {selectedRide.customerRating && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Star size={12} className="text-blue-400 fill-blue-400" />
                                                    <span className="text-xs text-slate-400">{toFarsiNumber(selectedRide.customerRating.toFixed(1))}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-3">خودرو</div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Car size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm text-slate-200 font-bold">{getVehicleTypeFarsi(selectedRide.vehicleType)}</div>
                                            {selectedRide.driverRatings && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                                    <span className="text-xs text-slate-400">{toFarsiNumber(selectedRide.driverRatings.toFixed(1))} امتیاز راننده</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Distance & Payment */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">مسافت</div>
                                    <div className="flex items-center gap-2">
                                        <Navigation size={18} className="text-blue-400" />
                                        <span className="text-lg font-bold text-slate-200">{toFarsiNumber(selectedRide.rideDistance.toFixed(2))}</span>
                                        <span className="text-xs text-slate-500">کیلومتر</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">مبلغ پرداختی</div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={18} className="text-emerald-400" />
                                        <span className="text-lg font-bold text-emerald-400">{toFarsiNumber(selectedRide.bookingValue.toLocaleString('en-US'))}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs text-slate-500 mb-2">درآمد به ازای کیلومتر</div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={18} className="text-blue-400" />
                                        <span className="text-lg font-bold text-slate-200">{toFarsiNumber(selectedRide.revenuePerKm.toFixed(2))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                <div className="text-xs text-slate-500 mb-2">روش پرداخت</div>
                                <div className="flex items-center gap-2">
                                    <CreditCard size={18} className="text-blue-400" />
                                    <span className="text-sm font-bold text-slate-200">{getPaymentMethodFarsi(selectedRide.paymentMethod)}</span>
                                </div>
                            </div>

                            {/* Cancellation/Incomplete Reason */}
                            {selectedRide.unifiedCancellationReason && selectedRide.unifiedCancellationReason !== 'Not Cancelled' && (
                                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="text-xs text-amber-400 font-bold mb-2">
                                                {selectedRide.bookingStatus === 'Cancelled by Customer' && 'دلیل لغو توسط مشتری'}
                                                {selectedRide.bookingStatus === 'Cancelled by Driver' && 'دلیل لغو توسط راننده'}
                                                {selectedRide.bookingStatus === 'Incomplete' && 'دلیل ناقص بودن سفر'}
                                            </div>
                                            <div className="text-sm text-amber-300 font-medium">
                                                {getCancellationReasonFarsi(selectedRide.bookingStatus, selectedRide.unifiedCancellationReason)}
                                            </div>
                                            <div className="text-xs text-amber-400/60 mt-2 font-mono">
                                                {selectedRide.unifiedCancellationReason}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-[#1e293b] border-t border-slate-800 p-6 flex items-center justify-end">
                            <button
                                onClick={() => setShowRideDetails(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white font-bold"
                            >
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications */}
            {notification && (
                <div className={`fixed bottom-6 left-6 z-50 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom duration-300 ${
                    notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } text-white`}>
                    <div className="flex items-start gap-3">
                        {notification.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                        <div className="flex-1">
                            <p className="font-bold text-sm">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification(null)} className={notification.type === 'success' ? 'text-green-200 hover:text-white' : 'text-red-200 hover:text-white'}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
