import {
  useState
} from "react";

import {
  Outlet
} from "react-router-dom";

import {
  Sidebar
} from "./Sidebar";

import {
  Topbar
} from "./Topbar";

export const DashboardLayout = () => {
  const [
    sidebarOpen,
    setSidebarOpen
  ] = useState(false);

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      {/*
      |--------------------------------------------------------------------------
      | Main Dashboard Area
      |--------------------------------------------------------------------------
      |
      | Desktop پر sidebar کی width 16rem یعنی w-64 ہے،
      | اس لیے main content کو lg:ml-64 دیا گیا ہے۔
      |
      */}

      <div className="flex h-screen min-w-0 flex-col lg:ml-64">
        <Topbar
          onMenuClick={
            openSidebar
          }
        />

        {/*
        |--------------------------------------------------------------------------
        | Scrollable Page Content
        |--------------------------------------------------------------------------
        |
        | صرف یہ main section scroll ہوگا۔
        | Sidebar اور Topbar اپنی جگہ رہیں گے۔
        |
        */}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};