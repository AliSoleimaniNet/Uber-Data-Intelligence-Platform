import React, { useState } from 'react';
import { LayoutDashboard, DatabaseZap, Users, Car, Menu, Bell, User, Sparkles } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick, isOpen }) => (
    <div
        onClick={onClick}
        className={`group flex items-center mb-2 rounded-lg cursor-pointer transition-all duration-300 relative ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            } ${isOpen ? 'p-3 gap-3' : 'p-3 justify-center'}`}
    >
        <div className="shrink-0">
            <Icon size={22} />
        </div>

        {/* نمایش متن فقط وقتی سایدبار باز است */}
        <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
            }`}>
            {label}
        </span>

        {/* Tooltip در حالت بسته بودن برای جذابیت بیشتر */}
        {!isOpen && (
            <div className="fixed right-20 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-blue-400">
                {label}
            </div>
        )}
    </div>
);

export default function MainLayout({ children, activePage, setActivePage }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="min-h-screen flex bg-[#0f172a]" dir="rtl">
            {/* Sidebar */}
            <aside className={`fixed md:relative z-20 h-screen bg-[#1e293b] border-l border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-64' : 'w-20'
                }`}>
                {/* Logo Section */}
                <div className={`flex items-center justify-between mb-10 mt-6 px-4 transition-all duration-300 ${isOpen ? 'gap-3' : ''}`}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors flex justify-center md:hidden"
                    >
                        <Menu size={20} className={isOpen ? 'rotate-180' : 'rotate-0'} />
                    </button>
                    <div 
                        onClick={() => setIsOpen(!isOpen)}
                        className="shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40 transform hover:rotate-12 transition-transform cursor-pointer"
                    >
                        <DatabaseZap className="text-white" size={24} />
                    </div>
                    <h1 className={`text-lg font-bold bg-linear-to-l from-white to-slate-400 bg-clip-text text-transparent whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                        }`}>
                        اوبر پایپ‌لاین
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3">
                    <SidebarItem icon={LayoutDashboard} label="داشبورد" active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} isOpen={isOpen} />
                    <SidebarItem icon={Car} label="مدیریت سفرها" active={activePage === 'rides'} onClick={() => setActivePage('rides')} isOpen={isOpen} />
                    <SidebarItem icon={DatabaseZap} label="مدیریت پایپ‌لاین" active={activePage === 'pipeline'} onClick={() => setActivePage('pipeline')} isOpen={isOpen} />
                    <SidebarItem icon={Sparkles} label="دستیار هوش مصنوعی" active={activePage === 'aichat'} onClick={() => setActivePage('aichat')} isOpen={isOpen} />

                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                        <SidebarItem icon={Users} label="کاربران (بزودی)" active={activePage === 'users'} onClick={() => setActivePage('users')} isOpen={isOpen} />
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="text-slate-400 font-bold text-sm">
                        {activePage === 'dashboard' && 'داشبورد کلی سیستم'}
                        {activePage === 'pipeline' && 'مدیریت و مانیتورینگ پایپ‌لاین داده'}
                        {activePage === 'rides' && 'مدیریت و بررسی سفرهای اوبر'}
                        {activePage === 'aichat' && 'دستیار هوش مصنوعی - تحلیل داده با AI'}
                        {activePage === 'users' && 'مدیریت کاربران (بزودی)'}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative p-2 hover:bg-slate-800 rounded-full cursor-pointer text-slate-400">
                            {/* IF NEED BELL */}
                            {/* <Bell size={20} /> */}
                            {/* <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span> */}
                        </div>
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-800">
                            <div className="text-left text-sm hidden md:block leading-tight">
                                <p className="font-bold text-slate-200 uppercase tracking-tighter">Admin Mode</p>
                                <p className="text-slate-500 text-[10px] text-right">مدیر ارشد سیستم</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 border-2 border-slate-700 shadow-inner flex items-center justify-center">
                                <User size={24} className="text-white" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
