import React, { useState, useEffect, useRef } from 'react';
import { 
    TrendingUp, DollarSign, CheckCircle2, 
    Calendar, Filter, RefreshCcw, BarChart3, PieChart, 
    Activity, Clock, Car, X
} from 'lucide-react';

export default function Dashboard() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const dataRef = useRef(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [hoveredSlice, setHoveredSlice] = useState(null);
    
    // Filters
    const [filters, setFilters] = useState({
        vehicleType: '',
        startDate: '',
        endDate: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({
        vehicleType: '',
        startDate: '',
        endDate: ''
    });

    // تبدیل اعداد انگلیسی به فارسی
    const toFarsiNumber = (num) => {
        if (num === null || num === undefined) return '۰';
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(num).replace(/\d/g, (digit) => farsiDigits[parseInt(digit)]).replace(/\./g, ',');
    };

    const getVehicleTypeFarsi = (vehicle) => {
        const vehicleMap = {
            'Auto': 'اتو',
            'Go Mini': 'گو مینی',
            'Go Sedan': 'گو سدان',
            'Bike': 'موتور',
            'Premier Sedan': 'سدان پریمیر',
            'eBike': 'موتور برقی',
            'Uber XL': 'اوبر ایکس‌ال'
        };
        return vehicleMap[vehicle] || vehicle;
    };

    const getCancellationReasonFarsi = (reason) => {
        const reasonMap = {
            'Wrong Address': 'آدرس اشتباه',
            'Change of plans': 'تغییر برنامه',
            'Driver is not moving towards pickup location': 'راننده حرکت نمی‌کند',
            'Driver asked to cancel': 'درخواست راننده',
            'AC is not working': 'کولر خراب',
            'Customer related issue': 'مشکل مشتری',
            'The customer was coughing/sick': 'مشتری بیمار',
            'Personal & Car related issues': 'مشکلات شخصی',
            'More than permitted people in there': 'مسافر اضافی',
            'Customer Demand': 'درخواست مشتری',
            'Vehicle Breakdown': 'خرابی خودرو',
            'Other Issue': 'مشکل دیگر'
        };
        return reasonMap[reason] || reason;
    };

    const fetchDashboardData = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        
        try {
            const params = new URLSearchParams();
            if (appliedFilters.vehicleType) params.append('vehicleType', appliedFilters.vehicleType);
            if (appliedFilters.startDate) params.append('start', new Date(appliedFilters.startDate).toISOString());
            if (appliedFilters.endDate) params.append('end', new Date(appliedFilters.endDate).toISOString());
            
            const res = await fetch(`/api/Analytics/dashboard-summary?${params}`);
            const result = await res.json();
            
            // Only update if data has changed
            const newDataJson = JSON.stringify(result);
            const currentDataJson = JSON.stringify(dataRef.current);
            
            if (newDataJson !== currentDataJson) {
                setData(result);
                dataRef.current = result;
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }
        
        if (showLoader) setLoading(false);
    };

    // Sync dataRef with data state
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Initial load and polling
    useEffect(() => {
        fetchDashboardData(true);
        
        // Poll every 5 seconds
        const interval = setInterval(() => {
            fetchDashboardData(false);
        }, 5000);
        
        return () => clearInterval(interval);
    }, [appliedFilters]);

    const applyFilters = () => {
        setAppliedFilters(filters);
        setShowSidebar(false);
    };

    const clearFilters = () => {
        setFilters({ vehicleType: '', startDate: '', endDate: '' });
        setAppliedFilters({ vehicleType: '', startDate: '', endDate: '' });
        setShowSidebar(false);
    };

    const hasActiveFilters = appliedFilters.vehicleType || appliedFilters.startDate || appliedFilters.endDate;

    // Chart colors
    const chartColors = [
        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', 
        '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#f43f5e', '#a3e635'
    ];

    const getChartColor = (index) => chartColors[index % chartColors.length];

    // Create pie chart paths
    const createPieChart = (cancellationData) => {
        const total = cancellationData.reduce((sum, item) => sum + item.count, 0);
        let cumulativePercent = 0;
        
        return cancellationData.map((item, index) => {
            const percent = (item.count / total) * 100;
            const startAngle = (cumulativePercent / 100) * 2 * Math.PI - Math.PI / 2;
            const endAngle = ((cumulativePercent + percent) / 100) * 2 * Math.PI - Math.PI / 2;
            
            const outerRadius = hoveredSlice === index ? 115 : 110;
            const innerRadius = 60;
            
            const x1 = 150 + outerRadius * Math.cos(startAngle);
            const y1 = 150 + outerRadius * Math.sin(startAngle);
            const x2 = 150 + outerRadius * Math.cos(endAngle);
            const y2 = 150 + outerRadius * Math.sin(endAngle);
            
            const x3 = 150 + innerRadius * Math.cos(endAngle);
            const y3 = 150 + innerRadius * Math.sin(endAngle);
            const x4 = 150 + innerRadius * Math.cos(startAngle);
            const y4 = 150 + innerRadius * Math.sin(startAngle);
            
            const largeArc = percent > 50 ? 1 : 0;
            
            const pathData = [
                `M ${x1} ${y1}`,
                `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                'Z'
            ].join(' ');
            
            cumulativePercent += percent;
            
            return {
                path: pathData,
                color: getChartColor(index),
                percent: percent.toFixed(1),
                reason: item.reason,
                reasonFarsi: getCancellationReasonFarsi(item.reason),
                count: item.count
            };
        });
    };

    return (
        <div className="relative h-[calc(100vh-8rem)] animate-in fade-in duration-500">
            {/* Toggle Button - Sticks to left side */}
            <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-r-xl shadow-lg transition-all duration-300 ${
                    showSidebar ? 'translate-x-80' : 'translate-x-0'
                }`}
            >
                <Filter size={20} className={`transition-transform duration-300 ${showSidebar ? 'rotate-180' : ''}`} />
            </button>

            {/* Backdrop */}
            {showSidebar && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
                    onClick={() => setShowSidebar(false)}
                />
            )}

            {/* Filter Sidebar */}
            <div className={`fixed left-0 top-0 h-full w-80 bg-[#1e293b] border-l border-slate-800 z-30 transition-transform duration-300 ${
                showSidebar ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">فیلترها</h2>
                        <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Vehicle Type Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">نوع خودرو</label>
                        <select
                            value={filters.vehicleType}
                            onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">همه خودروها</option>
                            <option value="Auto">اتو</option>
                            <option value="Bike">موتور</option>
                            <option value="eBike">موتور برقی</option>
                            <option value="Go Mini">گو مینی</option>
                            <option value="Go Sedan">گو سدان</option>
                            <option value="Premier Sedan">سدان پریمیر</option>
                            <option value="Uber XL">اوبر ایکس‌ال</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">تاریخ شروع</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">تاریخ پایان</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={applyFilters}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold transition-colors"
                        >
                            اعمال فیلتر
                        </button>
                        <button
                            onClick={clearFilters}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold transition-colors"
                        >
                            پاک کردن
                        </button>
                    </div>

                    {/* Active Filters Badge */}
                    {hasActiveFilters && (
                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-300 font-bold">فیلترهای فعال:</p>
                            <div className="mt-2 space-y-1">
                                {appliedFilters.vehicleType && (
                                    <p className="text-xs text-slate-300">• نوع خودرو: {getVehicleTypeFarsi(appliedFilters.vehicleType)}</p>
                                )}
                                {appliedFilters.startDate && (
                                    <p className="text-xs text-slate-300">• از تاریخ: {appliedFilters.startDate}</p>
                                )}
                                {appliedFilters.endDate && (
                                    <p className="text-xs text-slate-300">• تا تاریخ: {appliedFilters.endDate}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="h-full overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <RefreshCcw size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">در حال بارگذاری...</p>
                        </div>
                    </div>
                ) : data ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            {/* Total Bookings */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-blue-600/20 rounded-xl">
                                        <Activity size={24} className="text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400">مجموع رزرو‌ها</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className="text-3xl font-bold text-white">{toFarsiNumber(data.kpis.totalBookings.toLocaleString())}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Successful Bookings */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 hover:border-green-500/50 transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-green-600/20 rounded-xl">
                                        <CheckCircle2 size={24} className="text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400">رزرو‌های موفق</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className="text-3xl font-bold text-white">{toFarsiNumber(data.kpis.successfulBookings.toLocaleString())}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400">نرخ موفقیت</p>
                            </div>

                            {/* Total Revenue */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-amber-600/20 rounded-xl">
                                        <DollarSign size={24} className="text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400">درآمد کل</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className="text-3xl font-bold text-white">{toFarsiNumber(data.kpis.totalRevenue.toLocaleString())}</p>
                                            <span className="text-sm text-slate-500">ریال</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Success Rate */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-purple-600/20 rounded-xl">
                                        <TrendingUp size={24} className="text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400">نرخ موفقیت</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className="text-3xl font-bold text-white">{toFarsiNumber(data.kpis.successRate.toFixed(2))}%</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400">نرخ موفقیت</p>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cancellation Analysis - Interactive Pie Chart */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <PieChart size={20} className="text-red-400" />
                                    <h3 className="text-lg font-bold text-slate-200">تحلیل دلایل لغو</h3>
                                </div>
                                {data.cancellationData && data.cancellationData.length > 0 ? (
                                    <div className="flex flex-col items-center">
                                        {/* SVG Pie Chart */}
                                        <div className="relative">
                                            <svg width="300" height="300" viewBox="0 0 300 300" className="transform">
                                                {createPieChart(data.cancellationData).map((slice, index) => (
                                                    <g key={index}>
                                                        <path
                                                            d={slice.path}
                                                            fill={slice.color}
                                                            className="transition-all duration-300 cursor-pointer"
                                                            style={{
                                                                filter: hoveredSlice === index ? 'brightness(1.2)' : 'brightness(1)',
                                                            }}
                                                            onMouseEnter={() => setHoveredSlice(index)}
                                                            onMouseLeave={() => setHoveredSlice(null)}
                                                        />
                                                    </g>
                                                ))}
                                            </svg>
                                            
                                            {/* Center text */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-white">
                                                        {toFarsiNumber(data.cancellationData.reduce((sum, item) => sum + item.count, 0))}
                                                    </p>
                                                    <p className="text-xs text-slate-400">کل لغو</p>
                                                </div>
                                            </div>
                                            
                                            {/* Tooltip on hover */}
                                            {hoveredSlice !== null && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 border-2 border-slate-700 rounded-lg p-3 shadow-xl z-10 pointer-events-none">
                                                    <p className="text-white font-bold text-sm whitespace-nowrap">
                                                        {createPieChart(data.cancellationData)[hoveredSlice].reasonFarsi}
                                                    </p>
                                                    <p className="text-slate-400 text-xs">
                                                        {toFarsiNumber(createPieChart(data.cancellationData)[hoveredSlice].count)} مورد
                                                    </p>
                                                    <p className="text-blue-400 text-xs">
                                                        {toFarsiNumber(createPieChart(data.cancellationData)[hoveredSlice].percent)}%
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Legend */}
                                        <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-md">
                                            {data.cancellationData.map((item, index) => {
                                                const total = data.cancellationData.reduce((sum, i) => sum + i.count, 0);
                                                const percentage = ((item.count / total) * 100).toFixed(1);
                                                return (
                                                    <div 
                                                        key={index} 
                                                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-800/50 p-2 rounded transition-colors"
                                                        onMouseEnter={() => setHoveredSlice(index)}
                                                        onMouseLeave={() => setHoveredSlice(null)}
                                                    >
                                                        <div 
                                                            className="w-3 h-3 rounded-full flex-shrink-0" 
                                                            style={{ backgroundColor: getChartColor(index) }}
                                                        />
                                                        <span className="text-slate-300 truncate flex-1">{getCancellationReasonFarsi(item.reason)}</span>
                                                        <span className="text-slate-400 font-bold">{toFarsiNumber(percentage)}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">داده‌ای برای نمایش وجود ندارد</p>
                                )}
                            </div>

                            {/* Vehicle Performance - Bar Chart */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Car size={20} className="text-blue-400" />
                                    <h3 className="text-lg font-bold text-slate-200">عملکرد انواع خودرو</h3>
                                </div>
                                {data.vehicleData && data.vehicleData.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.vehicleData.map((item, index) => {
                                            const maxRides = Math.max(...data.vehicleData.map(v => v.totalrides));
                                            const widthPercent = (item.totalrides / maxRides) * 100;
                                            return (
                                                <div key={index} className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-300 font-bold">{getVehicleTypeFarsi(item.vehicletype)}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-slate-400">{toFarsiNumber(item.totalrides)} سفر</span>
                                                            <span className="text-yellow-400 text-xs">⭐ {toFarsiNumber(item.avgrating.toFixed(2))}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 bg-slate-900 rounded-lg overflow-hidden">
                                                        <div 
                                                            className="h-full flex items-center px-3 text-xs text-white font-bold transition-all duration-500"
                                                            style={{ 
                                                                width: `${widthPercent}%`,
                                                                backgroundColor: getChartColor(index),
                                                                minWidth: '60px'
                                                            }}
                                                        >
                                                            {toFarsiNumber(item.totalrides)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">داده‌ای برای نمایش وجود ندارد</p>
                                )}
                            </div>

                            {/* Hourly Traffic - Line Chart */}
                            <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 lg:col-span-2">
                                <div className="flex items-center gap-3 mb-6">
                                    <Clock size={20} className="text-emerald-400" />
                                    <h3 className="text-lg font-bold text-slate-200">توزیع ساعتی سفرها</h3>
                                </div>
                                {data.trafficData && data.trafficData.length > 0 ? (
                                    <div className="relative">
                                        {/* Y-axis label */}
                                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
                                            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">تعداد سفرها</p>
                                        </div>
                                        
                                        {/* SVG Line Chart */}
                                        <div className="pr-8">
                                            <svg width="100%" height="320" viewBox="0 0 1000 320" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                                                <defs>
                                                    {/* Gradient for area under line */}
                                                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                                                        <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.05 }} />
                                                    </linearGradient>
                                                </defs>
                                                
                                                {/* Grid lines */}
                                                {[0, 1, 2, 3, 4].map(i => (
                                                    <line
                                                        key={`grid-${i}`}
                                                        x1="60"
                                                        y1={30 + i * 50}
                                                        x2="950"
                                                        y2={30 + i * 50}
                                                        stroke="#334155"
                                                        strokeWidth="1"
                                                        strokeDasharray="4 4"
                                                    />
                                                ))}
                                                
                                                {/* Calculate points */}
                                                {(() => {
                                                    const maxCount = Math.max(...data.trafficData.map(d => d.ridecount));
                                                    const minCount = 0;
                                                    const range = maxCount - minCount;
                                                    
                                                    const points = data.trafficData.map((d, i) => {
                                                        const x = 60 + (i / 23) * 890;
                                                        const y = 230 - ((d.ridecount - minCount) / range) * 200;
                                                        return { x, y, hour: d.hour, count: d.ridecount };
                                                    });
                                                    
                                                    // Create path for line
                                                    const linePath = points.map((p, i) => 
                                                        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                                                    ).join(' ');
                                                    
                                                    // Create path for area
                                                    const areaPath = `M 60 230 L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L 950 230 Z`;
                                                    
                                                    return (
                                                        <g>
                                                            {/* Area under line */}
                                                            <path
                                                                d={areaPath}
                                                                fill="url(#lineGradient)"
                                                            />
                                                            
                                                            {/* Main line */}
                                                            <path
                                                                d={linePath}
                                                                fill="none"
                                                                stroke="#10b981"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            
                                                            {/* Data points (dots) with better tooltips */}
                                                            {points.map((point, index) => (
                                                                <g key={`point-${index}`} className="cursor-pointer group">
                                                                    {/* Invisible larger circle for better hover detection */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="12"
                                                                        fill="transparent"
                                                                        className="pointer-events-auto"
                                                                    />
                                                                    
                                                                    {/* Visible dot */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="5"
                                                                        fill="#10b981"
                                                                        stroke="#1e293b"
                                                                        strokeWidth="2"
                                                                        className="transition-all duration-200 group-hover:r-8 pointer-events-none"
                                                                    />
                                                                    
                                                                    {/* Outer glow ring on hover */}
                                                                    <circle
                                                                        cx={point.x}
                                                                        cy={point.y}
                                                                        r="8"
                                                                        fill="none"
                                                                        stroke="#10b981"
                                                                        strokeWidth="2"
                                                                        className="opacity-0 group-hover:opacity-50 transition-opacity duration-200 pointer-events-none"
                                                                    />
                                                                    
                                                                    {/* Enhanced tooltip */}
                                                                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                                        {/* Tooltip background with shadow */}
                                                                        <rect
                                                                            x={point.x - 50}
                                                                            y={point.y - 60}
                                                                            width="100"
                                                                            height="45"
                                                                            fill="#0f172a"
                                                                            stroke="#10b981"
                                                                            strokeWidth="2"
                                                                            rx="8"
                                                                            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
                                                                        />
                                                                        
                                                                        {/* Arrow pointer */}
                                                                        <path
                                                                            d={`M ${point.x - 6} ${point.y - 15} L ${point.x} ${point.y - 8} L ${point.x + 6} ${point.y - 15} Z`}
                                                                            fill="#0f172a"
                                                                            stroke="#10b981"
                                                                            strokeWidth="2"
                                                                        />
                                                                        
                                                                        {/* Tooltip text - Hour */}
                                                                        <text
                                                                            x={point.x}
                                                                            y={point.y - 38}
                                                                            textAnchor="middle"
                                                                            fill="#10b981"
                                                                            fontSize="13"
                                                                            fontWeight="bold"
                                                                        >
                                                                            ساعت {toFarsiNumber(point.hour)}:۰۰
                                                                        </text>
                                                                        
                                                                        {/* Tooltip text - Count */}
                                                                        <text
                                                                            x={point.x}
                                                                            y={point.y - 22}
                                                                            textAnchor="middle"
                                                                            fill="#e2e8f0"
                                                                            fontSize="12"
                                                                            fontWeight="bold"
                                                                        >
                                                                            {toFarsiNumber(point.count)} سفر
                                                                        </text>
                                                                    </g>
                                                                </g>
                                                            ))}
                                                            
                                                            {/* X-axis labels (hours) - every 2 hours */}
                                                            {points.filter((_, i) => i % 2 === 0).map((point, index) => (
                                                                <text
                                                                    key={`label-x-${index}`}
                                                                    x={point.x}
                                                                    y="255"
                                                                    textAnchor="middle"
                                                                    fill="#64748b"
                                                                    fontSize="11"
                                                                    fontWeight="500"
                                                                >
                                                                    {toFarsiNumber(point.hour)}
                                                                </text>
                                                            ))}
                                                            
                                                            {/* Y-axis labels (counts) */}
                                                            {[0, 1, 2, 3, 4].map(i => {
                                                                const value = Math.round(maxCount - (i * maxCount / 4));
                                                                return (
                                                                    <text
                                                                        key={`label-y-${i}`}
                                                                        x="45"
                                                                        y={35 + i * 50}
                                                                        textAnchor="end"
                                                                        fill="#64748b"
                                                                        fontSize="10"
                                                                        fontWeight="500"
                                                                    >
                                                                        {toFarsiNumber(value)}
                                                                    </text>
                                                                );
                                                            })}
                                                        </g>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                        
                                        {/* X-axis label */}
                                        <div className="text-center mt-2">
                                            <p className="text-xs text-slate-400 font-medium">ساعت (۰-۲۳)</p>
                                        </div>
                                        
                                        {/* Stats summary */}
                                        <div className="mt-6 grid grid-cols-3 gap-4">
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center hover:border-emerald-400/50 transition-all">
                                                <p className="text-xs text-slate-400 mb-1 font-medium">بیشترین تقاضا</p>
                                                <p className="text-xl font-bold text-emerald-400">
                                                    {toFarsiNumber(Math.max(...data.trafficData.map(d => d.ridecount)))}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    ساعت {toFarsiNumber(data.trafficData.find(d => d.ridecount === Math.max(...data.trafficData.map(x => x.ridecount)))?.hour)}
                                                </p>
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center hover:border-blue-400/50 transition-all">
                                                <p className="text-xs text-slate-400 mb-1 font-medium">میانگین سفرها</p>
                                                <p className="text-xl font-bold text-blue-400">
                                                    {toFarsiNumber(Math.round(data.trafficData.reduce((sum, d) => sum + d.ridecount, 0) / data.trafficData.length))}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1">در هر ساعت</p>
                                            </div>
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center hover:border-amber-400/50 transition-all">
                                                <p className="text-xs text-slate-400 mb-1 font-medium">کمترین تقاضا</p>
                                                <p className="text-xl font-bold text-amber-400">
                                                    {toFarsiNumber(Math.min(...data.trafficData.map(d => d.ridecount)))}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    ساعت {toFarsiNumber(data.trafficData.find(d => d.ridecount === Math.min(...data.trafficData.map(x => x.ridecount)))?.hour)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">داده‌ای برای نمایش وجود ندارد</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        <BarChart3 size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">داده‌ای برای نمایش وجود ندارد</p>
                    </div>
                )}
            </div>
        </div>
    );
}
