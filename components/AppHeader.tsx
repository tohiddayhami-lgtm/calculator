/**
 * AppHeader — Header و Navigation برنامه
 *
 * این کامپوننت با React.memo بهینه شده است تا فقط زمانی که
 * state مرتبط با header تغییر کند، دوباره render شود.
 * تمام state از AppContext گرفته می‌شود (بدون prop drilling).
 */

import React, { memo } from 'react';
import {
  Globe2, FolderOpen, Save, Printer, Inbox, Mail,
  ShieldCheck, HardDrive,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const AppHeader = memo(function AppHeader() {
  const {
    view, setView,
    visibleNavItems,
    user,
    projectName, setProjectName,
    loadedProjectId,
    showSaveModal, setShowSaveModal,
    setShowLoadModal,
    setShowFormSubmissions,
    setShowInquiries,
    formSubmissions,
    inquiryNewCount,
    isMasterUser,
    adminWorkspaceUid, setAdminWorkspaceUid,
    activeOwnerProfile,
    masterActionMessage,
    handleLogout,
    triggerPrint,
    openStorageManager,
  } = useAppContext();

  const unreadSubs = formSubmissions.filter((s) => !s.isRead).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
      {/* ── Desktop Header ─────────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900">
                Tohid Dayhami Export⁺
              </h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Global Trade Calculator
              </p>
            </div>
          </div>

          <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  view === item.id
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
            <FolderOpen className="w-4 h-4 text-slate-400" />
            {loadedProjectId ? (
              <span className="text-sm font-medium text-slate-700">{projectName}</span>
            ) : (
              <span className="text-sm text-slate-400 italic">Unsaved Project</span>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowLoadModal(true)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Open Project"
          >
            <FolderOpen className="w-5 h-5" />
          </button>

          <button
            onClick={() => { setProjectName(projectName || 'New Project'); setShowSaveModal(true); }}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Save Project"
          >
            <Save className="w-5 h-5" />
          </button>

          <button
            onClick={triggerPrint}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Print / Save as PDF"
          >
            <Printer className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowInquiries(true)}
            className="relative p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Customer Inquiries"
          >
            <Inbox className="w-5 h-5" />
            {inquiryNewCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {inquiryNewCount > 99 ? '99+' : inquiryNewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowFormSubmissions(true)}
            className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Form Submissions"
          >
            <Mail className="w-5 h-5" />
            {unreadSubs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadSubs > 99 ? '99+' : unreadSubs}
              </span>
            )}
          </button>

          {user && (
            <button
              onClick={() => openStorageManager(user.uid, user.email || '')}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="فضای ذخیره‌سازی من"
            >
              <HardDrive className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-200">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                className="w-8 h-8 rounded-full border border-slate-200"
                alt="User"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-200">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Master Mode Banner ──────────────────────────────────────────────── */}
      {user && isMasterUser && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-800">
                Master Mode
                {adminWorkspaceUid && activeOwnerProfile
                  ? `: managing ${activeOwnerProfile.email}`
                  : ': managing master workspace'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {masterActionMessage && (
                <span className="text-xs text-indigo-700">{masterActionMessage}</span>
              )}
              {adminWorkspaceUid && (
                <button
                  onClick={() => setAdminWorkspaceUid('')}
                  className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
                >
                  Back to master workspace
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Nav ─────────────────────────────────────────────────────── */}
      <div className="md:hidden px-3 pb-3 space-y-2">
        <nav className="flex gap-2 overflow-x-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                view === item.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.shortLabel || item.label}
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowLoadModal(true)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            Open
          </button>
          <button
            onClick={() => { setProjectName(projectName || 'New Project'); setShowSaveModal(true); }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={triggerPrint}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </header>
  );
});

export default AppHeader;
